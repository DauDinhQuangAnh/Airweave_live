import { Injectable, ServiceUnavailableException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TtlCache, fetchJson, distanceKm, pm25ToAqi } from '../../common/cache.util';
import { GeoPointDto, BoundsDto, HistoryQueryDto } from './dto/air.dto';

/** WAQI trả về trạm *gần nhất*, có thể cách hàng trăm km — quá xa thì coi như không có. */
const MAX_STATION_DISTANCE_KM = 40;

@Injectable()
export class AirService {
  private readonly logger = new Logger(AirService.name);

  private readonly waqiCache = new TtlCache<any>(5 * 60_000);
  private readonly boundsCache = new TtlCache<any>(3 * 60_000);
  private readonly weatherCache = new TtlCache<any>(5 * 60_000);
  private readonly historyCache = new TtlCache<any>(30 * 60_000);

  constructor(private readonly config: ConfigService) {}

  private get waqiToken() {
    const token = this.config.get<string>('WAQI_API_TOKEN');
    if (!token) {
      throw new ServiceUnavailableException(
        'Chưa cấu hình WAQI_API_TOKEN trong .env — lấy token tại https://aqicn.org/data-platform/token/',
      );
    }
    return token;
  }

  /** Thay edge function get-waqi-data (chế độ điểm). */
  async waqiByPoint(dto: GeoPointDto) {
    const key = `${dto.lat.toFixed(3)},${dto.lng.toFixed(3)}`;

    return this.waqiCache.wrap(key, async () => {
      const url = `https://api.waqi.info/feed/geo:${dto.lat};${dto.lng}/?token=${this.waqiToken}`;
      const data = await fetchJson<any>(url);

      if (data.status !== 'ok') return { source: 'waqi', available: false };

      const d = data.data;
      const iaqi = d.iaqi ?? {};
      const stationLat = d.city?.geo?.[0];
      const stationLng = d.city?.geo?.[1];

      let dist: number | null = null;
      if (typeof stationLat === 'number' && typeof stationLng === 'number') {
        dist = distanceKm(dto.lat, dto.lng, stationLat, stationLng);
      }

      if (dist !== null && dist > MAX_STATION_DISTANCE_KM) {
        return {
          source: 'waqi',
          available: false,
          reason: 'station_too_far',
          distanceKm: Math.round(dist),
          station: d.city?.name ?? null,
        };
      }

      return {
        source: 'waqi',
        available: true,
        aqi: d.aqi,
        station: d.city?.name ?? null,
        distanceKm: dist !== null ? Math.round(dist * 10) / 10 : null,
        pm25: iaqi.pm25?.v ?? null,
        pm10: iaqi.pm10?.v ?? null,
        o3: iaqi.o3?.v ?? null,
        no2: iaqi.no2?.v ?? null,
        so2: iaqi.so2?.v ?? null,
        co: iaqi.co?.v ?? null,
        temperature: iaqi.t?.v ?? null,
        humidity: iaqi.h?.v ?? null,
        wind: iaqi.w?.v ?? null,
        dominantPollutant: d.dominentpol ?? null,
        time: d.time?.iso ?? null,
      };
    });
  }

  /** Thay edge function get-waqi-data (chế độ bounds — nhiều trạm trong khung nhìn). */
  async waqiByBounds(dto: BoundsDto) {
    const key = [dto.lat1, dto.lng1, dto.lat2, dto.lng2].map((v) => v.toFixed(2)).join(',');

    return this.boundsCache.wrap(key, async () => {
      const url = `https://api.waqi.info/map/bounds/?latlng=${dto.lat1},${dto.lng1},${dto.lat2},${dto.lng2}&token=${this.waqiToken}`;
      const data = await fetchJson<any>(url);

      if (data.status !== 'ok') return { source: 'waqi', available: false, stations: [] };

      const stations = (data.data ?? [])
        .map((s: any) => ({
          uid: s.uid,
          lat: s.lat,
          lng: s.lon,
          aqi: Number(s.aqi) || null,
          station: s.station?.name ?? null,
          time: s.station?.time ?? null,
        }))
        .filter((s: any) => s.aqi !== null);

      return { source: 'waqi', available: true, stations };
    });
  }

