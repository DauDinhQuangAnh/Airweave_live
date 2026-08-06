import { BarChart3, Clock, MapPin, Shield, Loader2 } from 'lucide-react';
import { useWeeklyReport } from '@/hooks/use-weekly-report';

interface WeeklyAirReportProps {
  lang: 'vi' | 'en';
  lat: number;
  lng: number;
}

const WeeklyAirReport = ({ lang, lat, lng }: WeeklyAirReportProps) => {
  const report = useWeeklyReport(lat, lng, lang);

  if (report.loading) {
    return (
      <section className="p-6 rounded-xl bg-card border border-border/50 flex items-center justify-center min-h-[200px]">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </section>
    );
  }

  if (report.days.length === 0) return null;

  const maxAqi = Math.max(...report.days.map(d => d.aqi), 1);

  return (
    <section className="p-6 rounded-xl bg-card border border-border/50">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="w-5 h-5 text-primary" />
        <h3 className="font-heading text-base font-bold text-foreground">
          {lang === 'vi' ? 'Báo cáo tuần' : 'Weekly Air Report'}
        </h3>
      </div>

      {/* Bar chart */}
      <div className="flex items-end gap-2 h-32 mb-6">
        {report.days.map((d) => {
          const height = (d.aqi / maxAqi) * 100;
          const color = d.aqi <= 50 ? 'bg-aqi-good' : d.aqi <= 100 ? 'bg-yellow-400' : 'bg-aqi-unhealthy-sensitive';
          return (
            <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[10px] font-heading font-bold text-muted-foreground">{d.aqi}</span>
              <div
                className={`w-full rounded-t-md ${color} transition-all`}
                style={{ height: `${height}%`, minHeight: 4 }}
              />
              <span className="text-[10px] font-heading text-muted-foreground">{d.day}</span>
            </div>
          );
        })}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-lg bg-muted/50">
          <div className="flex items-center gap-1.5 mb-1">
            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-[10px] font-heading text-muted-foreground uppercase tracking-wider">
              {lang === 'vi' ? 'Giờ AQI > 100' : 'Hours AQI > 100'}
            </span>
          </div>
          <p className="text-lg font-heading font-bold text-foreground">{report.totalExposureHours}h</p>
        </div>
        <div className="p-3 rounded-lg bg-muted/50">
          <div className="flex items-center gap-1.5 mb-1">
            <Shield className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-[10px] font-heading text-muted-foreground uppercase tracking-wider">
              AQI TB
            </span>
          </div>
          <p className="text-lg font-heading font-bold text-foreground">{report.avgAqi}</p>
        </div>
        {report.worstDay && (
          <div className="p-3 rounded-lg bg-destructive/5 col-span-2">
            <div className="flex items-center gap-1.5 mb-1">
              <MapPin className="w-3.5 h-3.5 text-destructive" />
              <span className="text-[10px] font-heading text-destructive uppercase tracking-wider">
                {lang === 'vi' ? 'Thời điểm ô nhiễm nhất' : 'Worst Time'}
              </span>
            </div>
            <p className="text-sm font-heading font-semibold text-foreground">{report.worstDay}</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default WeeklyAirReport;
