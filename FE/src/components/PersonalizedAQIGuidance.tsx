import { useNavigate } from 'react-router-dom';
import { Heart, Route, Bell, AlertTriangle, MapPin, Bot, Shield, Wind } from 'lucide-react';
import { useLiveAirContext } from '@/contexts/live-air-context';
import { useRiskProfile } from '@/hooks/use-risk-profile';
import { getPersonalizedGuidance, getCTAPriority, CTAKey } from '@/lib/risk-profile';

/**
 * Personalized AQI guidance card — same AQI number, different action for each risk group.
 * Uses the REAL AQI value from LiveAirContext. Never invents data.
 */
export default function PersonalizedAQIGuidance({ lang = 'vi' }: { lang?: 'vi' | 'en' }) {
  const { weather, location } = useLiveAirContext();
  const { risk } = useRiskProfile();
  const navigate = useNavigate();

  const aqi = weather.aqi;
  const guidance = getPersonalizedGuidance(risk, aqi, lang);
  const ctas = getCTAPriority(risk.group).slice(0, 3);

  // Source / freshness transparency — never claim "Live" unless fresh
  const updatedAtMs = weather.updatedAt ? Date.parse(weather.updatedAt) : 0;
  const ageMin = updatedAtMs ? Math.round((Date.now() - updatedAtMs) / 60000) : null;
  const status =
    !aqi || aqi <= 0
      ? { label: lang === 'vi' ? 'Không khả dụng' : 'Unavailable', tone: 'bg-muted text-muted-foreground' }
      : ageMin === null
      ? { label: lang === 'vi' ? 'Ước tính' : 'Estimated', tone: 'bg-amber-500/15 text-amber-600 dark:text-amber-300' }
      : ageMin <= 60
      ? { label: 'Live', tone: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300' }
      : { label: lang === 'vi' ? 'Cũ' : 'Stale', tone: 'bg-amber-500/15 text-amber-600 dark:text-amber-300' };

  const sourceLabel =
    weather.source === 'waqi'
      ? `WAQI${weather.station ? ` · ${weather.station}` : ''}`
      : weather.source === 'open-meteo'
      ? 'Open-Meteo'
      : weather.source || '—';

  return (
    <div className="rounded-2xl border border-border bg-card/95 p-4 sm:p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-4 h-4 text-cyan-500" />
            <p className="text-[10px] uppercase tracking-wider font-heading font-bold text-muted-foreground">
              {lang === 'vi' ? 'Khuyến nghị cá nhân hoá' : 'Personalized guidance'}
            </p>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-300 font-heading font-bold">
              {risk.label[lang]}
            </span>
          </div>
          <p className="font-heading text-base font-bold text-foreground leading-snug">{guidance.headline}</p>
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{guidance.body}</p>
        </div>
      </div>

      {/* Data transparency strip */}
      <div className="flex items-center gap-2 flex-wrap text-[11px] text-muted-foreground border-t border-border/60 pt-2.5">
        <span className={`px-1.5 py-0.5 rounded-full font-heading font-bold ${status.tone}`}>{status.label}</span>
        <span className="inline-flex items-center gap-1">
          <Wind className="w-3 h-3" /> AQI {aqi || '—'}
        </span>
        <span>· {sourceLabel}</span>
        {ageMin !== null && (
          <span>· {lang === 'vi' ? 'Cập nhật' : 'Updated'} {ageMin < 1 ? '<1' : ageMin}m</span>
        )}
        {location.label && <span className="truncate max-w-[40%]">· 📍 {location.label}</span>}
        {typeof weather.pm25 === 'number' && weather.pm25 > 0 && (
          <span className="basis-full text-[10px] text-muted-foreground/80">
            {lang === 'vi' ? 'Tham chiếu' : 'Reference'}: WHO 2021 PM2.5 annual 5 µg/m³ · 24h 15 µg/m³ · {lang === 'vi' ? 'hiện tại' : 'current'} {Math.round(weather.pm25)} µg/m³
          </span>
        )}
      </div>

      {/* Personalized CTAs (priority-ordered) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
        {ctas.map((key) => renderCTA(key, lang, navigate))}
      </div>

      <p className="text-[10px] text-muted-foreground/70 leading-snug">
        {lang === 'vi'
          ? 'AirWeave dùng hồ sơ của bạn để cá nhân hoá khuyến nghị — đây không phải chẩn đoán y khoa.'
          : 'AirWeave uses your profile to personalize guidance — this is not a medical diagnosis.'}
      </p>
    </div>
  );
}

function renderCTA(key: CTAKey, lang: 'vi' | 'en', navigate: (to: string) => void) {
  const map: Record<CTAKey, { icon: React.ReactNode; vi: string; en: string; onClick: () => void; accent?: boolean }> = {
    view_map: { icon: <MapPin className="w-4 h-4" />, vi: 'Xem bản đồ AQI', en: 'View AQI map', onClick: () => navigate('/map') },
    cleaner_route: { icon: <Route className="w-4 h-4" />, vi: 'Tìm lộ trình sạch', en: 'Find cleaner route', onClick: () => navigate('/smart-route') },
    lower_pm25_route: { icon: <Route className="w-4 h-4" />, vi: 'Lộ trình PM2.5 thấp', en: 'Lower PM2.5 route', onClick: () => navigate('/smart-route'), accent: true },
    avoid_high_aqi: { icon: <AlertTriangle className="w-4 h-4" />, vi: 'Tránh khu AQI cao', en: 'Avoid high AQI', onClick: () => navigate('/map'), accent: true },
    check_nearby: { icon: <MapPin className="w-4 h-4" />, vi: 'Khu vực lân cận', en: 'Nearby area', onClick: () => navigate('/map') },
    monitor_area: { icon: <Shield className="w-4 h-4" />, vi: 'Theo dõi nhà / trường', en: 'Monitor home/school', onClick: () => navigate('/profile') },
    enable_alerts: { icon: <Bell className="w-4 h-4" />, vi: 'Bật cảnh báo AQI', en: 'Enable AQI alerts', onClick: () => navigate('/profile') },
    open_sos: { icon: <Heart className="w-4 h-4" />, vi: 'Mở AirWeave SOS', en: 'Open AirWeave SOS', onClick: () => navigate('/sos'), accent: true },
    view_medical_id: { icon: <Heart className="w-4 h-4" />, vi: 'Xem Medical ID', en: 'View Medical ID', onClick: () => navigate('/medical-id-demo') },
    ask_ai: { icon: <Bot className="w-4 h-4" />, vi: 'Hỏi trợ lý AI', en: 'Ask AI assistant', onClick: () => window.dispatchEvent(new CustomEvent('airweave:open-ai-chat')) },
    share_location: { icon: <MapPin className="w-4 h-4" />, vi: 'Chia sẻ vị trí', en: 'Share location', onClick: () => navigate('/sos') },
  };
  const c = map[key];
  return (
    <button
      key={key}
      onClick={c.onClick}
      className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-heading font-semibold transition-all text-left ${
        c.accent
          ? 'border-cyan-400/40 bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 text-cyan-700 dark:text-cyan-200 hover:border-cyan-400/70'
          : 'border-border bg-card hover:bg-accent/40 hover:border-foreground/20 text-foreground'
      }`}
    >
      <span className="shrink-0">{c.icon}</span>
      <span className="truncate">{lang === 'vi' ? c.vi : c.en}</span>
    </button>
  );
}
