import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface Hospital {
  id: number;
  name: string;
  lat: number;
  lng: number;
  distanceKm: number;
  tags: string[];
}

interface Props {
  userLat: number;
  userLng: number;
  hospitals: Hospital[];
}

const userIcon = new L.DivIcon({
  className: '',
  html: `<div style="width:20px;height:20px;border-radius:50%;background:#3b82f6;border:3px solid white;box-shadow:0 0 0 4px rgba(59,130,246,.35);"></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

function hospitalIcon(priority: boolean) {
  const bg = priority ? '#dc2626' : '#ef4444';
  return new L.DivIcon({
    className: '',
    html: `<div style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:50%;background:${bg};border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,.35);font-size:14px;">🏥</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function FitBounds({ bounds }: { bounds: L.LatLngBoundsExpression | null }) {
  const map = useMap();
  useEffect(() => {
    // Force size recalculation — react-leaflet inside tabs/flex containers
    // sometimes initializes with 0px height.
    const t1 = setTimeout(() => map.invalidateSize(), 50);
    const t2 = setTimeout(() => map.invalidateSize(), 300);
    if (bounds) {
      setTimeout(() => {
        try {
          map.fitBounds(bounds, { padding: [30, 30], maxZoom: 14 });
        } catch {}
      }, 350);
    }
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [bounds, map]);
  return null;
}

export default function HospitalsMap({ userLat, userLng, hospitals }: Props) {
  const bounds = useMemo<L.LatLngBoundsExpression | null>(() => {
    const pts: L.LatLngTuple[] = [
      [userLat, userLng],
      ...hospitals.map((h) => [h.lat, h.lng] as L.LatLngTuple),
    ];
    if (pts.length < 2) return null;
    return L.latLngBounds(pts);
  }, [userLat, userLng, hospitals]);

  return (
    <div className="rounded-xl overflow-hidden border border-border h-72 relative bg-muted">
      <MapContainer
        center={[userLat, userLng]}
        zoom={13}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {/* 15km search radius */}
        <Circle
          center={[userLat, userLng]}
          radius={15000}
          pathOptions={{ color: '#10b981', weight: 1, fillOpacity: 0.04, dashArray: '6 6' }}
        />
        <Circle center={[userLat, userLng]} radius={300} pathOptions={{ color: '#3b82f6', fillOpacity: 0.15 }} />
        <Marker position={[userLat, userLng]} icon={userIcon}>
          <Popup>📍 Vị trí của bạn</Popup>
        </Marker>
        {hospitals.map((h) => (
          <Marker
            key={h.id}
            position={[h.lat, h.lng]}
            icon={hospitalIcon(h.tags.includes('🫁 Hô hấp') || h.tags.includes('🏥 BV lớn'))}
          >
            <Popup>
              <div className="space-y-1">
                <p className="font-bold text-sm">{h.name}</p>
                <p className="text-xs">{h.distanceKm.toFixed(2)} km</p>
                {h.tags.length > 0 && <p className="text-xs">{h.tags.join(' · ')}</p>}
                <a
                  className="text-xs text-blue-600 underline"
                  href={`https://www.google.com/maps/dir/?api=1&destination=${h.lat},${h.lng}&travelmode=driving`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Chỉ đường →
                </a>
              </div>
            </Popup>
          </Marker>
        ))}
        <FitBounds bounds={bounds} />
      </MapContainer>
    </div>
  );
}
