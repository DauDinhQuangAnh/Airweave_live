import { Shield, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useConsent } from '@/hooks/use-consent';
import { useAuth } from '@/hooks/use-auth';
import { useAppLang } from '@/hooks/use-app-lang';
import { preferencesApi } from '@/integrations/api';
import { toast } from 'sonner';
import { clearBehavior } from '@/lib/behavior-analytics';
import { CONSENT_LABELS, clearConsent } from '@/lib/privacy-consent';

/**
 * Privacy & Consent settings card — drop into Profile.
 * Lets the user grant/revoke consents, opt out of tracking, and delete their health profile.
 */
export default function PrivacyConsentCard({ lang: propLang }: { lang?: 'vi' | 'en' }) {
  const contextLang = useAppLang();
  const lang = propLang || contextLang;
  const { user } = useAuth();

  const health = useConsent('health_profile');
  const tracking = useConsent('behavior_tracking');
  const gps = useConsent('gps_location');

  const rows: Array<{ key: 'health_profile' | 'behavior_tracking' | 'gps_location'; state: ReturnType<typeof useConsent> }> = [
    { key: 'health_profile', state: health },
    { key: 'gps_location', state: gps },
    { key: 'behavior_tracking', state: tracking },
  ];

  const handleDeleteProfile = async () => {
    if (!user) return;
    if (!confirm(lang === 'vi' ? 'Xoá toàn bộ hồ sơ sức khoẻ và lịch sử hành vi trên thiết bị?' : 'Delete your health profile and on-device behavior history?')) return;
    try {
      await preferencesApi.upsert({
        medical_history: [],
        custom_sensitivity_note: '',
        not_sure: false,
        sensitive_group: 'none',
      });
      clearBehavior();
      clearConsent();
      toast.success(lang === 'vi' ? 'Đã xoá hồ sơ và lịch sử hành vi.' : 'Profile & behavior history deleted.');
    } catch (e: any) {
      toast.error(e?.message ?? 'Error');
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card/95 p-4 sm:p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Shield className="w-4 h-4 text-cyan-500" />
        <h3 className="font-heading font-bold text-sm">
          {lang === 'vi' ? 'Quyền riêng tư & Đồng ý' : 'Privacy & Consent'}
        </h3>
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed">
        {lang === 'vi'
          ? 'AirWeave chỉ lưu dữ liệu sức khoẻ và vị trí của bạn sau khi bạn đồng ý. Bạn có thể tắt theo dõi hành vi hoặc xoá hồ sơ bất kỳ lúc nào.'
          : 'AirWeave only stores your health and location data after you consent. You can opt out of behavior tracking or delete your profile at any time.'}
      </p>

      <div className="space-y-2">
        {rows.map(({ key, state }) => (
          <div key={key} className="flex items-center justify-between gap-3 rounded-xl border border-border/60 px-3 py-2">
            <div className="min-w-0">
              <p className="text-sm font-heading font-semibold text-foreground truncate">{CONSENT_LABELS[key][lang]}</p>
              <p className="text-[11px] text-muted-foreground">
                {state.granted ? (lang === 'vi' ? 'Đã đồng ý' : 'Granted') : state.denied ? (lang === 'vi' ? 'Đã từ chối' : 'Denied') : (lang === 'vi' ? 'Chưa quyết định' : 'Pending')}
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button size="sm" variant={state.granted ? 'default' : 'outline'} className="h-7 text-[11px] px-2.5" onClick={state.grant}>
                {lang === 'vi' ? 'Đồng ý' : 'Grant'}
              </Button>
              <Button size="sm" variant={state.denied ? 'destructive' : 'outline'} className="h-7 text-[11px] px-2.5" onClick={state.deny}>
                {lang === 'vi' ? 'Từ chối' : 'Deny'}
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Button variant="outline" size="sm" className="w-full" onClick={handleDeleteProfile}>
        <Trash2 className="w-3.5 h-3.5 mr-1.5" />
        {lang === 'vi' ? 'Xoá hồ sơ sức khoẻ & lịch sử hành vi' : 'Delete profile & behavior history'}
      </Button>

      <p className="text-[10px] text-muted-foreground/70 leading-snug">
        {lang === 'vi'
          ? 'AirWeave không chia sẻ hồ sơ sức khoẻ với bên thứ ba. Báo cáo hành vi (nếu bật) chỉ ở dạng tổng hợp ẩn danh phục vụ demo.'
          : 'AirWeave does not share your health profile with third parties. Behavior reports (if enabled) are aggregated and anonymized for demo purposes only.'}
      </p>
    </div>
  );
}
