import { useState, useRef, useEffect, useMemo } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Route, Clock, Shield, Navigation, Loader2, MapPin, AlertTriangle, Zap, Heart, Play, Car, Bike, PersonStanding, Bus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import PremiumGate from '@/components/PremiumGate';
import WindBoomerangLoader from '@/components/WindBoomerangLoader';
import ThematicWatermark from '@/components/ThematicWatermark';
import RouteMap, { type RouteSegment, type DangerZone } from '@/components/smart-route/RouteMap';
import MobilityHandoff from '@/components/smart-route/MobilityHandoff';
import { useLiveAirContext } from '@/contexts/live-air-context';
import { useAuth } from '@/hooks/use-auth';
import { airApi, communityApi, preferencesApi } from '@/integrations/api';
import { trackBehavior } from '@/lib/behavior-analytics';
import {
  VEHICLES,
  deriveWeights,
  effectivePm25,
  dominantCongestion,
  fetchOsmTags,
  clusterReports,
  distMeters,
  type CongestionLevel,
  type DangerCluster,
  type Prefs,
} from '@/lib/route-scoring';
import { hotspotIntelligenceService, type HotspotEvent } from '@/lib/civic-hotspot';
import { USE_DEMO_DATA } from '@/lib/app-mode';
import DataStatusChip, { type DataStatus } from '@/components/feature-experience/DataStatusChip';
import CalculationDetailsPanel from '@/components/feature-experience/CalculationDetailsPanel';
import FeatureExperienceLayout from '@/components/feature-experience/FeatureExperienceLayout';
import { Shield as ShieldIcon, Heart as HeartIcon, Wind as WindIcon } from 'lucide-react';

// Read Mapbox from VITE_MAPBOX_TOKEN so secrets are never committed.
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;

interface GeocodeSuggestion {
  id: string;
  place_name: string;
  center: [number, number];
}

interface ScoredRoute {
  duration: number;
  distance: number;
  avgPm25: number;
  exposure: number;
  cost: number;
  segments: RouteSegment[];
  geometry: { coordinates: [number, number][] };
  dangerHits: number;
}

interface ResultBundle {
  recommended: ScoredRoute;
  fastest: ScoredRoute;
  cleanest: ScoredRoute;
  weights: { alpha: number; beta: number };
  reductionPct: number;
  extraMinutes: number;
  dangerZones: DangerZone[];
  civicAvoided: HotspotEvent[];
  sensitiveProfile: boolean;
}

type VehicleKey = keyof typeof VEHICLES;

