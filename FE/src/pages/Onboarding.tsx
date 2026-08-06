import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, Heart, Clock, Car, Activity, Route, Bell, Check, Loader2, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { preferencesApi, profilesApi } from '@/integrations/api';
import { toast } from 'sonner';
import { trackBehavior } from '@/lib/behavior-analytics';
import { setConsent as setPrivacyConsent } from '@/lib/privacy-consent';

interface Option {
  value: string;
  labelVi: string;
  labelEn: string;
  emoji: string;
  hintVi?: string;
  hintEn?: string;
}

interface Question {
  id: string;
  icon: React.ReactNode;
  sectionVi: string;
  sectionEn: string;
  titleVi: string;
  titleEn: string;
  subtitleVi: string;
  subtitleEn: string;
  multi?: boolean;
  options: Option[];
}

const questions: Question[] = [
  // Phần 1: Phương tiện & Thói quen
  {
    id: 'commute_type',
    sectionVi: 'Phương tiện & Thói quen',
    sectionEn: 'Commute & Habits',
    icon: <Car className="w-6 h-6" />,
    titleVi: 'Phương tiện di chuyển của bạn?',
    titleEn: 'Your primary mode of transport?',
    subtitleVi: 'Chọn tất cả phương tiện bạn thường dùng',
    subtitleEn: 'Select all modes of transport you use',
    multi: true,
    options: [
      { value: 'motorbike', labelVi: 'Xe máy / Xe đạp', labelEn: 'Motorbike / Bicycle', emoji: '🏍️', hintVi: 'Tiếp xúc trực tiếp', hintEn: 'Direct air exposure' },
      { value: 'walk_bike', labelVi: 'Đi bộ', labelEn: 'Walking', emoji: '🚶', hintVi: 'Tiếp xúc trực tiếp, vận động mạnh', hintEn: 'High exertion & exposure' },
      { value: 'car', labelVi: 'Ô tô / Xe buýt', labelEn: 'Car / Bus', emoji: '🚗', hintVi: 'Có hệ thống lọc không khí', hintEn: 'Air filtered environment' },
    ],
  },
  {
    id: 'active_hours',
    sectionVi: 'Phương tiện & Thói quen',
    sectionEn: 'Commute & Habits',
    icon: <Clock className="w-6 h-6" />,
    titleVi: 'Bạn thường ra đường khi nào?',
    titleEn: 'When do you usually travel?',
    subtitleVi: 'Chọn tất cả khung giờ bạn hay ra đường',
    subtitleEn: 'Select all peak commuting hours',
    multi: true,
    options: [
      { value: 'morning_rush', labelVi: 'Cao điểm sáng (6h - 9h)', labelEn: 'Morning rush (6 AM - 9 AM)', emoji: '🌅' },
      { value: 'evening_rush', labelVi: 'Cao điểm chiều (16h - 19h)', labelEn: 'Evening rush (4 PM - 7 PM)', emoji: '🌆' },
      { value: 'scattered', labelVi: 'Rải rác trong ngày', labelEn: 'Scattered throughout day', emoji: '🕐' },
    ],
  },
  // Phần 2: Hồ sơ Sức khỏe
  {
    id: 'health_tier',
    sectionVi: 'Hồ sơ Sức khỏe',
    sectionEn: 'Health Profile',
    icon: <Heart className="w-6 h-6" />,
    titleVi: 'Bạn quản lý sức khỏe cho ai?',
    titleEn: 'Who are you managing health for?',
    subtitleVi: 'Có thể chọn nhiều đối tượng',
    subtitleEn: 'Can select multiple options',
    multi: true,
    options: [
      { value: 'children', labelVi: 'Trẻ em (dưới 5 tuổi)', labelEn: 'Young children (<5 years)', emoji: '👶' },
      { value: 'elderly', labelVi: 'Người lớn tuổi (trên 60 tuổi)', labelEn: 'Elderly (>60 years)', emoji: '👴' },
      { value: 'self', labelVi: 'Bản thân, sức khỏe bình thường', labelEn: 'General self', emoji: '🧑' },
    ],
  },
  {
    id: 'medical_history',
    sectionVi: 'Hồ sơ Sức khỏe',
    sectionEn: 'Health Profile',
    icon: <Activity className="w-6 h-6" />,
    titleVi: 'Bạn thuộc nhóm nhạy cảm với ô nhiễm không?',
    titleEn: 'Any health sensitivities to air pollution?',
    subtitleVi: 'Thông tin được bảo mật, dùng để cá nhân hoá cảnh báo',
    subtitleEn: 'Kept private, used strictly for personalized alerts',
    multi: true,
    options: [
      { value: 'none', labelVi: 'Không có bệnh nền', labelEn: 'No underlying conditions', emoji: '✅' },
      { value: 'asthma', labelVi: 'Hen suyễn', labelEn: 'Asthma', emoji: '🫁' },
      { value: 'copd', labelVi: 'COPD / bệnh phổi mãn tính', labelEn: 'COPD / Chronic lung disease', emoji: '😮‍💨' },
      { value: 'cardio', labelVi: 'Tim mạch / tiền sử đột quỵ', labelEn: 'Cardiovascular history', emoji: '❤️' },
      { value: 'rhinitis', labelVi: 'Viêm mũi dị ứng / viêm xoang', labelEn: 'Allergies / Rhinitis', emoji: '🤧' },
      { value: 'eye_irritation', labelVi: 'Mắt dễ kích ứng khi AQI cao', labelEn: 'Sensitive eyes', emoji: '👁️' },
      { value: 'skin_irritation', labelVi: 'Da dễ kích ứng / nổi mẩn khi ô nhiễm', labelEn: 'Sensitive skin', emoji: '🧴' },
      { value: 'elderly_self', labelVi: 'Người cao tuổi', labelEn: 'Senior citizen', emoji: '👴' },
      { value: 'child_caregiver', labelVi: 'Trẻ nhỏ / phụ huynh theo dõi cho trẻ', labelEn: 'Child caregiver', emoji: '👶' },
      { value: 'other', labelVi: 'Khác (mô tả bên dưới)', labelEn: 'Other (describe below)', emoji: '✍️' },
      { value: 'not_sure', labelVi: 'Tôi không chắc', labelEn: 'Not sure', emoji: '🤔' },
    ],
  },
  // Phần 3: Ưu tiên cá nhân
  {
    id: 'route_priority',
    sectionVi: 'Ưu tiên cá nhân',
    sectionEn: 'Personal Preferences',
    icon: <Route className="w-6 h-6" />,
    titleVi: 'Khi tìm đường, bạn ưu tiên gì?',
    titleEn: 'Your route planning priority?',
    subtitleVi: 'Thiết lập thuật toán định tuyến thông minh',
    subtitleEn: 'Configures clean routing algorithm',
    options: [
      { value: 'speed', labelVi: 'Tốc độ', labelEn: 'Speed', emoji: '⚡', hintVi: 'Nhanh nhất, chấp nhận ô nhiễm', hintEn: 'Fastest route, pollution tolerated' },
      { value: 'balanced', labelVi: 'Cân bằng', labelEn: 'Balanced', emoji: '⚖️', hintVi: 'Đi xa thêm 5-10 phút để sạch hơn', hintEn: 'Adds 5-10m for cleaner air' },
      { value: 'health', labelVi: 'Sức khỏe tuyệt đối', labelEn: 'Pure Clean Air', emoji: '🌿', hintVi: 'Ưu tiên đường sạch dù xa hơn', hintEn: 'Cleanest path prioritized' },
    ],
  },
  {
    id: 'alert_mode',
    sectionVi: 'Ưu tiên cá nhân',
    sectionEn: 'Personal Preferences',
    icon: <Bell className="w-6 h-6" />,
    titleVi: 'Cảnh báo AQI tại Nhà / Nơi làm việc?',
    titleEn: 'Home & Work AQI alerts?',
    subtitleVi: 'Khi vượt ngưỡng an toàn',
    subtitleEn: 'When exceeding safety threshold',
    options: [
      { value: 'always', labelVi: 'Có, thông báo ngay', labelEn: 'Yes, notify immediately', emoji: '🔔' },
      { value: 'hazard_only', labelVi: 'Chỉ khi mức Nguy hại (Tím / Nâu)', labelEn: 'Hazardous levels only (Purple/Brown)', emoji: '🟣' },
    ],
  },
];

