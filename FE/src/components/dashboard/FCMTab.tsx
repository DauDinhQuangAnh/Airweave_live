import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUserPreferences } from '@/hooks/use-user-preferences';
import { toast } from 'sonner';

const SENSITIVE_GROUPS = [
  { value: 'none', label: '🙂 Bình thường' },
  { value: 'child', label: '👶 Trẻ nhỏ' },
  { value: 'respiratory', label: '🫁 Hô hấp' },
  { value: 'pregnant', label: '🤰 Mang thai' },
  { value: 'elderly', label: '👴 Cao tuổi' },
];

const MEDICAL = [
  { value: 'asthma', label: 'Hen suyễn' },
  { value: 'copd', label: 'COPD' },
  { value: 'heart', label: 'Tim mạch' },
  { value: 'allergy', label: 'Dị ứng' },
];

const Toggle = ({ on, onToggle }: { on: boolean; onToggle: () => void }) => (
  <button
    onClick={onToggle}
    className={`w-9 h-5 rounded-full transition-all relative shrink-0 ${on ? 'bg-[#00d4aa]' : 'bg-muted'}`}
  >
    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-background shadow transition-all ${on ? 'left-[18px]' : 'left-0.5'}`} />
  </button>
);

const FCMTab = () => {
  const { prefs, loading, update } = useUserPreferences();

  if (loading) {
    return <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;
  }

  const toggleMedical = (v: string) => {
    const set = new Set(prefs.medical_history);
    if (set.has(v)) set.delete(v); else set.add(v);
    update({ medical_history: Array.from(set) });
  };

  return (
    <div className="space-y-4">
      {/* Master push toggle */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border">
        <div className="min-w-0">
          <p className="text-xs font-heading font-semibold text-foreground/80">📱 Thông báo đẩy</p>
          <p className="text-[10px] font-body text-muted-foreground/70">FCM · Khi AQI vượt ngưỡng cá nhân</p>
        </div>
        <Toggle on={prefs.notify_enabled} onToggle={() => update({ notify_enabled: !prefs.notify_enabled })} />
      </div>

      {/* AQI threshold */}
      <div className="p-3 rounded-lg bg-muted/40 border border-border">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-heading font-semibold text-foreground/80">Ngưỡng cảnh báo AQI</p>
          <span className="text-sm font-heading font-bold text-[#00d4aa]">{prefs.alert_threshold}</span>
        </div>
        <input
          type="range"
          min={50}
          max={250}
          step={5}
          value={prefs.alert_threshold}
          onChange={(e) => update({ alert_threshold: parseInt(e.target.value) })}
          className="w-full accent-[#00d4aa]"
        />
        <p className="text-[10px] font-body text-muted-foreground/60 mt-1">
          50 = nhạy · 100 = vừa · 150+ = chỉ cảnh báo nặng
        </p>
      </div>

      {/* Sensitive group */}
      <div>
        <h3 className="text-[10px] font-heading font-bold uppercase tracking-wider text-muted-foreground mb-2">Nhóm sức khỏe</h3>
        <div className="grid grid-cols-2 gap-1.5">
          {SENSITIVE_GROUPS.map(g => (
            <button
              key={g.value}
              onClick={() => update({ sensitive_group: g.value })}
              className={`px-2 py-1.5 rounded-lg text-[11px] font-heading font-semibold transition-all border ${
                prefs.sensitive_group === g.value
                  ? 'bg-[#00d4aa]/15 border-[#00d4aa]/40 text-[#00d4aa]'
                  : 'bg-muted/40 border-border text-foreground/70 hover:bg-accent/50'
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      {/* Medical history multi-select */}
      <div>
        <h3 className="text-[10px] font-heading font-bold uppercase tracking-wider text-muted-foreground mb-2">Bệnh nền (chọn nhiều)</h3>
        <div className="flex flex-wrap gap-1.5">
          {MEDICAL.map(m => {
            const on = prefs.medical_history.includes(m.value);
            return (
              <button
                key={m.value}
                onClick={() => toggleMedical(m.value)}
                className={`px-2 py-1 rounded-full text-[10px] font-heading font-semibold transition-all border ${
                  on
                    ? 'bg-[#00d4aa]/15 border-[#00d4aa]/40 text-[#00d4aa]'
                    : 'bg-muted/40 border-border text-foreground/60 hover:bg-accent/50'
                }`}
              >
                {on ? '✓ ' : ''}{m.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Quiet hours */}
      <div className="p-3 rounded-lg bg-muted/40 border border-border space-y-2">
        <p className="text-xs font-heading font-semibold text-foreground/80">🌙 Giờ yên lặng</p>
        <div className="grid grid-cols-2 gap-2">
          <select
            value={prefs.quiet_hours_start}
            onChange={(e) => update({ quiet_hours_start: parseInt(e.target.value) })}
            className="px-2 py-1.5 rounded text-[11px] bg-background border border-border"
          >
            {Array.from({ length: 24 }, (_, i) => (
              <option key={i} value={i}>Từ {String(i).padStart(2, '0')}:00</option>
            ))}
          </select>
          <select
            value={prefs.quiet_hours_end}
            onChange={(e) => update({ quiet_hours_end: parseInt(e.target.value) })}
            className="px-2 py-1.5 rounded text-[11px] bg-background border border-border"
          >
            {Array.from({ length: 24 }, (_, i) => (
              <option key={i} value={i}>Đến {String(i).padStart(2, '0')}:00</option>
            ))}
          </select>
        </div>
      </div>

      <Button
        size="sm"
        onClick={() => toast.success('Đã gửi thông báo test')}
        className="w-full text-[11px] h-8 bg-gradient-to-r from-[#00d4aa] to-[#0ea5e9] text-white border-0 hover:opacity-90"
      >
        ▶ Gửi thông báo test
      </Button>
    </div>
  );
};

export default FCMTab;
