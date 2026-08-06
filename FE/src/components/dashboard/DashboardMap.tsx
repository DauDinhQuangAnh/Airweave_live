import { useRef, useEffect, useCallback, useState } from 'react';
import { useWindyKey } from '@/hooks/use-windy-key';
import { useWindyMap, WindyOverlay } from '@/hooks/use-windy-map';
import type { GeoLocation } from '@/hooks/use-geolocation';
import WindBoomerangLoader from '@/components/WindBoomerangLoader';
import { Wind, CloudRain, Thermometer, Sparkles, Info } from 'lucide-react';
import { PAMStation, getAQIColorNew, getAQIStatusVi } from '@/lib/pam-stations';
import MicroAirLayer from '@/components/map/MicroAirLayer';

declare global {
  interface Window {
    windyInit: (options: any, callback: (api: any) => void) => void;
    L: any;
  }
}

interface Props {
  stations: PAMStation[];
  activeStationId: string | null;
  onSelectStation: (station: PAMStation) => void;
  lang: 'vi' | 'en';
  userLocation: GeoLocation;
}

// Each overlay has to answer the question: "What air-quality decision does
// this help me make right now?" — surfaced in the UI as a one-liner.
const OVERLAY_INFO: Record<WindyOverlay, { icon: typeof Wind; label: string; purpose: string }> = {
  wind:        { icon: Wind,       label: 'Gió',     purpose: 'Dự đoán hướng khói bụi đang trôi tới — đứng đầu gió để tránh nguồn ô nhiễm.' },
  rainClouds:  { icon: CloudRain,  label: 'Mưa',     purpose: 'Mưa rửa trôi bụi mịn PM2.5 — hoãn việc ra ngoài tới sau cơn mưa để hít khí sạch hơn.' },
  temp:        { icon: Thermometer,label: 'Nhiệt',   purpose: 'Nhiệt thấp + lặng gió = nghịch nhiệt, bụi tích tụ sát mặt đất. Cảnh báo sáng sớm mùa lạnh.' },
  pm2p5:       { icon: Sparkles,   label: 'PM2.5',   purpose: 'Lớp dự báo PM2.5 toàn vùng — so sánh khu bạn ở với khu lân cận trước khi di chuyển.' },
  pressure:    { icon: Info,       label: 'Áp suất', purpose: 'Áp cao ổn định giữ bụi sát đất; áp thấp + gió mạnh giúp khuếch tán nhanh.' },
};

