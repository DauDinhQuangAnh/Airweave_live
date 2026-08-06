import { useEffect, useState } from 'react';
import { MapPin, Loader2, AlertCircle, LocateFixed, Power, Edit3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useLiveAirContext } from '@/contexts/live-air-context';

type Tone = 'idle' | 'requesting' | 'active' | 'denied' | 'manual' | 'unavailable' | 'iframe';

const TONE_STYLES: Record<Tone, { dot: string; chip: string; label: string }> = {
  idle:        { dot: 'bg-muted-foreground/50',  chip: 'bg-muted/60 text-muted-foreground border-border',                 label: 'GPS Off' },
  requesting:  { dot: 'bg-primary animate-pulse', chip: 'bg-primary/10 text-primary border-primary/30',                    label: 'Requesting…' },
  active:      { dot: 'bg-emerald-500 animate-pulse', chip: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',    label: 'Location Active' },
  denied:      { dot: 'bg-red-500',                chip: 'bg-red-500/10 text-red-600 border-red-500/30',                   label: 'Location Denied' },
  manual:      { dot: 'bg-amber-500',              chip: 'bg-amber-500/10 text-amber-600 border-amber-500/30',             label: 'Manual Location' },
  unavailable: { dot: 'bg-orange-500',             chip: 'bg-orange-500/10 text-orange-600 border-orange-500/30',          label: 'GPS Unavailable' },
  iframe:      { dot: 'bg-purple-500',             chip: 'bg-purple-500/10 text-purple-600 border-purple-500/30',          label: 'GPS Blocked (Preview)' },
};

function statusToTone(status: string): Tone {
  switch (status) {
    case 'requesting': return 'requesting';
    case 'active': return 'active';
    case 'denied': return 'denied';
    case 'manual': return 'manual';
    case 'iframe-blocked': return 'iframe';
    case 'unavailable': return 'unavailable';
    default: return 'idle';
  }
}

export default function GPSStatusChip({ lang = 'vi' as 'vi' | 'en' }) {
  const { location, requestLocation, enableLiveTracking, setManualLocation } = useLiveAirContext();
  const [open, setOpen] = useState(false);
  const [manualQuery, setManualQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const tone = statusToTone(location.status);
  const style = TONE_STYLES[tone];
  const Icon = tone === 'requesting' ? Loader2
    : tone === 'denied' || tone === 'unavailable' || tone === 'iframe' ? AlertCircle
    : tone === 'manual' ? Edit3
    : MapPin;

  const updated = location.updatedAt
    ? new Date(location.updatedAt).toLocaleTimeString(lang === 'vi' ? 'vi-VN' : 'en-US', { hour: '2-digit', minute: '2-digit' })
    : null;

  useEffect(() => {
    if (location.status !== 'idle' && location.status !== 'unavailable') return;
    if (location.loading || location.isRefining || location.isLiveTracking) return;
    enableLiveTracking();
  }, [enableLiveTracking, location.isLiveTracking, location.isRefining, location.loading, location.status]);

  const handleManualSearch = async () => {
    const q = manualQuery.trim();
    if (!q) return;
    setSearching(true);
    setSearchError(null);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&accept-language=vi&q=${encodeURIComponent(q)}`
      );
      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) {
        setSearchError(lang === 'vi' ? 'Không tìm thấy địa điểm.' : 'No location found.');
        return;
      }
      const r = data[0];
      const lat = parseFloat(r.lat);
      const lng = parseFloat(r.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        setSearchError(lang === 'vi' ? 'Tọa độ không hợp lệ.' : 'Invalid coordinates.');
        return;
      }
      const label = (r.display_name as string)?.split(',').slice(0, 4).map((s) => s.trim()).join(', ') || q;
      setManualLocation(lat, lng, label);
      setOpen(false);
      setManualQuery('');
    } catch {
      setSearchError(lang === 'vi' ? 'Lỗi tìm kiếm. Thử lại.' : 'Search failed.');
    } finally {
      setSearching(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-heading font-semibold transition hover:opacity-90 ${style.chip}`}
          title={location.label}
          aria-label={`GPS status: ${style.label}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
          <Icon className={`w-3 h-3 ${tone === 'requesting' ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">{style.label}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-4 space-y-3">
        <div>
          <p className="text-xs font-heading font-bold uppercase tracking-wide text-muted-foreground mb-1">
            {lang === 'vi' ? 'Vị trí hiện tại' : 'Current location'}
          </p>
          <p className="text-sm font-body text-foreground truncate" title={location.label}>
            {location.label}
          </p>
          <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
            {typeof location.accuracy === 'number' && <span>±{location.accuracy}m</span>}
            {updated && <span>· {lang === 'vi' ? 'Cập nhật' : 'Updated'} {updated}</span>}
            {location.isLiveTracking && <span className="text-emerald-600">· Live</span>}
          </div>
          {location.error && (
            <p className="mt-2 text-[11px] text-red-600 leading-snug">{location.error}</p>
          )}
          {location.isInIframe && location.status !== 'active' && (
            <p className="mt-2 text-[11px] text-purple-600 leading-snug">
              {lang === 'vi'
                ? 'Đang chạy trong Preview iframe — nếu GPS bị chặn, hãy mở Published URL trực tiếp.'
                : 'Running inside preview iframe — if GPS is blocked, open the Published URL directly.'}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => enableLiveTracking()} className="gap-1.5">
            <LocateFixed className="w-3.5 h-3.5" />
            {location.isLiveTracking
              ? (lang === 'vi' ? 'Định vị đang bật' : 'Location is on')
              : (lang === 'vi' ? 'Bật định vị ngay' : 'Turn on location')}
          </Button>
          <Button size="sm" variant="outline" onClick={() => void requestLocation()} className="gap-1.5">
            <Power className="w-3.5 h-3.5" />
            {lang === 'vi' ? 'Lấy lại GPS' : 'Refresh GPS'}
          </Button>
        </div>

        <div className="pt-2 border-t border-border">
          <p className="text-[11px] font-heading font-semibold text-muted-foreground mb-1.5">
            {lang === 'vi' ? 'Hoặc nhập vị trí thủ công' : 'Or enter location manually'}
          </p>
          <div className="flex gap-1.5">
            <Input
              value={manualQuery}
              onChange={(e) => setManualQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void handleManualSearch(); }}
              placeholder={lang === 'vi' ? 'VD: Cầu Giấy, Hà Nội' : 'e.g. District 1, HCMC'}
              className="h-8 text-xs"
            />
            <Button size="sm" variant="outline" onClick={() => void handleManualSearch()} disabled={searching || !manualQuery.trim()}>
              {searching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : (lang === 'vi' ? 'Tìm' : 'Find')}
            </Button>
          </div>
          {searchError && <p className="mt-1 text-[11px] text-red-600">{searchError}</p>}
        </div>

        <p className="text-[10px] text-muted-foreground leading-snug pt-1 border-t border-border">
          {lang === 'vi'
            ? 'Vị trí chỉ dùng cho AQI, trạm gần nhất, lộ trình & chia sẻ SOS. Không lưu vĩnh viễn.'
            : 'Location is only used for AQI, nearest station, route & SOS sharing. Not stored permanently.'}
        </p>
      </PopoverContent>
    </Popover>
  );
}
