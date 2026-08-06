import { AlertTriangle, Phone, ShieldCheck, Lock, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAppLang } from '@/hooks/use-app-lang';

export default function DisclaimerTab({ lang: propLang }: { lang?: 'vi' | 'en' }) {
  const contextLang = useAppLang();
  const lang = propLang || contextLang;

  return (
    <div className="space-y-4 font-body">
      {/* Demo preview button */}
      <Link to="/qr/demo" target="_blank">
        <Button className="w-full bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-700 hover:to-red-800 h-12 font-heading font-bold">
          <Eye className="w-4 h-4 mr-2" />
          {lang === 'vi'
            ? 'Xem thử "Phiếu bệnh án" mà bác sĩ sẽ thấy (Demo)'
            : 'Preview "Medical Record" visible to doctors (Demo)'}
        </Button>
      </Link>

      <div className="rounded-xl border-2 border-red-500/40 bg-red-500/5 p-4 space-y-2">
        <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
          <AlertTriangle className="w-5 h-5" />
          <p className="font-heading font-bold">
            {lang === 'vi' ? 'Tuyên bố miễn trừ trách nhiệm' : 'Emergency Disclaimer'}
          </p>
        </div>
        <p className="text-sm text-foreground/80 leading-relaxed">
          {lang === 'vi' ? (
            <>
              AirWeave SOS là <strong>công cụ hỗ trợ thông tin khẩn cấp</strong>. Chúng tôi không phải là cơ quan y tế. Dữ liệu y tế do người dùng tự cung cấp và tự chịu trách nhiệm về độ chính xác.
            </>
          ) : (
            <>
              AirWeave SOS is an <strong>emergency information support tool</strong>. We are not a medical service provider. Medical data is user-provided and users hold responsibility for its accuracy.
            </>
          )}
        </p>
        <p className="text-sm font-semibold text-red-600 dark:text-red-400">
          {lang === 'vi' ? (
            <>
              Trong mọi trường hợp khẩn cấp, hãy luôn ưu tiên gọi <a className="underline" href="tel:115">115</a> trước khi sử dụng ứng dụng.
            </>
          ) : (
            <>
              In any life-threatening emergency, always prioritize calling <a className="underline" href="tel:115">115</a> or local emergency services first.
            </>
          )}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <InfoCard
          icon={<Phone className="w-5 h-5" />}
          title={lang === 'vi' ? '115 trước' : 'Call 115 First'}
          desc={
            lang === 'vi'
              ? 'Gọi cấp cứu công lập trước. App chỉ là công cụ hỗ trợ thông tin.'
              : 'Contact public emergency responders first. This app is an informational aid.'
          }
        />
        <InfoCard
          icon={<ShieldCheck className="w-5 h-5" />}
          title={lang === 'vi' ? 'Tự khai báo' : 'Self-Reported'}
          desc={
            lang === 'vi'
              ? 'Thông tin này do người dùng tự khai, chỉ mang tính tham khảo cho nhân viên y tế.'
              : 'Medical info is self-entered by user for reference by medical personnel.'
          }
        />
        <InfoCard
          icon={<Lock className="w-5 h-5" />}
          title={lang === 'vi' ? 'Bảo mật' : 'Privacy Protection'}
          desc={
            lang === 'vi'
              ? 'Medical ID được lưu trữ an toàn và chỉ hiển thị công khai (qua QR) khi SOS được kích hoạt.'
              : 'Medical ID is encrypted on device and only revealed via QR upon active SOS trigger.'
          }
        />
      </div>

      <div className="rounded-xl border border-border bg-card/80 p-4 space-y-2">
        <p className="font-heading font-bold text-sm">
          {lang === 'vi' ? 'Cách hoạt động' : 'How it Works'}
        </p>
        <ol className="list-decimal pl-5 text-sm space-y-1 text-foreground/80">
          {lang === 'vi' ? (
            <>
              <li>Tạo Medical ID cho bản thân và người thân (3 mục bắt buộc).</li>
              <li>Khi gặp sự cố, giữ nút SOS 2 giây → chọn người gặp nạn.</li>
              <li>Màn hình tự bật <strong>Flash Card đỏ</strong> với QR code: bệnh nền + bối cảnh phơi nhiễm AQI để bác sĩ quét nhanh.</li>
              <li>Đồng thời hiển thị 3 bệnh viện gần nhất + nút gửi SMS cho người thân kèm vị trí GPS.</li>
            </>
          ) : (
            <>
              <li>Create Medical ID profiles for self and family members.</li>
              <li>In an emergency, hold the SOS button for 2 seconds → select affected person.</li>
              <li>Screen launches a <strong>Red Emergency Flash Card</strong> with QR code containing medical background & live AQI exposure telemetry for medical personnel scan.</li>
              <li>Simultaneously displays 3 nearest hospitals and 1-tap SMS emergency contact dispatch with GPS location.</li>
            </>
          )}
        </ol>
      </div>
    </div>
  );
}

function InfoCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="rounded-xl border border-border bg-card/80 p-3 space-y-1.5">
      <div className="flex items-center gap-2 text-primary">
        {icon}
        <p className="font-heading font-bold text-sm">{title}</p>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
    </div>
  );
}
