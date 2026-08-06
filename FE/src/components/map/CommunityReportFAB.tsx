import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Send, X, Loader2, MapPin, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { communityApi } from '@/integrations/api';
import { useAuth } from '@/hooks/use-auth';
import { trackBehavior } from '@/lib/behavior-analytics';

interface CommunityReport {
  lat: number;
  lng: number;
  text: string;
  time: string;
}

interface CommunityReportFABProps {
  lang: 'vi' | 'en';
  userLat: number;
  userLng: number;
  gpsGranted?: boolean;
  defaultOpen?: boolean;
  onSubmit?: (report: CommunityReport) => void;
}

export const COMMUNITY_REPORT_KINDS: { value: string; vi: string; en: string; icon: string }[] = [
  { value: 'smoke', vi: 'Đốt rác / khói đốt', en: 'Burning / smoke', icon: '🔥' },
  { value: 'construction', vi: 'Khói bụi công trình', en: 'Construction dust', icon: '🏗️' },
  { value: 'traffic', vi: 'Kẹt xe / khí thải', en: 'Traffic exhaust', icon: '🚗' },
  { value: 'chemical', vi: 'Mùi hóa chất / mùi lạ', en: 'Chemical / odd smell', icon: '🧪' },
  { value: 'dust', vi: 'Bụi đường bất thường', en: 'Unusual road dust', icon: '🌫️' },
  { value: 'other', vi: 'Khác', en: 'Other', icon: '📢' },
];

