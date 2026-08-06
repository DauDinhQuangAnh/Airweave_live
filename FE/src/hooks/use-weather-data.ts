import { useState, useEffect, useCallback, useRef } from 'react';
import { GeoLocation } from './use-geolocation';
import { airApi } from '@/integrations/api';
import { degToCompass, pm25ToAQI } from '@/lib/air-quality';

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
  source: 'waqi' | 'open-meteo';
  station: string | null;
  dominantPollutant: string | null;
}

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
  const requestInFlightRef = useRef(false);

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
      setWeather((prev) => ({ ...prev, loading: false, error: null }));
      setHourlyForecast([]);
      return;
    }

    let cancelled = false;

    const fetchData = async () => {
      if (requestInFlightRef.current) return;
      requestInFlightRef.current = true;
      const hasSnapshot = weatherRef.current.aqi > 0 || !!weatherRef.current.updatedAt;
      setWeather((prev) => ({ ...prev, loading: !hasSnapshot, error: null }));

      try {
        const waqi = await fetchWAQI(location.lat, location.lng);

        const [weatherData, airData] = await Promise.all([
          fetchJsonWithTimeout(
            `https://api.open-meteo.com/v1/forecast?latitude=${location.lat}&longitude=${location.lng}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m&timezone=auto`
          ),
          fetchJsonWithTimeout(
            `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${location.lat}&longitude=${location.lng}&current=pm2_5,pm10&hourly=pm2_5&timezone=auto&forecast_days=2`
          ),
        ]);

        if (cancelled) return;
        const currentWeather = weatherData.current;
        const currentAir = airData.current;

        if (waqi) {
          setWeather({
            aqi: waqi.aqi,
            pm25: waqi.pm25 ?? Math.round((currentAir?.pm2_5 ?? 0) * 10) / 10,
            pm10: waqi.pm10 ?? Math.round((currentAir?.pm10 ?? 0) * 10) / 10,
            temperature: Math.round(currentWeather?.temperature_2m ?? 0),
            humidity: Math.round(currentWeather?.relative_humidity_2m ?? 0),
            windSpeed: Math.round(currentWeather?.wind_speed_10m ?? 0),
            windDirection: degToCompass(currentWeather?.wind_direction_10m ?? 0, lang),
            updatedAt: waqi.time || new Date().toISOString(),
            loading: false,
            error: null,
            source: 'waqi',
            station: waqi.station,
            dominantPollutant: waqi.dominantPollutant,
          });
        } else {
          const pm25Val = currentAir?.pm2_5 ?? 0;
          const pm10Val = currentAir?.pm10 ?? 0;

          setWeather({
            aqi: pm25ToAQI(pm25Val),
            pm25: Math.round(pm25Val * 10) / 10,
            pm10: Math.round(pm10Val * 10) / 10,
            temperature: Math.round(currentWeather?.temperature_2m ?? 0),
            humidity: Math.round(currentWeather?.relative_humidity_2m ?? 0),
            windSpeed: Math.round(currentWeather?.wind_speed_10m ?? 0),
            windDirection: degToCompass(currentWeather?.wind_direction_10m ?? 0, lang),
            updatedAt: new Date().toISOString(),
            loading: false,
            error: null,
            source: 'open-meteo',
            station: null,
            dominantPollutant: null,
          });
        }

        const hourlyPm25: number[] = airData.hourly?.pm2_5 ?? [];
        const hourlyTimes: string[] = airData.hourly?.time ?? [];
        const now = new Date();
        const forecast: HourlyForecast[] = [];

        for (let i = 0; i < hourlyTimes.length && forecast.length < 24; i++) {
          const time = new Date(hourlyTimes[i]);
          if (time >= new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours())) {
            forecast.push({
              time,
              aqi: pm25ToAQI(hourlyPm25[i] ?? 0),
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
        requestInFlightRef.current = false;
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

