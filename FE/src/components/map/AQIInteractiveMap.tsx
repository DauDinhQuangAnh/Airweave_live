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
    <div style="position:relative;width:32px;height:32px;transform:translate(-50%,-50%);">
      <div style="position:absolute;inset:0;border-radius:50%;background:rgba(14,165,233,0.45);animation:ping 2s cubic-bezier(0,0,0.2,1) infinite;"></div>
      <div style="position:absolute;inset:2px;border-radius:50%;background:#0284c7;border:2.5px solid #ffffff;box-shadow:0 0 16px rgba(14,165,233,0.95);"></div>
    </div>
  `,
  iconSize: [0, 0],
  iconAnchor: [0, 0],
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
        transform: translate(-50%, -100%);
      ">
        <span>📍</span>
        <span>${label.split(',')[0]}</span>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

// WAQI Station custom icon with glowing AQI badge (Perfectly Centered & High Contrast)
function createWaqiIcon(station: PAMStation, isSelected: boolean, lang: 'vi' | 'en') {
  const color = getAQIColorNew(station.aqi);
  const scale = isSelected ? 'scale(1.2)' : 'scale(1)';
  const glow = isSelected
    ? `box-shadow: 0 0 0 3px #ffffff, 0 0 24px ${color};`
    : `box-shadow: 0 0 14px ${color}aa, 0 4px 12px rgba(0,0,0,0.7);`;

  return new L.DivIcon({
    className: 'waqi-station-pin',
    html: `
      <div style="
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 5px 11px;
        border-radius: 9999px;
        background: rgba(11, 21, 40, 0.95);
        border: 2px solid ${isSelected ? '#ffffff' : color};
        backdrop-filter: blur(8px);
        transform: translate(-50%, -50%) ${scale};
        transition: transform 0.2s ease, box-shadow 0.2s ease;
        cursor: pointer;
        white-space: nowrap;
        ${glow}
      ">
        <span style="width: 8px; height: 8px; border-radius: 50%; background: ${color}; box-shadow: 0 0 10px ${color}; shrink: 0;"></span>
        <span style="font-size: 13px; font-weight: 900; color: ${color}; font-family: 'Montserrat', sans-serif;">${station.aqi}</span>
        <span style="font-size: 10px; font-weight: 700; color: #cbd5e1; max-width: 90px; overflow: hidden; text-overflow: ellipsis;">
          ${localizeDemoText(station.district, lang) || 'WAQI'}
        </span>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

// IoT Node custom icon
function createIotNodeIcon(node: any, isSelected: boolean) {
  const color = Number.isFinite(node.aqi) ? getAQIColorNew(node.aqi) : '#94a3b8';
  const scale = isSelected ? 'scale(1.2)' : 'scale(1)';

  return new L.DivIcon({
    className: 'iot-node-pin',
    html: `
      <div style="
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 5px 11px;
        border-radius: 9999px;
        background: linear-gradient(135deg, rgba(6, 182, 212, 0.95), rgba(14, 165, 233, 0.95));
        border: 2px solid #ffffff;
        box-shadow: 0 0 16px rgba(6, 182, 212, 0.8), 0 4px 10px rgba(0,0,0,0.5);
        transform: translate(-50%, -50%) ${scale};
        transition: transform 0.2s ease;
        cursor: pointer;
        color: #ffffff;
        white-space: nowrap;
      ">
        <span style="font-size: 11px;">⚡</span>
        <span style="font-size: 12px; font-weight: 900; font-family: 'Montserrat', sans-serif;">${Number.isFinite(node.aqi) ? node.aqi : '—'}</span>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

// Community report custom icon
function createReportIcon(report: any) {
  return new L.DivIcon({
    className: 'community-report-pin',
    html: `
      <div style="
        background: rgba(239, 68, 68, 0.9);
        color: #ffffff;
        padding: 5px 9px;
        border-radius: 9999px;
        border: 2px solid #ffffff;
        box-shadow: 0 0 14px rgba(239, 68, 68, 0.8), 0 4px 10px rgba(0,0,0,0.5);
        font-size: 10px;
        font-weight: 800;
        font-family: 'Montserrat', sans-serif;
        display: flex;
        align-items: center;
        gap: 4px;
        transform: translate(-50%, -50%);
        white-space: nowrap;
      ">
        <span>📢</span>
        <span>${report.kind || 'Báo cáo'}</span>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

// Controller for map actions
function MapController({
  userLocation,
  searchPin,
  selectedCoords,
}: {
  userLocation: { lat: number; lng: number } | null;
  searchPin: { lat: number; lng: number } | null;
  selectedCoords: { lat: number; lng: number } | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (searchPin) {
      map.flyTo([searchPin.lat, searchPin.lng], 15, { duration: 1.5 });
    } else if (selectedCoords) {
      map.flyTo([selectedCoords.lat, selectedCoords.lng], 15, { duration: 1.2 });
    }
  }, [searchPin, selectedCoords, map]);

  return null;
}

export default function AQIInteractiveMap({
  stations,
  iotNodes,
  communityReports,
  hotspotEvents,
  selectedStationId,
  onSelectStation,
  onSelectNode,
  onAvoidStation,
  userLocation,
  searchPin,
  onResetFocus,
  lang,
  layers,
  onToggleLayer,
  isFullscreen,
  onToggleFullscreen,
  className = '',
}: {
  stations: PAMStation[];
  iotNodes: any[];
  communityReports: any[];
  hotspotEvents: HotspotEvent[];
  selectedStationId: string | null;
  onSelectStation: (s: PAMStation) => void;
  onSelectNode: (n: any) => void;
  onAvoidStation: (s: PAMStation) => void;
  userLocation: { lat: number; lng: number } | null;
  searchPin: { lat: number; lng: number; label: string } | null;
  onResetFocus: () => void;
  lang: 'vi' | 'en';
  layers: { community: boolean; micro: boolean; civic: boolean };
  onToggleLayer: (key: 'community' | 'micro' | 'civic') => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  className?: string;
}) {
  const selectedCoords = useMemo(() => {
    if (!selectedStationId) return null;
    const st = stations.find((s) => s.id === selectedStationId);
    if (st) return { lat: st.lat, lng: st.lng };
    const nd = iotNodes.find((n) => n.id === selectedStationId);
    if (nd) return { lat: nd.lat, lng: nd.lng };
    return null;
  }, [selectedStationId, stations, iotNodes]);

  const defaultCenter = userLocation || { lat: 21.0285, lng: 105.8542 };

  return (
    <div className={`relative w-full h-full font-body ${className}`}>
      <MapContainer
        center={[defaultCenter.lat, defaultCenter.lng]}
        zoom={12}
        scrollWheelZoom={true}
        className="w-full h-full rounded-2xl z-0"
        zoomControl={false}
      >
        <TileLayer url={tileUrl} attribution={tileAttribution} maxZoom={19} />

        <MapController userLocation={userLocation} searchPin={searchPin} selectedCoords={selectedCoords} />

        {/* User GPS Location Marker */}
        {userLocation && (
          <Marker position={[userLocation.lat, userLocation.lng]} icon={userLocationIcon}>
            <Popup className="aqi-map-popup">
              <div className="p-2 text-xs text-slate-900 font-heading font-bold">
                📍 {lang === 'vi' ? 'Vị trí của bạn' : 'Your GPS Location'}
              </div>
            </Popup>
          </Marker>
        )}

        {/* Search Pin Marker */}
        {searchPin && (
          <Marker position={[searchPin.lat, searchPin.lng]} icon={createSearchPinIcon(searchPin.label)}>
            <Popup className="aqi-map-popup">
              <div className="p-2 text-xs text-slate-900 font-heading font-bold">
                🔍 {searchPin.label}
              </div>
            </Popup>
          </Marker>
        )}

        {/* WAQI Stations */}
        {stations.map((s) => {
          const isSelected = selectedStationId === s.id;
          return (
            <Marker
              key={s.id}
              position={[s.lat, s.lng]}
              icon={createWaqiIcon(s, isSelected, lang)}
              eventHandlers={{
                click: () => onSelectStation(s),
              }}
            >
              <Popup className="aqi-map-popup">
                <div className="p-3 text-slate-900 space-y-2 min-w-[200px]">
                  <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-1.5">
                    <span className="font-heading font-bold text-xs truncate max-w-[150px]">{localizeDemoText(s.name, lang)}</span>
                    <span
                      className="px-2 py-0.5 rounded text-xs font-black text-white shrink-0"
                      style={{ backgroundColor: getAQIColorNew(s.aqi) }}
                    >
                      AQI {s.aqi}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600">{s.district}, {s.city}</p>
                  <button
                    onClick={() => onAvoidStation(s)}
                    className="w-full py-1 rounded bg-cyan-600 hover:bg-cyan-700 text-white font-heading text-[11px] font-bold transition-colors"
                  >
                    {lang === 'vi' ? 'Né trạm này trong Lộ trình' : 'Avoid in Smart Route'}
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* IoT Nodes */}
        {iotNodes.map((n) => {
          const isSelected = selectedStationId === n.id;
          return (
            <Marker
              key={n.id}
              position={[n.lat, n.lng]}
              icon={createIotNodeIcon(n, isSelected)}
              eventHandlers={{
                click: () => onSelectNode(n),
              }}
            >
              <Popup className="aqi-map-popup">
                <div className="p-3 text-slate-900 space-y-1.5 min-w-[180px]">
                  <div className="font-heading font-bold text-xs flex items-center justify-between">
                    <span>⚡ {n.name}</span>
                    <span className="text-cyan-600 font-extrabold">AQI {n.aqi}</span>
                  </div>
                  <p className="text-[11px] text-slate-600">🏢 {n.organization_name || 'Node IoT AirWeave'}</p>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Community Reports */}
        {layers.community &&
          communityReports.map((r) => (
            <Marker key={r.id} position={[r.lat, r.lng]} icon={createReportIcon(r)}>
              <Popup className="aqi-map-popup">
                <div className="p-2.5 text-slate-900 text-xs space-y-1">
                  <div className="font-heading font-bold text-rose-600">📢 {r.kind || 'Báo cáo điểm ô nhiễm'}</div>
                  <p className="text-slate-700">{r.text || 'Khói bụi / Đốt rác tự phát'}</p>
                </div>
              </Popup>
            </Marker>
          ))}
      </MapContainer>

      {/* Floating Map Controls */}
      <div className="absolute top-4 right-4 z-[400] flex flex-col gap-2">
        <button
          onClick={onResetFocus}
          className="p-2.5 rounded-xl bg-slate-900/90 text-white hover:bg-slate-800 border border-white/20 shadow-lg backdrop-blur-md transition-all active:scale-95"
          title={lang === 'vi' ? 'Về vị trí của bạn' : 'Reset to GPS location'}
        >
          <Crosshair className="w-4 h-4 text-cyan-400" />
        </button>
        <button
          onClick={onToggleFullscreen}
          className="p-2.5 rounded-xl bg-slate-900/90 text-white hover:bg-slate-800 border border-white/20 shadow-lg backdrop-blur-md transition-all active:scale-95"
          title={isFullscreen ? (lang === 'vi' ? 'Thu nhỏ bản đồ' : 'Exit Fullscreen') : (lang === 'vi' ? 'Phóng to bản đồ' : 'Fullscreen')}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4 text-cyan-400" /> : <Maximize2 className="w-4 h-4 text-cyan-400" />}
        </button>
      </div>

      {/* Layer Toggle Bar */}
      <div className="absolute bottom-4 left-4 z-[400] flex items-center gap-1.5 p-1.5 rounded-2xl bg-slate-900/90 border border-white/20 backdrop-blur-md shadow-2xl flex-wrap text-xs font-heading font-semibold text-white">
        <button
          onClick={() => onToggleLayer('micro')}
          className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
            layers.micro ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-white/50 hover:text-white'
          }`}
        >
          <Radio className="w-3.5 h-3.5" />
          <span>Trạng thái WAQI</span>
        </button>

        <button
          onClick={() => onToggleLayer('civic')}
          className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
            layers.civic ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-white/50 hover:text-white'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          <span>Node IoT</span>
        </button>

        <button
          onClick={() => onToggleLayer('community')}
          className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
            layers.community ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' : 'text-white/50 hover:text-white'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Cộng đồng</span>
        </button>
      </div>
    </div>
  );
}
