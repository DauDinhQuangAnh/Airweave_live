import { useEffect, useRef, useState } from 'react';

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
}

function getAQIColor(aqi: number) {
  if (aqi <= 50) return '#22c55e';
  if (aqi <= 100) return '#eab308';
  if (aqi <= 150) return '#f97316';
  if (aqi <= 200) return '#ef4444';
  if (aqi <= 300) return '#7c3aed';
  return '#7c1f1f';
}

function getAQIStatus(aqi: number) {
  if (aqi <= 50) return 'Tot';
  if (aqi <= 100) return 'Trung binh';
  if (aqi <= 150) return 'Nhay cam';
  if (aqi <= 200) return 'Khong lanh manh';
  if (aqi <= 300) return 'Rat xau';
  return 'Nguy hiem';
}

const AQITicker = ({ items, loading = false, message, animate = true }: AQITickerProps) => {
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
          {loading ? 'Dang lay AQI theo vi tri hien tai...' : message || 'Chua co du lieu AQI theo vi tri hien tai.'}
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
  pm25: number;
  pm10: number;
  temperature: number;
  humidity: number;
  windSpeed: number;
  source?: string | null;
}): AQITickerItem[] {
  const aqiColor = getAQIColor(params.aqi);
  return [
    {
      name: params.locationLabel,
      label: 'AQI',
      value: params.aqi,
      status: getAQIStatus(params.aqi),
      source: params.source,
      color: aqiColor,
    },
    {
      name: 'PM2.5',
      label: 'Bui min',
      value: `${params.pm25.toFixed(1)} ug/m3`,
      color: '#f59e0b',
    },
    {
      name: 'PM10',
      label: 'Bui tho',
      value: `${params.pm10.toFixed(1)} ug/m3`,
      color: '#0ea5e9',
    },
    {
      name: 'Nhiet do',
      label: 'Hien tai',
      value: `${params.temperature} C`,
      color: '#22c55e',
    },
    {
      name: 'Do am',
      label: 'Hien tai',
      value: `${params.humidity}%`,
      color: '#06b6d4',
    },
    {
      name: 'Gio',
      label: 'Toc do',
      value: `${params.windSpeed} km/h`,
      color: '#7c3aed',
    },
  ];
}

export default AQITicker;
