import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const greenIcon = new L.DivIcon({
  className: '',
  html: `<div style="width:18px;height:18px;border-radius:50%;background:#22c55e;border:3px solid white;box-shadow:0 0 8px rgba(0,0,0,.3)"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});
const redIcon = new L.DivIcon({
  className: '',
  html: `<div style="width:18px;height:18px;border-radius:50%;background:#ef4444;border:3px solid white;box-shadow:0 0 8px rgba(0,0,0,.3)"></div>`,
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
    if (bounds) map.fitBounds(bounds, { padding: [40, 40] });
  }, [bounds, map]);
  return null;
}

export default function RouteMap({ from, to, cleanSegments, fastGeo, dangerZones = [] }: RouteMapProps) {
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
    <div className="rounded-xl overflow-hidden border border-border relative" style={{ height: 320 }}>
      <MapContainer
        center={[from[1], from[0]]}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {fastLatLngs.length > 0 && (
          <Polyline
            positions={fastLatLngs}
            pathOptions={{ color: '#94a3b8', weight: 4, opacity: 0.5, dashArray: '8 6' }}
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
            pathOptions={{ color: '#dc2626', fillColor: '#dc2626', fillOpacity: 0.25, weight: 2 }}
          />
        ))}
        <Marker position={[from[1], from[0]]} icon={greenIcon} />
        <Marker position={[to[1], to[0]]} icon={redIcon} />
        <FitBounds bounds={bounds} />
      </MapContainer>
      {/* Legend */}
      <div className="absolute bottom-2 left-2 z-[400] bg-background/90 backdrop-blur-sm rounded-lg px-2 py-1.5 text-[10px] font-body border border-border flex items-center gap-2 flex-wrap max-w-[calc(100%-1rem)]">
        <span className="font-heading font-bold uppercase tracking-wider mr-1">PM2.5</span>
        {[
          { c: '#22c55e', l: '≤12' },
          { c: '#eab308', l: '35' },
          { c: '#f97316', l: '55' },
          { c: '#ef4444', l: '150' },
          { c: '#a855f7', l: '+' },
        ].map((x) => (
          <span key={x.c} className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: x.c }} />
            {x.l}
          </span>
        ))}
        {dangerZones.length > 0 && (
          <span className="flex items-center gap-1 ml-1 text-destructive font-heading font-semibold">
            <span className="w-2.5 h-2.5 rounded-full border-2 border-destructive" />
            {dangerZones.length} cảnh báo
          </span>
        )}
      </div>
    </div>
  );
}
