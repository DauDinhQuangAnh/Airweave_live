import type { HotspotConfidence, HotspotEvent } from './types';

// Approx grid cell ~500m at VN latitudes (0.005 deg).
const GRID_DEG = 0.005;

export function toGridCellId(lat: number, lng: number): string {
  const gx = Math.floor(lat / GRID_DEG);
  const gy = Math.floor(lng / GRID_DEG);
  return `g_${gx}_${gy}`;
}

interface Signal {
  source: HotspotEvent['sourceType'];
  ageMinutes: number;
  aqi?: number;
}

/**
 * Combine independent signals in the same grid cell into a single confidence.
 * Rules:
 *  - 1 community report only         → low
 *  - 2+ community reports recent     → medium
 *  - community report + AQI anomaly  → medium/high
 *  - station anomaly + partner       → high
 *  - government / camera placeholders are NEVER allowed to lift to high alone.
 */
export function scoreConfidence(signals: Signal[]): HotspotConfidence {
  const recent = signals.filter((s) => s.ageMinutes <= 120);
  const community = recent.filter((s) => s.source === 'community_report').length;
  const stationAnomaly = recent.some(
    (s) => s.source === 'station_data' && (s.aqi ?? 0) >= 150
  );
  const partner = recent.some((s) => s.source === 'partner_sensor');

  if (stationAnomaly && partner) return 'high';
  if (community >= 1 && stationAnomaly) return community >= 2 ? 'high' : 'medium';
  if (community >= 2) return 'medium';
  return 'low';
}
