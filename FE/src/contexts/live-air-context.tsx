import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { GeoLocation, useGeolocation } from '@/hooks/use-geolocation';
import { HourlyForecast, WeatherData, hasWeatherMetric, useWeatherData } from '@/hooks/use-weather-data';
import { hasAirQualityReading } from '@/lib/air-quality';
import { useAQIAlerts } from '@/hooks/use-aqi-alerts';
import { liveContextApi } from '@/integrations/api';
import { localizeDemoText } from '@/lib/localize-demo';

type SyncedLiveContext = {
  user_id: string;
  label: string | null;
  lat: number;
  lng: number;
  accuracy: number | null;
  aqi: number | null;
  pm25: number | null;
  pm10: number | null;
  temperature: number | null;
  humidity: number | null;
  wind_speed: number | null;
  wind_direction: string | null;
  source: string;
  station: string | null;
  snapshot_updated_at: string;
};

import { useNodeProximity } from '@/hooks/use-node-proximity';

interface LiveAirContextValue {
  location: GeoLocation;
  weather: WeatherData;
  hourlyForecast: HourlyForecast[];
  refreshData: () => Promise<void>;
  requestLocation: () => Promise<void>;
  enableLiveTracking: () => void;
  disableLiveTracking: () => void;
  setManualLocation: (lat: number, lng: number, label: string) => void;
  isUsingSyncedFallback: boolean;
  proximityNode: any | null;
  proximityDistance: number | null;
  isConnectedToNode: boolean;
}


const LiveAirContext = createContext<LiveAirContextValue | null>(null);


function buildFallbackLocation(base: GeoLocation, synced: SyncedLiveContext, lang: 'vi' | 'en'): GeoLocation {
  const label = localizeDemoText(synced.label, lang);
  return {
    ...base,
    lat: synced.lat,
    lng: synced.lng,
    label: label
      ? `${lang === 'vi' ? 'Vị trí đã lưu' : 'Saved location'}: ${label}`
      : (lang === 'vi' ? 'Vị trí đã lưu' : 'Saved location'),
    loading: false,
    error: null,
    accuracy: synced.accuracy,
    updatedAt: synced.snapshot_updated_at,
    status: 'manual',
    isManual: true,
  };
}

function buildFallbackWeather(base: WeatherData, synced: SyncedLiveContext): WeatherData {
  return {
    ...base,
    aqi: synced.aqi ?? 0,
    pm25: synced.pm25 ?? 0,
    pm10: synced.pm10 ?? 0,
    temperature: synced.temperature ?? 0,
    humidity: synced.humidity ?? 0,
    windSpeed: synced.wind_speed ?? 0,
    windDirection: synced.wind_direction || '--',
    updatedAt: synced.aqi === null ? '' : synced.snapshot_updated_at,
    loading: false,
    error: null,
    source: synced.source === 'demo' ? 'demo' : synced.source === 'waqi' ? 'waqi' : synced.source === 'iot-node' ? 'iot-node' : 'open-meteo',
    station: synced.station,
    available: {
      // Older saved WAQI snapshots may contain AQI sub-indices in PM fields.
      pm25: synced.source !== 'waqi' && synced.pm25 !== null,
      pm10: synced.source !== 'waqi' && synced.pm10 !== null,
      temperature: synced.temperature !== null, humidity: synced.humidity !== null,
      windSpeed: synced.wind_speed !== null, windDirection: !!synced.wind_direction,
    },
    metricSources: {
      aqi: synced.source,
      pm25: synced.source === 'waqi' || synced.pm25 === null ? null : synced.source,
      pm10: synced.source === 'waqi' || synced.pm10 === null ? null : synced.source,
      weather: synced.temperature !== null ? synced.source === 'waqi' ? 'open-meteo' : synced.source : null,
    },
  };
}

