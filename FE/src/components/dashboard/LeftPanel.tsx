import { useMemo, useState } from 'react';
import { PAMStation, getAQIColorNew, getAQIStatusVi } from '@/lib/pam-stations';
import { ArrowUp, ArrowDown, ArrowRight, RefreshCw, Loader2, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WeatherData } from '@/hooks/use-weather-data';

interface Props {
  stations: PAMStation[];
  activeId: string | null;
  onSelect: (station: PAMStation) => void;
  onRefresh: () => void;
  userLocation?: string;
  userWeather?: WeatherData;
}

const LeftPanel = ({ stations, activeId, onSelect, onRefresh, userLocation, userWeather }: Props) => {
  const active = stations.find(s => s.id === activeId) || stations[0];
  // Prefer real weather data for the user's location; fall back to active station only if weather is unavailable.
  const realAqi = userWeather && !userWeather.loading && userWeather.aqi > 0 ? userWeather.aqi : null;
  const heroAqi = realAqi ?? active.aqi;
  const aqiColor = getAQIColorNew(heroAqi);
  const heroPm25 = realAqi !== null ? userWeather!.pm25 : active.pm25;
  const heroPm10 = realAqi !== null ? userWeather!.pm10 : active.pm10;
  const heroTemp = realAqi !== null ? userWeather!.temperature : active.temp;
  const heroHumidity = realAqi !== null ? userWeather!.humidity : null;
  const heroSource = realAqi !== null ? userWeather!.source : null;
  const heroStation = realAqi !== null ? userWeather!.station : null;
  const isLoadingReal = !!userWeather && userWeather.loading;
  const updatedTime = realAqi !== null && userWeather!.updatedAt
    ? new Date(userWeather!.updatedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    : new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="w-full md:w-[300px] shrink-0 h-full flex flex-col border-r border-border bg-card/90 backdrop-blur-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h2 className="font-heading text-sm font-bold text-foreground/80">📡 Trạm PAM Air</h2>
        <Button variant="ghost" size="icon" onClick={onRefresh} className="w-7 h-7 text-muted-foreground hover:text-foreground">
          <RefreshCw className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* AQI Hero Widget — REAL data from WAQI/Open-Meteo for user's GPS location */}
      <div className="p-4 border-b border-border">
        <div className="rounded-xl p-4 text-center bg-muted/50 border border-border">
          <p className="text-xs font-body text-muted-foreground mb-1 truncate" title={userLocation}>
            📍 {userLocation || 'Vị trí của bạn'}
          </p>
          {isLoadingReal ? (
            <div className="flex flex-col items-center py-6 gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="text-[10px] text-muted-foreground font-body">Đang tải dữ liệu thực...</span>
            </div>
          ) : (
            <>
              <span
                className="text-5xl sm:text-6xl font-heading font-extrabold block leading-none"
                style={{ color: aqiColor, textShadow: `0 0 30px ${aqiColor}40` }}
              >
                {heroAqi}
              </span>
              <span className="text-[10px] text-muted-foreground/60 font-body block mt-1">Chỉ số AQI</span>
              <div className="mt-2">
                <span
                  className="inline-block px-3 py-1 rounded-full text-[11px] font-body max-w-full truncate"
                  style={{ backgroundColor: `${aqiColor}20`, color: aqiColor }}
                >
                  {getAQIStatusVi(heroAqi)}
                </span>
              </div>
              {/* AQI bar */}
              <div
                className="w-full mt-3 h-1.5 rounded-full overflow-hidden"
                style={{ background: 'linear-gradient(to right, #22c55e, #eab308, #f97316, #ef4444, #7c3aed)' }}
              >
                <div className="relative h-full" style={{ width: `${Math.min(heroAqi / 300, 1) * 100}%` }}>
                  <div
                    className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-background border-2 shadow"
                    style={{ borderColor: aqiColor }}
                  />
                </div>
              </div>
              <div className="flex items-center justify-center gap-1 mt-2 flex-wrap">
                {heroSource === 'waqi' && heroStation && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-heading font-semibold bg-green-500/15 text-green-600 border border-green-500/20 max-w-[140px] truncate">
                    📡 {heroStation}
                  </span>
                )}
                {heroSource === 'open-meteo' && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-heading font-semibold bg-blue-500/15 text-blue-600 border border-blue-500/20">
                    Open-Meteo
                  </span>
                )}
                <span className="text-[10px] text-muted-foreground/60 font-body">· {updatedTime}</span>
              </div>
              {/* Sub metrics — real values */}
              <div className="grid grid-cols-2 gap-2 mt-3">
                {[
                  { label: 'PM2.5', value: heroPm25 || '--', unit: 'µg/m³' },
                  { label: 'PM10', value: heroPm10 || '--', unit: 'µg/m³' },
                  { label: 'Nhiệt độ', value: heroTemp || '--', unit: '°C' },
                  { label: 'Độ ẩm', value: heroHumidity ?? '--', unit: '%' },
                ].map(m => (
                  <div key={m.label} className="text-center p-1.5 rounded-lg bg-secondary/50 min-w-0">
                    <div className="flex items-baseline justify-center gap-0.5 min-w-0">
                      <span className="text-xs font-heading font-bold text-foreground/70 truncate">{m.value}</span>
                      <span className="text-[9px] text-muted-foreground/60 font-body shrink-0">{m.unit}</span>
                    </div>
                    <p className="text-[9px] text-muted-foreground/60 font-body truncate">{m.label}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Station List grouped by city */}
      <CityGroupedStations stations={stations} activeId={activeId} onSelect={onSelect} />
    </div>
  );
};

interface CityGroupedProps {
  stations: PAMStation[];
  activeId: string | null;
  onSelect: (s: PAMStation) => void;
}

const CityGroupedStations = ({ stations, activeId, onSelect }: CityGroupedProps) => {
  const groups = useMemo(() => {
    const map = new Map<string, PAMStation[]>();
    stations.forEach(s => {
      const arr = map.get(s.city) ?? [];
      arr.push(s);
      map.set(s.city, arr);
    });
    return Array.from(map.entries()).map(([city, items]) => ({
      city,
      items: items.sort((a, b) => b.aqi - a.aqi),
      avg: Math.round(items.reduce((sum, s) => sum + s.aqi, 0) / items.length),
    }));
  }, [stations]);

  // City containing the active station should default to open
  const activeCity = stations.find(s => s.id === activeId)?.city;
  const [openCities, setOpenCities] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    groups.forEach(g => { init[g.city] = activeCity ? g.city === activeCity : true; });
    return init;
  });

  const toggle = (city: string) => setOpenCities(prev => ({ ...prev, [city]: !prev[city] }));

  return (
    <div className="flex-1 overflow-y-auto">
      {groups.map(g => {
        const cityColor = getAQIColorNew(g.avg);
        const isOpen = openCities[g.city];
        return (
          <div key={g.city} className="border-b border-border/60">
            <button
              onClick={() => toggle(g.city)}
              className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-accent/40 transition-colors"
            >
              <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground/60 transition-transform ${isOpen ? '' : '-rotate-90'}`} />
              <span className="text-xs font-heading font-bold text-foreground/80 flex-1 text-left">{g.city}</span>
              <span className="text-[10px] font-body text-muted-foreground/60">{g.items.length} trạm</span>
              <span className="text-xs font-heading font-bold" style={{ color: cityColor }}>~{g.avg}</span>
            </button>
            {isOpen && g.items.map(s => {
              const color = getAQIColorNew(s.aqi);
              const isActive = s.id === activeId;
              return (
                <button
                  key={s.id}
                  onClick={() => onSelect(s)}
                  className={`w-full flex items-center gap-2 pl-7 pr-3 py-2 text-left transition-all hover:bg-accent/50 ${isActive ? 'bg-accent border-l-2' : 'border-l-2 border-transparent'}`}
                  style={isActive ? { borderLeftColor: '#00d4aa' } : {}}
                >
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}60` }} />
                  <span className="flex-1 text-xs font-body text-foreground/70 truncate">{s.district}</span>
                  <span className="text-xs font-heading font-bold" style={{ color }}>{s.aqi}</span>
                  {s.trend === 'up' && <ArrowUp className="w-3 h-3 text-red-400" />}
                  {s.trend === 'down' && <ArrowDown className="w-3 h-3 text-green-400" />}
                  {s.trend === 'stable' && <ArrowRight className="w-3 h-3 text-muted-foreground/40" />}
                </button>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};

export default LeftPanel;
