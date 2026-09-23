import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import QRCode from 'qrcode';
import { Phone, MapPin, AlertTriangle, Loader2 } from 'lucide-react';
import { CONDITION_GROUPS, getConditionLabel } from '@/lib/sos-conditions';
import { sosApi } from '@/integrations/api';
import { isDemoMode } from '@/lib/demo/demo-mode';
import { useAppLang } from '@/hooks/use-app-lang';
import { getAQIStatus } from '@/lib/air-quality';
import { localizeDemoText } from '@/lib/localize-demo';

interface QRData {
  event: { lat: number | null; lng: number | null; aqi: number | null; pm25: number | null; triggered_at: string };
  profile: {
    display_name: string;
    birth_year: number | null;
    blood_type: string | null;
    emergency_phone: string | null;
    emergency_name: string | null;
    avatar_emoji: string | null;
    relation: string;
  } | null;
  conditions: Array<{ category: string; code: string; note: string | null }>;
}

export default function MedicalQR() {
  const lang = useAppLang();
  const { token } = useParams();
  const isDemo = isDemoMode() && token === 'demo';
  const [data, setData] = useState<QRData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [qrSvg, setQrSvg] = useState<string>('');

  useEffect(() => {
    if (!token) return;
    // Endpoint công khai — người sơ cứu quét QR không cần đăng nhập
    sosApi
      .byShareToken(token)
      .then((payload) => setData(payload as unknown as QRData))
      .catch((e) => setError(e.message ?? (lang === 'vi' ? 'Lỗi tải dữ liệu' : 'Failed to load data')));
  }, [token, lang]);

  useEffect(() => {
    if (!token) return;
    QRCode.toString(window.location.href, { type: 'svg', margin: 1, width: 240, color: { dark: '#000', light: '#fff' } })
      .then(setQrSvg)
      .catch(() => {});
  }, [token]);

  // Force max brightness if API supported
  useEffect(() => {
    document.documentElement.style.filter = 'brightness(1.1)';
    return () => {
      document.documentElement.style.filter = '';
    };
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-200 text-red-950 p-6">
        <div className="text-center space-y-2">
          <AlertTriangle className="w-12 h-12 mx-auto" />
          <p className="font-bold text-xl">{error}</p>
          <p className="text-sm opacity-80">{lang === 'vi' ? 'Mã QR có thể đã hết hạn (24h).' : 'This QR code may have expired (24h).'}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-200 text-red-800">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  const aqi = typeof data.event.aqi === 'number' && Number.isFinite(data.event.aqi) ? data.event.aqi : null;
  const aqiLevel = aqi === null ? null : getAQIStatus(aqi, lang).toUpperCase();
  const minutesAgo = Math.round((Date.now() - new Date(data.event.triggered_at).getTime()) / 60000);

  return (
    <div className="min-h-screen bg-slate-200 text-red-950">
      {isDemo && (
        <div className="bg-yellow-400 text-red-900 text-center py-2 px-4 font-bold text-xs sm:text-sm border-b-2 border-yellow-600">
          {lang === 'vi' ? '🧪 GIAO DIỆN DEMO — Đây là bản xem trước Phiếu bệnh án tóm tắt mà bác sĩ sẽ thấy khi quét QR' : '🧪 DEMO VIEW — Preview of the emergency summary shown to medical staff after scanning the QR code'}
        </div>
      )}
      {/* Header */}
      <div className="bg-white text-red-700 py-3 px-4 flex items-center justify-between border-b-4 border-red-700 shadow-md">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-6 h-6" />
          <p className="font-black text-xl tracking-tight">AIRWEAVE SOS</p>
        </div>
        <p className="text-xs font-mono font-semibold text-red-600">
          {minutesAgo < 1 ? (lang === 'vi' ? 'Vừa kích hoạt' : 'Just activated') : `${minutesAgo} ${lang === 'vi' ? 'phút trước' : 'minutes ago'}`}
        </p>
      </div>

      <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-4">
        {/* Patient identity */}
        <div className="bg-white text-red-950 rounded-xl p-5 space-y-2 border border-slate-200 shadow-[0_16px_36px_-18px_rgba(15,23,42,0.45)]">
          <div className="flex items-center gap-3">
            <div className="text-5xl">{data.profile?.avatar_emoji ?? '👤'}</div>
            <div>
              <p className="text-3xl font-black">{data.profile?.display_name}</p>
              <p className="text-sm text-red-700 font-mono font-semibold">
                {data.profile?.birth_year ? `${lang === 'vi' ? 'Năm sinh' : 'Born'} ${data.profile.birth_year}` : (lang === 'vi' ? 'Chưa rõ tuổi' : 'Age unknown')}
                {data.profile?.blood_type ? ` · ${lang === 'vi' ? 'NHÓM MÁU' : 'BLOOD TYPE'} ${data.profile.blood_type}` : ''}
              </p>
            </div>
          </div>
        </div>

        {/* Conditions — large */}
        <div className="bg-white text-red-950 rounded-xl p-5 space-y-3 border border-slate-200 shadow-[0_16px_36px_-18px_rgba(15,23,42,0.45)]">
          <p className="text-xs font-black uppercase tracking-widest text-red-700 border-b border-red-200 pb-1">
            ⚠ {lang === 'vi' ? 'BỆNH NỀN' : 'MEDICAL CONDITIONS'}
          </p>
          {data.conditions.length === 0 ? (
            <p className="text-base text-red-700 italic font-semibold">{lang === 'vi' ? 'Không khai báo bệnh nền.' : 'No medical conditions reported.'}</p>
          ) : (
            <ul className="space-y-1.5">
              {CONDITION_GROUPS.flatMap((g) =>
                data.conditions
                  .filter((c) => c.category === g.category)
                  .map((c) => (
                    <li key={`${c.category}-${c.code}`} className="flex items-baseline gap-2">
                      <span className="text-red-500">▸</span>
                      <span className="font-black text-2xl uppercase tracking-tight">
                        {getConditionLabel(c.category, c.code, lang)}
                      </span>
                      {c.note && <span className="text-sm font-mono font-semibold text-red-700">({localizeDemoText(c.note, lang)})</span>}
                    </li>
                  ))
              )}
            </ul>
          )}
        </div>

        {/* Air exposure context */}
        <div className="bg-yellow-200 text-red-950 rounded-xl p-5 space-y-2 shadow-[0_18px_40px_-18px_rgba(146,64,14,0.65)] border-4 border-yellow-500">
          <p className="text-xs font-black uppercase tracking-widest">🌫 {lang === 'vi' ? 'BỐI CẢNH PHƠI NHIỄM' : 'EXPOSURE CONTEXT'}</p>
          <div className="flex items-baseline gap-3 flex-wrap">
            <span className="text-5xl font-black">AQI {aqi ?? '—'}</span>
            {aqiLevel && <span className="text-xl font-bold uppercase">({aqiLevel})</span>}
          </div>
          {data.event.pm25 != null && (
            <p className="font-mono text-sm">
              PM2.5: <strong>{data.event.pm25.toFixed(1)} µg/m³</strong>
            </p>
          )}
          <p className="text-sm font-semibold">
            {aqi === null
              ? (lang === 'vi' ? 'Chưa có số đo chất lượng không khí kèm theo tín hiệu SOS này.' : 'No air-quality reading was attached to this SOS event.')
              : (lang === 'vi' ? 'Đây là số đo tham chiếu tại thời điểm kích hoạt SOS; không dùng để chẩn đoán tình trạng bệnh nhân.' : 'This is a reference reading from when SOS was activated; it does not diagnose the patient.')}
          </p>
        </div>

        {/* QR + actions */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="bg-white text-red-950 rounded-xl p-4 flex flex-col items-center border border-slate-200 shadow-[0_16px_36px_-18px_rgba(15,23,42,0.45)]">
            <p className="text-xs font-black uppercase tracking-widest mb-2">{lang === 'vi' ? 'Quét xem online' : 'Scan to view online'}</p>
            <div className="bg-white p-2 rounded-lg" dangerouslySetInnerHTML={{ __html: qrSvg }} />
          </div>
          <div className="space-y-2">
            {data.profile?.emergency_phone && (
              <a
                href={`tel:${data.profile.emergency_phone}`}
                className="block bg-white text-red-800 rounded-xl p-4 border border-slate-200 shadow-[0_14px_30px_-18px_rgba(15,23,42,0.5)] hover:bg-red-50 active:scale-95 transition-all"
              >
                <div className="flex items-center gap-2 font-black text-lg">
                  <Phone className="w-5 h-5" /> {lang === 'vi' ? 'Gọi người thân' : 'Call emergency contact'}
                </div>
                <p className="font-mono text-base mt-1">{data.profile.emergency_phone}</p>
                {data.profile.emergency_name && (
                  <p className="text-xs text-red-600 font-semibold">{localizeDemoText(data.profile.emergency_name, lang)}</p>
                )}
              </a>
            )}
            <a
              href="tel:115"
              className="block bg-red-800 text-white rounded-xl p-4 shadow-[0_14px_28px_-14px_rgba(127,29,29,0.75)] hover:bg-red-900 active:scale-95 transition-all"
            >
              <div className="flex items-center gap-2 font-black text-lg">
                <Phone className="w-5 h-5" /> {lang === 'vi' ? 'Gọi cấp cứu 115' : 'Call emergency services (115)'}
              </div>
            </a>
            {data.event.lat && data.event.lng && (
              <a
                href={`https://www.google.com/maps?q=${data.event.lat},${data.event.lng}`}
                target="_blank"
                rel="noreferrer"
                className="block bg-white text-red-800 rounded-xl p-3 border border-slate-200 shadow-[0_14px_30px_-18px_rgba(15,23,42,0.5)]"
              >
                <div className="flex items-center gap-2 font-bold">
                  <MapPin className="w-4 h-4" /> {lang === 'vi' ? 'Vị trí GPS' : 'GPS location'}
                </div>
                <p className="text-xs font-mono">{data.event.lat.toFixed(5)}, {data.event.lng.toFixed(5)}</p>
              </a>
            )}
          </div>
        </div>

        <p className="text-xs text-slate-600 font-medium text-center pt-4">
          {lang === 'vi' ? 'Thông tin do người dùng tự khai. Chỉ mang tính tham khảo cho nhân viên y tế.' : 'User-reported information for reference by medical personnel only.'}
        </p>
      </div>
    </div>
  );
}
