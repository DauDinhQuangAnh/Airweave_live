import { useState, useEffect, useRef } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  User,
  MapPin,
  Loader2,
  Save,
  Home,
  Briefcase,
  GraduationCap,
  Trash2,
  Camera,
  Stethoscope,
  CheckCircle2,
  AlertCircle,
  HeartPulse,
  Navigation,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/use-auth';
import { useAppLang } from '@/hooks/use-app-lang';
import { profilesApi, preferencesApi, locationsApi } from '@/integrations/api';
import { toast } from 'sonner';
import ThematicWatermark from '@/components/ThematicWatermark';
import HealthAlertSettings from '@/components/profile/HealthAlertSettings';
import PrivacyConsentCard from '@/components/PrivacyConsentCard';
import PrivacyStatusBadges from '@/components/PrivacyStatusBadges';
import { checkEssentialProfile, type EssentialProfileStatus } from '@/lib/profile-completion';
import { useGeolocation } from '@/hooks/use-geolocation';

const locationTypes = [
  { value: 'home', labelVi: 'Nhà', labelEn: 'Home', icon: <Home className="w-4 h-4" /> },
  { value: 'work', labelVi: 'Công ty', labelEn: 'Work', icon: <Briefcase className="w-4 h-4" /> },
  { value: 'school', labelVi: 'Trường', labelEn: 'School', icon: <GraduationCap className="w-4 h-4" /> },
];

const HEALTH_TIER_OPTIONS = [
  { key: 'self', labelVi: 'Bản thân (Mặc định)', labelEn: 'General Self' },
  { key: 'respiratory', labelVi: 'Bệnh hô hấp (Hen, Viêm mũi)', labelEn: 'Respiratory Illness' },
  { key: 'elderly', labelVi: 'Người lớn tuổi trong nhà', labelEn: 'Elderly Household' },
  { key: 'children', labelVi: 'Nhà có con nhỏ', labelEn: 'Children Household' },
];

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } };
const fadeSlide = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

