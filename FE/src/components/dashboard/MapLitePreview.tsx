import { useMemo } from 'react';
import { Sparkles } from 'lucide-react';
import { PAMStation, getAQIColorNew } from '@/lib/pam-stations';

interface Props {
  stations: PAMStation[];
  activeStationId: string | null;
  onSelectStation: (s: PAMStation) => void;
  onActivate: () => void;
}

/**
 * Lite preview: stylized static-map background with PAM Air station pins
 * positioned by normalized lat/lng. Tapping a pin selects the station;
 * the CTA promotes the user to the full interactive Windy map.
 */
const MapLitePreview = ({ stations, activeStationId, onSelectStation, onActivate }: Props) => {
  // Group by city so HCM and HN stay visually distinct on the same preview
  const positioned = useMemo(() => {
    if (stations.length === 0) return [];
    const lats = stations.map(s => s.lat);
    const lngs = stations.map(s => s.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const latSpan = Math.max(maxLat - minLat, 0.001);
    const lngSpan = Math.max(maxLng - minLng, 0.001);

    return stations.map(s => {
      // Padding inside the box so pins don't sit on the edge
      const x = 8 + ((s.lng - minLng) / lngSpan) * 84;
      const y = 8 + (1 - (s.lat - minLat) / latSpan) * 80;
      return { station: s, x, y };
    });
  }, [stations]);

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#06121f]">
      {/* Static map-like backdrop */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 30% 35%, rgba(0,212,170,0.18), transparent 55%),' +
            'radial-gradient(ellipse at 75% 70%, rgba(124,58,237,0.15), transparent 50%),' +
            'linear-gradient(135deg, #051321 0%, #0a1d33 55%, #0b2740 100%)',
        }}
      />
      {/* Grid lines suggest a map */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.18]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="map-grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="0.5" />
          </pattern>
          <pattern id="map-grid-major" width="160" height="160" patternUnits="userSpaceOnUse">
            <path d="M 160 0 L 0 0 0 160" fill="none" stroke="rgba(0,212,170,0.35)" strokeWidth="0.8" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#map-grid)" />
        <rect width="100%" height="100%" fill="url(#map-grid-major)" />
      </svg>

      {/* Faux wind streaks (Windy hint) */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-35" viewBox="0 0 400 300" preserveAspectRatio="none">
        {Array.from({ length: 7 }).map((_, i) => (
          <path
            key={i}
            d={`M ${-20} ${30 + i * 38} Q ${120} ${10 + i * 38}, ${260} ${50 + i * 38} T ${440} ${30 + i * 38}`}
            stroke="rgba(120,200,255,0.35)"
            strokeWidth="0.7"
            fill="none"
            strokeDasharray="3 6"
          />
        ))}
      </svg>

      {/* Station pins */}
      {positioned.map(({ station, x, y }) => {
        const color = getAQIColorNew(station.aqi);
        const isActive = station.id === activeStationId;
        return (
          <button
            key={station.id}
            type="button"
            onClick={() => onSelectStation(station)}
            className="absolute -translate-x-1/2 -translate-y-full group focus:outline-none"
            style={{ left: `${x}%`, top: `${y}%` }}
            aria-label={`${station.district} AQI ${station.aqi}`}
          >
            <div
              className={`flex items-center gap-1 px-2 py-1 rounded-lg border transition-all ${
                isActive
                  ? 'bg-[rgba(3,8,15,0.95)] border-[#00d4aa] scale-110'
                  : 'bg-[rgba(3,8,15,0.8)] border-white/10 hover:scale-105 hover:border-white/30'
              }`}
              style={{ boxShadow: `0 0 14px ${color}55` }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: color, boxShadow: `0 0 6px ${color}` }}
              />
              <span className="font-heading text-[10px] font-bold leading-none" style={{ color }}>
                {station.aqi}
              </span>
              <span className="text-[9px] font-body text-white/55 leading-none">{station.district}</span>
            </div>
            <div
              className="w-2 h-2 rounded-full mx-auto -mt-0.5 border border-white/20"
              style={{ background: color }}
            />
          </button>
        );
      })}

      {/* City labels */}
      <div className="absolute top-2 left-3 text-[10px] font-body text-white/30 uppercase tracking-wider">
        Lite View · Trạm WAQI thật
      </div>
      <div className="absolute top-2 right-3 flex items-center gap-1 text-[10px] font-body text-white/40">
        <span className="w-1.5 h-1.5 rounded-full bg-[#00d4aa] animate-pulse" />
        {stations.length} trạm
      </div>

      {stations.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center text-white/40 text-xs font-body">
            <Sparkles className="w-5 h-5 mx-auto mb-1 opacity-60" />
            Đang tải trạm WAQI thật…
          </div>
        </div>
      )}

      {/* Smart CTA */}
      <div className="absolute bottom-3 inset-x-3 flex justify-center pointer-events-none">
        <button
          type="button"
          onClick={onActivate}
          className="pointer-events-auto group inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-gradient-to-r from-[#00d4aa] to-[#22d3ee] text-[#031019] font-heading text-xs font-bold shadow-[0_10px_30px_-10px_rgba(0,212,170,0.7)] hover:shadow-[0_14px_36px_-10px_rgba(0,212,170,0.9)] hover:-translate-y-0.5 transition-all"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Xem bản đồ trực quan (Real-time)
          <span className="opacity-70 group-hover:translate-x-0.5 transition-transform">→</span>
        </button>
      </div>
    </div>
  );
};

export default MapLitePreview;
