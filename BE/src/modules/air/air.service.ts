import { Injectable, ServiceUnavailableException, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisTtlCache, fetchJson, distanceKm } from '../../common/cache.util';
import { calculateAqiFromPm25 } from '../../common/air-analytics.util';
import { REDIS_CLIENT } from '../../common/redis.module';
import { GeoPointDto, BoundsDto, HistoryQueryDto } from './dto/air.dto';
import type Redis from 'ioredis';


/** WAQI trả về trạm *gần nhất*, có thể cách hàng trăm km — quá xa thì coi như không có. */
const MAX_STATION_DISTANCE_KM = 40;
const finiteNumber = (value: unknown): number | null => {
  const parsed = typeof value === 'number' || typeof value === 'string' && value.trim() !== '' ? Number(value) : NaN;
  return Number.isFinite(parsed) ? parsed : null;
};
const numericReading = (value: unknown): number | null => {
  const parsed = finiteNumber(value);
  return parsed !== null && parsed >= 0 ? parsed : null;
};
const freshTimestamp = (value: unknown, utcWithoutOffset = false): string | null => {
  if (typeof value !== 'string' || !value.trim()) return null;
  const raw = utcWithoutOffset && !/(Z|[+-]\d{2}:\d{2})$/i.test(value) ? `${value}Z` : value;
  const timestamp = Date.parse(raw);
  const ageMs = Date.now() - timestamp;
  return Number.isFinite(timestamp) && ageMs >= -5 * 60_000 && ageMs <= 2 * 60 * 60_000
    ? new Date(timestamp).toISOString()
    : null;
};
const stationTimestamp = (value: unknown): string | null => {
  if (typeof value === 'string') return freshTimestamp(value);
  if (!value || typeof value !== 'object') return null;
  const time = value as { v?: unknown; stime?: unknown; tz?: unknown };
  if (typeof time.v === 'number' && Number.isFinite(time.v)) {
    const timestamp = new Date(time.v * 1000);
    return Number.isFinite(timestamp.getTime()) ? freshTimestamp(timestamp.toISOString()) : null;
  }
  if (typeof time.stime === 'string' && typeof time.tz === 'string') {
    return freshTimestamp(`${time.stime.replace(' ', 'T')}${time.tz}`);
  }
  return null;
};

@Injectable()
export class AirService {
  private readonly logger = new Logger(AirService.name);

  // Redis-backed caches với fallback về in-memory (graceful degradation)
  private readonly waqiCache: RedisTtlCache<any>;
  private readonly boundsCache: RedisTtlCache<any>;
  private readonly weatherCache: RedisTtlCache<any>;
  private readonly historyCache: RedisTtlCache<any>;
  private readonly rankingCache: RedisTtlCache<any>;

  constructor(
    private readonly config: ConfigService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis | null,
  ) {
    // TTL theo giây — khớp với TTL cũ (phút → giây)
    this.waqiCache    = new RedisTtlCache(redis, 5 * 60,   'waqi:point');
    this.boundsCache  = new RedisTtlCache(redis, 3 * 60,   'waqi:bounds');
    this.weatherCache = new RedisTtlCache(redis, 5 * 60,   'weather:current');
    this.historyCache = new RedisTtlCache(redis, 30 * 60,  'weather:history');
    this.rankingCache = new RedisTtlCache(redis, 10 * 60,  'air:ranking');
  }

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
      const aqi = numericReading(d.aqi);
      const observedAt = freshTimestamp(d.time?.iso);

      if (aqi === null || !Number.isFinite(stationLat) || !Number.isFinite(stationLng) || !observedAt) {
        return { source: 'waqi', available: false, reason: 'invalid_or_stale_reading' };
      }

      const dist = distanceKm(dto.lat, dto.lng, stationLat, stationLng);

