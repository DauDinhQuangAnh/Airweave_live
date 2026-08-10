import { lazy, Suspense, useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { Bell, Map, BarChart3, Route, AlertTriangle, Loader2, Megaphone, Database, ShieldAlert, Sparkles, RefreshCw } from 'lucide-react';
import { useLiveAirContext } from '@/contexts/live-air-context';
import { PAMStation } from '@/lib/pam-stations';
import { useWaqiStations } from '@/hooks/use-waqi-stations';
import PAMAirSummary from '@/components/dashboard/PAMAirSummary';
import NodeProximityBadge from '@/components/NodeProximityBadge';
import NearbyNodesMapWidget from '@/components/dashboard/NearbyNodesMapWidget';
import PersonalizedAQIGuidance from '@/components/PersonalizedAQIGuidance';
import PrivacyStatusBadges from '@/components/PrivacyStatusBadges';
import AuroraBackground from '@/components/AuroraBackground';
import AQITicker, { buildCurrentAirTickerItems } from '@/components/landing/AQITicker';
import { trackBehavior } from '@/lib/behavior-analytics';

export default function Dashboard() {
  const { lang } = useOutletContext<{ lang: 'vi' | 'en' }>();
  const { location, weather, refreshData, proximityNode, proximityDistance } = useLiveAirContext();
  const navigate = useNavigate();
  const { stations, loading: stationsLoading, refresh: refreshStations } = useWaqiStations();
  const [notifCount, setNotifCount] = useState(0);

  const handleRefresh = useCallback(() => {
    void refreshData();
    void refreshStations();
    trackBehavior('aqi_checked_near_me');
  }, [refreshData, refreshStations]);

  useEffect(() => {
    trackBehavior('aqi_checked_near_me');
  }, []);

  const tabs = [
    { id: 'map' as const, icon: Map, label: 'Bản đồ Vi vùng AQI', path: '/map' },
    { id: 'route' as const, icon: Route, label: 'Lộ trình Sạch Smart Route', path: '/smart-route' },
    { id: 'sos' as const, icon: ShieldAlert, label: 'Cứu hộ Y tế AirWeave SOS', path: '/sos' },
  ];

  return (
    <div className="min-h-full flex flex-col bg-[#030810] text-white relative overflow-x-hidden font-body">
      <AuroraBackground />

      {/* Top Action Bar (Sub-header) */}
      <div className="relative z-20 h-14 flex items-center px-4 sm:px-6 md:px-8 border-b border-white/10 bg-[#030810]/90 backdrop-blur-md shrink-0 gap-3">
        <div className="flex items-center gap-2 flex-1 overflow-x-auto scrollbar-none">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => navigate(t.path)}
              className="px-3 py-1.5 rounded-xl text-xs font-heading font-semibold transition-all shrink-0 text-white/70 hover:text-white hover:bg-white/10 border border-white/5 hover:border-white/20 inline-flex items-center gap-2"
            >
              <t.icon className="w-4 h-4 text-cyan-400" />
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={handleRefresh}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors"
            title="Làm mới dữ liệu"
          >
            <RefreshCw className={`w-4 h-4 ${weather.loading ? 'animate-spin' : ''}`} />
          </button>

          <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>WAQI REALTIME</span>
          </div>

          <button className="relative p-2 text-white/60 hover:text-white transition-colors" aria-label="Thông báo">
            <Bell className="w-4 h-4" />
            {notifCount > 0 && (
              <span className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-rose-500 text-[9px] text-white flex items-center justify-center font-bold">
                {notifCount > 9 ? '9+' : notifCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Realtime AQI Ticker */}
      <div className="relative z-20 shrink-0">
        <AQITicker
          items={
            (location.status === 'active' || location.status === 'manual') && !weather.loading && !weather.error && weather.aqi > 0
              ? buildCurrentAirTickerItems({
                  locationLabel: location.label,
                  aqi: weather.aqi,
                  pm25: weather.pm25,
                  pm10: weather.pm10,
                  temperature: weather.temperature,
                  humidity: weather.humidity,
                  windSpeed: weather.windSpeed,
                  source: weather.station || (weather.source === 'waqi' ? 'WAQI' : 'Open-Meteo'),
                })
              : []
          }
          loading={location.loading || weather.loading}
          message={
            location.status === 'denied'
              ? 'Đã chặn quyền vị trí GPS.'
              : 'Đang kết nối dữ liệu AQI vị trí hiện tại...'
          }
          animate
        />
      </div>

      {/* High Pollution Alert Banner */}
      {weather.aqi >= 100 && !weather.loading && (
        <button
          type="button"
          onClick={() => navigate('/smart-route?alert=1')}
          className="relative z-20 shrink-0 w-full flex items-center gap-3 px-4 sm:px-6 py-2.5 bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-rose-500/20 border-b border-amber-500/40 hover:from-amber-500/30 hover:to-rose-500/30 transition-all text-left"
        >
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 animate-bounce" />
          <span className="text-xs sm:text-sm font-heading font-bold text-amber-200 truncate flex-1 min-w-0">
            ⚠️ Ô nhiễm không khí cao (AQI {weather.aqi}) · Bấm để tìm lộ trình di chuyển sạch bảo vệ hô hấp
          </span>
          <span className="text-xs font-heading font-bold text-amber-300 shrink-0 px-3 py-1 rounded-lg bg-amber-500/20 border border-amber-500/40">
            Xem ngay →
          </span>
        </button>
      )}

      {/* Main Content Area (Fluid Full-Width Container) */}
      <div className="relative z-10 flex-1 min-h-0 overflow-y-auto">
        <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-6">
          {/* Node Proximity Connection Badge */}
          <NodeProximityBadge matchedNode={proximityNode} distanceMeters={proximityDistance} />

          {/* PAM / WAQI Air Summary Primary Card */}
          <PAMAirSummary userLocation={location.label} weather={weather} />

          {/* Nearby IoT Nodes Map Widget */}
          <NearbyNodesMapWidget />

          {/* Personalized AQI guidance */}
          <PersonalizedAQIGuidance lang={lang} />

          {/* Privacy Status & Badges */}
          <PrivacyStatusBadges lang={lang} compact />

          {/* Quick Action Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Community Report CTA */}
            <button
              type="button"
              onClick={() => navigate('/map?report=1')}
              className="w-full flex items-center gap-4 rounded-2xl border border-rose-500/30 bg-gradient-to-r from-rose-950/40 via-slate-900 to-orange-950/30 hover:border-rose-500/50 transition-all p-4 text-left shadow-lg"
              aria-label={lang === 'vi' ? 'Báo cáo điểm ô nhiễm' : 'Report pollution hotspot'}
            >
              <div className="w-11 h-11 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-400 flex items-center justify-center shrink-0">
                <Megaphone className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="block text-sm font-heading font-bold text-white">
                  {lang === 'vi' ? 'Báo cáo điểm ô nhiễm cộng đồng' : 'Report pollution hotspot'}
                </span>
                <span className="block text-xs font-body text-white/60 truncate mt-0.5">
                  {lang === 'vi'
                    ? 'Đốt rác tự phát · bụi công trình · khói xe — đóng góp dữ liệu cho bản đồ'
                    : 'Report burning, construction dust, or smoke to help the community'}
                </span>
              </div>
              <span className="text-xs font-heading font-bold text-rose-400 shrink-0 px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/30">
                Báo cáo →
              </span>
            </button>

            {/* Civic Hotspot Intelligence */}
            <button
              type="button"
              onClick={() => navigate('/civic-hotspots')}
              className="w-full flex items-center gap-4 rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-cyan-950/40 via-slate-900 to-blue-950/30 hover:border-cyan-500/50 transition-all p-4 text-left shadow-lg"
              aria-label={lang === 'vi' ? 'Civic Hotspot Intelligence' : 'Civic Hotspot Intelligence'}
            >
              <div className="w-11 h-11 rounded-xl bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shrink-0">
                <Database className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="block text-sm font-heading font-bold text-white">
                  {lang === 'vi' ? 'Bản đồ Điểm nóng Ô nhiễm Đô thị' : 'Civic Hotspot Intelligence'}
                </span>
                <span className="block text-xs font-body text-white/60 truncate mt-0.5">
                  {lang === 'vi'
                    ? 'Phân tích dữ liệu vi khí hậu tổng hợp & dự báo điểm ô nhiễm nguy cơ'
                    : 'Analyze hyper-local air data and predict hotspot risks'}
                </span>
              </div>
              <span className="text-xs font-heading font-bold text-cyan-400 shrink-0 px-3 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30">
                Khám phá →
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
