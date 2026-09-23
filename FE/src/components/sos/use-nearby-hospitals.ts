import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLiveAirContext } from '@/contexts/live-air-context';
import { useAppLang } from '@/hooks/use-app-lang';
import { isDemoMode } from '@/lib/demo/demo-mode';

export interface Hospital {
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

export type ProviderStatus = 'idle' | 'loading' | 'live' | 'demo' | 'empty' | 'unavailable' | 'error';

export const RADIUS_OPTIONS = [5000, 10000, 15000, 25000];

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
  if (/(cấp cứu|emergency|115)/.test(n) || tags?.emergency === 'yes') out.push(lang === 'vi' ? '🚑 Có thông tin cấp cứu' : '🚑 Emergency listed');
  if (/(bạch mai|chợ rẫy|việt đức|108|trung ương|đa khoa|general|ngọc thạch|gia định|xanh pôn)/.test(n)) out.push(lang === 'vi' ? '🏥 BV lớn' : '🏥 Major Hospital');
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

const FALLBACK_HOSPITALS_HANOI = [
  {
    id: 8001,
    name: 'Bệnh viện Bạch Mai (Trung tâm Cấp cứu A9 & Hô Hấp)',
    lat: 21.0028,
    lng: 105.8407,
    phone: '024 3869 3731',
    address: '78 Giải Phóng, Phương Mai, Đống Đa, Hà Nội',
    tags: ['🫁 Hô hấp', '🚑 Cấp cứu 24/7', '🏥 BV lớn'],
  },
  {
    id: 8002,
    name: 'Bệnh viện Phổi Trung Ương (Đầu ngành Hô Hấp)',
    lat: 21.0425,
    lng: 105.8174,
    phone: '024 3832 6249',
    address: '463 Hoàng Hoa Thám, Vĩnh Phúc, Ba Đình, Hà Nội',
    tags: ['🫁 Hô hấp', '🚑 Cấp cứu 24/7', '🏥 BV lớn'],
  },
  {
    id: 8003,
    name: 'Bệnh viện Hữu Nghị Việt Đức (Cấp cứu Tuyến cuối)',
    lat: 21.0283,
    lng: 105.8475,
    phone: '024 3825 3531',
    address: '40 Tràng Thi, Hàng Bông, Hoàn Kiếm, Hà Nội',
    tags: ['🚑 Cấp cứu 24/7', '🏥 BV lớn'],
  },
  {
    id: 8004,
    name: 'Bệnh viện Nhi Trung Ương (Cấp cứu Hô Hấp Nhi)',
    lat: 21.0222,
    lng: 105.8115,
    phone: '024 6273 8532',
    address: '18/879 La Thành, Láng Thượng, Đống Đa, Hà Nội',
    tags: ['🫁 Hô hấp', '🧒 Nhi', '🚑 Cấp cứu 24/7'],
  },
  {
    id: 8005,
    name: 'Bệnh viện Trung ương Quân đội 108',
    lat: 21.0181,
    lng: 105.8611,
    phone: '024 6278 4115',
    address: 'Số 1 Trần Hưng Đạo, Bạch Đằng, Hai Bà Trưng, Hà Nội',
    tags: ['🚑 Cấp cứu 24/7', '🏥 BV lớn', '❤️ Tim mạch'],
  },
  {
    id: 8006,
    name: 'Bệnh viện Đa khoa Xanh Pôn (Cấp cứu Ba Đình)',
    lat: 21.0336,
    lng: 105.8384,
    phone: '024 3823 3075',
    address: '12 Chu Văn An, Điện Biên, Ba Đình, Hà Nội',
    tags: ['🚑 Cấp cứu 24/7', '🏥 BV lớn'],
  },
];

const FALLBACK_HOSPITALS_HCM = [
  {
    id: 9001,
    name: 'Bệnh viện Phạm Ngọc Thạch (Chuyên khoa Lao & Hô Hấp)',
    lat: 10.7578,
    lng: 106.6631,
    phone: '028 3855 0207',
    address: '120 Hồng Bàng, Phường 12, Quận 5, TP.HCM',
    tags: ['🫁 Hô hấp', '🚑 Cấp cứu 24/7', '🏥 BV lớn'],
  },
  {
    id: 9002,
    name: 'Bệnh viện Chợ Rẫy (Trung tâm Cấp cứu Tuyến cuối)',
    lat: 10.7582,
    lng: 106.6601,
    phone: '028 3855 4137',
    address: '201B Nguyễn Chí Thanh, Phường 12, Quận 5, TP.HCM',
    tags: ['🚑 Cấp cứu 24/7', '🏥 BV lớn', '❤️ Tim mạch'],
  },
  {
    id: 9003,
    name: 'Bệnh viện Đại học Y Dược TP.HCM',
    lat: 10.7562,
    lng: 106.6625,
    phone: '028 3855 4269',
    address: '215 Hồng Bàng, Phường 11, Quận 5, TP.HCM',
    tags: ['🫁 Hô hấp', '❤️ Tim mạch', '🏥 BV lớn'],
  },
  {
    id: 9004,
    name: 'Bệnh viện Đa khoa Sài Gòn (Cấp cứu Quận 1)',
    lat: 10.7719,
    lng: 106.6974,
    phone: '028 3829 7468',
    address: '125 Lê Lợi, Phường Bến Thành, Quận 1, TP.HCM',
    tags: ['🚑 Cấp cứu 24/7', '🏥 BV lớn'],
  },
  {
    id: 9005,
    name: 'Bệnh viện Nhi Đồng 1 (Cấp cứu Hô hấp Nhi)',
    lat: 10.7688,
    lng: 106.6713,
    phone: '028 3927 1119',
    address: '341 Sư Vạn Hạnh, Phường 10, Quận 10, TP.HCM',
    tags: ['🫁 Hô hấp', '🧒 Nhi', '🚑 Cấp cứu 24/7'],
  },
  {
    id: 9006,
    name: 'Bệnh viện Nhân Dân Gia Định',
    lat: 10.8032,
    lng: 106.6938,
    phone: '028 3841 2692',
    address: '01 Nơ Trang Long, Phường 7, Bình Thạnh, TP.HCM',
    tags: ['🚑 Cấp cứu 24/7', '🏥 BV lớn', '❤️ Tim mạch'],
  },
];

function getRegionalFallbacks(lat: number) {
  return lat > 16 ? FALLBACK_HOSPITALS_HANOI : FALLBACK_HOSPITALS_HCM;
}

export function useNearbyHospitals() {
  const lang = useAppLang();
  const { location } = useLiveAirContext();
  const hasLocation = (location.status === 'active' || location.status === 'manual') &&
    Number.isFinite(location.lat) && Number.isFinite(location.lng) &&
    Math.abs(location.lat) <= 90 && Math.abs(location.lng) <= 180;
  const lat = hasLocation ? location.lat : 21.0285;
  const lng = hasLocation ? location.lng : 105.8542;

  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [status, setStatus] = useState<ProviderStatus>('idle');
  const [radius, setRadius] = useState<number>(10000);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);

