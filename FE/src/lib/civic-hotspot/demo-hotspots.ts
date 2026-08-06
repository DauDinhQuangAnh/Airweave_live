import type { HotspotEvent } from './types';
import { toGridCellId } from './hotspot-confidence';

/**
 * Demo hotspots for prototype mode only. Always flagged isDemo:true and
 * privacyLevel:'user_submitted' / 'aggregated_data'. Never claimed as live.
 * Centered loosely around Hanoi by default; caller can pass a center to
 * relocate near the user.
 */
export function getDemoHotspots(
  center: { lat: number; lng: number } = { lat: 21.0285, lng: 105.8542 }
): HotspotEvent[] {
  const now = Date.now();
  const iso = (mAgo: number) => new Date(now - mAgo * 60_000).toISOString();
  const at = (dLat: number, dLng: number) => ({
    lat: +(center.lat + dLat).toFixed(5),
    lng: +(center.lng + dLng).toFixed(5),
  });

  const mk = (
    id: string,
    eventType: HotspotEvent['eventType'],
    sourceType: HotspotEvent['sourceType'],
    sourceLabel: string,
    confidence: HotspotEvent['confidence'],
    status: HotspotEvent['status'],
    loc: { lat: number; lng: number },
    descVi: string,
    confirmations: number,
    minutesAgo: number,
    privacy: HotspotEvent['privacyLevel'] = 'user_submitted'
  ): HotspotEvent => ({
    id,
    eventType,
    location: { ...loc, gridCellId: toGridCellId(loc.lat, loc.lng) },
    sourceType,
    sourceLabel,
    confidence,
    status,
    timestamp: iso(minutesAgo + 10),
    lastUpdated: iso(minutesAgo),
    description: descVi,
    confirmationsCount: confirmations,
    isDemo: true,
    privacyLevel: privacy,
  });

  return [
    mk(
      'demo_hs_1',
      'construction_dust',
      'community_report',
      'Community report · DEMO',
      'medium',
      'community_detected',
      at(0.004, 0.006),
      'Bụi công trình mạnh, công nhân không che chắn (demo).',
      4,
      12
    ),
    mk(
      'demo_hs_2',
      'burning_smoke',
      'gps_cluster',
      '3 community reports clustered · DEMO',
      'high',
      'community_detected',
      at(-0.008, 0.003),
      'Khói đốt rác gần khu dân cư (demo).',
      3,
      28
    ),
    mk(
      'demo_hs_3',
      'abnormal_air_quality',
      'station_data',
      'WAQI · demo station',
      'medium',
      'verified',
      at(0.012, -0.005),
      'AQI 178 — DEMO (không phải dữ liệu trạm thật).',
      1,
      5,
      'aggregated_data'
    ),
  ];
}
