import { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Users, Send, Clock, MapPin, Route as RouteIcon, AlertTriangle, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { communityApi } from '@/integrations/api';
import { useAuth } from '@/hooks/use-auth';
import { useLiveAirContext } from '@/contexts/live-air-context';
import { COMMUNITY_REPORT_KINDS } from '@/components/map/CommunityReportFAB';
import { USE_DEMO_DATA } from '@/lib/app-mode';
import FeatureExperienceLayout from '@/components/feature-experience/FeatureExperienceLayout';
import DataStatusChip, { type DataStatus } from '@/components/feature-experience/DataStatusChip';

type Confidence = 'low' | 'medium' | 'high';

interface ReportRow {
  id: string;
  lat: number;
  lng: number;
  kind: string;
  text: string | null;
  created_at: string;
}

const DEMO_HISTORY: ReportRow[] = [
  { id: 'd1', lat: 21.0, lng: 105.8, kind: 'smoke',        text: '[confidence:medium] Khói đốt rác (demo)', created_at: new Date(Date.now() - 22 * 60_000).toISOString() },
  { id: 'd2', lat: 21.0, lng: 105.8, kind: 'construction', text: '[confidence:low] Bụi công trình (demo)',  created_at: new Date(Date.now() - 65 * 60_000).toISOString() },
  { id: 'd3', lat: 21.0, lng: 105.8, kind: 'traffic',      text: '[confidence:high] Kẹt xe nghiêm trọng (demo)', created_at: new Date(Date.now() - 140 * 60_000).toISOString() },
];

const CONF_META: Record<Confidence, { vi: string; en: string; cls: string }> = {
  low:    { vi: 'Thấp',       en: 'Low',    cls: 'border-amber-500/40 text-amber-600 dark:text-amber-300' },
  medium: { vi: 'Trung bình', en: 'Medium', cls: 'border-orange-500/40 text-orange-600 dark:text-orange-300' },
  high:   { vi: 'Cao',        en: 'High',   cls: 'border-red-500/40 text-red-600 dark:text-red-300' },
};

function timeAgo(iso: string, lang: 'vi' | 'en') {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (m < 1) return lang === 'vi' ? 'vừa xong' : 'just now';
  if (m < 60) return lang === 'vi' ? `${m} phút trước` : `${m}m ago`;
  const h = Math.floor(m / 60);
  return lang === 'vi' ? `${h} giờ trước` : `${h}h ago`;
}

function parseConfidence(text: string | null): Confidence | null {
  if (!text) return null;
  const m = text.match(/^\[confidence:(low|medium|high)\]/i);
  return m ? (m[1].toLowerCase() as Confidence) : null;
}

function stripConfidence(text: string | null): string {
  if (!text) return '';
  return text.replace(/^\[confidence:(low|medium|high)\]\s*/i, '');
}

const CommunityReport = () => {
  const { lang } = useOutletContext<{ lang: 'vi' | 'en' }>();
  const { location, weather } = useLiveAirContext();
  const { user } = useAuth();

  const [kind, setKind] = useState('smoke');
  const [confidence, setConfidence] = useState<Confidence>('medium');
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [history, setHistory] = useState<ReportRow[]>([]);
  const [lastSubmitted, setLastSubmitted] = useState<ReportRow | null>(null);

  // Trip context — set by SmartRoute on navigation, otherwise current GPS snapshot.
  const trip = useMemo(() => {
    try {
      const raw = sessionStorage.getItem('airweave.lasttrip');
      if (raw) return JSON.parse(raw) as { from?: string; to?: string; startedAt?: string; endedAt?: string };
    } catch { /* ignore */ }
    return null;
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!user) return;
      const data = await communityApi.listMine().catch(() => []);
      if (active) setHistory(data.slice(0, 20) as ReportRow[]);
    })();
    return () => { active = false; };
  }, [user, lastSubmitted]);

  const submit = async () => {
    if (!user) {
      toast.error(lang === 'vi' ? 'Vui lòng đăng nhập' : 'Please sign in');
      return;
    }
    setSubmitting(true);
    try {
      const payloadText = `[confidence:${confidence}]${text ? ' ' + text : ''}`;
      const data = await communityApi.create({
        lat: location.lat,
        lng: location.lng,
        kind,
        text: payloadText,
        ttl_minutes: 6 * 60,
      });
      toast.success(lang === 'vi' ? 'Đã ghi nhận báo cáo.' : 'Report recorded.');
      setText('');
      if (data) setLastSubmitted(data as ReportRow);
    } catch {
      toast.error(lang === 'vi' ? 'Không gửi được. Thử lại sau.' : 'Failed to send.');
    } finally {
      setSubmitting(false);
    }
  };

  const visibleHistory: ReportRow[] = history.length > 0 ? history : (USE_DEMO_DATA ? DEMO_HISTORY : []);

  return (
    <FeatureExperienceLayout
      lang={lang}
      heading={lang === 'vi' ? 'Xác nhận điểm nóng sau chuyến đi' : 'Confirm hotspots after your trip'}
      subheading={lang === 'vi'
        ? 'Một chạm để giúp cộng đồng có dữ liệu chính xác hơn.'
        : 'One tap to help the community with sharper data.'}
      benefits={[
        { title: lang === 'vi' ? 'Xác nhận nhanh điểm nóng sau chuyến đi' : 'Fast post-trip confirmation',
          text: lang === 'vi'
            ? 'Giúp hệ thống cập nhật chính xác, kịp thời hơn.'
            : 'Helps the system stay accurate and timely.',
          icon: <RouteIcon className="w-4 h-4" /> },
        { title: lang === 'vi' ? 'Cộng đồng cùng nâng chất lượng dữ liệu' : 'Community-driven data quality',
          text: lang === 'vi'
            ? 'Dữ liệu tốt hơn, hành động hiệu quả hơn.'
            : 'Better data, smarter action.',
          icon: <Users className="w-4 h-4" /> },
      ]}
      chips={lang === 'vi'
        ? ['Báo cáo hậu chuyến đi', 'Bản đồ cộng đồng', 'Xác nhận bằng 1 chạm']
        : ['Post-trip report', 'Community map', '1-tap confirm']}
    >
      <div className="max-w-3xl mx-auto space-y-4">
        {/* Post-trip prompt */}
        <div className="rounded-2xl border border-orange-500/30 bg-orange-500/5 p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="font-heading text-sm font-bold text-foreground">
              {lang === 'vi'
                ? 'Bạn vừa đi qua khu vực có dấu hiệu ô nhiễm. Xác nhận điểm nóng?'
                : 'You just passed through a possibly polluted area. Confirm a hotspot?'}
            </p>
            <p className="text-xs text-muted-foreground font-body mt-0.5">
              {lang === 'vi'
                ? 'Báo cáo của bạn sẽ vào Civic Hotspot Intelligence và Smart Route trong 6 giờ.'
                : 'Your report feeds Civic Hotspot Intelligence and Smart Route for the next 6 hours.'}
            </p>
          </div>
        </div>

        {/* Trip info card */}
        <div className="rounded-2xl border border-border bg-card/80 p-4">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-heading font-bold mb-2">
            {lang === 'vi' ? 'Bối cảnh chuyến đi' : 'Trip context'}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-1.5 gap-x-3 text-[12px] font-body text-foreground">
            <div className="flex gap-2"><Clock className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
              <span><b>{lang === 'vi' ? 'Thời gian' : 'Time'}:</b>{' '}
                {trip?.startedAt
                  ? `${new Date(trip.startedAt).toLocaleTimeString(lang === 'vi' ? 'vi-VN' : 'en-US', { hour: '2-digit', minute: '2-digit' })} – ${trip.endedAt ? new Date(trip.endedAt).toLocaleTimeString(lang === 'vi' ? 'vi-VN' : 'en-US', { hour: '2-digit', minute: '2-digit' }) : 'now'}`
                  : new Date().toLocaleTimeString(lang === 'vi' ? 'vi-VN' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <div className="flex gap-2"><MapPin className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
              <span className="truncate"><b>{lang === 'vi' ? 'Khu vực' : 'Area'}:</b>{' '}
                {location.label || `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`}
              </span>
            </div>
            <div className="sm:col-span-2 flex flex-wrap items-center gap-1.5 text-muted-foreground">
              <span className="font-heading font-semibold text-foreground">{lang === 'vi' ? 'Nguồn gợi ý' : 'Trigger source'}:</span>
              <DataStatusChip status="live"        lang={lang} source="GPS route" compact />
              <DataStatusChip status={weather.aqi >= 100 ? 'live' : 'estimated'} lang={lang} source={`AQI ${weather.aqi || '—'}`} compact />
              <DataStatusChip status="placeholder" lang={lang} source={lang === 'vi' ? 'Báo cáo cộng đồng' : 'Community'} compact />
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="rounded-2xl border border-border bg-card/80 p-4 space-y-4">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-heading font-bold mb-2">
              {lang === 'vi' ? 'Loại điểm nóng' : 'Hotspot type'}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {COMMUNITY_REPORT_KINDS.map((k) => (
                <button
                  key={k.value}
                  type="button"
                  onClick={() => setKind(k.value)}
                  className={`flex items-center gap-1.5 px-2 py-2 rounded-lg border text-[11px] font-heading font-semibold transition-colors ${
                    kind === k.value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-muted/30 text-muted-foreground hover:border-primary/40'
                  }`}
                >
                  <span>{k.icon}</span>
                  <span className="truncate">{lang === 'vi' ? k.vi : k.en}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-heading font-bold mb-2">
              {lang === 'vi' ? 'Mức độ tin cậy bạn quan sát' : 'Your observation confidence'}
            </p>
            <div className="grid grid-cols-3 gap-2">
              {(['low', 'medium', 'high'] as Confidence[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setConfidence(c)}
                  className={`px-2 py-2 rounded-lg border text-[11px] font-heading font-bold transition-colors ${
                    confidence === c
                      ? `bg-background ${CONF_META[c].cls}`
                      : 'border-border bg-muted/30 text-muted-foreground hover:border-primary/40'
                  }`}
                >
                  {CONF_META[c][lang]}
                </button>
              ))}
            </div>
          </div>

          <Input
            placeholder={lang === 'vi' ? 'Thêm ghi chú về hiện tượng bạn quan sát (tuỳ chọn)' : 'Add a note about what you observed (optional)'}
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={140}
          />

          <Button onClick={submit} disabled={submitting} className="w-full gap-2 font-heading font-semibold">
            <Send className="w-4 h-4" />
            {lang === 'vi' ? 'Xác nhận' : 'Confirm'}
          </Button>

          <p className="text-[10px] text-muted-foreground font-body italic">
            {lang === 'vi'
              ? 'Vị trí lấy từ GPS. Báo cáo hết hạn sau 6 giờ. Không thực hiện báo cáo khi đang lái xe.'
              : 'Location is from GPS. Report expires after 6h. Do not report while driving.'}
          </p>
        </div>

        {/* Last submitted ack */}
        {lastSubmitted && (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4">
            <p className="font-heading text-sm font-bold text-foreground mb-1">
              {lang === 'vi' ? 'Báo cáo đã được ghi nhận' : 'Report recorded'}
            </p>
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-body">
              <DataStatusChip status="placeholder" lang={lang} source="Pending" compact />
              <DataStatusChip status="live"        lang={lang} source={lang === 'vi' ? 'Nguồn: Community' : 'Source: Community'} compact />
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-heading font-bold uppercase ${CONF_META[confidence].cls}`}>
                {lang === 'vi' ? 'Tin cậy' : 'Confidence'}: {CONF_META[confidence][lang]}
              </span>
              <span className="text-muted-foreground">· {timeAgo(lastSubmitted.created_at, lang)}</span>
            </div>
          </div>
        )}

        {/* History */}
        <div>
          <h2 className="flex items-center gap-1.5 text-sm font-heading font-bold text-foreground mb-2">
            <History className="w-4 h-4 text-primary" />
            {lang === 'vi' ? 'Lịch sử báo cáo' : 'Report history'}
          </h2>
          {visibleHistory.length === 0 ? (
            <p className="text-xs text-muted-foreground font-body">
              {lang === 'vi' ? 'Bạn chưa có báo cáo nào.' : 'You have no reports yet.'}
            </p>
          ) : (
            <div className="space-y-2">
              {visibleHistory.map((r) => {
                const meta = COMMUNITY_REPORT_KINDS.find((k) => k.value === r.kind);
                const conf = parseConfidence(r.text);
                const isDemo = r.id.startsWith('d');
                return (
                  <div key={r.id} className="rounded-xl border border-border bg-card/60 p-3 flex items-center gap-3">
                    <span className="text-xl">{meta?.icon ?? '📍'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-heading font-semibold text-foreground truncate">
                        {lang === 'vi' ? meta?.vi : meta?.en}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {stripConfidence(r.text) || (lang === 'vi' ? '(không có ghi chú)' : '(no note)')} · {timeAgo(r.created_at, lang)}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <DataStatusChip
                        status={isDemo ? 'demo' : 'placeholder'}
                        lang={lang}
                        compact
                      />
                      {conf && (
                        <span className={`text-[9px] px-1.5 py-0.5 rounded border font-heading font-bold uppercase ${CONF_META[conf].cls}`}>
                          {CONF_META[conf][lang]}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <p className="text-[10px] text-muted-foreground font-body italic mt-2">
            {lang === 'vi'
              ? 'Báo cáo mới có trạng thái Pending hoặc Community detected. Verified chỉ áp dụng khi có quy trình xác minh thực sự.'
              : 'New reports start as Pending or Community detected. Verified is only applied with a real verification pipeline.'}
          </p>
        </div>
      </div>
    </FeatureExperienceLayout>
  );
};

export default CommunityReport;
