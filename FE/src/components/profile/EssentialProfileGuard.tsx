import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle,
  User,
  Phone,
  Calendar,
  HeartPulse,
  MapPin,
  X,
  Loader2,
  Sparkles,
  Save,
  Navigation,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { profilesApi, preferencesApi, locationsApi } from '@/integrations/api';
import { checkEssentialProfile, type EssentialProfileStatus } from '@/lib/profile-completion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useGeolocation } from '@/hooks/use-geolocation';

interface EssentialProfileGuardProps {
  lang: 'vi' | 'en';
}

export default function EssentialProfileGuard({ lang }: EssentialProfileGuardProps) {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Geolocation integration
  const { location: gpsLoc, requestLocation } = useGeolocation();

  const [profile, setProfile] = useState<any>(null);
  const [preferences, setPreferences] = useState<any>(null);
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [dismissedBanner, setDismissedBanner] = useState(false);

  // Quick Inline Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('');
  const [selectedHealthTier, setSelectedHealthTier] = useState<string[]>(['self']);
  const [homeLocationLabel, setHomeLocationLabel] = useState('');
  const [homeLat, setHomeLat] = useState<number>(21.0285);
  const [homeLng, setHomeLng] = useState<number>(105.8542);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
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

      if (p?.display_name) setName(p.display_name);
      if (p?.phone) setPhone(p.phone);
      if (p?.date_of_birth) setDob(String(p.date_of_birth).slice(0, 10));
      if (pref?.health_tier) setSelectedHealthTier(pref.health_tier);
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  if (loading || !user) return null;

  const status: EssentialProfileStatus = checkEssentialProfile(profile, preferences, locations);

  // If already complete, do not render anything
  if (status.isComplete) return null;

  const handleUseCurrentLocation = async () => {
    requestLocation();
    if (gpsLoc?.label) {
      setHomeLocationLabel(gpsLoc.label);
    } else if (gpsLoc?.lat && gpsLoc?.lng) {
      setHomeLocationLabel(`Vị trí GPS (${gpsLoc.lat.toFixed(4)}, ${gpsLoc.lng.toFixed(4)})`);
    } else {
      setHomeLocationLabel('Vị trí GPS hiện tại (Hà Nội)');
    }
    if (gpsLoc?.lat) setHomeLat(gpsLoc.lat);
    if (gpsLoc?.lng) setHomeLng(gpsLoc.lng);

    toast.success(lang === 'vi' ? 'Đã lấy vị trí GPS hiện tại!' : 'Acquired current GPS location!');
  };

  const handleQuickSave = async () => {
    if (!name.trim()) return toast.error(lang === 'vi' ? 'Vui lòng điền Họ tên' : 'Please enter your Name');
    if (!phone.trim()) return toast.error(lang === 'vi' ? 'Vui lòng điền Số điện thoại' : 'Please enter your Phone');
    if (!dob.trim()) return toast.error(lang === 'vi' ? 'Vui lòng chọn Ngày sinh' : 'Please select Date of Birth');

    setSaving(true);
    try {
      // 1. Save profile name, phone & DOB
      await profilesApi.update({
        display_name: name.trim(),
        phone: phone.trim(),
        date_of_birth: dob || undefined,
      });

      // 2. Save health tier preferences
      await preferencesApi.upsert({
        ...(preferences || {}),
        health_tier: selectedHealthTier,
      });

      // 3. Save Home location if provided
      if (homeLocationLabel.trim() && locations.length === 0) {
        await locationsApi.upsert({
          location_type: 'home',
          label: homeLocationLabel.trim(),
          lat: homeLat,
          lng: homeLng,
        });
      }

      toast.success(lang === 'vi' ? 'Đã hoàn tất thông tin thiết yếu!' : 'Essential profile updated!');
      setShowModal(false);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi lưu thông tin');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {/* Sticky Top/Bottom Reminder Banner */}
      {!dismissedBanner && !showModal && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-500/10 dark:bg-amber-500/20 border-b border-amber-500/30 px-4 py-2.5 flex items-center justify-between gap-3 text-xs z-30"
        >
          <div className="flex items-center gap-2 font-body text-amber-900 dark:text-amber-200">
            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
            <span>
              {lang === 'vi'
                ? `Tài khoản của bạn còn thiếu ${status.missingFields.length} thông tin quan trọng (${status.score}% hoàn thiện).`
                : `Your profile is missing ${status.missingFields.length} essential fields (${status.score}% complete).`}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowModal(true)}
              className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-heading font-bold text-[11px] shadow-2xs transition-all flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3" />
              {lang === 'vi' ? 'Bổ sung ngay (30s)' : 'Fill Now (30s)'}
            </button>
            <button
              onClick={() => setDismissedBanner(true)}
              className="p-1 text-muted-foreground hover:text-foreground transition-colors"
              title={lang === 'vi' ? 'Bỏ qua' : 'Dismiss'}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>
      )}

      {/* Quick Completion Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-xl p-6 space-y-5 relative"
            >
              <button
                onClick={() => setShowModal(false)}
                className="absolute top-4 right-4 p-1 text-muted-foreground hover:text-foreground rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <HeartPulse className="w-5 h-5 text-primary" />
                  <h3 className="font-heading text-lg font-bold text-foreground">
                    {lang === 'vi' ? 'Bổ sung thông tin thiết yếu' : 'Complete Essential Profile'}
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground">
                  {lang === 'vi'
                    ? 'Nhập các thông tin quan trọng giúp AirWeave cá nhân hóa ngưỡng cảnh báo AQI và liên hệ SOS khi cần.'
                    : 'Enter key information to help AirWeave personalize AQI alerts and emergency SOS contacts.'}
                </p>
              </div>

              {/* Progress bar */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs font-heading font-semibold">
                  <span>{lang === 'vi' ? 'Tiến độ hoàn thiện' : 'Completion Rate'}</span>
                  <span className="text-primary">{status.score}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-primary h-full rounded-full transition-all duration-500"
                    style={{ width: `${status.score}%` }}
                  />
                </div>
              </div>

              {/* Form Fields */}
              <div className="space-y-3 pt-2 max-h-[60vh] overflow-y-auto pr-1">
                {/* Field 1: Name */}
                <div className="space-y-1">
                  <label className="text-xs font-heading font-semibold text-foreground flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-primary" />
                    {lang === 'vi' ? 'Họ và tên *' : 'Full Name *'}
                  </label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={lang === 'vi' ? 'Nhập họ và tên của bạn' : 'Enter your full name'}
                  />
                </div>

                {/* Field 2: Phone */}
                <div className="space-y-1">
                  <label className="text-xs font-heading font-semibold text-foreground flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-primary" />
                    {lang === 'vi' ? 'Số điện thoại *' : 'Phone Number *'}
                  </label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder={lang === 'vi' ? 'Nhập số điện thoại liên hệ' : 'Enter phone number'}
                    type="tel"
                  />
                </div>

                {/* Field 3: Date of Birth */}
                <div className="space-y-1">
                  <label className="text-xs font-heading font-semibold text-foreground flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-primary" />
                    {lang === 'vi' ? 'Ngày sinh *' : 'Date of Birth *'}
                  </label>
                  <Input
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    type="date"
                  />
                </div>

                {/* Field 4: Health Condition */}
                <div className="space-y-1.5">
                  <label className="text-xs font-heading font-semibold text-foreground flex items-center gap-1.5">
                    <HeartPulse className="w-3.5 h-3.5 text-primary" />
                    {lang === 'vi' ? 'Tình trạng sức khỏe / Đối tượng nhạy cảm *' : 'Health Group / Sensitivity *'}
                  </label>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {[
                      { key: 'self', labelVi: 'Bản thân', labelEn: 'General Self' },
                      { key: 'respiratory', labelVi: 'Bệnh hô hấp (Hen/Viêm mũi)', labelEn: 'Respiratory Illness' },
                      { key: 'elderly', labelVi: 'Người lớn tuổi', labelEn: 'Elderly' },
                      { key: 'children', labelVi: 'Nhà có con nhỏ', labelEn: 'Children' },
                    ].map((item) => {
                      const active = selectedHealthTier.includes(item.key);
                      return (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => {
                            if (active) {
                              if (selectedHealthTier.length > 1) {
                                setSelectedHealthTier((prev) => prev.filter((k) => k !== item.key));
                              }
                            } else {
                              setSelectedHealthTier((prev) => [...prev, item.key]);
                            }
                          }}
                          className={`p-2.5 rounded-xl border text-left font-medium transition-all ${
                            active
                              ? 'border-primary bg-primary/10 text-primary font-bold shadow-2xs'
                              : 'border-border bg-muted/30 text-muted-foreground hover:border-border'
                          }`}
                        >
                          {lang === 'vi' ? item.labelVi : item.labelEn}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Field 5: Location with Get GPS Button */}
                {locations.length === 0 && (
                  <div className="space-y-1 pt-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-heading font-semibold text-foreground flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-primary" />
                        {lang === 'vi' ? 'Địa điểm Nhà chính *' : 'Primary Home Location *'}
                      </label>
                      <button
                        type="button"
                        onClick={handleUseCurrentLocation}
                        className="text-[11px] text-primary hover:underline font-heading font-semibold flex items-center gap-1"
                      >
                        <Navigation className="w-3 h-3" />
                        {lang === 'vi' ? 'Lấy vị trí hiện tại' : 'Get Current GPS'}
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        value={homeLocationLabel}
                        onChange={(e) => setHomeLocationLabel(e.target.value)}
                        placeholder={lang === 'vi' ? 'VD: 123 Nguyễn Trãi, Thanh Xuân, Hà Nội' : 'e.g. 123 Nguyen Trai, Hanoi'}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleUseCurrentLocation}
                        className="shrink-0 font-heading text-xs gap-1"
                        title={lang === 'vi' ? 'Tự động nhập GPS hiện tại' : 'Use Current GPS'}
                      >
                        <Navigation className="w-3.5 h-3.5 text-primary" />
                        <span className="hidden sm:inline">{lang === 'vi' ? 'Lấy GPS' : 'Get GPS'}</span>
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between gap-3 pt-3 border-t border-border/60">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    navigate('/health-profile');
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground font-heading font-semibold flex items-center gap-1"
                >
                  {lang === 'vi' ? 'Mở trang Hồ sơ chi tiết' : 'Go to Full Profile'}
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>

                <Button
                  onClick={handleQuickSave}
                  disabled={saving}
                  className="font-heading text-xs font-bold gap-1.5"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  {lang === 'vi' ? 'Lưu thông tin' : 'Save Profile'}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
