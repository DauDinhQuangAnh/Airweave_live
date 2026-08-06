import { useEffect, useRef } from 'react';
import { formatAirQualitySource, formatMicroUpdatedAt, getAQIColor, getAQIStatus } from '@/lib/air-quality';
import { fetchMicroAirPoints, MicroAirPoint, useMicroAirGrid } from '@/hooks/use-micro-air-grid';

interface MicroAirLayerProps {
  leafletMap: any;
  enabled: boolean;
  lang: 'vi' | 'en';
  badgeClassName?: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function popupHtml(point: MicroAirPoint, lang: 'vi' | 'en'): string {
  const color = getAQIColor(point.aqi);
  const status = getAQIStatus(point.aqi, lang);
  const source = formatAirQualitySource(point.source, lang);
  const updated = formatMicroUpdatedAt(point.updatedAt, lang);
  const coordinate = `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`;

  return `
    <div style="font-family:Montserrat,Arial,sans-serif;min-width:220px;padding:8px;color:#0f172a">
      <div style="font-size:11px;color:#64748b;margin-bottom:4px">${escapeHtml(source)}</div>
      <div style="font-size:11px;color:#64748b;margin-bottom:6px">${coordinate}</div>
      <div style="display:flex;align-items:baseline;gap:8px;margin-bottom:4px">
        <span style="font-size:34px;font-weight:800;color:${color};line-height:1">${point.aqi}</span>
        <span style="font-size:12px;font-weight:700;color:${color}">AQI · ${escapeHtml(status)}</span>
      </div>
      <div style="font-size:12px;line-height:1.7;color:#334155">
        PM2.5: <b>${point.pm25.toFixed(1)}</b> µg/m³<br/>
        PM10: <b>${point.pm10.toFixed(1)}</b> µg/m³<br/>
        Nhiệt độ: <b>${point.temperature}</b>°C<br/>
        Độ ẩm: <b>${point.humidity}</b>%<br/>
        Gió: <b>${point.windSpeed}</b> km/h
      </div>
      <div style="font-size:10px;color:#64748b;margin-top:6px">Cập nhật ${escapeHtml(updated)}</div>
    </div>
  `;
}

export default function MicroAirLayer({ leafletMap, enabled, lang, badgeClassName }: MicroAirLayerProps) {
  const layerRef = useRef<any>(null);
  const popupRef = useRef<any>(null);
  const { points, loading, error, zoom, minZoom } = useMicroAirGrid(leafletMap, enabled);

  useEffect(() => {
    if (!leafletMap || !window.L) return;
    const L = window.L;
    const map = leafletMap;

    if (layerRef.current) {
      try { map.removeLayer(layerRef.current); } catch {}
      layerRef.current = null;
    }

    if (!enabled || points.length === 0) return;

    const group = L.layerGroup();
    points.forEach((point) => {
      const color = getAQIColor(point.aqi);
      const marker = L.circleMarker([point.lat, point.lng], {
        radius: 13,
        color,
        fillColor: color,
        fillOpacity: 0.32,
        opacity: 0.85,
        weight: 2,
      });
      marker.bindPopup(popupHtml(point, lang), { maxWidth: 280, className: 'micro-air-popup' });
      marker.addTo(group);
    });

    group.addTo(map);
    layerRef.current = group;

    return () => {
      if (layerRef.current) {
        try { map.removeLayer(layerRef.current); } catch {}
        layerRef.current = null;
      }
    };
  }, [enabled, lang, leafletMap, points]);

  useEffect(() => {
    if (!leafletMap || !window.L) return;
    const map = leafletMap;
    const L = window.L;

    const handleClick = async (event: any) => {
      const lat = event?.latlng?.lat;
      const lng = event?.latlng?.lng;
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      try {
        const [point] = await fetchMicroAirPoints([{ lat, lng }]);
        if (!point) return;
        if (popupRef.current) {
          try { map.removeLayer(popupRef.current); } catch {}
        }
        popupRef.current = L.popup({ maxWidth: 280, className: 'micro-air-popup' })
          .setLatLng([lat, lng])
          .setContent(popupHtml(point, lang))
          .openOn(map);
      } catch {
        popupRef.current = L.popup({ maxWidth: 260 })
          .setLatLng([lat, lng])
          .setContent(
            lang === 'vi'
              ? 'Chưa tải được dữ liệu vi vùng tại điểm này. Thử lại sau.'
              : 'Micro air data is unavailable for this point. Please try again.'
          )
          .openOn(map);
      }
    };

    map.on?.('click', handleClick);
    return () => {
      map.off?.('click', handleClick);
    };
  }, [lang, leafletMap]);

  if (!enabled || !leafletMap) return null;

  const text = error
    ? (lang === 'vi' ? 'Chưa tải được dữ liệu vi vùng' : 'Micro air unavailable')
    : zoom > 0 && zoom < minZoom
      ? (lang === 'vi' ? `Zoom sâu hơn để xem vi vùng (${minZoom}+)` : `Zoom in for micro air (${minZoom}+)`)
      : loading
        ? (lang === 'vi' ? 'Đang tải vi vùng Open-Meteo...' : 'Loading Open-Meteo micro air...')
        : points.length > 0
          ? (lang === 'vi' ? `${points.length} điểm vi vùng Open-Meteo` : `${points.length} Open-Meteo micro points`)
          : (lang === 'vi' ? 'Không có dữ liệu vi vùng tại khu vực này' : 'No micro-area data for this area');

  return (
    <div className={badgeClassName || 'absolute bottom-16 left-4 z-[1000] glass-morphism rounded-xl px-3 py-2 text-[10px] font-body text-white/70 border border-white/10'}>
      {text}
    </div>
  );
}
