import React, { useState } from 'react';
import {
  Loader2,
  Wind,
  Droplets,
  Thermometer,
  Radio,
  MapPin,
  Sun,
  Info,
  Layers,
  Sparkles,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { getAQIColorNew } from '@/lib/pam-stations';
import { getAQIStatus } from '@/lib/air-quality';
import { hasWeatherMetric, type WeatherData } from '@/hooks/use-weather-data';
import { hasAirQualityReading } from '@/lib/air-quality';

interface Props {
  userLocation?: string;
  weather: WeatherData;
  lang?: 'vi' | 'en';
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

function getAQIDescription(aqi: number, lang: 'vi' | 'en' = 'vi'): string {
  if (aqi <= 50) {
    return lang === 'vi'
      ? 'Chất lượng không khí tuyệt vời. Lý tưởng cho mọi hoạt động ngoài trời.'
      : 'Air quality is great. Ideal for outdoor activities.';
  }
  if (aqi <= 100) {
    return lang === 'vi'
      ? 'Không khí ở mức chấp nhận được. Nhóm người nhạy cảm nên hạn chế gắng sức kéo dài.'
      : 'Air quality is acceptable. Sensitive individuals should reduce prolonged exertion.';
  }
  if (aqi <= 150) {
    return lang === 'vi'
      ? 'Chất lượng không khí kém. Nhóm nhạy cảm có thể gặp các triệu chứng hô hấp.'
      : 'Unhealthy for sensitive groups. May experience respiratory symptoms.';
  }
  if (aqi <= 200) {
    return lang === 'vi'
      ? 'Không khí xấu. Mọi người bắt đầu cảm nhận ảnh hưởng sức khỏe, cần đeo khẩu trang.'
      : 'Unhealthy air. Everyone may begin to experience health effects. Wear a mask.';
  }
  return lang === 'vi'
    ? 'Cực kỳ nguy hại! Khuyến cáo ở trong nhà, bật máy lọc không khí và đóng cửa sổ.'
    : 'Hazardous air! Stay indoors, run air purifiers, and keep windows shut.';
}

export default function PAMAirSummary({
  userLocation,
  weather,
  lang = 'vi',
  onRefresh,
  isRefreshing,
}: Props) {
  const [showInfo, setShowInfo] = useState(false);
  const loading = weather?.loading ?? false;
  const aqi = weather?.aqi || 0;
  const hasReading = hasAirQualityReading(weather);
  const color = hasReading ? getAQIColorNew(aqi) : '#94a3b8';
  const metric = (value: number, key: keyof WeatherData['available']) => hasWeatherMetric(weather, key) ? value : '--';
  const updated = weather?.updatedAt
    ? new Date(weather.updatedAt).toLocaleTimeString(lang === 'vi' ? 'vi-VN' : 'en-US', { hour: '2-digit', minute: '2-digit' })
    : '--:--';

  if (loading) {
    return (
      <div className="w-full rounded-2xl bg-slate-900/60 border border-white/10 p-8 flex flex-col items-center justify-center min-h-[220px] text-white/60 space-y-3 backdrop-blur-xl">
        <Loader2 className="w-7 h-7 animate-spin text-cyan-400" />
        <span className="text-xs font-heading font-medium tracking-wide">
          {lang === 'vi' ? 'Đang cập nhật chỉ số vi khí hậu thời gian thực...' : 'Updating real-time microclimate data...'}
        </span>
      </div>
    );
  }

  // Semi-circle gauge calculation
  const gaugePercent = Math.min(Math.max((aqi / 300) * 100, 4), 100);
  const circumference = Math.PI * 45; // radius = 45 -> semi circle arc length = pi * r ≈ 141.37
  const strokeDashoffset = circumference - (circumference * gaugePercent) / 100;

  // WHO's 15 µg/m³ guideline is for a 24-hour average, not one current sample.

  return (
    <div className="w-full rounded-2xl bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-slate-950/90 border border-white/10 p-5 sm:p-6 shadow-xl backdrop-blur-xl text-white space-y-5">
      {/* Top Location Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-heading font-bold tracking-wider text-cyan-400 block">
                {lang === 'vi' ? 'Vi Khí Hậu Vị Trí Của Bạn' : 'Hyper-Local Microclimate'}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[10px] font-mono font-medium">
                <span className={`w-1.5 h-1.5 rounded-full ${hasReading ? 'bg-emerald-400' : 'bg-slate-400'}`} />
                {hasReading ? (lang === 'vi' ? 'Dữ liệu không khí' : 'Air Data') : (lang === 'vi' ? 'Chưa có dữ liệu' : 'No air data')}
              </span>
            </div>
            <p className="text-sm sm:text-base font-heading font-bold text-white truncate mt-0.5" title={userLocation}>
              {userLocation || (lang === 'vi' ? 'Đang xác định vị trí GPS...' : 'Locating GPS...')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
          <span className="text-xs text-white/50 font-mono">⏱ {updated}</span>
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing || loading}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
              title={lang === 'vi' ? 'Làm mới chỉ số' : 'Refresh data'}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing || loading ? 'animate-spin text-cyan-400' : ''}`} />
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowInfo(!showInfo)}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
            title={lang === 'vi' ? 'Thông tin trạm đo & chuẩn WHO' : 'Station info & WHO standards'}
          >
            <Info className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Expandable Station Source & Standard Banner */}
      {showInfo && (
        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-cyan-500/30 text-xs text-white/80 space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="font-heading font-semibold text-cyan-300 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              {!hasReading ? (lang === 'vi' ? 'Chưa có số đo tại vị trí này' : 'No reading at this location') : weather.source === 'demo'
                ? `${lang === 'vi' ? 'Dữ liệu mô phỏng' : 'Simulated data'}: ${weather.station ?? 'Ho Chi Minh City'}`
                : weather.source === 'waqi' && weather.station
                ? `${lang === 'vi' ? 'Trạm tham chiếu' : 'Reference station'}: ${weather.station}`
                : (lang === 'vi' ? 'Dữ liệu mô hình Open-Meteo độ phân giải cao' : 'High-resolution Open-Meteo model data')}
            </span>
            <span className="text-[11px] font-mono text-white/40">
              {lang === 'vi' ? 'Tiêu chuẩn' : 'Standard'}: WHO Global Air Quality Guidelines 2021
            </span>
          </div>
          <p className="text-[11px] text-white/60 leading-relaxed">
            {lang === 'vi'
              ? 'PM2.5 hiện tại tại vị trí này: '
              : 'Current PM2.5 at this location: '}
            <strong className="text-cyan-200">{metric(weather.pm25, 'pm25')} µg/m³</strong>
            . {lang === 'vi' ? 'Mốc WHO 15 µg/m³ áp dụng cho trung bình 24 giờ, không thể kết luận từ một số đo hiện tại.' : 'The WHO 15 µg/m³ guideline applies to a 24-hour average, not a single current reading.'}
          </p>
        </div>
      )}

      {/* Main Hero Bento: Arc Gauge + Core Microclimate Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Left: Glowing Semi-Circular AQI Gauge */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center p-5 rounded-2xl bg-gradient-to-b from-white/[0.04] to-black/40 border border-white/5 relative overflow-hidden">
          {/* Subtle Ambient Radial Glow */}
          <div
            className="absolute -top-10 w-48 h-48 rounded-full blur-3xl opacity-20 pointer-events-none"
            style={{ backgroundColor: color }}
          />

          {/* Semi Circle Arc Gauge */}
          <div className="relative w-48 h-28 flex items-end justify-center">
            <svg viewBox="0 0 100 55" className="w-full h-full overflow-visible">
              {/* Background Track Arc */}
              <path
                d="M 5 50 A 45 45 0 0 1 95 50"
                fill="none"
                stroke="rgba(255,255,255,0.08)"
                strokeWidth="8"
                strokeLinecap="round"
              />
              {/* Colored Value Arc */}
              <path
                d="M 5 50 A 45 45 0 0 1 95 50"
                fill="none"
                stroke={color}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                style={{
                  transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
                  filter: `drop-shadow(0 0 8px ${color}80)`,
                }}
              />
            </svg>

            {/* Inner Content */}
            <div className="absolute inset-0 flex flex-col items-center justify-end pb-1 text-center">
              <span
                className="text-5xl font-heading font-black tracking-tight leading-none"
                style={{
                  color: color,
                  textShadow: `0 0 24px ${color}50`,
                }}
              >
                {hasReading ? aqi : '--'}
              </span>
              <span className="text-[10px] font-heading font-bold uppercase tracking-widest text-white/50 mt-1">
                {lang === 'vi' ? 'Chuẩn AQI Hoa Kỳ' : 'US AQI Standard'}
              </span>
            </div>
          </div>

          {/* Status Pill & Humanized Meaning */}
          <div className="mt-3 text-center space-y-1.5 w-full">
            <span
              className="inline-block px-3.5 py-1 rounded-full text-xs font-heading font-bold border shadow-md"
              style={{
                backgroundColor: `${color}18`,
                color: color,
                borderColor: `${color}35`,
              }}
            >
              {hasReading ? getAQIStatus(aqi, lang) : (lang === 'vi' ? 'Chưa có số đo' : 'No reading')}
            </span>
            <p className="text-xs text-white/70 leading-relaxed max-w-[280px] mx-auto pt-0.5">
              {hasReading ? getAQIDescription(aqi, lang) : (lang === 'vi' ? 'Chưa thể đưa ra khuyến nghị từ dữ liệu không khí. Hãy kiểm tra vị trí và thử làm mới.' : 'Air data is unavailable. Check your location and refresh before making plans.')}
            </p>
          </div>
        </div>

        {/* Right: 6-Parameter Microclimate Matrix */}
        <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-3">
          {/* PM2.5 */}
          <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 hover:border-cyan-500/30 hover:bg-white/[0.05] transition-all space-y-1.5">
            <div className="flex items-center justify-between text-white/50">
              <span className="text-[10px] font-heading font-bold uppercase tracking-wider">{lang === 'vi' ? 'Bụi PM2.5' : 'PM2.5'}</span>
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div className="font-heading font-black text-xl text-cyan-300">
              {metric(weather.pm25, 'pm25')}
              <span className="text-[10px] text-white/50 ml-1 font-normal font-sans">µg/m³</span>
            </div>
            {/* Current-sample visual scale; not a 24-hour guideline comparison. */}
            <div className="space-y-1">
              <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${hasWeatherMetric(weather, 'pm25') ? Math.min((weather.pm25 / 75) * 100, 100) : 0}%`,
                    backgroundColor: '#22d3ee',
                  }}
                />
              </div>
              <span className="text-[9px] text-white/40 block">{lang === 'vi' ? 'Thang hiển thị mẫu hiện tại' : 'Current sample display scale'}</span>
            </div>
          </div>

          {/* PM10 */}
          <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 hover:border-cyan-500/30 hover:bg-white/[0.05] transition-all space-y-1.5">
            <div className="flex items-center justify-between text-white/50">
              <span className="text-[10px] font-heading font-bold uppercase tracking-wider">{lang === 'vi' ? 'Bụi PM10' : 'PM10'}</span>
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div className="font-heading font-black text-xl text-cyan-300">
              {metric(weather.pm10, 'pm10')}
              <span className="text-[10px] text-white/50 ml-1 font-normal font-sans">µg/m³</span>
            </div>
            <span className="text-[10px] text-white/50 block font-medium">{lang === 'vi' ? 'Bụi thô lơ lửng' : 'Coarse particulate matter'}</span>
          </div>

          {/* Temperature */}
          <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 hover:border-amber-500/30 hover:bg-white/[0.05] transition-all space-y-1.5">
            <div className="flex items-center justify-between text-white/50">
              <span className="text-[10px] font-heading font-bold uppercase tracking-wider">{lang === 'vi' ? 'Nhiệt độ' : 'Temperature'}</span>
              <Thermometer className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="font-heading font-black text-xl text-amber-300">
              {metric(weather.temperature, 'temperature')}
              <span className="text-[10px] text-white/50 ml-1 font-normal font-sans">°C</span>
            </div>
            <span className="text-[10px] text-white/50 block font-medium">
              {lang === 'vi' ? 'Nhiệt độ tại vị trí hiện tại' : 'Temperature at current location'}
            </span>
          </div>

          {/* Humidity */}
          <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 hover:border-blue-500/30 hover:bg-white/[0.05] transition-all space-y-1.5">
            <div className="flex items-center justify-between text-white/50">
              <span className="text-[10px] font-heading font-bold uppercase tracking-wider">{lang === 'vi' ? 'Độ ẩm' : 'Humidity'}</span>
              <Droplets className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <div className="font-heading font-black text-xl text-blue-300">
              {metric(weather.humidity, 'humidity')}
              <span className="text-[10px] text-white/50 ml-1 font-normal font-sans">%</span>
            </div>
            <span className="text-[10px] text-white/50 block font-medium">
              {hasWeatherMetric(weather, 'humidity') ? (weather.humidity > 85 ? (lang === 'vi' ? 'Nồm ẩm cao' : 'Very humid') : weather.humidity < 50 ? (lang === 'vi' ? 'Hanh khô' : 'Dry') : (lang === 'vi' ? 'Dễ chịu' : 'Comfortable')) : '—'}
            </span>
          </div>

          {/* Wind */}
          <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 hover:border-emerald-500/30 hover:bg-white/[0.05] transition-all space-y-1.5">
            <div className="flex items-center justify-between text-white/50">
              <span className="text-[10px] font-heading font-bold uppercase tracking-wider">{lang === 'vi' ? 'Gió bề mặt' : 'Surface wind'}</span>
              <Wind className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="font-heading font-black text-xl text-emerald-300">
              {metric(weather.windSpeed, 'windSpeed')}
              <span className="text-[10px] text-white/50 ml-1 font-normal font-sans">km/h</span>
            </div>
            <span className="text-[10px] text-white/50 block font-medium">
              {lang === 'vi' ? 'Hướng' : 'Direction'}: {hasWeatherMetric(weather, 'windDirection') ? weather.windDirection : '—'}
            </span>
          </div>

          {/* UV Index */}
          <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 hover:border-purple-500/30 hover:bg-white/[0.05] transition-all space-y-1.5">
            <div className="flex items-center justify-between text-white/50">
              <span className="text-[10px] font-heading font-bold uppercase tracking-wider">{lang === 'vi' ? 'Chỉ số UV' : 'UV index'}</span>
              <Sun className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <div className="font-heading font-black text-xl text-purple-300">
              —
              <span className="text-[10px] text-white/50 ml-1 font-normal font-sans">{lang === 'vi' ? 'Chỉ số UV' : 'UV Index'}</span>
            </div>
            <span className="text-[10px] text-white/50 block font-medium">{lang === 'vi' ? 'Chưa có dữ liệu UV' : 'UV data unavailable'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
