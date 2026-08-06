import { lazy, Suspense, useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { Bell, Map, BarChart3, Route, AlertTriangle, Loader2, Megaphone, Database, ShieldAlert } from 'lucide-react';
import { useLiveAirContext } from '@/contexts/live-air-context';
import { PAMStation } from '@/lib/pam-stations';
import { useWaqiStations } from '@/hooks/use-waqi-stations';
import PAMAirSummary from '@/components/dashboard/PAMAirSummary';
import PAMStationsTable from '@/components/dashboard/PAMStationsTable';
import PriorityStack from '@/components/dashboard/PriorityStack';
import FCMToast from '@/components/dashboard/FCMToast';
import AuroraBackground from '@/components/AuroraBackground';
import AQITicker, { buildCurrentAirTickerItems } from '@/components/landing/AQITicker';
import PersonalizedAQIGuidance from '@/components/PersonalizedAQIGuidance';
import PrivacyStatusBadges from '@/components/PrivacyStatusBadges';
import { trackBehavior } from '@/lib/behavior-analytics';

const DashboardMap = lazy(() => import('@/components/dashboard/DashboardMap'));
import MapLitePreview from '@/components/dashboard/MapLitePreview';

const Dashboard = () => {
  const { lang } = useOutletContext<{ lang: 'vi' | 'en' }>();
  const { location, weather, refreshData } = useLiveAirContext();
  const navigate = useNavigate();
  const { stations, loading: stationsLoading, refresh: refreshStations } = useWaqiStations();
  const [activeStation, setActiveStation] = useState<string | null>(null);
  const [notifCount, setNotifCount] = useState(0);
  const [mapVisible, setMapVisible] = useState(false);
  const [mapRequested, setMapRequested] = useState(false);
  const mapCardRef = useRef<HTMLDivElement>(null);

  const handleSelectStation = useCallback((s: PAMStation) => {
    setActiveStation(s.id);
  }, []);

  const handleRefresh = useCallback(() => {
    void refreshData();
    void refreshStations();
    trackBehavior('aqi_checked_near_me');
  }, [refreshData, refreshStations]);

  useEffect(() => { trackBehavior('aqi_checked_near_me'); }, []);
  const shouldMountMap = mapVisible && mapRequested;

  useEffect(() => {
    const node = mapCardRef.current;
    if (!node || !('IntersectionObserver' in window)) {
      setMapVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setMapVisible(true);
        observer.disconnect();
      },
      { rootMargin: '180px 0px' }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const tabs = [
    { id: 'map' as const, icon: Map, label: 'Bản đồ AQI', path: '/map' },
    { id: 'route' as const, icon: Route, label: 'Smart Route', path: '/smart-route' },
    { id: 'analytics' as const, icon: BarChart3, label: 'AirWeave SOS', path: '/sos' },
  ];

  return (
    <div className="h-full flex flex-col bg-[#030810] text-white relative overflow-hidden">
      <AuroraBackground />

      {/* Top Nav Bar */}
      <div className="relative z-20 h-[54px] flex items-center px-3 md:px-4 border-b border-white/5 bg-[rgba(3,8,15,0.96)] shrink-0 gap-2">
        <div className="flex items-center gap-1 flex-1 overflow-x-auto scrollbar-none">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => navigate(t.path)}
              className="px-2.5 md:px-3 py-1.5 rounded-lg text-xs font-heading font-semibold transition-all shrink-0 text-white/50 hover:text-white hover:bg-white/10 inline-flex items-center gap-1.5"
            >
              <t.icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 md:gap-3 shrink-0">
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
            <span className="text-[10px] font-body text-white/50">Live · WAQI</span>
          </div>
          <button className="relative text-white/40 hover:text-white/60 transition-colors" aria-label="Thông báo">
            <Bell className="w-4 h-4" />
            {notifCount > 0 && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-red-500 text-[8px] text-white flex items-center justify-center font-bold">
                {notifCount > 9 ? '9+' : notifCount}
              </span>
            )}
          </button>
        </div>
      </div>

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
              ? 'Ban da chan quyen vi tri.'
              : 'Dang cho AQI theo vi tri hien tai.'
          }
          animate
        />
      </div>

      {weather.aqi >= 100 && !weather.loading && (
        <button
          type="button"
          onClick={() => navigate('/smart-route?alert=1')}
          className="relative z-20 shrink-0 w-full flex items-center gap-2 px-3 md:px-4 py-2 bg-gradient-to-r from-orange-500/15 to-red-500/15 border-b border-orange-500/30 hover:from-orange-500/25 hover:to-red-500/25 transition-colors text-left"
        >
          <AlertTriangle className="w-4 h-4 text-orange-400 shrink-0" />
          <span className="text-[11px] md:text-xs font-heading font-semibold text-orange-200 truncate flex-1 min-w-0">
            AQI {weather.aqi} · Tìm lộ trình tránh ô nhiễm
          </span>
          <span className="text-[10px] md:text-xs text-orange-300 font-body shrink-0">Mở →</span>
        </button>
      )}

      {/* Scrollable card stack */}
      <div className="relative z-10 flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-3 md:px-5 py-4 md:py-5 space-y-4">
          {/* PAM Air summary */}
          <PAMAirSummary userLocation={location.label} weather={weather} />

          {/* Privacy status strip — Health Profile / Consent / GPS / Medical ID Demo */}
          <PrivacyStatusBadges lang={lang} compact />

          {/* Personalized AQI guidance — same AQI, different action by risk profile */}
          <PersonalizedAQIGuidance lang={lang} />

          {/* Community Report CTA — separate from SOS */}
          <button
            type="button"
            onClick={() => navigate('/map?report=1')}
            className="w-full flex items-center gap-3 rounded-2xl border border-destructive/30 bg-gradient-to-r from-destructive/10 to-orange-500/5 hover:from-destructive/20 hover:to-orange-500/10 transition-colors px-4 py-3 text-left"
            aria-label={lang === 'vi' ? 'Báo cáo điểm ô nhiễm' : 'Report pollution hotspot'}
          >
            <span className="w-9 h-9 rounded-full bg-destructive/15 text-destructive flex items-center justify-center shrink-0">
              <Megaphone className="w-4 h-4" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-heading font-bold text-foreground">
                {lang === 'vi' ? 'Báo cáo điểm ô nhiễm' : 'Report pollution hotspot'}
              </span>
              <span className="block text-[11px] font-body text-muted-foreground truncate">
                {lang === 'vi'
                  ? 'Đốt rác · bụi công trình · kẹt xe · mùi hóa chất — đóng góp cho cộng đồng'
                  : 'Burning · dust · traffic · chemical smell — share with the community'}
              </span>
            </span>
            <span className="text-xs font-heading font-semibold text-destructive shrink-0">
              {lang === 'vi' ? 'Mở →' : 'Open →'}
            </span>
          </button>

          {/* Civic Hotspot Intelligence — data-fusion layer (separate from Community Report & SOS) */}
          <button
            type="button"
            onClick={() => navigate('/civic-hotspots')}
            className="w-full flex items-center gap-3 rounded-2xl border border-border bg-card/80 hover:border-primary/40 transition-colors px-4 py-3 text-left"
            aria-label={lang === 'vi' ? 'Civic Hotspot Intelligence' : 'Civic Hotspot Intelligence'}
          >
            <span className="w-9 h-9 rounded-full bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-4 h-4" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-heading font-bold text-foreground">
                {lang === 'vi' ? 'Civic Hotspot Intelligence' : 'Civic Hotspot Intelligence'}
              </span>
              <span className="block text-[11px] font-body text-muted-foreground truncate">
                {lang === 'vi'
                  ? 'Hợp nhất báo cáo cộng đồng · trạm AQI · cảm biến đối tác · metadata (không xử lý video)'
                  : 'Fuses community · station · partner · metadata (no raw video)'}
              </span>
            </span>
            <span className="text-xs font-heading font-semibold text-primary shrink-0">
              {lang === 'vi' ? 'Mở →' : 'Open →'}
            </span>
          </button>

          {/* Macro Trends Lab — single collapsible entry to reduce dashboard clutter */}
          <details className="group rounded-2xl border border-border bg-card/80 overflow-hidden">
            <summary className="flex items-center gap-3 px-4 py-3 cursor-pointer list-none [&::-webkit-details-marker]:hidden hover:bg-card transition-colors">
              <span className="w-9 h-9 rounded-full bg-cyan-500/15 text-cyan-500 flex items-center justify-center shrink-0">
                <Database className="w-4 h-4" />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-heading font-bold text-foreground">
                  {lang === 'vi' ? 'Macro Trends Lab' : 'Macro Trends Lab'}
                </span>
                <span className="block text-[11px] text-muted-foreground truncate">
                  {lang === 'vi'
                    ? 'Minh bạch dữ liệu · Insights hành vi sức khoẻ'
                    : 'Data transparency · Health behavior insights'}
                </span>
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-300 font-heading font-bold">DEMO</span>
              <span className="text-xs text-muted-foreground font-heading shrink-0 group-open:rotate-180 transition-transform">▾</span>
            </summary>
            <div className="border-t border-border p-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => navigate('/data-transparency')}
                className="flex items-center gap-3 rounded-xl border border-border bg-background/40 hover:border-cyan-400/40 transition-colors px-3 py-2.5 text-left"
              >
                <span className="w-8 h-8 rounded-full bg-cyan-500/15 text-cyan-500 flex items-center justify-center shrink-0">
                  <Database className="w-3.5 h-3.5" />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-xs font-heading font-bold text-foreground">
                    {lang === 'vi' ? 'Minh bạch dữ liệu' : 'Data Transparency'}
                  </span>
                  <span className="block text-[10px] text-muted-foreground truncate">
                    {lang === 'vi' ? 'AQI · PM2.5 · trạm · ESG' : 'AQI · PM2.5 · station · ESG'}
                  </span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => navigate('/behavior-insights')}
                className="flex items-center gap-3 rounded-xl border border-border bg-background/40 hover:border-cyan-400/40 transition-colors px-3 py-2.5 text-left"
              >
                <span className="w-8 h-8 rounded-full bg-cyan-500/15 text-cyan-500 flex items-center justify-center shrink-0">
                  <BarChart3 className="w-3.5 h-3.5" />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-xs font-heading font-bold text-foreground">
                    {lang === 'vi' ? 'Insights hành vi' : 'Behavior Insights'}
                  </span>
                  <span className="block text-[10px] text-muted-foreground truncate">
                    {lang === 'vi' ? 'Ẩn danh · opt-in · JSON' : 'Anonymous · opt-in · JSON'}
                  </span>
                </span>
              </button>
            </div>
          </details>

          {/* Collapsible stations table */}
          <PAMStationsTable
            stations={stations}
            activeId={activeStation}
            onSelect={handleSelectStation}
            onRefresh={handleRefresh}
            loading={stationsLoading}
          />

          {/* Two-column on desktop: map + priority stack */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            {/* Map card — contained, ~420px tall */}
            <div ref={mapCardRef} className="lg:col-span-3 rounded-2xl bg-card border border-border overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
                <div className="flex items-center gap-2">
                  <Map className="w-4 h-4 text-[#00d4aa]" />
                  <span className="text-xs font-heading font-bold text-foreground/80">Bản đồ AQI</span>
                </div>
                <button
                  onClick={() => navigate('/map')}
                  className="text-[10px] font-heading font-semibold text-[#00d4aa] hover:underline"
                >
                  Mở toàn màn hình →
                </button>
              </div>
              <div className="relative h-[380px] md:h-[420px] flex">
                {shouldMountMap ? (
                  <Suspense fallback={
                    <div className="flex-1 flex flex-col items-center justify-center gap-3 bg-[#0a1628] text-white/60">
                      <Loader2 className="w-7 h-7 animate-spin text-[#00d4aa]" />
                      <span className="text-xs font-body">Đang tải bản đồ...</span>
                    </div>
                  }>
                    <DashboardMap
                      stations={stations}
                      activeStationId={activeStation}
                      onSelectStation={handleSelectStation}
                      lang={lang}
                      userLocation={location}
                    />
                  </Suspense>
                ) : (
                  <MapLitePreview
                    stations={stations}
                    activeStationId={activeStation}
                    onSelectStation={handleSelectStation}
                    onActivate={() => setMapRequested(true)}
                  />
                )}
              </div>
            </div>

            {/* Priority stack — Alerts / Route / FCM */}
            <div className="lg:col-span-2">
              <PriorityStack />
            </div>
          </div>
        </div>
      </div>

      <FCMToast onNotification={() => setNotifCount(c => c + 1)} />
    </div>
  );
};

export default Dashboard;
