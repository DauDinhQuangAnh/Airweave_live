/**
 * Route scoring helpers — confidence-weighted PM2.5 adjustment for Smart Route.
 *
 * Confidence hierarchy (per PRD):
 *   1. Community reports (≥3 within 30 min in 300 m radius) → danger zone, large flat penalty.
 *   2. Mapbox congestion annotations → traffic penalty per coord pair.
 *   3. OSM proxy data:
 *        leisure=park / natural=water within 200 m → −30% PM2.5
 *        highway=primary/trunk/motorway within 100 m → +50% PM2.5
 *
 * All Overpass + community lookups are cached in-memory (and Overpass to localStorage)
 * to keep the route scorer fast and frugal on external calls.
 */

export type CongestionLevel = 'unknown' | 'low' | 'moderate' | 'heavy' | 'severe';

export interface CommunityReportRow {
  id: string;
  lat: number;
  lng: number;
  kind: string;
  text: string | null;
  created_at: string;
  expires_at: string;
}

export interface DangerCluster {
  lat: number;
  lng: number;
  count: number;
  reason: string;
}

/* ---------- haversine ---------- */
const R = 6371000;
export function distMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/* ---------- community danger zones ---------- */
/**
 * Cluster nearby reports (within `radiusM`) and keep clusters with `>= minCount`.
 * Returns one centroid + reason per cluster.
 */
export function clusterReports(
  reports: CommunityReportRow[],
  radiusM = 300,
  minCount = 3
): DangerCluster[] {
  const used = new Set<string>();
  const clusters: DangerCluster[] = [];
  for (const r of reports) {
    if (used.has(r.id)) continue;
    const group = [r];
    used.add(r.id);
    for (const o of reports) {
      if (used.has(o.id)) continue;
      if (distMeters(r, o) <= radiusM) {
        group.push(o);
        used.add(o.id);
      }
    }
    if (group.length >= minCount) {
      const lat = group.reduce((s, x) => s + x.lat, 0) / group.length;
      const lng = group.reduce((s, x) => s + x.lng, 0) / group.length;
      const kinds = Array.from(new Set(group.map((g) => g.kind)));
      clusters.push({ lat, lng, count: group.length, reason: kinds.join(', ') });
    }
  }
  return clusters;
}

/* ---------- OSM Overpass proxy ---------- */
const OSM_TTL_MS = 24 * 60 * 60 * 1000; // 24h — POIs change slowly
const OSM_KEY = 'airweave.osm.cache.v1';

export interface OsmTagSummary {
  hasParkOrWater: boolean;
  hasMajorRoad: boolean;
}

type OsmCacheEntry = { v: OsmTagSummary; t: number };
const osmCache: Map<string, OsmCacheEntry> = (() => {
  const m = new Map<string, OsmCacheEntry>();
  if (typeof window === 'undefined') return m;
  try {
    const raw = localStorage.getItem(OSM_KEY);
    if (raw) {
      const obj = JSON.parse(raw) as Record<string, OsmCacheEntry>;
      const now = Date.now();
      Object.entries(obj).forEach(([k, e]) => {
        if (e && now - e.t < OSM_TTL_MS) m.set(k, e);
      });
    }
  } catch {
    /* ignore */
  }
  return m;
})();

let osmPersistTimer: ReturnType<typeof setTimeout> | undefined;
function persistOsmCache() {
  if (typeof window === 'undefined') return;
  clearTimeout(osmPersistTimer);
  osmPersistTimer = setTimeout(() => {
    try {
      const obj: Record<string, OsmCacheEntry> = {};
      osmCache.forEach((v, k) => (obj[k] = v));
      localStorage.setItem(OSM_KEY, JSON.stringify(obj));
    } catch {
      /* ignore quota */
    }
  }, 500);
}

function osmKey(lat: number, lng: number) {
  return `${lat.toFixed(3)},${lng.toFixed(3)}`;
}

