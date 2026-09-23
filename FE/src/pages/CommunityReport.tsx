import { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Users,
  Send,
  Clock,
  MapPin,
  Route as RouteIcon,
  AlertTriangle,
  History,
  ShieldCheck,
  Sparkles,
  Flame,
  CheckCircle2,
  Compass,
  Navigation,
  Loader2,
  Radio,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { communityApi } from '@/integrations/api';
import { useAuth } from '@/hooks/use-auth';
import { useLiveAirContext } from '@/contexts/live-air-context';
import { COMMUNITY_REPORT_KINDS } from '@/components/map/CommunityReportFAB';
import { shouldUseDemoData } from '@/lib/app-mode';
import AuroraBackground from '@/components/AuroraBackground';
import DataStatusChip from '@/components/feature-experience/DataStatusChip';
import { hasAirQualityReading } from '@/lib/air-quality';
import CommunityReportMap, { type NearbyReport } from '@/components/community-report/CommunityReportMap';
import { localizeDemoText } from '@/lib/localize-demo';

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
  { id: 'd1', lat: 21.028, lng: 105.854, kind: 'smoke', text: '[confidence:medium] Khói đốt rác vi vùng (demo)', created_at: new Date(Date.now() - 25 * 60_000).toISOString() },
  { id: 'd2', lat: 21.034, lng: 105.821, kind: 'construction', text: '[confidence:low] Bụi công trình đang thi công (demo)', created_at: new Date(Date.now() - 65 * 60_000).toISOString() },
  { id: 'd3', lat: 21.015, lng: 105.845, kind: 'traffic', text: '[confidence:high] Kẹt xe nghiêm trọng, khói nồng (demo)', created_at: new Date(Date.now() - 140 * 60_000).toISOString() },
];

const CONF_META: Record<Confidence, { vi: string; en: string; cls: string; descVi: string; descEn: string }> = {
  low: {
    vi: 'Thấp',
    en: 'Low',
    cls: 'border-amber-500/40 text-amber-300 bg-amber-500/15',
    descVi: 'Nghi ngờ, thấy khói ở xa',
    descEn: 'Suspected, distant smoke',
  },
  medium: {
    vi: 'Trung bình',
    en: 'Medium',
    cls: 'border-orange-500/40 text-orange-300 bg-orange-500/15',
    descVi: 'Thấy rõ nguồn phát, có mùi nhẹ',
    descEn: 'Clearly seen source, slight smell',
  },
  high: {
    vi: 'Cao',
    en: 'High',
    cls: 'border-red-500/40 text-red-300 bg-red-500/15',
    descVi: 'Khói mù mịt, mùi khét nồng, ho cay mắt',
    descEn: 'Dense smoke, pungent smell, eye irritation',
  },
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
  const m = text.match(/^[confidence:(low|medium|high)]/i);
  return m ? (m[1].toLowerCase() as Confidence) : null;
}

function stripConfidence(text: string | null): string {
  if (!text) return '';
  return text.replace(/^[confidence:(low|medium|high)]s*/i, '');
}

