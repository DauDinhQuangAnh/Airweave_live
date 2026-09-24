import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useOutletContext, useSearchParams, useNavigate } from 'react-router-dom';
import {
  Wind,
  MapPin,
  Layers,
  Sparkles,
  ArrowLeft,
  Home,
  Radio,
  Activity,
  Flame,
  Search,
  Users,
  Cpu,
  Eye,
  Info,
  Route as RouteIcon,
  Crosshair,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { useLiveAirContext } from '@/contexts/live-air-context';
import DataStatusChip from '@/components/feature-experience/DataStatusChip';
import AuroraBackground from '@/components/AuroraBackground';
import MapSearchBar from '@/components/map/MapSearchBar';
import AQIInteractiveMap from '@/components/map/AQIInteractiveMap';
import { PAMStation, getAQIColorNew, getAQIStatus } from '@/lib/pam-stations';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { airApi, communityApi, nodesApi } from '@/integrations/api';
import { useCommunityRealtime } from '@/hooks/use-community-realtime';
import { hotspotIntelligenceService, HotspotEvent } from '@/lib/civic-hotspot';
import { getDemoHotspots } from '@/lib/civic-hotspot/demo-hotspots';
import { isDemoMode } from '@/lib/demo/demo-mode';
import { localizeDemoText } from '@/lib/localize-demo';
import { toast } from 'sonner';

/** Thuật toán Haversine tính khoảng cách (km) */
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
  return Number((R * c).toFixed(2));
}

function formatDistance(distKm: number | null, lang: 'vi' | 'en'): string {
  if (distKm === null || !Number.isFinite(distKm)) return '—';
  if (distKm < 1) {
    const meters = Math.round(distKm * 1000);
    return lang === 'vi' ? `Cách ~${meters}m` : `~${meters}m away`;
  }
  return lang === 'vi' ? `Cách ~${distKm}km` : `~${distKm}km away`;
}

function getAqiRecommendation(aqi: number, lang: 'vi' | 'en') {
  if (aqi <= 50) {
    return {
      title: lang === 'vi' ? 'Chất lượng không khí Tốt' : 'Good Air Quality',
      desc: lang === 'vi' ? 'Tốt cho mọi hoạt động ngoài trời và rèn luyện thể thao.' : 'Ideal for outdoor activities.',
      color: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
    };
  }
  if (aqi <= 100) {
    return {
      title: lang === 'vi' ? 'Chất lượng trung bình' : 'Moderate Air Quality',
      desc: lang === 'vi' ? 'Người có bệnh hô hấp nhạy cảm nên hạn chế vận động gắng sức ngoài trời.' : 'Sensitive groups should reduce strenuous outdoor exertion.',
      color: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
    };
  }
  if (aqi <= 150) {
    return {
      title: lang === 'vi' ? 'Không lành mạnh cho nhóm nhạy cảm' : 'Unhealthy for Sensitive Groups',
      desc: lang === 'vi' ? 'Nên đeo khẩu trang chống bụi PM2.5 khi ra ngoài.' : 'Wear a PM2.5 mask outdoors.',
      color: 'bg-orange-500/10 border-orange-500/30 text-orange-300',
    };
  }
  return {
    title: lang === 'vi' ? 'Ô nhiễm NGUY HẠI' : 'Hazardous Pollution',
    desc: lang === 'vi' ? 'Hạn chế tối đa ra ngoài. Bật máy lọc không khí trong nhà.' : 'Avoid outdoor activities. Run indoor air purifiers.',
    color: 'bg-rose-500/10 border-rose-500/30 text-rose-300',
  };
}

function hasAirQualityReading(weather: any): boolean {
  return Boolean(weather && !weather.loading && !weather.error && weather.aqi > 0);
}

function hasWeatherMetric(weather: any, key: 'temperature' | 'humidity' | 'windSpeed'): boolean {
  return Boolean(
    weather &&
    !weather.loading &&
    !weather.error &&
    typeof weather[key] === 'number' &&
    Number.isFinite(weather[key])
  );
}