export async function fetchOsmTags(lat: number, lng: number): Promise<OsmTagSummary> {
  const k = osmKey(lat, lng);
  const hit = osmCache.get(k);
  if (hit && Date.now() - hit.t < OSM_TTL_MS) return hit.v;

  const query = `[out:json][timeout:8];
(
  way(around:200,${lat},${lng})[leisure=park];
  way(around:200,${lat},${lng})[natural=water];
  way(around:100,${lat},${lng})[highway~"^(primary|trunk|motorway)$"];
);
out tags 30;`;

  try {
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: 'data=' + encodeURIComponent(query),
    });
    if (!res.ok) throw new Error('overpass ' + res.status);
    const data = await res.json();
    const elements = (data.elements as any[]) || [];
    const summary: OsmTagSummary = {
      hasParkOrWater: elements.some(
        (e) => e.tags?.leisure === 'park' || e.tags?.natural === 'water'
      ),
      hasMajorRoad: elements.some((e) =>
        ['primary', 'trunk', 'motorway'].includes(e.tags?.highway)
      ),
    };
    osmCache.set(k, { v: summary, t: Date.now() });
    persistOsmCache();
    return summary;
  } catch {
    return hit?.v ?? { hasParkOrWater: false, hasMajorRoad: false };
  }
}

/* ---------- weight derivation ---------- */
export interface Prefs {
  route_priority?: string;
  medical_history?: string[];
  sensitive_group?: string;
  health_tier?: string[];
}

export interface VehicleProfile {
  /** PM2.5 dampening factor — car cabin filter halves perceived exposure, walk amplifies */
  exposureFactor: number;
  /** β boost (extra weight on health) */
  betaBoost: number;
  label: string;
}

export const VEHICLES: Record<string, VehicleProfile> = {
  car: { exposureFactor: 0.4, betaBoost: -0.2, label: 'Ô tô' },
  motorbike: { exposureFactor: 1.0, betaBoost: 0.05, label: 'Xe máy' },
  bike: { exposureFactor: 1.15, betaBoost: 0.1, label: 'Xe đạp' },
  walk: { exposureFactor: 1.2, betaBoost: 0.15, label: 'Đi bộ' },
};

/**
 * Derive base β from health profile + vehicle. α = 1 − β.
 * If `sliderOverride` is provided (0..100), it dominates other inputs:
 *   0 → β=0.05 (full speed), 100 → β=0.95 (full health).
 */
export function deriveWeights(
  prefs: Prefs | null,
  vehicle: VehicleProfile,
  sliderOverride: number | null
): { alpha: number; beta: number } {
  if (sliderOverride !== null) {
    const beta = Math.max(0.05, Math.min(0.95, sliderOverride / 100));
    return { alpha: 1 - beta, beta };
  }

  let beta = 0.5;
  if (prefs) {
    if (prefs.route_priority === 'speed') beta = 0.2;
    else if (prefs.route_priority === 'health') beta = 0.85;
    else beta = 0.5;

    const cond = prefs.medical_history || [];
    const hasSerious = cond.some((c) => ['asthma', 'copd', 'cardio'].includes(c));
    if (hasSerious) beta = Math.min(0.95, beta + 0.25);

    if (prefs.sensitive_group === 'child' || prefs.sensitive_group === 'respiratory')
      beta = Math.min(0.95, beta + 0.15);
    else if (prefs.sensitive_group === 'elderly') beta = Math.min(0.9, beta + 0.1);
  }
  beta = Math.max(0.05, Math.min(0.95, beta + vehicle.betaBoost));
  return { alpha: 1 - beta, beta };
}

/* ---------- effective PM2.5 per segment ---------- */
export interface SegmentInputs {
  rawPm25: number;
  congestion: CongestionLevel;
  osm: OsmTagSummary;
  vehicle: VehicleProfile;
  inDangerZone: boolean;
}

const CONGESTION_MULT: Record<CongestionLevel, number> = {
  unknown: 1.0,
  low: 1.0,
  moderate: 1.15,
  heavy: 1.3,
  severe: 1.5,
};

export function effectivePm25(s: SegmentInputs): number {
  let v = s.rawPm25;
  if (s.osm.hasParkOrWater) v *= 0.7; // −30%
  if (s.osm.hasMajorRoad) v *= 1.5; // +50%
  v *= CONGESTION_MULT[s.congestion];
  if (s.inDangerZone) v += 200; // flat penalty for community-reported danger
  v *= s.vehicle.exposureFactor; // cabin filter etc.
  return Math.round(v * 10) / 10;
}

/* ---------- congestion mapping ---------- */
/**
 * Map a Mapbox `congestion` annotation array (per coord pair) to a single
 * dominant level for an arbitrary slice of indices.
 */
export function dominantCongestion(arr: (string | null | undefined)[]): CongestionLevel {
  const order: CongestionLevel[] = ['unknown', 'low', 'moderate', 'heavy', 'severe'];
  let best = 0;
  for (const v of arr) {
    const idx = order.indexOf((v as CongestionLevel) || 'unknown');
    if (idx > best) best = idx;
  }
  return order[best];
}
