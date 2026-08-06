import { Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useUserPreferences } from '@/hooks/use-user-preferences';

const PRIORITY = [
  { value: 'cleanest', label: '🌿 Sạch nhất', desc: 'Ưu tiên PM2.5 thấp' },
  { value: 'balanced', label: '⚖️ Cân bằng', desc: 'Sạch + nhanh' },
  { value: 'fastest', label: '⏱️ Nhanh nhất', desc: 'Ưu tiên thời gian' },
];

const COMMUTE = [
  { value: 'walking', label: '🚶 Đi bộ' },
  { value: 'bike', label: '🚲 Xe đạp' },
  { value: 'motorbike', label: '🛵 Xe máy' },
  { value: 'car', label: '🚗 Ô tô' },
  { value: 'public', label: '🚌 Công cộng' },
];

const HOURS = [
  { value: 'morning_rush', label: 'Sáng (6-9h)' },
  { value: 'noon', label: 'Trưa (11-13h)' },
  { value: 'evening_rush', label: 'Chiều (16-19h)' },
  { value: 'night', label: 'Tối (19-22h)' },
];

const RouteTab = () => {
  const navigate = useNavigate();
  const { prefs, loading, update } = useUserPreferences();

  if (loading) {
    return <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;
  }

  const toggleArr = (key: 'commute_type' | 'active_hours', value: string) => {
    const arr = prefs[key];
    const set = new Set(arr);
    if (set.has(value)) set.delete(value); else set.add(value);
    update({ [key]: Array.from(set) } as any);
  };

  return (
    <div className="space-y-4">
      <p className="text-[11px] font-body text-muted-foreground leading-relaxed">
        Lộ trình tối ưu hóa theo phương tiện & thời điểm di chuyển của bạn.
      </p>

      {/* Priority */}
      <div>
        <h3 className="text-[10px] font-heading font-bold uppercase tracking-wider text-muted-foreground mb-2">Ưu tiên tuyến</h3>
        <div className="space-y-1.5">
          {PRIORITY.map(p => (
            <button
              key={p.value}
              onClick={() => update({ route_priority: p.value })}
              className={`w-full text-left px-3 py-2 rounded-lg border transition-all ${
                prefs.route_priority === p.value
                  ? 'bg-[#00d4aa]/15 border-[#00d4aa]/40'
                  : 'bg-muted/40 border-border hover:bg-accent/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-heading font-semibold text-foreground/80">{p.label}</span>
                {prefs.route_priority === p.value && <span className="text-[10px] text-[#00d4aa]">✓</span>}
              </div>
              <p className="text-[10px] font-body text-muted-foreground/60">{p.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Commute multi */}
      <div>
        <h3 className="text-[10px] font-heading font-bold uppercase tracking-wider text-muted-foreground mb-2">Phương tiện (chọn nhiều)</h3>
        <div className="flex flex-wrap gap-1.5">
          {COMMUTE.map(c => {
            const on = prefs.commute_type.includes(c.value);
            return (
              <button
                key={c.value}
                onClick={() => toggleArr('commute_type', c.value)}
                className={`px-2 py-1 rounded-full text-[10px] font-heading font-semibold transition-all border ${
                  on
                    ? 'bg-[#00d4aa]/15 border-[#00d4aa]/40 text-[#00d4aa]'
                    : 'bg-muted/40 border-border text-foreground/60 hover:bg-accent/50'
                }`}
              >
                {on ? '✓ ' : ''}{c.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active hours multi */}
      <div>
        <h3 className="text-[10px] font-heading font-bold uppercase tracking-wider text-muted-foreground mb-2">Thời điểm ra đường</h3>
        <div className="flex flex-wrap gap-1.5">
          {HOURS.map(h => {
            const on = prefs.active_hours.includes(h.value);
            return (
              <button
                key={h.value}
                onClick={() => toggleArr('active_hours', h.value)}
                className={`px-2 py-1 rounded-full text-[10px] font-heading font-semibold transition-all border ${
                  on
                    ? 'bg-[#00d4aa]/15 border-[#00d4aa]/40 text-[#00d4aa]'
                    : 'bg-muted/40 border-border text-foreground/60 hover:bg-accent/50'
                }`}
              >
                {on ? '✓ ' : ''}{h.label}
              </button>
            );
          })}
        </div>
      </div>

      <Button
        size="sm"
        onClick={() => navigate('/smart-route')}
        className="w-full text-xs h-8 bg-gradient-to-r from-[#00d4aa] to-[#0ea5e9] text-white border-0 hover:opacity-90 font-heading font-semibold"
      >
        Mở Smart Route →
      </Button>
    </div>
  );
};

export default RouteTab;
