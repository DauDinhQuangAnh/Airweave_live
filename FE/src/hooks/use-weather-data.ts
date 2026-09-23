import { useState, useEffect, useCallback, useRef } from 'react';
import { GeoLocation } from './use-geolocation';
import { airApi } from '@/integrations/api';
import { degToCompass, pm25ToAQI, hasAirQualityReading } from '@/lib/air-quality';
import { isDemoMode } from '@/lib/demo/demo-mode';

export interface WeatherData {
  aqi: number;
  pm25: number;
  pm10: number;
  temperature: number;
  humidity: number;
  windSpeed: number;
  windDirection: string;
  updatedAt: string;
  loading: boolean;
  error: string | null;
  source: 'waqi' | 'open-meteo' | 'iot-node' | 'demo';
  station: string | null;
  dominantPollutant: string | null;
  available: Record<'pm25' | 'pm10' | 'temperature' | 'humidity' | 'windSpeed' | 'windDirection', boolean>;
  metricSources?: { aqi: string; pm25: string | null; pm10: string | null; weather: string | null };
}

export function hasWeatherMetric(weather: WeatherData, metric: keyof WeatherData['available']): boolean {
  return hasAirQualityReading(weather) && weather.available[metric];
}

const isMeasured = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const isConcentration = (value: unknown): value is number => isMeasured(value) && value >= 0;
const currentUtcTime = (value: unknown): string => {
  if (typeof value !== 'string' || !value.trim()) return '';
  const raw = /(Z|[+-]\d{2}:\d{2})$/i.test(value) ? value : `${value}Z`;
  const timestamp = Date.parse(raw);
  const ageMs = Date.now() - timestamp;
  return Number.isFinite(timestamp) && ageMs >= -5 * 60_000 && ageMs <= 2 * 60 * 60_000
    ? new Date(timestamp).toISOString()
    : '';
};

export interface HourlyForecast {
  time: Date;
  aqi: number;
  label: string;
}

const defaultWeather: WeatherData = {
  aqi: 0,
  pm25: 0,
  pm10: 0,
  temperature: 0,
  humidity: 0,
  windSpeed: 0,
  windDirection: '--',
  updatedAt: '',
  loading: true,
  error: null,
  source: 'open-meteo',
  station: null,
  dominantPollutant: null,
  available: { pm25: false, pm10: false, temperature: false, humidity: false, windSpeed: false, windDirection: false },
};

const WAQI_TIMEOUT_MS = 5000;
const OPEN_METEO_TIMEOUT_MS = 8000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeout = new Promise<T>((resolve) => {
    timeoutId = setTimeout(() => resolve(fallback), timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => {
    if (timeoutId) clearTimeout(timeoutId);
  });
}

async function fetchJsonWithTimeout(url: string, timeoutMs = OPEN_METEO_TIMEOUT_MS): Promise<any> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error('API request failed');
    return await res.json();
  } finally {
    window.clearTimeout(timeoutId);
  }
}

async function fetchWAQI(lat: number, lng: number): Promise<any | null> {
  try {
    const data = await withTimeout(
      airApi.waqiPoint(lat, lng).catch(() => null),
      WAQI_TIMEOUT_MS,
      null
    );
    if (!data?.available) return null;
    return data;
  } catch {
    return null;
  }
}

