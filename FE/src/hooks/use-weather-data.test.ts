// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { airApi } from '@/integrations/api';
import { hasWeatherMetric, useWeatherData, type WeatherData } from './use-weather-data';
import type { GeoLocation } from './use-geolocation';

vi.mock('@/integrations/api', () => ({ airApi: { waqiPoint: vi.fn() } }));
vi.mock('@/lib/demo/demo-mode', () => ({ isDemoMode: () => false }));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

const activeLocation: GeoLocation = {
  lat: 21.0285, lng: 105.8542, label: 'Hà Nội', loading: false, error: null,
  permissionState: 'granted', accuracy: 20, isRefining: false,
  updatedAt: new Date().toISOString(), status: 'active', isManual: false,
  isInIframe: false, isLiveTracking: true,
};

function mockOpenMeteo(pm25: number | null) {
  const observedAt = new Date().toISOString().slice(0, 16);
  vi.stubGlobal('fetch', vi.fn(async (input: string) => ({
    ok: true,
    json: async () => input.includes('air-quality-api')
      ? { current: { time: observedAt, pm2_5: pm25, pm10: 20 }, hourly: { time: [], pm2_5: [] } }
      : { current: { time: observedAt, temperature_2m: 27, relative_humidity_2m: 70, wind_speed_10m: 5, wind_direction_10m: 90 } },
  })));
}

const reading: WeatherData = {
  aqi: 0,
  pm25: 0,
  pm10: 0,
  temperature: 0,
  humidity: 0,
  windSpeed: 0,
  windDirection: '--',
  updatedAt: new Date().toISOString(),
  loading: false,
  error: null,
  source: 'open-meteo',
  station: null,
  dominantPollutant: null,
  available: { pm25: true, pm10: false, temperature: true, humidity: false, windSpeed: false, windDirection: false },
};

describe('weather metric provenance', () => {
  it('accepts a measured zero but rejects a missing field represented by zero', () => {
    expect(hasWeatherMetric(reading, 'pm25')).toBe(true);
    expect(hasWeatherMetric(reading, 'pm10')).toBe(false);
  });

  it('does not expose fields from a stale reading', () => {
    expect(hasWeatherMetric({ ...reading, updatedAt: new Date(Date.now() - 3 * 60 * 60_000).toISOString() }, 'pm25')).toBe(false);
  });

  it('keeps WAQI AQI distinct from Open-Meteo PM concentrations', async () => {
    vi.mocked(airApi.waqiPoint).mockResolvedValue({
      source: 'waqi', available: true, aqi: 151, station: 'Hà Nội', time: new Date().toISOString(),
      pm25: 99, pm10: 88,
    });
    mockOpenMeteo(12);

    const { result } = renderHook(() => useWeatherData(activeLocation, 'vi'));
    await waitFor(() => expect(result.current.weather.loading).toBe(false));

    expect(result.current.weather.aqi).toBe(151);
    expect(result.current.weather.pm25).toBe(12);
    expect(result.current.weather.pm10).toBe(20);
    expect(result.current.weather.metricSources).toMatchObject({ aqi: 'waqi', pm25: 'open-meteo' });
  });

  it('does not invent PM concentration when only WAQI AQI is usable', async () => {
    vi.mocked(airApi.waqiPoint).mockResolvedValue({
      source: 'waqi', available: true, aqi: 80, station: 'Hà Nội', time: new Date().toISOString(),
    });
    mockOpenMeteo(null);

    const { result } = renderHook(() => useWeatherData(activeLocation, 'vi'));
    await waitFor(() => expect(result.current.weather.loading).toBe(false));

    expect(result.current.weather.aqi).toBe(80);
    expect(hasWeatherMetric(result.current.weather, 'pm25')).toBe(false);
    expect(result.current.weather.metricSources?.pm25).toBeNull();
  });
});
