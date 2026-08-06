import { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar as CalendarIcon, Clock, History, Loader2 } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { vi as viLocale } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { getAQIColor, getAQILabel, getAQIBgColor, getAQITextColor } from '@/lib/aqi-utils';
import { useHistoricalData } from '@/hooks/use-historical-data';

interface HistoricalTimeMachineProps {
  lang: 'vi' | 'en';
  lat: number;
  lng: number;
}

const HistoricalTimeMachine = ({ lang, lat, lng }: HistoricalTimeMachineProps) => {
  const [date, setDate] = useState<Date>(subDays(new Date(), 1));
  const [hour, setHour] = useState([8]);

  const data = useHistoricalData(lat, lng, date, hour[0]);

  const color = getAQIColor(data.aqi);
  const bgColor = getAQIBgColor(data.aqi);
  const textColor = getAQITextColor(data.aqi);
  const label = getAQILabel(data.aqi, lang);

  return (
    <section>
      <div className="flex items-center gap-2 mb-5">
        <History className="w-5 h-5 text-foreground" />
        <h2 className="font-heading text-xl font-bold text-foreground">
          {lang === 'vi' ? 'Cỗ máy thời gian' : 'Historical Time Machine'}
        </h2>
      </div>

      <div className="p-5 rounded-2xl bg-card border border-border/50">
        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("justify-start text-left font-body gap-2 flex-1")}>
                <CalendarIcon className="w-4 h-4" />
                {format(date, 'dd/MM/yyyy')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(d) => d && setDate(d)}
                disabled={(d) => d > new Date() || d < subDays(new Date(), 730)}
                className="p-3 pointer-events-auto"
                locale={lang === 'vi' ? viLocale : undefined}
              />
            </PopoverContent>
          </Popover>

          <div className="flex-1 flex items-center gap-3">
            <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
            <Slider
              value={hour}
              onValueChange={setHour}
              min={0}
              max={23}
              step={1}
              className="flex-1"
            />
            <span className="font-heading text-sm font-semibold text-foreground w-12 text-right">
              {hour[0].toString().padStart(2, '0')}:00
            </span>
          </div>
        </div>

        {/* Dashboard Snapshot */}
        <motion.div
          key={`${date.toISOString()}-${hour[0]}`}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="rounded-xl overflow-hidden border border-border/40 transition-colors duration-500"
          style={{ backgroundColor: data.loading ? undefined : bgColor }}
        >
          {data.loading ? (
            <div className="p-6 flex items-center justify-center min-h-[200px]">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : data.error ? (
            <div className="p-6 text-center">
              <p className="text-sm text-muted-foreground font-body">
                {lang === 'vi' ? 'Không có dữ liệu cho ngày này' : 'No data available for this date'}
              </p>
            </div>
          ) : (
            <div className="p-6 flex flex-col items-center">
              <p className="text-xs text-muted-foreground font-body mb-4">
                {format(date, lang === 'vi' ? 'dd/MM/yyyy' : 'MMM dd, yyyy')} – {hour[0].toString().padStart(2, '0')}:00
              </p>
              {/* AQI Circle */}
              <div
                className="w-28 h-28 rounded-full flex flex-col items-center justify-center shadow-lg mb-3"
                style={{ backgroundColor: color, color: textColor }}
              >
                <span className="font-heading text-4xl font-extrabold">{data.aqi}</span>
                <span className="text-xs font-heading font-semibold opacity-80">AQI</span>
              </div>
              <span
                className="px-3 py-1 rounded-full text-xs font-heading font-semibold mb-4"
                style={{ backgroundColor: color + '22', color }}
              >
                {label}
              </span>
              {/* Mini stats */}
              <div className="grid grid-cols-3 gap-2 w-full max-w-sm">
                <div className="text-center p-2 rounded-lg bg-card/60 border border-border/30">
                  <p className="text-[10px] text-muted-foreground font-body">{lang === 'vi' ? 'Nhiệt độ' : 'Temp'}</p>
                  <p className="font-heading text-sm font-bold text-foreground">{data.temperature}°C</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-card/60 border border-border/30">
                  <p className="text-[10px] text-muted-foreground font-body">{lang === 'vi' ? 'Độ ẩm' : 'Humidity'}</p>
                  <p className="font-heading text-sm font-bold text-foreground">{data.humidity}%</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-card/60 border border-border/30">
                  <p className="text-[10px] text-muted-foreground font-body">PM2.5</p>
                  <p className="font-heading text-sm font-bold text-foreground">{data.pm25}</p>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </section>
  );
};

export default HistoricalTimeMachine;
