import { useState, useMemo } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import {
  ShieldAlert,
  Users,
  Radio,
  Building2,
  Camera,
  Database,
  AlertTriangle,
  Route as RouteIcon,
  Flame,
  ShieldCheck,
  MapPin,
  Filter,
  Search,
  Crosshair,
  Sparkles,
  Layers,
  Info,
  CheckCircle2,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useWaqiStations } from '@/hooks/use-waqi-stations';
import {
  hotspotIntelligenceService,
  governmentMetadataGateway,
  cityCameraMetadataGateway,
  getDemoHotspots,
  type HotspotEvent,
} from '@/lib/civic-hotspot';
import { useQuery } from '@tanstack/react-query';
import { useLiveAirContext } from '@/contexts/live-air-context';
import { shouldUseDemoData } from '@/lib/app-mode';
import AuroraBackground from '@/components/AuroraBackground';
import DataStatusChip from '@/components/feature-experience/DataStatusChip';
import HotspotsMap from '@/components/civic-hotspots/HotspotsMap';
import { localizeDemoText, localizeHotspotSource, localizeHotspotStatus } from '@/lib/localize-demo';

const EVENT_LABEL: Record<string, { vi: string; en: string; icon: string }> = {
  construction_dust: { vi: 'Bụi công trình', en: 'Construction dust', icon: '🏗️' },
  burning_smoke: { vi: 'Khói đốt', en: 'Burning smoke', icon: '🔥' },
  traffic_emission: { vi: 'Khí thải giao thông', en: 'Traffic emission', icon: '🚗' },
  chemical_smell: { vi: 'Mùi hóa chất', en: 'Chemical smell', icon: '🧪' },
  road_dust: { vi: 'Bụi đường', en: 'Road dust', icon: '🌫️' },
  abnormal_air_quality: { vi: 'AQI bất thường', en: 'Abnormal AQI', icon: '⚠️' },
  unknown: { vi: 'Chưa rõ', en: 'Unknown', icon: '📍' },
};

const CONF_BADGE: Record<string, { labelVi: string; labelEn: string; classes: string }> = {
  high: {
    labelVi: 'Nguy cơ cao',
    labelEn: 'High Risk',
    classes: 'bg-red-500/20 text-red-300 border-red-500/40 shadow-sm shadow-red-500/20',
  },
  medium: {
    labelVi: 'Trung bình',
    labelEn: 'Medium',
    classes: 'bg-orange-500/20 text-orange-300 border-orange-500/40 shadow-sm shadow-orange-500/20',
  },
  low: {
    labelVi: 'Thấp',
    labelEn: 'Low',
    classes: 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm shadow-amber-500/20',
  },
};

function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function formatDistance(km: number, lang: 'vi' | 'en'): string {
  if (km < 1) {
    const meters = Math.round(km * 1000);
    return lang === 'vi' ? `Cách ~${meters}m` : `~${meters}m away`;
  }
  return lang === 'vi' ? `Cách ~${km.toFixed(1)}km` : `~${km.toFixed(1)}km away`;
}