  const load = useCallback(
    async (userLat: number, userLng: number, r: number) => {
      if (isDemoMode()) {
        const fallbackItems: Hospital[] = getRegionalFallbacks(userLat).map((h) => ({
          ...h,
          phone: undefined,
          tags: h.tags.map((tag) => tag.replace('Cấp cứu 24/7', 'Cấp cứu (demo)')),
          distanceKm: haversine(userLat, userLng, h.lat, h.lng),
        })).sort((a, b) => scoreHospital(a) - scoreHospital(b));
        setHospitals(fallbackItems);
        setStatus('demo');
        setErrorMsg(null);
        return;
      }
      setStatus('loading');
      setHospitals([]);
      setSelectedHospital(null);
      setErrorMsg(null);

      const query = `[out:json][timeout:15];(node["amenity"~"^(hospital|clinic)$"](around:${r},${userLat},${userLng});way["amenity"~"^(hospital|clinic)$"](around:${r},${userLat},${userLng});node["healthcare"~"^(hospital|clinic)$"](around:${r},${userLat},${userLng});way["healthcare"~"^(hospital|clinic)$"](around:${r},${userLat},${userLng}););out center 35;`;

      const endpoints = [
        'https://overpass-api.de/api/interpreter',
        'https://overpass.kumi.systems/api/interpreter',
        'https://overpass.private.coffee/api/interpreter',
      ];

      let data: any = null;
      for (const url of endpoints) {
        try {
          const ctrl = new AbortController();
          const to = window.setTimeout(() => ctrl.abort(), 3500);
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
        } catch {
          // Try the next provider; failures must never turn into sample hospitals.
        }
      }

      if (!data || !Array.isArray(data.elements)) {
        setHospitals([]);
        setStatus('error');
        setErrorMsg(lang === 'vi' ? 'Không tải được dữ liệu cơ sở y tế.' : 'Could not load medical facility data.');
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
            distanceKm: haversine(userLat, userLng, elLat, elLng),
            tags: deriveTags(name, el.tags, lang),
          };
        })
        .filter(Boolean)
        .sort((a: Hospital, b: Hospital) => scoreHospital(a) - scoreHospital(b))
        .slice(0, 12);

      if (items.length === 0) {
        setHospitals([]);
        setStatus('empty');
      } else {
        setHospitals(items);
        setStatus('live');
      }
    },
    [lang]
  );

  useEffect(() => {
    if (!hasLocation) {
      setHospitals([]);
      setStatus('unavailable');
      return;
    }
    void load(lat, lng, radius);
  }, [hasLocation, lat, lng, radius, load]);

  const expandRadius = () => {
    const next = RADIUS_OPTIONS.find((r) => r > radius);
    if (next) setRadius(next);
  };

  const retry = () => {
    if (hasLocation) void load(lat, lng, radius);
  };

  const nearestHospital = useMemo(() => {
    if (hospitals.length === 0) return null;
    return [...hospitals].sort((a, b) => a.distanceKm - b.distanceKm)[0];
  }, [hospitals]);

  return {
    hospitals,
    status,
    radius,
    setRadius,
    errorMsg,
    selectedHospital,
    setSelectedHospital,
    retry,
    expandRadius,
    nearestHospital,
    RADIUS_OPTIONS,
    userLat: lat,
    userLng: lng,
  };
}