const DashboardMap = ({ stations, activeStationId, onSelectStation, lang, userLocation: location }: Props) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<any[]>([]);
  const popupRef = useRef<any>(null);
  const { key: windyKey, loading: keyLoading, error: keyError } = useWindyKey();
  const [heatmapOn, setHeatmapOn] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { mapReady, leafletMap, panTo, activeOverlay, setActiveOverlay } = useWindyMap(
    mapContainerRef,
    { windyKey, lat: location.lat, lng: location.lng, lang }
  );

  // Pan to user location
  useEffect(() => {
    if (mapReady && !location.loading) {
      panTo(location.lat, location.lng, 11);
    }
  }, [location.lat, location.lng, location.loading, mapReady, panTo]);

  // Add station markers
  useEffect(() => {
    if (!mapReady || !leafletMap || !window.L) return;
    const L = window.L;
    const map = leafletMap;

    // Clear old markers
    markersRef.current.forEach(m => {
      try { map.removeLayer(m); } catch {}
    });
    markersRef.current = [];

    stations.forEach(s => {
      const color = getAQIColorNew(s.aqi);
      const isActive = s.id === activeStationId;

      const icon = L.divIcon({
        className: '',
        html: `<div style="
          display:flex;align-items:center;gap:4px;
          padding:4px 10px;border-radius:12px;
          background:rgba(3,8,15,0.85);
          border:1px solid ${isActive ? '#00d4aa' : 'rgba(255,255,255,0.1)'};
          backdrop-filter:blur(8px);
          box-shadow:0 0 12px ${color}30;
          cursor:pointer;white-space:nowrap;
          font-family:'DM Sans',sans-serif;
        ">
          <span style="width:6px;height:6px;border-radius:50%;background:${color};box-shadow:0 0 6px ${color}"></span>
          <span style="font-size:11px;font-weight:700;color:${color};font-family:'Syne',sans-serif">${s.aqi}</span>
          <span style="font-size:10px;color:rgba(255,255,255,0.5)">${s.district}</span>
        </div>`,
        iconSize: [0, 0],
        iconAnchor: [50, 12],
      });

      const marker = L.marker([s.lat, s.lng], { icon }).addTo(map);
      marker.on('click', () => {
        onSelectStation(s);
        panTo(s.lat, s.lng, 13);

        // Show popup
        if (popupRef.current) {
          try { map.removeLayer(popupRef.current); } catch {}
        }
        const popup = L.popup({
          closeButton: true,
          className: 'aqi-popup',
          maxWidth: 260,
        })
          .setLatLng([s.lat, s.lng])
          .setContent(`
            <div style="font-family:'Montserrat',sans-serif;padding:8px;background:rgba(3,8,15,0.95);border-radius:12px;color:white;min-width:200px">
              <div style="font-weight:700;font-size:14px;margin-bottom:4px">${s.district}, ${s.city}</div>
              <div style="font-size:36px;font-weight:800;color:${color};text-shadow:0 0 20px ${color}40">${s.aqi}</div>
              <div style="font-size:11px;color:rgba(255,255,255,0.5);margin-bottom:8px">${getAQIStatusVi(s.aqi)}</div>
              <div style="font-size:10px;color:rgba(255,255,255,0.55);line-height:1.5">
                ${s.pm25 != null ? `PM2.5: <b>${s.pm25}</b> µg/m³<br/>` : ''}
                ${s.pm10 != null ? `PM10: <b>${s.pm10}</b> µg/m³<br/>` : ''}
                ${s.temp != null ? `Nhiệt: <b>${s.temp}</b>°C<br/>` : ''}
                <span style="color:rgba(255,255,255,0.4)">Nguồn: trạm WAQI #${s.id.replace('WAQI-','')}${s.time ? ' · ' + new Date(s.time).toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'}) : ''}</span>
              </div>
            </div>
          `)
          .openOn(map);
        popupRef.current = popup;
      });

      markersRef.current.push(marker);
    });
  }, [mapReady, leafletMap, stations, activeStationId, onSelectStation, panTo]);

  // Fly to active station
  useEffect(() => {
    if (!mapReady || !activeStationId) return;
    const station = stations.find(s => s.id === activeStationId);
    if (station) {
      panTo(station.lat, station.lng, 13);
    }
  }, [activeStationId, mapReady, panTo, stations]);

  const flyToHCM = useCallback(() => panTo(10.7769, 106.7009, 11), [panTo]);
  const flyToHN = useCallback(() => panTo(21.0285, 105.8542, 11), [panTo]);
  const flyToCurrentLocation = useCallback(() => {
    if (location.loading) return;
    panTo(location.lat, location.lng, location.status === 'active' || location.status === 'manual' ? 15 : 11);
  }, [location.lat, location.lng, location.loading, location.status, panTo]);

  if (keyLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#0a1628]">
        <WindBoomerangLoader text={lang === 'vi' ? 'Đang tải bản đồ...' : 'Loading map...'} />
      </div>
    );
  }

  if (keyError || !windyKey) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#0a1628] p-6">
        <div className="glass-morphism rounded-xl p-8 text-center max-w-md">
          <Wind className="w-12 h-12 text-white/30 mx-auto mb-4" />
          <h3 className="font-heading text-lg font-bold text-white/80 mb-2">
            {lang === 'vi' ? 'Chưa cấu hình Windy API' : 'Windy API not configured'}
          </h3>
          <p className="text-sm text-white/40 font-body">
            {lang === 'vi' ? 'Cần WINDY_API_KEY để hiển thị bản đồ.' : 'WINDY_API_KEY required.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 relative min-w-0 overflow-hidden">
      {/* Search bar with live results */}
      <div className="absolute top-4 left-4 right-4 z-[1000] flex gap-2">
        <div className="flex-1 relative">
          <div className="glass-morphism rounded-xl px-4 py-2.5 flex items-center gap-2">
            <span className="text-white/30">🔍</span>
            <input
              type="text"
              placeholder="Tìm quận, phường, trạm đo..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  const q = searchQuery.trim().toLowerCase();
                  const hit = stations.find(s =>
                    s.district.toLowerCase().includes(q) ||
                    s.city.toLowerCase().includes(q) ||
                    s.id.toLowerCase().includes(q)
                  );
                  if (hit) { onSelectStation(hit); panTo(hit.lat, hit.lng, 14); setSearchQuery(''); }
                }
              }}
              className="bg-transparent text-sm font-body text-white/70 placeholder:text-white/30 outline-none w-full"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-white/40 hover:text-white/70 text-xs">✕</button>
            )}
          </div>
          {searchQuery.trim() && (() => {
            const q = searchQuery.trim().toLowerCase();
            const hits = stations.filter(s =>
              s.district.toLowerCase().includes(q) ||
              s.city.toLowerCase().includes(q) ||
              s.id.toLowerCase().includes(q)
            ).slice(0, 6);
            return (
              <div className="absolute left-0 right-0 top-full mt-1 glass-morphism rounded-xl overflow-hidden shadow-xl border border-white/10 max-h-64 overflow-y-auto">
                {hits.length === 0 ? (
                  <div className="px-4 py-3 text-xs text-white/40">Không tìm thấy quận/trạm phù hợp</div>
                ) : hits.map(s => {
                  const c = getAQIColorNew(s.aqi);
                  return (
                    <button
                      key={s.id}
                      onClick={() => { onSelectStation(s); panTo(s.lat, s.lng, 14); setSearchQuery(''); }}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-white/10 text-left"
                    >
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: c, boxShadow: `0 0 6px ${c}` }} />
                      <span className="flex-1 text-xs text-white/80 truncate">{s.district} <span className="text-white/40">· {s.city}</span></span>
                      <span className="text-xs font-bold" style={{ color: c }}>{s.aqi}</span>
                    </button>
                  );
                })}
              </div>
            );
          })()}
        </div>
        <button
          onClick={() => setHeatmapOn(h => !h)}
          className={`glass-morphism rounded-xl px-3 py-2.5 text-sm transition-all ${heatmapOn ? 'bg-white/10 border-[#00d4aa]/30' : 'hover:bg-white/[0.07]'}`}
          title={lang === 'vi' ? 'Vi vùng Open-Meteo' : 'Open-Meteo micro air'}
        >
          🔥
        </button>
        <button
          onClick={flyToCurrentLocation}
          disabled={location.loading}
          className="glass-morphism rounded-xl px-3 py-2.5 text-sm transition-all hover:bg-white/[0.07] disabled:opacity-50 disabled:cursor-not-allowed"
          title={lang === 'vi' ? 'Vị trí hiện tại' : 'Current location'}
        >
          📍
        </button>
      </div>

      {/* Windy map container */}
      <div id="windy" ref={mapContainerRef} className="windy-map-container absolute inset-0" />
      {mapReady && (
        <MicroAirLayer
          leafletMap={leafletMap}
          enabled={heatmapOn}
          lang={lang}
        />
      )}

      {/* Loading overlay */}
      {!mapReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0a1628]/80 z-20">
          <WindBoomerangLoader text={lang === 'vi' ? 'Đang khởi tạo Windy...' : 'Initializing Windy...'} />
        </div>
      )}

      {/* Windy overlay switcher — each layer answers a real air-quality question */}
      <div className="absolute top-20 right-4 z-[1000] glass-morphism rounded-xl p-2 w-[210px]">
        <p className="text-[9px] font-heading font-bold text-white/40 uppercase tracking-wider mb-1.5 px-1">
          Lớp bản đồ Windy
        </p>
        <div className="grid grid-cols-2 gap-1">
          {(Object.keys(OVERLAY_INFO) as WindyOverlay[]).map(key => {
            const info = OVERLAY_INFO[key];
            const Icon = info.icon;
            const active = activeOverlay === key;
            return (
              <button
                key={key}
                onClick={() => setActiveOverlay(key)}
                className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-heading font-semibold transition-all ${
                  active
                    ? 'bg-[#00d4aa]/20 text-[#00d4aa] border border-[#00d4aa]/40'
                    : 'bg-white/5 text-white/55 border border-white/5 hover:bg-white/10 hover:text-white/80'
                }`}
              >
                <Icon className="w-3 h-3" />
                {info.label}
              </button>
            );
          })}
        </div>
        <p className="mt-2 px-1 text-[9.5px] leading-tight font-body text-white/55">
          {OVERLAY_INFO[activeOverlay]?.purpose}
        </p>
      </div>

      {/* Map controls */}
      <div className="absolute bottom-4 right-4 z-[1000] flex flex-col gap-2">
        <button onClick={() => { const m = leafletMap; if (m) m.setZoom((m.getZoom?.() || 10) + 1); }} className="glass-morphism w-9 h-9 rounded-xl flex items-center justify-center text-sm text-white/50 hover:text-white/70">+</button>
        <button onClick={() => { const m = leafletMap; if (m) m.setZoom((m.getZoom?.() || 10) - 1); }} className="glass-morphism w-9 h-9 rounded-xl flex items-center justify-center text-sm text-white/50 hover:text-white/70">−</button>
        <button onClick={flyToHCM} className="glass-morphism w-9 h-9 rounded-xl flex items-center justify-center text-sm text-white/50 hover:text-white/70" title="TP.HCM">🏙️</button>
        <button onClick={flyToHN} className="glass-morphism w-9 h-9 rounded-xl flex items-center justify-center text-sm text-white/50 hover:text-white/70" title="Hà Nội">🏛️</button>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-[1000] glass-morphism rounded-xl p-3">
        <p className="text-[10px] font-heading font-bold text-white/40 mb-1">Thang AQI</p>
        <div className="w-40 h-2 rounded-full" style={{ background: 'linear-gradient(to right, #22c55e, #eab308, #f97316, #ef4444, #7c3aed)' }} />
        <div className="flex justify-between mt-1">
          <span className="text-[8px] font-body text-white/30">0 Tốt</span>
          <span className="text-[8px] font-body text-white/30">100</span>
          <span className="text-[8px] font-body text-white/30">200</span>
          <span className="text-[8px] font-body text-white/30">300+</span>
        </div>
      </div>
    </div>
  );
};

export default DashboardMap;
