import { useMemo, useState } from 'react';
import { ChevronDown, ArrowUp, ArrowDown, ArrowRight, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PAMStation, getAQIColorNew } from '@/lib/pam-stations';

interface Props {
  stations: PAMStation[];
  activeId: string | null;
  onSelect: (s: PAMStation) => void;
  onRefresh?: () => void;
  loading?: boolean;
}

const PAMStationsTable = ({ stations, activeId, onSelect, onRefresh, loading }: Props) => {
  const [open, setOpen] = useState(false);

  const groups = useMemo(() => {
    const map = new Map<string, PAMStation[]>();
    stations.forEach(s => {
      const arr = map.get(s.city) ?? [];
      arr.push(s);
      map.set(s.city, arr);
    });
    return Array.from(map.entries()).map(([city, items]) => ({
      city,
      items: items.sort((a, b) => b.aqi - a.aqi),
      avg: Math.round(items.reduce((sum, s) => sum + s.aqi, 0) / items.length),
    }));
  }, [stations]);

  return (
    <div className="rounded-2xl bg-card/90 border border-border overflow-hidden">
      <div className="w-full flex items-center gap-2 px-4 py-3 hover:bg-accent/40 transition-colors">
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? '' : '-rotate-90'}`} />
          <span className="text-xs font-heading font-bold text-foreground/80 flex-1 text-left">
            Chi tiết các trạm WAQI
          </span>
        </button>
        {loading && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
        <span className="text-[10px] font-body text-muted-foreground/70 shrink-0">{stations.length} trạm</span>
        {onRefresh && open && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onRefresh}
            className="w-6 h-6 shrink-0 text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className="w-3 h-3" />
          </Button>
        )}
      </div>

      {open && (
        <div className="border-t border-border max-h-[280px] overflow-y-auto">
          {groups.map(g => {
            const cityColor = getAQIColorNew(g.avg);
            return (
              <div key={g.city}>
                <div className="flex items-center gap-2 px-4 py-1.5 bg-muted/30 sticky top-0">
                  <span className="text-[10px] font-heading font-bold text-foreground/70 flex-1">{g.city}</span>
                  <span className="text-[10px] font-body text-muted-foreground/60">TB ~</span>
                  <span className="text-[11px] font-heading font-bold" style={{ color: cityColor }}>{g.avg}</span>
                </div>
                {g.items.map(s => {
                  const color = getAQIColorNew(s.aqi);
                  const isActive = s.id === activeId;
                  return (
                    <button
                      key={s.id}
                      onClick={() => onSelect(s)}
                      className={`w-full flex items-center gap-2 px-4 py-2 text-left transition-all hover:bg-accent/50 ${isActive ? 'bg-accent border-l-2' : 'border-l-2 border-transparent'}`}
                      style={isActive ? { borderLeftColor: '#00d4aa' } : {}}
                    >
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}60` }} />
                      <span className="flex-1 text-xs font-body text-foreground/70 truncate">{s.district}</span>
                      <span className="text-[10px] text-muted-foreground/50 hidden sm:inline">{s.pm25 != null ? `PM2.5 ${s.pm25}` : ''}</span>
                      <span className="text-xs font-heading font-bold" style={{ color }}>{s.aqi}</span>
                      {s.trend === 'up' && <ArrowUp className="w-3 h-3 text-red-400" />}
                      {s.trend === 'down' && <ArrowDown className="w-3 h-3 text-green-400" />}
                      {s.trend === 'stable' && <ArrowRight className="w-3 h-3 text-muted-foreground/40" />}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PAMStationsTable;
