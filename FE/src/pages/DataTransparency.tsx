import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Download, ArrowLeft, Database, Wind, MapPin, Users, RefreshCw } from 'lucide-react';
import { useLiveAirContext } from '@/contexts/live-air-context';
import { useWaqiStations } from '@/hooks/use-waqi-stations';
import { communityApi } from '@/integrations/api';
import { Button } from '@/components/ui/button';

/**
 * ESG-ready Environmental Data Transparency Dashboard (B2B/B2G demo).
 * - Shows real AQI/PM2.5/PM10 sourced from the live context (WAQI / Open-Meteo).
 * - Clearly labels Live / Stale / Estimated / Unavailable.
 * - Exports an anonymized JSON snapshot — labeled DEMO.
 *
 * Does NOT claim verified ESG numbers. Does NOT mark community reports as verified.
 */
export default function DataTransparency() {
  const { weather, location, refreshData } = useLiveAirContext();
  const { stations, refresh: refreshStations } = useWaqiStations();
  const [reportsCount, setReportsCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const reports = await communityApi.listActive(undefined, 500).catch(() => []);
      if (!cancelled) setReportsCount(reports.length);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const updatedAtMs = weather.updatedAt ? Date.parse(weather.updatedAt) : 0;
  const ageMin = updatedAtMs ? Math.round((Date.now() - updatedAtMs) / 60000) : null;
  const status =
    weather.loading
      ? { label: 'Loading', tone: 'bg-muted text-muted-foreground' }
      : weather.error
      ? { label: 'Unavailable', tone: 'bg-red-500/15 text-red-600 dark:text-red-300' }
      : !weather.aqi || weather.aqi <= 0
      ? { label: 'Unavailable', tone: 'bg-muted text-muted-foreground' }
      : ageMin === null
      ? { label: 'Estimated', tone: 'bg-amber-500/15 text-amber-600 dark:text-amber-300' }
      : ageMin <= 60
      ? { label: 'Live', tone: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300' }
      : { label: 'Stale', tone: 'bg-amber-500/15 text-amber-600 dark:text-amber-300' };

  const nearestStation = stations[0]?.name ?? weather.station ?? null;
  const sourceLabel =
    weather.source === 'waqi' ? 'WAQI · World Air Quality Index' : weather.source === 'open-meteo' ? 'Open-Meteo (estimated)' : weather.source || '—';

  const handleExport = () => {
    const payload = {
      schema: 'airweave.environmental.demo.v1',
      generated_at: new Date().toISOString(),
      note: 'DEMO ONLY — not a verified ESG dataset. Verify with primary providers before publication.',
      location: {
        label: location.label,
        lat: location.lat,
        lng: location.lng,
        accuracy_m: location.accuracy,
        permission_state: location.permissionState,
      },
      air_quality: {
        aqi: weather.aqi || null,
        pm25: weather.pm25 || null,
        pm10: weather.pm10 || null,
        temperature_c: weather.temperature || null,
        humidity_pct: weather.humidity || null,
        wind_speed: weather.windSpeed || null,
        wind_direction: weather.windDirection || null,
        source: weather.source,
        nearest_station: nearestStation,
        snapshot_updated_at: weather.updatedAt || null,
        status: status.label,
      },
      community_reports: {
        active_count: reportsCount,
        verification: 'unverified',
      },
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `airweave-environmental-demo-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-5">
        <div className="flex items-center justify-between gap-3">
          <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-xs font-heading font-semibold text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
          </Link>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-300 font-heading font-bold">
            DEMO
          </span>
        </div>

        <header className="space-y-1">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-cyan-500" />
            <h1 className="text-xl md:text-2xl font-heading font-black">AirWeave Data Transparency Dashboard</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            ESG-ready environmental data preview · source, freshness, station, and verification status are always visible.
          </p>
        </header>

        <section className="rounded-2xl border border-border bg-card p-4 md:p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-heading font-bold">Selected location</p>
              <p className="text-base font-heading font-bold">{location.label || '—'}</p>
              <p className="text-[11px] text-muted-foreground">
                {location.lat?.toFixed(4)}, {location.lng?.toFixed(4)} · accuracy {location.accuracy ?? '—'}m
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-heading font-bold ${status.tone}`}>{status.label}</span>
              <Button size="sm" variant="outline" onClick={() => { refreshData(); refreshStations(); }}>
                <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Metric icon={<Wind className="w-4 h-4" />} label="AQI (US)" value={weather.aqi || '—'} />
            <Metric label="PM2.5 µg/m³" value={weather.pm25 ? Math.round(weather.pm25) : '—'} />
            <Metric label="PM10 µg/m³" value={weather.pm10 ? Math.round(weather.pm10) : '—'} />
            <Metric icon={<MapPin className="w-4 h-4" />} label="Nearest station" value={nearestStation ?? '—'} />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[11px] text-muted-foreground">
            <div><span className="block uppercase tracking-wider font-heading font-bold text-[10px]">Source</span>{sourceLabel}</div>
            <div><span className="block uppercase tracking-wider font-heading font-bold text-[10px]">Updated</span>{ageMin === null ? '—' : ageMin < 1 ? '<1 min ago' : `${ageMin} min ago`}</div>
            <div><span className="block uppercase tracking-wider font-heading font-bold text-[10px]">Verification</span>Provider feed (not independently audited)</div>
            <div className="flex items-center gap-1"><Users className="w-3 h-3" /> <span><span className="block uppercase tracking-wider font-heading font-bold text-[10px]">Community reports</span>{reportsCount ?? '—'} active (unverified)</span></div>
          </div>

          <Button onClick={handleExport} className="w-full md:w-auto">
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Export demo JSON snapshot
          </Button>
        </section>

        <p className="text-[10px] text-muted-foreground/70 leading-snug">
          AirWeave does not claim verified ESG metrics. AQI/PM values come from third-party providers (WAQI, Open-Meteo) and are shown with their freshness state.
          Community reports are user-submitted and labeled unverified until an audit pipeline exists.
        </p>
      </div>
    </div>
  );
}

function Metric({ icon, label, value }: { icon?: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border/60 bg-background/40 px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-heading font-bold">
        {icon}
        {label}
      </div>
      <div className="text-base font-heading font-black mt-0.5 truncate">{value}</div>
    </div>
  );
}
