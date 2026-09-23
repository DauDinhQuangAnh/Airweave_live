import { useState } from 'react';
import {
  Siren,
  Heart,
  MapPin,
  Info,
  ShieldCheck,
  Hospital as HospitalIcon,
  Phone,
  ArrowLeft,
  Home,
  Activity,
  Wind,
  Bot,
  Eye,
  Share2,
  Navigation,
  Compass,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import AuroraBackground from '@/components/AuroraBackground';
import { useAppLang } from '@/hooks/use-app-lang';
import { useLiveAirContext } from '@/contexts/live-air-context';
import { useMedicalProfiles } from '@/hooks/use-medical-profiles';
import MedicalIDTab from '@/components/sos/MedicalIDTab';
import HospitalsTab from '@/components/sos/HospitalsTab';
import DisclaimerTab from '@/components/sos/DisclaimerTab';
import HospitalsMap from '@/components/sos/HospitalsMap';
import { useNearbyHospitals } from '@/components/sos/use-nearby-hospitals';
import { hasAirQualityReading } from '@/lib/air-quality';
import { hasWeatherMetric } from '@/hooks/use-weather-data';

export default function SOS() {
  const navigate = useNavigate();
  const lang = useAppLang();
  const [tab, setTab] = useState<'id' | 'hospitals' | 'info'>('id');

  const { location, weather } = useLiveAirContext();
  const { profiles, conditions } = useMedicalProfiles();
  const {
    hospitals,
    status: hospitalStatus,
    radius,
    setRadius,
    selectedHospital,
    setSelectedHospital,
    retry: retryHospitals,
    expandRadius,
    nearestHospital,
    userLat,
    userLng,
  } = useNearbyHospitals();

  const hasReading = hasAirQualityReading(weather);
  const aqi = hasReading ? weather.aqi : null;
  const pm25 = hasWeatherMetric(weather, 'pm25') ? weather.pm25 : null;

  const getAqiRiskLevel = (val: number) => {
    if (val <= 50) return { label: lang === 'vi' ? 'An toàn hô hấp' : 'Low Risk', color: 'text-emerald-400', bg: 'bg-emerald-500/15 border-emerald-500/30' };
    if (val <= 100) return { label: lang === 'vi' ? 'Nguy cơ vừa' : 'Moderate Risk', color: 'text-amber-400', bg: 'bg-amber-500/15 border-amber-500/30' };
    if (val <= 150) return { label: lang === 'vi' ? 'Kém (Nhạy cảm)' : 'Unhealthy for Sensitive', color: 'text-orange-400', bg: 'bg-orange-500/15 border-orange-500/30' };
    if (val <= 200) return { label: lang === 'vi' ? 'Có hại sức khỏe' : 'Unhealthy', color: 'text-red-400', bg: 'bg-red-500/15 border-red-500/30' };
    return { label: lang === 'vi' ? 'Rất nguy hại' : 'Very Unhealthy', color: 'text-purple-400', bg: 'bg-purple-500/15 border-purple-500/30' };
  };

  const risk = aqi === null
    ? { label: lang === 'vi' ? 'Chưa có số đo' : 'No reading', color: 'text-slate-300', bg: 'bg-slate-500/15 border-slate-500/30' }
    : getAqiRiskLevel(aqi);

  const openAICoach = () => {
    window.dispatchEvent(
      new CustomEvent('airweave:open-ai-chat', {
        detail: {
          prompt:
            lang === 'vi'
              ? 'Tôi đang khó thở vì ô nhiễm không khí cao. Hãy hướng dẫn tôi kỹ thuật thở 4-7-8 và các bước xử trí khẩn cấp ngay bây giờ.'
              : 'I am experiencing respiratory distress due to severe pollution. Please guide me through 4-7-8 breathing and immediate first-aid steps now.',
        },
      })
    );
  };

  return (
    <div className="relative min-h-screen bg-[#050911] text-foreground font-body overflow-x-hidden selection:bg-red-500/30">
      <AuroraBackground />
      <div className="relative z-10 w-full max-w-[1750px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-24 space-y-6">

          {/* Top Navigation & Header */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6 rounded-3xl bg-[#0c1322]/80 backdrop-blur-xl border border-white/10 shadow-2xl">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(-1)}
                  className="bg-white/[0.03] border-white/10 hover:bg-white/10 text-gray-300 rounded-xl"
                >
                  <ArrowLeft className="w-4 h-4 mr-1.5" />
                  {lang === 'vi' ? 'Quay lại' : 'Back'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/')}
                  className="bg-white/[0.03] border-white/10 hover:bg-white/10 text-gray-300 rounded-xl"
                >
                  <Home className="w-4 h-4 mr-1.5" />
                  {lang === 'vi' ? 'Trang chủ' : 'Home'}
                </Button>
              </div>

              <div className="h-6 w-px bg-white/10 hidden sm:block"></div>

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-600 via-red-700 to-rose-900 flex items-center justify-center shadow-lg shadow-red-600/40 ring-2 ring-red-500/30 shrink-0">
                  <Siren className="w-6 h-6 text-white animate-pulse" strokeWidth={2.5} />
                </div>
                <div>
                  <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-red-500/15 border border-red-500/30 text-[10px] font-heading font-bold uppercase tracking-wider text-red-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping"></span>
                    {lang === 'vi' ? 'EMERGENCY · HỖ TRỢ KHẨN CẤP' : 'EMERGENCY · RESPIRATORY SOS'}
                  </div>
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-heading font-black text-white tracking-tight leading-tight mt-0.5">
                    AirWeave <span className="text-red-500">SOS</span>
                  </h1>
                </div>
              </div>
            </div>

            {/* Quick Urgent Hotlines */}
            <div className="flex items-center gap-2.5">
              <Button
                size="sm"
                onClick={openAICoach}
                className="bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 rounded-2xl font-heading text-xs"
              >
                <Bot className="w-3.5 h-3.5 mr-1.5 text-sky-400" />
                {lang === 'vi' ? 'AI Hướng Dẫn Thở' : 'Breathing Coach'}
              </Button>

              <Button
                size="sm"
                onClick={() => window.open('/qr/demo', '_blank')}
                className="bg-white/[0.04] hover:bg-white/[0.08] text-gray-200 border border-white/15 rounded-2xl font-heading text-xs"
              >
                <Eye className="w-3.5 h-3.5 mr-1.5 text-red-400" />
                {lang === 'vi' ? 'Demo QR Bác Sĩ' : 'Doctor QR'}
              </Button>

              <a
                href="tel:115"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-heading font-bold text-sm shadow-lg shadow-red-600/40 transition-all active:scale-95"
              >
                <Phone className="w-4 h-4 animate-bounce" />
                {lang === 'vi' ? 'GỌI 115' : 'CALL 115'}
              </a>
            </div>
          </div>

          {/* Dải 4 Thẻ Đo Lường KPI Telemetry */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI 1: Phơi Nhiễm Thời Gian Thực */}
            <div className="p-4 sm:p-5 rounded-3xl bg-[#0c1322]/80 backdrop-blur-xl border border-white/10 shadow-xl space-y-2 relative overflow-hidden group hover:border-red-500/30 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-heading font-semibold text-gray-400">
                  {lang === 'vi' ? 'Chất Lượng Không Khí Tại Vị Trí' : 'Air Quality at Location'}
                </span>
                <div className="w-8 h-8 rounded-xl bg-red-500/10 flex items-center justify-center text-red-400">
                  <Wind className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-heading font-black text-white">
                  AQI {aqi ?? '—'}
                </span>
                <span className="text-xs text-gray-400 font-mono">
                  PM2.5 {pm25 === null ? '—' : Math.round(pm25)} µg/m³
                </span>
              </div>
              <div className="pt-1 flex items-center justify-between text-[11px]">
                <span className={`px-2 py-0.5 rounded-full font-semibold border ${risk.bg} ${risk.color}`}>
                  {risk.label}
                </span>
                <span className="text-gray-400 truncate max-w-[120px]">
                  📍 {location.label}
                </span>
              </div>
            </div>

            {/* KPI 2: Mạng Lưới Cứu Hộ Y Tế */}
            <div className="p-4 sm:p-5 rounded-3xl bg-[#0c1322]/80 backdrop-blur-xl border border-white/10 shadow-xl space-y-2 relative overflow-hidden group hover:border-emerald-500/30 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-heading font-semibold text-gray-400">
                  {lang === 'vi' ? 'Cơ sở y tế tìm thấy' : 'Medical facilities found'}
                </span>
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                  <HospitalIcon className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-heading font-black text-white">
                  {hospitals.length}
                </span>
                <span className="text-xs text-gray-400 font-body">
                  {hospitalStatus === 'demo' ? (lang === 'vi' ? 'cơ sở minh họa' : 'demo facilities') : (lang === 'vi' ? 'cơ sở từ bản đồ' : 'mapped facilities')}
                </span>
              </div>
              <div className="pt-1 flex items-center justify-between text-[11px]">
                <span className="px-2 py-0.5 rounded-full font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  {lang === 'vi' ? `Bán kính ${radius / 1000}km` : `${radius / 1000}km radius`}
                </span>
                <span className="text-gray-400">
                  {nearestHospital ? `${lang === 'vi' ? 'Gần nhất' : 'Nearest'}: ${nearestHospital.distanceKm.toFixed(1)}km` : '--'}
                </span>
              </div>
            </div>

            {/* KPI 3: Hồ Sơ Medical ID */}
            <div className="p-4 sm:p-5 rounded-3xl bg-[#0c1322]/80 backdrop-blur-xl border border-white/10 shadow-xl space-y-2 relative overflow-hidden group hover:border-sky-500/30 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-heading font-semibold text-gray-400">
                  {lang === 'vi' ? 'Hồ Sơ Medical ID Sẵn Sàng' : 'Medical ID Profiles'}
                </span>
                <div className="w-8 h-8 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-400">
                  <Heart className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-heading font-black text-white">
                  {profiles.length}
                </span>
                <span className="text-xs text-gray-400 font-body">
                  {lang === 'vi' ? 'người thân đã lưu' : 'profiles active'}
                </span>
              </div>
              <div className="pt-1 flex items-center justify-between text-[11px]">
                <span className="px-2 py-0.5 rounded-full font-semibold bg-sky-500/15 text-sky-300 border border-sky-500/30">
                  {conditions.length} {lang === 'vi' ? 'bệnh nền & dị ứng' : 'conditions mapped'}
                </span>
                <span className="text-gray-400">
                  {profiles[0]?.blood_type
                    ? `${lang === 'vi' ? 'Nhóm máu' : 'Blood type'}: ${profiles[0].blood_type}`
                    : (lang === 'vi' ? 'Tự cập nhật' : 'Auto-updated')}
                </span>
              </div>
            </div>

            {/* KPI 4: Cam Kết Bảo Mật & Ủy Quyền */}
            <div className="p-4 sm:p-5 rounded-3xl bg-[#0c1322]/80 backdrop-blur-xl border border-white/10 shadow-xl space-y-2 relative overflow-hidden group hover:border-amber-500/30 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-heading font-semibold text-gray-400">
                  {lang === 'vi' ? 'Chia Sẻ Có Chủ Đích' : 'Intentional Sharing'}
                </span>
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400">
                  <ShieldCheck className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-heading font-black text-white">
                  QR
                </span>
                <span className="text-xs text-amber-400 font-body">
                  {lang === 'vi' ? 'Theo lựa chọn' : 'On request'}
                </span>
              </div>
              <div className="pt-1 flex items-center justify-between text-[11px]">
                <span className="px-2 py-0.5 rounded-full font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  {lang === 'vi' ? 'Xác nhận trước khi chia sẻ' : 'Explicit opt-in'}
                </span>
                <span className="text-gray-400">{lang === 'vi' ? 'Xem lại trước khi gửi' : 'Review before sending'}</span>
              </div>
            </div>
          </div>

          {/* Bento Grid 2 Columns */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

            {/* Left Column (5 Cols): Studio Tabs */}
            <div className="lg:col-span-5 space-y-5">
              {/* Tab Selector Bar */}
              <div className="p-1.5 rounded-2xl bg-[#0c1322]/90 border border-white/10 shadow-xl flex gap-1.5 backdrop-blur-xl">
                <button
                  type="button"
                  data-tab="id"
                  onClick={() => setTab('id')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs sm:text-sm font-heading font-bold transition-all ${
                    tab === 'id'
                      ? 'bg-gradient-to-r from-red-600 to-rose-700 text-white shadow-lg shadow-red-900/40'
                      : 'text-gray-400 hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  <Heart className="w-4 h-4" />
                  <span>Medical ID</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
                    {profiles.length}
                  </span>
                </button>

                <button
                  type="button"
                  data-tab="hospitals"
                  onClick={() => setTab('hospitals')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs sm:text-sm font-heading font-bold transition-all ${
                    tab === 'hospitals'
                      ? 'bg-gradient-to-r from-red-600 to-rose-700 text-white shadow-lg shadow-red-900/40'
                      : 'text-gray-400 hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  <MapPin className="w-4 h-4" />
                  <span>{lang === 'vi' ? 'Bệnh viện gần' : 'Hospitals'}</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
                    {hospitals.length}
                  </span>
                </button>

                <button
                  type="button"
                  data-tab="info"
                  onClick={() => setTab('info')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs sm:text-sm font-heading font-bold transition-all ${
                    tab === 'info'
                      ? 'bg-gradient-to-r from-red-600 to-rose-700 text-white shadow-lg shadow-red-900/40'
                      : 'text-gray-400 hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  <Info className="w-4 h-4" />
                  <span>{lang === 'vi' ? 'Hướng dẫn' : 'Protocol'}</span>
                </button>
              </div>

              {/* Tab Content Display */}
              <div className="rounded-3xl bg-[#0c1322]/80 backdrop-blur-xl border border-white/10 p-5 sm:p-6 shadow-2xl">
                {tab === 'id' && <MedicalIDTab lang={lang} />}
                {tab === 'hospitals' && (
                  <HospitalsTab
                    lang={lang}
                    hospitals={hospitals}
                    status={hospitalStatus}
                    radius={radius}
                    setRadius={setRadius}
                    selectedHospital={selectedHospital}
                    onSelectHospital={setSelectedHospital}
                    retry={retryHospitals}
                    expandRadius={expandRadius}
                  />
                )}
                {tab === 'info' && <DisclaimerTab lang={lang} />}
              </div>
            </div>

            {/* Right Column (7 Cols): Map & Emergency Dispatch Hub */}
            <div className="lg:col-span-7 space-y-5">
              {/* Mapbox Dark v11 Emergency Map Card */}
              <div className="rounded-3xl bg-[#0c1322]/80 backdrop-blur-xl border border-white/10 p-5 sm:p-6 shadow-2xl space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-heading font-bold text-base sm:text-lg text-white flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-red-500" />
                      <span>{lang === 'vi' ? 'Mạng Lưới Y Tế Khẩn Cấp Vi Vùng' : 'Micro-regional Emergency Medical Grid'}</span>
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5 font-body">
                      {lang === 'vi'
                        ? 'Hiển thị cơ sở y tế từ bản đồ; hãy xác minh chuyên khoa, giờ mở cửa và tình trạng tiếp nhận trước khi đến.'
                        : 'Showing mapped medical facilities; verify specialty, opening hours and availability before visiting.'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {selectedHospital && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedHospital(null)}
                        className="h-8 text-xs bg-white/[0.04] border-white/15 text-gray-300 hover:bg-white/10 rounded-xl"
                      >
                        <Compass className="w-3.5 h-3.5 mr-1 text-sky-400" />
                        {lang === 'vi' ? 'Xem toàn cảnh' : 'Reset view'}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Map Display (Height 540px) */}
                <div className="h-[540px]">
                  {(location.status === 'active' || location.status === 'manual') && Number.isFinite(location.lat) && Number.isFinite(location.lng) ? <HospitalsMap
                    userLat={userLat}
                    userLng={userLng}
                    hospitals={hospitals}
                    selectedHospital={selectedHospital}
                    onSelectHospital={setSelectedHospital}
                    radiusMeters={radius}
                    lang={lang}
                  /> : <div className="h-full rounded-xl border border-white/10 bg-slate-950/60 flex items-center justify-center text-sm text-gray-400 p-6 text-center">{lang === 'vi' ? 'Cần xác nhận vị trí trước khi hiển thị bản đồ cơ sở y tế.' : 'Confirm your location before showing the medical facility map.'}</div>}
                </div>
              </div>

              {/* Emergency Dispatch Hub Bento Box */}
              <div className="rounded-3xl bg-[#0c1322]/80 backdrop-blur-xl border border-white/10 p-5 sm:p-6 shadow-2xl space-y-4">
                <div>
                  <h3 className="font-heading font-bold text-base text-white flex items-center gap-2">
                    <Activity className="w-5 h-5 text-red-400" />
                    <span>{lang === 'vi' ? 'Trung Tâm Điều Phối & Ứng Cứu Khẩn Cấp' : 'Emergency Dispatch & Response Hub'}</span>
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5 font-body">
                    {lang === 'vi'
                      ? 'Các hành động nhanh hỗ trợ khi người bệnh có triệu chứng khó thở cấp tính'
                      : 'Priority actions to protect respiratory health during severe air pollution spikes'}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-1">
                  {/* Action 1: AI Coach thở */}
                  <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2 hover:border-sky-500/30 transition-all">
                    <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
                      <Bot className="w-5 h-5" />
                    </div>
                    <h4 className="font-heading font-bold text-sm text-sky-300">
                      {lang === 'vi' ? '1. Trợ Lý AI Kỹ Thuật Thở' : '1. AI Breathing Coach'}
                    </h4>
                    <p className="text-[11px] text-gray-400 leading-relaxed font-body">
                      {lang === 'vi'
                        ? 'Hướng dẫn kỹ thuật thở 4-7-8, xoa dịu đường thở và tư thế giảm áp lực cơ hoành khi hít phải khí độc.'
                        : 'Guided 4-7-8 breathing, airway-calming steps, and posture guidance after pollution exposure.'}
                    </p>
                    <Button
                      size="sm"
                      onClick={openAICoach}
                      className="w-full h-8 text-xs font-heading bg-sky-500/20 hover:bg-sky-500/30 text-sky-200 border border-sky-500/40 rounded-xl mt-1"
                    >
                      {lang === 'vi' ? 'Mở AI Hướng Dẫn Thở' : 'Open AI Breathing Coach'}
                    </Button>
                  </div>

                  {/* Action 2: Doctor QR Flashcard */}
                  <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2 hover:border-red-500/30 transition-all">
                    <div className="w-9 h-9 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400">
                      <Eye className="w-5 h-5" />
                    </div>
                    <h4 className="font-heading font-bold text-sm text-red-300">
                      {lang === 'vi' ? '2. Flashcard QR Bác Sĩ' : '2. Doctor QR Flashcard'}
                    </h4>
                    <p className="text-[11px] text-gray-400 leading-relaxed font-body">
                      {lang === 'vi'
                        ? 'Xuất mã QR hiển thị ngay tiền sử hen suyễn, dị ứng và nồng độ ô nhiễm hiện trường cho y bác sĩ quét.'
                        : 'Generate a QR code with respiratory history, allergies, and current pollution readings for medical staff.'}
                    </p>
                    <Button
                      size="sm"
                      onClick={() => window.open('/qr/demo', '_blank')}
                      className="w-full h-8 text-xs font-heading bg-red-600/20 hover:bg-red-600/30 text-red-200 border border-red-500/40 rounded-xl mt-1"
                    >
                      {lang === 'vi' ? 'Xem Thử Phiếu Bác Sĩ' : 'Preview Doctor Card'}
                    </Button>
                  </div>

                  {/* Action 3: Đưa Vào Smart Route Cấp Cứu */}
                  <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2 hover:border-emerald-500/30 transition-all">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                      <Navigation className="w-5 h-5" />
                    </div>
                    <h4 className="font-heading font-bold text-sm text-emerald-300">
                      {lang === 'vi' ? '3. Lộ Trình Sạch Đến BV' : '3. Clean Route to Hospital'}
                    </h4>
                    <p className="text-[11px] text-gray-400 leading-relaxed font-body">
                      {lang === 'vi'
                        ? 'Tự động tính toán đường đến bệnh viện gần nhất, né tránh các điểm nóng ô nhiễm và kẹt xe khói bụi.'
                        : 'Routes to the nearest hospital while avoiding pollution hotspots and smoke-heavy congestion.'}
                    </p>
                    <Button
                      size="sm"
                      onClick={() => {
                        if (nearestHospital) {
                          navigate(`/smart-route?destLat=${nearestHospital.lat}&destLng=${nearestHospital.lng}&destName=${encodeURIComponent(nearestHospital.name)}`);
                        } else {
                          navigate('/smart-route');
                        }
                      }}
                      className="w-full h-8 text-xs font-heading bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border border-emerald-500/40 rounded-xl mt-1"
                    >
                      {lang === 'vi' ? 'Tới BV Gần Nhất' : 'Route to Nearest Hospital'}
                    </Button>
                  </div>
                </div>
              </div>

            </div>

        </div>
      </div>
    </div>
  );
}
