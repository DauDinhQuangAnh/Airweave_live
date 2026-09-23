import { Stethoscope, BellRing, ShieldCheck } from 'lucide-react';
import Profile from './Profile';
import FeatureExperienceLayout from '@/components/feature-experience/FeatureExperienceLayout';
import { useAppLang } from '@/hooks/use-app-lang';

/**
 * Hồ sơ sức khỏe — wraps the existing Profile page in FeatureExperienceLayout
 * with the "Cảnh báo theo hồ sơ + Suggested actions" framing.
 */
const HealthProfile = () => {
  const lang = useAppLang();
  return (
  <FeatureExperienceLayout
    lang={lang}
    badge={lang === 'vi' ? 'Giải pháp' : 'Solution'}
    heading={lang === 'vi' ? 'Cảnh báo theo hồ sơ sức khỏe' : 'Health Profile Alerts'}
    subheading={lang === 'vi'
      ? 'AirWeave dùng hồ sơ của bạn (nhóm tuổi, bệnh nền, giờ hoạt động) để cá nhân hóa ngưỡng AQI và đề xuất hành động phù hợp — không phải cảnh báo chung chung.'
      : 'AirWeave uses age group, medical conditions, and activity patterns to personalize AQI thresholds and suggested actions.'}
    benefits={[
      {
        icon: <BellRing className="w-4 h-4" />,
        title: lang === 'vi' ? 'Ngưỡng AQI cá nhân hóa' : 'Personalized AQI thresholds',
        text: lang === 'vi' ? 'Người có bệnh hô hấp nhận cảnh báo sớm hơn ~30 AQI so với mặc định.' : 'People with respiratory conditions receive alerts about 30 AQI points earlier.',
      },
      {
        icon: <Stethoscope className="w-4 h-4" />,
        title: lang === 'vi' ? 'Hành động theo bệnh nền' : 'Condition-aware actions',
        text: lang === 'vi' ? 'Gợi ý đeo khẩu trang N95, hoãn tập luyện, bật máy lọc khí — dựa trên hồ sơ.' : 'Suggests N95 use, delayed exercise, or an air purifier based on your profile.',
      },
      {
        icon: <ShieldCheck className="w-4 h-4" />,
        title: lang === 'vi' ? 'Quyền riêng tư rõ ràng' : 'Clear privacy controls',
        text: lang === 'vi' ? 'Medical ID không tự chia sẻ. Bạn quyết định mỗi lần dùng SOS hoặc QR.' : 'Medical ID is never shared automatically. You decide whenever SOS or QR is used.',
      },
    ]}
    chips={[
      lang === 'vi' ? 'Hồ sơ y tế' : 'Medical profile',
      lang === 'vi' ? 'Cảnh báo cá nhân hóa' : 'Personalized alerts',
      lang === 'vi' ? 'Hành động đề xuất' : 'Suggested actions',
      lang === 'vi' ? 'Quyền riêng tư' : 'Privacy',
    ]}
  >
    <Profile />
  </FeatureExperienceLayout>
  );
};

export default HealthProfile;
