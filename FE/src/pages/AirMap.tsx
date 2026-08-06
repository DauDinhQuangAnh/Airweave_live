import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { Wind, LocateFixed, MapPin, Shield, Bell } from 'lucide-react';
import FeatureExperienceLayout from '@/components/feature-experience/FeatureExperienceLayout';
import { useLiveAirContext } from '@/contexts/live-air-context';
import { useWindyKey } from '@/hooks/use-windy-key';
import { useWindyMap } from '@/hooks/use-windy-map';
import WindBoomerangLoader from '@/components/WindBoomerangLoader';
import MapOverlayControls, { MapLayerKey } from '@/components/map/MapOverlayControls';
import MapLocationBar from '@/components/map/MapLocationBar';
import CommunityReportFAB, { COMMUNITY_REPORT_KINDS } from '@/components/map/CommunityReportFAB';
import ShareMapButton from '@/components/map/ShareMapButton';
import MapSearchBar from '@/components/map/MapSearchBar';
import { getAqiCircleColor } from '@/components/map/map-data';
import MicroAirLayer from '@/components/map/MicroAirLayer';
import CivicHotspotLayer from '@/components/map/CivicHotspotLayer';
import { hotspotIntelligenceService } from '@/lib/civic-hotspot';
import { airApi, communityApi, nodesApi } from '@/integrations/api';

import { useCommunityRealtime } from '@/hooks/use-community-realtime';
import DataStatusChip from '@/components/feature-experience/DataStatusChip';
import NodeProximityBadge from '@/components/NodeProximityBadge';

import {
  buildWaqiCluster,
  getWaqiClusters,
  buildReportCluster,
  getReportClusters,
  renderWaqiMarkerHtml,
  getReportClusterPopupHtml,
} from '@/lib/map-cluster';

declare global {
  interface Window {
    windyInit: (options: any, callback: (api: any) => void) => void;
    L: any;
  }
}

interface CommunityReport {
  id: string;
  lat: number;
  lng: number;
  kind: string;
  text: string | null;
  created_at: string;
}

interface WaqiStation {
  uid: number;
  lat: number;
  lng: number;
  aqi: number;
  station: string | null;
  time?: string | { s?: string; iso?: string } | null;
}

const KIND_LABEL: Record<string, { vi: string; en: string; icon: string }> = Object.fromEntries(
  COMMUNITY_REPORT_KINDS.map(k => [k.value, { vi: k.vi, en: k.en, icon: k.icon }])
);

function timeAgo(iso: string, lang: 'vi' | 'en') {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const m = Math.floor(diff / 60000);
  if (m < 1) return lang === 'vi' ? 'vừa xong' : 'just now';
  if (m < 60) return lang === 'vi' ? `${m} phút trước` : `${m}m ago`;
  const h = Math.floor(m / 60);
  return lang === 'vi' ? `${h} giờ trước` : `${h}h ago`;
}

