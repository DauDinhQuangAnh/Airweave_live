import { useState, useEffect } from 'react';
import { format, subDays } from 'date-fns';

interface DayReport {
  day: string;
  date: string;
  aqi: number;
  avgPm25: number;
  peakAqi: number;
  peakPm25: number;
  peakHour: number;
  minAqi: number;
}

interface WeeklyReport {
  days: DayReport[];
  avgAqi: number;
  totalExposureHours: number;
  worstDay: string;
  bestTime: string;
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

const DAY_LABELS_VI = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const DAY_LABELS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function useWeeklyReport(lat: number, lng: number, lang: 'vi' | 'en', enabled = true, periodDays = 7) {
  const [report, setReport] = useState<WeeklyReport>({
    days: [], avgAqi: 0, totalExposureHours: 0,
    worstDay: '', bestTime: '', loading: true, error: null,
  });

  useEffect(() => {
    if (!enabled) {
      setReport({ days: [], avgAqi: 0, totalExposureHours: 0, worstDay: '', bestTime: '', loading: false, error: null });
      return;
    }
    const fetchWeekly = async () => {
      setReport(prev => ({ ...prev, days: [], loading: true, error: null }));

      const today = new Date();
      const startDate = format(subDays(today, periodDays - 1), 'yyyy-MM-dd');
      const endDate = format(today, 'yyyy-MM-dd');

      try {
        const res = await fetch(
          `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}&hourly=pm2_5&start_date=${startDate}&end_date=${endDate}&timezone=auto`
        );

        if (!res.ok) throw new Error('API error');

        const data = await res.json();
        const hourlyPm25: number[] = data.hourly?.pm2_5 ?? [];
        const hourlyTimes: string[] = data.hourly?.time ?? [];

        // Group by day
        const dayMap = new Map<string, { pm25Values: number[]; date: Date }>();

        for (let i = 0; i < hourlyTimes.length; i++) {
          const dt = new Date(hourlyTimes[i]);
          const key = format(dt, 'yyyy-MM-dd');
          if (!Number.isFinite(hourlyPm25[i])) continue;
          if (!dayMap.has(key)) {
            dayMap.set(key, { pm25Values: [], date: dt });
          }
          dayMap.get(key)!.pm25Values.push(hourlyPm25[i]);
        }

        const labels = lang === 'vi' ? DAY_LABELS_VI : DAY_LABELS_EN;
        const days: DayReport[] = [];
        let totalAqi = 0;
        let exposureHours = 0;
        let worstDayAqi = 0;
        let worstDayLabel = '';
        let bestHour = 0;
        let bestHourAqi = 999;

        for (const [, { pm25Values, date }] of dayMap) {
          const avgPm25 = pm25Values.reduce((a, b) => a + b, 0) / pm25Values.length;
          const dayAqi = pm25ToAQI(avgPm25);
          const peakIdx = pm25Values.indexOf(Math.max(...pm25Values));
          const peakPm25 = pm25Values[peakIdx];
          const minIdx = pm25Values.indexOf(Math.min(...pm25Values));
          const minAqi = pm25ToAQI(pm25Values[minIdx]);

          const dayLabel = labels[date.getDay()];
          days.push({
            day: dayLabel,
            date: format(date, 'dd/MM'),
            aqi: dayAqi,
            avgPm25: Math.round(avgPm25 * 10) / 10,
            peakAqi: pm25ToAQI(peakPm25),
            peakPm25: Math.round(peakPm25 * 10) / 10,
          peakHour: peakIdx,
            minAqi,
          });

          totalAqi += dayAqi;
          // Count hours with AQI > 100 as "exposure" hours
          exposureHours += pm25Values.filter(v => pm25ToAQI(v) > 100).length;

          if (dayAqi > worstDayAqi) {
            worstDayAqi = dayAqi;
            worstDayLabel = `${peakIdx}h - ${dayLabel}`;
          }
          if (minAqi < bestHourAqi) {
            bestHourAqi = minAqi;
            bestHour = minIdx;
          }
        }

        const avgAqi = days.length > 0 ? Math.round(totalAqi / days.length) : 0;
        const bestTimeLabel = lang === 'vi' ? `${bestHour}h sáng` : `${bestHour}:00`;

        setReport({
          days,
          avgAqi,
          totalExposureHours: exposureHours,
          worstDay: worstDayLabel,
          bestTime: bestTimeLabel,
          loading: false,
          error: days.length ? null : (lang === 'vi' ? 'Không có số đo lịch sử cho vị trí này.' : 'No historical readings for this location.'),
        });
      } catch (err) {
        console.error('Weekly report fetch error:', err);
        setReport(prev => ({ ...prev, days: [], loading: false, error: lang === 'vi' ? 'Không tải được lịch sử chất lượng không khí.' : 'Air-quality history could not be loaded.' }));
      }
    };

    fetchWeekly();
  }, [lat, lng, lang, enabled, periodDays]);

  return report;
}
