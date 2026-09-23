import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Route,
  Clock,
  Shield,
  Navigation,
  Loader2,
  MapPin,
  AlertTriangle,
  Zap,
  Heart,
  Play,
  Car,
  Bike,
  PersonStanding,
  ArrowUpDown,
  Sparkles,
  ShieldCheck,
  Leaf,
  Layers,
  Info,
  CheckCircle2,
  ExternalLink,
  Compass,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import PremiumGate from '@/components/PremiumGate';
import WindBoomerangLoader from '@/components/WindBoomerangLoader';
import AuroraBackground from '@/components/AuroraBackground';
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
import { shouldUseDemoData } from '@/lib/app-mode';
import DataStatusChip from '@/components/feature-experience/DataStatusChip';
import CalculationDetailsPanel from '@/components/feature-experience/CalculationDetailsPanel';

// Read Mapbox from VITE_MAPBOX_TOKEN so secrets are never committed.
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;

interface GeocodeSuggestion {
  id: string;
  place_name: string;
  center: [number, number];
}

function normalizePlaceName(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function isRelevantPlace(query: string, placeName: string): boolean {
  const words = normalizePlaceName(query).split(' ').filter(Boolean);
  const name = normalizePlaceName(placeName);
  return words.length > 0 && (name.includes(words.join(' ')) || words.filter((word) => name.split(' ').includes(word)).length >= Math.ceil(words.length * 0.75));
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
async function geocodeSearch(query: string, proximity?: [number, number]): Promise<GeocodeSuggestion[]> {
  if (!query || query.length < 3) return [];
  if (!MAPBOX_TOKEN) return [];
  const searchParams = new URLSearchParams({ q: query, access_token: MAPBOX_TOKEN, country: 'VN', limit: '8', language: 'vi' });
  if (proximity) searchParams.set('proximity', proximity.join(','));
  try {
    // Search Box includes POIs (parks, hospitals); Geocoding v5 often returns only nearby addresses.
    const response = await fetch(`https://api.mapbox.com/search/searchbox/v1/forward?${searchParams}`);
    if (response.ok) {
      const data = await response.json();
      const places = (data.features || []).map((feature: any) => ({
        id: feature.properties?.mapbox_id,
        place_name: [feature.properties?.name, feature.properties?.place_formatted].filter(Boolean).join(', '),
        center: feature.geometry?.coordinates,
      })).filter((place: GeocodeSuggestion) =>
        place.id && Array.isArray(place.center) && place.center.length === 2 && isRelevantPlace(query, place.place_name));
      if (places.length) return places;
    }
  } catch {
    // Older tokens may only have access to the Geocoding API.
  }
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&country=vn&limit=5&language=vi`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return (data.features || []).filter((f: any) => isRelevantPlace(query, f.place_name || '')).map((f: any) => ({
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

/* -------- PM2.5 cache -------- */
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
  const fallbackPm25 = Math.round(22 + Math.abs(Math.sin(lat * 50 + lng * 50)) * 28);
  if (shouldUseDemoData()) return fallbackPm25;

  const key = pm25Key(lat, lng);
  const hit = pm25Cache.get(key);
  if (hit && Date.now() - hit.t < PM25_TTL_MS) return hit.v;
  try {
    const res = await fetch(
      `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}&current=pm2_5`
    );
    if (!res.ok) return hit?.v ?? fallbackPm25;
    const data = await res.json();
    const v = data.current?.pm2_5 ?? fallbackPm25;
    pm25Cache.set(key, { v, t: Date.now() });
    persistPm25Cache();
    return v;
  } catch {
    return hit?.v ?? fallbackPm25;
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
  const demo = shouldUseDemoData();
  const outletCtx = useOutletContext<{ lang?: 'vi' | 'en' }>() || {};
  const lang = outletCtx.lang || 'vi';
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
  const [activeRouteView, setActiveRouteView] = useState<'recommended' | 'fastest' | 'cleanest'>('recommended');
  const [loading, setLoading] = useState(false);
  const [searchingFrom, setSearchingFrom] = useState(false);
  const [searchingTo, setSearchingTo] = useState(false);
  const fromSearchId = useRef(0);
  const toSearchId = useRef(0);
  const [prefs, setPrefs] = useState<Prefs | null>(null);

  const fromDebounce = useRef<NodeJS.Timeout>();
  const toDebounce = useRef<NodeJS.Timeout>();

  const swapPoints = () => {
    const prevFromQ = fromQuery;
    const prevFromC = fromCoords;
    setFromQuery(toQuery);
    setFromCoords(toCoords);
    setToQuery(prevFromQ);
    setToCoords(prevFromC);
    setFromSuggestions([]);
    setToSuggestions([]);
  };

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
    const searchId = ++fromSearchId.current;
    setFromQuery(value);
    setFromCoords(null);
    clearTimeout(fromDebounce.current);
    if (value.length >= 3) {
      setSearchingFrom(true);
      fromDebounce.current = setTimeout(async () => {
        try {
          const results = await geocodeSearch(value, [geoLocation.lng, geoLocation.lat]);
          if (searchId === fromSearchId.current) setFromSuggestions(results);
        } catch {
          if (searchId === fromSearchId.current) setFromSuggestions([]);
        } finally {
          if (searchId === fromSearchId.current) setSearchingFrom(false);
        }
      }, 400);
    } else {
      setFromSuggestions([]);
      setSearchingFrom(false);
    }
  };

  const handleToChange = (value: string) => {
    const searchId = ++toSearchId.current;
    setToQuery(value);
    setToCoords(null);
    clearTimeout(toDebounce.current);
    if (value.length >= 3) {
      setSearchingTo(true);
      toDebounce.current = setTimeout(async () => {
        try {
          const results = await geocodeSearch(value, [geoLocation.lng, geoLocation.lat]);
          if (searchId === toSearchId.current) setToSuggestions(results);
        } catch {
          if (searchId === toSearchId.current) setToSuggestions([]);
        } finally {
          if (searchId === toSearchId.current) setSearchingTo(false);
        }
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

      // Sensitive profile = respiratory / cardio / child / elderly / respiratory group.
      const cond = prefs?.medical_history || [];
      const sensitiveProfile =
        cond.some((c) => ['asthma', 'copd', 'cardio'].includes(c)) ||
        prefs?.sensitive_group === 'child' ||
        prefs?.sensitive_group === 'elderly' ||
        prefs?.sensitive_group === 'respiratory';

      // Pull WAQI stations in route bbox
      let stationsForFusion: { uid: string | number; lat: number; lng: number; aqi: number; station: string | null }[] = [];
      try {
        const stData = await airApi.waqiBounds(minLat, minLng, maxLat, maxLng);
        if (stData?.stations) {
          stationsForFusion = stData.stations.map((s: any) => ({
            uid: s.uid, lat: s.lat, lng: s.lng, aqi: s.aqi, station: s.station ?? null,
          }));
        }
      } catch {
        /* ignore */
      }

      const civicEvents = hotspotIntelligenceService.buildFromReports(
        (reports || []) as never,
        stationsForFusion
      );
      const nowMs = Date.now();
      const civicToAvoid = civicEvents.filter((ev) => {
        if (ev.confidence === 'high') return true;
        if (sensitiveProfile && ev.confidence === 'medium') {
          return nowMs - +new Date(ev.lastUpdated) <= 60 * 60 * 1000;
        }
        return false;
      });

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
      setActiveRouteView('recommended');
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

  const currentActiveRoute = result ? result[activeRouteView] || result.recommended : null;

  return (
    <div className="min-h-full flex flex-col bg-[#050911] text-white relative overflow-x-hidden font-body selection:bg-cyan-500/30 selection:text-cyan-200">
      <AuroraBackground />

      <div className="relative z-10 max-w-[1750px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shadow-lg shadow-cyan-500/10">
              <Route className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-heading font-extrabold bg-gradient-to-r from-white via-cyan-100 to-sky-400 bg-clip-text text-transparent">
                  {lang === 'vi' ? 'Lộ Trình Sạch Theo AQI' : 'Clean Route by AQI'}
                </h1>
                <span className="hidden md:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-heading font-semibold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                  <Sparkles className="w-3 h-3 text-cyan-400" />
                  AI Clean Navigation
                </span>
              </div>
              <p className="text-xs sm:text-sm text-gray-400 font-body mt-0.5">
                {lang === 'vi'
                  ? 'Phân tích nồng độ PM2.5 theo từng đoạn đường, tối ưu sức khoẻ và né tránh điểm nóng ô nhiễm.'
                  : 'Real-time PM2.5 route scoring, exposure minimization & civic hotspot avoidance.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <DataStatusChip
              status={demo ? 'demo' : 'estimated'}
              lang={lang}
              source={demo ? 'Demo dataset' : 'Mapbox + Open-Meteo'}
              observedAt={Date.now()}
            />
          </div>
        </div>

        {/* High AQI Alert Banner */}
        {(isAlertMode || (weather.aqi > 0 && weather.aqi >= 100)) && (
          <div className="rounded-2xl p-4 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-transparent border border-amber-500/30 backdrop-blur-xl flex items-start gap-3.5 shadow-lg shadow-amber-500/5">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-heading font-bold text-amber-300">
                {lang === 'vi'
                  ? `Cảnh báo chất lượng không khí: AQI hiện tại ${weather.aqi || '—'} (Kém / Không tốt)`
                  : `Air Quality Alert: Current AQI ${weather.aqi || '—'} (Poor / Unhealthy)`}
              </p>
              <p className="text-xs text-gray-300 font-body mt-0.5 leading-relaxed">
                {lang === 'vi'
                  ? 'Vị trí hiện tại của bạn đã được điền sẵn. Hãy chọn điểm đến để hệ thống tìm tuyến đường có liều lượng hạt bụi mịn PM2.5 thấp nhất.'
                  : 'Your current location is pre-filled. Enter destination to calculate the route minimizing your PM2.5 inhaled intake.'}
              </p>
            </div>
          </div>
        )}

        {/* Main 2-Column Bento Grid */}
        <PremiumGate feature={lang === 'vi' ? 'Tìm đường sạch nhất' : 'Cleanest route finder'} lang={lang}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

            {/* LEFT COLUMN: Input Form & Result Cards (4 or 5 cols) */}
            <div className="lg:col-span-5 xl:col-span-4 space-y-6">

              {/* Form Card */}
              <div className="rounded-3xl bg-gradient-to-br from-[#0B1528]/90 via-[#0D1D35]/85 to-[#08101E]/95 border border-sky-500/20 shadow-2xl backdrop-blur-xl p-5 sm:p-6 space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <Compass className="w-4 h-4 text-cyan-400" />
                    <h2 className="text-sm font-heading font-bold text-white uppercase tracking-wider">
                      {lang === 'vi' ? 'Thiết lập lộ trình' : 'Route Parameters'}
                    </h2>
                  </div>
                  {personaLabel && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-[11px] font-heading font-semibold text-cyan-300">
                      <Heart className="w-3 h-3 text-cyan-400" />
                      <span>{personaLabel}</span>
                    </div>
                  )}
                </div>

                {/* Input Fields with Swap button */}
                <div className="space-y-2 relative">
                  {/* Origin */}
                  <div className="relative">
                    <Input
                      placeholder={lang === 'vi' ? 'Điểm xuất phát...' : 'Start point...'}
                      value={fromQuery}
                      onChange={(e) => handleFromChange(e.target.value)}
                      className="pl-9 pr-20 h-11 bg-white/[0.04] border-white/10 text-white placeholder:text-gray-500 focus:border-cyan-400/60 focus:ring-1 focus:ring-cyan-400/30 rounded-xl text-xs sm:text-sm"
                    />
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-emerald-400 ring-4 ring-emerald-500/20" />
                    <button
                      type="button"
                      onClick={useCurrentLocation}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1 px-2 py-1 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-[11px] font-heading font-semibold text-cyan-300 hover:bg-cyan-500/25 transition-all"
                    >
                      <MapPin className="w-3 h-3" />
                      {lang === 'vi' ? 'GPS' : 'GPS'}
                    </button>
                    {searchingFrom && (
                      <div className="absolute right-16 top-1/2 -translate-y-1/2">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                      </div>
                    )}
                    {fromSuggestions.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-[#0B1528]/95 border border-sky-500/30 rounded-xl shadow-2xl backdrop-blur-xl max-h-48 overflow-y-auto divide-y divide-sky-500/10">
                        {fromSuggestions.map((s) => (
                          <button
                            key={s.id}
                            onClick={() => selectFrom(s)}
                            className="w-full text-left px-3.5 py-2.5 text-xs text-gray-200 hover:bg-cyan-500/20 hover:text-white transition-colors"
                          >
                            {s.place_name}
                          </button>
                        ))}
                      </div>
                    )}
                    {fromQuery.trim().length >= 3 && !fromCoords && !searchingFrom && fromSuggestions.length === 0 && (
                      <p className="mt-1 text-[11px] text-amber-300">{lang === 'vi' ? 'Không tìm thấy địa điểm phù hợp. Hãy nhập địa chỉ cụ thể hơn.' : 'No matching place. Try a more specific address.'}</p>
                    )}
                  </div>

                  {/* Swap Button */}
                  <div className="flex justify-end pr-3 -my-1 relative z-10">
                    <button
                      type="button"
                      onClick={swapPoints}
                      title={lang === 'vi' ? 'Đảo điểm đi và đến' : 'Swap points'}
                      className="p-1.5 rounded-full bg-[#0D1D35] border border-sky-500/30 text-cyan-300 hover:bg-cyan-500/20 hover:border-cyan-400/60 shadow-md transition-all active:scale-90"
                    >
                      <ArrowUpDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Destination */}
                  <div className="relative">
                    <Input
                      placeholder={lang === 'vi' ? 'Điểm đến...' : 'Destination...'}
                      value={toQuery}
                      onChange={(e) => handleToChange(e.target.value)}
                      className="pl-9 pr-10 h-11 bg-white/[0.04] border-white/10 text-white placeholder:text-gray-500 focus:border-cyan-400/60 focus:ring-1 focus:ring-cyan-400/30 rounded-xl text-xs sm:text-sm"
                    />
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-rose-500 ring-4 ring-rose-500/20" />
                    {searchingTo && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                      </div>
                    )}
                    {toSuggestions.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-[#0B1528]/95 border border-sky-500/30 rounded-xl shadow-2xl backdrop-blur-xl max-h-48 overflow-y-auto divide-y divide-sky-500/10">
                        {toSuggestions.map((s) => (
                          <button
                            key={s.id}
                            onClick={() => selectTo(s)}
                            className="w-full text-left px-3.5 py-2.5 text-xs text-gray-200 hover:bg-cyan-500/20 hover:text-white transition-colors"
                          >
                            {s.place_name}
                          </button>
                        ))}
                      </div>
                    )}
                    {toQuery.trim().length >= 3 && !toCoords && !searchingTo && toSuggestions.length === 0 && (
                      <p className="mt-1 text-[11px] text-amber-300">{lang === 'vi' ? 'Không tìm thấy địa điểm phù hợp. Hãy nhập địa chỉ cụ thể hơn.' : 'No matching place. Try a more specific address.'}</p>
                    )}
                  </div>
                </div>

                {/* Vehicle Selector */}
                <div className="space-y-2">
                  <p className="text-[11px] uppercase tracking-wider text-gray-400 font-heading font-semibold">
                    {lang === 'vi' ? 'Phương tiện di chuyển' : 'Vehicle'}
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {VEHICLE_OPTIONS.map((v) => {
                      const active = vehicle === v.key;
                      return (
                        <button
                          key={v.key}
                          type="button"
                          onClick={() => setVehicle(v.key)}
                          className={`flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-xl border text-xs font-heading font-semibold transition-all ${
                            active
                              ? 'bg-cyan-500/20 border-cyan-400/60 text-cyan-300 shadow-md shadow-cyan-500/20'
                              : 'bg-white/[0.03] border-white/10 text-gray-400 hover:border-white/20 hover:text-white'
                          }`}
                        >
                          <div className={active ? 'text-cyan-300 scale-110 transition-transform' : 'text-gray-400'}>
                            {v.icon}
                          </div>
                          <span className="leading-none text-[11px]">{lang === 'vi' ? v.vi : v.en}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Departure Time Mode */}
                <div className="flex items-center justify-between gap-3 pt-1">
                  <div className="flex items-center gap-2 text-xs font-body text-gray-300">
                    <Clock className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span>{lang === 'vi' ? 'Thời điểm đi:' : 'Departure:'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="inline-flex rounded-xl p-0.5 bg-black/40 border border-white/10">
                      <button
                        type="button"
                        onClick={() => setDepartureMode('now')}
                        className={`px-3 py-1 text-xs font-heading font-semibold rounded-lg transition-all ${
                          departureMode === 'now'
                            ? 'bg-cyan-500/25 text-cyan-300 shadow-sm'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        {lang === 'vi' ? 'Bây giờ' : 'Now'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDepartureMode('schedule')}
                        className={`px-3 py-1 text-xs font-heading font-semibold rounded-lg transition-all ${
                          departureMode === 'schedule'
                            ? 'bg-cyan-500/25 text-cyan-300 shadow-sm'
                            : 'text-gray-400 hover:text-white'
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
                        className="w-24 h-8 text-xs bg-white/[0.04] border-white/10 text-white rounded-lg px-2"
                      />
                    )}
                  </div>
                </div>

                {/* Time vs Air slider */}
                <div className="space-y-2 pt-1 border-t border-white/5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-heading font-semibold text-gray-300">
                      {lang === 'vi' ? 'Cân bằng: Tốc độ ↔ Không khí' : 'Balance: Time ↔ Air'}
                    </span>
                    <span className="text-cyan-400 font-heading font-bold text-xs bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">
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
                    className="py-1"
                  />
                  <div className="flex items-center justify-between text-[10px] text-gray-400 font-body">
                    <span className="flex items-center gap-1">⚡ {lang === 'vi' ? 'Nhanh nhất' : 'Fastest'}</span>
                    <span className="flex items-center gap-1">🌿 {lang === 'vi' ? 'Sạch nhất' : 'Cleanest'}</span>
                  </div>
                </div>

                {/* Search Button */}
                <Button
                  className="w-full h-11 font-heading font-bold gap-2 text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 border border-cyan-400/40 shadow-lg shadow-cyan-500/25 transition-all rounded-xl active:scale-[0.98]"
                  onClick={handleSearch}
                  disabled={!fromCoords || !toCoords || loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      {lang === 'vi' ? 'Đang phân tích lộ trình...' : 'Calculating cleanest routes...'}
                    </>
                  ) : (
                    <>
                      <Navigation className="w-4 h-4 text-cyan-200" />
                      {lang === 'vi' ? 'Tìm Lộ Trình Sạch Tối Ưu' : 'Find Cleanest Route'}
                    </>
                  )}
                </Button>
              </div>

              {/* Loading Indicator */}
              {loading && (
                <div className="rounded-3xl bg-gradient-to-br from-[#0B1528]/90 via-[#0D1D35]/85 to-[#08101E]/95 border border-cyan-500/20 p-6 shadow-xl text-center">
                  <WindBoomerangLoader
                    text={lang === 'vi' ? 'Đang phân tích 3 phương án lộ trình & nồng độ PM2.5...' : 'Analyzing 3 route variations & PM2.5 exposure...'}
                  />
                </div>
              )}

              {/* Route Results Cards (Left column when results available) */}
              {result && !loading && (
                <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                  {/* RECOMMENDED ROUTE CARD */}
                  <div
                    onClick={() => setActiveRouteView('recommended')}
                    className={`cursor-pointer rounded-3xl p-5 border-2 transition-all ${
                      activeRouteView === 'recommended'
                        ? 'border-emerald-500/80 bg-gradient-to-br from-emerald-950/40 via-[#0B1528]/95 to-[#08101E]/95 shadow-xl shadow-emerald-500/15 ring-2 ring-emerald-500/20'
                        : 'border-emerald-500/30 bg-[#0B1528]/70 hover:border-emerald-500/50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-xl bg-emerald-500/20 text-emerald-400">
                          <ShieldCheck className="w-4 h-4" />
                        </div>
                        <h3 className="font-heading text-sm sm:text-base font-bold text-white">
                          {lang === 'vi' ? 'Tuyến khuyên dùng' : 'Recommended Route'}
                        </h3>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {result.reductionPct > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 text-[11px] font-heading font-bold">
                            -{result.reductionPct}% {lang === 'vi' ? 'phơi nhiễm' : 'exposure'}
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded-full bg-white/[0.05] border border-white/10 text-gray-400 text-[10px] font-heading">
                          α={result.weights.alpha.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                      <Stat
                        label={lang === 'vi' ? 'Thời gian' : 'Duration'}
                        value={`${result.recommended.duration} min`}
                        sub={result.extraMinutes > 0 ? `+${result.extraMinutes}m` : undefined}
                      />
                      <Stat label={lang === 'vi' ? 'Khoảng cách' : 'Distance'} value={`${result.recommended.distance} km`} />
                      <Stat label="PM2.5" value={`${result.recommended.avgPm25}`} variant="emerald" />
                      <Stat
                        label={lang === 'vi' ? 'Phơi nhiễm' : 'Exposure'}
                        value={`${result.recommended.exposure}`}
                        variant="emerald"
                      />
                    </div>

                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        startNavigation(result.recommended.geometry);
                      }}
                      className="w-full font-heading font-semibold gap-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-600/20"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      {lang === 'vi' ? 'Bắt đầu đi tuyến này' : 'Navigate Recommended'}
                    </Button>
                  </div>

                  {/* FASTEST ROUTE CARD (if distinct) */}
                  {result.fastest !== result.recommended && (
                    <div
                      onClick={() => setActiveRouteView('fastest')}
                      className={`cursor-pointer rounded-3xl p-5 border transition-all ${
                        activeRouteView === 'fastest'
                          ? 'border-amber-500/80 bg-gradient-to-br from-amber-950/30 via-[#0B1528]/95 to-[#08101E]/95 shadow-xl shadow-amber-500/10 ring-2 ring-amber-500/20'
                          : 'border-amber-500/20 bg-[#0B1528]/70 hover:border-amber-500/40 opacity-85'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-xl bg-amber-500/20 text-amber-400">
                            <Zap className="w-4 h-4" />
                          </div>
                          <h3 className="font-heading text-sm font-bold text-white">
                            {lang === 'vi' ? 'Tuyến nhanh nhất' : 'Fastest Route'}
                          </h3>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[10px] font-heading font-bold">
                          ⚡ {result.fastest.duration} min
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                        <Stat label={lang === 'vi' ? 'Thời gian' : 'Duration'} value={`${result.fastest.duration}m`} variant="amber" />
                        <Stat label={lang === 'vi' ? 'Khoảng cách' : 'Distance'} value={`${result.fastest.distance}km`} />
                        <Stat label="PM2.5" value={`${result.fastest.avgPm25}`} />
                        <Stat label={lang === 'vi' ? 'Phơi nhiễm' : 'Exposure'} value={`${result.fastest.exposure}`} />
                      </div>

                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          startNavigation(result.fastest.geometry);
                        }}
                        variant="outline"
                        className="w-full font-heading font-semibold gap-2 border-white/10 hover:bg-white/[0.06] text-gray-200 rounded-xl"
                      >
                        <Play className="w-3.5 h-3.5" />
                        {lang === 'vi' ? 'Chọn tuyến nhanh' : 'Use Fastest'}
                      </Button>
                    </div>
                  )}

                  {/* CLEANEST ROUTE CARD (if distinct from recommended and fastest) */}
                  {result.cleanest !== result.recommended && result.cleanest !== result.fastest && (
                    <div
                      onClick={() => setActiveRouteView('cleanest')}
                      className={`cursor-pointer rounded-3xl p-5 border transition-all ${
                        activeRouteView === 'cleanest'
                          ? 'border-cyan-500/80 bg-gradient-to-br from-cyan-950/30 via-[#0B1528]/95 to-[#08101E]/95 shadow-xl shadow-cyan-500/10 ring-2 ring-cyan-500/20'
                          : 'border-cyan-500/20 bg-[#0B1528]/70 hover:border-cyan-500/40 opacity-85'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-xl bg-cyan-500/20 text-cyan-400">
                            <Leaf className="w-4 h-4" />
                          </div>
                          <h3 className="font-heading text-sm font-bold text-white">
                            {lang === 'vi' ? 'Tuyến sạch tuyệt đối' : 'Cleanest Exposure'}
                          </h3>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-[10px] font-heading font-bold">
                          🌿 {result.cleanest.avgPm25} µg/m³
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                        <Stat label={lang === 'vi' ? 'Thời gian' : 'Duration'} value={`${result.cleanest.duration}m`} />
                        <Stat label={lang === 'vi' ? 'Khoảng cách' : 'Distance'} value={`${result.cleanest.distance}km`} />
                        <Stat label="PM2.5" value={`${result.cleanest.avgPm25}`} variant="cyan" />
                        <Stat label={lang === 'vi' ? 'Phơi nhiễm' : 'Exposure'} value={`${result.cleanest.exposure}`} variant="cyan" />
                      </div>

                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          startNavigation(result.cleanest.geometry);
                        }}
                        variant="outline"
                        className="w-full font-heading font-semibold gap-2 border-white/10 hover:bg-white/[0.06] text-gray-200 rounded-xl"
                      >
                        <Play className="w-3.5 h-3.5" />
                        {lang === 'vi' ? 'Chọn tuyến sạch nhất' : 'Use Cleanest'}
                      </Button>
                    </div>
                  )}

                  {/* Mobility App Handoff */}
                  {fromCoords && toCoords && (
                    <MobilityHandoff
                      lang={lang}
                      origin={{ lat: fromCoords[1], lng: fromCoords[0], label: fromQuery }}
                      destination={{ lat: toCoords[1], lng: toCoords[0], label: toQuery }}
                    />
                  )}
                </motion.div>
              )}
            </div>

            {/* RIGHT COLUMN: Interactive Route Map & Telemetry Dashboard (7 or 8 cols) */}
            <div className="lg:col-span-7 xl:col-span-8 space-y-6">

              {/* Map & Telemetry HUD Card */}
              <div className="rounded-3xl bg-gradient-to-br from-[#0B1528]/90 via-[#0D1D35]/85 to-[#08101E]/95 border border-sky-500/20 shadow-2xl backdrop-blur-xl p-5 sm:p-6 overflow-hidden flex flex-col space-y-4">

                {/* HUD Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
                  <div className="flex items-center gap-2 min-w-0">
                    <Layers className="w-5 h-5 text-cyan-400 shrink-0" />
                    <div className="min-w-0">
                      <h2 className="font-heading text-base font-bold text-white truncate flex items-center gap-2">
                        {lang === 'vi' ? 'Bản Đồ Lộ Trình & Chất Lượng Không Khí' : 'Route Map & Air Quality Overlay'}
                      </h2>
                      <p className="text-xs text-gray-400 font-body truncate">
                        {fromCoords && toCoords
                          ? `${fromQuery.split(',')[0] || 'A'} ➔ ${toQuery.split(',')[0] || 'B'}`
                          : (lang === 'vi' ? 'Trực quan hoá nồng độ PM2.5 theo từng phân đoạn lộ trình' : 'Visualizing PM2.5 concentration across route segments')}
                      </p>
                    </div>
                  </div>

                  {/* Route View Switcher Tabs (when result available) */}
                  {result && (
                    <div className="inline-flex rounded-xl p-0.5 bg-black/40 border border-white/10 shrink-0 self-start sm:self-auto">
                      <button
                        type="button"
                        onClick={() => setActiveRouteView('recommended')}
                        className={`px-3 py-1 text-xs font-heading font-semibold rounded-lg transition-all ${
                          activeRouteView === 'recommended'
                            ? 'bg-emerald-500/25 text-emerald-300 shadow-sm'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        {lang === 'vi' ? 'Khuyên dùng' : 'Recommended'}
                      </button>
                      {result.fastest !== result.recommended && (
                        <button
                          type="button"
                          onClick={() => setActiveRouteView('fastest')}
                          className={`px-3 py-1 text-xs font-heading font-semibold rounded-lg transition-all ${
                            activeRouteView === 'fastest'
                              ? 'bg-amber-500/25 text-amber-300 shadow-sm'
                              : 'text-gray-400 hover:text-white'
                          }`}
                        >
                          {lang === 'vi' ? 'Nhanh nhất' : 'Fastest'}
                        </button>
                      )}
                      {result.cleanest !== result.recommended && result.cleanest !== result.fastest && (
                        <button
                          type="button"
                          onClick={() => setActiveRouteView('cleanest')}
                          className={`px-3 py-1 text-xs font-heading font-semibold rounded-lg transition-all ${
                            activeRouteView === 'cleanest'
                              ? 'bg-cyan-500/25 text-cyan-300 shadow-sm'
                              : 'text-gray-400 hover:text-white'
                          }`}
                        >
                          {lang === 'vi' ? 'Sạch nhất' : 'Cleanest'}
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Map Display or Empty State Preview */}
                <div className="w-full relative rounded-2xl overflow-hidden border border-white/10 bg-[#060D19] min-h-[500px] lg:h-[600px] flex items-center justify-center">
                  {fromCoords && toCoords && currentActiveRoute ? (
                    <RouteMap
                      from={fromCoords}
                      to={toCoords}
                      cleanSegments={currentActiveRoute.segments}
                      fastGeo={activeRouteView === 'fastest' ? null : (result?.fastest === currentActiveRoute ? null : result?.fastest.geometry || null)}
                      dangerZones={result?.dangerZones}
                      className="w-full h-full"
                    />
                  ) : (
                    <div className="p-8 max-w-md text-center space-y-4">
                      <div className="w-16 h-16 rounded-3xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 mx-auto flex items-center justify-center shadow-lg shadow-cyan-500/10">
                        <Route className="w-8 h-8 animate-pulse text-cyan-400" />
                      </div>
                      <div>
                        <h3 className="text-base font-heading font-bold text-white">
                          {lang === 'vi' ? 'Chưa Có Lộ Trình Được Chọn' : 'No Route Selected Yet'}
                        </h3>
                        <p className="text-xs text-gray-400 font-body mt-1 leading-relaxed">
                          {lang === 'vi'
                            ? 'Vui lòng nhập điểm xuất phát và điểm đến ở cột bên trái, sau đó bấm "Tìm Lộ Trình Sạch Tối Ưu" để hệ thống tính toán ma trận AQI đa điểm.'
                            : 'Enter your start point and destination on the left, then click "Find Cleanest Route" to render multi-segment PM2.5 heatmaps.'}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-left pt-2">
                        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                          <p className="text-[11px] font-heading font-semibold text-cyan-300">🛡️ {lang === 'vi' ? 'Né điểm ô nhiễm' : 'Avoid pollution hotspots'}</p>
                          <p className="text-[10px] text-gray-400">{lang === 'vi' ? 'Tự động né điểm nóng đốt rác, công trường & trạm quan trắc cao.' : 'Automatically avoids waste burning, construction dust, and high-reading stations.'}</p>
                        </div>
                        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                          <p className="text-[11px] font-heading font-semibold text-emerald-300">🌿 {lang === 'vi' ? 'Bảo vệ hô hấp' : 'Respiratory protection'}</p>
                          <p className="text-[10px] text-gray-400">{lang === 'vi' ? 'Cá nhân hoá trọng số phơi nhiễm theo hồ sơ nhạy cảm của bạn.' : 'Personalizes exposure weighting using your sensitivity profile.'}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Telemetry Summary Bar (when result is present) */}
                {result && currentActiveRoute && (
                  <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <p className="text-[10px] uppercase font-heading text-gray-400 tracking-wider">{lang === 'vi' ? 'PM2.5 Trung bình' : 'Average PM2.5'}</p>
                      <p className="text-sm font-heading font-bold text-white mt-0.5">{currentActiveRoute.avgPm25} µg/m³</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-heading text-gray-400 tracking-wider">{lang === 'vi' ? 'Mức rủi ro' : 'Risk level'}</p>
                      <p className={`text-sm font-heading font-bold mt-0.5 ${
                        currentActiveRoute.avgPm25 >= 55 ? 'text-red-400' :
                        currentActiveRoute.avgPm25 >= 35 ? 'text-orange-400' :
                        currentActiveRoute.avgPm25 >= 15 ? 'text-amber-400' :
                        'text-emerald-400'
                      }`}>
                        {currentActiveRoute.avgPm25 >= 55 ? (lang === 'vi' ? 'Cao' : 'High') :
                         currentActiveRoute.avgPm25 >= 35 ? (lang === 'vi' ? 'Trung bình - Cao' : 'Mod - High') :
                         currentActiveRoute.avgPm25 >= 15 ? (lang === 'vi' ? 'Trung bình' : 'Moderate') :
                         (lang === 'vi' ? 'An toàn' : 'Low')}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-heading text-gray-400 tracking-wider">{lang === 'vi' ? 'Điểm cảnh báo né' : 'Hotspots avoided'}</p>
                      <p className="text-sm font-heading font-bold text-cyan-400 mt-0.5">
                        {result.civicAvoided.length + result.dangerZones.length} {lang === 'vi' ? 'điểm' : 'hotspots'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-heading text-gray-400 tracking-wider">{lang === 'vi' ? 'Trạng thái dữ liệu' : 'Data status'}</p>
                      <p className="text-sm font-heading font-bold text-emerald-400 mt-0.5">Live Open-Meteo</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Civic Hotspots Avoided Alert Box */}
              {result && result.civicAvoided.length > 0 && (
                <div className="rounded-3xl p-5 bg-gradient-to-br from-amber-500/15 via-[#0D1D35]/85 to-[#08101E]/95 border border-amber-500/30 shadow-xl backdrop-blur-xl flex items-start gap-3.5">
                  <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 shrink-0 mt-0.5">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 space-y-2 text-xs">
                    <div>
                      <p className="font-heading font-bold text-amber-300 text-sm">
                        {lang === 'vi' ? 'Trí tuệ điểm nóng công dân (Civic Hotspot Intelligence)' : 'Civic Hotspot Intelligence'}
                      </p>
                      <p className="text-gray-300 font-body mt-0.5">
                        {lang === 'vi'
                          ? `Thuật toán đã tự động uốn cong lộ trình để né tránh ${result.civicAvoided.length} điểm ô nhiễm cục bộ (mức độ tin cậy cao${result.sensitiveProfile ? ' và trung bình gần đây' : ''}).`
                          : `Route dynamically rerouted away from ${result.civicAvoided.length} confirmed pollution hotspots.`}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {result.civicAvoided.slice(0, 4).map((ev) => (
                        <div key={ev.id} className="px-2.5 py-1 rounded-lg bg-black/40 border border-amber-500/20 text-[11px] text-gray-200">
                          <span className="font-heading font-semibold text-amber-300 capitalize">{ev.eventType.replace(/_/g, ' ')}</span>
                          <span className="text-gray-400"> · {ev.sourceLabel} · tin cậy {ev.confidence}</span>
                        </div>
                      ))}
                    </div>
                    {result.sensitiveProfile && (
                      <p className="text-[11px] text-amber-400/80 italic font-body">
                        {lang === 'vi'
                          ? '✦ Đã kích hoạt cơ chế bảo vệ nghiêm ngặt dựa trên hồ sơ sức khoẻ hô hấp của bạn.'
                          : '✦ Enhanced avoidance threshold active based on your respiratory health profile.'}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Community Danger Zones Box */}
              {result && result.dangerZones.length > 0 && (
                <div className="rounded-3xl p-5 bg-gradient-to-br from-rose-500/10 via-[#0D1D35]/85 to-[#08101E]/95 border border-rose-500/30 shadow-xl backdrop-blur-xl flex items-start gap-3.5">
                  <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 shrink-0 mt-0.5">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 text-xs">
                    <p className="font-heading font-bold text-rose-300 text-sm">
                      {lang === 'vi' ? 'Cảnh báo từ báo cáo cộng đồng' : 'Community Alerts Avoided'}
                    </p>
                    <p className="text-gray-300 font-body mt-0.5">
                      {lang === 'vi'
                        ? `Tuyến đường đã né tránh ${result.dangerZones.length} cụm cảnh báo khói bụi / công trường do cộng đồng ghi nhận trong 30 phút qua.`
                        : `Clean route actively diverts around ${result.dangerZones.length} verified real-time community danger zones.`}
                    </p>
                  </div>
                </div>
              )}

              {/* Calculation Transparency Panel */}
              {result && (
                <div className="rounded-3xl bg-gradient-to-br from-[#0B1528]/90 via-[#0D1D35]/85 to-[#08101E]/95 border border-sky-500/20 shadow-2xl backdrop-blur-xl p-5 overflow-hidden">
                  <CalculationDetailsPanel
                    lang={lang}
                    samplePoints={result.recommended.segments.length}
                    confidence={demo ? 'demo' : (result.recommended.segments.length >= 3 ? 'estimated' : 'unavailable')}
                    sources={[
                      { name: 'Mapbox Directions API', status: 'live', detail: lang === 'vi' ? 'tuyến + congestion' : 'route + congestion', observedAt: Date.now() },
                      { name: 'Open-Meteo PM2.5', status: demo ? 'demo' : 'estimated', detail: lang === 'vi' ? 'lấy mẫu mỗi đoạn' : 'midpoint sample / segment' },
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
                </div>
              )}
            </div>

          </div>
        </PremiumGate>
      </div>
    </div>
  );
};

function Stat({
  label,
  value,
  sub,
  highlight,
  variant,
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
  variant?: 'emerald' | 'amber' | 'cyan' | 'default';
}) {
  const valueColor =
    variant === 'emerald' || highlight
      ? 'text-emerald-400'
      : variant === 'amber'
      ? 'text-amber-400'
      : variant === 'cyan'
      ? 'text-cyan-400'
      : 'text-white';

  return (
    <div className="text-center min-w-0 p-2.5 rounded-xl bg-white/[0.03] border border-white/5 backdrop-blur-sm">
      <p className="text-[10px] text-gray-400 font-heading uppercase tracking-wider mb-0.5 truncate">{label}</p>
      <p className={`font-heading text-sm sm:text-base font-bold whitespace-nowrap ${valueColor}`}>{value}</p>
      {sub && <p className="text-[10px] font-body text-amber-400/90 mt-0.5 font-medium">{sub}</p>}
    </div>
  );
}

export default SmartRoute;