  /**
   * Thời tiết + chất lượng không khí hiện tại.
   * Ưu tiên số liệu trạm WAQI, thiếu thì lấy Open-Meteo (không cần API key).
   */
  async currentConditions(dto: GeoPointDto) {
    const key = `${dto.lat.toFixed(3)},${dto.lng.toFixed(3)}`;

    return this.weatherCache.wrap(key, async () => {
      const waqi = await this.waqiByPoint(dto).catch(() => null);

      const [weather, air] = await Promise.all([
        fetchJson<any>(
          `https://api.open-meteo.com/v1/forecast?latitude=${dto.lat}&longitude=${dto.lng}` +
            `&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m&timezone=auto`,
        ).catch(() => null),
        fetchJson<any>(
          `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${dto.lat}&longitude=${dto.lng}` +
            `&current=pm2_5,pm10&hourly=pm2_5&timezone=auto&forecast_days=2`,
        ).catch(() => null),
      ]);

      const cw = weather?.current ?? {};
      const ca = air?.current ?? {};
      const usable = waqi?.available === true;

      const pm25 = usable ? (waqi.pm25 ?? ca.pm2_5 ?? 0) : (ca.pm2_5 ?? 0);
      const pm10 = usable ? (waqi.pm10 ?? ca.pm10 ?? 0) : (ca.pm10 ?? 0);

      return {
        aqi: usable ? waqi.aqi : pm25ToAqi(pm25),
        pm25: Math.round(pm25 * 10) / 10,
        pm10: Math.round(pm10 * 10) / 10,
        temperature: Math.round(cw.temperature_2m ?? 0),
        humidity: Math.round(cw.relative_humidity_2m ?? 0),
        windSpeed: Math.round(cw.wind_speed_10m ?? 0),
        windDirectionDeg: Math.round(cw.wind_direction_10m ?? 0),
        source: usable ? 'waqi' : 'open-meteo',
        station: usable ? waqi.station : null,
        dominantPollutant: usable ? waqi.dominantPollutant : null,
        updatedAt: usable ? (waqi.time ?? new Date().toISOString()) : new Date().toISOString(),
        hourly: {
          time: air?.hourly?.time ?? [],
          pm2_5: air?.hourly?.pm2_5 ?? [],
        },
      };
    });
  }

  /** Dữ liệu lịch sử PM2.5 + thời tiết (Open-Meteo archive). */
  async history(dto: HistoryQueryDto) {
    const days = dto.days ?? 7;
    const key = `${dto.lat.toFixed(2)},${dto.lng.toFixed(2)},${days}`;

    return this.historyCache.wrap(key, async () => {
      const end = new Date();
      const start = new Date(end.getTime() - days * 86_400_000);
      const fmt = (d: Date) => d.toISOString().slice(0, 10);

      const [air, weather] = await Promise.all([
        fetchJson<any>(
          `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${dto.lat}&longitude=${dto.lng}` +
            `&hourly=pm2_5,pm10&start_date=${fmt(start)}&end_date=${fmt(end)}&timezone=auto`,
          12000,
        ).catch(() => null),
        fetchJson<any>(
          `https://archive-api.open-meteo.com/v1/archive?latitude=${dto.lat}&longitude=${dto.lng}` +
            `&start_date=${fmt(start)}&end_date=${fmt(end)}` +
            `&daily=temperature_2m_max,temperature_2m_min,wind_speed_10m_max&timezone=auto`,
          12000,
        ).catch(() => null),
      ]);

      const times: string[] = air?.hourly?.time ?? [];
      const pm25: number[] = air?.hourly?.pm2_5 ?? [];

      // Gộp trung bình theo ngày để FE vẽ biểu đồ nhẹ hơn
      const byDay = new Map<string, number[]>();
      times.forEach((t, i) => {
        const day = t.slice(0, 10);
        const v = pm25[i];
        if (typeof v !== 'number') return;
        if (!byDay.has(day)) byDay.set(day, []);
        byDay.get(day).push(v);
      });

      const daily = [...byDay.entries()].map(([date, values]) => {
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        return {
          date,
          pm25_avg: Math.round(avg * 10) / 10,
          pm25_max: Math.round(Math.max(...values) * 10) / 10,
          aqi_avg: pm25ToAqi(avg),
        };
      });

      return {
        lat: dto.lat,
        lng: dto.lng,
        days,
        daily,
        hourly: { time: times, pm2_5: pm25, pm10: air?.hourly?.pm10 ?? [] },
        weather_daily: weather?.daily ?? null,
      };
    });
  }

  /** Bảng xếp hạng AQI các thành phố lớn (dựng từ WAQI, cache 10 phút). */
  private readonly rankingCache = new TtlCache<any>(10 * 60_000);

  private static readonly RANKING_CITIES = [
    { name: 'Hà Nội', lat: 21.0285, lng: 105.8542, country: 'VN' },
    { name: 'TP. Hồ Chí Minh', lat: 10.8231, lng: 106.6297, country: 'VN' },
    { name: 'Đà Nẵng', lat: 16.0544, lng: 108.2022, country: 'VN' },
    { name: 'Hải Phòng', lat: 20.8449, lng: 106.6881, country: 'VN' },
    { name: 'Cần Thơ', lat: 10.0452, lng: 105.7469, country: 'VN' },
    { name: 'Bangkok', lat: 13.7563, lng: 100.5018, country: 'TH' },
    { name: 'Jakarta', lat: -6.2088, lng: 106.8456, country: 'ID' },
    { name: 'Delhi', lat: 28.6139, lng: 77.209, country: 'IN' },
    { name: 'Beijing', lat: 39.9042, lng: 116.4074, country: 'CN' },
    { name: 'Seoul', lat: 37.5665, lng: 126.978, country: 'KR' },
  ];

  async ranking() {
    return this.rankingCache.wrap('global', async () => {
      const results = await Promise.all(
        AirService.RANKING_CITIES.map(async (city) => {
          const data = await this.waqiByPoint({ lat: city.lat, lng: city.lng }).catch(() => null);
          return data?.available ? { ...city, aqi: data.aqi as number, station: data.station } : null;
        }),
      );

      const cities = results.filter(Boolean).sort((a, b) => b.aqi - a.aqi);
      return {
        updatedAt: new Date().toISOString(),
        cities: cities.map((c, i) => ({ rank: i + 1, ...c })),
      };
    });
  }
}
