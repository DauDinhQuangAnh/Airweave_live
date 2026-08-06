import { motion } from 'framer-motion';
import { Ban, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import { generateHourlyForecast } from '@/lib/mock-data';
import { getAQIColor, getAQILevel } from '@/lib/aqi-utils';

interface SmartOutdoorTimeProps {
  lang: 'vi' | 'en';
}

const SmartOutdoorTime = ({ lang }: SmartOutdoorTimeProps) => {
  const forecast = generateHourlyForecast();

  return (
    <section>
      <div className="flex items-center gap-2 mb-5">
        <Clock className="w-5 h-5 text-foreground" />
        <h2 className="font-heading text-xl font-bold text-foreground">
          {lang === 'vi' ? 'Lịch trình ngoài trời thông minh' : 'Smart Outdoor Time'}
        </h2>
      </div>

      <div className="p-5 rounded-2xl bg-card border border-border/50">
        {/* Timeline bars */}
        <div className="flex gap-[2px] items-end h-28 mb-3">
          {forecast.map((hour, i) => {
            const level = getAQILevel(hour.aqi);
            const color = getAQIColor(hour.aqi);
            const height = Math.max(20, (hour.aqi / 200) * 100);
            return (
              <motion.div
                key={i}
                initial={{ height: 0 }}
                animate={{ height: `${height}%` }}
                transition={{ delay: i * 0.03, duration: 0.4 }}
                className="flex-1 rounded-t-sm cursor-pointer relative group min-w-0"
                style={{ backgroundColor: color }}
                title={`${hour.label}: AQI ${hour.aqi}`}
              >
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-foreground text-primary-foreground text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap font-heading font-semibold z-10">
                  {hour.aqi}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Time labels */}
        <div className="flex justify-between text-[10px] text-muted-foreground font-body px-0.5">
          {forecast.filter((_, i) => i % 4 === 0).map((hour) => (
            <span key={hour.label}>{hour.label}</span>
          ))}
        </div>

        {/* Suggestions */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <SuggestionCard
            icon={<Ban className="w-4 h-4" />}
            color="#FF0000"
            title={lang === 'vi' ? 'Tránh ra ngoài' : 'Avoid outdoor'}
            desc={lang === 'vi' ? '6:00 - 9:00' : '6:00 - 9:00 AM'}
          />
          <SuggestionCard
            icon={<AlertTriangle className="w-4 h-4" />}
            color="#FF7E00"
            title={lang === 'vi' ? 'Đeo khẩu trang' : 'Wear mask'}
            desc={lang === 'vi' ? '9:00 - 13:00' : '9:00 AM - 1:00 PM'}
          />
          <SuggestionCard
            icon={<CheckCircle2 className="w-4 h-4" />}
            color="#00E400"
            title={lang === 'vi' ? 'An toàn' : 'Safe to go out'}
            desc={lang === 'vi' ? '14:00 - 17:00' : '2:00 - 5:00 PM'}
          />
        </div>
      </div>
    </section>
  );
};

function SuggestionCard({ icon, color, title, desc }: { icon: React.ReactNode; color: string; title: string; desc: string }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-border/40" style={{ backgroundColor: color + '0A' }}>
      <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: color + '20', color }}>
        {icon}
      </div>
      <div>
        <p className="font-heading text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground font-body">{desc}</p>
      </div>
    </div>
  );
}

export default SmartOutdoorTime;
