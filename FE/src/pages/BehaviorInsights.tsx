import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Download, BarChart3, ShieldOff, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useConsent } from '@/hooks/use-consent';
import {
  BEHAVIOR_LABELS,
  BehaviorEvent,
  buildAnonymizedExport,
  getBehaviorSummary,
  subscribeBehavior,
  clearBehavior,
} from '@/lib/behavior-analytics';

/**
 * Insurance-ready Health Behavior Insights — DEMO.
 * - Only counts events the user opted in to.
 * - No raw GPS, no health data, no identifiers.
 * - Export produces an anonymized JSON aggregate.
 *
 * Does NOT claim insurance partnerships. Output is clearly labeled DEMO.
 */
export default function BehaviorInsights() {
  const tracking = useConsent('behavior_tracking');
  const [summary, setSummary] = useState(() => getBehaviorSummary());

  useEffect(() => {
    const unsub = subscribeBehavior(() => setSummary(getBehaviorSummary()));
    return () => { unsub(); };
  }, []);

  const events: BehaviorEvent[] = [
    'health_profile_completed',
    'aqi_checked_near_me',
    'clean_route_requested',
    'sensitive_alert_viewed',
    'sos_opened',
    'medical_id_opened',
    'community_report_submitted',
    'weekly_air_report_viewed',
  ];

  const total = events.reduce((s, e) => s + (summary.events[e]?.count ?? 0), 0);

  const handleExport = () => {
    const payload = buildAnonymizedExport();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `airweave-behavior-demo-${Date.now()}.json`;
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
            <BarChart3 className="w-5 h-5 text-cyan-500" />
            <h1 className="text-xl md:text-2xl font-heading font-black">Health Behavior Insights · Demo</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Aggregated, on-device behavior signals. No real insurance partnership, no raw GPS, no personal health data leaves your device.
          </p>
        </header>

        <section className="rounded-2xl border border-border bg-card p-4 md:p-5 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {tracking.granted ? (
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
              ) : (
                <ShieldOff className="w-4 h-4 text-amber-500" />
              )}
              <p className="text-sm font-heading font-semibold">
                Consent: {tracking.granted ? 'Granted' : tracking.denied ? 'Denied' : 'Pending'}
              </p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant={tracking.granted ? 'default' : 'outline'} onClick={tracking.grant}>Grant</Button>
              <Button size="sm" variant="outline" onClick={tracking.deny}>Opt out</Button>
            </div>
          </div>

          {!tracking.granted && (
            <p className="text-[11px] text-muted-foreground">
              Tracking is currently off. Grant consent to populate this dashboard. No data is collected while consent is off.
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-card p-4 md:p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-heading font-bold text-sm">Event counts (this device)</h2>
            <span className="text-[11px] text-muted-foreground">Total: {total}</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {events.map((e) => {
              const rec = summary.events[e];
              return (
                <div key={e} className="rounded-xl border border-border/60 bg-background/40 px-3 py-2.5">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-heading font-bold leading-tight">
                    {BEHAVIOR_LABELS[e].vi}
                  </p>
                  <p className="text-lg font-heading font-black mt-1">{rec?.count ?? 0}</p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {rec?.last_at ? new Date(rec.last_at).toLocaleString() : '—'}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        <div className="flex flex-wrap gap-2">
          <Button onClick={handleExport}>
            <Download className="w-3.5 h-3.5 mr-1.5" /> Export anonymized demo JSON
          </Button>
          <Button variant="outline" onClick={() => { clearBehavior(); }}>
            Clear on-device history
          </Button>
        </div>

        <p className="text-[10px] text-muted-foreground/70 leading-snug">
          AirWeave has no real insurance partnership. This dashboard exists to demonstrate what privacy-safe, aggregated behavior signals could look like for future partners — under explicit opt-in only.
        </p>
      </div>
    </div>
  );
}