export function useWeatherData(location: GeoLocation, lang: 'vi' | 'en') {
  const [weather, setWeather] = useState<WeatherData>(defaultWeather);
  const [hourlyForecast, setHourlyForecast] = useState<HourlyForecast[]>([]);
  const [refreshTick, setRefreshTick] = useState(0);
  const weatherRef = useRef(defaultWeather);
  const locationKeyRef = useRef('');

  const refresh = useCallback(() => setRefreshTick((t) => t + 1), []);

  useEffect(() => {
    weatherRef.current = weather;
  }, [weather]);

  useEffect(() => {
    if (location.loading) return;
    const hasUsableLocation =
      Number.isFinite(location.lat) &&
      Number.isFinite(location.lng) &&
      (location.status === 'active' || location.status === 'manual');

    if (!hasUsableLocation) {
      locationKeyRef.current = '';
      setWeather({ ...defaultWeather, loading: false });
      setHourlyForecast([]);
      return;
    }

    let cancelled = false;
    let inFlight = false;
    const locationKey = `${location.lat},${location.lng}`;
    const sameLocation = locationKeyRef.current === locationKey;
    locationKeyRef.current = locationKey;

    const fetchData = async () => {
      if (inFlight) return;
      inFlight = true;
      const hasSnapshot = sameLocation && hasAirQualityReading(weatherRef.current);
      setWeather((prev) => ({ ...(hasSnapshot ? prev : defaultWeather), loading: !hasSnapshot, error: null }));

      try {
        const waqi = await fetchWAQI(location.lat, location.lng);

        if (isDemoMode()) {
          if (!waqi || !Number.isFinite(waqi.aqi)) {
            throw new Error('Không có dữ liệu mô phỏng cho vị trí này');
          }
          if (cancelled) return;
          setWeather({
            aqi: waqi.aqi,
            pm25: waqi.pm25 ?? 0,
            pm10: waqi.pm10 ?? 0,
            temperature: Math.round(waqi.temperature ?? 0),
            humidity: Math.round(waqi.humidity ?? 0),
            windSpeed: Math.round((waqi.wind ?? 0) * 10) / 10,
            windDirection: lang === 'vi' ? 'ĐN' : 'SE',
            updatedAt: waqi.time || new Date().toISOString(),
            loading: false,
            error: null,
            source: 'demo',
            station: waqi.station ?? null,
            dominantPollutant: waqi.dominantPollutant ?? null,
            available: {
              pm25: isMeasured(waqi.pm25), pm10: isMeasured(waqi.pm10),
              temperature: isMeasured(waqi.temperature), humidity: isMeasured(waqi.humidity),
              windSpeed: isMeasured(waqi.wind), windDirection: false,
            },
            metricSources: { aqi: 'demo', pm25: isMeasured(waqi.pm25) ? 'demo' : null, pm10: isMeasured(waqi.pm10) ? 'demo' : null, weather: 'demo' },
          });
          setHourlyForecast([]);
          return;
        }

        const [weatherData, airData] = await Promise.all([
          fetchJsonWithTimeout(
            `https://api.open-meteo.com/v1/forecast?latitude=${location.lat}&longitude=${location.lng}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m&timezone=UTC`
          ).catch(() => null),
          fetchJsonWithTimeout(
            `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${location.lat}&longitude=${location.lng}&current=pm2_5,pm10&hourly=pm2_5&timezone=UTC&forecast_days=2`
          ).catch(() => null),
        ]);

        if (cancelled) return;
        const currentWeather = weatherData?.current;
        const currentAir = airData?.current;
        const weatherUpdatedAt = currentUtcTime(currentWeather?.time);
        const airUpdatedAt = currentUtcTime(currentAir?.time);
        const airPm25 = airUpdatedAt && isConcentration(currentAir?.pm2_5) ? currentAir.pm2_5 : null;
        const airPm10 = airUpdatedAt && isConcentration(currentAir?.pm10) ? currentAir.pm10 : null;
        const validWaqi = !!waqi && isMeasured(waqi.aqi) && !!waqi.time && hasAirQualityReading({ aqi: waqi.aqi, updatedAt: waqi.time, loading: false, error: null });

        if (airPm25 === null && !validWaqi) {
          throw new Error('Không có số đo chất lượng không khí cho vị trí này');
        }

        if (validWaqi) {
          setWeather({
            aqi: waqi.aqi,
            // WAQI iaqi.pm25/pm10 are AQI sub-indices, not concentrations.
            pm25: airPm25 === null ? 0 : Math.round(airPm25 * 10) / 10,
            pm10: airPm10 === null ? 0 : Math.round(airPm10 * 10) / 10,
            temperature: weatherUpdatedAt && isMeasured(currentWeather?.temperature_2m) ? Math.round(currentWeather.temperature_2m) : 0,
            humidity: weatherUpdatedAt && isMeasured(currentWeather?.relative_humidity_2m) ? Math.round(currentWeather.relative_humidity_2m) : 0,
            windSpeed: weatherUpdatedAt && isMeasured(currentWeather?.wind_speed_10m) ? Math.round(currentWeather.wind_speed_10m) : 0,
            windDirection: weatherUpdatedAt && isMeasured(currentWeather?.wind_direction_10m) ? degToCompass(currentWeather.wind_direction_10m, lang) : '--',
            updatedAt: waqi.time,
            loading: false,
            error: null,
            source: 'waqi',
            station: waqi.station,
            dominantPollutant: waqi.dominantPollutant,
            available: {
              pm25: airPm25 !== null,
              pm10: airPm10 !== null,
              temperature: !!weatherUpdatedAt && isMeasured(currentWeather?.temperature_2m),
              humidity: !!weatherUpdatedAt && isMeasured(currentWeather?.relative_humidity_2m),
              windSpeed: !!weatherUpdatedAt && isMeasured(currentWeather?.wind_speed_10m),
              windDirection: !!weatherUpdatedAt && isMeasured(currentWeather?.wind_direction_10m),
            },
            metricSources: { aqi: 'waqi', pm25: airPm25 === null ? null : 'open-meteo', pm10: airPm10 === null ? null : 'open-meteo', weather: weatherUpdatedAt ? 'open-meteo' : null },
          });
        } else {
          const pm25Val = airPm25!;

          setWeather({
            aqi: pm25ToAQI(pm25Val),
            pm25: Math.round(pm25Val * 10) / 10,
            pm10: airPm10 === null ? 0 : Math.round(airPm10 * 10) / 10,
            temperature: weatherUpdatedAt && isMeasured(currentWeather?.temperature_2m) ? Math.round(currentWeather.temperature_2m) : 0,
            humidity: weatherUpdatedAt && isMeasured(currentWeather?.relative_humidity_2m) ? Math.round(currentWeather.relative_humidity_2m) : 0,
            windSpeed: weatherUpdatedAt && isMeasured(currentWeather?.wind_speed_10m) ? Math.round(currentWeather.wind_speed_10m) : 0,
            windDirection: weatherUpdatedAt && isMeasured(currentWeather?.wind_direction_10m) ? degToCompass(currentWeather.wind_direction_10m, lang) : '--',
            updatedAt: airUpdatedAt,
            loading: false,
            error: null,
            source: 'open-meteo',
            station: null,
            dominantPollutant: null,
            available: {
              pm25: true, pm10: airPm10 !== null,
              temperature: !!weatherUpdatedAt && isMeasured(currentWeather?.temperature_2m),
              humidity: !!weatherUpdatedAt && isMeasured(currentWeather?.relative_humidity_2m),
              windSpeed: !!weatherUpdatedAt && isMeasured(currentWeather?.wind_speed_10m),
              windDirection: !!weatherUpdatedAt && isMeasured(currentWeather?.wind_direction_10m),
            },
            metricSources: { aqi: 'open-meteo', pm25: 'open-meteo', pm10: airPm10 === null ? null : 'open-meteo', weather: weatherUpdatedAt ? 'open-meteo' : null },
          });
        }

        const hourlyPm25: number[] = airData?.hourly?.pm2_5 ?? [];
        const hourlyTimes: string[] = airData?.hourly?.time ?? [];
        const now = new Date();
        const forecast: HourlyForecast[] = [];

        for (let i = 0; i < hourlyTimes.length && forecast.length < 24; i++) {
          const time = new Date(`${hourlyTimes[i]}Z`);
          if (time >= new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours()) && Number.isFinite(hourlyPm25[i])) {
            forecast.push({
              time,
              aqi: pm25ToAQI(hourlyPm25[i]),
              label: `${time.getHours().toString().padStart(2, '0')}:00`,
            });
          }
        }

        setHourlyForecast(forecast);
      } catch (err) {
        if (cancelled) return;
        setWeather((prev) => ({
          ...prev,
          loading: false,
          error: hasSnapshot ? null : err instanceof Error ? err.message : 'Failed to fetch data',
        }));
      } finally {
        inFlight = false;
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 10 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [location.lat, location.lng, location.loading, location.status, lang, refreshTick]);

  return { weather, hourlyForecast, refresh };
}

