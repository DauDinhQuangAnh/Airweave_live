import { useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Hospital } from './use-nearby-hospitals';
import { useNavigate } from 'react-router-dom';
import { Navigation, Phone, Compass, MapPin } from 'lucide-react';

interface Props {
  userLat: number;
  userLng: number;
  hospitals: Hospital[];
  selectedHospital?: Hospital | null;
  onSelectHospital?: (h: Hospital) => void;
  radiusMeters?: number;
  lang?: 'vi' | 'en';
}

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;

const tileUrl = MAPBOX_TOKEN
  ? `https://api.mapbox.com/styles/v1/mapbox/dark-v11/tiles/256/{z}/{x}/{y}@2x?access_token=${MAPBOX_TOKEN}`
  : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

const tileAttribution = MAPBOX_TOKEN
  ? '&copy; <a href="https://www.mapbox.com/">Mapbox</a> &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
  : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

const userLocationIcon = new L.DivIcon({
  className: 'user-loc-pin',
  html: `
    <div style="position:relative;width:24px;height:24px;">
      <div style="position:absolute;inset:0;border-radius:50%;background:rgba(59,130,246,0.35);animation:ping 2s cubic-bezier(0,0,0.2,1) infinite;"></div>
      <div style="position:absolute;inset:2px;border-radius:50%;background:#2563eb;border:2.5px solid #ffffff;box-shadow:0 0 12px rgba(59,130,246,0.85);"></div>
    </div>
  `,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

function createHospitalIcon(h: Hospital, isSelected: boolean) {
  const isResp = h.tags.some((t) => t.includes('Hô hấp') || t.includes('Respiratory'));
  const isEmerg = h.tags.some((t) => t.includes('Cấp cứu') || t.includes('Emergency'));

  let emoji = '🏥';
  let bg = '#dc2626';
  let glow = 'rgba(220,38,38,0.6)';

  if (isResp) {
    emoji = '🫁';
    bg = '#b91c1c';
    glow = 'rgba(185,28,28,0.75)';
  } else if (isEmerg) {
    emoji = '🚑';
    bg = '#e11d48';
    glow = 'rgba(225,29,72,0.7)';
  }

  const border = isSelected ? '3px solid #38bdf8' : '2px solid #ffffff';
  const scale = isSelected ? 'scale(1.2)' : 'scale(1)';

  return new L.DivIcon({
    className: 'hospital-marker-pin',
    html: `
      <div style="display:flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:50%;background:${bg};border:${border};box-shadow:0 0 14px ${glow};font-size:16px;transform:${scale};transition:transform 0.2s ease;">
        ${emoji}
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -18],
  });
}

function MapController({
  userLat,
  userLng,
  selectedHospital,
}: {
  userLat: number;
  userLng: number;
  selectedHospital?: Hospital | null;
}) {
  const map = useMap();
  const prevCoordRef = useRef<string>('');

  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 150);
    return () => clearTimeout(t);
  }, [map]);

  useEffect(() => {
    if (selectedHospital) {
      const coordKey = `h-${selectedHospital.lat.toFixed(5)},${selectedHospital.lng.toFixed(5)}`;
      if (prevCoordRef.current !== coordKey) {
        prevCoordRef.current = coordKey;
        map.flyTo([selectedHospital.lat, selectedHospital.lng], 15, { duration: 1.2 });
      }
    }
  }, [selectedHospital, map]);

  return null;
}

export default function HospitalsMap({
  userLat,
  userLng,
  hospitals,
  selectedHospital,
  onSelectHospital,
  radiusMeters = 10000,
  lang = 'vi',
}: Props) {
  const navigate = useNavigate();

  return (
    <div className="relative w-full h-full min-h-[480px] rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-[#090d16]">
      <MapContainer
        center={[userLat, userLng]}
        zoom={13}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution={tileAttribution}
          url={tileUrl}
          tileSize={256}
          zoomOffset={0}
        />

        {/* Search radius circle */}
        <Circle
          center={[userLat, userLng]}
          radius={radiusMeters}
          pathOptions={{
            color: '#ef4444',
            weight: 1.5,
            fillOpacity: 0.03,
            dashArray: '6 6',
          }}
        />

        {/* Immediate 500m proximity circle */}
        <Circle
          center={[userLat, userLng]}
          radius={500}
          pathOptions={{
            color: '#3b82f6',
            weight: 1,
            fillColor: '#3b82f6',
            fillOpacity: 0.12,
          }}
        />

        {/* User GPS Pin */}
        <Marker position={[userLat, userLng]} icon={userLocationIcon}>
          <Popup className="airweave-dark-popup">
            <div className="p-1 text-xs">
              <p className="font-heading font-bold text-sky-400">📍 {lang === 'vi' ? 'Vị trí hiện tại của bạn' : 'Your current location'}</p>
              <p className="text-gray-300 text-[11px] font-mono mt-0.5">
                {userLat.toFixed(4)}, {userLng.toFixed(4)}
              </p>
            </div>
          </Popup>
        </Marker>

        {/* Hospital Markers */}
        {hospitals.map((h) => {
          const isSelected = selectedHospital?.id === h.id;
          return (
            <Marker
              key={h.id}
              position={[h.lat, h.lng]}
              icon={createHospitalIcon(h, isSelected)}
              eventHandlers={{
                click: () => onSelectHospital?.(h),
              }}
            >
              <Popup className="airweave-dark-popup" maxWidth={320}>
                <div className="p-1 space-y-2 font-body text-gray-200">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] uppercase font-bold text-red-400 tracking-wider">
                        🏥 {lang === 'vi' ? 'Cơ sở y tế' : 'Medical facility'}
                      </span>
                      <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/30">
                        {h.distanceKm.toFixed(2)} km
                      </span>
                    </div>
                    <h4 className="font-heading font-bold text-sm text-white mt-1 leading-snug">
                      {h.name}
                    </h4>
                    {h.address && (
                      <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">
                        📍 {h.address}
                      </p>
                    )}
                  </div>

                  {/* Tags */}
                  {h.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {h.tags.map((t) => (
                        <span
                          key={t}
                          className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/15 text-red-300 border border-red-500/30"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() =>
                        window.open(
                          `https://www.google.com/maps/dir/?api=1&destination=${h.lat},${h.lng}&travelmode=driving`,
                          '_blank'
                        )
                      }
                      className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 text-xs font-heading font-semibold border border-sky-500/40 transition-all"
                    >
                      <Navigation className="w-3 h-3" /> {lang === 'vi' ? 'Chỉ đường' : 'Directions'}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        navigate(
                          `/smart-route?destLat=${h.lat}&destLng=${h.lng}&destName=${encodeURIComponent(
                            h.name
                          )}`
                        )
                      }
                      className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-heading font-semibold border border-emerald-500/40 transition-all"
                    >
                      🌿 {lang === 'vi' ? 'Lộ trình sạch' : 'Clean route'}
                    </button>
                  </div>

                  {h.phone && (
                    <a
                      href={`tel:${h.phone}`}
                      className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-red-600/30 hover:bg-red-600/40 text-red-200 text-xs font-heading font-bold border border-red-500/50 transition-all text-center"
                    >
                      <Phone className="w-3 h-3" /> {lang === 'vi' ? 'Gọi cơ sở' : 'Call facility'} ({h.phone})
                    </a>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}

        <MapController
          userLat={userLat}
          userLng={userLng}
          selectedHospital={selectedHospital}
        />
      </MapContainer>

      {/* Floating Legend / Status Badge */}
      <div className="absolute top-3 left-3 z-[1000] flex flex-wrap items-center gap-2 pointer-events-none">
        <div className="px-3 py-1.5 rounded-xl bg-[#090d16]/90 backdrop-blur-md border border-white/15 text-xs text-gray-300 shadow-xl flex items-center gap-2 pointer-events-auto">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
          <span className="font-heading font-bold text-white text-[11px]">{lang === 'vi' ? 'Bản Đồ Cấp Cứu' : 'Emergency Map'}</span>
          <span className="text-gray-500">|</span>
          <span className="text-[11px] text-gray-400">{hospitals.length} {lang === 'vi' ? `BV trong bán kính ${radiusMeters / 1000}km` : `facilities within ${radiusMeters / 1000}km`}</span>
        </div>
      </div>

      {/* Mapbox attribution pill bottom-left */}
      <div className="absolute bottom-3 left-3 z-[1000] px-3 py-1.5 rounded-xl bg-[#090d16]/90 backdrop-blur-md border border-white/10 text-[11px] text-gray-400 flex items-center gap-3">
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> {lang === 'vi' ? 'Vị trí của bạn' : 'Your location'}
        </span>
        <span className="flex items-center gap-1">
          <span>🫁</span> {lang === 'vi' ? 'Hô hấp' : 'Respiratory'}
        </span>
        <span className="flex items-center gap-1">
          <span>🚑</span> {lang === 'vi' ? 'Có thông tin cấp cứu' : 'Emergency listed'}
        </span>
      </div>

      {/* Dark Leaflet Popup Scoped Styles */}
      <style>{`
        .airweave-dark-popup .leaflet-popup-content-wrapper {
          background: rgba(9, 13, 22, 0.95) !important;
          backdrop-filter: blur(16px) !important;
          border: 1px solid rgba(255, 255, 255, 0.15) !important;
          border-radius: 16px !important;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.7), 0 10px 10px -5px rgba(0, 0, 0, 0.04) !important;
          color: #f1f5f9 !important;
        }
        .airweave-dark-popup .leaflet-popup-tip {
          background: rgba(9, 13, 22, 0.95) !important;
          border: 1px solid rgba(255, 255, 255, 0.15) !important;
        }
        .airweave-dark-popup .leaflet-popup-close-button {
          color: #94a3b8 !important;
          padding: 6px 10px !important;
        }
        .airweave-dark-popup .leaflet-popup-close-button:hover {
          color: #ffffff !important;
        }
      `}</style>
    </div>
  );
}
