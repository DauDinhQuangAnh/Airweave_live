import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import {
  AlertTriangle,
  Megaphone,
  Database,
  ShieldCheck,
  Lock,
  ChevronRight,
} from 'lucide-react';
import { useLiveAirContext } from '@/contexts/live-air-context';
import PAMAirSummary from '@/components/dashboard/PAMAirSummary';
import NearbyNodesMapWidget from '@/components/dashboard/NearbyNodesMapWidget';
import PersonalizedAQIGuidance from '@/components/PersonalizedAQIGuidance';
import AirHourlyForecastChart from '@/components/dashboard/AirHourlyForecastChart';
import AuroraBackground from '@/components/AuroraBackground';
import { trackBehavior } from '@/lib/behavior-analytics';
import { isDemoMode } from '@/lib/demo/demo-mode';
import { hasAirQualityReading } from '@/lib/air-quality';

export default function Dashboard() {
  const context = useOutletContext<{ lang?: 'vi' | 'en' }>() || {};
  const lang = context.lang || 'vi';
  const { location, weather, hourlyForecast, refreshData } = useLiveAirContext();
  const navigate = useNavigate();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      if (refreshData) await refreshData();
      trackBehavior('aqi_checked_near_me');
    } catch {
      // ignore
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshData]);

  useEffect(() => {
    trackBehavior('aqi_checked_near_me');
  }, []);

  const hasReading = hasAirQualityReading(weather);
  const isLoading = weather?.loading ?? false;

  return (
    <div className="min-h-full flex flex-col bg-[#050911] text-white relative overflow-x-hidden font-body selection:bg-cyan-500/30 selection:text-cyan-200">
      <AuroraBackground />

      {/* High Pollution Caution Alert Banner */}
      {hasReading && weather.aqi >= 100 && (
        <button
          type="button"
          onClick={() => navigate('/smart-route?alert=1')}
          className="relative z-20 shrink-0 w-full flex items-center justify-between gap-3 px-4 sm:px-6 py-2.5 bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-rose-500/20 border-b border-amber-500/30 hover:from-amber-500/30 hover:to-rose-500/30 transition-all text-left group"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 animate-bounce" />
            <span className="text-xs sm:text-sm font-heading font-bold text-amber-200 truncate">
              {lang === 'vi'
                ? `⚠️ Ô nhiễm không khí cao (AQI ${weather.aqi}) · Bấm để tìm lộ trình sạch giảm phơi nhiễm`
                : `⚠️ High air pollution (AQI ${weather.aqi}) · Find a cleaner route to reduce exposure`}
            </span>
          </div>
          <span className="text-xs font-heading font-bold text-amber-300 shrink-0 px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-500/40 group-hover:bg-amber-500/30 flex items-center gap-1 transition-all">
            {lang === 'vi' ? 'Tìm đường sạch' : 'Find cleaner route'} <ChevronRight className="w-3.5 h-3.5" />
          </span>
        </button>
      )}

      {/* Main Content Area (Fluid Modern Bento Grid) */}
      <div className="relative z-10 flex-1 min-h-0 overflow-y-auto">
        <div className="w-full max-w-[1750px] mx-auto px-5 sm:px-8 lg:px-10 py-6 space-y-6">
          {/* Row 1 (Hero Bento): Air Quality Hub (~65%) + Health Advisory (~35%) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            <div className="lg:col-span-7 xl:col-span-8 flex min-w-0">
              <PAMAirSummary
                userLocation={location?.label}
                weather={weather}
                lang={lang}
                onRefresh={handleRefresh}
                isRefreshing={isRefreshing}
              />
            </div>
            <div className="lg:col-span-5 xl:col-span-4 flex min-w-0">
              <PersonalizedAQIGuidance lang={lang} />
            </div>
          </div>

          {/* Row 2 (Middle Bento): 24h Trend Chart (~60%) + Nearby Nodes & Stations (~40%) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            <div className="lg:col-span-7 xl:col-span-7 flex min-w-0">
              <AirHourlyForecastChart data={hourlyForecast} loading={isLoading} lang={lang} source={isDemoMode() ? 'demo' : weather.source} />
            </div>
            <div className="lg:col-span-5 xl:col-span-5 flex min-w-0">
              <NearbyNodesMapWidget />
            </div>
          </div>

          {/* Row 3 (Bottom Bento): Community Action & Hotspot Intelligence */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Community Report Card */}
            <button
              type="button"
              onClick={() => navigate('/map?report=1')}
              className="w-full flex items-center gap-4 sm:gap-5 rounded-2xl border border-rose-500/20 bg-gradient-to-r from-rose-950/30 via-slate-900/80 to-slate-950/80 hover:border-rose-500/40 hover:from-rose-950/40 transition-all p-5 sm:p-6 text-left shadow-lg group"
            >
              <div className="w-12 h-12 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Megaphone className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="block text-sm sm:text-base font-heading font-bold text-white">
                  {lang === 'vi' ? 'Báo cáo Điểm ô nhiễm Cộng đồng' : 'Community Pollution Report'}
                </span>
                <span className="block text-xs text-white/50 truncate mt-1">
                  {lang === 'vi'
                    ? 'Đốt rác tự phát · bụi công trình · khói xe — đóng góp dữ liệu bảo vệ cộng đồng'
                    : 'Report burning, dust, or smoke to alert nearby citizens'}
                </span>
              </div>
              <span className="text-xs font-heading font-bold text-rose-300 shrink-0 px-3.5 py-2 rounded-xl bg-rose-500/10 border border-rose-500/30 group-hover:bg-rose-500/20 transition-colors">
                {lang === 'vi' ? 'Báo cáo →' : 'Report →'}
              </span>
            </button>

            {/* Civic Hotspot Intelligence Card */}
            <button
              type="button"
              onClick={() => navigate('/civic-hotspots')}
              className="w-full flex items-center gap-4 sm:gap-5 rounded-2xl border border-cyan-500/20 bg-gradient-to-r from-cyan-950/30 via-slate-900/80 to-slate-950/80 hover:border-cyan-500/40 hover:from-cyan-950/40 transition-all p-5 sm:p-6 text-left shadow-lg group"
            >
              <div className="w-12 h-12 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Database className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="block text-sm sm:text-base font-heading font-bold text-white">
                  {lang === 'vi' ? 'Bản đồ Điểm nóng Ô nhiễm Đô thị' : 'Civic Hotspot Intelligence'}
                </span>
                <span className="block text-xs text-white/50 truncate mt-1">
                  {lang === 'vi'
                    ? 'Phân tích dữ liệu vi khí hậu & cảnh báo nguy cơ ô nhiễm vi vùng đô thị'
                    : 'Hyper-local climate intelligence & urban exposure hotspots'}
                </span>
              </div>
              <span className="text-xs font-heading font-bold text-cyan-300 shrink-0 px-3.5 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 group-hover:bg-cyan-500/20 transition-colors">
                {lang === 'vi' ? 'Khám phá →' : 'Explore →'}
              </span>
            </button>
          </div>

          {/* Row 4: Subtle Clean Privacy & Verification Footer Strip */}
          <div className="py-3.5 px-6 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/40">
            <div className="flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-cyan-400/80" />
              <span>
                {lang === 'vi'
                  ? 'Kiểm tra quyền chia sẻ dữ liệu sức khỏe và vị trí trong Hồ sơ cá nhân.'
                  : 'Review health and location sharing preferences in your profile.'}
              </span>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-mono">
              <span className="text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Medical ID
              </span>
              <span>•</span>
              <span className="text-cyan-400">AQI US · PM2.5</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