const Onboarding = () => {
  const { user, loading, onboardingCompleted, refreshOnboarding } = useAuth();
  const navigate = useNavigate();
  const [lang, setLang] = useState<'vi' | 'en'>('vi');
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [customNote, setCustomNote] = useState('');
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (onboardingCompleted) return <Navigate to="/dashboard" replace />;

  const totalSteps = questions.length + 1; // +1 consent step
  const isConsentStep = step === questions.length;
  const currentQuestion = isConsentStep ? null : questions[step];
  const currentAnswer = currentQuestion ? answers[currentQuestion.id] : undefined;
  const isLastStep = isConsentStep;
  const hasAnswer = isConsentStep
    ? true
    : currentQuestion?.multi
    ? Array.isArray(currentAnswer) && currentAnswer.length > 0
    : !!currentAnswer;

  const handleSelect = (value: string) => {
    if (!currentQuestion) return;
    setAnswers((prev) => {
      if (currentQuestion.multi) {
        const arr = Array.isArray(prev[currentQuestion.id]) ? (prev[currentQuestion.id] as string[]) : [];
        if (value === 'none') return { ...prev, [currentQuestion.id]: ['none'] };
        if (value === 'not_sure') return { ...prev, [currentQuestion.id]: ['not_sure'] };
        const filtered = arr.filter((v) => v !== 'none' && v !== 'not_sure');
        const next = filtered.includes(value) ? filtered.filter((v) => v !== value) : [...filtered, value];
        return { ...prev, [currentQuestion.id]: next };
      }
      return { ...prev, [currentQuestion.id]: value };
    });
  };

  const isSelected = (value: string) => {
    if (!currentQuestion) return false;
    if (currentQuestion.multi) {
      return Array.isArray(currentAnswer) && currentAnswer.includes(value);
    }
    return currentAnswer === value;
  };

  const handleNext = () => {
    if (!hasAnswer) return;
    if (isLastStep) handleSubmit();
    else setStep((s) => s + 1);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const healthTier = (answers.health_tier as string[]) || ['self'];
      const commuteType = (answers.commute_type as string[]) || ['motorbike'];
      const activeHours = (answers.active_hours as string[]) || ['morning_rush'];
      const rawMedical = (answers.medical_history as string[]) || [];
      const routePriority = (answers.route_priority as string) || 'balanced';
      const alertMode = (answers.alert_mode as string) || 'always';

      const notSure = rawMedical.includes('not_sure');
      const augmentedTier = [...healthTier];
      if (rawMedical.includes('elderly_self') && !augmentedTier.includes('elderly')) augmentedTier.push('elderly');
      if (rawMedical.includes('child_caregiver') && !augmentedTier.includes('children')) augmentedTier.push('children');
      const medicalHistory = rawMedical.filter((v) => v !== 'not_sure' && v !== 'elderly_self' && v !== 'child_caregiver');

      const hasRespiratory = medicalHistory.some((m) => ['asthma', 'copd'].includes(m));
      let sensitiveGroup: string = 'none';
      if (augmentedTier.includes('children')) sensitiveGroup = 'child';
      else if (hasRespiratory) sensitiveGroup = 'respiratory';
      else if (augmentedTier.includes('elderly')) sensitiveGroup = 'elderly';

      setPrivacyConsent('health_profile', true);
      setPrivacyConsent('behavior_tracking', consent);

      await Promise.all([
        preferencesApi.upsert({
          health_tier: augmentedTier,
          commute_type: commuteType,
          active_hours: activeHours,
          medical_history: medicalHistory,
          custom_sensitivity_note: customNote || undefined,
          not_sure: notSure,
          sensitive_group: sensitiveGroup,
          route_priority: routePriority,
          alert_mode: alertMode,
        }),
        profilesApi.completeOnboarding(),
      ]);

      trackBehavior('complete_onboarding', {
        healthTier: augmentedTier,
        medicalCount: medicalHistory.length,
        notSure,
        sensitiveGroup,
        commuteType,
        activeHours,
        routePriority,
        alertMode,
        consent,
      });

      await refreshOnboarding();
      toast.success(lang === 'vi' ? 'Đã hoàn tất thiết lập!' : 'Setup complete!');
      navigate('/dashboard', { replace: true });
    } catch (e: any) {
      toast.error(e?.message ?? (lang === 'vi' ? 'Có lỗi xảy ra, vui lòng thử lại' : 'An error occurred'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Top Header Controls */}
      <div className="absolute top-4 right-4 flex items-center gap-2 z-20">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setLang((l) => (l === 'vi' ? 'en' : 'vi'))}
          className="font-heading text-xs gap-1.5"
        >
          <Globe className="w-3.5 h-3.5" />
          {lang === 'vi' ? 'EN' : 'VN'}
        </Button>
      </div>

      <div className="max-w-xl mx-auto w-full">
        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between text-xs font-heading font-semibold text-muted-foreground mb-2">
            <span>
              {isConsentStep
                ? lang === 'vi'
                  ? 'Quyền riêng tư & Bảo mật'
                  : 'Privacy & Security'
                : lang === 'vi'
                ? currentQuestion?.sectionVi
                : currentQuestion?.sectionEn}
            </span>
            <span>
              {lang === 'vi' ? 'Bước' : 'Step'} {step + 1} / {totalSteps}
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
            <motion.div
              className="bg-primary h-full rounded-full"
              animate={{ width: `${((step + 1) / totalSteps) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {/* Content Card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-xs"
          >
            {isConsentStep ? (
              <div className="space-y-5">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                  <Heart className="w-6 h-6" />
                </div>
                <h2 className="font-heading text-xl sm:text-2xl font-bold text-foreground">
                  {lang === 'vi' ? 'Bảo mật & Quyền riêng tư' : 'Security & Privacy'}
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {lang === 'vi'
                    ? 'Dữ liệu sức khỏe của bạn chỉ được lưu trữ trên thiết bị và dùng để cá nhân hóa cảnh báo AQI.'
                    : 'Your health data is stored securely and used exclusively to personalize AQI notifications.'}
                </p>

                <div className="p-4 rounded-xl border border-border bg-muted/30 space-y-3">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={consent}
                      onChange={(e) => setConsent(e.target.checked)}
                      className="mt-1 rounded border-border text-primary focus:ring-primary"
                    />
                    <span className="text-xs text-foreground font-body leading-relaxed">
                      {lang === 'vi'
                        ? 'Tôi đồng ý chia sẻ dữ liệu ẩn danh để giúp cải thiện thuật toán dự báo ô nhiễm.'
                        : 'I consent to sharing anonymized metrics to help improve air pollution forecasting models.'}
                    </span>
                  </label>
                </div>
              </div>
            ) : (
              <>
                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                  {currentQuestion?.icon}
                </div>

                <h2 className="font-heading text-xl sm:text-2xl font-bold text-foreground mb-1">
                  {lang === 'vi' ? currentQuestion?.titleVi : currentQuestion?.titleEn}
                </h2>
                <p className="text-xs text-muted-foreground mb-6">
                  {lang === 'vi' ? currentQuestion?.subtitleVi : currentQuestion?.subtitleEn}
                </p>

                <div className="space-y-2.5">
                  {currentQuestion?.options.map((opt) => {
                    const selected = isSelected(opt.value);
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => handleSelect(opt.value)}
                        className={`w-full p-4 rounded-xl border text-left flex items-center justify-between transition-all ${
                          selected
                            ? 'border-primary bg-primary/10 text-primary font-heading font-bold shadow-2xs'
                            : 'border-border bg-muted/20 text-muted-foreground hover:border-border hover:bg-muted/40'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-xl shrink-0">{opt.emoji}</span>
                          <div className="min-w-0">
                            <p className="text-sm font-heading font-semibold text-foreground truncate">
                              {lang === 'vi' ? opt.labelVi : opt.labelEn}
                            </p>
                            {(opt.hintVi || opt.hintEn) && (
                              <p className="text-[11px] text-muted-foreground">
                                {lang === 'vi' ? opt.hintVi : opt.hintEn}
                              </p>
                            )}
                          </div>
                        </div>
                        {selected && <Check className="w-5 h-5 text-primary shrink-0" />}
                      </button>
                    );
                  })}
                </div>

                {currentQuestion?.id === 'medical_history' &&
                  Array.isArray(currentAnswer) &&
                  (currentAnswer as string[]).includes('other') && (
                    <div className="mt-4 p-3 rounded-xl border-2 border-primary/30 bg-primary/5 space-y-2">
                      <label className="text-xs font-heading font-semibold text-foreground">
                        {lang === 'vi'
                          ? 'Vui lòng mô tả tình trạng hoặc mức độ nhạy cảm của bạn với không khí ô nhiễm.'
                          : 'Please describe your condition or sensitivity to air pollution.'}
                      </label>
                      <textarea
                        value={customNote}
                        onChange={(e) => setCustomNote(e.target.value.slice(0, 500))}
                        placeholder={
                          lang === 'vi'
                            ? 'Ví dụ: ho kéo dài khi khói bụi, dị ứng phấn hoa kết hợp với ô nhiễm...'
                            : 'e.g. persistent cough in smoggy weather, pollen allergies...'
                        }
                        rows={3}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                      />
                      <p className="text-[10px] text-muted-foreground">
                        {lang === 'vi'
                          ? `AirWeave không chẩn đoán bệnh. Mô tả của bạn chỉ dùng để cá nhân hóa cảnh báo. ${customNote.length}/500`
                          : `AirWeave does not diagnose medical conditions. Your note is used for personalized alerts only. ${customNote.length}/500`}
                      </p>
                    </div>
                  )}

                {currentQuestion?.multi && (
                  <p className="text-[11px] text-muted-foreground font-body mt-3 text-center">
                    {lang === 'vi' ? 'Có thể chọn nhiều mục' : 'Multiple selections allowed'}
                  </p>
                )}
              </>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8">
          <div className="flex gap-1">
            <Button
              variant="ghost"
              onClick={() => setStep((s) => s - 1)}
              disabled={step === 0}
              className="gap-1 font-heading"
            >
              <ChevronLeft className="w-4 h-4" />
              {lang === 'vi' ? 'Quay lại' : 'Back'}
            </Button>
            <Button
              variant="ghost"
              onClick={async () => {
                try {
                  await profilesApi.completeOnboarding();
                  await refreshOnboarding();
                } catch {
                  /* ignore */
                }
                navigate('/dashboard', { replace: true });
              }}
              className="font-heading text-xs text-muted-foreground"
            >
              {lang === 'vi' ? 'Bỏ qua' : 'Skip'}
            </Button>
          </div>

          <Button onClick={handleNext} disabled={!hasAnswer || submitting} className="gap-1 font-heading font-semibold">
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isLastStep ? (
              <>
                {lang === 'vi' ? 'Hoàn tất' : 'Finish'}
                <Check className="w-4 h-4" />
              </>
            ) : (
              <>
                {lang === 'vi' ? 'Tiếp tục' : 'Next'}
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
