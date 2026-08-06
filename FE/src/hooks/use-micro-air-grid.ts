import { useCallback, useEffect, useRef, useState } from 'react';
import { pm25ToAQI } from '@/lib/air-quality';

export interface MicroAirPoint {
  lat: number;
  lng: number;
  aqi: number;
  pm25: number;
  pm10: number;
  temperature: number;
  humidity: number;
  windSpeed: number;
  source: 'open-meteo';
  updatedAt: string;
}

type BoundsLike = {
  getSouth: () => number;
  getNorth: () => number;
  getWest: () => number;
  getEast: () => number;
};

const CACHE_TTL_MS = 10 * 60 * 1000;
const MIN_MICRO_ZOOM = 14;
const FETCH_TIMEOUT_MS = 8000;
const pointCache = new Map<string, { point: MicroAirPoint; timestamp: number }>();

function roundCoord(value: number): number {
  return Math.round(value * 10000) / 10000;
}

export function microAirCacheKey(lat: number, lng: number): string {
  return `${roundCoord(lat)},${roundCoord(lng)}`;
}

function getGridSize(zoom: number): number {
  if (zoom >= 16) return 5;
  if (zoom >= 15) return 4;
  return 3;
}

export function buildMicroGrid(bounds: BoundsLike, zoom: number): Array<{ lat: number; lng: number }> {
  if (zoom < MIN_MICRO_ZOOM) return [];
  const size = getGridSize(zoom);
  const south = bounds.getSouth();
  const north = bounds.getNorth();
  const west = bounds.getWest();
  const east = bounds.getEast();
  const latStep = (north - south) / (size + 1);
  const lngStep = (east - west) / (size + 1);
  const points: Array<{ lat: number; lng: number }> = [];

  for (let row = 1; row <= size; row++) {
    for (let col = 1; col <= size; col++) {
      points.push({
        lat: roundCoord(south + latStep * row),
        lng: roundCoord(west + lngStep * col),
      });
    }
  }

  return points;
}

async function fetchJsonWithTimeout(url: string, timeoutMs = FETCH_TIMEOUT_MS): Promise<any> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function asArray(data: any): any[] {
  return Array.isArray(data) ? data : [data];
}

function fromCache(lat: number, lng: number): MicroAirPoint | null {
  const cached = pointCache.get(microAirCacheKey(lat, lng));
  if (!cached) return null;
  if (Date.now() - cached.timestamp > CACHE_TTL_MS) {
    pointCache.delete(microAirCacheKey(lat, lng));
    return null;
  }
  return cached.point;
}

function saveCache(point: MicroAirPoint) {
  pointCache.set(microAirCacheKey(point.lat, point.lng), {
    point,
    timestamp: Date.now(),
  });
}

export async function fetchMicroAirPoints(
  coords: Array<{ lat: number; lng: number }>
): Promise<MicroAirPoint[]> {
  const unique = coords
    .map((p) => ({ lat: roundCoord(p.lat), lng: roundCoord(p.lng) }))
    .filter((p, index, arr) => arr.findIndex((other) => other.lat === p.lat && other.lng === p.lng) === index);

  const cachedPoints: MicroAirPoint[] = [];
  const missing: Array<{ lat: number; lng: number }> = [];

  unique.forEach((coord) => {
    const cached = fromCache(coord.lat, coord.lng);
    if (cached) cachedPoints.push(cached);
    else missing.push(coord);
  });

  if (missing.length === 0) return cachedPoints;

  const latitudes = missing.map((p) => p.lat).join(',');
  const longitudes = missing.map((p) => p.lng).join(',');
  const weatherUrl =
    `https://api.open-meteo.com/v1/forecast?latitude=${latitudes}&longitude=${longitudes}` +
    '&current=temperature_2m,relative_humidity_2m,wind_speed_10m&timezone=auto';
  const airUrl =
    `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latitudes}&longitude=${longitudes}` +
    '&current=pm2_5,pm10&timezone=auto&forecast_days=1';

  const [weatherRaw, airRaw] = await Promise.all([
    fetchJsonWithTimeout(weatherUrl),
    fetchJsonWithTimeout(airUrl),
  ]);

  const weatherList = asArray(weatherRaw);
  const airList = asArray(airRaw);
  const fetched = missing.map((coord, index): MicroAirPoint => {
    const weather = weatherList[index]?.current ?? {};
    const air = airList[index]?.current ?? {};
    const pm25 = Math.round((air.pm2_5 ?? 0) * 10) / 10;
    const pm10 = Math.round((air.pm10 ?? 0) * 10) / 10;
    const point = {
      lat: coord.lat,
      lng: coord.lng,
      aqi: pm25ToAQI(pm25),
      pm25,
      pm10,
      temperature: Math.round(weather.temperature_2m ?? 0),
      humidity: Math.round(weather.relative_humidity_2m ?? 0),
      windSpeed: Math.round(weather.wind_speed_10m ?? 0),
      source: 'open-meteo' as const,
      updatedAt: air.time || weather.time || new Date().toISOString(),
    };
    saveCache(point);
    return point;
  });

  return [...cachedPoints, ...fetched];
}

export function useMicroAirGrid(leafletMap: any, enabled: boolean) {
  const [points, setPoints] = useState<MicroAirPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(0);
  const requestIdRef = useRef(0);
  const timerRef = useRef<number | null>(null);

  const load = useCallback(async () => {
    if (!leafletMap || !enabled) return;
    const currentZoom = leafletMap.getZoom?.() ?? 0;
    setZoom(currentZoom);

    if (currentZoom < MIN_MICRO_ZOOM) {
      setPoints([]);
      setLoading(false);
      setError(null);
      return;
    }

    const bounds = leafletMap.getBounds?.();
    if (!bounds) return;
    const grid = buildMicroGrid(bounds, currentZoom);
    if (grid.length === 0) return;

    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);

    try {
      const next = await fetchMicroAirPoints(grid);
      if (requestId !== requestIdRef.current) return;
      setPoints(next);
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      setError(err instanceof Error ? err.message : 'micro_air_fetch_failed');
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [enabled, leafletMap]);

  const scheduleLoad = useCallback(() => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      void load();
    }, 900);
  }, [load]);

  useEffect(() => {
    if (!leafletMap || !enabled) {
      setPoints([]);
      return;
    }

    void load();
    leafletMap.on?.('moveend', scheduleLoad);
    leafletMap.on?.('zoomend', scheduleLoad);

    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      leafletMap.off?.('moveend', scheduleLoad);
      leafletMap.off?.('zoomend', scheduleLoad);
    };
  }, [enabled, leafletMap, load, scheduleLoad]);

  return {
    points,
    loading,
    error,
    zoom,
    minZoom: MIN_MICRO_ZOOM,
    refresh: load,
  };
}