function HotspotCard({
  ev,
  lang,
  isSelected,
  distanceKm,
  onSelect,
  onAvoid,
}: {
  ev: HotspotEvent;
  lang: 'vi' | 'en';
  isSelected: boolean;
  distanceKm?: number;
  onSelect: () => void;
  onAvoid: () => void;
}) {
  const meta = EVENT_LABEL[ev.eventType] ?? EVENT_LABEL.unknown;
  const conf = CONF_BADGE[ev.confidence] ?? CONF_BADGE.low;

  const cardBorder =
    ev.confidence === 'high'
      ? 'border-red-500/40 hover:border-red-500/70 bg-gradient-to-br from-red-950/20 via-[#0B1528]/95 to-[#08101E]/95'
      : ev.confidence === 'medium'
      ? 'border-orange-500/40 hover:border-orange-500/70 bg-gradient-to-br from-orange-950/20 via-[#0B1528]/95 to-[#08101E]/95'
      : 'border-amber-500/30 hover:border-amber-500/60 bg-gradient-to-br from-amber-950/20 via-[#0B1528]/95 to-[#08101E]/95';

  return (
    <div
      onClick={onSelect}
      className={`cursor-pointer rounded-2xl border p-4 transition-all duration-200 ${cardBorder} ${
        isSelected ? 'ring-2 ring-cyan-400 border-cyan-400 shadow-xl shadow-cyan-500/10' : 'shadow-md'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center text-xl shrink-0">
          {meta.icon}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h3 className="font-heading font-bold text-sm text-white truncate">
              {lang === 'vi' ? meta.vi : meta.en}
            </h3>
            <div className="flex items-center gap-1.5 flex-wrap">
              {distanceKm !== undefined && (
                <span className="text-[10px] px-2 py-0.5 rounded-full border border-cyan-500/40 bg-cyan-500/20 text-cyan-300 font-heading font-semibold flex items-center gap-1 shadow-sm">
                  <Crosshair className="w-2.5 h-2.5 text-cyan-400" />
                  {formatDistance(distanceKm, lang)}
                </span>
              )}
              <span className={`text-[10px] px-2 py-0.5 rounded-full border font-heading font-bold uppercase ${conf.classes}`}>
                {lang === 'vi' ? conf.labelVi : conf.labelEn}
              </span>
              {ev.isDemo && (
                <span className="text-[10px] px-2 py-0.5 rounded-full border border-amber-500/40 bg-amber-500/20 text-amber-300 font-heading font-bold">
                  DEMO
                </span>
              )}
            </div>
          </div>

          <div className="text-[11px] text-gray-400 font-body mt-1 flex items-center gap-2 flex-wrap">
            <span className="text-cyan-300/90">{localizeHotspotSource(ev.sourceLabel, lang)}</span>
            <span>·</span>
            <span>{localizeHotspotStatus(ev.status, lang)}</span>
            <span>·</span>
            <span>{new Date(ev.lastUpdated).toLocaleTimeString(lang === 'vi' ? 'vi-VN' : 'en-US', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>

          {ev.description && (
            <p className="text-xs text-gray-300 font-body mt-2 line-clamp-2 leading-relaxed bg-white/[0.02] p-2 rounded-lg border border-white/5">
              {localizeDemoText(ev.description, lang)}
            </p>
          )}

          <div className="text-[11px] text-gray-400 font-body mt-2 flex items-center justify-between">
            <div className="flex items-center gap-1">
              <MapPin className="w-3 h-3 text-red-400" />
              <span>{ev.location.lat.toFixed(4)}, {ev.location.lng.toFixed(4)}</span>
            </div>
            {ev.sourceType !== 'station_data' && <div className="flex items-center gap-1 text-emerald-400 font-heading font-semibold text-xs">
              <Users className="w-3.5 h-3.5" />
              <span>{ev.confirmationsCount} {lang === 'vi' ? 'báo cáo' : 'reports'}</span>
            </div>}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 mt-3 pt-3 border-t border-white/5">
        <Button
          size="sm"
          className="flex-1 h-8 text-[11px] font-heading font-semibold gap-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl shadow-md shadow-cyan-600/20"
          onClick={(e) => {
            e.stopPropagation();
            onAvoid();
          }}
        >
          <RouteIcon className="w-3 h-3" />
          {lang === 'vi' ? 'Tránh trong Smart Route' : 'Avoid in Route'}
        </Button>
      </div>
    </div>
  );
}

function PlaceholderPanel({
  lang,
  title,
  reason,
  schema,
  statusLabel,
}: {
  lang: 'vi' | 'en';
  title: string;
  reason: string;
  schema?: string;
  statusLabel?: string;
}) {
  return (
    <div className="rounded-2xl border border-sky-500/20 bg-gradient-to-br from-[#0B1528]/90 via-[#0D1D35]/85 to-[#08101E]/95 p-5 space-y-3 shadow-xl">
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-white/5">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-cyan-400" />
          <p className="text-sm font-heading font-bold text-white">{title}</p>
        </div>
        <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-white/[0.05] border border-white/10 text-gray-400 font-heading font-bold uppercase">
          {statusLabel ?? (lang === 'vi' ? 'Sẵn sàng tích hợp' : 'Ready to ingest')}
        </span>
      </div>

      <p className="text-xs text-gray-300 font-body leading-relaxed">{reason}</p>

      {schema && (
        <pre className="text-[11px] bg-black/40 rounded-xl p-3.5 overflow-x-auto font-mono text-cyan-300/80 border border-white/5 leading-relaxed">
          {schema}
        </pre>
      )}
    </div>
  );
}

const CivicHotspots = () => {
  const demo = shouldUseDemoData();
  const outletCtx = useOutletContext<{ lang?: 'vi' | 'en' }>() || {};
  const lang = outletCtx.lang || 'vi';
  const { stations } = useWaqiStations();
  const { location } = useLiveAirContext();
  const navigate = useNavigate();

  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const reportsQuery = useQuery({
    queryKey: ['hotspot-community-reports'],
    queryFn: () => hotspotIntelligenceService.loadCommunityReports(),
    enabled: !demo,
    staleTime: 60_000,
  });

  const liveEvents = useMemo(() => {
    if (demo) return [];
    const reports = (reportsQuery.data ?? []) as never;
    return hotspotIntelligenceService.buildFromReports(
      reports,
      (stations ?? []).map((s) => ({
        uid: s.id,
        lat: s.lat,
        lng: s.lng,
        aqi: s.aqi,
        station: s.name,
        time: s.time,
      }))
    );
  }, [demo, reportsQuery.data, stations]);

  const hasKnownLocation = (location.status === 'active' || location.status === 'manual') &&
    Number.isFinite(location.lat) && Number.isFinite(location.lng);
  const userCoords = useMemo(() => {
    return {
      lat: hasKnownLocation ? location.lat : 21.0285,
      lng: hasKnownLocation ? location.lng : 105.8542,
      label: hasKnownLocation ? localizeDemoText(location.label, lang) : '',
    };
  }, [hasKnownLocation, location.lat, location.lng, location.label, lang]);

  const demoEvents = useMemo(
    () => (demo ? getDemoHotspots({ lat: userCoords.lat, lng: userCoords.lng }) : []),
    [demo, userCoords.lat, userCoords.lng]
  );

  const liveCommunity = liveEvents.filter(
    (e) => e.sourceType === 'community_report' || e.sourceType === 'gps_cluster'
  );
  const liveStation = liveEvents.filter((e) => e.sourceType === 'station_data');

  const demoCommunity = demoEvents.filter(
    (e) => e.sourceType === 'community_report' || e.sourceType === 'gps_cluster'
  );
  const demoStation = demoEvents.filter((e) => e.sourceType === 'station_data');

  const communityList = useMemo(() => [...liveCommunity, ...demoCommunity], [liveCommunity, demoCommunity]);
  const stationList = useMemo(() => [...liveStation, ...demoStation], [liveStation, demoStation]);

  const allEvents = useMemo(() => [...communityList, ...stationList], [communityList, stationList]);

  // Compute distance from user location for each event and sort closest first
  type HotspotEventWithDistance = HotspotEvent & { distanceKm?: number };

  const communityWithDistance = useMemo<HotspotEventWithDistance[]>(() => {
    return communityList
      .map((ev) => ({
        ...ev,
        distanceKm: hasKnownLocation ? calculateDistanceKm(userCoords.lat, userCoords.lng, ev.location.lat, ev.location.lng) : undefined,
      }))
      .sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
  }, [communityList, userCoords, hasKnownLocation]);

  const stationWithDistance = useMemo<HotspotEventWithDistance[]>(() => {
    return stationList
      .map((ev) => ({
        ...ev,
        distanceKm: hasKnownLocation ? calculateDistanceKm(userCoords.lat, userCoords.lng, ev.location.lat, ev.location.lng) : undefined,
      }))
      .sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
  }, [stationList, userCoords, hasKnownLocation]);

  // Telemetry KPIs
  const totalHotspotsCount = allEvents.length;
  const highSeverityCount = allEvents.filter((e) => e.confidence === 'high').length;
  const totalReportCount = communityList.reduce((acc, e) => acc + e.confirmationsCount, 0);

  const govStatus = governmentMetadataGateway.isEnabled() ? 'configured' : 'unavailable';
  const camStatus = cityCameraMetadataGateway.isEnabled() ? 'configured' : 'unavailable';

  const onAvoid = (ev: HotspotEvent) => {
    try {
      sessionStorage.setItem(
        'airweave.smart-route.avoid',
        JSON.stringify({
          lat: ev.location.lat,
          lng: ev.location.lng,
          reason: ev.eventType,
          ts: Date.now(),
        })
      );
    } catch {
      /* ignore */
    }
    toast.success(
      lang === 'vi'
        ? `Đã kích hoạt né điểm "${ev.eventType.replace(/_/g, ' ')}" trong Lộ trình sạch.`
        : `Added "${ev.eventType.replace(/_/g, ' ')}" to Smart Route avoidance.`
    );
    navigate('/smart-route');
  };

  const filterList = (list: HotspotEventWithDistance[]) => {
    return list.filter((ev) => {
      if (severityFilter !== 'all' && ev.confidence !== severityFilter) return false;
      if (searchQuery.trim().length > 0) {
        const q = searchQuery.toLowerCase();
        const meta = EVENT_LABEL[ev.eventType];
        const matchType = meta?.vi.toLowerCase().includes(q) || meta?.en.toLowerCase().includes(q);
        const matchDesc = ev.description?.toLowerCase().includes(q);
        const matchSource = ev.sourceLabel.toLowerCase().includes(q);
        if (!matchType && !matchDesc && !matchSource) return false;
      }
      return true;
    });
  };

  const filteredCommunity = useMemo(() => filterList(communityWithDistance), [communityWithDistance, severityFilter, searchQuery]);
  const filteredStation = useMemo(() => filterList(stationWithDistance), [stationWithDistance, severityFilter, searchQuery]);

  return (
    <div className="min-h-full flex flex-col bg-[#050911] text-white relative overflow-x-hidden font-body selection:bg-cyan-500/30 selection:text-cyan-200">
      <AuroraBackground />

      <div className="relative z-10 max-w-[1750px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-orange-500/10 border border-orange-500/30 text-orange-400 shadow-lg shadow-orange-500/10">
              <Flame className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-heading font-extrabold bg-gradient-to-r from-white via-orange-100 to-amber-400 bg-clip-text text-transparent">
                  {lang === 'vi' ? 'Điểm Nóng Ô Nhiễm' : 'Civic Hotspot Intelligence'}
                </h1>
                <span className="hidden md:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-heading font-semibold bg-orange-500/15 text-orange-300 border border-orange-500/30">
                  <Sparkles className="w-3 h-3 text-orange-400" />
                  Sensor & Crowd Fusion
                </span>
              </div>
              <p className="text-xs sm:text-sm text-gray-400 font-body mt-0.5">
                {lang === 'vi'
                  ? 'Hợp nhất báo cáo vi vùng từ cộng đồng, trạm quan trắc WAQI và cảm biến đối tác theo thời gian thực.'
                  : 'Real-time multi-source pollution detection fusing crowdsourcing, WAQI stations and partner feeds.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-gray-300 font-heading">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>{lang === 'vi' ? 'Bảo mật: Không lưu video thô' : 'Privacy: Raw video is never stored'}</span>
            </div>
            <DataStatusChip
              status={demo ? 'demo' : 'live'}
              lang={lang}
              source={demo ? (lang === 'vi' ? 'Bộ dữ liệu demo' : 'Demo dataset') : (lang === 'vi' ? 'Cộng đồng + WAQI' : 'Community + WAQI')}
              observedAt={Date.now()}
            />
          </div>
        </div>

        {/* 4 KPI Telemetry Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl p-4 bg-gradient-to-br from-[#0B1528]/90 to-[#08101E]/95 border border-sky-500/20 shadow-xl backdrop-blur-xl">
            <div className="flex items-center justify-between text-gray-400 text-xs font-heading">
              <span>{lang === 'vi' ? 'ĐIỂM NÓNG HOẠT ĐỘNG' : 'ACTIVE HOTSPOTS'}</span>
              <Flame className="w-4 h-4 text-orange-400" />
            </div>
            <p className="text-2xl font-heading font-bold text-white mt-2">{totalHotspotsCount}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">
              {communityList.length} {lang === 'vi' ? 'cộng đồng' : 'community'} · {stationList.length} {lang === 'vi' ? 'trạm' : 'station'}
            </p>
          </div>

          <div className="rounded-2xl p-4 bg-gradient-to-br from-[#0B1528]/90 to-[#08101E]/95 border border-red-500/30 shadow-xl backdrop-blur-xl">
            <div className="flex items-center justify-between text-gray-400 text-xs font-heading">
              <span>{lang === 'vi' ? 'MỨC ĐỘ RỦI RO CAO' : 'HIGH SEVERITY'}</span>
              <AlertTriangle className="w-4 h-4 text-red-400" />
            </div>
            <p className="text-2xl font-heading font-bold text-red-400 mt-2">{highSeverityCount}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">
              {lang === 'vi' ? 'Có thể chọn để né trong Smart Route' : 'Can be selected for Smart Route avoidance'}
            </p>
          </div>

          <div className="rounded-2xl p-4 bg-gradient-to-br from-[#0B1528]/90 to-[#08101E]/95 border border-sky-500/20 shadow-xl backdrop-blur-xl">
            <div className="flex items-center justify-between text-gray-400 text-xs font-heading">
              <span>{lang === 'vi' ? 'BÁO CÁO CỘNG ĐỒNG' : 'COMMUNITY REPORTS'}</span>
              <Users className="w-4 h-4 text-cyan-400" />
            </div>
            <p className="text-2xl font-heading font-bold text-cyan-300 mt-2">{totalReportCount}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">
              {lang === 'vi' ? 'Số báo cáo trong các nhóm điểm nóng' : 'Reports in hotspot groups'}
            </p>
          </div>

          <div className="rounded-2xl p-4 bg-gradient-to-br from-[#0B1528]/90 to-[#08101E]/95 border border-sky-500/20 shadow-xl backdrop-blur-xl">
            <div className="flex items-center justify-between text-gray-400 text-xs font-heading">
              <span>{lang === 'vi' ? 'BÁN KÍNH PHÂN TÍCH' : 'ANALYSIS RADIUS'}</span>
              <RouteIcon className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-2xl font-heading font-bold text-emerald-400 mt-2">300m</p>
            <p className="text-[11px] text-gray-400 mt-0.5">
              {lang === 'vi' ? 'Ngưỡng kiểm tra lộ trình, không bảo đảm an toàn' : 'Route analysis threshold, not a safety guarantee'}
            </p>
          </div>
        </div>

        {/* Main 2-Column Bento Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* LEFT COLUMN: Hotspot Feeds & Integration Controls (5 cols) */}
          <div className="lg:col-span-5 xl:col-span-5 space-y-5">
            <div className="rounded-3xl bg-gradient-to-br from-[#0B1528]/90 via-[#0D1D35]/85 to-[#08101E]/95 border border-sky-500/20 shadow-2xl backdrop-blur-xl p-5 space-y-4">

              {/* Search & Severity Filters */}
              <div className="space-y-3 pb-3 border-b border-white/5">
                <div className="relative">
                  <Input
                    placeholder={lang === 'vi' ? 'Tìm kiếm theo sự kiện, địa danh...' : 'Search event, location...'}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-10 bg-white/[0.04] border-white/10 text-white placeholder:text-gray-500 rounded-xl text-xs"
                  />
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>

                {/* Severity Pills */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] font-heading font-semibold text-gray-400 mr-1">
                    {lang === 'vi' ? 'Lọc mức độ:' : 'Severity:'}
                  </span>
                  {[
                    { key: 'all', vi: 'Tất cả', en: 'All' },
                    { key: 'high', vi: '🔴 Cao', en: '🔴 High' },
                    { key: 'medium', vi: '🟠 Vừa', en: '🟠 Med' },
                    { key: 'low', vi: '🟡 Thấp', en: '🟡 Low' },
                  ].map((s) => (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => setSeverityFilter(s.key as any)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-heading font-semibold transition-all ${
                        severityFilter === s.key
                          ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 shadow-sm'
                          : 'bg-white/[0.03] border border-white/10 text-gray-400 hover:text-white'
                      }`}
                    >
                      {lang === 'vi' ? s.vi : s.en}
                    </button>
                  ))}
                </div>
              </div>

              {/* Source Tabs */}
              <Tabs defaultValue="community" className="w-full">
                <TabsList className="grid w-full grid-cols-5 h-10 bg-black/40 border border-white/10 rounded-xl p-1">
                  <TabsTrigger value="community" className="gap-1 text-[11px] rounded-lg data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-300">
                    <Users className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{lang === 'vi' ? 'Dân cư' : 'Crowd'}</span>
                    <span className="text-[10px] opacity-70">({filteredCommunity.length})</span>
                  </TabsTrigger>
                  <TabsTrigger value="station" className="gap-1 text-[11px] rounded-lg data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-300">
                    <Radio className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{lang === 'vi' ? 'Trạm' : 'WAQI'}</span>
                    <span className="text-[10px] opacity-70">({filteredStation.length})</span>
                  </TabsTrigger>
                  <TabsTrigger value="partner" className="gap-1 text-[11px] rounded-lg data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-300">
                    <Database className="w-3.5 h-3.5" />
                    <span>Partner</span>
                  </TabsTrigger>
                  <TabsTrigger value="gov" className="gap-1 text-[11px] rounded-lg data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-300">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Gov</span>
                  </TabsTrigger>
                  <TabsTrigger value="camera" className="gap-1 text-[11px] rounded-lg data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-300">
                    <Camera className="w-3.5 h-3.5" />
                    <span>AI Cam</span>
                  </TabsTrigger>
                </TabsList>

                {/* Community Reports List */}
                <TabsContent value="community" className="space-y-3 mt-4 max-h-[580px] overflow-y-auto pr-1">
                  {filteredCommunity.length === 0 ? (
                    <div className="text-center py-10 space-y-2">
                      <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto opacity-80" />
                      <p className="text-xs text-gray-400 font-body">
                        {lang === 'vi' ? 'Không có điểm nóng nào phù hợp với bộ lọc.' : 'No active community reports match the filter.'}
                      </p>
                    </div>
                  ) : (
                    filteredCommunity.map((e) => (
                      <HotspotCard
                        key={e.id}
                        ev={e}
                        lang={lang}
                        distanceKm={e.distanceKm}
                        isSelected={selectedEventId === e.id}
                        onSelect={() => setSelectedEventId(e.id)}
                        onAvoid={() => onAvoid(e)}
                      />
                    ))
                  )}
                </TabsContent>

                {/* WAQI Stations Anomaly List */}
                <TabsContent value="station" className="space-y-3 mt-4 max-h-[580px] overflow-y-auto pr-1">
                  {filteredStation.length === 0 ? (
                    <div className="text-center py-10 space-y-2">
                      <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto opacity-80" />
                      <p className="text-xs text-gray-400 font-body">
                        {lang === 'vi' ? 'Hiện không có trạm nào vượt ngưỡng ô nhiễm nghiêm trọng (AQI ≥ 200).' : 'No WAQI stations currently reporting severe pollution (AQI ≥ 200).'}
                      </p>
                    </div>
                  ) : (
                    filteredStation.map((e) => (
                      <HotspotCard
                        key={e.id}
                        ev={e}
                        lang={lang}
                        distanceKm={e.distanceKm}
                        isSelected={selectedEventId === e.id}
                        onSelect={() => setSelectedEventId(e.id)}
                        onAvoid={() => onAvoid(e)}
                      />
                    ))
                  )}
                </TabsContent>

                {/* Partner Placeholder */}
                <TabsContent value="partner" className="mt-4">
                  <PlaceholderPanel
                    lang={lang}
                    title={lang === 'vi' ? 'Cảm biến đối tác vi vùng' : 'Partner Micro-Sensor Ingestion'}
                    reason={lang === 'vi'
                      ? 'Cấu trúc sẵn sàng kết nối dữ liệu vi khí hậu từ các đối tác bất động sản, khu đô thị thông minh và cụm công nghiệp.'
                      : 'Structure is ready to ingest micro-climate sensor streams from real estate partners, smart townships and industrial parks.'}
                  />
                </TabsContent>

                {/* Gov API Placeholder */}
                <TabsContent value="gov" className="mt-4">
                  <PlaceholderPanel
                    lang={lang}
                    title={lang === 'vi' ? 'Cổng kết nối dữ liệu Chính quyền Đô thị' : 'Government Open Data Gateway'}
                    reason={lang === 'vi'
                      ? 'Cơ chế sẵn sàng kết nối cổng thông tin môi trường cấp Sở TN&MT và trung tâm điều hành đô thị thông minh (IOC).'
                      : 'Ready to bridge with municipal environmental monitoring centers and smart city IOC platforms.'}
                    schema={`// Government Open Environmental Schema
{
  "event_id": "gov_IOC_7820",
  "source": "government_api",
  "eventType": "industrial_emission",
  "location_grid": [21.034, 105.821],
  "confidence": "high",
  "privacy_level": "anonymized_metadata",
  "raw_video": false,
  "status": "${govStatus}"
}`}
                  />
                </TabsContent>

                {/* Camera AI Placeholder */}
                <TabsContent value="camera" className="mt-4">
                  <PlaceholderPanel
                    lang={lang}
                    title={lang === 'vi' ? 'Metadata Phân tích AI Camera Đô thị' : 'City AI Camera Metadata Feed'}
                    reason={lang === 'vi'
                      ? 'Tiếp nhận chỉ dấu khói bụi/tắc nghẽn từ biên (Edge AI) mà KHÔNG xử lý video thô, KHÔNG nhận diện khuôn mặt, KHÔNG lưu biển số xe.'
                      : 'Receives edge-inferred dust/congestion signals without ever ingesting raw video streams, facial data, or license plates.'}
                    schema={`// Edge AI Anonymized Metadata Schema
{
  "sensor_type": "edge_ai_traffic_camera",
  "smoke_density_score": 0.82,
  "congestion_index": "heavy",
  "coordinates": [21.028, 105.854],
  "license_plate_captured": false,
  "face_detected": false,
  "status": "${camStatus}"
}`}
                  />
                </TabsContent>
              </Tabs>
            </div>
          </div>

          {/* RIGHT COLUMN: Interactive Hotspot Map & Governance Telemetry (7 cols) */}
          <div className="lg:col-span-7 xl:col-span-7 space-y-5">

            {/* Hotspots Map Card */}
            <div className="rounded-3xl bg-gradient-to-br from-[#0B1528]/90 via-[#0D1D35]/85 to-[#08101E]/95 border border-sky-500/20 shadow-2xl backdrop-blur-xl p-5 sm:p-6 space-y-4">

              {/* Map Card Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
                <div className="flex items-center gap-2.5">
                  <Layers className="w-5 h-5 text-orange-400 shrink-0" />
                  <div>
                    <h2 className="font-heading text-base font-bold text-white flex items-center gap-2">
                      {lang === 'vi' ? 'Bản Đồ Điểm Nóng Ô Nhiễm Vi Vùng' : 'Micro-Zone Hotspots Map'}
                    </h2>
                    <p className="text-xs text-gray-400 font-body">
                      {selectedEventId
                        ? (lang === 'vi' ? 'Đang tiêu điểm vào điểm nóng được chọn' : 'Focusing selected hotspot')
                        : hasKnownLocation ? (lang === 'vi' ? 'Hiển thị điểm nóng gần vị trí đã xác nhận.' : 'Showing hotspots near your confirmed location.') : (lang === 'vi' ? 'Chưa có vị trí của bạn; bản đồ hiển thị khu vực mặc định.' : 'Your location is unavailable; showing the default map area.')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                  {hasKnownLocation && <button
                    type="button"
                    onClick={() => setSelectedEventId(null)}
                    className="px-2.5 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-xs font-heading font-semibold text-cyan-300 transition-colors flex items-center gap-1.5 active:scale-95 shadow-sm"
                    title={lang === 'vi' ? 'Zoom lại vị trí của bạn' : 'Zoom to your location'}
                  >
                    <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{lang === 'vi' ? 'Về vị trí của tôi' : 'To My Location'}</span>
                  </button>}

                  {selectedEventId && (
                    <button
                      type="button"
                      onClick={() => setSelectedEventId(null)}
                      className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-heading text-gray-300 transition-colors"
                    >
                      {lang === 'vi' ? 'Bỏ chọn' : 'Clear selection'}
                    </button>
                  )}
                  <div className="px-2.5 py-1 rounded-lg bg-orange-500/15 border border-orange-500/30 text-[11px] font-heading font-bold text-orange-300">
                    {allEvents.length} {lang === 'vi' ? 'Điểm' : 'Hotspots'}
                  </div>
                </div>
              </div>

              {/* Map Viewport Container */}
              <div className="w-full relative rounded-2xl overflow-hidden border border-white/10 min-h-[560px] lg:h-[680px] shadow-2xl">
                <HotspotsMap
                  events={allEvents}
                  selectedEventId={selectedEventId}
                  onSelectEvent={(ev) => setSelectedEventId(ev.id)}
                  onResetFocus={() => setSelectedEventId(null)}
                  onAvoid={onAvoid}
                  lang={lang}
                  userLocation={hasKnownLocation ? userCoords : null}
                  defaultCenter={[userCoords.lat, userCoords.lng]}
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

export default CivicHotspots;
