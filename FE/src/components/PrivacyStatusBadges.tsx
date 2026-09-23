import { Shield, ShieldCheck, ShieldOff, MapPin, MapPinOff, Heart, BadgeCheck } from 'lucide-react';
import { useConsent } from '@/hooks/use-consent';
import { useLiveAirContext } from '@/contexts/live-air-context';
import { useUserPreferences } from '@/hooks/use-user-preferences';
import { useAppLang } from '@/hooks/use-app-lang';

/**
 * Visible privacy status — Health Profile / Consent / GPS / Medical ID Demo.
 * Read-only, derived state.
 */
export default function PrivacyStatusBadges({ lang: propLang, compact = false }: { lang?: 'vi' | 'en'; compact?: boolean }) {
  const contextLang = useAppLang();
  const lang = propLang || contextLang;

  const health = useConsent('health_profile');
  const tracking = useConsent('behavior_tracking');
  const { location } = useLiveAirContext();
  const { prefs } = useUserPreferences();

  const profileComplete =
    (prefs.medical_history && prefs.medical_history.length > 0) ||
    !!prefs.custom_sensitivity_note ||
    prefs.not_sure;

  const gpsActive = location.permissionState === 'granted' && !location.error;
  const gpsDenied = location.permissionState === 'denied';

  const items: Array<{ icon: React.ReactNode; label: string; tone: string }> = [];

  items.push(
    profileComplete
      ? { icon: <BadgeCheck className="w-3.5 h-3.5" />, label: lang === 'vi' ? 'Hồ sơ y tế: Hoàn tất' : 'Profile: Complete', tone: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' }
      : { icon: <Shield className="w-3.5 h-3.5" />, label: lang === 'vi' ? 'Hồ sơ y tế: Chưa hoàn tất' : 'Profile: Incomplete', tone: 'bg-amber-500/15 text-amber-300 border-amber-500/30' }
  );

  items.push(
    health.granted
      ? { icon: <ShieldCheck className="w-3.5 h-3.5" />, label: lang === 'vi' ? 'Lưu hồ sơ: Đã đồng ý' : 'Consent: Granted', tone: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30' }
      : health.denied
      ? { icon: <ShieldOff className="w-3.5 h-3.5" />, label: lang === 'vi' ? 'Lưu hồ sơ: Từ chối' : 'Consent: Denied', tone: 'bg-rose-500/15 text-rose-300 border-rose-500/30' }
      : { icon: <Shield className="w-3.5 h-3.5" />, label: lang === 'vi' ? 'Lưu hồ sơ: Chưa xác nhận' : 'Consent: Pending', tone: 'bg-white/10 text-white/60 border-white/10' }
  );

  items.push(
    gpsActive
      ? { icon: <MapPin className="w-3.5 h-3.5" />, label: lang === 'vi' ? 'Định vị GPS: Đang bật' : 'GPS: Active', tone: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' }
      : gpsDenied
      ? { icon: <MapPinOff className="w-3.5 h-3.5" />, label: lang === 'vi' ? 'Định vị GPS: Đã tắt' : 'GPS: Disabled', tone: 'bg-rose-500/15 text-rose-300 border-rose-500/30' }
      : { icon: <MapPin className="w-3.5 h-3.5" />, label: lang === 'vi' ? 'Định vị GPS: Chờ quét' : 'GPS: Searching', tone: 'bg-white/10 text-white/60 border-white/10' }
  );

  items.push({
    icon: <Heart className="w-3.5 h-3.5" />,
    label: lang === 'vi' ? 'Thẻ Medical ID Cứu hộ: Sẵn sàng' : 'Medical ID: Ready',
    tone: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
  });

  if (!compact) {
    items.push(
      tracking.granted
        ? { icon: <BadgeCheck className="w-3.5 h-3.5" />, label: lang === 'vi' ? 'Phân tích hành vi: Bật' : 'Behavior tracking: On', tone: 'bg-blue-500/15 text-blue-300 border-blue-500/30' }
        : { icon: <ShieldOff className="w-3.5 h-3.5" />, label: lang === 'vi' ? 'Phân tích hành vi: Tắt' : 'Behavior tracking: Off', tone: 'bg-white/10 text-white/60 border-white/10' }
    );
  }

  return (
    <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-900/60 border border-white/10 backdrop-blur-md flex flex-wrap items-center gap-2 text-xs">
      <span className="font-heading font-bold text-white/50 mr-1 text-[11px] uppercase tracking-wider">{lang === 'vi' ? 'Trạng thái Y tế & Quyền riêng tư' : 'Health & Privacy Status'}:</span>
      {items.map((it, i) => (
        <span
          key={i}
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-heading font-semibold border ${it.tone}`}
        >
          {it.icon}
          {it.label}
        </span>
      ))}
    </div>
  );
}
