import { Loader2 } from 'lucide-react';
import { getAQIColorNew, getAQIStatusVi } from '@/lib/pam-stations';
import type { WeatherData } from '@/hooks/use-weather-data';

interface Props {
  userLocation?: string;
  weather: WeatherData;
}

const PAMAirSummary = ({ userLocation, weather }: Props) => {
  const loading = weather.loading;
  const aqi = weather.aqi || 0;
  const color = getAQIColorNew(aqi);
  const updated = weather.updatedAt
    ? new Date(weather.updatedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    : '--:--';

  if (loading) {
    return (
      <div className="rounded-2xl bg-card/90 border border-border p-5 flex items-center justify-center min-h-[140px]">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-card/90 border border-border p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wider font-heading font-bold text-muted-foreground">📡 WAQI · Vị trí của bạn</p>
          <p className="text-xs font-body text-foreground/70 truncate" title={userLocation}>{userLocation || 'Đang xác định...'}</p>
        </div>
        <span className="text-[10px] font-body text-muted-foreground/60 shrink-0">⏱ {updated}</span>
      </div>

      <div className="flex items-center gap-4">
        {/* Big AQI */}
        <div className="text-center shrink-0">
          <div
            className="text-4xl sm:text-5xl font-heading font-extrabold leading-none"
            style={{ color, textShadow: `0 0 24px ${color}40` }}
          >
            {aqi || '--'}
          </div>
          <div className="text-[9px] font-body text-muted-foreground/60 mt-0.5">AQI</div>
        </div>

        {/* Status + bar + metrics */}
        <div className="flex-1 min-w-0">
          <span
            className="inline-block px-2 py-0.5 rounded-full text-[10px] font-heading font-semibold"
            style={{ backgroundColor: `${color}20`, color }}
          >
            {getAQIStatusVi(aqi)}
          </span>
          <div
            className="w-full mt-2 h-1.5 rounded-full overflow-hidden"
            style={{ background: 'linear-gradient(to right, #22c55e, #eab308, #f97316, #ef4444, #7c3aed)' }}
          >
            <div className="relative h-full" style={{ width: `${Math.min(aqi / 300, 1) * 100}%` }}>
              <div
                className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-background border-2"
                style={{ borderColor: color }}
              />
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2 mt-3">
            {[
              { label: 'PM2.5', value: weather.pm25 || '--', unit: 'µg' },
              { label: 'PM10', value: weather.pm10 || '--', unit: 'µg' },
              { label: 'Nhiệt', value: weather.temperature || '--', unit: '°C' },
              { label: 'Ẩm', value: weather.humidity ?? '--', unit: '%' },
            ].map(m => (
              <div key={m.label} className="text-center min-w-0">
                <div className="text-xs font-heading font-bold text-foreground/80 truncate">
                  {m.value}<span className="text-[9px] text-muted-foreground/60 ml-0.5">{m.unit}</span>
                </div>
                <p className="text-[9px] font-body text-muted-foreground/60">{m.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-3">
        {weather.source === 'waqi' && weather.station && (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-heading font-semibold bg-green-500/15 text-green-600 border border-green-500/20 truncate max-w-[160px]">
            📡 {weather.station}
          </span>
        )}
        {weather.source === 'open-meteo' && (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-heading font-semibold bg-blue-500/15 text-blue-600 border border-blue-500/20">
            Open-Meteo
          </span>
        )}
      </div>
    </div>
  );
};

export default PAMAirSummary;
