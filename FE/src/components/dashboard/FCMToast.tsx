import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wind, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLiveAirContext } from '@/contexts/live-air-context';
import { useUserPreferences } from '@/hooks/use-user-preferences';
import { getAQIStatusVi } from '@/lib/pam-stations';

interface Props {
  onNotification: () => void;
}

type LiveNotification = {
  id: string;
  title: string;
  body: string;
  actionLabel: string;
  actionPath: string;
  severity: 'info' | 'warning' | 'danger';
};

const LAST_TOAST_KEY = 'aw-live-fcm-toast-last';
const LAST_AQI_KEY = 'aw-live-fcm-last-aqi';
const COOLDOWN_MS = 30 * 60 * 1000;
const CRITICAL_COOLDOWN_MS = 10 * 60 * 1000;

function aqiBand(aqi: number): number {
  if (aqi <= 50) return 0;
  if (aqi <= 100) return 1;
  if (aqi <= 150) return 2;
  if (aqi <= 200) return 3;
  if (aqi <= 300) return 4;
  return 5;
}

function readNumber(key: string): number | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

function writeNumber(key: string, value: number) {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    // ignore storage failures
  }
}

function buildNotification(params: {
  aqi: number;
  pm25: number;
  threshold: number;
  locationLabel: string;
  previousAqi: number | null;
}): LiveNotification | null {
  const { aqi, pm25, threshold, locationLabel, previousAqi } = params;
  const status = getAQIStatusVi(aqi).replace(/^[^\p{L}\p{N}]+/u, '').trim();
  const place = locationLabel || 'vị trí hiện tại';
  const band = aqiBand(aqi);
  const previousBand = previousAqi == null ? null : aqiBand(previousAqi);

  if (aqi >= Math.max(threshold, 151)) {
    return {
      id: `aqi-danger-${band}`,
      title: `AQI ${aqi} tại ${place} - ${status}`,
      body: `PM2.5 hiện khoảng ${pm25.toFixed(1)} ug/m3. Nên giảm hoạt động ngoài trời và chọn lộ trình ít ô nhiễm hơn.`,
      actionLabel: 'Xem lộ trình sạch ->',
      actionPath: '/smart-route?alert=1',
      severity: 'danger',
    };
  }

  if (aqi >= threshold) {
    return {
      id: `aqi-threshold-${band}`,
      title: `AQI ${aqi} vượt ngưỡng của bạn`,
      body: `Khu vực ${place} đang ở mức ${status}. Cân nhắc hạn chế vận động ngoài trời kéo dài.`,
      actionLabel: 'Xem khuyến nghị ->',
      actionPath: '/dashboard',
      severity: 'warning',
    };
  }

  if (previousBand !== null && previousBand >= 2 && band < previousBand && aqi <= 100) {
    return {
      id: `aqi-improved-${band}`,
      title: `Không khí cải thiện tại ${place}`,
      body: `AQI hiện còn ${aqi} (${status}), thấp hơn lần kiểm tra trước. Có thể cân nhắc hoạt động ngoài trời nhẹ.`,
      actionLabel: 'Xem bản đồ AQI ->',
      actionPath: '/map',
      severity: 'info',
    };
  }

  return null;
}

const FCMToast = ({ onNotification }: Props) => {
  const navigate = useNavigate();
  const { location, weather } = useLiveAirContext();
  const { prefs, loading: prefsLoading } = useUserPreferences();
  const [visible, setVisible] = useState(false);
  const [toast, setToast] = useState<LiveNotification | null>(null);

  const candidate = useMemo(() => {
    if (prefsLoading || !prefs.notify_enabled) return null;
    if (weather.loading || weather.error || weather.aqi <= 0) return null;
    if (location.status !== 'active' && location.status !== 'manual') return null;

    return buildNotification({
      aqi: weather.aqi,
      pm25: weather.pm25,
      threshold: prefs.alert_threshold,
      locationLabel: location.label,
      previousAqi: readNumber(LAST_AQI_KEY),
    });
  }, [
    location.label,
    location.status,
    prefs.alert_threshold,
    prefs.notify_enabled,
    prefsLoading,
    weather.aqi,
    weather.error,
    weather.loading,
    weather.pm25,
  ]);

  useEffect(() => {
    if (!candidate) {
      if (!weather.loading && weather.aqi > 0) writeNumber(LAST_AQI_KEY, weather.aqi);
      return;
    }

    const lastShownAt = readNumber(LAST_TOAST_KEY) ?? 0;
    const cooldown = candidate.severity === 'danger' ? CRITICAL_COOLDOWN_MS : COOLDOWN_MS;
    if (Date.now() - lastShownAt < cooldown) {
      writeNumber(LAST_AQI_KEY, weather.aqi);
      return;
    }

    const timer = window.setTimeout(() => {
      setToast(candidate);
      setVisible(true);
      onNotification();
      writeNumber(LAST_TOAST_KEY, Date.now());
      writeNumber(LAST_AQI_KEY, weather.aqi);
    }, 12000);

    return () => window.clearTimeout(timer);
  }, [candidate, onNotification, weather.aqi, weather.loading]);

  useEffect(() => {
    if (!visible) return;
    const dismiss = window.setTimeout(() => setVisible(false), 9000);
    return () => window.clearTimeout(dismiss);
  }, [visible]);

  if (!visible || !toast) return null;

  const now = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  const tone =
    toast.severity === 'danger'
      ? 'border-red-500/30'
      : toast.severity === 'warning'
        ? 'border-orange-500/30'
        : 'border-[#00d4aa]/20';

  return (
    <div className="fixed top-[66px] right-[14px] w-[310px] z-50 animate-slide-in-toast">
      <div className={`rounded-xl p-4 bg-card/95 border ${tone} shadow-xl`}>
        <button onClick={() => setVisible(false)} className="absolute top-2 right-2 text-muted-foreground hover:text-foreground transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>

        <div className="flex items-center gap-2 mb-2">
          <div className="w-5 h-5 rounded bg-gradient-to-br from-[#00d4aa] to-[#0ea5e9] flex items-center justify-center">
            <Wind className="w-3 h-3 text-white" />
          </div>
          <div className="flex-1">
            <span className="text-[10px] font-heading font-bold text-foreground/60">AirWeave</span>
            <span className="text-[9px] text-muted-foreground/60 font-body ml-1">Live AQI Alert · {now}</span>
          </div>
        </div>

        <p className="text-xs font-heading font-bold text-foreground/80 mb-1">{toast.title}</p>
        <p className="text-[11px] font-body text-muted-foreground leading-relaxed mb-3">{toast.body}</p>

        <div className="flex gap-2">
          <Button size="sm" variant="ghost" className="text-[10px] h-6 px-2 text-muted-foreground hover:text-foreground" onClick={() => setVisible(false)}>
            Bỏ qua
          </Button>
          <Button
            size="sm"
            className="text-[10px] h-6 px-2 bg-gradient-to-r from-[#00d4aa] to-[#0ea5e9] text-white border-0 hover:opacity-90"
            onClick={() => {
              setVisible(false);
              navigate(toast.actionPath);
            }}
          >
            {toast.actionLabel}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default FCMToast;
