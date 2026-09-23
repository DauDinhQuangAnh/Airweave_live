import { AlertTriangle, Loader2, MapPin, Navigation, Phone, RefreshCw, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLiveAirContext } from '@/contexts/live-air-context';
import { useNavigate } from 'react-router-dom';
import GPSStatusBanner from './GPSStatusBanner';
import ShareLocationButton from './ShareLocationButton';
import { useAppLang } from '@/hooks/use-app-lang';
import { Hospital, ProviderStatus, RADIUS_OPTIONS } from './use-nearby-hospitals';

interface HospitalsTabProps {
  lang?: 'vi' | 'en';
  hospitals: Hospital[];
  status: ProviderStatus;
  radius: number;
  setRadius: (r: number) => void;
  selectedHospital?: Hospital | null;
  onSelectHospital?: (h: Hospital) => void;
  retry: () => void;
  expandRadius: () => void;
}

export default function HospitalsTab({
  lang: propLang,
  hospitals,
  status,
  radius,
  setRadius,
  selectedHospital,
  onSelectHospital,
  retry,
  expandRadius,
}: HospitalsTabProps) {
  const contextLang = useAppLang();
  const lang = propLang || contextLang;
  const { location } = useLiveAirContext();
  const navigate = useNavigate();

  return (
    <div className="space-y-4">
      {/* GPS Status */}
      <GPSStatusBanner lang={lang} />

      {/* Quick Share SOS Box */}
      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3.5 space-y-2.5 backdrop-blur-md">
        <p className="text-xs font-heading font-bold text-red-400 flex items-center gap-1.5">
          <span>📤</span> {lang === 'vi' ? 'Tự chia sẻ vị trí và số đo hiện có' : 'Share location and available readings'}
        </p>
        <ShareLocationButton lang={lang} />
      </div>

      {/* Filter and Radius Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-2xl bg-white/[0.03] border border-white/10 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-[11px]">{lang === 'vi' ? 'Nguồn:' : 'Source:'}</span>
          {status === 'live' && (
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[11px] font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              LIVE · OpenStreetMap
            </span>
          )}
          {status === 'demo' && (
            <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[11px] font-semibold">
              {lang === 'vi' ? 'DỮ LIỆU DEMO' : 'DEMO DATA'}
            </span>
          )}
          {status === 'loading' && (
            <span className="px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-400 border border-sky-500/30 text-[11px] font-semibold flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              {lang === 'vi' ? 'Đang tìm BV...' : 'Searching...'}
            </span>
          )}
          {(status === 'unavailable' || status === 'error' || status === 'empty') && (
            <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[11px] font-semibold">
              {status === 'unavailable' ? (lang === 'vi' ? 'CẦN VỊ TRÍ' : 'LOCATION NEEDED') : status === 'error' ? (lang === 'vi' ? 'LỖI TẢI DỮ LIỆU' : 'DATA ERROR') : (lang === 'vi' ? 'CHƯA CÓ KẾT QUẢ' : 'NO RESULTS')}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <MapPin className="w-3 h-3 text-gray-400" />
          <span className="text-gray-400 text-[11px]">{lang === 'vi' ? 'Bán kính:' : 'Radius:'}</span>
          <div className="flex gap-1">
            {RADIUS_OPTIONS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRadius(r)}
                className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-all ${
                  radius === r
                    ? 'border-red-500 bg-red-500/20 text-red-300 shadow-sm'
                    : 'border-white/10 text-gray-400 hover:border-white/20 hover:text-white bg-white/[0.02]'
                }`}
              >
                {r / 1000}km
              </button>
            ))}
          </div>
        </div>
      </div>

      <p className="text-[11px] text-gray-400 font-body px-1">
        📍 {status === 'unavailable'
          ? (lang === 'vi' ? 'Cần xác nhận vị trí để tìm cơ sở y tế gần bạn.' : 'Confirm your location to search for nearby medical facilities.')
          : status === 'error'
            ? (lang === 'vi' ? 'Không tải được dữ liệu cơ sở y tế. Hãy thử lại hoặc gọi 115 nếu khẩn cấp.' : 'Medical facility data could not be loaded. Retry or call emergency services if urgent.')
            : lang === 'vi'
              ? `Tìm thấy ${hospitals.length} cơ sở trong bán kính ${radius / 1000}km từ ${location.label}. Thông tin chuyên khoa và giờ mở cửa cần được xác minh trực tiếp.`
              : `Found ${hospitals.length} facilities within ${radius / 1000}km from ${location.label}. Verify specialties and opening hours directly.`}
      </p>

      {/* Loading & Error States */}
      {status === 'loading' && hospitals.length === 0 && (
        <div className="flex items-center justify-center py-8 text-gray-400 text-sm font-body">
          <Loader2 className="w-5 h-5 animate-spin mr-2 text-red-500" />
          {lang === 'vi' ? 'Đang quét cơ sở y tế vi vùng...' : 'Locating nearby medical facilities...'}
        </div>
      )}

      {/* List of Hospital Cards */}
      <div className="space-y-3 max-h-[640px] overflow-y-auto pr-1">
        {hospitals.map((h) => {
          const isSelected = selectedHospital?.id === h.id;
          const isResp = h.tags.some((t) => t.includes('Hô hấp') || t.includes('Respiratory'));
          const isEmerg = h.tags.some((t) => t.includes('Cấp cứu') || t.includes('Emergency'));

          return (
            <div
              key={h.id}
              onClick={() => onSelectHospital?.(h)}
              className={`rounded-2xl border p-4 space-y-2.5 backdrop-blur-xl transition-all cursor-pointer ${
                isSelected
                  ? 'bg-red-950/40 border-red-500/60 shadow-lg shadow-red-950/50 ring-1 ring-red-500/40'
                  : 'bg-[#0c1322]/80 border-white/10 hover:border-white/25 hover:bg-[#0f172a]/90'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{isResp ? '🫁' : isEmerg ? '🚑' : '🏥'}</span>
                    <h4 className="font-heading font-bold text-white text-sm leading-snug">
                      {h.name}
                    </h4>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                    <span className="font-mono font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      {h.distanceKm.toFixed(2)} km
                    </span>
                    {h.openingHours && (
                      <span className="text-gray-400 truncate">· {h.openingHours}</span>
                    )}
                  </div>
                  {h.address && (
                    <p className="text-[11px] text-gray-400 mt-1 leading-relaxed line-clamp-2">
                      📍 {h.address}
                    </p>
                  )}
                </div>
              </div>

              {/* Tags */}
              {h.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {h.tags.map((t) => (
                    <span
                      key={t}
                      className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/15 text-red-300 border border-red-500/30"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-white/5">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectHospital?.(h);
                  }}
                  className="h-8 px-2.5 text-xs font-heading bg-white/[0.04] border-white/10 hover:bg-white/10 text-gray-300"
                >
                  <Eye className="w-3 h-3 mr-1 text-sky-400" />
                  {lang === 'vi' ? 'Tiêu điểm map' : 'Focus map'}
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(
                      `https://www.google.com/maps/dir/?api=1&destination=${h.lat},${h.lng}&travelmode=driving`,
                      '_blank'
                    );
                  }}
                  className="h-8 px-2.5 text-xs font-heading bg-sky-500/15 border-sky-500/30 hover:bg-sky-500/25 text-sky-300"
                >
                  <Navigation className="w-3 h-3 mr-1" />
                  {lang === 'vi' ? 'Chỉ đường' : 'Directions'}
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(
                      `/smart-route?destLat=${h.lat}&destLng=${h.lng}&destName=${encodeURIComponent(
                        h.name
                      )}`
                    );
                  }}
                  className="h-8 px-2.5 text-xs font-heading bg-emerald-500/15 border-emerald-500/30 hover:bg-emerald-500/25 text-emerald-300"
                >
                  🌿 {lang === 'vi' ? 'Lộ trình sạch' : 'Smart Route'}
                </Button>

                {h.phone && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.location.href = `tel:${h.phone}`;
                    }}
                    className="h-8 px-2.5 text-xs font-heading bg-red-600/20 border-red-500/40 hover:bg-red-600/30 text-red-300"
                  >
                    <Phone className="w-3 h-3 mr-1" />
                    {lang === 'vi' ? 'Gọi' : 'Call'}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
