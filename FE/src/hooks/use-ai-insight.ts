import { useState, useEffect, useCallback } from 'react';
import { aiApi } from '@/integrations/api';
import { GeoLocation } from '@/hooks/use-geolocation';
import { WeatherData } from '@/hooks/use-weather-data';

interface UseAIInsightOptions {
  lang: 'vi' | 'en';
  location: GeoLocation;
  weather: WeatherData;
  preferences: any;
}

export function useAIInsight({ lang, location, weather, preferences }: UseAIInsightOptions) {
  const [insight, setInsight] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const preferencesKey = JSON.stringify({
    health_tier: preferences?.health_tier ?? null,
    commute_type: preferences?.commute_type ?? null,
    high_exposure: preferences?.high_exposure ?? null,
  });

  const fetchInsight = useCallback(async () => {
    if (weather.loading || !location.label || weather.aqi === 0) return;

    setLoading(true);
    setError(null);

    try {
      const data = await aiApi.insight({
        lang,
        location: { label: location.label },
        weather: {
          aqi: weather.aqi,
          pm25: weather.pm25,
          temperature: weather.temperature,
          humidity: weather.humidity,
          windSpeed: weather.windSpeed,
          windDirection: weather.windDirection,
        },
        preferences: preferences
          ? {
              health_tier: preferences.health_tier,
              commute_type: preferences.commute_type,
              high_exposure: preferences.high_exposure,
              sensitive_group: preferences.sensitive_group,
            }
          : undefined,
      });

      setInsight(data?.insight || '');
    } catch (e: any) {
      console.error('AI Insight error:', e);
      setError(e.message || 'Failed to fetch AI insight');
      // Fallback to template
      setInsight(
        lang === 'vi'
          ? `Chất lượng không khí tại ${location.label} hiện ở mức ${weather.aqi > 150 ? 'xấu' : weather.aqi > 100 ? 'kém' : weather.aqi > 50 ? 'trung bình' : 'tốt'} với PM2.5 là ${weather.pm25} µg/m³.`
          : `Air quality at ${location.label} is ${weather.aqi > 150 ? 'unhealthy' : weather.aqi > 100 ? 'poor' : weather.aqi > 50 ? 'moderate' : 'good'} with PM2.5 at ${weather.pm25} µg/m³.`
      );
    } finally {
      setLoading(false);
    }
  }, [lang, location.label, location.lat, location.lng, weather.loading, weather.aqi, weather.pm25, weather.temperature, weather.humidity, weather.windSpeed, weather.windDirection, preferencesKey]);

  useEffect(() => {
    fetchInsight();
  }, [fetchInsight]);

  return { insight, loading, error, refetch: fetchInsight };
}