const AirMap = () => {
  const { lang } = useOutletContext<{ lang: 'vi' | 'en' }>();
  const { location, proximityNode, proximityDistance } = useLiveAirContext();

  const [searchParams, setSearchParams] = useSearchParams();
  const autoOpenReport = searchParams.get('report') === '1';
  useEffect(() => {
    if (autoOpenReport) {
      const t = setTimeout(() => {
        searchParams.delete('report');
        setSearchParams(searchParams, { replace: true });
      }, 500);
      return () => clearTimeout(t);
    }
  }, [autoOpenReport, searchParams, setSearchParams]);
  const { key: windyKey, loading: keyLoading, error: keyError } = useWindyKey();

  const [layers, setLayers] = useState({ community: true, micro: true, civic: true });
  const [searchPin, setSearchPin] = useState<{ lat: number; lng: number; label: string } | null>(null);
  const [reports, setReports] = useState<CommunityReport[]>([]);
  const [stations, setStations] = useState<WaqiStation[]>([]);
  const [iotNodes, setIotNodes] = useState<any[]>([]);
  const [mapZoom, setMapZoom] = useState(12);


  const mapContainerRef = useRef<HTMLDivElement>(null);
  const overlayMarkersRef = useRef<any[]>([]);
  const lastFetchRef = useRef<number>(0);

  const { mapReady, activeOverlay, setActiveOverlay, leafletMap, panTo } = useWindyMap(
    mapContainerRef,
    { windyKey, lat: location.lat, lng: location.lng, lang }
  );

  // ---- Realtime community reports & IoT Nodes ----
  useEffect(() => {
    let active = true;
    const load = async () => {
      const [rData, nData] = await Promise.all([
        communityApi.listActive(undefined, 200).catch(() => []),
        nodesApi.listNodes().catch(() => []),
      ]);
      if (active) {
        setReports(rData as CommunityReport[]);
        setIotNodes(nData as any[]);
      }
    };
    load();

    return () => {
      active = false;
    };
  }, []);


  useCommunityRealtime({
    onNew: (r) =>
      setReports((prev) => [r, ...prev.filter((x) => x.id !== r.id)].slice(0, 200) as CommunityReport[]),
    onDeleted: (id) => setReports((prev) => prev.filter((x) => x.id !== id)),
  });

  // ---- WAQI stations on viewport (debounced) ----
  const fetchStations = useCallback(async () => {
    if (!leafletMap) return;
    const now = Date.now();
    if (now - lastFetchRef.current < 8000) return;
    lastFetchRef.current = now;
    try {
      const b = leafletMap.getBounds();
      const data = await airApi.waqiBounds(b.getSouth(), b.getWest(), b.getNorth(), b.getEast());
      if (data?.stations) setStations(data.stations);
    } catch (e) {
      console.warn('WAQI stations fetch failed', e);
    }
  }, [leafletMap]);

  useEffect(() => {
    if (!mapReady || !leafletMap) return;
    fetchStations();
    setMapZoom(leafletMap.getZoom());

    const onMoveEnd = () => fetchStations();
    const onZoomEnd = () => setMapZoom(leafletMap.getZoom());

    leafletMap.on('moveend', onMoveEnd);
    leafletMap.on('zoomend', onZoomEnd);
    return () => {
      leafletMap.off('moveend', onMoveEnd);
      leafletMap.off('zoomend', onZoomEnd);
    };
  }, [mapReady, leafletMap, fetchStations]);

  // ---- Render overlays với clustering ----
  useEffect(() => {
    if (!mapReady || !leafletMap || !window.L) return;
    const L = window.L;
    const map = leafletMap;

    // Xoá markers cũ
    overlayMarkersRef.current.forEach((marker) => {
      try { map.removeLayer(marker); } catch { /* noop */ }
    });
    overlayMarkersRef.current = [];

    // --- Search pin ---
    if (searchPin) {
      const pinIcon = L.divIcon({
        className: 'search-pin-marker',
        html: `<div style="background:hsl(var(--primary));color:#fff;font-weight:700;font-size:11px;padding:3px 8px;border-radius:12px;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.4);font-family:sans-serif;white-space:nowrap;">📍 ${searchPin.label.split(',')[0]}</div>`,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });
      const m = L.marker([searchPin.lat, searchPin.lng], { icon: pinIcon }).addTo(map);
      overlayMarkersRef.current.push(m);
    }

    // --- WAQI Stations với clustering ---
    if (stations.length > 0) {
      const b = map.getBounds();
      const bounds = { west: b.getWest(), south: b.getSouth(), east: b.getEast(), north: b.getNorth() };
      const waqiSC = buildWaqiCluster(stations);
      const waqiPoints = getWaqiClusters(waqiSC, bounds, mapZoom, stations);

      waqiPoints.forEach((point) => {
        if (point.type === 'cluster') {
          const { html, size, anchor } = renderWaqiMarkerHtml(point);
          const icon = L.divIcon({ className: 'waqi-cluster-marker', html, iconSize: size, iconAnchor: anchor });
          const m = L.marker([point.lat, point.lng], { icon }).addTo(map);
          // Click cluster → zoom vào
          m.on('click', () => {
            const targetZoom = Math.min(point.expansion_zoom, map.getMaxZoom());
            map.flyTo([point.lat, point.lng], targetZoom, { duration: 0.5 });
          });
          overlayMarkersRef.current.push(m);
        } else if (point.type === 'waqi') {
          const { html, size, anchor } = renderWaqiMarkerHtml(point);
          const icon = L.divIcon({ className: 'waqi-station-marker', html, iconSize: size, iconAnchor: anchor });
          const marker = L.marker([point.lat, point.lng], { icon }).addTo(map);
          marker.bindPopup(
            `<div style="font-family:sans-serif"><b>${point.station.station ?? 'WAQI Station'}</b><br>AQI: <b>${point.station.aqi}</b><br><small>${lang === 'vi' ? 'Trạm WAQI · đo thật' : 'WAQI station · measured'}</small></div>`
          );
          overlayMarkersRef.current.push(marker);
        }
      });
    }

    // --- Community Reports với clustering ---
    if (layers.community && reports.length > 0) {
      const b = map.getBounds();
      const bounds = { west: b.getWest(), south: b.getSouth(), east: b.getEast(), north: b.getNorth() };
      const reportSC = buildReportCluster(reports);
      const reportPoints = getReportClusters(reportSC, bounds, mapZoom, reports);

      reportPoints.forEach((point) => {
        if (point.type === 'cluster') {
          const icon = L.divIcon({
            className: 'report-cluster-marker',
            html: `<div style="background:#FF6B6B;width:34px;height:34px;border-radius:50%;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-family:sans-serif;font-weight:800;font-size:12px;color:#fff;cursor:pointer">${point.count}</div>`,
            iconSize: [34, 34],
            iconAnchor: [17, 17],
          });
          const m = L.marker([point.lat, point.lng], { icon }).addTo(map);
          m.bindPopup(getReportClusterPopupHtml(point.count, lang));
          m.on('click', () => {
            const targetZoom = Math.min(point.expansion_zoom, map.getMaxZoom());
            map.flyTo([point.lat, point.lng], targetZoom, { duration: 0.5 });
          });
          overlayMarkersRef.current.push(m);
        } else if (point.type === 'report') {
          const meta = KIND_LABEL[point.report.kind] ?? KIND_LABEL.other;
          const label = point.report.text ?? (lang === 'vi' ? meta.vi : meta.en);
          const circle = L.circle([point.lat, point.lng], {
            radius: 400, color: '#FF6B6B', fillColor: '#FF6B6B', fillOpacity: 0.35, weight: 1, dashArray: '4 4',
          }).addTo(map);
          circle.bindPopup(
            `<div style="font-family:sans-serif"><b>${meta.icon} ${label}</b><br><small>${timeAgo(point.report.created_at, lang)}</small></div>`
          );
          overlayMarkersRef.current.push(circle);
        }
      });
    }

    // --- Physical IoT Nodes với hiệu ứng glowing ring ---
    if (iotNodes.length > 0) {
      iotNodes.forEach((node) => {
        const isSolar = node.power_source === 'solar' || node.edition === 'outdoor_solar';
        const color = getAqiCircleColor(node.aqi);
        const icon = L.divIcon({
          className: 'iot-physical-node-marker',
          html: `<div style="
            position:relative;
            background:linear-gradient(135deg, #06b6d4, #3b82f6);
            padding:3px 8px;
            border-radius:14px;
            border:2px solid #fff;
            box-shadow:0 0 12px rgba(6,182,212,0.8), 0 2px 6px rgba(0,0,0,0.5);
            font-family:sans-serif;
            display:flex;align-items:center;gap:4px;
            color:#fff;font-weight:800;font-size:11px;
            cursor:pointer;
          ">
            <span>⚡ ${node.aqi}</span>
            <span style="font-size:9px;opacity:0.9;font-weight:600">AQI</span>
          </div>`,
          iconSize: [60, 24],
          iconAnchor: [30, 12],
        });

        const m = L.marker([node.lat, node.lng], { icon }).addTo(map);
        m.bindPopup(`
          <div style="font-family:sans-serif;padding:2px">
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
              <span style="background:#06b6d4;color:#fff;font-weight:800;font-size:10px;padding:2px 6px;border-radius:4px">⚡ NODE AIRWEAVE</span>
              <b style="font-size:13px">${node.name}</b>
            </div>
            <div style="font-size:11px;color:#444">Khu vực: <b>${node.organization_name || node.location_name || 'Vi vùng tại chỗ'}</b></div>
            <hr style="margin:6px 0;border:none;border-top:1px solid #eee">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:11px">
              <div>Chỉ số AQI: <b style="color:#06b6d4">${node.aqi}</b></div>
              <div>Bụi PM2.5: <b>${node.pm25} µg/m³</b></div>
              <div>Nhiệt độ: <b>${node.temperature}°C</b></div>
              <div>Độ ẩm: <b>${node.humidity || 60}%</b></div>
            </div>
            <div style="font-size:10px;color:#888;margin-top:6px;font-style:italic">
              * Dữ liệu đo thực tế từ Node cảm biến tại chỗ
            </div>
          </div>
        `);
        overlayMarkersRef.current.push(m);
      });
    }
  }, [mapReady, leafletMap, layers.community, reports, stations, iotNodes, lang, searchPin, mapZoom]);



  // Center on user location whenever it changes. Zoom in tighter when GPS is
  // actually granted so the user lands at street level, not city level.
  useEffect(() => {
    if (mapReady && !location.loading) {
      const z = location.permissionState === 'granted' ? 15 : 12;
      panTo(location.lat, location.lng, z);
    }
  }, [location.lat, location.lng, location.loading, location.permissionState, mapReady, panTo]);

  const recenterToGPS = useCallback(() => {
    if (!leafletMap) return;
    const z = location.permissionState === 'granted' ? 16 : 13;
    leafletMap.setView([location.lat, location.lng], z, { animate: true });
  }, [leafletMap, location.lat, location.lng, location.permissionState]);

  const toggleLayer = (key: MapLayerKey) => {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Memoize civic events so the CivicHotspotLayer effect only re-runs when
  // the underlying reports/stations actually change (not on every render).
  const civicEvents = useMemo(
    () =>
      hotspotIntelligenceService.buildFromReports(
        reports as never,
        stations.map((s) => ({
          uid: s.uid,
          lat: s.lat,
          lng: s.lng,
          aqi: s.aqi,
          station: s.station ?? null,
        }))
      ),
    [reports, stations]
  );

  if (keyLoading) {
    return (
      <div className="h-full min-h-0 flex items-center justify-center bg-background">
        <WindBoomerangLoader text={lang === 'vi' ? 'Đang tải bản đồ...' : 'Loading map...'} />
      </div>
    );
  }

  if (keyError || !windyKey) {
    return (
      <div className="h-full min-h-0 flex items-center justify-center bg-background p-6">
        <div className="glass-card p-8 text-center max-w-md">
          <Wind className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-heading text-lg font-bold text-foreground mb-2">
            {lang === 'vi' ? 'Chưa cấu hình Windy API' : 'Windy API not configured'}
          </h3>
          <p className="text-sm text-muted-foreground font-body">
            {lang === 'vi'
              ? 'Vui lòng cấu hình WINDY_API_KEY để sử dụng bản đồ gió thời gian thực.'
              : 'Please configure WINDY_API_KEY for real-time wind map.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <FeatureExperienceLayout
      lang={lang}
      fullHeight
      heading={lang === 'vi' ? 'Bản đồ vi vùng thời gian thực' : 'Real-time micro-area map'}
      subheading={lang === 'vi'
        ? 'AQI chính xác đến từng khu phố, cảnh báo tại chỗ.'
        : 'AQI accurate to your block, with on-spot alerts.'}
      benefits={[
        { title: lang === 'vi' ? 'Hiểu rõ chất lượng không khí' : 'Understand air quality',
          text: lang === 'vi'
            ? 'Xem AQI theo từng vi vùng quanh bạn, chính xác đến khu phố.'
            : 'See AQI per micro-area around you, accurate to the block.',
          icon: <MapPin className="w-4 h-4" /> },
        { title: lang === 'vi' ? 'Cảnh báo tại chỗ' : 'On-spot alerts',
          text: lang === 'vi'
            ? 'Nhận cảnh báo khi AQI xấu, chủ động điều chỉnh kế hoạch.'
            : 'Get notified when AQI worsens and adjust your plans.',
          icon: <Bell className="w-4 h-4" /> },
      ]}
      chips={lang === 'vi'
        ? ['GPS', 'AQI thời gian thực', 'Bảo vệ sức khỏe']
        : ['GPS', 'Real-time AQI', 'Health protection']}
    >
    <div className="h-full min-h-0 flex flex-col overflow-hidden rounded-2xl border border-border bg-card/30 space-y-2 p-2">
      {/* Node Proximity Connection Badge */}
      <NodeProximityBadge matchedNode={proximityNode} distanceMeters={proximityDistance} />

      <MapLocationBar
        label={location.label}
        fallbackText={lang === 'vi' ? 'Đang xác định...' : 'Locating...'}
        accuracy={location.accuracy}
        isRefining={location.isRefining}
      />


      <MapOverlayControls
        lang={lang}
        activeOverlay={activeOverlay}
        onOverlayChange={setActiveOverlay}
        layers={layers}
        onToggleLayer={toggleLayer}
      />

      <div className="flex-1 min-h-0 relative overflow-hidden overscroll-none">
        <div id="windy" ref={mapContainerRef} className="windy-map-container absolute inset-0" />
        {mapReady && (
          <MicroAirLayer
            leafletMap={leafletMap}
            enabled={layers.micro}
            lang={lang}
            badgeClassName="absolute bottom-14 left-3 z-20 px-3 py-1.5 rounded-full bg-card/90 backdrop-blur-sm border border-border shadow-sm text-[11px] font-body text-foreground max-w-[calc(100%-7rem)] truncate"
          />
        )}

        {mapReady && (
          <CivicHotspotLayer
            leafletMap={leafletMap}
            enabled={layers.civic}
            lang={lang}
            events={civicEvents}
          />
        )}

        {/* Top bar: search (flex-1) + share button — never overlap */}
        <div className="absolute top-3 left-3 right-3 z-20 flex items-center gap-2 pointer-events-none">
          <div className="flex-1 min-w-0 max-w-[680px] pointer-events-auto">
            <MapSearchBar
              lang={lang}
              onSelect={(lat, lng, label) => {
                setSearchPin({ lat, lng, label });
                panTo(lat, lng, 14);
              }}
            />
          </div>
          <div className="pointer-events-auto shrink-0">
            <ShareMapButton lang={lang} targetRef={mapContainerRef} />
          </div>
        </div>

        {mapReady && (() => {
          const times = stations
            .map((s) => {
              const t = s.time;
              if (!t) return null;
              if (typeof t === 'string') return new Date(t).getTime();
              const iso = t.iso ?? t.s;
              return iso ? new Date(iso).getTime() : null;
            })
            .filter((v): v is number => typeof v === 'number' && !isNaN(v));
          const latest = times.length ? Math.max(...times) : null;
          const ageMin = latest ? Math.floor((Date.now() - latest) / 60000) : null;
          const status =
            stations.length === 0 ? 'unavailable' :
            ageMin === null ? 'estimated' :
            ageMin <= 60 ? 'live' : 'stale';
          return (
            <div className="absolute bottom-3 left-3 z-20 flex items-center gap-1.5">
              <DataStatusChip
                status={status}
                lang={lang}
                source={`WAQI · ${stations.length} ${lang === 'vi' ? 'trạm' : 'stations'}`}
                observedAt={latest ?? undefined}
                className="bg-card/90 backdrop-blur-sm shadow-sm"
              />
            </div>
          );
        })()}

        {!mapReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-20">
            <WindBoomerangLoader text={lang === 'vi' ? 'Đang khởi tạo Windy...' : 'Initializing Windy...'} />
          </div>
        )}

        {mapReady && (
          <button
            onClick={recenterToGPS}
            title={lang === 'vi' ? 'Về vị trí của tôi' : 'Recenter to my location'}
            className="absolute right-3 bottom-24 z-20 w-10 h-10 rounded-full bg-card/95 backdrop-blur-sm border border-border shadow-md flex items-center justify-center text-primary hover:bg-primary/10 transition-colors"
            aria-label={lang === 'vi' ? 'Về vị trí của tôi' : 'Recenter to my location'}
          >
            <LocateFixed className="w-5 h-5" />
          </button>
        )}

        <CommunityReportFAB
          lang={lang}
          userLat={location.lat}
          userLng={location.lng}
          gpsGranted={location.permissionState === 'granted'}
          defaultOpen={autoOpenReport}
          onSubmit={() => { /* realtime channel will inject the new report */ }}
        />
      </div>
    </div>
    </FeatureExperienceLayout>
  );
};

export default AirMap;
