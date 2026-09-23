import { useEffect, useRef, useState } from 'react';
import { getAQIStatus } from '@/lib/air-quality';

export type AQITickerItem = {
  name: string;
  label: string;
  value: string | number;
  status?: string | null;
  source?: string | null;
  color?: string;
};

interface AQITickerProps {
  items: AQITickerItem[];
  loading?: boolean;
  message?: string;
  animate?: boolean;
  lang?: 'vi' | 'en';
}

function getAQIColor(aqi: number) {
  if (aqi <= 50) return '#22c55e';
  if (aqi <= 100) return '#eab308';
  if (aqi <= 150) return '#f97316';
  if (aqi <= 200) return '#ef4444';
  if (aqi <= 300) return '#7c3aed';
  return '#7c1f1f';
}

const AQITicker = ({ items, loading = false, message, animate = true, lang = 'vi' }: AQITickerProps) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isDocumentVisible, setIsDocumentVisible] = useState(() => !document.hidden);
  const tickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = tickerRef.current;
    if (!node || !('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { rootMargin: '120px 0px' }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const handleVisibility = () => setIsDocumentVisible(!document.hidden);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  const canAnimate = animate && items.length > 1 && isVisible && isDocumentVisible;
  const renderedItems = items.length > 1 ? [...items, ...items] : items;

  return (
    <div ref={tickerRef} className="w-full overflow-hidden bg-muted/80 border-y border-border py-2.5 relative z-20">
      {items.length === 0 ? (
        <div className="px-4 text-sm font-body text-muted-foreground">
          {loading ? (lang === 'vi' ? 'Đang lấy AQI theo vị trí hiện tại...' : 'Loading AQI for your location...') : message || (lang === 'vi' ? 'Chưa có dữ liệu AQI theo vị trí hiện tại.' : 'No location-based AQI data available.')}
        </div>
      ) : (
        <div
          className={items.length > 1 ? 'flex animate-ticker whitespace-nowrap' : 'flex whitespace-nowrap'}
          style={{ animationPlayState: canAnimate ? 'running' : 'paused' }}
        >
          {renderedItems.map((it, i) => (
            <span key={`${it.name}-${i}`} className="inline-flex items-center gap-2 px-6 text-sm font-body text-muted-foreground shrink-0">
              {(() => {
                const color = it.color || '#0ea5e9';
                return (
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}` }}
                  />
                );
              })()}
              <span className="font-medium text-foreground">{it.name}</span>
              <span>· {it.label}</span>
              <span className="font-bold" style={{ color: it.color || '#0ea5e9' }}>{it.value}</span>
              {it.status && <span>· {it.status}</span>}
              {it.source && <span className="text-xs">· {it.source}</span>}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export function buildCurrentAirTickerItems(params: {
  locationLabel: string;
  aqi: number;
  pm25?: number | null;
  pm10?: number | null;
  temperature?: number | null;
  humidity?: number | null;
  windSpeed?: number | null;
  source?: string | null;
  lang?: 'vi' | 'en';
}): AQITickerItem[] {
  const lang = params.lang ?? 'vi';
  const aqiColor = getAQIColor(params.aqi);
  const items: AQITickerItem[] = [
    {
      name: params.locationLabel,
      label: 'AQI',
      value: params.aqi,
      status: getAQIStatus(params.aqi, lang),
      source: params.source,
      color: aqiColor,
    },
  ];
  if (params.pm25 != null) items.push({
      name: 'PM2.5',
      label: lang === 'vi' ? 'Bụi mịn' : 'Fine particles',
      value: `${params.pm25.toFixed(1)} µg/m³`,
      color: '#f59e0b',
    });
  if (params.pm10 != null) items.push({
      name: 'PM10',
      label: lang === 'vi' ? 'Bụi thô' : 'Coarse particles',
      value: `${params.pm10.toFixed(1)} µg/m³`,
      color: '#0ea5e9',
    });
  if (params.temperature != null) items.push({
      name: lang === 'vi' ? 'Nhiệt độ' : 'Temperature',
      label: lang === 'vi' ? 'Hiện tại' : 'Current',
      value: `${params.temperature}°C`,
      color: '#22c55e',
    });
  if (params.humidity != null) items.push({
      name: lang === 'vi' ? 'Độ ẩm' : 'Humidity',
      label: lang === 'vi' ? 'Hiện tại' : 'Current',
      value: `${params.humidity}%`,
      color: '#06b6d4',
    });
  if (params.windSpeed != null) items.push({
      name: lang === 'vi' ? 'Gió' : 'Wind',
      label: lang === 'vi' ? 'Tốc độ' : 'Speed',
      value: `${params.windSpeed} km/h`,
      color: '#7c3aed',
    });
  return items;
}

export default AQITicker;
