import { useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Route as RouteIcon, ShieldAlert, Crosshair, MapPin } from 'lucide-react';
import type { HotspotEvent } from '@/lib/civic-hotspot';
import { localizeHotspotSource } from '@/lib/localize-demo';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;

const tileUrl = MAPBOX_TOKEN
  ? `https://api.mapbox.com/styles/v1/mapbox/dark-v11/tiles/256/{z}/{x}/{y}@2x?access_token=${MAPBOX_TOKEN}`
  : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

const tileAttribution = MAPBOX_TOKEN
  ? '&copy; <a href="https://www.mapbox.com/">Mapbox</a> &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
  : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

const EVENT_ICON: Record<string, string> = {
  construction_dust: '🏗️',
  burning_smoke: '🔥',
  traffic_emission: '🚗',
  chemical_smell: '🧪',
  road_dust: '🌫️',
  abnormal_air_quality: '⚠️',
  unknown: '📍',
};

const CONF_COLOR: Record<string, { bg: string; border: string; glow: string }> = {
  high: { bg: '#ef4444', border: '#fca5a5', glow: 'rgba(239, 68, 68, 0.45)' },
  medium: { bg: '#f97316', border: '#fdba74', glow: 'rgba(249, 115, 22, 0.4)' },
  low: { bg: '#eab308', border: '#fde047', glow: 'rgba(234, 179, 8, 0.35)' },
};

const userLocationIcon = new L.DivIcon({
  className: 'user-loc-pin',
  html: `
    <div style="position:relative;width:26px;height:26px;">
      <div style="position:absolute;inset:0;border-radius:50%;background:rgba(14,165,233,0.4);animation:ping 2s cubic-bezier(0,0,0.2,1) infinite;"></div>
      <div style="position:absolute;inset:2px;border-radius:50%;background:#0284c7;border:2.5px solid #ffffff;box-shadow:0 0 14px rgba(14,165,233,0.9);"></div>
    </div>
  `,
  iconSize: [26, 26],
  iconAnchor: [13, 13],
});

function createHotspotIcon(ev: HotspotEvent, isSelected: boolean) {
  const conf = CONF_COLOR[ev.confidence] || CONF_COLOR.low;
  const iconEmoji = EVENT_ICON[ev.eventType] || '📍';
  const size = isSelected ? 40 : 32;
  const ringStyle = isSelected
    ? `box-shadow: 0 0 0 4px ${conf.glow}, 0 0 18px ${conf.glow}; transform: scale(1.18);`
    : `box-shadow: 0 0 0 2px ${conf.glow}, 0 2px 8px rgba(0,0,0,0.5); transform: scale(1);`;

  return new L.DivIcon({
    className: 'civic-hotspot-pin',
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        background: ${conf.bg};
        border: 2px solid #ffffff;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: ${isSelected ? '18px' : '14px'};
        transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        cursor: pointer;
        ${ringStyle}
      ">
        ${iconEmoji}
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function MapViewController({
  userLocation,
  focusPoint,
  userZoom = 14.5,
}: {
  userLocation?: { lat: number; lng: number } | null;
  focusPoint: [number, number] | null;
  userZoom?: number;
}) {
  const map = useMap();
  const prevFocusRef = useRef<string | null>(null);
  const initialCenteredRef = useRef<boolean>(false);

  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 150);
    return () => clearTimeout(t);
  }, [map]);

  useEffect(() => {
    if (focusPoint) {
      const key = `focus-${focusPoint[0].toFixed(5)},${focusPoint[1].toFixed(5)}`;
      if (prevFocusRef.current !== key) {
        prevFocusRef.current = key;
        map.flyTo(focusPoint, 15.5, { duration: 1.2 });
      }
    } else if (userLocation && userLocation.lat && userLocation.lng) {
      const key = `user-${userLocation.lat.toFixed(5)},${userLocation.lng.toFixed(5)}`;
      if (prevFocusRef.current !== key || !initialCenteredRef.current) {
        prevFocusRef.current = key;
        initialCenteredRef.current = true;
        map.flyTo([userLocation.lat, userLocation.lng], userZoom, { duration: 1.2 });
      }
    }
  }, [focusPoint, userLocation, userZoom, map]);

  return null;
}