const CommunityReportFAB = ({ lang, userLat, userLng, gpsGranted = true, defaultOpen = false, onSubmit }: CommunityReportFABProps) => {
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(defaultOpen);
  const [reportText, setReportText] = useState('');
  const [kind, setKind] = useState('smoke');
  const [submitting, setSubmitting] = useState(false);
  const [useManual, setUseManual] = useState(!gpsGranted);
  const [manualLoc, setManualLoc] = useState('');

  useEffect(() => {
    if (defaultOpen) setShowForm(true);
  }, [defaultOpen]);

  useEffect(() => {
    setUseManual(!gpsGranted);
  }, [gpsGranted]);

  const handleSubmit = async () => {
    if (!user) {
      toast.error(lang === 'vi' ? 'Vui lòng đăng nhập để báo cáo' : 'Please sign in to report');
      return;
    }
    if (!reportText.trim()) return;
    if (useManual && !manualLoc.trim()) {
      toast.error(lang === 'vi' ? 'Vui lòng nhập địa điểm' : 'Please enter a location');
      return;
    }
    setSubmitting(true);
    const desc = useManual
      ? `[${manualLoc.trim().slice(0, 80)}] ${reportText.trim()}`
      : reportText.trim();
    try {
      await communityApi.create({
        lat: userLat,
        lng: userLng,
        kind,
        text: desc.slice(0, 280),
      });
    } catch (error: any) {
      setSubmitting(false);
      toast.error((lang === 'vi' ? 'Gửi thất bại: ' : 'Submit failed: ') + error.message);
      return;
    }
    setSubmitting(false);
    onSubmit?.({
      lat: userLat,
      lng: userLng,
      text: reportText,
      time: lang === 'vi' ? 'Vừa xong' : 'Just now',
    });
    setReportText('');
    setManualLoc('');
    setShowForm(false);
    trackBehavior('community_report_submitted');
    toast.success(
      lang === 'vi'
        ? 'Báo cáo đã được ghi nhận và chờ xác thực cộng đồng.'
        : 'Report submitted — pending community verification.'
    );
  };

  return (
    <div className="absolute bottom-6 right-6 z-[1001]">
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="glass-card p-4 mb-3 w-80 max-w-[calc(100vw-3rem)]"
          >
            <div className="flex items-center justify-between mb-1">
              <h4 className="font-heading text-sm font-bold text-foreground">
                {lang === 'vi' ? '📢 Báo cáo điểm ô nhiễm' : '📢 Report Pollution Hotspot'}
              </h4>
              <button onClick={() => setShowForm(false)} aria-label="Close">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <p className="text-[10px] font-body text-muted-foreground mb-3">
              {lang === 'vi'
                ? 'Báo cáo cộng đồng — không phải dữ liệu trạm chính thức.'
                : 'Community report — not official station data.'}
            </p>

            <div className="grid grid-cols-2 gap-1.5 mb-3">
              {COMMUNITY_REPORT_KINDS.map((k) => (
                <button
                  key={k.value}
                  type="button"
                  onClick={() => setKind(k.value)}
                  className={`text-[11px] px-2 py-1.5 rounded-md border font-heading font-semibold transition-colors text-left ${
                    kind === k.value
                      ? 'border-destructive bg-destructive/10 text-destructive'
                      : 'border-border bg-muted/30 text-muted-foreground hover:border-destructive/40'
                  }`}
                >
                  <span className="mr-1">{k.icon}</span>
                  {lang === 'vi' ? k.vi : k.en}
                </button>
              ))}
            </div>

            {/* Location strip */}
            <div className="mb-2 rounded-md border border-border bg-muted/30 px-2 py-1.5 flex items-center gap-1.5">
              <MapPin className="w-3 h-3 text-primary shrink-0" />
              {!useManual ? (
                <>
                  <span className="text-[10px] font-body text-muted-foreground flex-1 truncate">
                    {gpsGranted
                      ? (lang === 'vi' ? 'Đang dùng vị trí GPS của bạn' : 'Using your current location')
                      : (lang === 'vi' ? `Vị trí ước tính: ${userLat.toFixed(3)}, ${userLng.toFixed(3)}` : `Approx: ${userLat.toFixed(3)}, ${userLng.toFixed(3)}`)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setUseManual(true)}
                    className="text-[10px] font-heading font-semibold text-primary hover:underline inline-flex items-center gap-0.5"
                  >
                    <Pencil className="w-2.5 h-2.5" />
                    {lang === 'vi' ? 'Sửa' : 'Edit'}
                  </button>
                </>
              ) : (
                <Input
                  placeholder={lang === 'vi' ? 'Nhập địa điểm (vd: Ngã 4 Cầu Giấy)' : 'Enter location'}
                  value={manualLoc}
                  onChange={(e) => setManualLoc(e.target.value)}
                  maxLength={80}
                  className="h-7 text-xs border-0 bg-transparent p-0 focus-visible:ring-0"
                />
              )}
            </div>

            <Input
              placeholder={lang === 'vi' ? 'Mô tả ngắn (vd: đốt rác cuối hẻm)' : 'Short description'}
              value={reportText}
              onChange={(e) => setReportText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              maxLength={280}
              className="mb-3"
            />
            <Button
              size="sm"
              className="w-full font-heading gap-1.5"
              onClick={handleSubmit}
              disabled={!reportText.trim() || submitting}
            >
              {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              {lang === 'vi' ? 'Gửi báo cáo' : 'Submit'}
            </Button>
            <p className="text-[10px] text-muted-foreground font-body mt-2 text-center">
              {lang === 'vi'
                ? 'Báo cáo cộng đồng · chờ xác minh · hiệu lực 60 phút'
                : 'Community report · pending verification · active 60 min'}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setShowForm(!showForm)}
        className="w-14 h-14 rounded-full bg-destructive text-destructive-foreground shadow-2xl flex items-center justify-center relative"
        aria-label={lang === 'vi' ? 'Báo cáo điểm ô nhiễm' : 'Report pollution hotspot'}
      >
        <AlertCircle className="w-6 h-6" />
        <span className="absolute inset-0 rounded-full bg-destructive animate-pulse-ripple opacity-40" />
      </motion.button>
    </div>
  );
};

export default CommunityReportFAB;