const CommunityReport = () => {
  const demo = shouldUseDemoData();
  const outletCtx = useOutletContext<{ lang?: 'vi' | 'en' }>() || {};
  const lang = outletCtx.lang || 'vi';
  const { location, weather } = useLiveAirContext();
  const { user } = useAuth();

  const [kind, setKind] = useState('smoke');
  const [confidence, setConfidence] = useState<Confidence>('medium');
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [history, setHistory] = useState<ReportRow[]>([]);
  const [lastSubmitted, setLastSubmitted] = useState<ReportRow | null>(null);

  // Target report location (defaults to GPS location)
  const [reportCoords, setReportCoords] = useState<{ lat: number; lng: number }>({
    lat: location.lat || 21.0285,
    lng: location.lng || 105.8542,
  });
  const [reportPinSelected, setReportPinSelected] = useState(false);
  const hasKnownLocation = location.status === 'active' || location.status === 'manual';

  // Keep synced if user GPS updates and user hasn't manually pinned
  useEffect(() => {
    if (hasKnownLocation && !reportPinSelected && !lastSubmitted) {
      setReportCoords({ lat: location.lat, lng: location.lng });
    }
  }, [location.lat, location.lng, hasKnownLocation, reportPinSelected, lastSubmitted]);

  // Trip context — set by SmartRoute on navigation, otherwise current GPS snapshot.
  const trip = useMemo(() => {
    try {
      const raw = sessionStorage.getItem('airweave.lasttrip');
      if (raw) return JSON.parse(raw) as { from?: string; to?: string; startedAt?: string; endedAt?: string };
    } catch {
      /* ignore */
    }
    return null;
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!user) return;
      const data = await communityApi.listMine().catch(() => []);
      if (active) setHistory(data.slice(0, 20) as ReportRow[]);
    })();
    return () => {
      active = false;
    };
  }, [user, lastSubmitted]);

  const submit = async () => {
    if (!user) {
      toast.error(lang === 'vi' ? 'Vui lòng đăng nhập để gửi báo cáo' : 'Please sign in to report');
      return;
    }
    if (!hasKnownLocation && !reportPinSelected) {
      toast.error(lang === 'vi' ? 'Cần xác định GPS hoặc chọn điểm báo cáo trên bản đồ.' : 'Get GPS or choose the report point on the map.');
      return;
    }
    setSubmitting(true);
    try {
      const payloadText = `[confidence:${confidence}]${text ? ' ' + text : ''}`;
      const data = await communityApi.create({
        lat: reportCoords.lat,
        lng: reportCoords.lng,
        kind,
        text: payloadText,
        ttl_minutes: 6 * 60,
      });
      toast.success(lang === 'vi' ? 'Đã ghi nhận báo cáo thành công!' : 'Report recorded successfully!');
      setText('');
      if (data) {
        setLastSubmitted(data as ReportRow);
        setHistory((prev) => [data as ReportRow, ...prev]);
      }
    } catch {
      toast.error(lang === 'vi' ? 'Không thể gửi báo cáo. Vui lòng thử lại sau.' : 'Failed to send report.');
    } finally {
      setSubmitting(false);
    }
  };

  const visibleHistory: ReportRow[] = history.length > 0 ? history : (demo ? DEMO_HISTORY : []);

  // Format nearby reports for the map
  const nearbyMapReports: NearbyReport[] = useMemo(() => {
    return visibleHistory.map((r) => ({
      id: r.id,
      lat: r.lat,
      lng: r.lng,
      kind: r.kind,
      text: stripConfidence(r.text),
      created_at: r.created_at,
    }));
  }, [visibleHistory]);

  return (
    <div className="min-h-full flex flex-col bg-[#050911] text-white relative overflow-x-hidden font-body selection:bg-cyan-500/30 selection:text-cyan-200">
      <AuroraBackground />

      <div className="relative z-10 max-w-[1750px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shadow-lg shadow-cyan-500/10">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-heading font-extrabold bg-gradient-to-r from-white via-cyan-100 to-sky-400 bg-clip-text text-transparent">
                  {lang === 'vi' ? 'Báo Cáo Ô Nhiễm Cộng Đồng' : 'Community Air Intel'}
                </h1>
                <span className="hidden md:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-heading font-semibold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                  <Sparkles className="w-3 h-3 text-cyan-400" />
                  Crowdsourced Air Defense
                </span>
              </div>
              <p className="text-xs sm:text-sm text-gray-400 font-body mt-0.5">
                {lang === 'vi'
                  ? 'Chung tay ghi nhận các điểm phát thải vi vùng, bảo vệ người dân và hỗ trợ thuật toán né lộ trình ô nhiễm.'
                  : 'Empower neighbors with real-time pollution sightings feeding Smart Clean Route avoidance.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
            <DataStatusChip
              status={!hasAirQualityReading(weather) ? 'unavailable' : weather.source === 'demo' ? 'demo' : weather.source === 'open-meteo' ? 'estimated' : 'live'}
              lang={lang}
              source={`AQI ${hasAirQualityReading(weather) ? weather.aqi : '—'}`}
              observedAt={weather.updatedAt || null}
            />
            <DataStatusChip
              status={demo ? 'demo' : hasKnownLocation ? 'live' : 'unavailable'}
              lang={lang}
              source={demo ? 'Demo dataset' : 'GPS Route'}
              observedAt={location.updatedAt}
            />
          </div>
        </div>

        {/* 4 KPI Telemetry Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl p-4 bg-gradient-to-br from-[#0B1528]/90 to-[#08101E]/95 border border-sky-500/20 shadow-xl backdrop-blur-xl">
            <div className="flex items-center justify-between text-gray-400 text-xs font-heading">
              <span>{lang === 'vi' ? 'BÁO CÁO CỦA BẠN' : 'YOUR REPORTS'}</span>
              <Users className="w-4 h-4 text-cyan-400" />
            </div>
            <p className="text-2xl font-heading font-bold text-white mt-2">{visibleHistory.length}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">
              {lang === 'vi' ? 'Đóng góp đã lưu hành' : 'Active contributions'}
            </p>
          </div>

          <div className="rounded-2xl p-4 bg-gradient-to-br from-[#0B1528]/90 to-[#08101E]/95 border border-emerald-500/30 shadow-xl backdrop-blur-xl">
            <div className="flex items-center justify-between text-gray-400 text-xs font-heading">
              <span>{lang === 'vi' ? 'HỖ TRỢ NÉ TUYẾN' : 'ROUTING IMPACT'}</span>
              <RouteIcon className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-2xl font-heading font-bold text-emerald-400 mt-2">—</p>
            <p className="text-[11px] text-gray-400 mt-0.5">
              {lang === 'vi' ? 'Chưa có số đo hiệu quả né tuyến' : 'Routing impact not measured'}
            </p>
          </div>

          <div className="rounded-2xl p-4 bg-gradient-to-br from-[#0B1528]/90 to-[#08101E]/95 border border-sky-500/20 shadow-xl backdrop-blur-xl">
            <div className="flex items-center justify-between text-gray-400 text-xs font-heading">
              <span>{lang === 'vi' ? 'THỜI GIAN HIỆU LỰC' : 'DATA VALIDITY'}</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-2xl font-heading font-bold text-amber-300 mt-2">6 {lang === 'vi' ? 'giờ' : 'hours'}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">
              {lang === 'vi' ? 'Tự động hết hạn sau 6 giờ' : 'Automatically expires after 6 hours'}
            </p>
          </div>

          <div className="rounded-2xl p-4 bg-gradient-to-br from-[#0B1528]/90 to-[#08101E]/95 border border-sky-500/20 shadow-xl backdrop-blur-xl">
            <div className="flex items-center justify-between text-gray-400 text-xs font-heading">
              <span>{lang === 'vi' ? 'CẤP ĐỘ TIN CẬY' : 'TRUST TIER'}</span>
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
            </div>
            <p className="text-2xl font-heading font-bold text-cyan-300 mt-2">—</p>
            <p className="text-[11px] text-gray-400 mt-0.5">
              {lang === 'vi' ? 'Chưa có hệ thống xếp hạng độ tin cậy' : 'No trust-tier system available'}
            </p>
          </div>
        </div>

        {/* Main 2-Column Bento Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* LEFT COLUMN: Report Form & My History (5 cols) */}
          <div className="lg:col-span-5 xl:col-span-5 space-y-5">

            {/* Report Form Card */}
            <div className="rounded-3xl bg-gradient-to-br from-[#0B1528]/90 via-[#0D1D35]/85 to-[#08101E]/95 border border-sky-500/20 shadow-2xl backdrop-blur-xl p-5 sm:p-6 space-y-5">

              {/* Trip Context Box */}
              <div className="rounded-2xl border border-orange-500/30 bg-orange-500/10 p-3.5 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
                <div className="min-w-0 text-xs">
                  <p className="font-heading font-bold text-orange-300">
                    {lang === 'vi' ? 'Xác nhận điểm ô nhiễm vừa quan sát' : 'Confirm observed pollution hotspot'}
                  </p>
                  <p className="text-gray-300 font-body mt-0.5 leading-relaxed">
                    {lang === 'vi'
                      ? 'Báo cáo của bạn sẽ trực tiếp được nạp vào Civic Hotspots và thuật toán né tránh của Smart Route trong 6 giờ.'
                      : 'Your report immediately syncs to Civic Hotspots and Smart Clean Route for 6 hours.'}
                  </p>
                </div>
              </div>

              {/* Location & Time Context */}
              <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 space-y-2 text-xs">
                <div className="flex items-center justify-between text-gray-400">
                  <span className="font-heading font-semibold uppercase tracking-wider text-[10px]">
                    {lang === 'vi' ? 'TỌA ĐỘ BÁO CÁO' : 'REPORT COORDINATES'}
                  </span>
                  <span className="text-cyan-400 text-[11px] font-heading font-bold">
                    {hasKnownLocation || reportPinSelected ? `${reportCoords.lat.toFixed(4)}, ${reportCoords.lng.toFixed(4)}` : (lang === 'vi' ? 'Chưa chọn điểm báo cáo' : 'No report point selected')}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <MapPin className="w-4 h-4 text-red-400 shrink-0" />
                  <span className="truncate">
                    {localizeDemoText(location.label, lang) || `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`}
                  </span>
                </div>
                <p className="text-[10px] text-gray-400 italic">
                  {lang === 'vi'
                    ? '💡 Bấm trực tiếp hoặc kéo ghim trên bản đồ ở cột bên phải để chọn vị trí chính xác.'
                    : '💡 Click or drag the pin on the right map to reposition.'}
                </p>
              </div>

              {/* Hotspot Kind Selector (3x2 Grid) */}
              <div className="space-y-2">
                <p className="text-[11px] uppercase tracking-wider text-gray-400 font-heading font-semibold">
                  {lang === 'vi' ? '1. Chọn loại ô nhiễm phát hiện' : '1. Select pollution type'}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {COMMUNITY_REPORT_KINDS.map((k) => {
                    const active = kind === k.value;
                    return (
                      <button
                        key={k.value}
                        type="button"
                        onClick={() => setKind(k.value)}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-heading font-semibold transition-all ${
                          active
                            ? 'bg-cyan-500/20 border-cyan-400/60 text-cyan-300 shadow-md shadow-cyan-500/20'
                            : 'bg-white/[0.03] border-white/10 text-gray-400 hover:border-white/20 hover:text-white'
                        }`}
                      >
                        <span className="text-base leading-none">{k.icon}</span>
                        <span className="truncate">{lang === 'vi' ? k.vi : k.en}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Observation Confidence Selector */}
              <div className="space-y-2">
                <p className="text-[11px] uppercase tracking-wider text-gray-400 font-heading font-semibold">
                  {lang === 'vi' ? '2. Mức độ quan sát thực tế' : '2. Observation confidence'}
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {(['low', 'medium', 'high'] as Confidence[]).map((c) => {
                    const active = confidence === c;
                    const meta = CONF_META[c];
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setConfidence(c)}
                        className={`flex flex-col items-center justify-center p-2 rounded-xl border text-xs font-heading font-bold transition-all ${
                          active
                            ? `${meta.cls} border-current shadow-md`
                            : 'bg-white/[0.03] border-white/10 text-gray-400 hover:border-white/20 hover:text-white'
                        }`}
                      >
                        <span>{meta[lang]}</span>
                        <span className="text-[9px] font-normal opacity-80 truncate mt-0.5">
                          {lang === 'vi' ? meta.descVi.split(',')[0] : meta.descEn.split(',')[0]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Note input */}
              <div className="space-y-1.5">
                <p className="text-[11px] uppercase tracking-wider text-gray-400 font-heading font-semibold">
                  {lang === 'vi' ? '3. Ghi chú hiện trường (tùy chọn)' : '3. Field note (optional)'}
                </p>
                <Input
                  placeholder={lang === 'vi' ? 'Ví dụ: Khói nồng từ đống rác gần chợ, tầm nhìn dưới 50m...' : 'E.g.: Heavy smoke near market, low visibility...'}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  maxLength={140}
                  className="h-11 bg-white/[0.04] border-white/10 text-white placeholder:text-gray-500 rounded-xl text-xs"
                />
              </div>

              {/* Submit Button */}
              <Button
                onClick={submit}
                disabled={submitting}
                className="w-full h-11 font-heading font-bold gap-2 text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 border border-cyan-400/40 shadow-lg shadow-cyan-500/25 transition-all rounded-xl active:scale-[0.98]"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {lang === 'vi' ? 'Đang ghi nhận báo cáo...' : 'Submitting report...'}
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    {lang === 'vi' ? 'Xác Nhận & Gửi Báo Cáo' : 'Confirm & Submit Report'}
                  </>
                )}
              </Button>

              <p className="text-[10px] text-gray-400 font-body text-center italic">
                {lang === 'vi'
                  ? '⚠️ An toàn là trên hết: Tuyệt đối không thao tác gửi báo cáo khi đang điều khiển phương tiện.'
                  : '⚠️ Safety first: Never report while actively operating a vehicle.'}
              </p>
            </div>

            {/* Last Submitted Acknowledgment */}
            {lastSubmitted && (
              <div className="rounded-2xl border border-emerald-500/40 bg-emerald-950/30 p-4 space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-heading font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>{lang === 'vi' ? 'Báo cáo đã lưu hành thành công!' : 'Report active in community feed!'}</span>
                </div>
                <p className="text-xs text-gray-300 font-body">
                  {localizeDemoText(stripConfidence(lastSubmitted.text), lang) || (lang === 'vi' ? 'Điểm ô nhiễm đã được đồng bộ hóa.' : 'Hotspot synchronized.')}
                </p>
                <div className="flex items-center gap-2 text-[11px] text-gray-400">
                  <span className="text-emerald-300 font-heading font-semibold">{lang === 'vi' ? 'Tự động xóa sau 6 giờ' : 'Automatically removed after 6 hours'}</span>
                  <span>·</span>
                  <span>{timeAgo(lastSubmitted.created_at, lang)}</span>
                </div>
              </div>
            )}

            {/* My Report History */}
            <div className="rounded-3xl bg-gradient-to-br from-[#0B1528]/90 via-[#0D1D35]/85 to-[#08101E]/95 border border-sky-500/20 shadow-2xl backdrop-blur-xl p-5 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-cyan-400" />
                  <h3 className="font-heading font-bold text-sm text-white">
                    {lang === 'vi' ? 'Lịch sử báo cáo của bạn' : 'Your report history'}
                  </h3>
                </div>
                <span className="text-[11px] text-gray-400 font-heading font-semibold">
                  {visibleHistory.length} {lang === 'vi' ? 'mục' : 'entries'}
                </span>
              </div>

              {visibleHistory.length === 0 ? (
                <p className="text-xs text-gray-400 font-body text-center py-6">
                  {lang === 'vi' ? 'Bạn chưa có báo cáo nào.' : 'You have no reports yet.'}
                </p>
              ) : (
                <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                  {visibleHistory.map((r) => {
                    const meta = COMMUNITY_REPORT_KINDS.find((k) => k.value === r.kind);
                    const conf = parseConfidence(r.text);
                    const isDemo = r.id.startsWith('d');
                    return (
                      <div
                        key={r.id}
                        className="rounded-xl border border-white/10 bg-white/[0.03] p-3 flex items-center gap-3 hover:bg-white/[0.06] transition-colors"
                      >
                        <span className="text-2xl shrink-0">{meta?.icon ?? '📍'}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-heading font-bold text-white truncate">
                            {lang === 'vi' ? meta?.vi : meta?.en}
                          </p>
                          <p className="text-[11px] text-gray-400 truncate mt-0.5">
                            {localizeDemoText(stripConfidence(r.text), lang) || (lang === 'vi' ? '(không có ghi chú)' : '(no note)')}
                          </p>
                          <p className="text-[10px] text-gray-500 mt-0.5">{timeAgo(r.created_at, lang)}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          {isDemo && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded border border-amber-500/40 bg-amber-500/15 text-amber-300 font-heading font-bold">
                              DEMO
                            </span>
                          )}
                          {conf && (
                            <span className={`text-[9px] px-1.5 py-0.2 rounded border font-heading font-bold uppercase ${CONF_META[conf].cls}`}>
                              {CONF_META[conf][lang]}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

          {/* RIGHT COLUMN: Interactive Map & Community Safety (7 cols) */}
          <div className="lg:col-span-7 xl:col-span-7 space-y-5">

            {/* Map Card */}
            <div className="rounded-3xl bg-gradient-to-br from-[#0B1528]/90 via-[#0D1D35]/85 to-[#08101E]/95 border border-sky-500/20 shadow-2xl backdrop-blur-xl p-5 sm:p-6 space-y-4">

              {/* Map Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
                <div className="flex items-center gap-2.5">
                  <Compass className="w-5 h-5 text-cyan-400 shrink-0" />
                  <div>
                    <h2 className="font-heading text-base font-bold text-white flex items-center gap-2">
                      {lang === 'vi' ? 'Bản Đồ Báo Cáo Vi Vùng & Điểm Nóng Lân Cận' : 'Micro-Zone Community Report Map'}
                    </h2>
                    <p className="text-xs text-gray-400 font-body">
                      {lang === 'vi'
                        ? 'Kéo ghim hoặc bấm trực tiếp lên bản đồ để chọn tọa độ phản ánh'
                        : 'Click or drag the pin to designate report coordinates'}
                    </p>
                  </div>
                </div>

                <div className="px-2.5 py-1 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-[11px] font-heading font-bold text-cyan-300 self-start sm:self-auto">
                  {visibleHistory.length} {lang === 'vi' ? 'Điểm báo cáo' : 'Report points'}
                </div>
              </div>

              {/* Map Viewport Container */}
              <div className="w-full relative rounded-2xl overflow-hidden border border-white/10 min-h-[560px] lg:h-[680px] shadow-2xl">
                <CommunityReportMap
                  userLocation={{ lat: hasKnownLocation ? location.lat : NaN, lng: hasKnownLocation ? location.lng : NaN }}
                  reportLocation={reportCoords}
                  onLocationChange={(coords) => { setReportCoords(coords); setReportPinSelected(true); }}
                  nearbyReports={nearbyMapReports}
                  lang={lang}
                  className="w-full h-full"
                />
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};

export default CommunityReport;
