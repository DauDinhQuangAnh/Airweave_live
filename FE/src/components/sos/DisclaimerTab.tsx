import { AlertTriangle, Phone, ShieldCheck, Lock, Eye, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAppLang } from '@/hooks/use-app-lang';

export default function DisclaimerTab({ lang: propLang }: { lang?: 'vi' | 'en' }) {
  const contextLang = useAppLang();
  const lang = propLang || contextLang;

  return (
    <div className="space-y-4 font-body">
      {/* Doctor Record Demo Preview */}
      <Link to="/qr/demo" target="_blank">
        <Button className="w-full bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 text-white h-12 rounded-2xl font-heading font-bold shadow-lg shadow-red-950/50 flex items-center justify-center gap-2">
          <Eye className="w-4 h-4" />
          <span>
            {lang === 'vi'
              ? 'Xem thử "Phiếu Bệnh Án QR" mà Bác sĩ sẽ thấy (Demo)'
              : 'Preview "Medical Record QR" visible to Doctors (Demo)'}
          </span>
          <ExternalLink className="w-3.5 h-3.5 opacity-70" />
        </Button>
      </Link>

      {/* Emergency Disclaimer Alert Box */}
      <div className="rounded-2xl border border-red-500/40 bg-red-950/20 p-4 space-y-2.5 backdrop-blur-xl">
        <div className="flex items-center gap-2 text-red-400">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <p className="font-heading font-bold text-sm">
            {lang === 'vi' ? 'Tuyên bố miễn trừ trách nhiệm y tế' : 'Emergency Medical Disclaimer'}
          </p>
        </div>
        <p className="text-xs text-gray-300 leading-relaxed font-body">
          {lang === 'vi' ? (
            <>
              AirWeave SOS là <strong>hệ thống hỗ trợ thông tin khẩn cấp vi vùng</strong>. Chúng tôi không phải là cơ sở khám chữa bệnh. Dữ liệu bệnh nền và thông tin liên hệ do người dùng tự khai báo và chịu trách nhiệm về tính xác thực.
            </>
          ) : (
            <>
              AirWeave SOS is an <strong>emergency telemetry & information aid</strong>. We are not a healthcare provider. Medical history and contacts are self-reported by users.
            </>
          )}
        </p>
        <p className="text-xs font-semibold text-red-400 font-heading pt-1 border-t border-red-500/20">
          {lang === 'vi' ? (
            <>
              Trong mọi tình huống nguy kịch, hãy ưu tiên bấm gọi <a className="underline text-red-300 hover:text-white" href="tel:115">115</a> hoặc đến ngay cơ sở y tế gần nhất trước khi thao tác ứng dụng.
            </>
          ) : (
            <>
              In any life-threatening emergency, always prioritize calling <a className="underline text-red-300 hover:text-white" href="tel:115">115</a> or local emergency responders first.
            </>
          )}
        </p>
      </div>

      {/* 3 Core Principles */}
      <div className="grid gap-3 sm:grid-cols-3">
        <InfoCard
          icon={<Phone className="w-5 h-5 text-red-400" />}
          title={lang === 'vi' ? 'Gọi 115 trước' : 'Call 115 First'}
          desc={
            lang === 'vi'
              ? 'Gọi cấp cứu công lập trước. Ứng dụng là phương tiện cung cấp dữ liệu phụ trợ.'
              : 'Contact public emergency responders first. This app acts as secondary aid.'
          }
        />
        <InfoCard
          icon={<ShieldCheck className="w-5 h-5 text-emerald-400" />}
          title={lang === 'vi' ? 'Dữ liệu tự khai' : 'Self-Reported'}
          desc={
            lang === 'vi'
              ? 'Thông tin bệnh án do cá nhân tự nhập, phục vụ tham khảo nhanh cho bác sĩ.'
              : 'Medical history is self-entered for rapid reference by first responders.'
          }
        />
        <InfoCard
          icon={<Lock className="w-5 h-5 text-sky-400" />}
          title={lang === 'vi' ? 'Ủy quyền chủ động' : 'Active Consent'}
          desc={
            lang === 'vi'
              ? 'Không tự động gửi dữ liệu ngầm. Chỉ mở khóa Medical ID khi bạn xác nhận tạo QR.'
              : 'Zero passive leakage. Medical ID only shared when you confirm QR generation.'
          }
        />
      </div>

      {/* Step by step protocol */}
      <div className="rounded-2xl border border-white/10 bg-[#0c1322]/80 backdrop-blur-xl p-4 sm:p-5 space-y-3 shadow-xl">
        <p className="font-heading font-bold text-sm text-white flex items-center gap-2">
          <span>📋</span>
          <span>{lang === 'vi' ? 'Quy trình hoạt động khi xảy ra sự cố' : 'Emergency Operational Protocol'}</span>
        </p>
        <ol className="list-decimal pl-5 text-xs space-y-2 text-gray-300 leading-relaxed font-body">
          {lang === 'vi' ? (
            <>
              <li>
                <strong className="text-white">Thiết lập Medical ID sẵn:</strong> Khai báo hồ sơ cho bản thân và người thân trong gia đình (họ tên, năm sinh, nhóm máu, tiền sử hen suyễn / COPD).
              </li>
              <li>
                <strong className="text-white">Khi gặp cơn khó thở vì khói bụi:</strong> Bấm nút <strong>Kích hoạt SOS</strong> hoặc giữ nút SOS góc màn hình → chọn người gặp sự cố.
              </li>
              <li>
                <strong className="text-white">Xuất Flashcard Bác sĩ:</strong> Màn hình hiển thị ngay thẻ khẩn cấp với mã QR chứa bệnh nền + nồng độ ô nhiễm AQI/PM2.5 thực tế tại hiện trường để y bác sĩ tiếp cận tức thì.
              </li>
              <li>
                <strong className="text-white">Định tuyến & Báo người thân:</strong> Xem ngay danh sách 3 bệnh viện gần nhất kèm lộ trình sạch và 1 chạm gửi tin nhắn SMS / WhatsApp vị trí cho người thân.
              </li>
            </>
          ) : (
            <>
              <li>
                <strong className="text-white">Setup Medical ID:</strong> Register medical profiles for yourself and relatives (name, birth year, blood type, asthma/COPD history).
              </li>
              <li>
                <strong className="text-white">Upon respiratory emergency:</strong> Tap <strong>Activate SOS</strong> → select affected person.
              </li>
              <li>
                <strong className="text-white">Generate Doctor Flashcard:</strong> Displays instant emergency card with QR containing conditions + live AQI exposure telemetry for doctors.
              </li>
              <li>
                <strong className="text-white">Route & Dispatch:</strong> Locate nearest 3 hospitals with clean routing and 1-tap SMS dispatch to family contacts.
              </li>
            </>
          )}
        </ol>
      </div>
    </div>
  );
}

function InfoCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0c1322]/80 p-3.5 space-y-1.5 backdrop-blur-xl">
      <div className="flex items-center gap-2">
        {icon}
        <p className="font-heading font-bold text-xs sm:text-sm text-white">{title}</p>
      </div>
      <p className="text-[11px] text-gray-400 leading-relaxed font-body">{desc}</p>
    </div>
  );
}