      if (dist > MAX_STATION_DISTANCE_KM) {
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
        aqi,
        station: d.city?.name ?? null,
        distanceKm: Math.round(dist * 10) / 10,
        // WAQI `iaqi` values are pollutant AQI sub-indices, NOT µg/m³.
        pollutantAqi: {
          pm25: numericReading(iaqi.pm25?.v),
          pm10: numericReading(iaqi.pm10?.v),
          o3: numericReading(iaqi.o3?.v),
          no2: numericReading(iaqi.no2?.v),
          so2: numericReading(iaqi.so2?.v),
          co: numericReading(iaqi.co?.v),
        },
        temperature: iaqi.t?.v ?? null,
        humidity: iaqi.h?.v ?? null,
        wind: iaqi.w?.v ?? null,
        dominantPollutant: d.dominentpol ?? null,
        time: observedAt,
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
          aqi: numericReading(s.aqi),
          station: s.station?.name ?? null,
          time: stationTimestamp(s.station?.time),
        }))
        .filter((s: any) => s.aqi !== null && s.time !== null && Number.isFinite(s.lat) && Number.isFinite(s.lng));

      return { source: 'waqi', available: stations.length > 0, stations };
    });
  }

  /**
   * Thời tiết + chất lượng không khí hiện tại.
   * AQI ưu tiên trạm WAQI hợp lệ, còn nồng độ PM lấy từ Open-Meteo.
   * IoT telemetry được chọn riêng bởi live-air context phía ứng dụng.
   */
  async currentConditions(dto: GeoPointDto) {
    const key = `${dto.lat.toFixed(3)},${dto.lng.toFixed(3)}`;

    return this.weatherCache.wrap(key, async () => {
      const waqi = await this.waqiByPoint(dto).catch(() => null);

      const [weather, air] = await Promise.all([
        fetchJson<any>(
          `https://api.open-meteo.com/v1/forecast?latitude=${dto.lat}&longitude=${dto.lng}` +
            `&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m&timezone=UTC`,
        ).catch(() => null),
        fetchJson<any>(
          `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${dto.lat}&longitude=${dto.lng}` +
            `&current=pm2_5,pm10&hourly=pm2_5&timezone=UTC&forecast_days=2`,
        ).catch(() => null),
      ]);

      // Chỉ dùng dữ liệu WAQI khi trạm còn hợp lệ & đủ gần (available=true);
      // ngược lại rơi về Open-Meteo. Thiếu biến này chính là lỗi crash trước đây.
      const usable = waqi?.available === true;

      const cw = weather?.current ?? {};
      const ca = air?.current ?? {};
      const airUpdatedAt = freshTimestamp(ca.time, true);
      const weatherUpdatedAt = freshTimestamp(cw.time, true);
      const pm25 = airUpdatedAt ? numericReading(ca.pm2_5) : null;
      const pm10 = airUpdatedAt ? numericReading(ca.pm10) : null;
      if (!usable && pm25 === null) {
        throw new ServiceUnavailableException('Chưa có số đo chất lượng không khí mới cho vị trí này');
      }
      // WAQI (trạm quan trắc) và Open-Meteo (mô hình CAMS) đều là dữ liệu tham chiếu
      // đã hiệu chỉnh sẵn — KHÔNG áp hygroscopic correction lần nữa, nếu không sẽ hạ
      // thấp sai giá trị PM2.5 khi độ ẩm cao (rất thường gặp ở khí hậu VN).
      // Hiệu chỉnh này chỉ dành cho cảm biến laser thô của IoT node (xem nodes.service).
      // Nồng độ PM chỉ lấy từ Open-Meteo; WAQI `iaqi.pm25` là chỉ số AQI phụ.

      return {
        aqi: usable ? waqi.aqi : calculateAqiFromPm25(pm25!),
        pm25: pm25 === null ? null : Math.round(pm25 * 10) / 10,
        pm10: pm10 === null ? null : Math.round(pm10 * 10) / 10,
        temperature: weatherUpdatedAt && finiteNumber(cw.temperature_2m) !== null ? Math.round(cw.temperature_2m) : null,
        humidity: weatherUpdatedAt && numericReading(cw.relative_humidity_2m) !== null ? Math.round(cw.relative_humidity_2m) : null,
        windSpeed: weatherUpdatedAt && numericReading(cw.wind_speed_10m) !== null ? Math.round(cw.wind_speed_10m) : null,
        windDirectionDeg: weatherUpdatedAt && numericReading(cw.wind_direction_10m) !== null ? Math.round(cw.wind_direction_10m) : null,
        source: usable ? 'waqi' : 'open-meteo',
        metricSources: {
          aqi: usable ? 'waqi' : 'open-meteo',
          pm25: pm25 === null ? null : 'open-meteo',
          pm10: pm10 === null ? null : 'open-meteo',
          weather: weatherUpdatedAt ? 'open-meteo' : null,
        },
        station: usable ? waqi.station : null,
        dominantPollutant: usable ? waqi.dominantPollutant : null,
        updatedAt: usable ? waqi.time : airUpdatedAt,

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
        byDay.get(day)!.push(v);
      });

      const daily = [...byDay.entries()].map(([date, values]) => {
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        return {
          date,
          pm25_avg: Math.round(avg * 10) / 10,
          pm25_max: Math.round(Math.max(...values) * 10) / 10,
          aqi_avg: calculateAqiFromPm25(avg),
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

  /** Bảng xếp hạng AQI các thành phố lớn (cache 10 phút trong Redis). */
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
          return data?.available ? { ...city, aqi: data.aqi as number, station: data.station, observedAt: data.time as string } : null;
        }),
      );

      const cities = results.filter(Boolean).sort((a, b) => b!.aqi - a!.aqi);
      return {
        scope: 'selected_cities',
        generatedAt: new Date().toISOString(),
        updatedAt: cities.length ? new Date(Math.max(...cities.map((city) => Date.parse(city!.observedAt)))).toISOString() : null,
        cities: cities.map((c, i) => ({ rank: i + 1, ...c })),
      };
    });
  }
}