/* -------- mapbox helpers -------- */
async function geocodeSearch(query: string): Promise<GeocodeSuggestion[]> {
  if (!query || query.length < 3) return [];
  if (!MAPBOX_TOKEN) return [];
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&country=vn&limit=5&language=vi`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return (data.features || []).map((f: any) => ({
    id: f.id,
    place_name: f.place_name,
    center: f.center,
  }));
}

async function getRoute(
  from: [number, number],
  to: [number, number],
  profile: 'driving-traffic' | 'driving' | 'cycling' | 'walking' = 'driving-traffic'
) {
  if (!MAPBOX_TOKEN) return [];
  const annotations = profile === 'driving-traffic' ? '&annotations=congestion,duration' : '';
  const url = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${from[0]},${from[1]};${to[0]},${to[1]}?access_token=${MAPBOX_TOKEN}&geometries=geojson&alternatives=true&overview=full${annotations}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return data.routes || [];
}

function vehicleProfileForRouting(v: VehicleKey): 'driving-traffic' | 'cycling' | 'walking' {
  if (v === 'walk') return 'walking';
  if (v === 'bike') return 'cycling';
  return 'driving-traffic';
}

/* -------- PM2.5 cache (shared with previous version) -------- */
const PM25_TTL_MS = 15 * 60 * 1000;
const PM25_STORAGE_KEY = 'airweave.pm25.cache.v1';
type Pm25CacheEntry = { v: number; t: number };
const pm25Cache: Map<string, Pm25CacheEntry> = (() => {
  const m = new Map<string, Pm25CacheEntry>();
  if (typeof window === 'undefined') return m;
  try {
    const raw = localStorage.getItem(PM25_STORAGE_KEY);
    if (raw) {
      const obj = JSON.parse(raw) as Record<string, Pm25CacheEntry>;
      const now = Date.now();
      Object.entries(obj).forEach(([k, e]) => {
        if (e && now - e.t < PM25_TTL_MS) m.set(k, e);
      });
    }
  } catch {
    /* ignore */
  }
  return m;
})();
let persistTimer: ReturnType<typeof setTimeout> | undefined;
function persistPm25Cache() {
  if (typeof window === 'undefined') return;
  clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    try {
      const obj: Record<string, Pm25CacheEntry> = {};
      pm25Cache.forEach((v, k) => (obj[k] = v));
      localStorage.setItem(PM25_STORAGE_KEY, JSON.stringify(obj));
    } catch {
      /* quota */
    }
  }, 500);
}
function pm25Key(lat: number, lng: number) {
  return `${lat.toFixed(3)},${lng.toFixed(3)}`;
}
async function fetchPm25(lat: number, lng: number): Promise<number> {
  const key = pm25Key(lat, lng);
  const hit = pm25Cache.get(key);
  if (hit && Date.now() - hit.t < PM25_TTL_MS) return hit.v;
  try {
    const res = await fetch(
      `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}&current=pm2_5`
    );
    const data = await res.json();
    const v = data.current?.pm2_5 ?? 0;
    pm25Cache.set(key, { v, t: Date.now() });
    persistPm25Cache();
    return v;
  } catch {
    return hit?.v ?? 0;
  }
}

/* -------- Build scored segments for a route -------- */
async function buildScoredSegments(params: {
  geometry: { coordinates: [number, number][] };
  congestionPerCoord: (string | null)[] | null;
  vehicleKey: VehicleKey;
  dangerClusters: DangerCluster[];
}): Promise<{ segments: RouteSegment[]; dangerHits: number }> {
  const { geometry, congestionPerCoord, vehicleKey, dangerClusters } = params;
  const coords = geometry.coordinates;
  if (coords.length < 2) return { segments: [], dangerHits: 0 };

  const segCount = Math.min(6, Math.max(2, Math.floor(coords.length / 4)));
  const chunkSize = Math.ceil(coords.length / segCount);
  const vehicle = VEHICLES[vehicleKey];

  const slices: { coords: [number, number][]; mid: [number, number]; congestion: CongestionLevel }[] = [];
  for (let i = 0; i < segCount; i++) {
    const start = i * chunkSize;
    const end = Math.min(coords.length, start + chunkSize + 1);
    const slice = coords.slice(start, end);
    if (slice.length < 2) continue;
    const mid = slice[Math.floor(slice.length / 2)];
    const congestion = congestionPerCoord
      ? dominantCongestion(congestionPerCoord.slice(start, Math.min(end, congestionPerCoord.length)))
      : ('unknown' as CongestionLevel);
    slices.push({ coords: slice, mid, congestion });
  }

  // Parallel fetch PM2.5 + OSM tags for all midpoints
  const [pm25s, osmTags] = await Promise.all([
    Promise.all(slices.map((s) => fetchPm25(s.mid[1], s.mid[0]))),
    Promise.all(slices.map((s) => fetchOsmTags(s.mid[1], s.mid[0]))),
  ]);

  let dangerHits = 0;
  const segments: RouteSegment[] = slices.map((s, i) => {
    // Check if midpoint is within 300m of any danger cluster
    const inDanger = dangerClusters.some(
      (d) => distMeters({ lat: s.mid[1], lng: s.mid[0] }, { lat: d.lat, lng: d.lng }) <= 300
    );
    if (inDanger) dangerHits++;
    const eff = effectivePm25({
      rawPm25: pm25s[i],
      congestion: s.congestion,
      osm: osmTags[i],
      vehicle,
      inDangerZone: inDanger,
    });
    return { coords: s.coords, pm25: eff };
  });

  return { segments, dangerHits };
}

const SmartRoute = () => {
  const { lang } = useOutletContext<{ lang: 'vi' | 'en' }>();
  const { location: geoLocation, weather } = useLiveAirContext();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const isAlertMode = searchParams.get('alert') === '1';

  const [fromQuery, setFromQuery] = useState('');
  const [toQuery, setToQuery] = useState('');
  const [fromSuggestions, setFromSuggestions] = useState<GeocodeSuggestion[]>([]);
  const [toSuggestions, setToSuggestions] = useState<GeocodeSuggestion[]>([]);
  const [fromCoords, setFromCoords] = useState<[number, number] | null>(null);
  const [toCoords, setToCoords] = useState<[number, number] | null>(null);
  const [departureMode, setDepartureMode] = useState<'now' | 'schedule'>('now');
  const [departureTime, setDepartureTime] = useState('08:00');
  const [vehicle, setVehicle] = useState<VehicleKey>('motorbike');
  const [sliderValue, setSliderValue] = useState<number>(50); // 0=time, 100=air
  const [sliderTouched, setSliderTouched] = useState(false);
  const [result, setResult] = useState<ResultBundle | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchingFrom, setSearchingFrom] = useState(false);
  const [searchingTo, setSearchingTo] = useState(false);
  const [prefs, setPrefs] = useState<Prefs | null>(null);

  const fromDebounce = useRef<NodeJS.Timeout>();
  const toDebounce = useRef<NodeJS.Timeout>();

  // Load prefs and seed vehicle/slider from profile
  useEffect(() => {
    if (!user) return;
    (async () => {
      const data = await preferencesApi.get().catch(() => null);
      if (data) {
        setPrefs(data as Prefs);
        const ct = (data as any).commute_type as string[] | undefined;
        if (ct && ct.length) {
          if (ct.includes('walk_bike')) setVehicle('walk');
          else if (ct.includes('motorbike')) setVehicle('motorbike');
          else if (ct.includes('car')) setVehicle('car');
        }
      }
    })();
  }, [user]);

  // Keep slider synced to derived β until user touches it
  const derivedWeights = useMemo(
    () => deriveWeights(prefs, VEHICLES[vehicle], sliderTouched ? sliderValue : null),
    [prefs, vehicle, sliderValue, sliderTouched]
  );
  useEffect(() => {
    if (!sliderTouched) setSliderValue(Math.round(derivedWeights.beta * 100));
  }, [derivedWeights.beta, sliderTouched]);

  // GPS auto-fill
  useEffect(() => {
    if (geoLocation.loading || geoLocation.error) return;
    if (fromCoords) return;
    if (geoLocation.label) {
      setFromQuery(geoLocation.label);
      setFromCoords([geoLocation.lng, geoLocation.lat]);
    }
  }, [geoLocation.loading, geoLocation.error, geoLocation.label, geoLocation.lat, geoLocation.lng]);

  const handleFromChange = (value: string) => {
    setFromQuery(value);
    setFromCoords(null);
    clearTimeout(fromDebounce.current);
    if (value.length >= 3) {
      setSearchingFrom(true);
      fromDebounce.current = setTimeout(async () => {
        const results = await geocodeSearch(value);
        setFromSuggestions(results);
        setSearchingFrom(false);
      }, 400);
    } else {
      setFromSuggestions([]);
      setSearchingFrom(false);
    }
  };

  const handleToChange = (value: string) => {
    setToQuery(value);
    setToCoords(null);
    clearTimeout(toDebounce.current);
    if (value.length >= 3) {
      setSearchingTo(true);
      toDebounce.current = setTimeout(async () => {
        const results = await geocodeSearch(value);
        setToSuggestions(results);
        setSearchingTo(false);
      }, 400);
    } else {
      setToSuggestions([]);
      setSearchingTo(false);
    }
  };

  const selectFrom = (s: GeocodeSuggestion) => {
    setFromQuery(s.place_name);
    setFromCoords(s.center);
    setFromSuggestions([]);
  };
  const selectTo = (s: GeocodeSuggestion) => {
    setToQuery(s.place_name);
    setToCoords(s.center);
    setToSuggestions([]);
  };

  const useCurrentLocation = () => {
    if (!geoLocation.loading && !geoLocation.error) {
      setFromQuery(geoLocation.label || `${geoLocation.lat}, ${geoLocation.lng}`);
      setFromCoords([geoLocation.lng, geoLocation.lat]);
      setFromSuggestions([]);
    }
  };

  const handleSearch = async () => {
    if (!fromCoords || !toCoords) return;
    setLoading(true);
    setResult(null);

    try {
      const profile = vehicleProfileForRouting(vehicle);
      trackBehavior('clean_route_requested');
      const routes = await getRoute(fromCoords, toCoords, profile);
      if (!routes || routes.length === 0) {
        setLoading(false);
        return;
      }

      // Fetch active community reports inside a bbox roughly covering the route area
      const allLats = routes.flatMap((r: any) => r.geometry.coordinates.map((c: any) => c[1]));
      const allLngs = routes.flatMap((r: any) => r.geometry.coordinates.map((c: any) => c[0]));
      const minLat = Math.min(...allLats) - 0.02;
      const maxLat = Math.max(...allLats) + 0.02;
      const minLng = Math.min(...allLngs) - 0.02;
      const maxLng = Math.max(...allLngs) + 0.02;
      const sinceMs = Date.now() - 30 * 60 * 1000;
      const reportsInBbox = await communityApi
        .listActive({ lat1: minLat, lng1: minLng, lat2: maxLat, lng2: maxLng })
        .catch(() => []);
      // BE đã lọc theo bbox và hạn hiệu lực; chỉ cần lọc thêm mốc 30 phút gần nhất
      const reports = reportsInBbox.filter((r) => Date.parse(r.created_at) >= sinceMs);

      const dangerClusters = clusterReports(reports, 300, 3);

      // Inject "Avoid in Smart Route" point coming from Civic Hotspots page
      try {
        const raw = sessionStorage.getItem('airweave.smart-route.avoid');
        if (raw) {
          const entry = JSON.parse(raw) as { lat: number; lng: number; reason?: string; ts?: number };
          if (typeof entry?.lat === 'number' && typeof entry?.lng === 'number') {
            dangerClusters.push({
              lat: entry.lat,
              lng: entry.lng,
              count: 1,
              reason: `civic_avoid:${entry.reason ?? 'manual'}`,
            });
          }
          sessionStorage.removeItem('airweave.smart-route.avoid');
        }
      } catch { /* ignore */ }

      // ---- Civic Hotspot Intelligence fusion ----
      // Sensitive profile = respiratory / cardio / child / elderly / respiratory group.
      const cond = prefs?.medical_history || [];
      const sensitiveProfile =
        cond.some((c) => ['asthma', 'copd', 'cardio'].includes(c)) ||
        prefs?.sensitive_group === 'child' ||
        prefs?.sensitive_group === 'elderly' ||
        prefs?.sensitive_group === 'respiratory';

      // Pull WAQI stations in route bbox (best-effort; failures don't block routing).
      let stationsForFusion: { uid: string | number; lat: number; lng: number; aqi: number; station: string | null }[] = [];
      try {
        const stData = await airApi.waqiBounds(minLat, minLng, maxLat, maxLng);
        if (stData?.stations) {
          stationsForFusion = stData.stations.map((s: any) => ({
            uid: s.uid, lat: s.lat, lng: s.lng, aqi: s.aqi, station: s.station ?? null,
          }));
        }
      } catch {
        /* ignore — route still scored from community + open-meteo */
      }

      const civicEvents = hotspotIntelligenceService.buildFromReports(
        (reports || []) as never,
        stationsForFusion
      );
      const nowMs = Date.now();
      const civicToAvoid = civicEvents.filter((ev) => {
        if (ev.confidence === 'high') return true;
        if (sensitiveProfile && ev.confidence === 'medium') {
          // recent only — within last 60 minutes
          return nowMs - +new Date(ev.lastUpdated) <= 60 * 60 * 1000;
        }
        return false;
      });

      // Merge civic-avoid points into danger clusters used by segment scorer,
      // de-duplicating against existing community clusters within 250m.
      for (const ev of civicToAvoid) {
        const dup = dangerClusters.some(
          (d) => distMeters({ lat: ev.location.lat, lng: ev.location.lng }, d) <= 250
        );
        if (!dup) {
          dangerClusters.push({
            lat: ev.location.lat,
            lng: ev.location.lng,
            count: ev.confirmationsCount,
            reason: `civic:${ev.confidence}:${ev.eventType}`,
          });
        }
      }

      const scored: ScoredRoute[] = await Promise.all(
        routes.slice(0, 3).map(async (r: any) => {
          // Mapbox returns annotations on `legs[].annotation.congestion` (length = coords-1)
          const congestionPerCoord: (string | null)[] | null =
            (r.legs || []).flatMap((leg: any) => leg.annotation?.congestion || []) || null;

          const { segments, dangerHits } = await buildScoredSegments({
            geometry: r.geometry,
            congestionPerCoord: congestionPerCoord && congestionPerCoord.length > 0 ? congestionPerCoord : null,
            vehicleKey: vehicle,
            dangerClusters,
          });

          const avgPm25 =
            segments.length > 0
              ? Math.round((segments.reduce((s, x) => s + x.pm25, 0) / segments.length) * 10) / 10
              : 0;
          const duration = Math.round(r.duration / 60);
          const distance = Math.round(r.distance / 100) / 10;
          const exposure = Math.round(avgPm25 * duration);
          const cost = derivedWeights.alpha * duration + derivedWeights.beta * (exposure / 10);
          return { duration, distance, avgPm25, exposure, cost, segments, geometry: r.geometry, dangerHits };
        })
      );

      const recommended = [...scored].sort((a, b) => a.cost - b.cost)[0];
      const fastest = [...scored].sort((a, b) => a.duration - b.duration)[0];
      const cleanest = [...scored].sort((a, b) => a.exposure - b.exposure)[0];

      const reductionPct =
        fastest.exposure > 0
          ? Math.max(0, Math.round(((fastest.exposure - recommended.exposure) / fastest.exposure) * 100))
          : 0;
      const extraMinutes = Math.max(0, recommended.duration - fastest.duration);

      setResult({
        recommended,
        fastest,
        cleanest,
        weights: derivedWeights,
        reductionPct,
        extraMinutes,
        dangerZones: dangerClusters,
        civicAvoided: civicToAvoid,
        sensitiveProfile,
      });
    } catch (err) {
      console.error('Route search error:', err);
    }

    setLoading(false);
  };

  const startNavigation = (geo: { coordinates: [number, number][] }) => {
    if (!fromCoords || !toCoords) return;
    const mid = geo.coordinates[Math.floor(geo.coordinates.length / 2)];
    const travelmode = vehicle === 'walk' ? 'walking' : vehicle === 'bike' ? 'bicycling' : 'driving';
    const url = `https://www.google.com/maps/dir/?api=1&origin=${fromCoords[1]},${fromCoords[0]}&destination=${toCoords[1]},${toCoords[0]}&waypoints=${mid[1]},${mid[0]}&travelmode=${travelmode}`;
    window.open(url, '_blank');
  };

  const personaLabel = (() => {
    if (!prefs) return null;
    const cond = prefs.medical_history || [];
    if (cond.includes('asthma') || cond.includes('copd')) return lang === 'vi' ? 'Hen suyễn / COPD' : 'Asthma / COPD';
    if (cond.includes('cardio')) return lang === 'vi' ? 'Tim mạch' : 'Cardio';
    if (prefs.sensitive_group === 'child') return lang === 'vi' ? 'Trẻ nhỏ' : 'Child';
    if (prefs.sensitive_group === 'elderly') return lang === 'vi' ? 'Cao tuổi' : 'Elderly';
    if (prefs.route_priority === 'speed') return lang === 'vi' ? 'Ưu tiên tốc độ' : 'Speed-first';
    if (prefs.route_priority === 'health') return lang === 'vi' ? 'Ưu tiên sức khỏe' : 'Health-first';
    return lang === 'vi' ? 'Cân bằng' : 'Balanced';
  })();

  const VEHICLE_OPTIONS: { key: VehicleKey; icon: React.ReactNode; vi: string; en: string }[] = [
    { key: 'car', icon: <Car className="w-4 h-4" />, vi: 'Ô tô', en: 'Car' },
    { key: 'motorbike', icon: <span className="text-base leading-none">🏍️</span>, vi: 'Xe máy', en: 'Motorbike' },
    { key: 'bike', icon: <Bike className="w-4 h-4" />, vi: 'Xe đạp', en: 'Bike' },
    { key: 'walk', icon: <PersonStanding className="w-4 h-4" />, vi: 'Đi bộ', en: 'Walk' },
  ];

  return (
    <div className="relative">
      <ThematicWatermark />
      <FeatureExperienceLayout
        lang={lang}
        heading={lang === 'vi' ? 'Lộ trình sạch theo AQI' : 'Clean route by AQI'}
        subheading={lang === 'vi'
          ? 'Tuyến đường ít PM2.5 hơn, tránh điểm nóng ô nhiễm gần đây.'
          : 'Lower-PM2.5 routes that avoid recent pollution hotspots.'}
        benefits={[
          { title: lang === 'vi' ? 'Tuyến đường sạch hơn' : 'Cleaner routes',
            text: lang === 'vi'
              ? 'AirWeave phân tích AQI thời gian thực để đề xuất tuyến ít ô nhiễm hơn.'
              : 'AirWeave analyses real-time AQI to suggest the lowest-PM2.5 route.',
            icon: <WindIcon className="w-4 h-4" /> },
          { title: lang === 'vi' ? 'Bảo vệ sức khỏe mỗi ngày' : 'Daily health protection',
            text: lang === 'vi'
              ? 'Giảm phơi nhiễm PM2.5, tránh điểm nóng dựa trên dữ liệu thật.'
              : 'Reduce PM2.5 exposure, avoid hotspots from real data.',
            icon: <HeartIcon className="w-4 h-4" /> },
        ]}
        chips={lang === 'vi'
          ? ['So sánh tuyến', 'Cân bằng thời gian – không khí', 'Gợi ý theo vị trí']
          : ['Route comparison', 'Time ↔ Air balance', 'GPS-aware']}
      >
        <div className="max-w-2xl mx-auto relative z-10">
          <div className="flex items-center gap-2 mb-4">
            <Route className="w-5 h-5 text-primary" />
            <h1 className="font-heading text-xl font-bold text-foreground">
              {lang === 'vi' ? 'Tìm tuyến của bạn' : 'Find your route'}
            </h1>
          </div>

        <PremiumGate feature={lang === 'vi' ? 'Tìm đường sạch nhất' : 'Cleanest route finder'} lang={lang}>
          <div className="space-y-6">
            {(isAlertMode || (weather.aqi > 0 && weather.aqi >= 100)) && (
              <div className="rounded-xl p-4 bg-orange-500/10 border border-orange-500/30 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-sm font-heading font-bold text-orange-600">
                    {lang === 'vi'
                      ? `AQI hiện tại ${weather.aqi || '—'} — đề xuất tránh khu vực ô nhiễm`
                      : `Current AQI ${weather.aqi || '—'} — avoid polluted areas`}
                  </p>
                  <p className="text-xs text-muted-foreground font-body mt-0.5">
                    {lang === 'vi'
                      ? 'Vị trí hiện tại đã được điền sẵn. Chọn điểm đến để xem lộ trình ít PM2.5 nhất.'
                      : 'Your current location is pre-filled. Pick a destination to see the lowest-PM2.5 route.'}
                  </p>
                </div>
              </div>
            )}

            <div className="glass-card p-5 space-y-4">
              <div className="space-y-3">
                {/* FROM */}
                <div className="relative">
                  <Input
                    placeholder={lang === 'vi' ? 'Điểm bắt đầu...' : 'Start point...'}
                    value={fromQuery}
                    onChange={(e) => handleFromChange(e.target.value)}
                    className="pl-10 pr-20"
                  />
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-green-500" />
                  <button
                    onClick={useCurrentLocation}
                    className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <MapPin className="w-3 h-3" />
                    {lang === 'vi' ? 'Vị trí' : 'GPS'}
                  </button>
                  {searchingFrom && (
                    <div className="absolute right-16 top-1/2 -translate-y-1/2">
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    </div>
                  )}
                  {fromSuggestions.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {fromSuggestions.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => selectFrom(s)}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors border-b border-border/50 last:border-0"
                        >
                          {s.place_name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* TO */}
                <div className="relative">
                  <Input
                    placeholder={lang === 'vi' ? 'Điểm kết thúc...' : 'Destination...'}
                    value={toQuery}
                    onChange={(e) => handleToChange(e.target.value)}
                    className="pl-10"
                  />
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-red-500" />
                  {searchingTo && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    </div>
                  )}
                  {toSuggestions.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {toSuggestions.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => selectTo(s)}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors border-b border-border/50 last:border-0"
                        >
                          {s.place_name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Vehicle selector */}
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-heading font-bold mb-1.5">
                  {lang === 'vi' ? 'Phương tiện' : 'Vehicle'}
                </p>
                <div className="grid grid-cols-4 gap-1.5">
                  {VEHICLE_OPTIONS.map((v) => (
                    <button
                      key={v.key}
                      type="button"
                      onClick={() => setVehicle(v.key)}
                      className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-[11px] font-heading font-semibold transition-colors ${
                        vehicle === v.key
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-muted/30 text-muted-foreground hover:border-primary/40'
                      }`}
                    >
                      {v.icon}
                      <span className="leading-tight">{lang === 'vi' ? v.vi : v.en}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Departure mode */}
              <div className="flex items-center gap-2 flex-wrap">
                <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="inline-flex rounded-lg border border-border overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setDepartureMode('now')}
                    className={`px-3 py-1.5 text-xs font-heading font-semibold transition-colors ${
                      departureMode === 'now' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground'
                    }`}
                  >
                    {lang === 'vi' ? 'Bây giờ' : 'Now'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDepartureMode('schedule')}
                    className={`px-3 py-1.5 text-xs font-heading font-semibold transition-colors ${
                      departureMode === 'schedule' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground'
                    }`}
                  >
                    {lang === 'vi' ? 'Lên lịch' : 'Schedule'}
                  </button>
                </div>
                {departureMode === 'schedule' && (
                  <Input
                    type="time"
                    value={departureTime}
                    onChange={(e) => setDepartureTime(e.target.value)}
                    className="w-28 h-8 text-xs"
                  />
                )}
              </div>

              {/* Time vs Air slider */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-body">
                  <span className="font-heading font-bold text-muted-foreground uppercase tracking-wider">
                    {lang === 'vi' ? 'Thời gian ↔ Không khí' : 'Time ↔ Air'}
                  </span>
                  <span className="text-primary font-heading font-bold">
                    α={derivedWeights.alpha.toFixed(2)} · β={derivedWeights.beta.toFixed(2)}
                  </span>
                </div>
                <Slider
                  value={[sliderValue]}
                  onValueChange={(v) => {
                    setSliderTouched(true);
                    setSliderValue(v[0]);
                  }}
                  min={0}
                  max={100}
                  step={5}
                />
                <div className="flex items-center justify-between text-[10px] text-muted-foreground font-body">
                  <span>⚡ {lang === 'vi' ? 'Nhanh nhất' : 'Fastest'}</span>
                  <span>🌿 {lang === 'vi' ? 'Sạch nhất' : 'Cleanest'}</span>
                </div>
              </div>

              {personaLabel && (
                <div className="flex items-center gap-2 text-[11px] font-body text-muted-foreground bg-muted/50 rounded-lg px-3 py-1.5">
                  <Heart className="w-3 h-3 text-primary" />
                  {lang === 'vi' ? 'Cá nhân hoá theo:' : 'Personalised for:'}{' '}
                  <span className="font-heading font-bold text-foreground">{personaLabel}</span>
                </div>
              )}

              <Button
                className="w-full font-heading font-semibold gap-2"
                onClick={handleSearch}
                disabled={!fromCoords || !toCoords || loading}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
                {lang === 'vi' ? 'Tìm lộ trình sạch' : 'Find Clean Route'}
              </Button>
            </div>

            {loading && (
              <WindBoomerangLoader
                text={lang === 'vi' ? 'Đang phân tích dữ liệu không khí trên 3 lộ trình...' : 'Analyzing air quality across 3 routes...'}
              />
            )}

            {result && !loading && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                {fromCoords && toCoords && (
                  <RouteMap
                    from={fromCoords}
                    to={toCoords}
                    cleanSegments={result.recommended.segments}
                    fastGeo={result.fastest === result.recommended ? null : result.fastest.geometry}
                    dangerZones={result.dangerZones}
                  />
                )}

                {/* Route summary — origin / destination / risk / data status */}
                <div className="glass-card p-4 border border-primary/20">
                  <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                    <h3 className="font-heading text-sm font-bold text-foreground">
                      {lang === 'vi' ? 'Tóm tắt lộ trình' : 'Route summary'}
                    </h3>
                    <DataStatusChip
                      status={USE_DEMO_DATA ? 'demo' : (result.recommended.segments.length > 0 ? 'estimated' : 'unavailable')}
                      lang={lang}
                      source={USE_DEMO_DATA ? 'Demo dataset' : 'Mapbox + Open-Meteo'}
                      observedAt={Date.now()}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-body text-foreground">
                    <div className="flex gap-2"><MapPin className="w-3 h-3 text-green-500 mt-0.5 shrink-0" /><span className="truncate"><b>{lang === 'vi' ? 'Đi từ' : 'From'}:</b> {fromQuery || `${fromCoords?.[1]},${fromCoords?.[0]}`}</span></div>
                    <div className="flex gap-2"><MapPin className="w-3 h-3 text-red-500 mt-0.5 shrink-0" /><span className="truncate"><b>{lang === 'vi' ? 'Đến' : 'To'}:</b> {toQuery || `${toCoords?.[1]},${toCoords?.[0]}`}</span></div>
                    <div><b>PM2.5 {lang === 'vi' ? 'trung bình' : 'avg'}:</b> {result.recommended.avgPm25} µg/m³</div>
                    <div><b>{lang === 'vi' ? 'Mức rủi ro' : 'Risk level'}:</b>{' '}
                      <span className={
                        result.recommended.avgPm25 >= 55 ? 'text-red-600 font-heading font-bold' :
                        result.recommended.avgPm25 >= 35 ? 'text-orange-500 font-heading font-bold' :
                        result.recommended.avgPm25 >= 15 ? 'text-amber-500 font-heading font-bold' :
                        'text-green-600 font-heading font-bold'
                      }>
                        {result.recommended.avgPm25 >= 55 ? (lang === 'vi' ? 'Cao' : 'High') :
                         result.recommended.avgPm25 >= 35 ? (lang === 'vi' ? 'Trung bình-Cao' : 'Moderate-High') :
                         result.recommended.avgPm25 >= 15 ? (lang === 'vi' ? 'Trung bình' : 'Moderate') :
                         (lang === 'vi' ? 'Thấp' : 'Low')}
                      </span>
                    </div>
                    <div><b>{lang === 'vi' ? 'Điểm nóng đã né' : 'Hotspots avoided'}:</b> {result.civicAvoided.length + result.dangerZones.length}</div>
                    <div><b>{lang === 'vi' ? 'Nguồn dữ liệu' : 'Data status'}:</b> Mapbox · Open-Meteo · WAQI · Community {USE_DEMO_DATA ? '· DEMO' : ''}</div>
                    <div className="sm:col-span-2 text-muted-foreground"><b>{lang === 'vi' ? 'Cập nhật' : 'Last updated'}:</b> {new Date().toLocaleString(lang === 'vi' ? 'vi-VN' : 'en-US')}</div>
                  </div>
                  <p className="text-[10px] text-muted-foreground font-body mt-2 italic">
                    {lang === 'vi'
                      ? 'AirWeave đề xuất tuyến này để tránh khu vực AQI cao và điểm nóng ô nhiễm gần đây nếu dữ liệu khả dụng. Chưa tính chính xác mức giảm phơi nhiễm thực tế.'
                      : 'AirWeave suggests this route to avoid high-AQI areas and recent pollution hotspots where data is available. Exact exposure reduction is not claimed.'}
                  </p>
                </div>

                {result.dangerZones.length > 0 && (
                  <div className="rounded-xl p-3 bg-destructive/10 border border-destructive/30 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                    <p className="text-xs font-body text-foreground">
                      <span className="font-heading font-bold text-destructive">
                        {result.dangerZones.length}{' '}
                        {lang === 'vi' ? 'khu vực cảnh báo từ cộng đồng' : 'community alert zones'}
                      </span>
                      {' — '}
                      {lang === 'vi'
                        ? 'tuyến đường đã tự động né.'
                        : 'route automatically avoids these areas.'}
                    </p>
                  </div>
                )}

                {result.civicAvoided.length > 0 && (
                  <div className="rounded-xl p-3 bg-orange-500/10 border border-orange-500/30 flex items-start gap-2">
                    <Shield className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                    <div className="min-w-0 text-xs font-body text-foreground space-y-1">
                      <p>
                        <span className="font-heading font-bold text-orange-600">
                          {lang === 'vi' ? 'Civic Hotspot Intelligence' : 'Civic Hotspot Intelligence'}
                        </span>
                        {' — '}
                        {lang === 'vi'
                          ? `né ${result.civicAvoided.length} điểm nóng ô nhiễm (cao${
                              result.sensitiveProfile ? ' + trung bình gần đây' : ''
                            }).`
                          : `avoiding ${result.civicAvoided.length} pollution hotspot${
                              result.civicAvoided.length > 1 ? 's' : ''
                            } (high${result.sensitiveProfile ? ' + recent medium' : ''}).`}
                      </p>
                      <ul className="text-[11px] text-muted-foreground list-disc pl-4 space-y-0.5">
                        {result.civicAvoided.slice(0, 3).map((ev) => (
                          <li key={ev.id}>
                            <span className="font-heading font-semibold text-foreground">
                              {ev.eventType.replace(/_/g, ' ')}
                            </span>
                            {' · '}
                            {ev.sourceLabel}
                            {' · '}
                            {lang === 'vi' ? 'tin cậy' : 'confidence'} {ev.confidence}
                          </li>
                        ))}
                      </ul>
                      {result.sensitiveProfile && (
                        <p className="text-[11px] text-muted-foreground italic">
                          {lang === 'vi'
                            ? 'Áp dụng quy tắc nhạy cảm theo hồ sơ sức khoẻ của bạn.'
                            : 'Sensitive-profile rule applied based on your health profile.'}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Recommended */}
                <div className="glass-card p-5 border-2 border-green-500/30">
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <Shield className="w-5 h-5 text-green-600 shrink-0" />
                    <h3 className="font-heading text-base font-bold text-foreground">
                      {lang === 'vi' ? 'Khuyên dùng' : 'Recommended'}
                    </h3>
                    <span className="ml-auto px-2 py-0.5 rounded-full bg-green-500/20 text-green-600 text-[10px] font-heading font-semibold">
                      {VEHICLES[vehicle].label} · α={result.weights.alpha.toFixed(2)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                    <Stat
                      label={lang === 'vi' ? 'Thời gian' : 'Duration'}
                      value={`${result.recommended.duration} min`}
                      sub={result.extraMinutes > 0 ? `+${result.extraMinutes} min` : undefined}
                    />
                    <Stat label={lang === 'vi' ? 'Khoảng cách' : 'Distance'} value={`${result.recommended.distance} km`} />
                    <Stat label={lang === 'vi' ? 'Phơi nhiễm' : 'Exposure'} value={`${result.recommended.exposure} µg·min`} />
                    <Stat label={lang === 'vi' ? 'Giảm' : 'Reduction'} value={`-${result.reductionPct}%`} highlight />
                  </div>
                  <Button
                    onClick={() => startNavigation(result.recommended.geometry)}
                    className="w-full font-heading font-semibold gap-2"
                  >
                    <Play className="w-4 h-4" />
                    {lang === 'vi' ? 'Bắt đầu đi' : 'Start navigation'}
                  </Button>
                </div>

                {/* Fastest */}
                {result.fastest !== result.recommended && (
                  <div className="glass-card p-5 opacity-80">
                    <div className="flex items-center gap-2 mb-3">
                      <Zap className="w-5 h-5 text-orange-500 shrink-0" />
                      <h3 className="font-heading text-base font-bold text-foreground">
                        {lang === 'vi' ? 'Nhanh nhất' : 'Fastest'}
                      </h3>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                      <Stat label={lang === 'vi' ? 'Thời gian' : 'Duration'} value={`${result.fastest.duration} min`} />
                      <Stat label={lang === 'vi' ? 'Khoảng cách' : 'Distance'} value={`${result.fastest.distance} km`} />
                      <Stat label={lang === 'vi' ? 'Phơi nhiễm' : 'Exposure'} value={`${result.fastest.exposure} µg·min`} />
                      <Stat label="PM2.5" value={`${result.fastest.avgPm25} µg/m³`} />
                    </div>
                    <Button
                      onClick={() => startNavigation(result.fastest.geometry)}
                      className="w-full font-heading font-semibold gap-2"
                      variant="outline"
                    >
                      <Play className="w-4 h-4" />
                      {lang === 'vi' ? 'Đi đường này' : 'Use this route'}
                    </Button>
                  </div>
                )}

                {fromCoords && toCoords && (
                  <MobilityHandoff
                    lang={lang}
                    origin={{ lat: fromCoords[1], lng: fromCoords[0], label: fromQuery }}
                    destination={{ lat: toCoords[1], lng: toCoords[0], label: toQuery }}
                  />
                )}

                <CalculationDetailsPanel
                  lang={lang}
                  samplePoints={result.recommended.segments.length}
                  confidence={USE_DEMO_DATA ? 'demo' : (result.recommended.segments.length >= 3 ? 'estimated' : 'unavailable')}
                  sources={[
                    { name: 'Mapbox Directions API', status: 'live', detail: lang === 'vi' ? 'tuyến + congestion' : 'route + congestion', observedAt: Date.now() },
                    { name: 'Open-Meteo PM2.5', status: USE_DEMO_DATA ? 'demo' : 'estimated', detail: lang === 'vi' ? 'lấy mẫu mỗi đoạn' : 'midpoint sample / segment' },
                    { name: 'WAQI stations', status: 'live', detail: lang === 'vi' ? 'fusion với hotspot' : 'fused into hotspots' },
                    { name: lang === 'vi' ? 'Báo cáo cộng đồng' : 'Community reports', status: result.dangerZones.length > 0 ? 'live' : 'placeholder', detail: `${result.dangerZones.length} ${lang === 'vi' ? 'cụm cảnh báo' : 'clusters'}` },
                    { name: 'Civic Hotspot Intelligence', status: result.civicAvoided.length > 0 ? 'live' : 'placeholder', detail: `${result.civicAvoided.length} ${lang === 'vi' ? 'điểm né' : 'avoided'}` },
                  ]}
                  formulas={[
                    { label: lang === 'vi' ? 'PM2.5 hiệu dụng / đoạn' : 'Effective PM2.5 / segment',
                      expr: 'eff = raw · park(0.7|1) · road(1.5|1) · congestion(1..1.5) · vehicle + dangerPenalty',
                      note: lang === 'vi' ? 'Áp dụng cho mỗi midpoint của đoạn tuyến.' : 'Applied at each segment midpoint.' },
                    { label: lang === 'vi' ? 'PM2.5 trung bình tuyến' : 'Route average PM2.5',
                      expr: 'avg = Σ(pm25_i) / N_segments' },
                    { label: lang === 'vi' ? 'Phơi nhiễm' : 'Exposure',
                      expr: 'exposure = avgPm25 · duration(min)',
                      note: lang === 'vi' ? 'µg·min — proxy phơi nhiễm.' : 'µg·min exposure proxy.' },
                    { label: lang === 'vi' ? 'Chi phí tuyến' : 'Route cost',
                      expr: `cost = α·T + β·(E/10)   ·   α=${result.weights.alpha.toFixed(2)}, β=${result.weights.beta.toFixed(2)}`,
                      note: lang === 'vi' ? 'Tuyến có cost thấp nhất = khuyên dùng.' : 'Lowest cost = recommended.' },
                    { label: lang === 'vi' ? 'Hotspot né' : 'Hotspots avoided',
                      expr: 'high confidence ∪ (sensitiveProfile ∧ medium ≤ 60min)',
                      note: lang === 'vi'
                        ? `Hồ sơ nhạy cảm: ${result.sensitiveProfile ? 'CÓ' : 'KHÔNG'}.`
                        : `Sensitive profile: ${result.sensitiveProfile ? 'YES' : 'NO'}.` },
                  ]}
                />
              </motion.div>
            )}
          </div>
        </PremiumGate>
        </div>
      </FeatureExperienceLayout>
    </div>
  );
};

function Stat({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div className="text-center min-w-0">
      <p className="text-[10px] text-muted-foreground font-heading uppercase tracking-wider mb-0.5 truncate">{label}</p>
      <p className={`font-heading text-sm font-bold truncate ${highlight ? 'text-green-600' : 'text-foreground'}`}>{value}</p>
      {sub && <p className="text-[10px] font-body text-orange-500 mt-0.5">{sub}</p>}
    </div>
  );
}

export default SmartRoute;
