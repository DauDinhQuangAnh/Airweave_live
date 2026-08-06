import { useState } from 'react';
import { Siren, Heart, MapPin, Info, ShieldAlert, Hospital, Lock } from 'lucide-react';
import MedicalIDTab from '@/components/sos/MedicalIDTab';
import HospitalsTab from '@/components/sos/HospitalsTab';
import DisclaimerTab from '@/components/sos/DisclaimerTab';
import SOSButton from '@/components/sos/SOSButton';
import FeatureExperienceLayout from '@/components/feature-experience/FeatureExperienceLayout';
import { useAppLang } from '@/hooks/use-app-lang';

export default function SOS() {
  const lang = useAppLang();
  const [tab, setTab] = useState<string>('id');

  const tabs = [
    { id: 'id', labelVi: 'Medical ID', labelEn: 'Medical ID', icon: Heart },
    { id: 'hospitals', labelVi: 'Bệnh viện gần', labelEn: 'Nearby Hospitals', icon: MapPin },
    { id: 'info', labelVi: 'Hướng dẫn', labelEn: 'Guidelines', icon: Info },
  ] as const;

  return (
    <FeatureExperienceLayout
      lang={lang}
      badge={lang === 'vi' ? 'Khẩn cấp' : 'Emergency'}
      heading={lang === 'vi' ? 'SOS hô hấp có xác nhận' : 'Confirmed Respiratory SOS'}
      subheading={
        lang === 'vi'
          ? 'Mọi hành động chia sẻ vị trí, Medical ID, hay tạo QR đều cần bạn xác nhận. Không tự động gửi, không lộ thông tin ngoài ý muốn.'
          : 'All location sharing, Medical ID access, or QR creation require your explicit confirmation. No unwanted data leaks.'
      }
      benefits={[
        {
          icon: <ShieldAlert className="w-4 h-4" />,
          title: lang === 'vi' ? 'Xác nhận trước khi chia sẻ' : 'Confirmation before sharing',
          text: lang === 'vi' ? 'Vị trí GPS & tin nhắn khẩn cấp chỉ gửi khi bạn bấm xác nhận.' : 'GPS location & emergency message sent only upon your tap.',
        },
        {
          icon: <Hospital className="w-4 h-4" />,
          title: lang === 'vi' ? 'Bệnh viện gần & gọi 115' : 'Nearby hospitals & 115',
          text: lang === 'vi' ? 'Danh sách bệnh viện gần nhất kèm chỉ đường, gọi cấp cứu 1 chạm.' : 'Nearest hospitals with routing and 1-tap emergency calling.',
        },
        {
          icon: <Lock className="w-4 h-4" />,
          title: lang === 'vi' ? 'Medical ID riêng tư' : 'Private Medical ID',
          text: lang === 'vi' ? 'Hồ sơ y tế hiển thị nội bộ; QR cho bác sĩ cần được bạn tạo riêng.' : 'Medical records kept private; doctor QR code generated on demand.',
        },
      ]}
      chips={
        lang === 'vi'
          ? ['SOS hô hấp', 'Medical ID', 'Bệnh viện gần', 'QR bác sĩ']
          : ['Respiratory SOS', 'Medical ID', 'Nearby Hospitals', 'Doctor QR']
      }
    >
      <div className="p-4 sm:p-6 max-w-5xl mx-auto pb-32">
        {/* Header — synced with sidebar */}
        <div className="mb-6 flex items-start gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center shadow-lg shadow-red-500/30 ring-2 ring-red-500/20 shrink-0">
            <Siren className="w-6 h-6 text-white" strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-red-600 dark:text-red-400">
              {lang === 'vi' ? 'Emergency · Khẩn cấp' : 'Emergency Assistance'}
            </div>
            <h1 className="text-2xl sm:text-3xl font-heading font-black text-foreground leading-tight">
              AirWeave <span className="text-red-600">SOS</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {lang === 'vi'
                ? 'Hồ sơ y tế, bệnh viện gần, và nút SOS 1 chạm có dữ liệu phơi nhiễm không khí thực tế.'
                : 'Medical ID, nearby hospital finder, and 1-tap SOS with real-time exposure telemetry.'}
            </p>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 p-1 bg-muted/40 rounded-xl mb-4 border border-border">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs sm:text-sm font-heading font-semibold transition-all ${
                tab === t.id
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <t.icon className="w-4 h-4 text-primary" />
              <span>{lang === 'vi' ? t.labelVi : t.labelEn}</span>
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === 'id' && <MedicalIDTab lang={lang} />}
        {tab === 'hospitals' && <HospitalsTab lang={lang} />}
        {tab === 'info' && <DisclaimerTab lang={lang} />}
      </div>

      {/* Floating SOS action button */}
      <SOSButton lang={lang} />
    </FeatureExperienceLayout>
  );
}
