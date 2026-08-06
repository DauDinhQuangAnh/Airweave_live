import { useEffect, useState } from 'react';
import { Bell, Heart, Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { preferencesApi } from '@/integrations/api';
import { useAuth } from '@/hooks/use-auth';
import { useAppLang } from '@/hooks/use-app-lang';
import { toast } from 'sonner';
import type { SensitiveGroup } from '@/hooks/use-aqi-alerts';

const GROUPS: { value: SensitiveGroup; labelVi: string; labelEn: string; emoji: string; defaultThreshold: number }[] = [
  { value: 'none', labelVi: 'Bình thường', labelEn: 'Normal', emoji: '🙂', defaultThreshold: 150 },
  { value: 'child', labelVi: 'Trẻ nhỏ', labelEn: 'Children', emoji: '👶', defaultThreshold: 75 },
  { value: 'respiratory', labelVi: 'Bệnh hô hấp', labelEn: 'Respiratory', emoji: '🫁', defaultThreshold: 75 },
  { value: 'pregnant', labelVi: 'Mang thai', labelEn: 'Pregnant', emoji: '🤰', defaultThreshold: 75 },
  { value: 'elderly', labelVi: 'Cao tuổi', labelEn: 'Elderly', emoji: '👴', defaultThreshold: 100 },
];

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => i);

export default function HealthAlertSettings() {
  const { user } = useAuth();
  const lang = useAppLang();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sensitiveGroup, setSensitiveGroup] = useState<SensitiveGroup>('none');
  const [threshold, setThreshold] = useState(100);
  const [notifyEnabled, setNotifyEnabled] = useState(true);
  const [quietStart, setQuietStart] = useState(22);
  const [quietEnd, setQuietEnd] = useState(6);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const data = await preferencesApi.get().catch(() => null);
      if (data) {
        setSensitiveGroup((data.sensitive_group as SensitiveGroup) || 'none');
        setThreshold(data.alert_threshold ?? 100);
        setNotifyEnabled(data.notify_enabled ?? true);
        setQuietStart(data.quiet_hours_start ?? 22);
        setQuietEnd(data.quiet_hours_end ?? 6);
      }
      setLoading(false);
    })();
  }, [user]);

  const handleGroupChange = (g: SensitiveGroup) => {
    setSensitiveGroup(g);
    const def = GROUPS.find((x) => x.value === g)?.defaultThreshold;
    if (def) setThreshold(def);
  };

  const save = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await preferencesApi.upsert({
        sensitive_group: sensitiveGroup,
        alert_threshold: threshold,
        notify_enabled: notifyEnabled,
        quiet_hours_start: quietStart,
        quiet_hours_end: quietEnd,
      });
      toast.success(lang === 'vi' ? 'Đã lưu cài đặt cảnh báo' : 'Alert settings saved');
    } catch (e: any) {
      toast.error((lang === 'vi' ? 'Không thể lưu: ' : 'Failed to save: ') + (e?.message ?? 'error'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="glass-card p-6 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <section className="glass-card p-5 sm:p-6 space-y-5">
      <div className="flex items-center gap-3">
        <Heart className="w-5 h-5 text-primary" />
        <h2 className="font-heading text-base font-bold">
          {lang === 'vi' ? 'Cảnh báo sức khỏe' : 'Health Alerts & Sensitivity'}
        </h2>
      </div>

      {/* Sensitive group */}
      <div className="space-y-2">
        <Label className="text-xs font-heading uppercase tracking-wider text-muted-foreground">
          {lang === 'vi' ? 'Nhóm nhạy cảm' : 'Sensitive Vulnerability Group'}
        </Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {GROUPS.map((g) => (
            <button
              key={g.value}
              type="button"
              onClick={() => handleGroupChange(g.value)}
              className={`p-2.5 rounded-lg border text-xs font-heading font-semibold transition-colors text-left ${
                sensitiveGroup === g.value
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-muted/30 text-foreground hover:border-primary/40'
              }`}
            >
              <div className="text-base mb-0.5">{g.emoji}</div>
              <div className="leading-tight">{lang === 'vi' ? g.labelVi : g.labelEn}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Threshold */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-heading uppercase tracking-wider text-muted-foreground">
            {lang === 'vi' ? 'Ngưỡng cảnh báo AQI' : 'AQI Alert Threshold'}
          </Label>
          <span className="text-sm font-heading font-bold text-primary">{threshold}</span>
        </div>
        <Slider
          value={[threshold]}
          onValueChange={(v) => setThreshold(v[0])}
          min={50}
          max={250}
          step={5}
        />
        <p className="text-[10px] text-muted-foreground font-body">
          {lang === 'vi'
            ? 'Được cảnh báo khi AQI vượt mức này. Khuyến nghị: 75 (nhạy cảm), 100 (cao tuổi), 150 (bình thường).'
            : 'Alert triggered when AQI exceeds this level. Recommended: 75 (Sensitive), 100 (Elderly), 150 (Normal).'}
        </p>
      </div>

      {/* Notify toggle */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-primary" />
          <div>
            <p className="text-sm font-heading font-semibold">
              {lang === 'vi' ? 'Thông báo đẩy' : 'Push Notifications'}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {lang === 'vi' ? 'Nhận push khi AQI vượt ngưỡng' : 'Receive push alerts when AQI exceeds threshold'}
            </p>
          </div>
        </div>
        <Switch checked={notifyEnabled} onCheckedChange={setNotifyEnabled} />
      </div>

      {/* Quiet hours */}
      <div className="space-y-2">
        <Label className="text-xs font-heading uppercase tracking-wider text-muted-foreground">
          {lang === 'vi' ? 'Giờ yên lặng (không nhận thông báo)' : 'Quiet Hours (Do Not Disturb)'}
        </Label>
        <div className="grid grid-cols-2 gap-2">
          <select
            value={quietStart}
            onChange={(e) => setQuietStart(parseInt(e.target.value))}
            className="px-3 py-2 rounded-lg border border-border bg-background text-sm font-body"
          >
            {HOUR_OPTIONS.map((h) => (
              <option key={h} value={h}>
                {lang === 'vi' ? `Từ ${h.toString().padStart(2, '0')}:00` : `From ${h.toString().padStart(2, '0')}:00`}
              </option>
            ))}
          </select>
          <select
            value={quietEnd}
            onChange={(e) => setQuietEnd(parseInt(e.target.value))}
            className="px-3 py-2 rounded-lg border border-border bg-background text-sm font-body"
          >
            {HOUR_OPTIONS.map((h) => (
              <option key={h} value={h}>
                {lang === 'vi' ? `Đến ${h.toString().padStart(2, '0')}:00` : `Until ${h.toString().padStart(2, '0')}:00`}
              </option>
            ))}
          </select>
        </div>
      </div>

      <Button onClick={save} disabled={saving} className="w-full font-heading gap-2">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {lang === 'vi' ? 'Lưu cài đặt' : 'Save Settings'}
      </Button>
    </section>
  );
}
