import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Crosshair,
  Maximize2,
  Minimize2,
  Layers,
  Radio,
  Cpu,
  Users,
  AlertTriangle,
  Flame,
  Plus,
  Minus,
  Sparkles,
  MapPin,
  Route as RouteIcon,
  CheckCircle2,
} from 'lucide-react';
import { PAMStation, getAQIColorNew } from '@/lib/pam-stations';
import { HotspotEvent } from '@/lib/civic-hotspot';
import { localizeDemoText } from '@/lib/localize-demo';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;

const tileUrl = MAPBOX_TOKEN
  ? `https://api.mapbox.com/styles/v1/mapbox/dark-v11/tiles/256/{z}/{x}/{y}@2x?access_token=${MAPBOX_TOKEN}`
  : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

const tileAttribution = MAPBOX_TOKEN
  ? '&copy; <a href="https://www.mapbox.com/">Mapbox</a> &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
  : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

// Pulsing user location icon
const userLocationIcon = new L.DivIcon({
  className: 'user-loc-pin',
  html: `
    <div style="position:relative;width:28px;height:28px;">
      <div style="position:absolute;inset:0;border-radius:50%;background:rgba(14,165,233,0.45);animation:ping 2s cubic-bezier(0,0,0.2,1) infinite;"></div>
      <div style="position:absolute;inset:2px;border-radius:50%;background:#0284c7;border:2.5px solid #ffffff;box-shadow:0 0 16px rgba(14,165,233,0.95);"></div>
    </div>
  `,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

// Search pin marker icon
function createSearchPinIcon(label: string) {
  return new L.DivIcon({
    className: 'search-pin-marker',
    html: `
      <div style="
        background: linear-gradient(135deg, #0ea5e9, #0284c7);
        color: #ffffff;
        font-family: 'Montserrat', sans-serif;
        font-weight: 700;
        font-size: 11px;
        padding: 4px 10px;
        border-radius: 14px;
        border: 2px solid #ffffff;
        box-shadow: 0 0 16px rgba(14, 165, 233, 0.7), 0 4px 10px rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        gap: 4px;
        white-space: nowrap;
        transform: translateY(-50%);
      ">
        <span>📍</span>
        <span>${label.split(',')[0]}</span>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

// WAQI Station custom icon with glowing AQI badge
function createWaqiIcon(station: PAMStation, isSelected: boolean, lang: 'vi' | 'en') {
  const color = getAQIColorNew(station.aqi);
  const scale = isSelected ? 'scale(1.22)' : 'scale(1)';
  const glow = isSelected
    ? `box-shadow: 0 0 0 3px rgba(255,255,255,0.9), 0 0 24px ${color};`
    : `box-shadow: 0 0 12px ${color}80, 0 3px 8px rgba(0,0,0,0.6);`;

  return new L.DivIcon({
    className: 'waqi-station-pin',
    html: `
      <div style="
        display: flex;
        align-items: center;
        gap: 5px;
        padding: 4px 9px;
        border-radius: 9999px;
        background: rgba(11, 21, 40, 0.95);
        border: 1.5px solid ${isSelected ? '#ffffff' : color};
        backdrop-filter: blur(8px);
        transform: ${scale};
        transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        cursor: pointer;
        ${glow}
      ">
        <span style="width: 7px; height: 7px; border-radius: 50%; background: ${color}; box-shadow: 0 0 8px ${color};"></span>
        <span style="font-size: 11px; font-weight: 800; color: ${color}; font-family: 'Montserrat', sans-serif;">${station.aqi}</span>
        <span style="font-size: 9px; font-weight: 600; color: #94a3b8; max-width: 60px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
          ${localizeDemoText(station.district, lang) || 'WAQI'}
        </span>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [45, 12],
  });
}

// IoT Node custom icon
function createIotNodeIcon(node: any, isSelected: boolean) {
  const color = Number.isFinite(node.aqi) ? getAQIColorNew(node.aqi) : '#94a3b8';
  const scale = isSelected ? 'scale(1.22)' : 'scale(1)';

  return new L.DivIcon({
    className: 'iot-node-pin',
    html: `
      <div style="
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 4px 9px;
        border-radius: 9999px;
        background: linear-gradient(135deg, rgba(6, 182, 212, 0.9), rgba(14, 165, 233, 0.9));
        border: 1.5px solid #ffffff;
        box-shadow: 0 0 16px rgba(6, 182, 212, 0.8), 0 3px 8px rgba(0,0,0,0.5);
        transform: ${scale};
        transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        cursor: pointer;
        color: #ffffff;
      ">
        <span style="font-size: 10px;">⚡</span>
        <span style="font-size: 11px; font-weight: 800; font-family: 'Montserrat', sans-serif;">${Number.isFinite(node.aqi) ? node.aqi : '—'}</span>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [24, 12],
  });
}

// Community report custom icon
function createReportIcon(report: any) {
  return new L.DivIcon({
    className: 'community-report-pin',
    html: `
      <div style="
        width: 30px;
        height: 30px;
        border-radius: 50%;
        background: #f97316;
        border: 2px solid #ffffff;
        box-shadow: 0 0 12px rgba(249, 115, 22, 0.8), 0 2px 6px rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 13px;
        cursor: pointer;
      ">
        🔥
      </div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

// Hotspot custom icon
function createHotspotIcon(ev: HotspotEvent, isSelected: boolean) {
  const confColor = ev.confidence === 'high' ? '#ef4444' : ev.confidence === 'medium' ? '#f97316' : '#eab308';
  const size = isSelected ? 38 : 30;

  return new L.DivIcon({
    className: 'civic-hotspot-pin',
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        background: ${confColor};
        border: 2px solid #ffffff;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: ${isSelected ? '16px' : '13px'};
        box-shadow: 0 0 14px ${confColor}, 0 2px 8px rgba(0,0,0,0.5);
        cursor: pointer;
        transition: all 0.25s ease;
      ">
        ⚠️
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function MapViewController({
  userLocation,
  focusPoint,
  searchPin,
  zoomLevel = 14.5,
  isFullscreen,
}: {
  userLocation?: { lat: number; lng: number } | null;
  focusPoint: [number, number] | null;
  searchPin: { lat: number; lng: number } | null;
  zoomLevel?: number;
  isFullscreen?: boolean;
}) {
  const map = useMap();
  const prevFocusRef = useRef<string | null>(null);
  const initialCenteredRef = useRef<boolean>(false);

  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 150);
    const t2 = setTimeout(() => map.invalidateSize(), 350);
    return () => {
      clearTimeout(t);
      clearTimeout(t2);
    };
  }, [map, isFullscreen]);

  useEffect(() => {
    if (focusPoint) {
      const key = `focus-${focusPoint[0].toFixed(5)},${focusPoint[1].toFixed(5)}`;
      if (prevFocusRef.current !== key) {
        prevFocusRef.current = key;
        map.flyTo(focusPoint, 15.5, { duration: 1.2 });
      }
    } else if (searchPin) {
      const key = `search-${searchPin.lat.toFixed(5)},${searchPin.lng.toFixed(5)}`;
      if (prevFocusRef.current !== key) {
        prevFocusRef.current = key;
        map.flyTo([searchPin.lat, searchPin.lng], 14.5, { duration: 1.2 });
      }
    } else if (userLocation && userLocation.lat && userLocation.lng) {
      const key = `user-${userLocation.lat.toFixed(5)},${userLocation.lng.toFixed(5)}`;
      if (prevFocusRef.current !== key || !initialCenteredRef.current) {
        prevFocusRef.current = key;
        initialCenteredRef.current = true;
        map.flyTo([userLocation.lat, userLocation.lng], zoomLevel, { duration: 1.2 });
      }
    }
  }, [focusPoint, searchPin, userLocation, zoomLevel, map]);

  return null;
}

// Custom Zoom control buttons
function ZoomControls() {
  const map = useMap();
  return (
    <div className="absolute top-16 right-3 z-[400] flex flex-col gap-1.5">
      <button
        type="button"
        onClick={() => map.zoomIn()}
        className="w-8 h-8 rounded-xl bg-[#0b1528]/90 hover:bg-[#13223e] border border-white/10 text-white flex items-center justify-center shadow-lg transition-all active:scale-95"
        title="Zoom In"
      >
        <Plus className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => map.zoomOut()}
        className="w-8 h-8 rounded-xl bg-[#0b1528]/90 hover:bg-[#13223e] border border-white/10 text-white flex items-center justify-center shadow-lg transition-all active:scale-95"
        title="Zoom Out"
      >
        <Minus className="w-4 h-4" />
      </button>
    </div>
  );
}

export interface MapLayersState {
  waqi: boolean;
  iot: boolean;
  community: boolean;
  hotspots: boolean;
}

interface AQIInteractiveMapProps {
  stations: PAMStation[];
  iotNodes: any[];
  communityReports: any[];
  hotspotEvents: HotspotEvent[];
  selectedStationId?: string | null;
  onSelectStation?: (station: PAMStation) => void;
  onSelectNode?: (node: any) => void;
  onSelectHotspot?: (ev: HotspotEvent) => void;
  onAvoidStation?: (station: PAMStation) => void;
  userLocation?: { lat: number; lng: number; label?: string } | null;
  searchPin?: { lat: number; lng: number; label: string } | null;
  onResetFocus?: () => void;
  lang: 'vi' | 'en';
  layers: MapLayersState;
  onToggleLayer: (key: keyof MapLayersState) => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export default function AQIInteractiveMap({
  stations,
  iotNodes,
  communityReports,
  hotspotEvents,
  selectedStationId,
  onSelectStation,
  onSelectNode,
  onSelectHotspot,
  onAvoidStation,
  userLocation,
  searchPin,
  onResetFocus,
  lang,
  layers,
  onToggleLayer,
  isFullscreen = false,
  onToggleFullscreen,
  className = '',
  style,
}: AQIInteractiveMapProps) {
  const selectedStation = useMemo(
    () => stations.find((s) => s.id === selectedStationId) || null,
    [stations, selectedStationId]
  );

  const focusPoint: [number, number] | null = useMemo(() => {
    if (selectedStation) {
      return [selectedStation.lat, selectedStation.lng];
    }
    return null;
  }, [selectedStation]);

  const initialCenter: [number, number] = useMemo(() => {
    if (userLocation?.lat && userLocation?.lng) {
      return [userLocation.lat, userLocation.lng];
    }
    if (selectedStation) {
      return [selectedStation.lat, selectedStation.lng];
    }
    return [21.0285, 105.8542]; // Hanoi default
  }, [userLocation, selectedStation]);

  return (
    <div
      className={`rounded-3xl overflow-hidden border border-sky-500/20 relative shadow-2xl bg-[#09111e] ${className}`}
      style={{ minHeight: isFullscreen ? 'calc(100vh - 120px)' : 580, height: '100%', ...style }}
    >
      <MapContainer
        center={initialCenter}
        zoom={14.5}
        style={{ height: '100%', width: '100%', minHeight: '100%' }}
        scrollWheelZoom={true}
        zoomControl={false}
      >
        <TileLayer
          attribution={tileAttribution}
          url={tileUrl}
          tileSize={256}
          zoomOffset={0}
          maxZoom={19}
        />

        {/* User Location Radar Pulse */}
        {userLocation?.lat && userLocation?.lng && (
          <>
            <Circle
              center={[userLocation.lat, userLocation.lng]}
              radius={1500}
              pathOptions={{
                color: '#0ea5e9',
                fillColor: '#0ea5e9',
                fillOpacity: 0.04,
                weight: 1,
                dashArray: '5 5',
              }}
            />
            <Circle
              center={[userLocation.lat, userLocation.lng]}
              radius={400}
              pathOptions={{
                color: '#38bdf8',
                fillColor: '#38bdf8',
                fillOpacity: 0.12,
                weight: 1.5,
              }}
            />
            <Marker position={[userLocation.lat, userLocation.lng]} icon={userLocationIcon}>
              <Popup className="custom-hotspot-popup">
                <div className="p-1 text-xs font-body text-gray-100">
                  <div className="flex items-center gap-1.5 pb-1 border-b border-gray-700">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                    <h4 className="font-heading font-bold text-cyan-300">
                      {lang === 'vi' ? 'Vị trí hiện tại của bạn' : 'Your current location'}
                    </h4>
                  </div>
                  <p className="text-[11px] text-gray-300 mt-1.5">
                    📍 {userLocation.label || `${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}`}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-1">
                    {lang === 'vi'
                      ? 'Bản đồ đang hiển thị dữ liệu ô nhiễm không khí xung quanh bạn.'
                      : 'Map is zoomed into air quality stations around your location.'}
                  </p>
                </div>
              </Popup>
            </Marker>
          </>
        )}

        {/* Search Pin Marker */}
        {searchPin && (
          <Marker
            position={[searchPin.lat, searchPin.lng]}
            icon={createSearchPinIcon(searchPin.label)}
          />
        )}

        {/* WAQI Stations */}
        {layers.waqi &&
          stations.map((s) => {
            const isSelected = s.id === selectedStationId;
            const icon = createWaqiIcon(s, isSelected, lang);
            const color = getAQIColorNew(s.aqi);

            return (
              <Marker
                key={s.id}
                position={[s.lat, s.lng]}
                icon={icon}
                eventHandlers={{
                  click: () => onSelectStation?.(s),
                }}
              >
                <Popup className="custom-hotspot-popup">
                  <div className="p-1.5 max-w-xs font-body text-gray-900 dark:text-gray-100">
                    <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }}></span>
                        <h4 className="font-heading font-bold text-sm text-gray-900 dark:text-white truncate">
                          {localizeDemoText(s.name, lang)}
                        </h4>
                      </div>
                      <span
                        className="text-xs font-heading font-extrabold px-2 py-0.5 rounded-full text-white"
                        style={{ backgroundColor: color }}
                      >
                        AQI {s.aqi}
                      </span>
                    </div>

                    <div className="py-2 space-y-1 text-[11px] text-gray-600 dark:text-gray-300">
                      <p><b>{lang === 'vi' ? 'Khu vực' : 'Area'}:</b> {localizeDemoText(s.district, lang)}, {localizeDemoText(s.city, lang)}</p>
                      {s.pm25 !== undefined && (
                        <p><b>PM2.5:</b> {s.pm25} µg/m³</p>
                      )}
                      <p><b>{lang === 'vi' ? 'Xu hướng' : 'Trend'}:</b> {s.trend === 'up' ? (lang === 'vi' ? '↗ Đang tăng' : '↗ Rising') : s.trend === 'down' ? (lang === 'vi' ? '↘ Đang giảm' : '↘ Falling') : s.trend === 'stable' ? (lang === 'vi' ? '→ Ổn định' : '→ Stable') : (lang === 'vi' ? 'Chưa đủ dữ liệu' : 'Not enough data')}</p>
                    </div>

                    <div className="pt-2 flex gap-1.5 border-t border-gray-200 dark:border-gray-700">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectStation?.(s);
                        }}
                        className="flex-1 py-1 px-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-[11px] font-heading font-semibold text-white transition-colors"
                      >
                        {lang === 'vi' ? 'Xem chi tiết' : 'Inspect'}
                      </button>
                      {onAvoidStation && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onAvoidStation(s);
                          }}
                          className="flex-1 py-1 px-2 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-heading font-semibold text-gray-200 transition-colors flex items-center justify-center gap-1"
                        >
                          <RouteIcon className="w-3 h-3" />
                          <span>{lang === 'vi' ? 'Né trạm' : 'Avoid'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}

        {/* IoT Physical Nodes */}
        {layers.iot &&
          iotNodes.map((node) => {
            const isSelected = node.id === selectedStationId;
            const icon = createIotNodeIcon(node, isSelected);

            return (
              <Marker
                key={`iot-${node.id}`}
                position={[node.lat, node.lng]}
                icon={icon}
                eventHandlers={{
                  click: () => onSelectNode?.(node),
                }}
              >
                <Popup className="custom-hotspot-popup">
                  <div className="p-1.5 max-w-xs font-body text-gray-900 dark:text-gray-100">
                    <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-1.5">
                        <span className="text-cyan-400 text-xs">⚡</span>
                        <h4 className="font-heading font-bold text-sm text-cyan-300 truncate">
                          {localizeDemoText(node.name, lang) || 'AirWeave Node'}
                        </h4>
                      </div>
                      <span className="text-xs font-heading font-extrabold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                        AQI {Number.isFinite(node.aqi) ? node.aqi : '—'}
                      </span>
                    </div>
                    <div className="py-2 space-y-1 text-[11px] text-gray-300">
                      <p><b>{lang === 'vi' ? 'Vị trí' : 'Location'}:</b> {node.organization_name || node.location_name || (lang === 'vi' ? 'Cảm biến tại chỗ' : 'On-site sensor')}</p>
                      <p><b>PM2.5:</b> {Number.isFinite(node.pm25) ? `${node.pm25} µg/m³` : '—'} · <b>{lang === 'vi' ? 'Nhiệt độ' : 'Temperature'}:</b> {Number.isFinite(node.temperature) ? `${node.temperature}°C` : '—'}</p>
                      <p><b>{lang === 'vi' ? 'Độ ẩm' : 'Humidity'}:</b> {Number.isFinite(node.humidity) ? `${node.humidity}%` : '—'}</p>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}

        {/* Community Reports */}
        {layers.community &&
          communityReports.map((r) => {
            const icon = createReportIcon(r);
            return (
              <Marker
                key={`cr-${r.id}`}
                position={[r.lat, r.lng]}
                icon={icon}
              >
                <Popup className="custom-hotspot-popup">
                  <div className="p-1.5 max-w-xs font-body text-gray-100">
                    <h4 className="font-heading font-bold text-sm text-orange-400">
                      {lang === 'vi' ? 'Báo cáo cộng đồng vi vùng' : 'Local community report'}
                    </h4>
                    <p className="text-xs text-gray-300 mt-1 italic">{r.text || (lang === 'vi' ? 'Khói bụi / phát thải bất thường' : 'Unusual smoke / emissions')}</p>
                    <p className="text-[10px] text-gray-400 mt-1">{lang === 'vi' ? 'Ghi nhận' : 'Reported'}: {new Date(r.created_at).toLocaleTimeString(lang === 'vi' ? 'vi-VN' : 'en-US')}</p>
                  </div>
                </Popup>
              </Marker>
            );
          })}

        {/* Civic Hotspots */}
        {layers.hotspots &&
          hotspotEvents.map((ev) => {
            const isSelected = ev.id === selectedStationId;
            const icon = createHotspotIcon(ev, isSelected);
            return (
              <Marker
                key={`hs-${ev.id}`}
                position={[ev.location.lat, ev.location.lng]}
                icon={icon}
                eventHandlers={{
                  click: () => onSelectHotspot?.(ev),
                }}
              >
                <Popup className="custom-hotspot-popup">
                  <div className="p-1.5 max-w-xs font-body text-gray-100">
                    <h4 className="font-heading font-bold text-sm text-red-400 capitalize">
                      {ev.eventType.replace(/_/g, ' ')}
                    </h4>
                    <p className="text-xs text-gray-300 mt-1">{ev.description || (lang === 'vi' ? 'Điểm nóng ô nhiễm vi vùng' : 'Local pollution hotspot')}</p>
                    <p className="text-[10px] text-gray-400 mt-1">{lang === 'vi' ? 'Độ tin cậy' : 'Confidence'}: {ev.confidence.toUpperCase()}</p>
                  </div>
                </Popup>
              </Marker>
            );
          })}

        <MapViewController
          userLocation={userLocation}
          focusPoint={focusPoint}
          searchPin={searchPin || null}
          zoomLevel={14.5}
          isFullscreen={isFullscreen}
        />
        <ZoomControls />
      </MapContainer>

      {/* Floating HUD: Top Layer Switcher */}
      <div className="absolute top-3 left-3 z-[400] flex items-center gap-1.5 flex-wrap max-w-[calc(100%-110px)]">
        <div className="flex items-center gap-1 p-1 rounded-2xl bg-[#09111e]/90 backdrop-blur-md border border-sky-500/25 shadow-xl">
          <button
            type="button"
            onClick={() => onToggleLayer('waqi')}
            className={`px-2.5 py-1 rounded-xl text-xs font-heading font-semibold flex items-center gap-1.5 transition-all ${
              layers.waqi
                ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Radio className="w-3.5 h-3.5 text-cyan-400" />
            <span>{lang === 'vi' ? 'Trạm WAQI' : 'WAQI stations'}</span>
            <span className="text-[10px] opacity-80">({stations.length})</span>
          </button>

          <button
            type="button"
            onClick={() => onToggleLayer('iot')}
            className={`px-2.5 py-1 rounded-xl text-xs font-heading font-semibold flex items-center gap-1.5 transition-all ${
              layers.iot
                ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Cpu className="w-3.5 h-3.5 text-emerald-400" />
            <span>Node IoT</span>
            <span className="text-[10px] opacity-80">({iotNodes.length})</span>
          </button>

          <button
            type="button"
            onClick={() => onToggleLayer('community')}
            className={`px-2.5 py-1 rounded-xl text-xs font-heading font-semibold flex items-center gap-1.5 transition-all ${
              layers.community
                ? 'bg-orange-500/25 text-orange-300 border border-orange-500/40 shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-orange-400" />
            <span>{lang === 'vi' ? 'Cộng đồng' : 'Community'}</span>
            <span className="text-[10px] opacity-80">({communityReports.length})</span>
          </button>

          <button
            type="button"
            onClick={() => onToggleLayer('hotspots')}
            className={`px-2.5 py-1 rounded-xl text-xs font-heading font-semibold flex items-center gap-1.5 transition-all ${
              layers.hotspots
                ? 'bg-red-500/25 text-red-300 border border-red-500/40 shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-red-400" />
            <span>{lang === 'vi' ? 'Điểm nóng' : 'Hotspots'}</span>
            <span className="text-[10px] opacity-80">({hotspotEvents.length})</span>
          </button>
        </div>
      </div>

      {/* Floating HUD: Top Right Actions (Re-center & Fullscreen Toggle) */}
      <div className="absolute top-3 right-3 z-[400] flex items-center gap-2">
        {userLocation?.lat && userLocation?.lng && (
          <button
            type="button"
            onClick={() => {
              onResetFocus?.();
            }}
            className="px-3 py-1.5 rounded-xl bg-[#09111e]/90 hover:bg-[#131d31] backdrop-blur-md border border-cyan-500/30 text-xs font-heading font-semibold text-cyan-300 shadow-xl flex items-center gap-1.5 transition-all active:scale-95"
            title={lang === 'vi' ? 'Zoom lại vị trí của bạn' : 'Zoom to your location'}
          >
            <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">{lang === 'vi' ? 'Vị trí của tôi' : 'My Location'}</span>
          </button>
        )}

        {onToggleFullscreen && (
          <button
            type="button"
            onClick={onToggleFullscreen}
            className="p-2 rounded-xl bg-[#09111e]/90 hover:bg-[#131d31] backdrop-blur-md border border-white/10 text-gray-300 hover:text-white shadow-xl transition-all active:scale-95"
            title={isFullscreen ? (lang === 'vi' ? 'Thu gọn Bento Studio' : 'Exit fullscreen') : (lang === 'vi' ? 'Phóng to Toàn màn hình' : 'Open fullscreen')}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Floating HUD: Bottom Standard AQI Scale Bar */}
      <div className="absolute bottom-3 left-3 z-[400] bg-[#07111F]/90 backdrop-blur-md rounded-2xl px-4 py-2.5 text-xs font-body border border-sky-500/25 shadow-2xl flex items-center gap-3 flex-wrap max-w-[calc(100%-1.5rem)] text-slate-200">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span className="font-heading font-bold text-white text-xs">{lang === 'vi' ? 'Thang đo AQI' : 'AQI scale'}:</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap text-[11px] font-heading font-semibold">
          <span className="inline-flex items-center gap-1 text-emerald-400">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" /> 0-50 {lang === 'vi' ? 'Tốt' : 'Good'}
          </span>
          <span className="inline-flex items-center gap-1 text-yellow-400">
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 shadow-sm shadow-yellow-500/50" /> 51-100 {lang === 'vi' ? 'Vừa' : 'Moderate'}
          </span>
          <span className="inline-flex items-center gap-1 text-orange-400">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-sm shadow-orange-500/50" /> 101-150 {lang === 'vi' ? 'Kém' : 'Unhealthy for sensitive groups'}
          </span>
          <span className="inline-flex items-center gap-1 text-red-400">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-sm shadow-red-500/50" /> 151-200 {lang === 'vi' ? 'Xấu' : 'Unhealthy'}
          </span>
          <span className="inline-flex items-center gap-1 text-purple-400">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shadow-sm shadow-purple-500/50" /> 201-300 {lang === 'vi' ? 'Rất xấu' : 'Very unhealthy'}
          </span>
          <span className="inline-flex items-center gap-1 text-rose-500">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-700 shadow-sm shadow-rose-700/50" /> &gt;300 {lang === 'vi' ? 'Nguy hại' : 'Hazardous'}
          </span>
        </div>
      </div>
    </div>
  );
}
