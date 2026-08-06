/**
 * map-cluster.ts — Geo clustering cho WAQI stations và community reports.
 *
 * Dùng supercluster (thuật toán nhanh nhất cho point clustering):
 * - Gom các điểm gần nhau thành cluster khi zoom xa
 * - Cluster hiển thị số lượng + màu AQI trung bình
 * - Click cluster → leafletMap.fitBounds() để zoom vào
 * - Zoom đủ gần → hiện markers riêng lẻ như cũ
 *
 * Không cần thêm bất kỳ dependency nào ngoài supercluster.
 */
import Supercluster from 'supercluster';
import type { BBox } from 'geojson';
import { getAqiCircleColor } from '@/components/map/map-data';

// ---------- Types ----------

export interface WaqiStation {
  uid: number;
  lat: number;
  lng: number;
  aqi: number;
  station: string | null;
  time?: string | { s?: string; iso?: string } | null;
}

export interface CommunityReport {
  id: string;
  lat: number;
  lng: number;
  kind: string;
  text: string | null;
  created_at: string;
}

export type ClusterPoint =
  | { type: 'cluster'; id: number; lat: number; lng: number; count: number; avgAqi: number; expansion_zoom: number }
  | { type: 'waqi'; lat: number; lng: number; station: WaqiStation }
  | { type: 'report'; lat: number; lng: number; report: CommunityReport };

// ---------- WAQI Station Clustering ----------

let waqiCluster: Supercluster | null = null;

export function buildWaqiCluster(stations: WaqiStation[]): Supercluster {
  waqiCluster = new Supercluster({ radius: 60, maxZoom: 16, minPoints: 2 });
  waqiCluster.load(
    stations.map((s) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [s.lng, s.lat] },
      properties: { uid: s.uid, aqi: s.aqi, station: s.station },
    })),
  );
  return waqiCluster;
}

export function getWaqiClusters(
  cluster: Supercluster,
  bounds: { west: number; south: number; east: number; north: number },
  zoom: number,
  stations: WaqiStation[],
): ClusterPoint[] {
  const bbox: BBox = [bounds.west, bounds.south, bounds.east, bounds.north];
  const features = cluster.getClusters(bbox, Math.floor(zoom));

  return features.map((f) => {
    const props = f.properties as any;
    const [lng, lat] = f.geometry.coordinates;

    if (props.cluster) {
      // Tính AQI trung bình của cluster
      const leaves = cluster.getLeaves(props.cluster_id, Infinity) as any[];
      const avgAqi = leaves.length
        ? Math.round(leaves.reduce((sum, l) => sum + (l.properties?.aqi ?? 0), 0) / leaves.length)
        : 0;
      return {
        type: 'cluster' as const,
        id: props.cluster_id,
        lat,
        lng,
        count: props.point_count,
        avgAqi,
        expansion_zoom: cluster.getClusterExpansionZoom(props.cluster_id),
      };
    }

    const station = stations.find((s) => s.uid === props.uid);
    return { type: 'waqi' as const, lat, lng, station: station ?? { uid: props.uid, lat, lng, aqi: props.aqi, station: props.station } };
  });
}

// ---------- Community Report Clustering ----------

let reportCluster: Supercluster | null = null;

export function buildReportCluster(reports: CommunityReport[]): Supercluster {
  reportCluster = new Supercluster({ radius: 50, maxZoom: 15, minPoints: 3 });
  reportCluster.load(
    reports.map((r, idx) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [r.lng, r.lat] },
      properties: { idx, id: r.id, kind: r.kind },
    })),
  );
  return reportCluster;
}

export function getReportClusters(
  cluster: Supercluster,
  bounds: { west: number; south: number; east: number; north: number },
  zoom: number,
  reports: CommunityReport[],
): ClusterPoint[] {
  const bbox: BBox = [bounds.west, bounds.south, bounds.east, bounds.north];
  const features = cluster.getClusters(bbox, Math.floor(zoom));

  return features.map((f) => {
    const props = f.properties as any;
    const [lng, lat] = f.geometry.coordinates;

    if (props.cluster) {
      return {
        type: 'cluster' as const,
        id: props.cluster_id,
        lat,
        lng,
        count: props.point_count,
        avgAqi: 0, // reports không có AQI
        expansion_zoom: cluster.getClusterExpansionZoom(props.cluster_id),
      };
    }

    const report = reports[props.idx] ?? reports.find((r) => r.id === props.id);
    return { type: 'report' as const, lat, lng, report };
  });
}

// ---------- Leaflet Marker Renderers ----------

/** Render WAQI cluster/station marker HTML cho Leaflet divIcon. */
export function renderWaqiMarkerHtml(point: ClusterPoint): { html: string; size: [number, number]; anchor: [number, number] } {
  if (point.type === 'cluster') {
    const color = getAqiCircleColor(point.avgAqi);
    const size = point.count < 10 ? 36 : point.count < 50 ? 44 : 52;
    return {
      html: `<div style="
        background:${color};
        width:${size}px;height:${size}px;
        border-radius:50%;
        border:2.5px solid #fff;
        box-shadow:0 2px 8px rgba(0,0,0,0.35);
        display:flex;align-items:center;justify-content:center;
        font-family:sans-serif;font-weight:800;font-size:${size < 44 ? 12 : 14}px;
        color:#000;cursor:pointer;
        transition:transform 0.15s ease;
      " title="${point.count} trạm quan trắc · AQI trung bình ${point.avgAqi}">${point.count}</div>`,
      size: [size, size],
      anchor: [size / 2, size / 2],
    };
  }

  if (point.type === 'waqi') {
    const color = getAqiCircleColor(point.station.aqi);
    return {
      html: `<div style="background:${color};color:#000;font-weight:700;font-size:11px;padding:2px 6px;border-radius:10px;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,0.4);font-family:sans-serif;white-space:nowrap;">${point.station.aqi}</div>`,
      size: [34, 20],
      anchor: [17, 10],
    };
  }

  return { html: '', size: [0, 0], anchor: [0, 0] };
}

/** Render Community Report cluster/circle popup content. */
export function getReportClusterPopupHtml(count: number, lang: 'vi' | 'en'): string {
  return `<div style="font-family:sans-serif;text-align:center;padding:4px 2px">
    <b>🔴 ${count}</b><br>
    <small style="color:#666">${lang === 'vi' ? `${count} báo cáo ô nhiễm trong khu vực này` : `${count} pollution reports in this area`}</small>
  </div>`;
}
