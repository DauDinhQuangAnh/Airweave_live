import { useState, useEffect } from 'react';
import { MapPin, Home, Briefcase, GraduationCap, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { locationsApi } from '@/integrations/api';

interface SavedLocationWidgetsProps {
  lang: 'vi' | 'en';
}

const icons: Record<string, React.ReactNode> = {
  home: <Home className="w-4 h-4" />,
  work: <Briefcase className="w-4 h-4" />,
  school: <GraduationCap className="w-4 h-4" />,
};

const typeLabels: Record<string, Record<string, string>> = {
  vi: { home: 'Nhà', work: 'Công ty', school: 'Trường' },
  en: { home: 'Home', work: 'Work', school: 'School' },
};

const SavedLocationWidgets = ({ lang }: SavedLocationWidgetsProps) => {
  const { user } = useAuth();
  const [locations, setLocations] = useState<any[]>([]);
  const [aqiData, setAqiData] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }

    const load = async () => {
      const data = await locationsApi.list().catch(() => []);

      if (!data || data.length === 0) { setLoading(false); return; }
      setLocations(data);

      // Fetch AQI for each location
      const aqis: Record<string, number> = {};
      await Promise.all(
        data.map(async (loc) => {
          try {
            const res = await fetch(
              `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${loc.lat}&longitude=${loc.lng}&current=pm2_5`
            );
            const json = await res.json();
            const pm25 = json.current?.pm2_5 || 0;
            // Simple PM2.5 to AQI
            let aqi = 0;
            if (pm25 <= 12) aqi = Math.round((50 / 12) * pm25);
            else if (pm25 <= 35.4) aqi = Math.round(50 + ((100 - 51) / (35.4 - 12.1)) * (pm25 - 12.1));
            else if (pm25 <= 55.4) aqi = Math.round(100 + ((150 - 101) / (55.4 - 35.5)) * (pm25 - 35.5));
            else aqi = Math.round(150 + ((200 - 151) / (150.4 - 55.5)) * (pm25 - 55.5));
            aqis[loc.id] = Math.min(aqi, 500);
          } catch {
            aqis[loc.id] = 0;
          }
        })
      );
      setAqiData(aqis);
      setLoading(false);
    };

    load();
  }, [user]);

  if (!user || loading || locations.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <MapPin className="w-4 h-4 text-primary" />
        <h3 className="font-heading text-sm font-bold text-foreground uppercase tracking-wider">
          {lang === 'vi' ? 'Địa điểm của bạn' : 'Your Locations'}
        </h3>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {locations.map((loc) => {
          const aqi = aqiData[loc.id] || 0;
          const bgColor = aqi <= 50 ? 'bg-green-50' : aqi <= 100 ? 'bg-yellow-50' : aqi <= 150 ? 'bg-orange-50' : 'bg-red-50';
          return (
            <div key={loc.id} className={`p-3 rounded-xl border border-border/50 ${bgColor} text-center`}>
              <div className="flex items-center justify-center gap-1.5 text-muted-foreground mb-1">
                {icons[loc.location_type]}
                <span className="text-[10px] font-heading uppercase tracking-wider">
                  {typeLabels[lang][loc.location_type]}
                </span>
              </div>
              <span className="font-heading text-2xl font-bold text-foreground">{aqi}</span>
              <p className="text-[10px] text-muted-foreground font-body truncate mt-0.5">{loc.label}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default SavedLocationWidgets;
