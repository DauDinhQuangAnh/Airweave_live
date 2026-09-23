import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;

const tileUrl = MAPBOX_TOKEN
  ? `https://api.mapbox.com/styles/v1/mapbox/dark-v11/tiles/256/{z}/{x}/{y}@2x?access_token=${MAPBOX_TOKEN}`
  : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

const tileAttribution = MAPBOX_TOKEN
  ? '&copy; <a href="https://www.mapbox.com/">Mapbox</a> &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
  : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

const greenIcon = new L.DivIcon({
  className: '',
  html: `<div style="width:18px;height:18px;border-radius:50%;background:#22c55e;border:3px solid white;box-shadow:0 0 8px rgba(0,0,0,.5)"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const redIcon = new L.DivIcon({
  className: '',
  html: `<div style="width:18px;height:18px;border-radius:50%;background:#ef4444;border:3px solid white;box-shadow:0 0 8px rgba(0,0,0,.5)"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

export interface RouteSegment {
  coords: [number, number][]; // [lng, lat]
  pm25: number; // adjusted (effective) PM2.5
}

export interface DangerZone {
  lat: number;
  lng: number;
  count: number;
  reason: string;
}

interface RouteMapProps {
  from: [number, number];
  to: [number, number];
  cleanSegments: RouteSegment[];
  fastGeo: { coordinates: [number, number][] } | null;
  dangerZones?: DangerZone[];
  className?: string;
  style?: React.CSSProperties;
}

function pm25Color(pm25: number): string {
  if (pm25 <= 12) return '#22c55e';
  if (pm25 <= 35) return '#eab308';
  if (pm25 <= 55) return '#f97316';
  if (pm25 <= 150) return '#ef4444';
  return '#a855f7';
}

function FitBounds({ bounds }: { bounds: L.LatLngBoundsExpression | null }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [bounds, map]);
  return null;
}

export default function RouteMap({
  from,
  to,
  cleanSegments,
  fastGeo,
  dangerZones = [],
  className = '',
  style,
}: RouteMapProps) {
  const fastLatLngs: L.LatLngTuple[] = useMemo(
    () => (fastGeo?.coordinates || []).map(([lng, lat]) => [lat, lng] as L.LatLngTuple),
    [fastGeo]
  );

  const segmentLatLngs = useMemo(
    () =>
      cleanSegments.map((seg) => ({
        positions: seg.coords.map(([lng, lat]) => [lat, lng] as L.LatLngTuple),
        color: pm25Color(seg.pm25),
        pm25: seg.pm25,
      })),
    [cleanSegments]
  );

  const bounds: L.LatLngBoundsExpression | null = useMemo(() => {
    const all: L.LatLngTuple[] = [...fastLatLngs];
    segmentLatLngs.forEach((s) => all.push(...s.positions));
    if (all.length === 0) return null;
    return L.latLngBounds(all);
  }, [segmentLatLngs, fastLatLngs]);

  return (
    <div
      className={`rounded-2xl overflow-hidden border border-sky-500/20 relative shadow-xl bg-[#09111e] ${className}`}
      style={{ minHeight: 480, height: '100%', ...style }}
    >
      <MapContainer
        center={[from[1], from[0]]}
        zoom={13}
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
        {fastLatLngs.length > 0 && (
          <Polyline
            positions={fastLatLngs}
            pathOptions={{ color: '#94a3b8', weight: 4, opacity: 0.6, dashArray: '8 6' }}
          />
        )}
        {segmentLatLngs.map((seg, i) => (
          <Polyline
            key={i}
            positions={seg.positions}
            pathOptions={{ color: seg.color, weight: 6, opacity: 0.95 }}
          />
        ))}
        {dangerZones.map((dz, i) => (
          <Circle
            key={`dz-${i}`}
            center={[dz.lat, dz.lng]}
            radius={300}
            pathOptions={{ color: '#dc2626', fillColor: '#ef4444', fillOpacity: 0.35, weight: 2 }}
          />
        ))}
        <Marker position={[from[1], from[0]]} icon={greenIcon} />
        <Marker position={[to[1], to[0]]} icon={redIcon} />
        <FitBounds bounds={bounds} />
      </MapContainer>

      {/* Modern Legend */}
      <div className="absolute bottom-3 left-3 z-[400] bg-[#07111F]/90 backdrop-blur-md rounded-xl px-3 py-2 text-xs font-body border border-sky-500/25 shadow-lg flex items-center gap-2.5 flex-wrap max-w-[calc(100%-1.5rem)] text-slate-200">
        <span className="font-heading font-bold text-sky-400">PM2.5:</span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#22c55e] inline-block shadow-sm" /> ≤12
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#eab308] inline-block shadow-sm" /> 35
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#f97316] inline-block shadow-sm" /> 55
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444] inline-block shadow-sm" /> 150
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#a855f7] inline-block shadow-sm" /> 150+
        </span>
        {dangerZones.length > 0 && (
          <span className="inline-flex items-center gap-1.5 border-l border-slate-700 pl-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#dc2626] border border-white inline-block shadow-sm" /> Cảnh báo
          </span>
        )}
      </div>
    </div>
  );
}
