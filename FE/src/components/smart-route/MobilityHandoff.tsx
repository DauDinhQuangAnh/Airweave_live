import { useState } from 'react';
import { Bike, Car, Bus, ExternalLink, Copy, MapPin, ShieldCheck, PersonStanding, Plug } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { INLINE_NOTICES } from '@/lib/app-mode';

interface Props {
  lang: 'vi' | 'en';
  origin?: { lat: number; lng: number; label?: string };
  destination?: { lat: number; lng: number; label?: string };
}

type IconKey = 'bike' | 'car' | 'pin' | 'walk' | 'bus' | 'motorbike';

interface Option {
  key: string;
  name: string;
  icon: IconKey;
  group: 'self' | 'book' | 'map';
  build: (o: NonNullable<Props['origin']>, d: NonNullable<Props['destination']>) => string | null;
  /** True if this is an official deep link we have verified. */
  verified: boolean;
}

const gmaps = (o: any, d: any, mode: string) =>
  `https://www.google.com/maps/dir/?api=1&origin=${o.lat},${o.lng}&destination=${d.lat},${d.lng}&travelmode=${mode}`;

const OPTIONS: Option[] = [
  // Self-driven
  { key: 'my_motorbike', name: 'My motorbike', icon: 'motorbike', group: 'self', verified: true,
    build: (o, d) => gmaps(o, d, 'driving') },
  { key: 'walk', name: 'Walk', icon: 'walk', group: 'self', verified: true,
    build: (o, d) => gmaps(o, d, 'walking') },
  { key: 'bicycle', name: 'Bicycle', icon: 'bike', group: 'self', verified: true,
    build: (o, d) => gmaps(o, d, 'bicycling') },
  { key: 'car_bus', name: 'Car / Bus', icon: 'bus', group: 'self', verified: true,
    build: (o, d) => gmaps(o, d, 'transit') },

  // Book a ride (no official partnership — copy fallback)
  { key: 'grab', name: 'Grab', icon: 'car', group: 'book', verified: false, build: () => null },
  { key: 'be', name: 'Be', icon: 'car', group: 'book', verified: false, build: () => null },
  { key: 'xanh_sm', name: 'Xanh SM', icon: 'car', group: 'book', verified: false, build: () => null },
  { key: 'tada', name: 'Tada', icon: 'car', group: 'book', verified: false, build: () => null },

  // External maps
  { key: 'google_maps', name: 'Google Maps', icon: 'pin', group: 'map', verified: true,
    build: (o, d) => `https://www.google.com/maps/dir/?api=1&origin=${o.lat},${o.lng}&destination=${d.lat},${d.lng}` },
  { key: 'apple_maps', name: 'Apple Maps', icon: 'pin', group: 'map', verified: true,
    build: (o, d) => `https://maps.apple.com/?saddr=${o.lat},${o.lng}&daddr=${d.lat},${d.lng}` },
];

const IconEl = ({ name }: { name: IconKey }) => {
  if (name === 'bike') return <Bike className="w-4 h-4" />;
  if (name === 'car') return <Car className="w-4 h-4" />;
  if (name === 'bus') return <Bus className="w-4 h-4" />;
  if (name === 'walk') return <PersonStanding className="w-4 h-4" />;
  if (name === 'motorbike') return <span className="text-base leading-none">🏍️</span>;
  return <MapPin className="w-4 h-4" />;
};

const ACK_KEY = 'airweave.mobility.handoff.ack.v1';

const GROUP_LABEL: Record<Option['group'], { vi: string; en: string }> = {
  self: { vi: 'Tự di chuyển', en: 'Self-drive' },
  book: { vi: 'Đặt xe', en: 'Book a ride' },
  map: { vi: 'Mở bản đồ', en: 'Open in map' },
};

