import { communityApi } from '@/integrations/api';
import { scoreConfidence, toGridCellId } from './hotspot-confidence';
import type {
  HotspotEvent,
  HotspotEventType,
  HotspotSourceType,
} from './types';

const KIND_TO_EVENT: Record<string, HotspotEventType> = {
  smoke: 'burning_smoke',
  construction: 'construction_dust',
  traffic: 'traffic_emission',
  chemical: 'chemical_smell',
  dust: 'road_dust',
  other: 'unknown',
};

interface StationLike {
  uid: number | string;
  lat: number;
  lng: number;
  aqi: number;
  station?: string | null;
  time?: unknown;
}

function ageMinutes(iso: string): number {
  return Math.max(0, (Date.now() - new Date(iso).getTime()) / 60000);
}

/**
 * Combine community reports + AQI station anomalies into hotspot events.
 * GPS clustering: reports sharing the same grid cell merge into one hotspot
 * with elevated confidence.
 */
export const hotspotIntelligenceService = {
  async loadCommunityReports(limit = 200) {
    return communityApi.listActive(undefined, limit);
  },

  buildFromReports(reports: Array<{
    id: string; lat: number; lng: number; kind: string; text: string | null; created_at: string;
  }>, stations: StationLike[] = []): HotspotEvent[] {
    // Group reports by grid cell
    const byCell = new Map<string, typeof reports>();
    for (const r of reports) {
      const cell = toGridCellId(r.lat, r.lng);
      const arr = byCell.get(cell) ?? [];
      arr.push(r);
      byCell.set(cell, arr);
    }

    const events: HotspotEvent[] = [];
    for (const [cell, group] of byCell) {
      const sorted = [...group].sort(
        (a, b) => +new Date(b.created_at) - +new Date(a.created_at)
      );
      const newest = sorted[0];
      const oldest = sorted[sorted.length - 1];
      const nearbyStation = stations.find(
        (s) => toGridCellId(s.lat, s.lng) === cell && s.aqi >= 150
      );
      const signals = sorted.map((r) => ({
        source: 'community_report' as HotspotSourceType,
        ageMinutes: ageMinutes(r.created_at),
      }));
      if (nearbyStation) {
        signals.push({ source: 'station_data', ageMinutes: 5, aqi: nearbyStation.aqi } as never);
      }
      const confidence = scoreConfidence(signals as never);
      const sourceType: HotspotSourceType = nearbyStation
        ? 'station_data'
        : group.length > 1
        ? 'gps_cluster'
        : 'community_report';
      const sourceLabel = nearbyStation
        ? `WAQI · ${nearbyStation.station ?? 'station'} + ${group.length} report${group.length > 1 ? 's' : ''}`
        : group.length > 1
        ? `${group.length} community reports clustered`
        : 'Community report';
      events.push({
        id: `hotspot_${cell}`,
        eventType: KIND_TO_EVENT[newest.kind] ?? 'unknown',
        location: { lat: newest.lat, lng: newest.lng, gridCellId: cell },
        sourceType,
        sourceLabel,
        confidence,
        status:
          nearbyStation && group.length >= 2
            ? 'verified'
            : group.length >= 2
            ? 'community_detected'
            : 'pending',
        timestamp: oldest.created_at,
        lastUpdated: newest.created_at,
        description: newest.text ?? undefined,
        confirmationsCount: group.length,
        isDemo: false,
        privacyLevel: 'user_submitted',
      });
    }

    // Standalone station anomalies (not already covered by community cluster)
    for (const s of stations) {
      if (s.aqi < 200) continue;
      const cell = toGridCellId(s.lat, s.lng);
      if (events.some((e) => e.location.gridCellId === cell)) continue;
      events.push({
        id: `hotspot_station_${s.uid}`,
        eventType: 'abnormal_air_quality',
        location: { lat: s.lat, lng: s.lng, gridCellId: cell },
        sourceType: 'station_data',
        sourceLabel: s.station ? `WAQI · ${s.station}` : 'WAQI station',
        confidence: s.aqi >= 300 ? 'high' : 'medium',
        status: 'community_detected',
        timestamp: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        description: `AQI ${s.aqi}`,
        confirmationsCount: 1,
        isDemo: false,
        privacyLevel: 'aggregated_data',
      });
    }

    return events.sort((a, b) => +new Date(b.lastUpdated) - +new Date(a.lastUpdated));
  },
};

export const communityReportService = {
  load: hotspotIntelligenceService.loadCommunityReports,
};
