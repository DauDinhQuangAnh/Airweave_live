import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Loader2, MapPin, Navigation, Phone, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLiveAirContext } from '@/contexts/live-air-context';
import { useNavigate } from 'react-router-dom';
import HospitalsMap from './HospitalsMap';
import GPSStatusBanner from './GPSStatusBanner';
import ShareLocationButton from './ShareLocationButton';
import { useAppLang } from '@/hooks/use-app-lang';

interface Hospital {
  id: number;
  name: string;
  lat: number;
  lng: number;
  phone?: string;
  address?: string;
  website?: string;
  openingHours?: string;
  distanceKm: number;
  tags: string[];
}

type ProviderStatus = 'idle' | 'loading' | 'live' | 'empty' | 'unavailable' | 'error';

function haversine(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function deriveTags(name: string, tags: any, lang: 'vi' | 'en'): string[] {
  const out: string[] = [];
  const n = (name + ' ' + (tags?.['healthcare:speciality'] ?? '') + ' ' + (tags?.description ?? '')).toLowerCase();
  if (/(hô hấp|phổi|lao|respiratory|pulmonary|lung)/.test(n)) out.push(lang === 'vi' ? '🫁 Hô hấp' : '🫁 Respiratory');
  if (/(tim|cardiology|tim mạch|cardiac)/.test(n)) out.push(lang === 'vi' ? '❤️ Tim mạch' : '❤️ Cardiology');
  if (/(nhi|trẻ em|paediat|pediat|children)/.test(n)) out.push(lang === 'vi' ? '🧒 Nhi' : '🧒 Pediatrics');
  if (/(cấp cứu|emergency|115)/.test(n) || tags?.emergency === 'yes') out.push(lang === 'vi' ? '🚑 Cấp cứu 24/7' : '🚑 Emergency 24/7');
  if (/(bạch mai|chợ rẫy|việt đức|108|trung ương|đa khoa|general)/.test(n)) out.push(lang === 'vi' ? '🏥 BV lớn' : '🏥 Major Hospital');
  return out;
}

function isHospital(name: string, tags: any): boolean {
  const n = name.toLowerCase();
  if (/(nha khoa|dental|pharmacy|nhà thuốc)/.test(n)) return false;
  return (
    tags?.amenity === 'hospital' ||
    tags?.amenity === 'clinic' ||
    tags?.healthcare === 'hospital' ||
    tags?.healthcare === 'clinic' ||
    /(bệnh viện|hospital|phòng khám|clinic|trung tâm y tế)/.test(n)
  );
}

function buildAddress(tags: any): string | undefined {
  if (!tags) return undefined;
  const parts = [
    tags['addr:housenumber'],
    tags['addr:street'],
    tags['addr:suburb'] || tags['addr:district'],
    tags['addr:city'],
  ].filter(Boolean);
  return parts.length ? parts.join(', ') : undefined;
}

function scoreHospital(h: { distanceKm: number; tags: string[] }): number {
  let score = h.distanceKm;
  if (h.tags.some((t) => t.includes('Hô hấp') || t.includes('Respiratory'))) score -= 5;
  if (h.tags.some((t) => t.includes('Cấp cứu') || t.includes('Emergency'))) score -= 2;
  if (h.tags.some((t) => t.includes('BV lớn') || t.includes('Major Hospital'))) score -= 3;
  return score;
}

const RADIUS_OPTIONS = [5000, 10000, 15000, 25000];

export default function HospitalsTab({ lang: propLang }: { lang?: 'vi' | 'en' }) {
  const contextLang = useAppLang();
  const lang = propLang || contextLang;

  const { location } = useLiveAirContext();
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [status, setStatus] = useState<ProviderStatus>('idle');
  const [radius, setRadius] = useState<number>(5000);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const navigate = useNavigate();

  const load = useCallback(
    async (lat: number, lng: number, r: number) => {
      setStatus('loading');
      setErrorMsg(null);

      const query = `[out:json][timeout:25];(node["amenity"~"^(hospital|clinic)$"](around:${r},${lat},${lng});way["amenity"~"^(hospital|clinic)$"](around:${r},${lat},${lng});node["healthcare"~"^(hospital|clinic)$"](around:${r},${lat},${lng});way["healthcare"~"^(hospital|clinic)$"](around:${r},${lat},${lng}););out center 40;`;

      const endpoints = [
        'https://overpass-api.de/api/interpreter',
        'https://overpass.kumi.systems/api/interpreter',
        'https://overpass.private.coffee/api/interpreter',
      ];

      let data: any = null;
      let lastErr: any = null;
      for (const url of endpoints) {
        try {
          const ctrl = new AbortController();
          const to = window.setTimeout(() => ctrl.abort(), 12000);
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
            body: query,
            signal: ctrl.signal,
          });
          window.clearTimeout(to);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          data = await res.json();
          break;
        } catch (e) {
          lastErr = e;
        }
      }

      if (!data) {
        console.warn('Overpass unavailable:', lastErr);
        setHospitals([]);
        setStatus('unavailable');
        setErrorMsg(lastErr?.message ?? null);
        return;
      }

      const items: Hospital[] = (data.elements ?? [])
        .map((el: any) => {
          const elLat = el.lat ?? el.center?.lat;
          const elLng = el.lon ?? el.center?.lon;
          if (!elLat || !elLng) return null;
          const name = el.tags?.name ?? el.tags?.['name:vi'] ?? null;
          if (!name) return null;
          if (!isHospital(name, el.tags)) return null;
          return {
            id: el.id,
            name,
            lat: elLat,
            lng: elLng,
            phone: el.tags?.phone || el.tags?.['contact:phone'],
            address: buildAddress(el.tags),
            website: el.tags?.website || el.tags?.['contact:website'],
            openingHours: el.tags?.opening_hours,
            distanceKm: haversine(lat, lng, elLat, elLng),
            tags: deriveTags(name, el.tags, lang),
          };
        })
        .filter(Boolean)
        .sort((a: Hospital, b: Hospital) => scoreHospital(a) - scoreHospital(b))
        .slice(0, 10);

      setHospitals(items);
      setStatus(items.length === 0 ? 'empty' : 'live');
    },
    [lang]
  );

  useEffect(() => {
    if (!location.lat || !location.lng) return;
    void load(location.lat, location.lng, radius);
  }, [location.lat, location.lng, radius, load]);

  const expandRadius = () => {
    const next = RADIUS_OPTIONS.find((r) => r > radius);
    if (next) setRadius(next);
  };

  const retry = () => {
    if (location.lat && location.lng) void load(location.lat, location.lng, radius);
  };

  return (
    <div className="space-y-3">
      <GPSStatusBanner lang={lang} />

      <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-3 space-y-2">
        <p className="text-xs font-heading font-semibold text-red-600 dark:text-red-400">
          📤 {lang === 'vi' ? 'Chia sẻ vị trí khẩn cấp' : 'Emergency Location Sharing'}
        </p>
        <ShareLocationButton lang={lang} />
      </div>

      {/* Provider status + radius controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">{lang === 'vi' ? 'Nguồn:' : 'Source:'}</span>
          {status === 'live' && (
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 font-semibold">
              LIVE · OpenStreetMap
            </span>
          )}
          {status === 'loading' && (
            <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border font-semibold">
              {lang === 'vi' ? 'Đang tải…' : 'Loading...'}
            </span>
          )}
          {(status === 'unavailable' || status === 'error') && (
            <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 font-semibold">
              UNAVAILABLE
            </span>
          )}
          {status === 'empty' && (
            <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border font-semibold">
              {lang === 'vi' ? 'Không có dữ liệu' : 'No Data'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <MapPin className="w-3 h-3 text-muted-foreground" />
          <span className="text-muted-foreground">{lang === 'vi' ? 'Bán kính:' : 'Radius:'}</span>
          <div className="flex gap-1">
            {RADIUS_OPTIONS.map((r) => (
              <button
                key={r}
                onClick={() => setRadius(r)}
                className={`px-2 py-0.5 rounded-md border text-[11px] font-semibold ${
                  radius === r
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:border-primary/30'
                }`}
              >
                {r / 1000}km
              </button>
            ))}
          </div>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground">
        📍 {lang === 'vi' ? `Trong bán kính ${radius / 1000}km từ ${location.label}. Ưu tiên BV có khoa Hô hấp & Cấp cứu 24/7. Nguồn: OpenStreetMap.` : `Within ${radius / 1000}km radius from ${location.label}. Prioritizing Respiratory & 24/7 Emergency hospitals. Source: OpenStreetMap.`}
      </p>

      {location.lat && location.lng ? (
        <HospitalsMap userLat={location.lat} userLng={location.lng} hospitals={hospitals} />
      ) : (
        <div className="rounded-xl border border-border bg-card/60 h-72 flex items-center justify-center text-muted-foreground text-sm font-body">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          {lang === 'vi' ? 'Đang chờ GPS để hiển thị bản đồ...' : 'Waiting for GPS to render map...'}
        </div>
      )}

      {status === 'loading' && (
        <div className="flex items-center justify-center py-3 text-muted-foreground text-sm font-body">
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
          {lang === 'vi' ? 'Đang tìm cơ sở y tế gần...' : 'Locating nearby medical facilities...'}
        </div>
      )}

      {(status === 'unavailable' || status === 'error') && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300 space-y-2">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">{lang === 'vi' ? 'Không thể tải dữ liệu cơ sở y tế.' : 'Unable to load medical facilities.'}</p>
              <p className="text-xs opacity-90">
                {lang === 'vi'
                  ? 'Nguồn OpenStreetMap tạm không phản hồi. Vui lòng thử lại, mở rộng bán kính, hoặc gọi 115 nếu khẩn cấp.'
                  : 'OpenStreetMap API is temporarily unreachable. Retry, expand search radius, or call 115 in an emergency.'}
              </p>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={retry} className="gap-1.5 font-heading">
            <RefreshCw className="w-3 h-3" /> {lang === 'vi' ? 'Thử lại' : 'Retry'}
          </Button>
        </div>
      )}

      {status === 'empty' && (
        <div className="rounded-xl border border-border bg-card/60 p-4 text-sm text-muted-foreground space-y-3 font-body">
          <p>
            {lang === 'vi'
              ? 'Không tìm thấy dữ liệu bệnh viện gần bạn. Vui lòng thử lại hoặc nhập vị trí thủ công.'
              : 'No nearby hospital data found. Try expanding the radius or updating location.'}
          </p>
          <div className="flex flex-wrap gap-2">
            {radius < RADIUS_OPTIONS[RADIUS_OPTIONS.length - 1] && (
              <Button size="sm" variant="outline" onClick={expandRadius} className="font-heading">
                {lang === 'vi'
                  ? `Mở rộng tới ${RADIUS_OPTIONS.find((r) => r > radius)! / 1000}km`
                  : `Expand to ${RADIUS_OPTIONS.find((r) => r > radius)! / 1000}km`}
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={retry} className="gap-1.5 font-heading">
              <RefreshCw className="w-3 h-3" /> {lang === 'vi' ? 'Thử lại' : 'Retry'}
            </Button>
          </div>
        </div>
      )}

      {hospitals.map((h) => (
        <div key={h.id} className="rounded-xl border border-border bg-card/80 backdrop-blur p-4 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-heading font-bold text-foreground">{h.name}</p>
              <p className="text-xs text-muted-foreground">{h.distanceKm.toFixed(2)} km{h.openingHours ? ` · ${h.openingHours}` : ''}</p>
              {h.address && <p className="text-xs text-muted-foreground mt-0.5">📍 {h.address}</p>}
            </div>
            <span className="text-lg">🏥</span>
          </div>
          {h.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {h.tags.map((t) => (
                <span key={t} className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20">
                  {t}
                </span>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${h.lat},${h.lng}&travelmode=driving`, '_blank')}
              className="font-heading"
            >
              <Navigation className="w-3 h-3 mr-1" /> {lang === 'vi' ? 'Chỉ đường' : 'Directions'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate(`/smart-route?destLat=${h.lat}&destLng=${h.lng}&destName=${encodeURIComponent(h.name)}`)}
              className="font-heading"
            >
              🌿 {lang === 'vi' ? 'Lộ trình sạch' : 'Smart Route'}
            </Button>
            {h.phone && (
              <Button size="sm" variant="outline" onClick={() => (window.location.href = `tel:${h.phone}`)} className="font-heading">
                <Phone className="w-3 h-3 mr-1" /> {lang === 'vi' ? 'Gọi' : 'Call'}
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
