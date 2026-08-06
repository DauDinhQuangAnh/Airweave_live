import { useEffect, useRef } from 'react';
import type { HotspotEvent } from '@/lib/civic-hotspot';

interface Props {
  leafletMap: any;
  enabled: boolean;
  events: HotspotEvent[];
  lang: 'vi' | 'en';
}

const CONF_COLOR: Record<string, string> = {
  low: '#FBBF24',
  medium: '#FB923C',
  high: '#EF4444',
};

const EVENT_ICON: Record<string, string> = {
  construction_dust: '🏗️',
  burning_smoke: '🔥',
  traffic_emission: '🚗',
  chemical_smell: '🧪',
  road_dust: '🌫️',
  abnormal_air_quality: '⚠️',
  unknown: '📍',
};

const PANE_NAME = 'civic-hotspots-pane';

const CivicHotspotLayer = ({ leafletMap, enabled, events, lang }: Props) => {
  const layersRef = useRef<any[]>([]);

  // Ensure a dedicated pane that sits ABOVE tiles but BELOW the default markerPane,
  // and whose container does NOT swallow map gestures (only icons themselves do).
  useEffect(() => {
    if (!leafletMap || !(window as any).L) return;
    if (!leafletMap.getPane(PANE_NAME)) {
      const pane = leafletMap.createPane(PANE_NAME);
      pane.style.zIndex = '610';                    // above overlayPane(400), below popups(700)
      pane.style.pointerEvents = 'none';            // pane itself is transparent to gestures
    }
  }, [leafletMap]);

  useEffect(() => {
    if (!leafletMap || !(window as any).L) return;
    const L = (window as any).L;

    // Clear previous
    layersRef.current.forEach((l) => {
      try { leafletMap.removeLayer(l); } catch { /* noop */ }
    });
    layersRef.current = [];

    if (!enabled || events.length === 0) return;

    events.forEach((ev) => {
      const color = CONF_COLOR[ev.confidence] ?? '#FBBF24';
      const icon = L.divIcon({
        className: 'civic-hotspot-marker',
        // Inner element re-enables pointer-events only on the chip itself,
        // so panning/zooming the surrounding map area still works.
        html: `<div style="pointer-events:auto;background:${color};color:#0a0a0a;font-weight:700;font-size:12px;padding:3px 6px;border-radius:999px;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.4);font-family:sans-serif;cursor:pointer">${EVENT_ICON[ev.eventType] ?? '📍'}</div>`,
        iconSize: [28, 24],
        iconAnchor: [14, 12],
      });
      const m = L.marker([ev.location.lat, ev.location.lng], {
        icon,
        pane: PANE_NAME,
        bubblingMouseEvents: true,   // let drag/scroll bubble to the map
        keyboard: false,
        riseOnHover: false,
        interactive: true,           // popup still works on click
      }).addTo(leafletMap);

      const updated = new Date(ev.lastUpdated).toLocaleString(
        lang === 'vi' ? 'vi-VN' : 'en-US'
      );
      const confLabel = lang === 'vi'
        ? { low: 'Thấp', medium: 'Trung bình', high: 'Cao' }[ev.confidence]
        : ev.confidence;
      const statusLabel = ev.status.replace(/_/g, ' ');

      m.bindPopup(`
        <div style="font-family:sans-serif;min-width:220px">
          <div style="font-weight:700">${EVENT_ICON[ev.eventType] ?? '📍'} ${ev.eventType.replace(/_/g, ' ')}</div>
          <div style="font-size:11px;color:#555;margin-top:2px">${ev.sourceLabel}</div>
          <div style="font-size:11px;margin-top:4px;line-height:1.5">
            <b>${lang === 'vi' ? 'Độ tin cậy' : 'Confidence'}:</b> <span style="color:${color};font-weight:700">${confLabel}</span><br/>
            <b>${lang === 'vi' ? 'Nguồn' : 'Source'}:</b> ${ev.sourceType.replace(/_/g, ' ')}<br/>
            <b>${lang === 'vi' ? 'Trạng thái' : 'Status'}:</b> ${statusLabel}<br/>
            <b>${lang === 'vi' ? 'Xác nhận' : 'Confirmations'}:</b> ${ev.confirmationsCount}<br/>
            <b>${lang === 'vi' ? 'Cập nhật' : 'Last updated'}:</b> ${updated}<br/>
            <b>${lang === 'vi' ? 'Quyền riêng tư' : 'Privacy'}:</b> ${ev.privacyLevel.replace(/_/g, ' ')}
          </div>
          ${ev.isDemo ? `<div style="margin-top:6px;display:inline-block;background:#fbbf24;color:#000;font-size:10px;padding:1px 6px;border-radius:8px;font-weight:700">DEMO</div>` : ''}
        </div>
      `);
      layersRef.current.push(m);
    });

    return () => {
      layersRef.current.forEach((l) => {
        try { leafletMap.removeLayer(l); } catch { /* noop */ }
      });
      layersRef.current = [];
    };
  }, [leafletMap, enabled, events, lang]);

  return null;
};

export default CivicHotspotLayer;
