import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';
import { preferencesApi, notificationsApi } from '@/integrations/api';
import { WeatherData } from '@/hooks/use-weather-data';
import { GeoLocation } from '@/hooks/use-geolocation';
import { hasAirQualityReading } from '@/lib/air-quality';
import { useAppLang } from '@/hooks/use-app-lang';

export type SensitiveGroup = 'none' | 'child' | 'elderly' | 'respiratory' | 'pregnant';

export interface AlertPreferences {
  sensitive_group: SensitiveGroup;
  alert_threshold: number;
  notify_enabled: boolean;
  quiet_hours_start: number;
  quiet_hours_end: number;
  last_alert_aqi: number | null;
  last_alert_at: string | null;
}

const SENSITIVE_LABEL_VI: Record<SensitiveGroup, string> = {
  none: 'bạn',
  child: 'trẻ nhỏ',
  elderly: 'người cao tuổi',
  respiratory: 'người mắc bệnh hô hấp',
  pregnant: 'phụ nữ mang thai',
};

function isInQuietHours(start: number, end: number): boolean {
  const h = new Date().getHours();
  if (start === end) return false;
  if (start < end) return h >= start && h < end;
  return h >= start || h < end;
}

function aqiBand(aqi: number): number {
  if (aqi <= 50) return 0;
  if (aqi <= 100) return 1;
  if (aqi <= 150) return 2;
  if (aqi <= 200) return 3;
  if (aqi <= 300) return 4;
  return 5;
}

const COOLDOWN_MS = 2 * 60 * 60 * 1000; // 2h

/**
 * Watches live AQI and triggers alerts (toast + push) when it exceeds the
 * user's configured threshold. Throttled per band & cooldown.
 */
export function useAQIAlerts(weather: WeatherData, location?: GeoLocation | null) {
  const { user } = useAuth();
  const lang = useAppLang();
  const prefsRef = useRef<AlertPreferences | null>(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    prefsRef.current = null;
    loadedRef.current = false;
    if (!user) return;
    let cancelled = false;
    (async () => {
      const data = await preferencesApi.get().catch(() => null);
      if (cancelled) return;
      prefsRef.current = (data as AlertPreferences | null) ?? null;
      loadedRef.current = true;
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  useEffect(() => {
    if (!user || !loadedRef.current) return;
    const prefs = prefsRef.current;
    if (!prefs || !prefs.notify_enabled) return;
    if (!hasAirQualityReading(weather)) return;
    if (!location || (location.status !== 'active' && location.status !== 'manual')) return;
    if (weather.aqi < prefs.alert_threshold) return;
    if (isInQuietHours(prefs.quiet_hours_start, prefs.quiet_hours_end)) return;

    const lastAt = prefs.last_alert_at ? new Date(prefs.last_alert_at).getTime() : 0;
    const lastBand = prefs.last_alert_aqi ? aqiBand(prefs.last_alert_aqi) : -1;
    const currentBand = aqiBand(weather.aqi);
    const cooledDown = Date.now() - lastAt > COOLDOWN_MS;
    const escalated = currentBand > lastBand;

    if (!cooledDown && !escalated) return;

    const subject = SENSITIVE_LABEL_VI[prefs.sensitive_group];
    const where = location.label || (lang === 'vi' ? 'vị trí hiện tại' : 'your current location');
    const title = lang === 'vi' ? `⚠️ AQI ${weather.aqi} tại ${where}` : `⚠️ AQI ${weather.aqi} at ${where}`;
    const message = lang === 'vi'
      ? prefs.sensitive_group === 'none'
        ? `Chất lượng không khí vượt ngưỡng ${prefs.alert_threshold}. Hạn chế hoạt động ngoài trời.`
        : `Nhóm nhạy cảm: ${subject}. AQI ${weather.aqi} vượt ngưỡng ${prefs.alert_threshold}. Cân nhắc hạn chế hoạt động ngoài trời.`
      : `Air quality exceeded your AQI threshold of ${prefs.alert_threshold}. Consider reducing outdoor activity, especially if you are sensitive to air pollution.`;

    // In-app toast
    toast.warning(title, { description: message, duration: 8000 });

    // Push notification (best-effort; fails silently if OneSignal not subscribed)
    void notificationsApi
      .push({
        title,
        message,
        data: { aqi: weather.aqi, type: 'aqi_alert', threshold: prefs.alert_threshold },
      })
      .catch(() => {});

    // Persist to avoid spamming
    void preferencesApi.markAlertSent(weather.aqi).catch(() => {});

    prefsRef.current = {
      ...prefs,
      last_alert_aqi: weather.aqi,
      last_alert_at: new Date().toISOString(),
    };
  }, [user, weather.aqi, weather.loading, weather.error, weather.updatedAt, location, lang]);
}