export default function AirMap() {
  const { lang } = useOutletContext<{ lang: 'vi' | 'en' }>();
  const { location, weather } = useLiveAirContext();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [activeTab, setActiveTab] = useState<'waqi' | 'iot' | 'community'>('waqi');
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);
  const [searchPin, setSearchPin] = useState<{ lat: number; lng: number; label: string } | null>(null);

  const [communityReports, setCommunityReports] = useState<any[]>([]);
  const [iotNodes, setIotNodes] = useState<any[]>([]);
  const [rawStations, setRawStations] = useState<PAMStation[]>([]);

  const [layers, setLayers] = useState({ community: true, micro: true, civic: true });
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleLayer = (key: 'community' | 'micro' | 'civic') => {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const demo = isDemoMode();

  const hasKnownLocation = Boolean(
    location.status !== 'idle' &&
    location.status !== 'denied' &&
    location.lat &&
    location.lng
  );

  const userCoords = useMemo(
    () => ({
      lat: location.lat || 21.0285,
      lng: location.lng || 105.8542,
      label: location.label || (lang === 'vi' ? 'Hà Nội' : 'Hanoi'),
    }),
    [location.lat, location.lng, location.label, lang]
  );

  // Load Stations over WAQI bounds or list
  useEffect(() => {
    let active = true;
    const loadWAQI = async () => {
      try {
        const data = await airApi.waqiBounds(
          userCoords.lat - 0.4,
          userCoords.lng - 0.4,
          userCoords.lat + 0.4,
          userCoords.lng + 0.4
        );
        if (active && data?.stations) {
          const mapped = data.stations.map((s: any) => ({
            id: `waqi-${s.uid}`,
            name: s.station || 'Trạm quan trắc WAQI',
            city: userCoords.label.split(',')[0],
            district: 'Khu vực lân cận',
            aqi: s.aqi,
            lat: s.lat,
            lng: s.lng,
            pm25: null,
            pm10: null,
            humidity: null,
            temperature: null,
            trend: s.aqi <= 50 ? 'stable' : s.aqi <= 100 ? 'up' : 'down',
            updatedAt: s.time?.iso || new Date().toISOString(),
          }));
          setRawStations(mapped);
        }
      } catch (err) {
        console.warn('WAQI bounds fetch error:', err);
      }
    };
    loadWAQI();
    return () => {
      active = false;
    };
  }, [userCoords.lat, userCoords.lng, userCoords.label]);

  // Load IoT Nodes & Community Reports
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const [rData, nData] = await Promise.all([
          communityApi.listActive(undefined, 200).catch(() => []),
          nodesApi.listNodes().catch(() => []),
        ]);
        if (active) {
          setCommunityReports(Array.isArray(rData) ? rData : []);
          setIotNodes(Array.isArray(nData) ? nData : []);
        }
      } catch (err) {
        console.warn('Failed to load map overlays:', err);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  // Realtime updates for community reports
  useCommunityRealtime({
    onNew: (r) => setCommunityReports((prev) => [r, ...prev.filter((x) => x.id !== r.id)].slice(0, 200)),
    onDeleted: (id) => setCommunityReports((prev) => prev.filter((x) => x.id !== id)),
  });

  const demoEvents = useMemo(
    () => (demo ? getDemoHotspots({ lat: userCoords.lat, lng: userCoords.lng }) : []),
    [demo, userCoords.lat, userCoords.lng]
  );

  const civicHotspots = useMemo(() => {
    return hotspotIntelligenceService.buildFromReports(
      communityReports as never,
      (rawStations ?? []).map((s) => ({
        uid: s.id,
        lat: s.lat,
        lng: s.lng,
        aqi: s.aqi,
        station: s.name,
      }))
    );
  }, [communityReports, rawStations]);

  const allHotspots = useMemo(() => [...civicHotspots, ...demoEvents], [civicHotspots, demoEvents]);

  // Stations with distance calculated and sorted
  const sortedStations = useMemo(() => {
    return (rawStations ?? [])
      .map((s) => ({
        ...s,
        distanceKm: hasKnownLocation ? calculateDistanceKm(userCoords.lat, userCoords.lng, s.lat, s.lng) : null,
      }))
      .sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
  }, [rawStations, userCoords, hasKnownLocation]);

  // IoT Nodes with distance
  const sortedIotNodes = useMemo(() => {
    return (iotNodes ?? [])
      .map((n) => ({
        ...n,
        distanceKm: hasKnownLocation ? calculateDistanceKm(userCoords.lat, userCoords.lng, n.lat, n.lng) : null,
      }))
      .sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
  }, [iotNodes, userCoords, hasKnownLocation]);

  const activeStation = useMemo(() => {
    if (!selectedStationId) return sortedStations[0] || null;
    return sortedStations.find((s) => s.id === selectedStationId) || sortedStations[0] || null;
  }, [selectedStationId, sortedStations]);

  const totalSensorsCount = sortedStations.length + sortedIotNodes.length;
  const hasWeatherReading = hasAirQualityReading(weather);
  const regionalMeanAqi = useMemo(() => {
    if (sortedStations.length === 0) return hasWeatherReading ? weather.aqi : null;
    const nearby = sortedStations.slice(0, 5);
    const sum = nearby.reduce((acc, cur) => acc + cur.aqi, 0);
    return Math.round(sum / nearby.length);
  }, [sortedStations, weather.aqi, hasWeatherReading]);

  const windSpeedKmh = hasWeatherMetric(weather, 'windSpeed') ? Math.round(weather.windSpeed) : null;
  const windStatus =
    windSpeedKmh === null
      ? lang === 'vi'
        ? 'Chưa có số liệu gió'
        : 'Wind data unavailable'
      : windSpeedKmh > 15
      ? lang === 'vi'
        ? 'Khuếch tán tốt'
        : 'Good dispersion'
      : windSpeedKmh > 8
      ? lang === 'vi'
        ? 'Vừa phải'
        : 'Moderate dispersion'
      : lang === 'vi'
      ? 'Lặng gió, dễ ứ đọng'
      : 'Calm wind, pollutants may accumulate';
  const highRiskHotspotsCount = allHotspots.filter((h) => h.confidence === 'high').length;

  const onAvoidStation = (station: PAMStation) => {
    try {
      sessionStorage.setItem(
        'airweave.smart-route.avoid',
        JSON.stringify({
          lat: station.lat,
          lng: station.lng,
          reason: `Trạm ${station.name} (AQI ${station.aqi})`,
          ts: Date.now(),
        })
      );
    } catch {
      /* ignore */
    }
    toast.success(
      lang === 'vi'
        ? `Đã thêm trạm "${station.name}" vào danh sách né tránh trong Lộ trình sạch.`
        : `Added "${station.name}" to Smart Route avoidance.`
    );
    navigate('/smart-route');
  };

  const aqiRec = activeStation ? getAqiRecommendation(activeStation.aqi, lang) : null;

  return (
    <div className="relative min-h-screen bg-[#050911] text-foreground font-body overflow-x-hidden selection:bg-cyan-500/30 selection:text-cyan-200">
      <AuroraBackground />

      {/* Fluid Full-Width Container (No Side-Gaps!) */}
      <div className="relative z-10 w-full max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 pt-5 pb-24 space-y-5">

        {/* Top Header & Navigation */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5 rounded-3xl bg-[#0c1322]/90 backdrop-blur-xl border border-white/10 shadow-2xl">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(-1)}
                className="bg-white/[0.04] border-white/10 hover:bg-white/10 text-gray-200 rounded-xl h-9"
              >
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                {lang === 'vi' ? 'Quay lại' : 'Back'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/')}
                className="bg-white/[0.04] border-white/10 hover:bg-white/10 text-gray-200 rounded-xl h-9"
              >
                <Home className="w-4 h-4 mr-1.5" />
                {lang === 'vi' ? 'Trang chủ' : 'Home'}
              </Button>
            </div>

            <div className="h-6 w-px bg-white/10 hidden sm:block" />

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500 via-sky-600 to-blue-700 flex items-center justify-center shadow-lg shadow-cyan-500/30 ring-2 ring-cyan-400/30 shrink-0">
                <Layers className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-[10px] font-heading font-bold uppercase tracking-wider text-cyan-300">
                  <Sparkles className="w-3 h-3 text-cyan-400" />
                  {lang === 'vi' ? 'BẢN ĐỒ KHÍ QUYỂN THỜI GIAN THỰC' : 'REAL-TIME ATMOSPHERIC MAP'}
                </div>
                <h1 className="text-lg sm:text-xl font-heading font-black text-white tracking-tight leading-tight mt-0.5">
                  {lang === 'vi' ? 'Bản Đồ AQI Vi Vùng' : 'Micro-Zone AQI Map'}
                </h1>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-gray-300 font-heading">
              <MapPin className="w-3.5 h-3.5 text-cyan-400" />
              <span className="max-w-[200px] truncate">{userCoords.label}</span>
            </div>
            <DataStatusChip
              status={demo ? 'demo' : hasWeatherReading || sortedStations.length ? 'live' : 'unavailable'}
              lang={lang}
              source={demo ? 'WAQI + IoT Nodes (Demo)' : 'WAQI Network + IoT'}
              observedAt={weather.updatedAt || null}
            />
          </div>
        </div>

        {/* 4 Telemetry KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="rounded-2xl p-4 bg-gradient-to-br from-[#0B1528]/90 to-[#08101E]/95 border border-sky-500/20 shadow-xl backdrop-blur-xl">
            <div className="flex items-center justify-between text-gray-400 text-xs font-heading">
              <span>{lang === 'vi' ? 'CẢM BIẾN ONLINE' : 'ACTIVE SENSORS'}</span>
              <Radio className="w-4 h-4 text-cyan-400" />
            </div>
            <p className="text-2xl font-heading font-bold text-white mt-2">{totalSensorsCount}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">
              {sortedStations.length} {lang === 'vi' ? 'trạm WAQI' : 'WAQI stations'} · {sortedIotNodes.length} {lang === 'vi' ? 'node IoT' : 'IoT nodes'}
            </p>
          </div>

          <div className="rounded-2xl p-4 bg-gradient-to-br from-[#0B1528]/90 to-[#08101E]/95 border border-sky-500/20 shadow-xl backdrop-blur-xl">
            <div className="flex items-center justify-between text-gray-400 text-xs font-heading">
              <span>{lang === 'vi' ? 'AQI TRUNG BÌNH VÙNG' : 'REGIONAL MEAN AQI'}</span>
              <Activity className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <p className="text-2xl font-heading font-bold text-white">{regionalMeanAqi ?? '—'}</p>
              {regionalMeanAqi !== null && (
                <span className="text-[11px] px-2 py-0.5 rounded-md font-heading font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  {getAQIStatus(regionalMeanAqi, lang)}
                </span>
              )}
            </div>
            <p className="text-[11px] text-gray-400 mt-0.5">
              {sortedStations.length ? (lang === 'vi' ? 'Tính từ các trạm quan trắc lân cận' : 'Calculated from nearby stations') : (lang === 'vi' ? 'Chỉ số tại vị trí hiện tại' : 'Current location reading')}
            </p>
          </div>

          <div className="rounded-2xl p-4 bg-gradient-to-br from-[#0B1528]/90 to-[#08101E]/95 border border-sky-500/20 shadow-xl backdrop-blur-xl">
            <div className="flex items-center justify-between text-gray-400 text-xs font-heading">
              <span>{lang === 'vi' ? 'KHÍ TƯỢNG & GIÓ' : 'WIND & DISPERSION'}</span>
              <Wind className="w-4 h-4 text-sky-400" />
            </div>
            <p className="text-2xl font-heading font-bold text-sky-300 mt-2">{windSpeedKmh === null ? '—' : `${windSpeedKmh} km/h`}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">{windStatus}</p>
          </div>

          <div className="rounded-2xl p-4 bg-gradient-to-br from-[#0B1528]/90 to-[#08101E]/95 border border-rose-500/30 shadow-xl backdrop-blur-xl">
            <div className="flex items-center justify-between text-gray-400 text-xs font-heading">
              <span>{lang === 'vi' ? 'ĐIỂM NÓNG Ô NHIỄM' : 'CIVIC HOTSPOTS'}</span>
              <Flame className="w-4 h-4 text-orange-400" />
            </div>
            <p className="text-2xl font-heading font-bold text-orange-400 mt-2">{allHotspots.length}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">
              {highRiskHotspotsCount} {lang === 'vi' ? 'điểm mức độ cao' : 'high severity alerts'}
            </p>
          </div>
        </div>

        {/* Re-balanced Bento Grid: 4 Cols Left Sidebar Controls + 8 Cols Right Map Canvas */}
        <div className={`grid gap-5 items-start ${isFullscreen ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-12'}`}>

          {/* LEFT COLUMN: Search & Sensor Explorer (4 cols on desktop = 33% width) */}
          {!isFullscreen && (
            <div className="lg:col-span-4 xl:col-span-4 space-y-4">

              {/* Search & Station Selector */}
              <div className="rounded-3xl bg-gradient-to-br from-[#0B1528]/90 via-[#0D1D35]/85 to-[#08101E]/95 border border-sky-500/20 shadow-2xl backdrop-blur-xl p-4 sm:p-5 space-y-4">
                <div>
                  <h3 className="font-heading font-bold text-sm text-white flex items-center gap-2">
                    <Search className="w-4 h-4 text-cyan-400" />
                    <span>{lang === 'vi' ? 'Tìm kiếm địa điểm vi vùng' : 'Search Micro-Location'}</span>
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {lang === 'vi' ? 'Nhập tên phường, quận, ngõ phố để bay đến điểm đo' : 'Search streets or districts to inspect AQI'}
                  </p>
                </div>

                <MapSearchBar
                  lang={lang}
                  onSelect={(lat, lng, label) => {
                    setSearchPin({ lat, lng, label });
                  }}
                />

                {/* Source Tabs */}
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full pt-1">
                  <TabsList className="grid w-full grid-cols-3 h-10 bg-black/50 border border-white/10 rounded-xl p-1">
                    <TabsTrigger value="waqi" className="gap-1 text-xs rounded-lg data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-300 font-semibold">
                      <Radio className="w-3.5 h-3.5" />
                      <span>{lang === 'vi' ? 'Trạm' : 'WAQI'}</span>
                      <span className="text-[10px] opacity-70">({sortedStations.length})</span>
                    </TabsTrigger>
                    <TabsTrigger value="iot" className="gap-1 text-xs rounded-lg data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-300 font-semibold">
                      <Cpu className="w-3.5 h-3.5" />
                      <span>IoT</span>
                      <span className="text-[10px] opacity-70">({sortedIotNodes.length})</span>
                    </TabsTrigger>
                    <TabsTrigger value="community" className="gap-1 text-xs rounded-lg data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-300 font-semibold">
                      <Users className="w-3.5 h-3.5" />
                      <span>{lang === 'vi' ? 'Cộng đồng' : 'Crowd'}</span>
                      <span className="text-[10px] opacity-70">({communityReports.length})</span>
                    </TabsTrigger>
                  </TabsList>

                  {/* WAQI Stations List */}
                  <TabsContent value="waqi" className="space-y-2 mt-3 max-h-[360px] overflow-y-auto pr-1">
                    {sortedStations.length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-6">
                        {lang === 'vi' ? 'Đang tải danh sách trạm quan trắc...' : 'Loading monitoring stations...'}
                      </p>
                    ) : (
                      sortedStations.map((s) => {
                        const color = getAQIColorNew(s.aqi);
                        const isSelected = s.id === (activeStation?.id || selectedStationId);

                        return (
                          <div
                            key={s.id}
                            onClick={() => setSelectedStationId(s.id)}
                            className={`p-3 rounded-2xl border cursor-pointer transition-all duration-200 ${
                              isSelected
                                ? 'bg-cyan-950/40 border-cyan-400 ring-2 ring-cyan-400/30 shadow-lg shadow-cyan-500/10'
                                : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.06]'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2.5">
                              <div className="flex items-start gap-2.5 min-w-0 flex-1">
                                <div
                                  className="w-10 h-10 rounded-xl flex flex-col items-center justify-center font-heading font-black text-white shrink-0 shadow-md"
                                  style={{ backgroundColor: color }}
                                >
                                  <span className="text-xs leading-none">{s.aqi}</span>
                                  <span className="text-[8px] opacity-80 uppercase leading-none mt-0.5">AQI</span>
                                </div>

                                <div className="min-w-0 flex-1">
                                  <h4 className="font-heading font-bold text-xs text-white leading-tight line-clamp-2" title={localizeDemoText(s.name, lang)}>
                                    {localizeDemoText(s.name, lang)}
                                  </h4>
                                  <div className="flex items-center gap-2 mt-1 text-[11px] text-gray-400">
                                    <span>{localizeDemoText(s.district, lang)}, {localizeDemoText(s.city, lang)}</span>
                                    <span>·</span>
                                    <span className="text-cyan-300 font-semibold">{s.distanceKm === null ? '—' : formatDistance(s.distanceKm, lang)}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex flex-col items-end gap-1 shrink-0">
                                <span className={`text-[10px] font-heading font-bold px-2 py-0.5 rounded-full border ${getAqiRecommendation(s.aqi, lang).color}`}>
                                  {getAQIStatus(s.aqi, lang)}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </TabsContent>

                  {/* IoT Nodes List */}
                  <TabsContent value="iot" className="space-y-2 mt-3 max-h-[360px] overflow-y-auto pr-1">
                    {sortedIotNodes.length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-6">
                        {lang === 'vi' ? 'Không có cảm biến IoT nào đang kết nối tại khu vực.' : 'No active IoT nodes connected nearby.'}
                      </p>
                    ) : (
                      sortedIotNodes.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => setSelectedStationId(n.id)}
                          className={`p-3 rounded-2xl border cursor-pointer transition-all duration-200 ${
                            selectedStationId === n.id
                              ? 'bg-cyan-950/40 border-cyan-400 ring-2 ring-cyan-400/30'
                              : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.06]'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2.5 min-w-0 flex-1">
                              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex flex-col items-center justify-center font-heading font-black text-cyan-300 shrink-0 shadow-md">
                                <span className="text-xs leading-none">{n.aqi}</span>
                                <span className="text-[8px] opacity-80 uppercase leading-none mt-0.5">AQI</span>
                              </div>
                              <div className="min-w-0 flex-1">
                                <h4 className="font-heading font-bold text-xs text-white leading-tight line-clamp-2" title={n.name}>
                                  {n.name}
                                </h4>
                                <p className="text-[11px] text-gray-400 truncate mt-0.5">🏢 {n.organization_name || 'Node IoT AirWeave'}</p>
                              </div>
                            </div>
                            <span className="text-[10px] font-heading font-bold text-cyan-300 shrink-0">
                              {formatDistance(n.distanceKm, lang)}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </TabsContent>

                  {/* Community Reports List */}
                  <TabsContent value="community" className="space-y-2 mt-3 max-h-[360px] overflow-y-auto pr-1">
                    {communityReports.length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-6">
                        {lang === 'vi' ? 'Chưa có báo cáo điểm ô nhiễm cộng đồng.' : 'No community pollution reports.'}
                      </p>
                    ) : (
                      communityReports.map((r) => (
                        <div key={r.id} className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1">
                          <div className="flex items-center justify-between text-xs font-heading font-bold text-rose-400">
                            <span>📢 {r.kind || 'Báo cáo'}</span>
                            <span className="text-[10px] text-gray-500">{new Date(r.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <p className="text-xs text-gray-300">{r.text || 'Bụi công trình / Khói ô nhiễm'}</p>
                        </div>
                      ))
                    )}
                  </TabsContent>
                </Tabs>
              </div>

              {/* Active Sensor Inspector Card */}
              {activeStation && (
                <div className="rounded-3xl bg-gradient-to-br from-[#0B1528]/90 via-[#0D1D35]/85 to-[#08101E]/95 border border-sky-500/25 shadow-2xl backdrop-blur-xl p-4 sm:p-5 space-y-4">
                  <div className="flex items-center justify-between gap-2 pb-3 border-b border-white/10">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-cyan-400" />
                      <h3 className="font-heading font-bold text-sm text-white">
                        {lang === 'vi' ? 'Thông số trạm đo' : 'Station Telemetry'}
                      </h3>
                    </div>
                    <span className="text-[11px] text-gray-400 font-mono">
                      ID: {activeStation.id}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-3">
                      <h4 className="font-heading font-black text-sm sm:text-base text-white leading-snug line-clamp-2 flex-1 min-w-0" title={localizeDemoText(activeStation.name, lang)}>
                        {localizeDemoText(activeStation.name, lang)}
                      </h4>
                      <div
                        className="px-3 py-1 rounded-xl text-xs sm:text-sm font-heading font-black text-white shadow-md shrink-0"
                        style={{ backgroundColor: getAQIColorNew(activeStation.aqi) }}
                      >
                        AQI {activeStation.aqi}
                      </div>
                    </div>
                    <p className="text-xs text-gray-400">{localizeDemoText(activeStation.district, lang)}, {localizeDemoText(activeStation.city, lang)}</p>
                  </div>

                  {/* Metrics Grid */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-0.5">
                      <span className="text-[10px] text-gray-400 font-heading block">{lang === 'vi' ? 'BỤI MỊN PM2.5' : 'PM2.5 DUST'}</span>
                      <p className="text-sm font-heading font-bold text-white">
                        {activeStation.pm25 != null ? `${activeStation.pm25} µg/m³` : '—'}
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-0.5">
                      <span className="text-[10px] text-gray-400 font-heading block">{lang === 'vi' ? 'KHOẢNG CÁCH' : 'DISTANCE'}</span>
                      <p className="text-sm font-heading font-bold text-cyan-300">
                        {activeStation.distanceKm === null ? '—' : formatDistance(activeStation.distanceKm, lang)}
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-0.5">
                      <span className="text-[10px] text-gray-400 font-heading block">{lang === 'vi' ? 'NHIỆT ĐỘ & ĐỘ ẨM' : 'TEMP & HUMIDITY'}</span>
                      <p className="text-sm font-heading font-bold text-white">
                        {hasWeatherMetric(weather, 'temperature') ? `${weather.temperature}°C` : '—'} · {hasWeatherMetric(weather, 'humidity') ? `${weather.humidity}%` : '—'}
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-0.5">
                      <span className="text-[10px] text-gray-400 font-heading block">{lang === 'vi' ? 'XU HƯỚNG AQI' : 'AQI TREND'}</span>
                      <p className="text-sm font-heading font-bold text-emerald-400">
                        {activeStation.trend === 'up'
                          ? (lang === 'vi' ? '↗ Đang tăng' : '↗ Rising')
                          : activeStation.trend === 'down'
                            ? (lang === 'vi' ? '↘ Đang giảm' : '↘ Falling')
                            : activeStation.trend === 'stable' ? (lang === 'vi' ? '→ Ổn định' : '→ Stable') : (lang === 'vi' ? 'Chưa đủ dữ liệu' : 'Not enough data')}
                      </p>
                    </div>
                  </div>

                  {/* Recommendation Banner */}
                  {aqiRec && (
                    <div className={`p-3.5 rounded-2xl border space-y-1 ${aqiRec.color}`}>
                      <p className="text-xs font-heading font-bold flex items-center gap-1.5">
                        <Info className="w-3.5 h-3.5" />
                        <span>{aqiRec.title}</span>
                      </p>
                      <p className="text-[11px] leading-relaxed opacity-90">
                        {aqiRec.desc}
                      </p>
                    </div>
                  )}

                  {/* Action Button */}
                  <div className="pt-1">
                    <Button
                      onClick={() => onAvoidStation(activeStation)}
                      className="w-full h-10 text-xs font-heading font-semibold bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl shadow-md shadow-cyan-600/20 gap-2"
                    >
                      <RouteIcon className="w-4 h-4" />
                      <span>{lang === 'vi' ? 'Né trạm này trong Lộ trình sạch' : 'Avoid in Smart Route'}</span>
                    </Button>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* RIGHT COLUMN: Interactive High-Performance AQI Map (8 cols on desktop = 66.6% width) */}
          <div className={`${isFullscreen ? 'col-span-1' : 'lg:col-span-8 xl:col-span-8'} space-y-4`}>
            <div className="rounded-3xl bg-gradient-to-br from-[#0B1528]/90 via-[#0D1D35]/85 to-[#08101E]/95 border border-sky-500/20 shadow-2xl backdrop-blur-xl p-4 sm:p-5 space-y-4">

              {/* Map Card Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <Layers className="w-5 h-5 text-cyan-400 shrink-0" />
                  <div>
                    <h2 className="font-heading text-base font-bold text-white flex items-center gap-2">
                      {lang === 'vi' ? 'Bản Đồ Không Gian Chất Lượng Không Khí' : 'Atmospheric Air Quality Canvas'}
                    </h2>
                    <p className="text-xs text-gray-400 font-body leading-snug">
                      {selectedStationId
                        ? (lang === 'vi' ? `Đang tiêu điểm vào trạm ${activeStation?.name || 'được chọn'}` : `Focusing station ${activeStation?.name || 'selected'}`)
                        : (lang === 'vi' ? 'Bản đồ Mapbox Dark hiển thị đa tầng dữ liệu trạm quan trắc, cảm biến IoT và điểm phát thải vi vùng' : 'Mapbox Dark retina canvas displaying fused stations, IoT nodes and emissions')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedStationId(null);
                      setSearchPin(null);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-xs font-heading font-semibold text-cyan-300 transition-colors flex items-center gap-1.5 active:scale-95 shadow-sm"
                    title={lang === 'vi' ? 'Zoom lại vị trí của bạn' : 'Zoom to your location'}
                  >
                    <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{lang === 'vi' ? 'Về vị trí của tôi' : 'To My Location'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsFullscreen(!isFullscreen)}
                    className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-heading text-gray-300 transition-colors flex items-center gap-1.5"
                  >
                    {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                    <span>{isFullscreen ? (lang === 'vi' ? 'Thu gọn' : 'Bento') : (lang === 'vi' ? 'Mở rộng' : 'Expand')}</span>
                  </button>
                </div>
              </div>

              {/* Map Viewport Container */}
              <div className={`w-full relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl ${isFullscreen ? 'h-[820px]' : 'min-h-[580px] lg:h-[750px]'}`}>
                <AQIInteractiveMap
                  stations={sortedStations}
                  iotNodes={sortedIotNodes}
                  communityReports={communityReports}
                  hotspotEvents={allHotspots}
                  selectedStationId={selectedStationId}
                  onSelectStation={(s) => setSelectedStationId(s.id)}
                  onSelectNode={(n) => setSelectedStationId(n.id)}
                  onAvoidStation={onAvoidStation}
                  userLocation={hasKnownLocation ? userCoords : null}
                  searchPin={searchPin}
                  onResetFocus={() => {
                    setSelectedStationId(null);
                    setSearchPin(null);
                  }}
                  lang={lang}
                  layers={layers}
                  onToggleLayer={toggleLayer}
                  isFullscreen={isFullscreen}
                  onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
                  className="w-full h-full"
                />
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
