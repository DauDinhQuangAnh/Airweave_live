import { useEffect, useState } from 'react';
import { communityApi } from '@/integrations/api';
import { useCommunityRealtime } from '@/hooks/use-community-realtime';
import { useLiveAirContext } from '@/contexts/live-air-context';
import { useUserPreferences } from '@/hooks/use-user-preferences';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { getAQIColorNew, getAQIStatusVi } from '@/lib/pam-stations';

interface CommunityReport {
  id: string;
  kind: string;
  text: string | null;
  created_at: string;
  lat: number;
  lng: number;
}

const KIND: Record<string, { icon: string; vi: string }> = {
  smoke: { icon: '🔥', vi: 'Đốt rác / khói đốt' },
  construction: { icon: '🏗️', vi: 'Khói bụi công trình' },
  traffic: { icon: '🚗', vi: 'Kẹt xe / khí thải' },
  chemical: { icon: '🧪', vi: 'Mùi hóa chất / mùi lạ' },
  dust: { icon: '🌫️', vi: 'Bụi đường bất thường' },
  smell: { icon: '👃', vi: 'Mùi bất thường' },
  other: { icon: '📢', vi: 'Khác' },
};

function timeAgo(iso: string) {
  const m = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (m < 1) return 'vừa xong';
  if (m < 60) return `${m}p`;
  return `${Math.floor(m / 60)}h`;
}

const AlertsTab = () => {
  const { weather } = useLiveAirContext();
  const { prefs, loading } = useUserPreferences();
  const navigate = useNavigate();
  const [reports, setReports] = useState<CommunityReport[]>([]);

  useEffect(() => {
    let active = true;
    (async () => {
      const data = await communityApi.listActive(undefined, 8).catch(() => []);
      if (active) setReports(data as CommunityReport[]);
    })();
    return () => { active = false; };
  }, []);

  useCommunityRealtime({
    onNew: (report) =>
      setReports((prev) => [report, ...prev.filter((r) => r.id !== report.id)].slice(0, 8)),
    onDeleted: (id) => setReports((prev) => prev.filter((r) => r.id !== id)),
  });

  if (loading) {
    return <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;
  }

  const aqi = weather?.aqi ?? 0;
  const overThreshold = aqi >= prefs.alert_threshold;
  const color = getAQIColorNew(aqi);

  return (
    <div className="space-y-3">
      {/* Personal alert summary */}
      <div
        className="rounded-xl p-3 border"
        style={{
          borderColor: overThreshold ? `${color}60` : 'hsl(var(--border))',
          background: overThreshold ? `${color}12` : 'hsl(var(--muted) / 0.4)',
        }}
      >
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-heading font-bold uppercase tracking-wider text-muted-foreground">
            Ngưỡng của bạn · {prefs.alert_threshold}
          </span>
          <span className="text-[10px] text-muted-foreground/70">
            {prefs.sensitive_group !== 'none' ? `Nhóm: ${prefs.sensitive_group}` : 'Bình thường'}
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-heading font-extrabold" style={{ color }}>{aqi || '--'}</span>
          <span className="text-xs font-body" style={{ color }}>{aqi ? getAQIStatusVi(aqi) : 'Đang tải...'}</span>
        </div>
        <p className="text-[11px] font-body text-muted-foreground/80 mt-1">
          {overThreshold
            ? '⚠️ AQI vượt ngưỡng cá nhân hóa của bạn — cân nhắc giảm hoạt động ngoài trời.'
            : '✅ AQI dưới ngưỡng — hoạt động bình thường.'}
        </p>
        {overThreshold && (
          <Button
            size="sm"
            onClick={() => navigate('/smart-route?alert=1')}
            className="w-full text-[11px] h-7 mt-2 bg-gradient-to-r from-[#00d4aa] to-[#0ea5e9] text-white border-0 hover:opacity-90"
          >
            Tìm lộ trình sạch →
          </Button>
        )}
      </div>

      {/* Live community reports */}
      <div>
        <h3 className="text-[10px] font-heading font-bold uppercase tracking-wider text-muted-foreground mb-2">
          Cộng đồng báo · Trực tiếp
        </h3>
        {reports.length === 0 ? (
          <p className="text-[11px] font-body text-muted-foreground/60 px-1">Chưa có báo cáo gần đây.</p>
        ) : (
          <div className="space-y-1.5">
            {reports.map(r => {
              const meta = KIND[r.kind] ?? KIND.other;
              return (
                <div key={r.id} className="flex items-start gap-2 p-2 rounded-lg bg-muted/40 border border-border/50">
                  <span className="text-sm leading-none mt-0.5">{meta.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-heading font-semibold text-foreground/80 truncate">
                      {r.text ?? meta.vi}
                    </p>
                    <p className="text-[10px] font-body text-muted-foreground/60">{meta.vi}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground/50 shrink-0">{timeAgo(r.created_at)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AlertsTab;
