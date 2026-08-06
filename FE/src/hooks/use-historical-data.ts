import { useState, useEffect } from 'react';
import { format } from 'date-fns';

interface HistoricalData {
  aqi: number;
  pm25: number;
  pm10: number;
  temperature: number;
  humidity: number;
  loading: boolean;
  error: string | null;
}

function pm25ToAQI(pm25: number): number {
  const breakpoints = [
    { cLow: 0, cHigh: 12, iLow: 0, iHigh: 50 },
    { cLow: 12.1, cHigh: 35.4, iLow: 51, iHigh: 100 },
    { cLow: 35.5, cHigh: 55.4, iLow: 101, iHigh: 150 },
    { cLow: 55.5, cHigh: 150.4, iLow: 151, iHigh: 200 },
    { cLow: 150.5, cHigh: 250.4, iLow: 201, iHigh: 300 },
    { cLow: 250.5, cHigh: 500.4, iLow: 301, iHigh: 500 },
  ];
  const c = Math.max(0, pm25);
  for (const bp of breakpoints) {
    if (c <= bp.cHigh) {
      return Math.round(((bp.iHigh - bp.iLow) / (bp.cHigh - bp.cLow)) * (c - bp.cLow) + bp.iLow);
    }
  }
  return 500;
}

export function useHistoricalData(lat: number, lng: number, date: Date, hour: number) {
  const [data, setData] = useState<HistoricalData>({
    aqi: 0, pm25: 0, pm10: 0, temperature: 0, humidity: 0,
    loading: true, error: null,
  });

  useEffect(() => {
    const fetchHistorical = async () => {
      setData(prev => ({ ...prev, loading: true, error: null }));

      const dateStr = format(date, 'yyyy-MM-dd');
      const now = new Date();
      const isToday = format(now, 'yyyy-MM-dd') === dateStr;
      const isFuture = date > now;

      if (isFuture) {
        setData({ aqi: 0, pm25: 0, pm10: 0, temperature: 0, humidity: 0, loading: false, error: 'Future date' });
        return;
      }

      try {
        // Open-Meteo historical API (free, up to ~2 years back)
        const [weatherRes, airRes] = await Promise.all([
          fetch(
            isToday
              ? `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&hourly=temperature_2m,relative_humidity_2m&timezone=auto`
              : `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lng}&start_date=${dateStr}&end_date=${dateStr}&hourly=temperature_2m,relative_humidity_2m&timezone=auto`
          ),
          fetch(
            isToday
              ? `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}&hourly=pm2_5,pm10&timezone=auto&forecast_days=1`
              : `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}&hourly=pm2_5,pm10&start_date=${dateStr}&end_date=${dateStr}&timezone=auto`
          ),
        ]);

        if (!weatherRes.ok || !airRes.ok) throw new Error('API error');

        const [weatherData, airData] = await Promise.all([weatherRes.json(), airRes.json()]);

        const hourlyTemps: number[] = weatherData.hourly?.temperature_2m ?? [];
        const hourlyHumidity: number[] = weatherData.hourly?.relative_humidity_2m ?? [];
        const hourlyPm25: number[] = airData.hourly?.pm2_5 ?? [];
        const hourlyPm10: number[] = airData.hourly?.pm10 ?? [];

        const idx = Math.min(hour, hourlyTemps.length - 1);
        const pm25Val = hourlyPm25[idx] ?? 0;
        const pm10Val = hourlyPm10[idx] ?? 0;

        setData({
          aqi: pm25ToAQI(pm25Val),
          pm25: Math.round(pm25Val * 10) / 10,
          pm10: Math.round(pm10Val * 10) / 10,
          temperature: Math.round(hourlyTemps[idx] ?? 0),
          humidity: Math.round(hourlyHumidity[idx] ?? 0),
          loading: false,
          error: null,
        });
      } catch (err) {
        setData(prev => ({
          ...prev,
          loading: false,
          error: err instanceof Error ? err.message : 'Failed to fetch',
        }));
      }
    };

    fetchHistorical();
  }, [lat, lng, date.toISOString(), hour]);

  return data;
}