interface HotspotsMapProps {
  events: HotspotEvent[];
  selectedEventId: string | null;
  onSelectEvent: (ev: HotspotEvent) => void;
  onResetFocus?: () => void;
  onAvoid: (ev: HotspotEvent) => void;
  lang: 'vi' | 'en';
  userLocation?: { lat: number; lng: number; label?: string } | null;
  defaultCenter?: [number, number];
  className?: string;
  style?: React.CSSProperties;
}

export default function HotspotsMap({
  events,
  selectedEventId,
  onSelectEvent,
  onResetFocus,
  onAvoid,
  lang,
  userLocation,
  defaultCenter = [21.0285, 105.8542],
  className = '',
  style,
}: HotspotsMapProps) {
  const selectedEvent = useMemo(
    () => events.find((e) => e.id === selectedEventId) || null,
    [events, selectedEventId]
  );

  const focusPoint: [number, number] | null = useMemo(() => {
    if (selectedEvent) {
      return [selectedEvent.location.lat, selectedEvent.location.lng];
    }
    return null;
  }, [selectedEvent]);

  // Initial center prioritizes user location, zoomed in close
  const initialCenter: [number, number] = useMemo(() => {
    if (userLocation?.lat && userLocation?.lng) {
      return [userLocation.lat, userLocation.lng];
    }
    if (selectedEvent) {
      return [selectedEvent.location.lat, selectedEvent.location.lng];
    }
    if (events.length > 0) {
      return [events[0].location.lat, events[0].location.lng];
    }
    return defaultCenter;
  }, [userLocation, selectedEvent, events, defaultCenter]);

  return (
    <div
      className={`rounded-2xl overflow-hidden border border-sky-500/20 relative shadow-2xl bg-[#09111e] ${className}`}
      style={{ minHeight: 480, height: '100%', ...style }}
    >
      <MapContainer
        center={initialCenter}
        zoom={14.5}
        style={{ height: '100%', width: '100%', minHeight: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution={tileAttribution}
          url={tileUrl}
          tileSize={256}
          zoomOffset={0}
          maxZoom={19}
        />

        {/* User Location Radar & Marker */}
        {userLocation?.lat && userLocation?.lng && (
          <>
            {/* 1.5km proximity zone around user */}
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

            {/* 400m immediate micro-radius */}
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
                      ? 'Bản đồ đang hiển thị các điểm ô nhiễm vi vùng xung quanh bạn.'
                      : 'Map is zoomed into micro-zone hotspots around you.'}
                  </p>
                </div>
              </Popup>
            </Marker>
          </>
        )}

        {/* Hotspot Circles (250m avoidance buffer radius) */}
        {events.map((ev) => {
          const conf = CONF_COLOR[ev.confidence] || CONF_COLOR.low;
          const isSelected = ev.id === selectedEventId;
          return (
            <Circle
              key={`buf-${ev.id}`}
              center={[ev.location.lat, ev.location.lng]}
              radius={isSelected ? 320 : 250}
              pathOptions={{
                color: conf.bg,
                fillColor: conf.bg,
                fillOpacity: isSelected ? 0.35 : 0.18,
                weight: isSelected ? 2 : 1,
                dashArray: isSelected ? undefined : '4 4',
              }}
            />
          );
        })}

        {/* Hotspot Markers */}
        {events.map((ev) => {
          const isSelected = ev.id === selectedEventId;
          const conf = CONF_COLOR[ev.confidence] || CONF_COLOR.low;
          const icon = createHotspotIcon(ev, isSelected);

          return (
            <Marker
              key={ev.id}
              position={[ev.location.lat, ev.location.lng]}
              icon={icon}
              eventHandlers={{
                click: () => onSelectEvent(ev),
              }}
            >
              <Popup className="custom-hotspot-popup">
                <div className="p-1 max-w-xs font-body text-gray-900 dark:text-gray-100">
                  <div className="flex items-center gap-2 pb-1.5 border-b border-gray-200 dark:border-gray-700">
                    <span className="text-xl">{EVENT_ICON[ev.eventType] || '📍'}</span>
                    <div>
                      <h4 className="font-heading font-bold text-sm leading-tight text-gray-900 dark:text-white capitalize">
                        {ev.eventType.replace(/_/g, ' ')}
                      </h4>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span
                          className="text-[10px] font-heading font-bold uppercase px-1.5 py-0.2 rounded-full text-white"
                          style={{ backgroundColor: conf.bg }}
                        >
                          {ev.confidence}
                        </span>
                        {ev.isDemo && (
                          <span className="text-[10px] font-heading font-bold uppercase px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-300">
                            DEMO
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="py-2 space-y-1 text-[11px] text-gray-600 dark:text-gray-300">
                    <p className="line-clamp-2 italic">{ev.description || (lang === 'vi' ? 'Không có mô tả chi tiết.' : 'No detailed description.')}</p>
                    <p>
                      <b>{lang === 'vi' ? 'Nguồn' : 'Source'}:</b> {localizeHotspotSource(ev.sourceLabel, lang)}
                    </p>
                    {ev.sourceType !== 'station_data' && <p>
                      <b>{lang === 'vi' ? 'Báo cáo' : 'Reports'}:</b> {ev.confirmationsCount}
                    </p>}
                    <p>
                      <b>{lang === 'vi' ? 'Tọa độ' : 'Coords'}:</b> {ev.location.lat.toFixed(4)}, {ev.location.lng.toFixed(4)}
                    </p>
                  </div>

                  <div className="pt-2 flex gap-1.5 border-t border-gray-200 dark:border-gray-700">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAvoid(ev);
                      }}
                      className="flex-1 py-1 px-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-[11px] font-heading font-semibold flex items-center justify-center gap-1 text-white shadow-sm transition-colors"
                    >
                      <RouteIcon className="w-3 h-3" />
                      <span>{lang === 'vi' ? 'Né tuyến' : 'Avoid'}</span>
                    </button>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        <MapViewController
          userLocation={userLocation}
          focusPoint={focusPoint}
          userZoom={14.5}
        />
      </MapContainer>

      {/* Floating Re-center to User Location Button */}
      {userLocation?.lat && userLocation?.lng && (
        <button
          type="button"
          onClick={() => {
            onResetFocus?.();
          }}
          className="absolute top-3 right-3 z-[400] px-3 py-1.5 rounded-xl bg-[#09111e]/90 hover:bg-[#131d31] backdrop-blur-md border border-cyan-500/30 text-xs font-heading font-semibold text-cyan-300 shadow-xl flex items-center gap-1.5 transition-all active:scale-95"
          title={lang === 'vi' ? 'Zoom lại vị trí của bạn' : 'Zoom to your location'}
        >
          <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
          <span>{lang === 'vi' ? 'Vị trí của tôi' : 'My Location'}</span>
        </button>
      )}

      {/* Floating Legend */}
      <div className="absolute bottom-3 left-3 z-[400] bg-[#07111F]/90 backdrop-blur-md rounded-xl px-3.5 py-2 text-xs font-body border border-sky-500/25 shadow-xl flex items-center gap-3 flex-wrap max-w-[calc(100%-1.5rem)] text-slate-200">
        <div className="flex items-center gap-1.5">
          <ShieldAlert className="w-4 h-4 text-cyan-400" />
          <span className="font-heading font-bold text-white text-xs">{lang === 'vi' ? 'Mức độ rủi ro' : 'Risk level'}:</span>
        </div>
        {userLocation && <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block shadow-sm shadow-cyan-400/50" /> {lang === 'vi' ? 'Vị trí của bạn' : 'Your location'}
        </span>}
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block shadow-sm shadow-red-500/50" /> {lang === 'vi' ? 'Cao' : 'High'}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block shadow-sm shadow-orange-500/50" /> {lang === 'vi' ? 'Vừa' : 'Medium'}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 inline-block shadow-sm shadow-yellow-500/50" /> {lang === 'vi' ? 'Thấp' : 'Low'}
        </span>
        <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-gray-400 border-l border-white/10 pl-2">
          ⭕ {lang === 'vi' ? 'Vòng hiển thị 250m' : '250m display ring'}
        </span>
      </div>
    </div>
  );
}