const Profile = () => {
  const { user, loading } = useAuth();
  const lang = useAppLang();
  const navigate = useNavigate();

  const { location: gpsLoc, requestLocation } = useGeolocation();

  const [profile, setProfile] = useState<any>(null);
  const [preferences, setPreferences] = useState<any>(null);
  const [locations, setLocations] = useState<any[]>([]);
  const [newLocation, setNewLocation] = useState({ type: '', label: '', lat: '', lng: '' });
  const [savingLocation, setSavingLocation] = useState(false);
  const [savingPreferences, setSavingPreferences] = useState(false);

  // Editable health preferences
  const [selectedHealthTiers, setSelectedHealthTiers] = useState<string[]>(['self']);

  const loadAll = async () => {
    if (!user) return;
    try {
      const [p, pref, loc] = await Promise.all([
        profilesApi.me().catch(() => null),
        preferencesApi.get().catch(() => null),
        locationsApi.list().catch(() => []),
      ]);
      setProfile(p);
      setPreferences(pref);
      setLocations(loc || []);
      if (pref?.health_tier) setSelectedHealthTiers(pref.health_tier);
    } catch (err: any) {
      toast.error(err.message || (lang === 'vi' ? 'Lỗi tải dữ liệu' : 'Failed to load data'));
    }
  };

  useEffect(() => {
    loadAll();
  }, [user]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!user) return <Navigate to="/auth" replace />;

  const status: EssentialProfileStatus = checkEssentialProfile(profile, preferences, locations);

  const handleUseGPSForLocation = () => {
    requestLocation();
    let label = lang === 'vi' ? 'Vị trí GPS hiện tại (Hà Nội)' : 'Current GPS location (Hanoi)';
    let latVal = 21.0285;
    let lngVal = 105.8542;

    if (gpsLoc?.label) {
      label = gpsLoc.label;
    } else if (gpsLoc?.lat && gpsLoc?.lng) {
      label = `GPS (${gpsLoc.lat.toFixed(4)}, ${gpsLoc.lng.toFixed(4)})`;
    }

    if (gpsLoc?.lat) latVal = gpsLoc.lat;
    if (gpsLoc?.lng) lngVal = gpsLoc.lng;

    setNewLocation((prev) => ({
      ...prev,
      type: prev.type || 'home',
      label,
      lat: String(latVal),
      lng: String(lngVal),
    }));

    toast.success(lang === 'vi' ? 'Đã lấy vị trí GPS!' : 'Acquired current GPS!');
  };

  const handleSaveLocation = async () => {
    if (!newLocation.type || !newLocation.label) return;
    setSavingLocation(true);
    try {
      const lat = parseFloat(newLocation.lat) || 21.0285;
      const lng = parseFloat(newLocation.lng) || 105.8542;
      await locationsApi.upsert({
        location_type: newLocation.type as 'home' | 'work' | 'school',
        label: newLocation.label,
        lat,
        lng,
      });
      toast.success(lang === 'vi' ? 'Đã lưu địa điểm mới!' : 'New location saved!');
      setLocations(await locationsApi.list());
      setNewLocation({ type: '', label: '', lat: '', lng: '' });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSavingLocation(false);
    }
  };

  const handleDeleteLocation = async (id: string) => {
    await locationsApi.remove(id);
    setLocations((prev) => prev.filter((l) => l.id !== id));
    toast.success(lang === 'vi' ? 'Đã xóa địa điểm' : 'Location deleted');
  };

  const handleSaveHealthTier = async () => {
    setSavingPreferences(true);
    try {
      await preferencesApi.upsert({
        ...(preferences || {}),
        health_tier: selectedHealthTiers,
      });
      setPreferences((prev: any) => ({ ...(prev || {}), health_tier: selectedHealthTiers }));
      toast.success(lang === 'vi' ? 'Đã lưu thông tin sức khỏe cá nhân!' : 'Health preferences saved!');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSavingPreferences(false);
    }
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <ThematicWatermark variant="minimal" />

      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="max-w-4xl mx-auto px-4 py-8 space-y-6 relative z-10"
      >
        {/* Header */}
        <motion.div variants={fadeSlide} className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-2xl font-black text-foreground">
              {lang === 'vi' ? 'Hồ sơ cá nhân & Sức khỏe' : 'Personal & Health Profile'}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {lang === 'vi'
                ? 'Quản lý thông tin tài khoản, nhóm nhạy cảm AQI và danh sách địa điểm thường tới'
                : 'Manage account info, AQI sensitive group, and saved primary locations'}
            </p>
          </div>
        </motion.div>

        {/* Profile Completeness Card */}
        <motion.div
          variants={fadeSlide}
          className={`rounded-2xl border p-5 shadow-xs transition-all ${
            status.isComplete
              ? 'border-emerald-500/30 bg-emerald-500/5'
              : 'border-amber-500/40 bg-amber-500/10 dark:bg-amber-500/15'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                {status.isComplete ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-amber-500 animate-pulse" />
                )}
                <h2 className="font-heading text-lg font-extrabold text-foreground">
                  {status.isComplete
                    ? lang === 'vi'
                      ? 'Hồ sơ đã hoàn thành 100%'
                      : 'Profile 100% Complete'
                    : lang === 'vi'
                    ? `Độ hoàn thiện hồ sơ: ${status.score}%`
                    : `Profile Completeness: ${status.score}%`}
                </h2>
              </div>
              <p className="text-xs text-muted-foreground">
                {status.isComplete
                  ? lang === 'vi'
                    ? 'Tài khoản của bạn đã đầy đủ các thông tin thiết yếu để cá nhân hóa cảnh báo AQI.'
                    : 'Your profile has all essential fields for personalized AQI alerts.'
                  : lang === 'vi'
                  ? `Còn thiếu ${status.missingFields.length} thông tin quan trọng: ${status.missingFields
                      .map((f) => f.labelVi)
                      .join(', ')}.`
                  : `Missing ${status.missingFields.length} essential fields: ${status.missingFields
                      .map((f) => f.labelEn)
                      .join(', ')}.`}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative w-14 h-14 shrink-0 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-muted/40 stroke-current"
                    strokeWidth="4"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className={`${status.isComplete ? 'text-emerald-500' : 'text-amber-500'} stroke-current transition-all duration-700`}
                    strokeDasharray={`${status.score}, 100`}
                    strokeWidth="4"
                    strokeLinecap="round"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <span className="absolute text-xs font-heading font-bold">{status.score}%</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Section 1: Account Information */}
        <motion.section variants={fadeSlide} className="rounded-2xl border border-border bg-card p-6 shadow-xs">
          <div className="flex items-center gap-3 mb-4">
            <User className="w-5 h-5 text-primary" />
            <h2 className="font-heading text-base font-bold text-foreground">
              {lang === 'vi' ? 'Thông tin tài khoản thiết yếu' : 'Essential Account Information'}
            </h2>
          </div>
          <ProfileEditor user={user} profile={profile} onUpdated={setProfile} lang={lang} />
        </motion.section>

        {/* Section 2: Health Profile & Sensitivity */}
        <motion.section variants={fadeSlide} className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <HeartPulse className="w-5 h-5 text-primary" />
              <h2 className="font-heading text-base font-bold text-foreground">
                {lang === 'vi' ? 'Sức khỏe & Nhóm nhạy cảm AQI' : 'Health & AQI Sensitivity Group'}
              </h2>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="font-heading text-xs gap-1.5"
              onClick={() => navigate('/sos')}
            >
              <Stethoscope className="w-3.5 h-3.5" />
              {lang === 'vi' ? 'Mở Medical ID (SOS)' : 'Open Medical ID (SOS)'}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            {lang === 'vi'
              ? 'AirWeave điều chỉnh ngưỡng cảnh báo ô nhiễm (ví dụ: cảnh báo sớm hơn 30 AQI cho bệnh hô hấp/người già).'
              : 'AirWeave adjusts air pollution alert thresholds (e.g. 30 AQI earlier alerts for respiratory/elderly users).'}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            {HEALTH_TIER_OPTIONS.map((opt) => {
              const active = selectedHealthTiers.includes(opt.key);
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => {
                    if (active) {
                      if (selectedHealthTiers.length > 1) {
                        setSelectedHealthTiers((prev) => prev.filter((k) => k !== opt.key));
                      }
                    } else {
                      setSelectedHealthTiers((prev) => [...prev, opt.key]);
                    }
                  }}
                  className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                    active
                      ? 'border-primary bg-primary/10 text-primary font-heading font-bold shadow-2xs'
                      : 'border-border bg-muted/20 text-muted-foreground hover:border-border'
                  }`}
                >
                  <span className="text-xs">{lang === 'vi' ? opt.labelVi : opt.labelEn}</span>
                  {active && <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />}
                </button>
              );
            })}
          </div>

          <Button
            onClick={handleSaveHealthTier}
            disabled={savingPreferences}
            className="font-heading text-xs font-semibold gap-1.5"
          >
            {savingPreferences ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {lang === 'vi' ? 'Lưu cài đặt sức khỏe' : 'Save Health Settings'}
          </Button>
        </motion.section>

        {/* Section 3: Saved Locations */}
        <motion.section variants={fadeSlide} className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-3">
            <MapPin className="w-5 h-5 text-primary" />
            <h2 className="font-heading text-base font-bold text-foreground">
              {lang === 'vi' ? 'Địa điểm di chuyển thường xuyên' : 'Primary Saved Locations'}
            </h2>
          </div>

          {locations.length > 0 ? (
            <div className="space-y-2">
              {locations.map((loc) => {
                const typeObj = locationTypes.find((t) => t.value === loc.location_type);
                return (
                  <div key={loc.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border/50">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                      {typeObj?.icon || <MapPin className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] text-muted-foreground font-heading uppercase font-bold tracking-wider">
                        {typeObj ? (lang === 'vi' ? typeObj.labelVi : typeObj.labelEn) : loc.location_type}
                      </span>
                      <p className="text-sm font-heading font-semibold text-foreground truncate">{loc.label}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteLocation(loc.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5 font-medium">
              <AlertCircle className="w-4 h-4" />
              {lang === 'vi'
                ? 'Bạn chưa lưu địa điểm chính nào (Nhà / Công ty / Trường học).'
                : 'No primary locations saved yet (Home / Work / School).'}
            </p>
          )}

          {locations.length < 3 && (
            <div className="space-y-3 pt-2 border-t border-border/50">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground font-body">
                  {lang === 'vi' ? 'Thêm địa điểm mới (tối đa 3)' : 'Add new location (max 3)'}
                </p>
                <button
                  type="button"
                  onClick={handleUseGPSForLocation}
                  className="text-xs text-primary hover:underline font-heading font-semibold flex items-center gap-1"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  {lang === 'vi' ? 'Lấy vị trí GPS hiện tại' : 'Get Current GPS'}
                </button>
              </div>

              <div className="flex gap-2 flex-wrap">
                {locationTypes
                  .filter((t) => !locations.find((l) => l.location_type === t.value))
                  .map((t) => (
                    <button
                      key={t.value}
                      onClick={() => setNewLocation((prev) => ({ ...prev, type: t.value }))}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-heading font-semibold border transition-colors ${
                        newLocation.type === t.value
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border text-muted-foreground hover:border-primary/30'
                      }`}
                    >
                      {t.icon} {lang === 'vi' ? t.labelVi : t.labelEn}
                    </button>
                  ))}
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder={lang === 'vi' ? 'Nhập địa chỉ (VD: 123 Nguyễn Trãi, Thanh Xuân, Hà Nội)' : 'Enter address (e.g. 123 Nguyen Trai, Hanoi)'}
                  value={newLocation.label}
                  onChange={(e) => setNewLocation((prev) => ({ ...prev, label: e.target.value }))}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleUseGPSForLocation}
                  className="shrink-0 font-heading text-xs gap-1.5"
                  title={lang === 'vi' ? 'Điền tự động vị trí GPS hiện tại' : 'Auto fill current GPS'}
                >
                  <Navigation className="w-3.5 h-3.5 text-primary" />
                  <span className="hidden sm:inline">{lang === 'vi' ? 'Lấy GPS' : 'Get GPS'}</span>
                </Button>
              </div>

              <Button
                size="sm"
                onClick={handleSaveLocation}
                disabled={!newLocation.type || !newLocation.label || savingLocation}
                className="font-heading text-xs gap-1.5"
              >
                {savingLocation ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                {lang === 'vi' ? 'Lưu địa điểm' : 'Save Location'}
              </Button>
            </div>
          )}
        </motion.section>

        {/* Section 4: Privacy & Health Alert Settings */}
        <motion.div variants={fadeSlide}>
          <HealthAlertSettings />
        </motion.div>

        <motion.section variants={fadeSlide} className="rounded-2xl border border-border bg-card p-5 space-y-3">
          <h2 className="font-heading text-sm font-bold text-foreground">
            {lang === 'vi' ? 'Trạng thái quyền riêng tư' : 'Privacy & Consent Badges'}
          </h2>
          <PrivacyStatusBadges lang={lang} />
        </motion.section>

        <motion.div variants={fadeSlide}>
          <PrivacyConsentCard lang={lang} />
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Profile;

interface ProfileEditorProps {
  user: any;
  profile: any;
  onUpdated: (p: any) => void;
  lang: 'vi' | 'en';
}

function ProfileEditor({ user, profile, onUpdated, lang }: ProfileEditorProps) {
  const [name, setName] = useState(profile?.display_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [dob, setDob] = useState(profile?.date_of_birth || '');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile?.avatar_url || null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setName(profile?.display_name || '');
    setPhone(profile?.phone || '');
    setDob(profile?.date_of_birth || '');
    setAvatarUrl(profile?.avatar_url || null);
  }, [profile]);

  const initial = (name || user?.email || '?').charAt(0).toUpperCase();

  const handleAvatarPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) return toast.error(lang === 'vi' ? 'Ảnh tối đa 3MB' : 'Max image size 3MB');
    setUploading(true);
    try {
      const { avatar_url } = await profilesApi.uploadAvatar(file);
      setAvatarUrl(avatar_url);
      onUpdated({ ...(profile || {}), avatar_url });
      toast.success(lang === 'vi' ? 'Đã cập nhật ảnh đại diện' : 'Avatar updated');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await profilesApi.update({
        display_name: name || null,
        phone: phone || null,
        date_of_birth: dob || undefined,
      });
      onUpdated({ ...(profile || {}), display_name: name, phone, date_of_birth: dob });
      toast.success(lang === 'vi' ? 'Đã lưu thông tin tài khoản!' : 'Account info saved!');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative">
          <div className="w-20 h-20 rounded-full overflow-hidden ring-2 ring-border bg-gradient-to-br from-primary to-primary/70 text-primary-foreground flex items-center justify-center font-heading font-bold text-2xl">
            {avatarUrl ? <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" /> : <span>{initial}</span>}
          </div>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:scale-105 transition-transform disabled:opacity-60"
            aria-label={lang === 'vi' ? 'Đổi ảnh' : 'Change avatar'}
          >
            {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarPick} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] text-muted-foreground font-heading uppercase tracking-wider">
            {lang === 'vi' ? 'Email đăng nhập' : 'Login Email'}
          </p>
          <p className="text-sm font-heading font-semibold truncate text-foreground">{user.email}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-[11px] text-muted-foreground font-heading uppercase tracking-wider">
            {lang === 'vi' ? 'Họ và tên' : 'Full Name'} <span className="text-destructive">*</span>
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={lang === 'vi' ? 'VD: Nguyễn Văn A' : 'e.g. John Doe'}
          />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] text-muted-foreground font-heading uppercase tracking-wider">
            {lang === 'vi' ? 'Số điện thoại' : 'Phone Number'} <span className="text-destructive">*</span>
          </label>
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={lang === 'vi' ? 'VD: 0901 234 567' : 'e.g. +84 901 234 567'}
            type="tel"
          />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <label className="text-[11px] text-muted-foreground font-heading uppercase tracking-wider">
            {lang === 'vi' ? 'Ngày sinh' : 'Date of Birth'} <span className="text-destructive">*</span>
          </label>
          <Input value={dob} onChange={(e) => setDob(e.target.value)} type="date" />
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving} className="font-heading text-xs font-bold gap-1.5 w-full sm:w-auto">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {lang === 'vi' ? 'Lưu thông tin cá nhân' : 'Save Personal Info'}
      </Button>
    </div>
  );
}
