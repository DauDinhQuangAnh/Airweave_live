import { useState } from 'react';
import { AlertTriangle, MapPin, Heart, Copy, Bot, Check, Loader2, Phone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { sosApi } from '@/integrations/api';
import { useAuth } from '@/hooks/use-auth';
import { useLiveAirContext } from '@/contexts/live-air-context';
import { useMedicalProfiles } from '@/hooks/use-medical-profiles';
import { useAppLang } from '@/hooks/use-app-lang';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { trackBehavior } from '@/lib/behavior-analytics';
import { setConsent } from '@/lib/privacy-consent';
import { INLINE_NOTICES } from '@/lib/app-mode';

export default function SOSButton({ lang: propLang }: { lang?: 'vi' | 'en' }) {
  const contextLang = useAppLang();
  const lang = propLang || contextLang;

  const { user } = useAuth();
  const { profiles } = useMedicalProfiles();
  const { location, weather } = useLiveAirContext();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activating, setActivating] = useState(false);
  const [confirmShare, setConfirmShare] = useState(false);

  const hasGps = !!(location.lat && location.lng);
  const mapsLink = hasGps ? `https://www.google.com/maps?q=${location.lat},${location.lng}` : '';
  const aqiText = weather.aqi ? `AQI ${weather.aqi}` : 'AQI unknown';
  const medicalIdLink = `${window.location.origin}/medical-id-demo`;

  const message = hasGps
    ? lang === 'vi'
      ? `Tôi cần hỗ trợ hô hấp. Tôi đang ở khu vực có chất lượng không khí kém (${aqiText}${weather.pm25 ? `, PM2.5 ${Math.round(weather.pm25)}` : ''}).\nVị trí của tôi: ${mapsLink}\nMedical ID: ${medicalIdLink}`
      : `I need respiratory assistance. I am in a poor air quality area (${aqiText}${weather.pm25 ? `, PM2.5 ${Math.round(weather.pm25)}` : ''}).\nMy Location: ${mapsLink}\nMedical ID: ${medicalIdLink}`
    : lang === 'vi'
    ? `Tôi cần hỗ trợ hô hấp. Tôi không thể chia sẻ GPS tự động. Vui lòng liên hệ tôi để xác nhận vị trí.\nMedical ID: ${medicalIdLink}`
    : `I need respiratory assistance. GPS auto-sharing is disabled. Please contact me to verify location.\nMedical ID: ${medicalIdLink}`;

  const requestShare = () => {
    if (!hasGps) {
      toast.error(lang === 'vi' ? 'GPS chưa sẵn sàng. Vui lòng bật vị trí trước.' : 'GPS is not ready. Please enable location first.');
      return;
    }
    setConfirmShare(true);
  };

  const doShare = async () => {
    setConfirmShare(false);
    setConsent('sos_share', 'granted');
    setShareLoading(true);
    try {
      if (navigator.share) {
        await navigator.share({ title: 'AirWeave SOS', text: message, url: mapsLink });
      } else {
        await navigator.clipboard.writeText(message);
        toast.success(lang === 'vi' ? 'Đã sao chép vị trí và tin nhắn khẩn cấp' : 'Copied location & emergency text');
      }
    } catch { /* user cancelled */ } finally {
      setShareLoading(false);
    }
  };

  const copyMessage = async () => {
    await navigator.clipboard.writeText(message);
    setCopied(true);
    toast.success(lang === 'vi' ? 'Đã sao chép tin nhắn khẩn cấp' : 'Emergency message copied');
    setTimeout(() => setCopied(false), 2000);
  };

  const openAI = () => {
    window.dispatchEvent(
      new CustomEvent('airweave:open-ai-chat', {
        detail: {
          prompt:
            lang === 'vi'
              ? 'Tôi đang khó thở vì ô nhiễm không khí. Hướng dẫn tôi kỹ thuật thở khẩn cấp ngay.'
              : 'I am struggling to breathe due to air pollution. Guide me through emergency breathing techniques immediately.',
        },
      })
    );
    setOpen(false);
  };

  const openMedicalId = () => {
    trackBehavior('medical_id_opened');
    setOpen(false);
    navigate('/medical-id-demo');
  };

  const activateFullSOS = async () => {
    if (!user || profiles.length === 0) {
      toast.error(lang === 'vi' ? 'Cần Medical ID để kích hoạt SOS đầy đủ. Đang mở demo...' : 'Medical ID required for full SOS. Opening demo...');
      navigate('/medical-id-demo');
      return;
    }
    setActivating(true);
    try {
      const event = await sosApi.trigger({
        profile_id: profiles[0].id,
        lat: location.lat,
        lng: location.lng,
        aqi: weather.aqi || undefined,
        pm25: weather.pm25 || undefined,
      });
      setOpen(false);
      navigate(`/qr/${event.share_token}`);
    } catch (e: any) {
      toast.error(e?.message ?? (lang === 'vi' ? 'Không kích hoạt được SOS' : 'Failed to activate SOS'));
    } finally {
      setActivating(false);
    }
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => { trackBehavior('sos_opened'); setOpen(true); }}
        aria-label="AirWeave SOS"
        className="fixed bottom-6 right-6 z-40 pointer-events-auto w-16 h-16 rounded-full flex flex-col items-center justify-center font-heading font-black text-sm select-none active:scale-95 transition-all shadow-xl border-2 border-white/40 dark:border-white/10 bg-gradient-to-br from-[#dc2626] to-[#991b1b] text-white hover:shadow-2xl hover:shadow-red-600/40"
      >
        <AlertTriangle className="w-5 h-5" />
        <span className="text-[11px] leading-none mt-0.5 tracking-wider">SOS</span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md z-[1100] font-body">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0a1f3d] to-[#020617] border border-[#5EEAD4]/40 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-[#5EEAD4]" />
              </div>
              <div>
                <DialogTitle className="font-heading">AirWeave SOS</DialogTitle>
                <DialogDescription className="text-xs">
                  {lang === 'vi' ? 'Hỗ trợ hô hấp khẩn cấp · chọn hành động bên dưới' : 'Emergency respiratory aid · select action below'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Context strip */}
          <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs flex items-center justify-between font-mono">
            <span className="text-muted-foreground">
              {hasGps ? <>📍 {location.label}</> : (lang === 'vi' ? '📍 Chưa chia sẻ vị trí' : '📍 Location off')}
            </span>
            <span className="font-bold">{aqiText}</span>
          </div>

          {/* Inline SOS share confirmation */}
          {confirmShare && (
            <div className="rounded-lg border border-[#5EEAD4]/40 bg-[#0ea5e9]/5 p-3 space-y-2">
              <p className="text-xs font-body text-foreground leading-relaxed">
                {INLINE_NOTICES.sos[lang]}
              </p>
              <div className="flex gap-2">
                <Button size="sm" onClick={doShare} className="flex-1 h-8 text-xs font-heading">
                  {lang === 'vi' ? 'Chia sẻ SOS (demo)' : 'Share SOS (demo)'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setConfirmShare(false)}
                  className="flex-1 h-8 text-xs font-heading"
                >
                  {lang === 'vi' ? 'Huỷ' : 'Cancel'}
                </Button>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="grid gap-2">
            <ActionButton
              icon={<MapPin className="w-4 h-4" />}
              label={hasGps ? (lang === 'vi' ? 'Chia sẻ vị trí của tôi' : 'Share my location') : (lang === 'vi' ? 'Bật & chia sẻ vị trí' : 'Enable & share location')}
              hint={hasGps ? (lang === 'vi' ? 'Gửi qua app nhắn tin / sao chép' : 'Send via messaging apps or copy') : (lang === 'vi' ? 'Cần quyền GPS — sẽ hỏi xác nhận' : 'GPS permission required')}
              onClick={requestShare}
              loading={shareLoading}
              accent
            />
            <ActionButton
              icon={<Heart className="w-4 h-4" />}
              label={lang === 'vi' ? 'Mở Medical ID' : 'Open Medical ID'}
              hint={lang === 'vi' ? 'Xem hồ sơ y tế (demo)' : 'View medical profile (demo)'}
              onClick={openMedicalId}
            />
            <ActionButton
              icon={copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              label={copied ? (lang === 'vi' ? 'Đã sao chép' : 'Copied') : (lang === 'vi' ? 'Sao chép tin nhắn khẩn cấp' : 'Copy emergency message')}
              hint={lang === 'vi' ? 'Dán vào tin nhắn, Zalo, WhatsApp...' : 'Paste into SMS, WhatsApp, etc.'}
              onClick={copyMessage}
            />
            <ActionButton
              icon={<Bot className="w-4 h-4" />}
              label={lang === 'vi' ? 'Mở AI hướng dẫn thở' : 'Open AI Breathing Coach'}
              hint={lang === 'vi' ? 'Trợ lý AI hướng dẫn kỹ thuật thở' : 'AI guided emergency breathing techniques'}
              onClick={openAI}
            />
          </div>

          {/* Emergency call + advanced */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <a
              href="tel:115"
              className="flex items-center justify-center gap-1.5 rounded-lg border-2 border-red-600 bg-red-600 text-white font-heading font-bold h-10 text-sm hover:bg-red-700"
            >
              <Phone className="w-4 h-4" /> {lang === 'vi' ? 'Gọi 115' : 'Call 115'}
            </a>
            <Button
              variant="outline"
              onClick={activateFullSOS}
              disabled={activating}
              className="h-10 text-xs font-heading"
            >
              {activating ? <Loader2 className="w-4 h-4 animate-spin" /> : (lang === 'vi' ? 'Tạo QR cho bác sĩ' : 'Generate Doctor QR')}
            </Button>
          </div>

          <p className="text-[10px] text-muted-foreground text-center pt-1">
            {lang === 'vi'
              ? 'Vị trí & Medical ID không được chia sẻ tự động. Bạn phải xác nhận mỗi hành động.'
              : 'Location & Medical ID are never shared automatically. Actions require your explicit confirmation.'}
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ActionButton({
  icon, label, hint, onClick, loading, accent,
}: {
  icon: React.ReactNode;
  label: string;
  hint: string;
  onClick: () => void;
  loading?: boolean;
  accent?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`group flex items-center gap-3 rounded-xl border p-3 text-left transition-all disabled:opacity-60 ${
        accent
          ? 'border-[#5EEAD4]/40 bg-gradient-to-br from-[#0a1f3d]/5 to-[#0ea5e9]/5 hover:border-[#0ea5e9]/60'
          : 'border-border bg-card hover:bg-accent/40 hover:border-foreground/20'
      }`}
    >
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
        accent ? 'bg-[#0ea5e9]/15 text-[#0ea5e9]' : 'bg-muted text-foreground'
      }`}>
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-heading font-semibold text-sm text-foreground">{label}</p>
        <p className="text-[11px] text-muted-foreground truncate">{hint}</p>
      </div>
    </button>
  );
}
