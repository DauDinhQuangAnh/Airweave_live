import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { Sparkles, Clock, ShieldCheck } from 'lucide-react';
import { HourlyForecast } from '@/hooks/use-weather-data';
import { getAQIColorNew, getAQIStatusVi } from '@/lib/pam-stations';

interface Props {
  data: HourlyForecast[];
  loading?: boolean;
  lang?: 'vi' | 'en';
  source?: 'waqi' | 'open-meteo' | 'iot-node' | 'demo';
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  lang?: 'vi' | 'en';
}

function CustomTooltip({ active, payload, label, lang = 'vi' }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;
  const aqi = payload[0]?.value ?? 0;
  const color = getAQIColorNew(aqi);
  const status = getAQIStatusVi(aqi);

  return (
    <div className="rounded-xl border border-white/15 bg-slate-950/95 px-3.5 py-2.5 shadow-2xl backdrop-blur-md text-xs space-y-1">
      <div className="flex items-center gap-2 text-white/50 font-mono text-[11px]">
        <Clock className="w-3 h-3 text-cyan-400" />
        <span>{label}</span>
      </div>
      <div className="flex items-center gap-2 font-heading">
        <span className="text-base font-black" style={{ color }}>
          AQI {aqi}
        </span>
        <span
          className="px-2 py-0.5 rounded-full text-[10px] font-bold border"
          style={{
            backgroundColor: `${color}20`,
            borderColor: `${color}40`,
            color: color,
          }}
        >
          {status}
        </span>
      </div>
    </div>
  );
}

export default function AirHourlyForecastChart({ data, loading, lang = 'vi', source = 'open-meteo' }: Props) {
  const chartData = useMemo(() => {
    return data.filter((item) => Number.isFinite(item.aqi)).map((item) => ({
      time: item.label,
      aqi: item.aqi,
    }));
  }, [data]);

  // Find best (cleanest) hour
  const cleanest = useMemo(() => {
    if (!chartData.length) return null;
    return [...chartData].sort((a, b) => a.aqi - b.aqi)[0];
  }, [chartData]);

  // Determine average color tone
  const avgAqi = useMemo(() => {
    if (!chartData.length) return 0;
    const sum = chartData.reduce((acc, curr) => acc + curr.aqi, 0);
    return Math.round(sum / chartData.length);
  }, [chartData]);

  const mainColor = getAQIColorNew(avgAqi);

  return (
    <div className="w-full rounded-2xl bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-slate-950/90 border border-white/10 p-5 sm:p-6 shadow-xl backdrop-blur-xl space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center text-cyan-400 shrink-0">
            <Sparkles className="w-4 h-4 text-cyan-300" />
          </div>
          <div>
            <h3 className="font-heading font-bold text-sm sm:text-base text-white flex items-center gap-2">
              {lang === 'vi' ? 'Dự báo Xu hướng AQI 24 Giờ' : '24-Hour AQI Trend Forecast'}
              <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 text-[10px] font-mono border border-cyan-500/20">
                {source === 'demo' ? (lang === 'vi' ? 'Không gọi API ngoài' : 'Offline demo') : 'Open-Meteo'}
              </span>
            </h3>
            <p className="text-xs text-white/50">
              {lang === 'vi'
                ? 'Biến thiên bụi mịn PM2.5 giúp chọn thời điểm ra ngoài an toàn nhất'
                : 'Forecasted PM2.5 variation to help you plan outdoor activities safely'}
            </p>
          </div>
        </div>

        {cleanest && (
          <div className="self-start sm:self-center px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-heading font-medium flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>
              {lang === 'vi' ? 'Giờ sạch nhất: ' : 'Best time: '}
              <strong className="text-emerald-200">{cleanest.time}</strong> (AQI {cleanest.aqi})
            </span>
          </div>
        )}
      </div>

      {/* Chart Canvas */}
      <div className="h-44 sm:h-52 w-full pt-2 min-w-0 min-h-[160px] relative">
        {!chartData.length ? (
          <div className="h-full flex items-center justify-center text-center text-xs text-white/50 px-4">
            {loading
              ? (lang === 'vi' ? 'Đang tải dự báo không khí...' : 'Loading air forecast...')
              : (lang === 'vi' ? 'Chưa có dự báo AQI cho vị trí này.' : 'No AQI forecast for this location.')}
          </div>
        ) : (
        <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={160}>
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
            <defs>
              <linearGradient id="aqiAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={mainColor} stopOpacity={0.45} />
                <stop offset="95%" stopColor={mainColor} stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis
              dataKey="time"
              stroke="rgba(255,255,255,0.35)"
              tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="rgba(255,255,255,0.35)"
              tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              domain={[0, 'dataMax + 20']}
            />
            <Tooltip content={(props: any) => <CustomTooltip {...props} lang={lang} />} />
            <Area
              type="monotone"
              dataKey="aqi"
              stroke={mainColor}
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#aqiAreaGrad)"
              activeDot={{ r: 5, fill: mainColor, stroke: '#fff', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
