import { useEffect, useRef, useState, useCallback } from 'react';
import { airApi } from '@/integrations/api';
import { PAMStation } from '@/lib/pam-stations';

// Bounding boxes for HCM and Hanoi metro areas — used to query real
// WAQI monitoring stations via the bounds endpoint. No fake stations.
const BOUNDS = [
  { city: 'TP.HCM', lat1: 10.55, lng1: 106.40, lat2: 11.05, lng2: 107.05 },
  { city: 'HN', lat1: 20.85, lng1: 105.55, lat2: 21.25, lng2: 106.05 },
];

interface WaqiBoundsStation {
  uid: number;
  lat: number;
  lng: number;
  aqi: number;
  station: string | null;
  time: string | null;
}

function shortDistrict(name: string | null): string {
  if (!name) return '—';
  // WAQI station names are often "City, District, Country" — pick a middle
  // segment that looks like a district / ward.
  const parts = name.split(',').map(s => s.trim()).filter(Boolean);
  if (parts.length === 0) return name;
  if (parts.length === 1) return parts[0];
  // Drop the country (last) and use the most specific segment.
  return parts[0].length <= 28 ? parts[0] : parts[0].slice(0, 26) + '…';
}

export function useWaqiStations() {
  const [stations, setStations] = useState<PAMStation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const prevAqiRef = useRef<Map<string, number>>(new Map());
  const requestInFlightRef = useRef(false);

  const load = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (requestInFlightRef.current) return;
    requestInFlightRef.current = true;
    if (!silent || stations.length === 0) setLoading(true);
    setError(null);
    try {
      const results = await Promise.all(
        BOUNDS.map(async (b) => {
          const data = await airApi.waqiBounds(b.lat1, b.lng1, b.lat2, b.lng2);
          const list = (data?.stations || []) as WaqiBoundsStation[];
          return list.map((s): PAMStation => {
            const id = `WAQI-${s.uid}`;
            const prev = prevAqiRef.current.get(id);
            const trend: PAMStation['trend'] =
              prev === undefined ? 'stable' :
              s.aqi - prev > 3 ? 'up' :
              s.aqi - prev < -3 ? 'down' : 'stable';
            return {
              id,
              name: s.station || `Trạm ${s.uid}`,
              district: shortDistrict(s.station),
              city: b.city,
              aqi: s.aqi,
              lat: s.lat,
              lng: s.lng,
              trend,
              time: s.time,
              source: 'waqi',
            };
          });
        })
      );
      const merged = results.flat()
        // De-duplicate (a station could fall on the edge of both boxes)
        .filter((s, i, arr) => arr.findIndex(o => o.id === s.id) === i)
        .sort((a, b) => b.aqi - a.aqi);

      const nextMap = new Map<string, number>();
      merged.forEach(s => nextMap.set(s.id, s.aqi));
      prevAqiRef.current = nextMap;

      setStations(merged);
    } catch (err: any) {
      console.error('WAQI bounds error:', err);
      setError(err?.message || 'WAQI fetch failed');
      if (stations.length === 0) setStations([]);
    } finally {
      requestInFlightRef.current = false;
      setLoading(false);
    }
  }, [stations.length]);

  useEffect(() => {
    void load();
    // Refresh every 5 minutes — WAQI updates hourly but this keeps the trend lively.
    const t = window.setInterval(() => { void load({ silent: true }); }, 5 * 60 * 1000);
    return () => window.clearInterval(t);
  }, [load]);

  return { stations, loading, error, refresh: load };
}
