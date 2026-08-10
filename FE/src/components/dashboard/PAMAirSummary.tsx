import { Loader2, Wind, Droplets, Thermometer, Radio, MapPin } from 'lucide-react';
import { getAQIColorNew, getAQIStatusVi } from '@/lib/pam-stations';
import type { WeatherData } from '@/hooks/use-weather-data';

interface Props {
  userLocation?: string;
  weather: WeatherData;
}

export default function PAMAirSummary({ userLocation, weather }: Props) {
  const loading = weather.loading;
  const aqi = weather.aqi || 0;
  const color = getAQIColorNew(aqi);
  const updated = weather.updatedAt
    ? new Date(weather.updatedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    : '--:--';

  if (loading) {
    return (
      <div className="w-full rounded-2xl bg-slate-900/80 border border-white/10 p-6 flex flex-col items-center justify-center min-h-[160px] text-white/60 space-y-2">
        <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
        <span className="text-xs font-heading font-semibold">Đang cập nhật chỉ số vi khí hậu...</span>
      </div>
    );
  }

  return (
    <div className="w-full rounded-2xl bg-gradient-to-br from-slate-900/95 via-slate-900/90 to-slate-950/95 border border-white/10 p-5 sm:p-6 shadow-2xl backdrop-blur-md text-white space-y-5">
      {/* Location Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-4">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-heading font-bold tracking-wider text-cyan-400 block">
              Dữ liệu Vi khí hậu Vị trí của bạn
            </span>
            <p className="text-xs sm:text-sm font-heading font-bold text-white truncate" title={userLocation}>
              {userLocation || 'Đang xác định vị trí GPS...'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center shrink-0 text-xs text-white/50 font-mono">
          <span>⏱ Cập nhật: {updated}</span>
        </div>
      </div>

      {/* Main AQI Gauge & Parameter Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
        {/* Left: Big AQI Gauge Card */}
        <div className="md:col-span-5 flex flex-col items-center justify-center p-4 rounded-xl bg-black/40 border border-white/5 space-y-2 text-center">
          <div
            className="text-5xl sm:text-6xl font-heading font-black tracking-tight"
            style={{ color, textShadow: `0 0 28px ${color}60` }}
          >
            {aqi || '--'}
          </div>
          <div className="text-[10px] font-heading font-extrabold uppercase tracking-widest text-white/40">
            Chỉ số AQI Thực tế
          </div>
          <span
            className="px-3 py-1 rounded-full text-xs font-heading font-bold border shadow-md"
            style={{
              backgroundColor: `${color}20`,
              color: color,
              borderColor: `${color}40`,
            }}
          >
            {getAQIStatusVi(aqi)}
          </span>

          {/* Progress Bar */}
          <div className="w-full mt-2 h-2 rounded-full overflow-hidden bg-white/10 p-0.5">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min((aqi / 300) * 100, 100)}%`,
                backgroundColor: color,
                boxShadow: `0 0 10px ${color}`,
              }}
            />
          </div>
        </div>

        {/* Right: Detailed Telemetry Parameters */}
        <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 text-center space-y-1">
            <span className="text-[10px] font-heading font-bold uppercase tracking-wider text-white/50 block">Bụi PM2.5</span>
            <div className="font-heading font-extrabold text-base text-cyan-300">
              {weather.pm25 || '--'}<span className="text-[10px] text-white/50 ml-0.5">µg/m³</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 text-center space-y-1">
            <span className="text-[10px] font-heading font-bold uppercase tracking-wider text-white/50 block">Bụi PM10</span>
            <div className="font-heading font-extrabold text-base text-cyan-300">
              {weather.pm10 || '--'}<span className="text-[10px] text-white/50 ml-0.5">µg/m³</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 text-center space-y-1">
            <span className="text-[10px] font-heading font-bold uppercase tracking-wider text-white/50 block">Nhiệt độ</span>
            <div className="font-heading font-extrabold text-base text-amber-300">
              {weather.temperature || '--'}<span className="text-[10px] text-white/50 ml-0.5">°C</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 text-center space-y-1">
            <span className="text-[10px] font-heading font-bold uppercase tracking-wider text-white/50 block">Độ ẩm</span>
            <div className="font-heading font-extrabold text-base text-blue-300">
              {weather.humidity ?? '--'}<span className="text-[10px] text-white/50 ml-0.5">%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Station Attribution */}
      <div className="flex items-center justify-between text-xs text-white/60 pt-2 border-t border-white/5">
        <div className="flex items-center gap-2">
          {weather.source === 'waqi' && weather.station && (
            <span className="px-2 py-0.5 rounded text-[10px] font-heading font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 truncate max-w-[240px]">
              📡 Trạm tham chiếu: {weather.station}
            </span>
          )}
          {weather.source === 'open-meteo' && (
            <span className="px-2 py-0.5 rounded text-[10px] font-heading font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
              ⚡ Nguồn: Open-Meteo API
            </span>
          )}
        </div>

        <span className="text-[11px] text-white/40 font-mono">Chỉ số đạt chuẩn WHO 2021</span>
      </div>
    </div>
  );
}
