import { useOutletContext, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Stethoscope, BellRing, ShieldCheck, HeartPulse, Sparkles, ArrowRight, UserCheck, Activity, ShieldAlert } from 'lucide-react';
import FeatureExperienceLayout from '@/components/feature-experience/FeatureExperienceLayout';
import { Button } from '@/components/ui/button';

const HealthInfo = () => {
  const { lang } = useOutletContext<{ lang: 'vi' | 'en' }>();
  const navigate = useNavigate();

  return (
    <FeatureExperienceLayout
      lang={lang || 'vi'}
      badge={lang === 'en' ? 'Smart Solution' : 'Giải pháp thông minh'}
      heading={lang === 'en' ? 'Health-Profile Based Alerts' : 'Cảnh báo theo hồ sơ sức khỏe'}
      subheading={
        lang === 'en'
          ? 'AirWeave uses your health profile (age group, underlying conditions, active hours) to personalize AQI warning thresholds and suggest tailored actions — not generic alerts.'
          : 'AirWeave dùng hồ sơ của bạn (nhóm tuổi, bệnh nền, giờ hoạt động) để cá nhân hóa ngưỡng AQI và đề xuất hành động phù hợp — không phải cảnh báo chung chung.'
      }
      benefits={[
        {
          icon: <BellRing className="w-4 h-4 text-primary" />,
          title: lang === 'en' ? 'Personalized AQI Thresholds' : 'Ngưỡng AQI cá nhân hóa',
          text:
            lang === 'en'
              ? 'People with respiratory illnesses receive warnings ~30 AQI earlier than default.'
              : 'Người có bệnh hô hấp nhận cảnh báo sớm hơn ~30 AQI so với mặc định.',
        },
        {
          icon: <Stethoscope className="w-4 h-4 text-emerald-500" />,
          title: lang === 'en' ? 'Condition-Based Actions' : 'Suggested actions theo bệnh nền',
          text:
            lang === 'en'
              ? 'Tailored advice: N95 masks, delay outdoor workouts, turn on air purifiers.'
              : 'Gợi ý đeo khẩu trang N95, hoãn tập luyện ngoài trời, bật máy lọc khí — dựa trên hồ sơ.',
        },
        {
          icon: <ShieldCheck className="w-4 h-4 text-amber-500" />,
          title: lang === 'en' ? 'Transparent Privacy Control' : 'Quyền riêng tư rõ ràng',
          text:
            lang === 'en'
              ? 'Medical ID is never auto-shared. You decide every time when triggering SOS or QR.'
              : 'Medical ID không tự chia sẻ. Bạn quyết định mỗi lần dùng SOS hoặc QR.',
        },
      ]}
      chips={[
        lang === 'en' ? 'Medical Profile' : 'Hồ sơ y tế',
        lang === 'en' ? 'Personalized Alerts' : 'Cảnh báo cá nhân hóa',
        lang === 'en' ? 'Suggested Actions' : 'Suggested actions',
        lang === 'en' ? 'Privacy First' : 'Quyền riêng tư',
      ]}
    >
      <div className="h-full overflow-y-auto bg-background p-4 md:p-8 space-y-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Main Hero Card */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card p-6 md:p-8 shadow-sm space-y-4"
          >
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-primary text-primary-foreground">
                <HeartPulse className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-heading font-bold uppercase tracking-wider text-primary">
                  {lang === 'en' ? 'AirWeave Health Intelligence' : 'Giải pháp bảo vệ sức khỏe AirWeave'}
                </span>
                <h1 className="text-xl md:text-2xl font-heading font-extrabold text-foreground">
                  {lang === 'en' ? 'Personalized Respiratory Protection' : 'Cảnh báo cá nhân hóa theo tình trạng sức khỏe'}
                </h1>
              </div>
            </div>

            <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
              {lang === 'en'
                ? 'AirWeave connects real-time air pollution metrics with your medical background. Instead of sending standard alerts to everyone, AirWeave calculates early warnings specifically for sensitive individuals, children, and the elderly.'
                : 'AirWeave liên kết dữ liệu ô nhiễm thời gian thực với tình trạng sức khỏe của bạn. Thay vì phát cảnh báo chung cho tất cả mọi người, hệ thống tự động siết chặt ngưỡng cảnh báo sớm đối với đối tượng nhạy cảm, trẻ nhỏ và người cao tuổi.'}
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button
                onClick={() => navigate('/health-profile')}
                className="font-heading text-xs font-bold gap-2 rounded-xl"
              >
                <UserCheck className="w-4 h-4" />
                {lang === 'en' ? 'Manage Health Profile' : 'Cập nhật hồ sơ sức khỏe của bạn'}
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </motion.div>

          {/* Feature Grid Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl border border-border bg-card shadow-2xs space-y-2">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 w-fit">
                <BellRing className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-heading font-bold text-foreground">
                {lang === 'en' ? 'Cảnh báo sớm ~30 AQI' : 'Cảnh báo sớm hơn ~30 AQI'}
              </h3>
              <p className="text-xs text-muted-foreground">
                {lang === 'en'
                  ? 'Triggers alerts at AQI 70 for asthma patients instead of waiting for AQI 100.'
                  : 'Ngưỡng cảnh báo giảm xuống mức AQI 70 cho người hen suyễn thay vì 100.'}
              </p>
            </div>

            <div className="p-5 rounded-2xl border border-border bg-card shadow-2xs space-y-2">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 w-fit">
                <Activity className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-heading font-bold text-foreground">
                {lang === 'en' ? 'Khuyến nghị hành động' : 'Hành động đề xuất tự động'}
              </h3>
              <p className="text-xs text-muted-foreground">
                {lang === 'en'
                  ? 'Automated suggestions for N95 masks, indoor filters, and alternative clean routes.'
                  : 'Tự động đề xuất khẩu trang N95, bật máy lọc khí và di chuyển lộ trình sạch.'}
              </p>
            </div>

            <div className="p-5 rounded-2xl border border-border bg-card shadow-2xs space-y-2">
              <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 w-fit">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-heading font-bold text-foreground">
                {lang === 'en' ? 'Bảo vệ Medical ID' : 'Bảo mật Medical ID (SOS)'}
              </h3>
              <p className="text-xs text-muted-foreground">
                {lang === 'en'
                  ? 'Medical emergency profile is only shared when you explicitly trigger SOS.'
                  : 'Hồ sơ y tế khẩn cấp chỉ chia sẻ khi bạn kích hoạt nút SOS khẩn cấp.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </FeatureExperienceLayout>
  );
};

export default HealthInfo;
