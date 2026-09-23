import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Navigation, Compass } from 'lucide-react';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;

const tileUrl = MAPBOX_TOKEN
  ? `https://api.mapbox.com/styles/v1/mapbox/dark-v11/tiles/256/{z}/{x}/{y}@2x?access_token=${MAPBOX_TOKEN}`
  : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

const tileAttribution = MAPBOX_TOKEN
  ? '&copy; <a href="https://www.mapbox.com/">Mapbox</a> &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
  : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

const userLocationIcon = new L.DivIcon({
  className: 'user-loc-pin',
  html: `
    <div style="position:relative;width:22px;height:22px;">
      <div style="position:absolute;inset:0;border-radius:50%;background:rgba(14,165,233,0.4);animation:ping 2s cubic-bezier(0,0,0.2,1) infinite;"></div>
      <div style="position:absolute;inset:2px;border-radius:50%;background:#0284c7;border:2px solid #ffffff;box-shadow:0 0 10px rgba(14,165,233,0.8);"></div>
    </div>
  `,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

const reportPinIcon = new L.DivIcon({
  className: 'report-target-pin',
  html: `
    <div style="display:flex;flex-direction:column;align-items:center;cursor:grab;">
      <div style="width:36px;height:36px;border-radius:50%;background:#f97316;border:3px solid #ffffff;display:flex;align-items:center;justify-content:center;box-shadow:0 0 16px rgba(249,115,22,0.6);font-size:16px;">
        📍
      </div>
      <div style="width:2px;height:8px;background:#f97316;"></div>
      <div style="width:8px;height:8px;border-radius:50%;background:#f97316;border:1px solid #fff;"></div>
    </div>
  `,
  iconSize: [36, 52],
  iconAnchor: [18, 52],
});

const KIND_ICON: Record<string, string> = {
  smoke: '🔥',
  construction: '🏗️',
  traffic: '🚗',
  odor: '🧪',
  dust: '🌫️',
  other: '📢',
};

function createNearbyIcon(kind: string) {
  const emoji = KIND_ICON[kind] || '📍';
  return new L.DivIcon({
    className: 'nearby-report-pin',
    html: `
      <div style="width:30px;height:30px;border-radius:50%;background:#1e293b;border:2px solid #38bdf8;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.5);font-size:14px;">
        ${emoji}
      </div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

function MapClickHandler({ onLocationChange }: { onLocationChange: (loc: { lat: number; lng: number }) => void }) {
  useMapEvents({
    click: (e) => {
      onLocationChange({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

function FitBounds({
  center,
  zoom,
}: {
  center: [number, number];
  zoom?: number;
}) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom || 15, { duration: 1 });
  }, [center, zoom, map]);
  return null;
}

export interface NearbyReport {
  id: string;
  lat: number;
  lng: number;
  kind: string;
  text: string | null;
  created_at: string;
}

interface CommunityReportMapProps {
  userLocation: { lat: number; lng: number };
  reportLocation: { lat: number; lng: number };
  onLocationChange: (loc: { lat: number; lng: number }) => void;
  nearbyReports?: NearbyReport[];
  lang: 'vi' | 'en';
  className?: string;
  style?: React.CSSProperties;
}

export default function CommunityReportMap({
  userLocation,
  reportLocation,
  onLocationChange,
  nearbyReports = [],
  lang,
  className = '',
  style,
}: CommunityReportMapProps) {
  const reportCenter: [number, number] = useMemo(
    () => [reportLocation.lat || userLocation.lat || 21.0285, reportLocation.lng || userLocation.lng || 105.8542],
    [reportLocation, userLocation]
  );

  const resetToGPS = () => {
    if (Number.isFinite(userLocation.lat) && Number.isFinite(userLocation.lng)) {
      onLocationChange({ lat: userLocation.lat, lng: userLocation.lng });
    }
  };

  return (
    <div
      className={`rounded-2xl overflow-hidden border border-sky-500/20 relative shadow-2xl bg-[#09111e] ${className}`}
      style={{ minHeight: 480, height: '100%', ...style }}
    >
      <MapContainer
        center={reportCenter}
        zoom={15}
        style={{ height: '100%', width: '100%', minHeight: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution={tileAttribution}
          url={tileUrl}
          tileSize={256}
          zoomOffset={0}
          maxZoom={19}
        />

        <MapClickHandler onLocationChange={onLocationChange} />

        {/* 300m report buffer circle around target */}
        <Circle
          center={[reportLocation.lat, reportLocation.lng]}
          radius={300}
          pathOptions={{
            color: '#f97316',
            fillColor: '#f97316',
            fillOpacity: 0.18,
            weight: 2,
            dashArray: '6 6',
          }}
        />

        {/* User GPS location marker */}
        {Number.isFinite(userLocation.lat) && Number.isFinite(userLocation.lng) && (
          <Marker position={[userLocation.lat, userLocation.lng]} icon={userLocationIcon}>
            <Popup>
              <div className="font-heading text-xs font-bold p-1">
                📍 {lang === 'vi' ? 'Vị trí GPS hiện tại của bạn' : 'Your current GPS location'}
              </div>
            </Popup>
          </Marker>
        )}

        {/* Target Report Pin (Draggable) */}
        <Marker
          position={[reportLocation.lat, reportLocation.lng]}
          icon={reportPinIcon}
          draggable
          eventHandlers={{
            dragend: (e) => {
              const marker = e.target;
              const pos = marker.getLatLng();
              onLocationChange({ lat: pos.lat, lng: pos.lng });
            },
          }}
        >
          <Popup>
            <div className="font-body text-xs p-1">
              <p className="font-heading font-bold text-orange-600 dark:text-orange-400">
                🎯 {lang === 'vi' ? 'Điểm báo cáo ô nhiễm' : 'Report location'}
              </p>
              <p className="text-[11px] text-gray-500 mt-0.5">
                {lang === 'vi'
                  ? 'Kéo ghim hoặc bấm vào bản đồ để đổi vị trí'
                  : 'Drag pin or click map to reposition'}
              </p>
            </div>
          </Popup>
        </Marker>

        {/* Nearby Reports */}
        {nearbyReports.map((r) => (
          <Marker
            key={r.id}
            position={[r.lat, r.lng]}
            icon={createNearbyIcon(r.kind)}
          >
            <Popup>
              <div className="font-body text-xs p-1 space-y-1">
                <div className="flex items-center gap-1.5 font-heading font-bold">
                  <span>{KIND_ICON[r.kind] || '📍'}</span>
                  <span className="capitalize">{r.kind}</span>
                </div>
                {r.text && <p className="text-[11px] text-gray-600 dark:text-gray-300 italic">{r.text}</p>}
                <p className="text-[10px] text-gray-400">
                  {new Date(r.created_at).toLocaleTimeString(lang === 'vi' ? 'vi-VN' : 'en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </Popup>
          </Marker>
        ))}

        <FitBounds center={reportCenter} />
      </MapContainer>

      {/* Top action: Re-center to GPS */}
      <div className="absolute top-3 right-3 z-[400] flex items-center gap-2">
        <button
          type="button"
          onClick={resetToGPS}
          className="px-3 py-1.5 rounded-xl bg-[#07111F]/90 backdrop-blur-md border border-sky-500/30 text-cyan-300 hover:bg-sky-500/20 text-xs font-heading font-semibold shadow-xl transition-all flex items-center gap-1.5 active:scale-95"
        >
          <Compass className="w-3.5 h-3.5" />
          <span>{lang === 'vi' ? 'Về vị trí GPS của tôi' : 'Reset to my GPS'}</span>
        </button>
      </div>

      {/* Floating Legend */}
      <div className="absolute bottom-3 left-3 z-[400] bg-[#07111F]/90 backdrop-blur-md rounded-xl px-3.5 py-2.5 text-xs font-body border border-sky-500/25 shadow-xl flex items-center gap-3 flex-wrap max-w-[calc(100%-1.5rem)] text-slate-200">
        <div className="flex items-center gap-1.5">
          <MapPin className="w-4 h-4 text-orange-400" />
          <span className="font-heading font-bold text-white text-xs">{lang === 'vi' ? 'Ghim báo cáo' : 'Report pin'}:</span>
        </div>
        <span className="inline-flex items-center gap-1.5 text-orange-300">
          📍 {lang === 'vi' ? 'Kéo / Bấm bản đồ để chọn' : 'Drag / click map to select'}
        </span>
        <span className="inline-flex items-center gap-1.5 text-sky-400 border-l border-white/10 pl-2">
          🔵 {lang === 'vi' ? 'Vị trí GPS của bạn' : 'Your GPS location'}
        </span>
        <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-gray-400 border-l border-white/10 pl-2">
          ⭕ {lang === 'vi' ? 'Bán kính 300m' : '300m radius'}
        </span>
      </div>
    </div>
  );
}
