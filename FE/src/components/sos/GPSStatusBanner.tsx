import { MapPin, Loader2, AlertCircle, RefreshCw, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLiveAirContext } from '@/contexts/live-air-context';
import { useAppLang } from '@/hooks/use-app-lang';

export default function GPSStatusBanner({ lang: propLang }: { lang?: 'vi' | 'en' }) {
  const contextLang = useAppLang();
  const lang = propLang || contextLang;
  const { location, requestLocation } = useLiveAirContext();

  const acc = location.accuracy;
  const isHighAcc = acc !== null && acc <= 30;
  const isMidAcc = acc !== null && acc > 30 && acc <= 150;

  let tone = 'border-border bg-card/60';
  let Icon = MapPin;
  let title = lang === 'vi' ? 'Đang xác định vị trí...' : 'Acquiring GPS position...';
  let detail = lang === 'vi' ? 'Truy cập GPS để tìm bệnh viện gần bạn nhất.' : 'Access GPS to locate nearest hospitals.';
  let iconColor = 'text-muted-foreground';

  if (location.permissionState === 'denied') {
    tone = 'border-red-500/40 bg-red-500/10';
    Icon = AlertCircle;
    iconColor = 'text-red-600';
    title = lang === 'vi' ? 'Quyền vị trí bị từ chối' : 'Location permission denied';
    detail = lang === 'vi' ? 'Hãy bật lại GPS trong cài đặt trình duyệt để tìm BV chính xác.' : 'Enable GPS in browser settings for accurate hospital routing.';
  } else if (location.permissionState === 'unsupported') {
    tone = 'border-amber-500/40 bg-amber-500/10';
    Icon = AlertCircle;
    iconColor = 'text-amber-600';
    title = lang === 'vi' ? 'Thiết bị không hỗ trợ GPS' : 'GPS not supported on device';
    detail = lang === 'vi' ? 'Không thể lấy vị trí hiện tại. Vui lòng nhập/chia sẻ vị trí thủ công.' : 'Cannot acquire GPS. Please specify location manually.';
  } else if (location.loading || location.isRefining) {
    Icon = Loader2;
    iconColor = 'text-primary';
    title = location.isRefining
      ? lang === 'vi' ? 'Đang tinh chỉnh GPS độ chính xác cao...' : 'Refining high-precision GPS...'
      : lang === 'vi' ? 'Đang lấy GPS...' : 'Acquiring GPS...';
    detail = acc
      ? lang === 'vi' ? `Hiện tại ±${acc}m. Đang chờ tín hiệu tốt hơn (≤30m).` : `Current ±${acc}m. Waiting for better accuracy (≤30m).`
      : lang === 'vi' ? 'Vui lòng đợi vài giây.' : 'Please wait a few seconds.';
  } else if (isHighAcc) {
    tone = 'border-emerald-500/40 bg-emerald-500/10';
    Icon = CheckCircle2;
    iconColor = 'text-emerald-600';
    title = lang === 'vi' ? `GPS chính xác cao · ±${acc}m` : `High Accuracy GPS · ±${acc}m`;
    detail = location.label;
  } else if (isMidAcc) {
    tone = 'border-amber-500/40 bg-amber-500/10';
    Icon = MapPin;
    iconColor = 'text-amber-600';
    title = lang === 'vi' ? `GPS trung bình · ±${acc}m` : `Moderate GPS Accuracy · ±${acc}m`;
    detail = lang === 'vi' ? `${location.label} — Bấm "Refine" để cải thiện.` : `${location.label} — Tap "Refine" to improve accuracy.`;
  } else if (acc !== null) {
    tone = 'border-orange-500/40 bg-orange-500/10';
    iconColor = 'text-orange-600';
    title = lang === 'vi' ? `GPS thấp · ±${acc}m (IP/Cell Tower)` : `Low Accuracy GPS · ±${acc}m (IP/Cell)`;
    detail = lang === 'vi' ? `${location.label} — Hãy ra ngoài trời và bấm Refine.` : `${location.label} — Move outdoors and tap Refine.`;
  }

  return (
    <div className={`rounded-xl border p-3 flex items-start gap-3 ${tone}`}>
      <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${iconColor} ${location.loading || location.isRefining ? 'animate-spin' : ''}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-heading font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground truncate">{detail}</p>
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={() => requestLocation()}
        disabled={location.loading || location.isRefining}
        className="shrink-0 font-heading text-xs"
      >
        <RefreshCw className={`w-3.5 h-3.5 mr-1 ${location.loading || location.isRefining ? 'animate-spin' : ''}`} />
        {lang === 'vi' ? 'Tinh chỉnh' : 'Refine'}
      </Button>
    </div>
  );
}