export function LiveAirProvider({ lang, children }: { lang: 'vi' | 'en'; children: React.ReactNode }) {
  const { user } = useAuth();
  // Inside the app shell, keep GPS live as soon as the browser allows it.
  const { location: rawLocation, requestLocation, enableLiveTracking, disableLiveTracking, setManualLocation } = useGeolocation({
    autoRequest: false,
    requirePriorConsentForAutoRequest: false,
  });
  const [syncedContext, setSyncedContext] = useState<SyncedLiveContext | null>(null);

  useEffect(() => {
    if (rawLocation.status === 'denied' || rawLocation.status === 'iframe-blocked' || rawLocation.status === 'manual') return;
    if (rawLocation.isLiveTracking) return;
    enableLiveTracking();
  }, [enableLiveTracking, rawLocation.isLiveTracking, rawLocation.status]);

  useEffect(() => {
    if (!user) {
      setSyncedContext(null);
      return;
    }

    let cancelled = false;

    const loadSyncedContext = async () => {
      const data = await liveContextApi.get().catch(() => null);

      if (!cancelled) {
        setSyncedContext((data as SyncedLiveContext | null) ?? null);
      }
    };

    void loadSyncedContext();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const isUsingSyncedFallback = !!user && !!syncedContext && (rawLocation.loading || rawLocation.permissionState !== 'granted');
  const effectiveLocation = isUsingSyncedFallback && syncedContext
    ? buildFallbackLocation(rawLocation, syncedContext, lang)
    : rawLocation;

  const { matchedNode, distanceMeters, isConnectedToNode } = useNodeProximity(
    effectiveLocation.status === 'active' || effectiveLocation.status === 'manual' ? effectiveLocation.lat : NaN,
    effectiveLocation.status === 'active' || effectiveLocation.status === 'manual' ? effectiveLocation.lng : NaN,
  );

  const { weather: liveWeather, hourlyForecast, refresh } = useWeatherData(effectiveLocation, lang);
  const baseWeather = isUsingSyncedFallback && syncedContext && liveWeather.loading
    ? buildFallbackWeather(liveWeather, syncedContext)
    : liveWeather;

  // Proximity Node Telemetry Override: Khi ở gần Node (< 500m), đè dữ liệu đo trực tiếp từ Node
  const weather = useMemo<WeatherData>(() => {
    if (isConnectedToNode && matchedNode && Number.isFinite(matchedNode.aqi) && matchedNode.last_reading_at) {
      return {
        ...baseWeather,
        aqi: matchedNode.aqi,
        pm25: Number.isFinite(matchedNode.pm25) ? matchedNode.pm25 : 0,
        pm10: Number.isFinite(matchedNode.pm10) ? matchedNode.pm10 : 0,
        temperature: Number.isFinite(matchedNode.temperature) ? matchedNode.temperature : 0,
        humidity: Number.isFinite(matchedNode.humidity) ? matchedNode.humidity : 0,
        available: {
          ...baseWeather.available,
          pm25: Number.isFinite(matchedNode.pm25),
          pm10: Number.isFinite(matchedNode.pm10),
          temperature: Number.isFinite(matchedNode.temperature),
          humidity: Number.isFinite(matchedNode.humidity),
        },
        metricSources: {
          aqi: 'iot-node',
          pm25: Number.isFinite(matchedNode.pm25) ? 'iot-node' : null,
          pm10: Number.isFinite(matchedNode.pm10) ? 'iot-node' : null,
          weather: Number.isFinite(matchedNode.temperature) ? 'iot-node' : baseWeather.metricSources?.weather ?? null,
        },
        source: 'iot-node',
        station: matchedNode.organization_name ? `${matchedNode.name} (${matchedNode.organization_name})` : matchedNode.name,
        updatedAt: matchedNode.last_reading_at,
        loading: false,
        error: null,
      };
    }
    return baseWeather;
  }, [baseWeather, isConnectedToNode, matchedNode]);

  useEffect(() => {
    if (!user) return;
    if (rawLocation.loading || rawLocation.permissionState !== 'granted') return;
    if (!hasAirQualityReading(weather) || !Number.isFinite(rawLocation.lat) || !Number.isFinite(rawLocation.lng)) return;

    void liveContextApi
      .upsert({
        label: rawLocation.label,
        lat: rawLocation.lat,
        lng: rawLocation.lng,
        accuracy: rawLocation.accuracy,
        aqi: weather.aqi,
        pm25: hasWeatherMetric(weather, 'pm25') ? weather.pm25 : null,
        pm10: hasWeatherMetric(weather, 'pm10') ? weather.pm10 : null,
        temperature: hasWeatherMetric(weather, 'temperature') ? weather.temperature : null,
        humidity: hasWeatherMetric(weather, 'humidity') ? weather.humidity : null,
        wind_speed: hasWeatherMetric(weather, 'windSpeed') ? weather.windSpeed : null,
        wind_direction: hasWeatherMetric(weather, 'windDirection') ? weather.windDirection : null,
        source: weather.source,
        station: weather.station,
        snapshot_updated_at: weather.updatedAt,
      })
      .catch(() => {});
  }, [user, rawLocation, liveWeather, weather]);

  const refreshData = useCallback(async () => {
    await requestLocation();
    refresh();
  }, [requestLocation, refresh]);

  // Trigger AQI alerts based on user's configured threshold + sensitive group
  useAQIAlerts(weather, effectiveLocation);

  const value = useMemo(() => ({
    location: effectiveLocation,
    weather,
    hourlyForecast,
    refreshData,
    requestLocation,
    enableLiveTracking,
    disableLiveTracking,
    setManualLocation,
    isUsingSyncedFallback,
    proximityNode: matchedNode,
    proximityDistance: distanceMeters,
    isConnectedToNode,
  }), [effectiveLocation, weather, hourlyForecast, refreshData, requestLocation, enableLiveTracking, disableLiveTracking, setManualLocation, isUsingSyncedFallback, matchedNode, distanceMeters, isConnectedToNode]);


  return <LiveAirContext.Provider value={value}>{children}</LiveAirContext.Provider>;
}


export function useLiveAirContext() {
  const context = useContext(LiveAirContext);
  if (!context) throw new Error('useLiveAirContext must be used within LiveAirProvider');
  return context;
}
