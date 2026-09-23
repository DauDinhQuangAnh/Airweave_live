import { useOutletContext } from 'react-router-dom';
import { Building2, Camera, ShieldCheck } from 'lucide-react';
import AuroraBackground from '@/components/AuroraBackground';

export default function GovCameraAPI() {
  const { lang } = useOutletContext<{ lang: 'vi' | 'en' }>();

  return (
    <div className="h-full overflow-y-auto bg-[#050911] text-white relative font-body p-4 md:p-6 scrollbar-thin">
      <AuroraBackground />
      <div className="relative z-10 max-w-4xl mx-auto space-y-5">
        <div className="rounded-2xl border border-white/10 bg-[#0a1120]/80 p-5">
          <h1 className="font-heading font-bold text-xl">{lang === 'vi' ? 'Cổng dữ liệu chính phủ và camera đô thị' : 'Government and city camera data gateway'}</h1>
          <p className="mt-2 text-sm text-white/60">
            {lang === 'vi' ? 'Chưa có kết nối dữ liệu được triển khai hoặc xác minh. Trang này không hiển thị sự kiện mô phỏng như dữ liệu vận hành.' : 'No data connection has been implemented or verified. This page does not present simulated events as operational data.'}
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-[#0a1120]/80 p-5 space-y-2">
            <Building2 className="w-6 h-6 text-cyan-400" />
            <h2 className="font-heading font-semibold">{lang === 'vi' ? 'Dữ liệu cơ quan quản lý' : 'Government agency data'}</h2>
            <p className="text-xs text-amber-300">{lang === 'vi' ? 'Chưa kết nối' : 'Not connected'}</p>
            <p className="text-sm text-white/60">{lang === 'vi' ? 'Cần API chính thức, quyền truy cập và kiểm chứng dữ liệu trước khi bật tính năng.' : 'An official API, access authorization and data verification are required before this feature can be enabled.'}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#0a1120]/80 p-5 space-y-2">
            <Camera className="w-6 h-6 text-blue-400" />
            <h2 className="font-heading font-semibold">{lang === 'vi' ? 'Metadata camera đô thị' : 'City camera metadata'}</h2>
            <p className="text-xs text-amber-300">{lang === 'vi' ? 'Chưa kết nối' : 'Not connected'}</p>
            <p className="text-sm text-white/60">{lang === 'vi' ? 'Cần đối tác cung cấp metadata và cơ chế bảo vệ quyền riêng tư được đánh giá trước khi tiếp nhận.' : 'A partner metadata feed and reviewed privacy safeguards are required before ingestion.'}</p>
          </div>
        </div>
        <p className="text-xs text-white/50 flex items-center gap-2"><ShieldCheck className="w-4 h-4" />{lang === 'vi' ? 'Chưa thu thập video, khuôn mặt hoặc biển số xe qua cổng này.' : 'This gateway is not collecting video, faces or license plates.'}</p>
      </div>
    </div>
  );
}
