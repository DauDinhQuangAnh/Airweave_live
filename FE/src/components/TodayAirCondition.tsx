import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { CloudSun, ShieldCheck, ShieldAlert, Ban, Loader2 } from 'lucide-react';
import { getAQIColor } from '@/lib/aqi-utils';
import { HourlyForecast } from '@/hooks/use-weather-data';

interface TodayAirConditionProps {
  lang: 'vi' | 'en';
  forecast: HourlyForecast[];
  loading: boolean;
}

const TodayAirCondition = ({ lang, forecast, loading }: TodayAirConditionProps) => {
  const chartData = forecast.map((h) => ({
    time: h.label,
    aqi: h.aqi,
    color: getAQIColor(h.aqi),
  }));

  const segments = useMemo(() => {
    const result: { start: string; end: string; level: 'safe' | 'caution' | 'avoid' }[] = [];
    let current: typeof result[0] | null = null;

    forecast.forEach((h) => {
      const level = h.aqi <= 100 ? 'safe' : h.aqi <= 150 ? 'caution' : 'avoid';
      if (!current || current.level !== level) {
        if (current) result.push(current);
        current = { start: h.label, end: h.label, level };
      } else {
        current.end = h.label;
      }
    });
    if (current) result.push(current);
    return result;
  }, [forecast]);

  const segmentConfig = {
    safe: {
      color: '#00E400',
      icon: <ShieldCheck className="w-3.5 h-3.5" />,
      label: lang === 'vi' ? 'An toàn' : 'Safe',
    },
    caution: {
      color: '#FF7E00',
      icon: <ShieldAlert className="w-3.5 h-3.5" />,
      label: lang === 'vi' ? 'Đeo khẩu trang' : 'Wear mask',
    },
    avoid: {
      color: '#FF0000',
      icon: <Ban className="w-3.5 h-3.5" />,
      label: lang === 'vi' ? 'Tránh ra ngoài' : 'Avoid',
    },
  };

  return (
    <section>
      <div className="flex items-center gap-2 mb-5">
        <CloudSun className="w-5 h-5 text-foreground" />
        <h2 className="font-heading text-xl font-bold text-foreground">
          {lang === 'vi' ? 'Tình trạng không khí hôm nay' : 'Today Air Condition'}
        </h2>
      </div>

      <div className="p-5 rounded-2xl bg-card border border-border/50">
        {loading || forecast.length === 0 ? (
          <div className="flex flex-col items-center py-12 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground font-body">
              {lang === 'vi' ? 'Đang tải dự báo...' : 'Loading forecast...'}
            </p>
          </div>
        ) : (
          <>
            {/* 24h Chart */}
            <div className="h-52 md:h-64 mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="aqiGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="time"
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false}
                    axisLine={false}
                    interval={3}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false}
                    axisLine={false}
                    domain={[0, 'auto']}
                  />
                  <ReferenceLine y={100} stroke="#FF7E00" strokeDasharray="4 4" strokeOpacity={0.5} />
                  <ReferenceLine y={150} stroke="#FF0000" strokeDasharray="4 4" strokeOpacity={0.5} />
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontFamily: 'Inter',
                    }}
                    formatter={(value: number) => [`AQI ${value}`, '']}
                    labelFormatter={(label) => `🕐 ${label}`}
                  />
                  <Area
                    type="monotone"
                    dataKey="aqi"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fill="url(#aqiGradient)"
                    dot={false}
                    activeDot={{ r: 5, fill: 'hsl(var(--primary))' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Smart Outdoor Bar */}
            <div>
              <p className="text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                {lang === 'vi' ? 'Gợi ý hoạt động ngoài trời' : 'Smart Outdoor Time'}
              </p>
              <div className="flex gap-[2px] rounded-lg overflow-hidden h-8">
                {segments.map((seg, i) => {
                  const config = segmentConfig[seg.level];
                  const startH = parseInt(seg.start);
                  const endH = parseInt(seg.end);
                  const span = ((endH - startH + 1) / 24) * 100;
                  return (
                    <motion.div
                      key={i}
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ delay: i * 0.1, duration: 0.3 }}
                      className="flex items-center justify-center gap-1 origin-left"
                      style={{
                        width: `${span}%`,
                        backgroundColor: config.color + '25',
                        color: config.color,
                      }}
                      title={`${seg.start} - ${seg.end}: ${config.label}`}
                    >
                      {config.icon}
                      {span > 10 && (
                        <span className="text-[10px] font-heading font-semibold hidden sm:inline">
                          {seg.start}-{seg.end}
                        </span>
                      )}
                    </motion.div>
                  );
                })}
              </div>
              <div className="flex gap-4 mt-2">
                {(['safe', 'caution', 'avoid'] as const).map((level) => (
                  <div key={level} className="flex items-center gap-1.5">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: segmentConfig[level].color }}
                    />
                    <span className="text-[10px] text-muted-foreground font-body">
                      {segmentConfig[level].label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
};

export default TodayAirCondition;
