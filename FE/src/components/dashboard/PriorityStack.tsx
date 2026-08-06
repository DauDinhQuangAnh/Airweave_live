import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, ArrowUp, ArrowDown } from 'lucide-react';
import AlertsTab from './AlertsTab';
import FCMTab from './FCMTab';
import RouteTab from './RouteTab';

type CardKey = 'alerts' | 'route' | 'fcm';

const META: Record<CardKey, { icon: string; title: string }> = {
  alerts: { icon: '🚨', title: 'Cảnh báo' },
  route: { icon: '🛣️', title: 'Lộ trình' },
  fcm: { icon: '🔔', title: 'Thông báo (FCM)' },
};

const STORAGE_KEY = 'dashboard_card_priority_v1';
const DEFAULT_ORDER: CardKey[] = ['alerts', 'route', 'fcm'];

function loadOrder(): CardKey[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_ORDER;
    const arr = JSON.parse(raw) as CardKey[];
    const valid = arr.filter(k => DEFAULT_ORDER.includes(k));
    DEFAULT_ORDER.forEach(k => { if (!valid.includes(k)) valid.push(k); });
    return valid;
  } catch { return DEFAULT_ORDER; }
}

const PriorityStack = () => {
  const [order, setOrder] = useState<CardKey[]>(DEFAULT_ORDER);
  const [openMap, setOpenMap] = useState<Record<CardKey, boolean>>({ alerts: true, route: false, fcm: false });

  useEffect(() => { setOrder(loadOrder()); }, []);

  const persist = (next: CardKey[]) => {
    setOrder(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* noop */ }
  };

  const move = (key: CardKey, dir: -1 | 1) => {
    const idx = order.indexOf(key);
    const target = idx + dir;
    if (idx < 0 || target < 0 || target >= order.length) return;
    const next = [...order];
    [next[idx], next[target]] = [next[target], next[idx]];
    persist(next);
  };

  const toggle = (key: CardKey) => setOpenMap(m => ({ ...m, [key]: !m[key] }));

  return (
    <div className="space-y-3">
      {order.map((key, idx) => {
        const isOpen = openMap[key];
        const meta = META[key];
        return (
          <div key={key} className="rounded-2xl bg-card/90 border border-border overflow-hidden">
            <div className="flex items-center gap-1 px-3 py-2.5 bg-muted/20">
              <span className="text-[10px] font-heading font-bold text-muted-foreground/60 w-5 text-center">
                #{idx + 1}
              </span>
              <button onClick={() => toggle(key)} className="flex-1 flex items-center gap-2 text-left">
                <span className="text-base">{meta.icon}</span>
                <span className="text-sm font-heading font-bold text-foreground/80 flex-1">{meta.title}</span>
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? '' : '-rotate-90'}`} />
              </button>
              <div className="flex flex-col gap-0.5 ml-1">
                <button
                  onClick={() => move(key, -1)}
                  disabled={idx === 0}
                  className="w-5 h-3.5 flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-20 disabled:hover:text-muted-foreground"
                  aria-label="Di chuyển lên"
                >
                  <ArrowUp className="w-3 h-3" />
                </button>
                <button
                  onClick={() => move(key, 1)}
                  disabled={idx === order.length - 1}
                  className="w-5 h-3.5 flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-20 disabled:hover:text-muted-foreground"
                  aria-label="Di chuyển xuống"
                >
                  <ArrowDown className="w-3 h-3" />
                </button>
              </div>
            </div>
            {isOpen && (
              <div className="border-t border-border p-3">
                {key === 'alerts' && <AlertsTab />}
                {key === 'route' && <RouteTab />}
                {key === 'fcm' && <FCMTab />}
              </div>
            )}
          </div>
        );
      })}
      <p className="text-[10px] text-muted-foreground/60 font-body px-1">
        💡 Dùng nút ↑↓ để sắp xếp thẻ theo thứ tự ưu tiên của bạn.
      </p>
    </div>
  );
};

export default PriorityStack;
