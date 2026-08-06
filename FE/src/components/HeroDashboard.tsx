import { motion } from 'framer-motion';
import { Droplets, MapPin, Thermometer, Wind, Navigation, Loader2, RefreshCw } from 'lucide-react';
import { getAQIColor, getAQILabel, getAQIBgColor, getAQITextColor } from '@/lib/aqi-utils';
import AQIGauge from '@/components/AQIGauge';
import AITooltip from '@/components/AITooltip';
import WindBoomerangLoader from '@/components/WindBoomerangLoader';
import { GeoLocation } from '@/hooks/use-geolocation';
import { WeatherData } from '@/hooks/use-weather-data';

interface HeroDashboardProps {
  lang: 'vi' | 'en';
  location: GeoLocation;
  weather: WeatherData;
  onRequestLocation: () => void;
}

const HeroDashboard = ({ lang, location, weather, onRequestLocation }: HeroDashboardProps) => {
  if (!location) return null;

  const aqi = weather.aqi;
  const color = getAQIColor(aqi);
  const textColor = getAQITextColor(aqi);
  const label = getAQILabel(aqi, lang);
  const bgColor = getAQIBgColor(aqi);

  const showLocationPrompt = location.permissionState === 'prompt' || location.permissionState === 'denied';
  const isLoading = location.loading || weather.loading;

  return (
    <section
      className="relative overflow-hidden rounded-2xl"
      style={{ backgroundColor: isLoading ? undefined : bgColor, transition: 'background-color 0.8s ease-in-out' }}
    >
      <div className="relative p-6 md:p-10">
        {/* GPS Location - top left */}
        <div className="flex items-center gap-2 text-muted-foreground mb-8 flex-wrap">
          {location.loading ? (
            <div className="flex items-center gap-1.5">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-xs font-body">
                {lang === 'vi' ? 'Đang xác định vị trí...' : 'Locating...'}
              </span>
            </div>
          ) : (
            <>
              <MapPin className="w-4 h-4 shrink-0" />
              <span className="text-xs font-body">
                {lang === 'vi' ? '📍 Dữ liệu cho: ' : '📍 Data for: '}
                <span className="font-semibold text-foreground">{location.label}</span>
              </span>
            </>
          )}
          {showLocationPrompt && (
            <button
              onClick={onRequestLocation}
              className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-heading font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            >
              <Navigation className="w-3 h-3" />
              {lang === 'vi' ? 'Dùng vị trí của tôi' : 'Use my location'}
            </button>
          )}
          {location.permissionState === 'granted' && !location.loading && (
            <span className="ml-auto flex items-center gap-1 text-[10px] text-green-600 font-body">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              GPS Live
            </span>
          )}
        </div>

        {/* Loading state */}
        {isLoading ? (
          <div className="py-16">
            <WindBoomerangLoader
              text={lang === 'vi' ? 'Đang tải dữ liệu thời tiết & ô nhiễm...' : 'Loading weather & air quality data...'}
            />
          </div>
        ) : weather.error ? (
          <div className="flex flex-col items-center py-16 gap-3">
            <RefreshCw className="w-8 h-8 text-muted-foreground" />
            <p className="text-sm text-destructive font-body">{weather.error}</p>
            <button
              onClick={onRequestLocation}
              className="px-4 py-2 rounded-lg text-xs font-heading font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            >
              {lang === 'vi' ? 'Thử lại' : 'Retry'}
            </button>
          </div>
        ) : (
          <>
            {/* Center AQI Gauge with count-up & stroke animation */}
            <div className="flex flex-col items-center mb-8">
              <AQIGauge aqi={aqi} size={220} />
              <motion.div
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.4 }}
                className="mt-4 px-5 py-1.5 rounded-full text-sm font-heading font-bold"
                style={{ backgroundColor: color + '22', color }}
              >
                {label}
              </motion.div>
              {weather.updatedAt && (
                <div className="mt-2 flex items-center gap-2">
                  <p className="text-[10px] text-muted-foreground font-body">
                    {lang === 'vi' ? 'Cập nhật: ' : 'Updated: '}
                    {new Date(weather.updatedAt).toLocaleTimeString(lang === 'vi' ? 'vi-VN' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  {weather.source === 'waqi' && weather.station && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-heading font-semibold bg-green-500/15 text-green-600 border border-green-500/20">
                      📡 {weather.station}
                    </span>
                  )}
                  {weather.source === 'open-meteo' && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-heading font-semibold bg-blue-500/15 text-blue-600 border border-blue-500/20">
                      Open-Meteo
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* 4-column stats grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard
                icon={<span className="text-[10px] font-heading font-extrabold opacity-70">PM</span>}
                label="PM2.5"
                value={`${weather.pm25}`}
                unit="µg/m³"
                aiTooltip={<AITooltip metricKey="PM2.5" lang={lang} />}
              />
              <StatCard
                icon={<Thermometer className="w-4 h-4 opacity-70" />}
                label={lang === 'vi' ? 'Nhiệt độ' : 'Temp'}
                value={`${weather.temperature}`}
                unit="°C"
                aiTooltip={<AITooltip metricKey="temperature" lang={lang} />}
              />
              <StatCard
                icon={<Droplets className="w-4 h-4 opacity-70" />}
                label={lang === 'vi' ? 'Độ ẩm' : 'Humidity'}
                value={`${weather.humidity}`}
                unit="%"
                aiTooltip={<AITooltip metricKey="humidity" lang={lang} />}
              />
              <StatCard
                icon={<Wind className="w-4 h-4 opacity-70" />}
                label={lang === 'vi' ? 'Gió' : 'Wind'}
                value={`${weather.windSpeed}`}
                unit={`km/h ${weather.windDirection}`}
                aiTooltip={<AITooltip metricKey="wind" lang={lang} />}
              />
            </div>
          </>
        )}
      </div>
    </section>
  );
};

function StatCard({ icon, label, value, unit, aiTooltip }: { icon: React.ReactNode; label: string; value: string; unit: string; aiTooltip?: React.ReactNode }) {
  return (
    <div className="p-4 rounded-xl bg-card/70 border border-border/30 backdrop-blur-sm text-center">
      <div className="flex items-center justify-center gap-1.5 text-muted-foreground mb-1.5">
        <span className="animate-pulse">{icon}</span>
        <span className="text-xs font-body">{label}</span>
        {aiTooltip}
      </div>
      <span className="font-heading text-2xl font-bold text-foreground">{value}</span>
      <span className="text-xs text-muted-foreground font-body ml-1">{unit}</span>
    </div>
  );
}

export default HeroDashboard;