const MobilityHandoff = ({ lang, origin, destination }: Props) => {
  const [pending, setPending] = useState<Option | null>(null);

  if (!origin || !destination) return null;

  const runHandoff = (opt: Option) => {
    const url = opt.build(origin, destination);
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      const text = `${origin.label ?? `${origin.lat},${origin.lng}`} → ${destination.label ?? `${destination.lat},${destination.lng}`}`;
      navigator.clipboard?.writeText(text);
      toast.info(
        lang === 'vi'
          ? `Đã sao chép điểm đi/đến. Dán vào ${opt.name}.`
          : `Origin/destination copied. Paste into ${opt.name}.`
      );
    }
  };

  const handle = (opt: Option) => {
    let ack = false;
    try { ack = sessionStorage.getItem(ACK_KEY) === '1'; } catch { /* ignore */ }
    if (ack) { runHandoff(opt); return; }
    setPending(opt);
  };

  const confirmPending = () => {
    try { sessionStorage.setItem(ACK_KEY, '1'); } catch { /* ignore */ }
    if (pending) runHandoff(pending);
    setPending(null);
  };

  const groups: Option['group'][] = ['self', 'book', 'map'];

  return (
    <div className="rounded-2xl border border-sky-500/25 bg-gradient-to-br from-[#0B1628]/95 via-[#0F2138]/90 to-[#07111F]/95 dark:from-[#0B1628]/95 dark:via-[#0F2138]/90 dark:to-[#07111F]/95 p-4 shadow-lg shadow-sky-500/5 backdrop-blur-sm">
      <div className="flex items-start gap-3 mb-3 pb-3 border-b border-sky-500/15">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500/30 to-cyan-500/20 border border-sky-500/30 flex items-center justify-center shrink-0">
          <Car className="w-4 h-4 text-sky-300" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[9px] font-heading font-bold uppercase tracking-[0.18em] text-sky-300/80">
            {lang === 'vi' ? 'Tích hợp · Chuyển ứng dụng' : 'Integration · App Handoff'}
          </div>
          <h3 className="text-sm font-heading font-bold text-slate-50 leading-snug">
            {lang === 'vi' ? 'Bạn muốn tiếp tục di chuyển bằng cách nào?' : 'How do you want to continue?'}
          </h3>
          <p className="text-[10px] text-slate-400 font-body mt-0.5">
            {lang === 'vi'
              ? 'AirWeave chỉ chuyển điểm đi/đến. Không chia sẻ Health Profile hay Medical ID.'
              : 'AirWeave only passes origin/destination. Health Profile and Medical ID are never shared.'}
          </p>
        </div>
        <span className="text-[9px] px-1.5 py-0.5 rounded-full border border-sky-500/30 text-sky-300 font-heading font-bold uppercase shrink-0">
          {lang === 'vi' ? 'Mở ngoài' : 'External'}
        </span>
      </div>

      {pending && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 mb-2 space-y-2">
          <div className="flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <p className="text-[11px] font-body text-foreground leading-relaxed">
              {INLINE_NOTICES.mobility[lang]}
            </p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={confirmPending} className="flex-1 h-8 text-xs font-heading">
              {lang === 'vi' ? `Tiếp tục với ${pending.name}` : `Continue with ${pending.name}`}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPending(null)}
              className="flex-1 h-8 text-xs font-heading"
            >
              {lang === 'vi' ? 'Huỷ' : 'Cancel'}
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {groups.map((g) => {
          const items = OPTIONS.filter((o) => o.group === g);
          return (
            <div key={g}>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-heading font-bold mb-1.5">
                {GROUP_LABEL[g][lang]}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {items.map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => handle(opt)}
                    className="flex items-center gap-2 px-2 py-2 rounded-lg border border-border bg-background/60 hover:border-primary/40 transition-colors text-left"
                  >
                    <IconEl name={opt.icon} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-heading font-semibold text-foreground truncate">{opt.name}</div>
                      <div className="text-[9px] text-muted-foreground font-body truncate flex items-center gap-1">
                        {opt.verified ? (
                          <><ExternalLink className="w-2.5 h-2.5" />deep link</>
                        ) : (
                          <><Copy className="w-2.5 h-2.5" />copy · {lang === 'vi' ? 'chưa kết nối API' : 'no official API'}</>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          );
        })}

        {/* Future Partner API placeholder */}
        <div className="rounded-lg border border-dashed border-border bg-muted/30 p-2 flex items-start gap-2">
          <Plug className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-[11px] font-heading font-semibold text-foreground">
              {lang === 'vi' ? 'Partner Clean-Route API (sắp ra mắt)' : 'Partner Clean-Route API (coming soon)'}
              <span className="ml-2 inline-block px-1.5 py-[1px] rounded bg-muted text-[9px] uppercase text-muted-foreground">
                Placeholder
              </span>
            </p>
            <p className="text-[10px] text-muted-foreground font-body leading-relaxed">
              {lang === 'vi'
                ? 'Cấu trúc sẵn sàng để Grab/Be/Xanh SM/Tada nhận waypoint sạch khi có thoả thuận chính thức. Hiện chưa có tích hợp trực tiếp.'
                : 'Schema is ready for Grab/Be/Xanh SM/Tada to receive clean waypoints once an official agreement exists. No live integration yet.'}
            </p>
          </div>
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground font-body mt-2 leading-relaxed">
        {lang === 'vi'
          ? 'AirWeave chỉ chuyển điểm đi/đến hoặc waypoint. Hồ sơ sức khoẻ và Medical ID không bao giờ được chia sẻ. Nếu deep link không khả dụng, điểm đi/đến sẽ được sao chép để bạn dán vào ứng dụng.'
          : 'AirWeave only passes origin/destination or waypoints. Health profile and Medical ID are never shared. If a deep link is unavailable, origin/destination is copied so you can paste into the app.'}
      </p>
    </div>
  );
};

export default MobilityHandoff;
