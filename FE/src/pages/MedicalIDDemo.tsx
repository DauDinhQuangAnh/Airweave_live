import { useEffect, useState } from 'react';
import { Heart, MapPin, Phone, Pill, AlertTriangle, Wind, ArrowLeft, Sparkles, CheckCircle2, Save, Loader2, QrCode } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLiveAirContext } from '@/contexts/live-air-context';
import { trackBehavior } from '@/lib/behavior-analytics';
import { useAppLang } from '@/hooks/use-app-lang';
import { profilesApi, preferencesApi, medicalApi } from '@/integrations/api';
import { toast } from 'sonner';

export default function MedicalIDDemo({ lang: propLang }: { lang?: 'vi' | 'en' }) {
  const contextLang = useAppLang();
  const lang = propLang || contextLang;
  const navigate = useNavigate();

  const [realProfile, setRealProfile] = useState<any>(null);
  const [realPrefs, setRealPrefs] = useState<any>(null);
  const [realMedical, setRealMedical] = useState<any>(null);

  // Quick essential form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('');
  const [healthTier, setHealthTier] = useState<string[]>(['self']);
  const [saving, setSaving] = useState(false);

  // Safe optional context — page may be opened standalone
  let aqi: number | null = null;
  let label = '—';
  try {
    const ctx = useLiveAirContext();
    aqi = ctx.weather.aqi ?? null;
    label = ctx.location.label ?? '—';
  } catch {
    /* outside provider */
  }

  const loadData = async () => {
    try {
      const [p, pref, med] = await Promise.all([
        profilesApi.me().catch(() => null),
        preferencesApi.get().catch(() => null),
        medicalApi.listProfiles().catch(() => []),
      ]);
      setRealProfile(p);
      setRealPrefs(pref);
      if (p?.display_name) setName(p.display_name);
      if (p?.phone) setPhone(p.phone);
      if (p?.date_of_birth) setDob(String(p.date_of_birth).slice(0, 10));
      if (pref?.health_tier) setHealthTier(pref.health_tier);
      if (Array.isArray(med) && med.length > 0) setRealMedical(med[0]);
    } catch {
      /* fallback */
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const isEssentialComplete = !!(realProfile?.display_name && realProfile?.phone);

  const handleQuickActivate = async () => {
    if (!name.trim()) return toast.error(lang === 'vi' ? 'Vui lòng nhập Họ và tên' : 'Please enter Full Name');
    if (!phone.trim()) return toast.error(lang === 'vi' ? 'Vui lòng nhập Số điện thoại' : 'Please enter Phone Number');
    if (!dob.trim()) return toast.error(lang === 'vi' ? 'Vui lòng chọn Ngày sinh' : 'Please select Date of Birth');

    setSaving(true);
    try {
      await profilesApi.update({
        display_name: name.trim(),
        phone: phone.trim(),
        date_of_birth: dob || undefined,
      });

      await preferencesApi.upsert({
        ...(realPrefs || {}),
        health_tier: healthTier,
      });

      toast.success(lang === 'vi' ? 'Đã kích hoạt Medical ID thành công!' : 'Medical ID activated successfully!');
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Error');
    } finally {
      setSaving(false);
    }
  };

  // Calculate age from DOB
  let userAge = '—';
  if (realProfile?.date_of_birth) {
    const birthYear = new Date(realProfile.date_of_birth).getFullYear();
    const currentYear = new Date().getFullYear();
    if (!isNaN(birthYear) && birthYear < currentYear) {
      userAge = `${currentYear - birthYear} ${lang === 'vi' ? 'tuổi' : 'yrs'}`;
    }
  }

  // Medical conditions string
  const userConditions =
    realPrefs?.health_tier && realPrefs.health_tier.length > 0
      ? realPrefs.health_tier
          .map((k: string) => {
            if (k === 'respiratory') return lang === 'vi' ? 'Bệnh hô hấp (Hen suyễn / Viêm mũi)' : 'Respiratory (Asthma / Rhinitis)';
            if (k === 'elderly') return lang === 'vi' ? 'Cao tuổi' : 'Elderly';
            if (k === 'children') return lang === 'vi' ? 'Trẻ em' : 'Child';
            return lang === 'vi' ? 'Bản thân' : 'General Self';
          })
          .join(' · ')
      : lang === 'vi'
      ? 'Hen suyễn · Nguy cơ COPD (thử nghiệm)'
      : 'Asthma · COPD risk profile (demo)';

  const displayData = {
    name: realProfile?.display_name || 'Demo User',
    age: userAge,
    condition: userConditions,
    emergency_name: realMedical?.emergency_name || (lang === 'vi' ? 'Người thân khẩn cấp' : 'Emergency Contact'),
    emergency_phone: realProfile?.phone || realMedical?.emergency_phone || '+84 000 000 000',
    allergies: lang === 'vi' ? 'Phấn hoa, Thuốc NSAID' : 'Pollen, NSAIDs',
    medications: lang === 'vi' ? 'Bình xịt Salbutamol 100mcg' : 'Salbutamol inhaler 100mcg',
    blood_type: realMedical?.blood_type || 'O+',
  };

  const [coords, setCoords] = useState<string>(lang === 'vi' ? 'Chưa chia sẻ vị trí' : 'Location not shared');
  const requestLoc = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords(`${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`),
      () => setCoords(lang === 'vi' ? 'Từ chối truy cập vị trí' : 'Permission denied'),
      { timeout: 8000 }
    );
  };

  useEffect(() => {
    document.title = lang === 'vi' ? 'Medical ID · AirWeave' : 'Medical ID · AirWeave';
    trackBehavior('medical_id_opened');
  }, [lang]);

  return (
    <div className="min-h-screen bg-background text-foreground p-4 sm:p-8">
      <div className="max-w-2xl mx-auto space-y-5">
        <Link to="/sos" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground font-heading">
          <ArrowLeft className="w-4 h-4" />
          {lang === 'vi' ? 'Quay lại SOS' : 'Back to SOS'}
        </Link>

        {/* Quick Essential Activation Form if incomplete */}
        {!isEssentialComplete && (
          <div className="rounded-2xl border-2 border-sky-500/40 bg-gradient-to-br from-[#0B1628] to-[#0F2138] p-5 text-slate-100 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-sky-400 animate-pulse" />
                <h3 className="font-heading font-extrabold text-base text-slate-50">
                  {lang === 'vi' ? 'Kích hoạt Medical ID chính thức (30s)' : 'Activate Official Medical ID (30s)'}
                </h3>
              </div>
              <span className="text-[10px] font-heading font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-sky-500/20 border border-sky-500/40 text-sky-300">
                {lang === 'vi' ? 'Chỉ nhập thông tin thiết yếu' : 'Essential info only'}
              </span>
            </div>

            <p className="text-xs text-slate-300/90 leading-relaxed">
              {lang === 'vi'
                ? 'Bạn chỉ cần điền 4 thông tin quan trọng bên dưới là có thể sinh mã Medical ID và mở khóa tính năng trợ lý Medical AI.'
                : 'Fill in 4 essential fields below to activate your Medical ID and unlock Medical AI features.'}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <label className="font-heading font-semibold text-slate-200">
                  {lang === 'vi' ? 'Họ và tên *' : 'Full Name *'}
                </label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={lang === 'vi' ? 'Nhập họ và tên' : 'Enter full name'}
                  className="bg-slate-900/60 border-slate-700 text-slate-100 placeholder:text-slate-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-heading font-semibold text-slate-200">
                  {lang === 'vi' ? 'Số điện thoại liên hệ *' : 'Phone Number *'}
                </label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={lang === 'vi' ? 'SĐT người thân khẩn cấp' : 'Emergency phone number'}
                  type="tel"
                  className="bg-slate-900/60 border-slate-700 text-slate-100 placeholder:text-slate-500"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="font-heading font-semibold text-slate-200">
                  {lang === 'vi' ? 'Ngày sinh *' : 'Date of Birth *'}
                </label>
                <Input
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  type="date"
                  className="bg-slate-900/60 border-slate-700 text-slate-100"
                />
              </div>
            </div>

            <Button
              onClick={handleQuickActivate}
              disabled={saving}
              className="w-full bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-600 hover:to-cyan-600 text-slate-950 font-heading font-bold text-xs gap-1.5 h-10"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {lang === 'vi' ? 'Kích hoạt Medical ID ngay' : 'Activate Medical ID Now'}
            </Button>
          </div>
        )}

        {/* Official Medical ID Header */}
        <div className="rounded-2xl border border-[#0ea5e9]/30 bg-gradient-to-br from-[#0a1f3d] to-[#020617] p-5 text-white shadow-xl">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-[#0ea5e9]/20 ring-2 ring-[#5EEAD4]/40 flex items-center justify-center shrink-0">
                <Heart className="w-6 h-6 text-[#5EEAD4]" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-[#5EEAD4]">
                    {isEssentialComplete
                      ? lang === 'vi'
                        ? 'HỒ SƠ Y TẾ ĐÃ KÍCH HOẠT'
                        : 'ACTIVE MEDICAL ID'
                      : lang === 'vi'
                      ? 'HỒ SƠ Y TẾ · THỬ NGHIỆM'
                      : 'MEDICAL ID · DEMO'}
                  </p>
                  {isEssentialComplete && (
                    <span className="flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-heading font-bold">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      {lang === 'vi' ? 'Sẵn sàng' : 'Active'}
                    </span>
                  )}
                </div>
                <h1 className="font-heading font-black text-2xl truncate">{displayData.name}</h1>
                <p className="text-xs text-[#CBD5E1]">
                  {lang === 'vi'
                    ? 'Hồ sơ hô hấp · sẵn sàng chia sẻ cho bác sĩ & cứu hộ SOS'
                    : 'Respiratory profile · ready for doctors & emergency SOS'}
                </p>
              </div>
            </div>

            {isEssentialComplete && (
              <Button
                onClick={() => navigate('/sos')}
                variant="outline"
                size="sm"
                className="shrink-0 font-heading text-xs gap-1.5 border-sky-400/40 bg-sky-500/10 text-sky-200 hover:bg-sky-500/20"
              >
                <QrCode className="w-3.5 h-3.5" />
                {lang === 'vi' ? 'Mở QR Bác sĩ' : 'Open Doctor QR'}
              </Button>
            )}
          </div>
        </div>

        {/* Demo notice banner if not complete */}
        {!isEssentialComplete && (
          <div className="rounded-xl border-2 border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <p>
              <strong>
                {lang === 'vi'
                  ? 'Đây là dữ liệu Medical ID xem thử (Demo).'
                  : 'This is demo Medical ID preview data.'}
              </strong>{' '}
              {lang === 'vi'
                ? 'Hãy hoàn tất 4 thông tin ở khung phía trên để bật Medical ID chính thức.'
                : 'Fill in 4 fields above to activate your official Medical ID.'}
            </p>
          </div>
        )}

        {/* Profile fields */}
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label={lang === 'vi' ? 'HỌ VÀ TÊN' : 'NAME'} value={displayData.name} />
          <Field label={lang === 'vi' ? 'TUỔI' : 'AGE'} value={displayData.age} />
          <Field label={lang === 'vi' ? 'NHÓM MÁU' : 'BLOOD TYPE'} value={displayData.blood_type} />
          <Field
            label={lang === 'vi' ? 'TÌNH TRẠNG HÔ HẤP' : 'RESPIRATORY CONDITION'}
            value={displayData.condition}
            icon={<Wind className="w-4 h-4" />}
          />
          <Field
            label={lang === 'vi' ? 'DỊ ỨNG' : 'ALLERGIES'}
            value={displayData.allergies}
            icon={<AlertTriangle className="w-4 h-4" />}
          />
          <Field
            label={lang === 'vi' ? 'THUỐC ĐANG DÙNG' : 'MEDICATIONS'}
            value={displayData.medications}
            icon={<Pill className="w-4 h-4" />}
          />
          <Field
            label={lang === 'vi' ? 'LIÊN HỆ KHẨN CẤP' : 'EMERGENCY CONTACT'}
            value={`${displayData.emergency_name} · ${displayData.emergency_phone}`}
            icon={<Phone className="w-4 h-4" />}
          />
        </div>

        {/* Live context */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-2">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold font-heading">
            {lang === 'vi' ? 'BỐI CẢNH THỜI GIAN THỰC' : 'LIVE CONTEXT'}
          </p>
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 font-heading">
              <Wind className="w-4 h-4 text-[#0ea5e9]" />
              {lang === 'vi' ? 'AQI hiện tại' : 'Current AQI'}
            </span>
            <span className="font-mono font-bold">{aqi ?? '—'}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 font-heading">
              <MapPin className="w-4 h-4 text-[#0ea5e9]" />
              {lang === 'vi' ? 'Vị trí hiện tại' : 'Location'}
            </span>
            <span className="text-right truncate max-w-[60%]">{label}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 font-heading">
              <MapPin className="w-4 h-4 text-[#5EEAD4]" /> GPS
            </span>
            <span className="font-mono text-xs">{coords}</span>
          </div>
          <Button size="sm" variant="outline" onClick={requestLoc} className="w-full mt-2 font-heading">
            {lang === 'vi' ? 'Chia sẻ vị trí GPS khẩn cấp' : 'Share GPS location'}
          </Button>
        </div>

        <p className="text-[11px] text-muted-foreground text-center">
          {lang === 'vi'
            ? 'Dữ liệu y tế được bảo mật trên thiết bị và chỉ hiển thị khi bạn kích hoạt SOS hoặc mở mã QR Bác sĩ.'
            : 'Medical data is encrypted on device and revealed only upon SOS activation or Doctor QR creation.'}
        </p>
      </div>
    </div>
  );
}

function Field({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1 flex items-center gap-1.5 font-heading">
        {icon}
        {label}
      </p>
      <p className="text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}
