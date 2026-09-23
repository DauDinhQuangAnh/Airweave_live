import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useOutletContext, useSearchParams } from 'react-router-dom';
import {
  Radio,
  Cpu,
  Users,
  Flame,
  Wind,
  Sparkles,
  MapPin,
  Search,
  Crosshair,
  Compass,
  ShieldCheck,
  ArrowLeft,
  Home,
  Route as RouteIcon,
  Info,
  CheckCircle2,
  Activity,
  Thermometer,
  Droplets,
  Eye,
  AlertTriangle,
  Layers,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { useWaqiStations } from '@/hooks/use-waqi-stations';
import { useLiveAirContext } from '@/contexts/live-air-context';
import { communityApi, nodesApi } from '@/integrations/api';
import { useCommunityRealtime } from '@/hooks/use-community-realtime';
import {
  hotspotIntelligenceService,
  getDemoHotspots,
  type HotspotEvent,
} from '@/lib/civic-hotspot';
import { shouldUseDemoData } from '@/lib/app-mode';
import AuroraBackground from '@/components/AuroraBackground';
import DataStatusChip from '@/components/feature-experience/DataStatusChip';
import MapSearchBar from '@/components/map/MapSearchBar';
import AQIInteractiveMap, { MapLayersState } from '@/components/map/AQIInteractiveMap';
import { PAMStation, getAQIColorNew } from '@/lib/pam-stations';
import { getAQIStatus, hasAirQualityReading } from '@/lib/air-quality';
import { hasWeatherMetric } from '@/hooks/use-weather-data';
import { localizeDemoText } from '@/lib/localize-demo';

// Haversine distance formula in km
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

function getAqiRecommendation(aqi: number, lang: 'vi' | 'en'): { title: string; desc: string; badge: string; color: string } {
  if (aqi <= 50) {
    return {
      title: lang === 'vi' ? 'Không khí trong lành' : 'Good Air Quality',
      desc: lang === 'vi' ? 'Lý tưởng cho mọi hoạt động thể thao ngoài trời và thông khí tự nhiên.' : 'Ideal for outdoor sports and natural ventilation.',
      badge: lang === 'vi' ? 'An toàn' : 'Good',
      color: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/15',
    };
  }
  if (aqi <= 100) {
    return {
      title: lang === 'vi' ? 'Chất lượng trung bình' : 'Moderate Quality',
      desc: lang === 'vi' ? 'Người có bệnh hô hấp nhạy cảm nên hạn chế vận động gắng sức ngoài trời.' : 'Sensitive individuals should limit prolonged exertion.',
      badge: lang === 'vi' ? 'Trung bình' : 'Moderate',
      color: 'text-yellow-400 border-yellow-500/40 bg-yellow-500/15',
    };
  }
  if (aqi <= 150) {
    return {
      title: lang === 'vi' ? 'Kém cho nhóm nhạy cảm' : 'Unhealthy for Sensitive',
      desc: lang === 'vi' ? 'Nên đeo khẩu trang N95 khi di chuyển. Đóng bớt cửa sổ khi gần trục đường lớn.' : 'Wear N95 mask. Keep windows closed near busy roads.',
      badge: lang === 'vi' ? 'Kém' : 'Sensitive',
      color: 'text-orange-400 border-orange-500/40 bg-orange-500/15',
    };
  }
  if (aqi <= 200) {
    return {
      title: lang === 'vi' ? 'Chất lượng không khí xấu' : 'Unhealthy',
      desc: lang === 'vi' ? 'Hạn chế tối đa ra ngoài. Bật máy lọc không khí và kích hoạt Smart Route để né vùng ô nhiễm.' : 'Avoid outdoor activities. Run air purifier and use Smart Route.',
      badge: lang === 'vi' ? 'Xấu' : 'Unhealthy',
      color: 'text-red-400 border-red-500/40 bg-red-500/15',
    };
  }
  return {
    title: lang === 'vi' ? 'Rất nguy hại sức khỏe' : 'Very Unhealthy / Hazardous',
    desc: lang === 'vi' ? 'Cảnh báo khẩn cấp: Nguy cơ kích phát cơn hen và viêm phổi cấp. Tránh ra ngoài tuyệt đối.' : 'Emergency warning: High respiratory risk. Stay indoors.',
    badge: lang === 'vi' ? 'Nguy hại' : 'Hazardous',
    color: 'text-purple-400 border-purple-500/40 bg-purple-500/15',
  };
}

const AirMap = () => {
  const demo = shouldUseDemoData();
  const navigate = useNavigate();
  const outletCtx = useOutletContext<{ lang?: 'vi' | 'en' }>() || {};
  const lang = outletCtx.lang || 'vi';
  const [searchParams] = useSearchParams();

  const { location, weather } = useLiveAirContext();
  const hasKnownLocation = location.status === 'active' || location.status === 'manual';
  const { stations: rawStations, loading: stationsLoading } = useWaqiStations();

  const [iotNodes, setIotNodes] = useState<any[]>([]);
  const [communityReports, setCommunityReports] = useState<any[]>([]);
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);
  const [searchPin, setSearchPin] = useState<{ lat: number; lng: number; label: string } | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeTab, setActiveTab] = useState<'waqi' | 'iot' | 'community'>('waqi');

  const [layers, setLayers] = useState<MapLayersState>({
    waqi: true,
    iot: true,
    community: true,
    hotspots: true,
  });

  const toggleLayer = (key: keyof MapLayersState) => {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // User coordinates
  const userCoords = useMemo(() => {
    return {
      lat: hasKnownLocation ? location.lat : 21.0285,
      lng: hasKnownLocation ? location.lng : 105.8542,
      label: localizeDemoText(location.label, lang) || (lang === 'vi' ? 'Vị trí của bạn' : 'Your Location'),
    };
  }, [location.lat, location.lng, location.label, lang, hasKnownLocation]);

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

  // Demo hotspots centered on user
  const demoEvents = useMemo(
    () => (demo ? getDemoHotspots({ lat: userCoords.lat, lng: userCoords.lng }) : []),
    [demo, userCoords.lat, userCoords.lng]
  );

  // Civic hotspots fusion
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

  // Selected station object
  const activeStation = useMemo(() => {
    if (!selectedStationId) return sortedStations[0] || null;
    return sortedStations.find((s) => s.id === selectedStationId) || sortedStations[0] || null;
  }, [selectedStationId, sortedStations]);

  // Selected node object
  const activeNode = useMemo(() => {
    return sortedIotNodes.find((n) => n.id === selectedStationId) || null;
  }, [selectedStationId, sortedIotNodes]);

  // Telemetry KPIs
  const totalSensorsCount = sortedStations.length + sortedIotNodes.length;
  const hasWeatherReading = hasAirQualityReading(weather);
  const regionalMeanAqi = useMemo(() => {
    if (sortedStations.length === 0) return hasWeatherReading ? weather.aqi : null;
    const nearby = sortedStations.slice(0, 5);
    const sum = nearby.reduce((acc, cur) => acc + cur.aqi, 0);
    return Math.round(sum / nearby.length);
  }, [sortedStations, weather.aqi, hasWeatherReading]);

  const windSpeedKmh = hasWeatherMetric(weather, 'windSpeed') ? Math.round(weather.windSpeed) : null;
  const windStatus = windSpeedKmh === null
    ? (lang === 'vi' ? 'Chưa có số liệu gió' : 'Wind data unavailable')
    : windSpeedKmh > 15
    ? (lang === 'vi' ? 'Khuếch tán tốt' : 'Good dispersion')
    : windSpeedKmh > 8
      ? (lang === 'vi' ? 'Vừa phải' : 'Moderate dispersion')
      : (lang === 'vi' ? 'Lặng gió, dễ ứ đọng' : 'Calm wind, pollutants may accumulate');
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

      <div className="relative z-10 w-full max-w-[1750px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-36 space-y-6">

        {/* Top Header & Navigation */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6 rounded-3xl bg-[#0c1322]/80 backdrop-blur-xl border border-white/10 shadow-2xl">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(-1)}
                className="bg-white/[0.03] border-white/10 hover:bg-white/10 text-gray-300 rounded-xl"
              >
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                {lang === 'vi' ? 'Quay lại' : 'Back'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/')}
                className="bg-white/[0.03] border-white/10 hover:bg-white/10 text-gray-300 rounded-xl"
              >
                <Home className="w-4 h-4 mr-1.5" />
                {lang === 'vi' ? 'Trang chủ' : 'Home'}
              </Button>
            </div>

            <div className="h-6 w-px bg-white/10 hidden sm:block"></div>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 via-sky-600 to-blue-700 flex items-center justify-center shadow-lg shadow-cyan-500/30 ring-2 ring-cyan-400/30 shrink-0">
                <Layers className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-[10px] font-heading font-bold uppercase tracking-wider text-cyan-300">
                  <Sparkles className="w-3 h-3 text-cyan-400" />
                  {lang === 'vi' ? 'BẢN ĐỒ KHÍ QUYỂN THỜI GIAN THỰC' : 'REAL-TIME ATMOSPHERIC MAP'}
                </div>
                <h1 className="text-xl sm:text-2xl font-heading font-black text-white tracking-tight leading-tight mt-0.5">
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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
              {regionalMeanAqi !== null && <span className="text-[11px] px-2 py-0.5 rounded-md font-heading font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                {getAQIStatus(regionalMeanAqi, lang)}
              </span>}
            </div>
            <p className="text-[11px] text-gray-400 mt-0.5">
              {sortedStations.length ? (lang === 'vi' ? 'Tính từ các trạm quan trắc lân cận' : 'Calculated from nearby stations') : hasWeatherReading ? (lang === 'vi' ? 'Chỉ số tại vị trí hiện tại' : 'Current location reading') : (lang === 'vi' ? 'Chưa có dữ liệu' : 'No data available')}
            </p>
          </div>

          <div className="rounded-2xl p-4 bg-gradient-to-br from-[#0B1528]/90 to-[#08101E]/95 border border-sky-500/20 shadow-xl backdrop-blur-xl">
            <div className="flex items-center justify-between text-gray-400 text-xs font-heading">
              <span>{lang === 'vi' ? 'KHÍ TƯỢNG & GIÓ' : 'WIND & DISPERSION'}</span>
              <Wind className="w-4 h-4 text-sky-400" />
            </div>
            <p className="text-2xl font-heading font-bold text-sky-300 mt-2">{windSpeedKmh === null ? '—' : `${windSpeedKmh} km/h`}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">
              {windStatus}
            </p>
          </div>

          <div className="rounded-2xl p-4 bg-gradient-to-br from-[#0B1528]/90 to-[#08101E]/95 border border-red-500/30 shadow-xl backdrop-blur-xl">
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

        {/* 2-Column Bento Studio Grid */}
        <div className={`grid gap-6 items-start ${isFullscreen ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-12'}`}>

          {/* LEFT COLUMN: Search, Sensor Explorer & Active Inspector (5 cols) */}
          {!isFullscreen && (
            <div className="lg:col-span-5 xl:col-span-5 space-y-5">

              {/* Search Bar Container */}
              <div className="rounded-3xl bg-gradient-to-br from-[#0B1528]/90 via-[#0D1D35]/85 to-[#08101E]/95 border border-sky-500/20 shadow-2xl backdrop-blur-xl p-5 space-y-4">
                <div>
                  <h3 className="font-heading font-bold text-sm text-white flex items-center gap-2">
                    <Search className="w-4 h-4 text-cyan-400" />
                    <span>{lang === 'vi' ? 'Tìm kiếm địa điểm vi vùng' : 'Search Micro-Location'}</span>
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {lang === 'vi' ? 'Nhập tên phường, quận, ngõ phố để bay đến điểm đo' : 'Search streets, districts or areas to fly to'}
                  </p>
                </div>

                <MapSearchBar
                  lang={lang}
                  onSelect={(lat, lng, label) => {
                    setSearchPin({ lat, lng, label });
                  }}
                />

                {/* Source Tabs */}
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full pt-2">
                  <TabsList className="grid w-full grid-cols-3 h-10 bg-black/40 border border-white/10 rounded-xl p-1">
                    <TabsTrigger value="waqi" className="gap-1.5 text-xs rounded-lg data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-300">
                      <Radio className="w-3.5 h-3.5" />
                      <span>{lang === 'vi' ? 'Trạm' : 'WAQI'}</span>
                      <span className="text-[10px] opacity-70">({sortedStations.length})</span>
                    </TabsTrigger>
                    <TabsTrigger value="iot" className="gap-1.5 text-xs rounded-lg data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-300">
                      <Cpu className="w-3.5 h-3.5" />
                      <span>Node IoT</span>
                      <span className="text-[10px] opacity-70">({sortedIotNodes.length})</span>
                    </TabsTrigger>
                    <TabsTrigger value="community" className="gap-1.5 text-xs rounded-lg data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-300">
                      <Users className="w-3.5 h-3.5" />
                      <span>{lang === 'vi' ? 'Cộng đồng' : 'Crowd'}</span>
                      <span className="text-[10px] opacity-70">({communityReports.length})</span>
                    </TabsTrigger>
                  </TabsList>

                  {/* WAQI Stations List */}
                  <TabsContent value="waqi" className="space-y-2.5 mt-3 max-h-[380px] overflow-y-auto pr-1">
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
                                ? 'bg-cyan-950/30 border-cyan-400 ring-2 ring-cyan-400/30 shadow-lg shadow-cyan-500/10'
                                : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.06]'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-start gap-2.5 min-w-0">
                                <div
                                  className="w-10 h-10 rounded-xl flex flex-col items-center justify-center font-heading font-black text-white shrink-0 shadow-md"
                                  style={{ backgroundColor: color }}
                                >
                                  <span className="text-xs leading-none">{s.aqi}</span>
                                  <span className="text-[8px] opacity-80 uppercase leading-none mt-0.5">AQI</span>
                                </div>

                                <div className="min-w-0">
                                  <h4 className="font-heading font-bold text-xs text-white truncate">
                                    {localizeDemoText(s.name, lang)}
                                  </h4>
                                  <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-400">
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
                                <span className="text-[10px] text-gray-500">
                                  {s.trend === 'up'
                                    ? (lang === 'vi' ? '↗ Tăng' : '↗ Rising')
                                    : s.trend === 'down'
                                      ? (lang === 'vi' ? '↘ Giảm' : '↘ Falling')
                                      : s.trend === 'stable' ? (lang === 'vi' ? '→ Ổn định' : '→ Stable') : (lang === 'vi' ? 'Chưa đủ dữ liệu' : 'Not enough data')}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </TabsContent>

                  {/* IoT Nodes List */}
                  <TabsContent value="iot" className="space-y-2.5 mt-3 max-h-[380px] overflow-y-auto pr-1">
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
                              ? 'bg-cyan-950/30 border-cyan-400 ring-2 ring-cyan-400/30'
                              : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.06]'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex flex-col items-center justify-center font-heading font-black text-cyan-300 shrink-0 shadow-md">
                                <span className="text-xs leading-none">⚡ {n.aqi ?? '—'}</span>
                                <span className="text-[8px] opacity-80 uppercase leading-none mt-0.5">AQI</span>
                              </div>
                              <div className="min-w-0">
                                <h4 className="font-heading font-bold text-xs text-white truncate">{localizeDemoText(n.name, lang)}</h4>
                                <p className="text-[11px] text-gray-400 truncate">{localizeDemoText(n.organization_name, lang) || (lang === 'vi' ? 'Cảm biến tại chỗ' : 'On-site sensor')}</p>
                              </div>
                            </div>
                            <span className="text-[10px] text-cyan-300 font-semibold shrink-0">
                              {n.distanceKm === null ? '—' : formatDistance(n.distanceKm, lang)}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </TabsContent>

                  {/* Community Reports List */}
                  <TabsContent value="community" className="space-y-2.5 mt-3 max-h-[380px] overflow-y-auto pr-1">
                    {communityReports.length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-6">
                        {lang === 'vi' ? 'Chưa có báo cáo cộng đồng nào hôm nay.' : 'No community reports submitted today.'}
                      </p>
                    ) : (
                      communityReports.map((r) => (
                        <div
                          key={r.id}
                          className="p-3 rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] transition-colors"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="text-xl shrink-0">🔥</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-heading font-bold text-white truncate">{localizeDemoText(r.text, lang) || (lang === 'vi' ? 'Khói bụi / phát thải' : 'Smoke / emissions')}</p>
                              <p className="text-[10px] text-gray-400 mt-0.5">{new Date(r.created_at).toLocaleTimeString()}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </TabsContent>
                </Tabs>
              </div>

              {/* Active Sensor Inspector Card */}
              {activeStation && (
                <div className="rounded-3xl bg-gradient-to-br from-[#0B1528]/90 via-[#0D1D35]/85 to-[#08101E]/95 border border-sky-500/25 shadow-2xl backdrop-blur-xl p-5 space-y-4">
                  <div className="flex items-center justify-between gap-2 pb-3 border-b border-white/5">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-cyan-400" />
                      <h3 className="font-heading font-bold text-sm text-white">
                        {lang === 'vi' ? 'Thông số trạm đo' : 'Station Telemetry'}
                      </h3>
                    </div>
                    <span className="text-[11px] text-gray-400 font-heading">
                      ID: {activeStation.id}
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-heading font-black text-base text-white truncate">
                        {localizeDemoText(activeStation.name, lang)}
                      </h4>
                      <div
                        className="px-3 py-1 rounded-xl text-sm font-heading font-black text-white shadow-md"
                        style={{ backgroundColor: getAQIColorNew(activeStation.aqi) }}
                      >
                        AQI {activeStation.aqi}
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{localizeDemoText(activeStation.district, lang)}, {localizeDemoText(activeStation.city, lang)}</p>
                  </div>

                  {/* Metrics grid */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-0.5">
                      <span className="text-[10px] text-gray-400 font-heading">{lang === 'vi' ? 'BỤI MỊN PM2.5' : 'FINE PARTICLES PM2.5'}</span>
                      <p className="text-sm font-heading font-bold text-white">
                        {activeStation.pm25 != null ? `${activeStation.pm25} µg/m³` : '—'}
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-0.5">
                      <span className="text-[10px] text-gray-400 font-heading">{lang === 'vi' ? 'KHOẢNG CÁCH' : 'DISTANCE'}</span>
                      <p className="text-sm font-heading font-bold text-cyan-300">
                        {activeStation.distanceKm === null ? '—' : formatDistance(activeStation.distanceKm, lang)}
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-0.5">
                      <span className="text-[10px] text-gray-400 font-heading">{lang === 'vi' ? 'NHIỆT ĐỘ & ĐỘ ẨM' : 'TEMPERATURE & HUMIDITY'}</span>
                      <p className="text-sm font-heading font-bold text-white">
                        {hasWeatherMetric(weather, 'temperature') ? `${weather.temperature}°C` : '—'} · {hasWeatherMetric(weather, 'humidity') ? `${weather.humidity}%` : '—'}
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-0.5">
                      <span className="text-[10px] text-gray-400 font-heading">{lang === 'vi' ? 'XU HƯỚNG AQI' : 'AQI TREND'}</span>
                      <p className="text-sm font-heading font-bold text-emerald-400">
                        {activeStation.trend === 'up'
                          ? (lang === 'vi' ? '↗ Đang tăng' : '↗ Rising')
                          : activeStation.trend === 'down'
                            ? (lang === 'vi' ? '↘ Đang giảm' : '↘ Falling')
                            : activeStation.trend === 'stable' ? (lang === 'vi' ? '→ Ổn định' : '→ Stable') : (lang === 'vi' ? 'Chưa đủ dữ liệu' : 'Not enough data')}
                      </p>
                    </div>
                  </div>

                  {/* Recommendation banner */}
                  {aqiRec && <div className={`p-3.5 rounded-2xl border space-y-1 ${aqiRec.color}`}>
                    <p className="text-xs font-heading font-bold flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5" />
                      <span>{aqiRec.title}</span>
                    </p>
                    <p className="text-[11px] leading-relaxed text-gray-300">
                      {aqiRec.desc}
                    </p>
                  </div>}

                  {/* Actions */}
                  <div className="flex gap-2 pt-1">
                    <Button
                      onClick={() => onAvoidStation(activeStation)}
                      className="flex-1 h-9 text-xs font-heading font-semibold bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl shadow-md shadow-cyan-600/20 gap-1.5"
                    >
                      <RouteIcon className="w-3.5 h-3.5" />
                      <span>{lang === 'vi' ? 'Né trạm này trong Lộ trình' : 'Avoid in Route'}</span>
                    </Button>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* RIGHT COLUMN: Interactive High-Performance AQI Map (7 cols or 12 cols when fullscreen) */}
          <div className={`${isFullscreen ? 'col-span-1' : 'lg:col-span-7 xl:col-span-7'} space-y-4`}>
            <div className="rounded-3xl bg-gradient-to-br from-[#0B1528]/90 via-[#0D1D35]/85 to-[#08101E]/95 border border-sky-500/20 shadow-2xl backdrop-blur-xl p-5 sm:p-6 space-y-4">

              {/* Map Card Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
                <div className="flex items-center gap-2.5">
                  <Layers className="w-5 h-5 text-cyan-400 shrink-0" />
                  <div>
                    <h2 className="font-heading text-base font-bold text-white flex items-center gap-2">
                      {lang === 'vi' ? 'Bản Đồ Không Gian Chất Lượng Không Khí' : 'Atmospheric Air Quality Canvas'}
                    </h2>
                    <p className="text-xs text-gray-400 font-body">
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
                    className="px-2.5 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-xs font-heading font-semibold text-cyan-300 transition-colors flex items-center gap-1.5 active:scale-95 shadow-sm"
                    title={lang === 'vi' ? 'Zoom lại vị trí của bạn' : 'Zoom to your location'}
                  >
                    <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{lang === 'vi' ? 'Về vị trí của tôi' : 'To My Location'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsFullscreen(!isFullscreen)}
                    className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-heading text-gray-300 transition-colors flex items-center gap-1"
                  >
                    {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                    <span>{isFullscreen ? (lang === 'vi' ? 'Thu gọn' : 'Bento') : (lang === 'vi' ? 'Mở rộng' : 'Expand')}</span>
                  </button>
                </div>
              </div>

              {/* Map Viewport Container */}
              <div className={`w-full relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl ${isFullscreen ? 'h-[780px]' : 'min-h-[580px] lg:h-[720px]'}`}>
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
};

export default AirMap;
