import { Shield, ShieldCheck, ShieldOff, MapPin, MapPinOff, Heart, BadgeCheck } from 'lucide-react';
import { useConsent } from '@/hooks/use-consent';
import { useLiveAirContext } from '@/contexts/live-air-context';
import { useUserPreferences } from '@/hooks/use-user-preferences';
import { useAppLang } from '@/hooks/use-app-lang';

/**
 * Visible privacy status — Health Profile / Consent / GPS / Medical ID Demo.
 * Read-only, derived state. Never sends anything.
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
      ? { icon: <BadgeCheck className="w-3.5 h-3.5" />, label: lang === 'vi' ? 'Hồ sơ hoàn tất' : 'Profile complete', tone: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300' }
      : { icon: <Shield className="w-3.5 h-3.5" />, label: lang === 'vi' ? 'Hồ sơ chưa hoàn tất' : 'Profile incomplete', tone: 'bg-muted text-muted-foreground' }
  );

  items.push(
    health.granted
      ? { icon: <ShieldCheck className="w-3.5 h-3.5" />, label: lang === 'vi' ? 'Đồng ý lưu hồ sơ' : 'Consent granted', tone: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-300' }
      : health.denied
      ? { icon: <ShieldOff className="w-3.5 h-3.5" />, label: lang === 'vi' ? 'Từ chối lưu hồ sơ' : 'Consent denied', tone: 'bg-amber-500/15 text-amber-600 dark:text-amber-300' }
      : { icon: <Shield className="w-3.5 h-3.5" />, label: lang === 'vi' ? 'Chưa xác nhận đồng ý' : 'Consent pending', tone: 'bg-muted text-muted-foreground' }
  );

  items.push(
    gpsActive
      ? { icon: <MapPin className="w-3.5 h-3.5" />, label: lang === 'vi' ? 'GPS đang bật' : 'GPS active', tone: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300' }
      : gpsDenied
      ? { icon: <MapPinOff className="w-3.5 h-3.5" />, label: lang === 'vi' ? 'GPS bị từ chối' : 'GPS denied', tone: 'bg-amber-500/15 text-amber-600 dark:text-amber-300' }
      : { icon: <MapPin className="w-3.5 h-3.5" />, label: lang === 'vi' ? 'GPS chưa bật' : 'GPS off', tone: 'bg-muted text-muted-foreground' }
  );

  items.push({
    icon: <Heart className="w-3.5 h-3.5" />,
    label: lang === 'vi' ? 'Medical ID · Demo' : 'Medical ID · Demo',
    tone: 'bg-pink-500/15 text-pink-600 dark:text-pink-300',
  });

  if (!compact) {
    items.push(
      tracking.granted
        ? { icon: <BadgeCheck className="w-3.5 h-3.5" />, label: lang === 'vi' ? 'Theo dõi hành vi: bật' : 'Behavior tracking: on', tone: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-300' }
        : { icon: <ShieldOff className="w-3.5 h-3.5" />, label: lang === 'vi' ? 'Theo dõi hành vi: tắt' : 'Behavior tracking: off', tone: 'bg-muted text-muted-foreground' }
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((it, i) => (
        <span
          key={i}
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-heading font-semibold ${it.tone}`}
        >
          {it.icon}
          {it.label}
        </span>
      ))}
    </div>
  );
}
