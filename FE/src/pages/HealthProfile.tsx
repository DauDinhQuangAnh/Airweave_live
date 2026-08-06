import { Stethoscope, BellRing, ShieldCheck } from 'lucide-react';
import Profile from './Profile';
import FeatureExperienceLayout from '@/components/feature-experience/FeatureExperienceLayout';

/**
 * Hồ sơ sức khỏe — wraps the existing Profile page in FeatureExperienceLayout
 * with the "Cảnh báo theo hồ sơ + Suggested actions" framing.
 */
const HealthProfile = () => (
  <FeatureExperienceLayout
    lang="vi"
    badge="Giải pháp"
    heading="Cảnh báo theo hồ sơ sức khỏe"
    subheading="AirWeave dùng hồ sơ của bạn (nhóm tuổi, bệnh nền, giờ hoạt động) để cá nhân hóa ngưỡng AQI và đề xuất hành động phù hợp — không phải cảnh báo chung chung."
    benefits={[
      {
        icon: <BellRing className="w-4 h-4" />,
        title: 'Ngưỡng AQI cá nhân hóa',
        text: 'Người có bệnh hô hấp nhận cảnh báo sớm hơn ~30 AQI so với mặc định.',
      },
      {
        icon: <Stethoscope className="w-4 h-4" />,
        title: 'Suggested actions theo bệnh nền',
        text: 'Gợi ý đeo khẩu trang N95, hoãn tập luyện, bật máy lọc khí — dựa trên hồ sơ.',
      },
      {
        icon: <ShieldCheck className="w-4 h-4" />,
        title: 'Quyền riêng tư rõ ràng',
        text: 'Medical ID không tự chia sẻ. Bạn quyết định mỗi lần dùng SOS hoặc QR.',
      },
    ]}
    chips={[
      'Hồ sơ y tế',
      'Cảnh báo cá nhân hóa',
      'Suggested actions',
      'Quyền riêng tư',
    ]}
  >
    <Profile />
  </FeatureExperienceLayout>
);

export default HealthProfile;
