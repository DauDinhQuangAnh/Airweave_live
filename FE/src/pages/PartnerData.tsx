import { useOutletContext } from 'react-router-dom';
import { Database, Radio, Handshake, Layers, ShieldCheck } from 'lucide-react';
import FeatureExperienceLayout from '@/components/feature-experience/FeatureExperienceLayout';

const PartnerData = () => {
  const { lang } = useOutletContext<{ lang: 'vi' | 'en' }>();

  return (
    <FeatureExperienceLayout
      lang={lang}
      badge={lang === 'vi' ? 'Giải pháp' : 'Solution'}
      heading={lang === 'vi' ? 'Mở rộng dữ liệu qua cảm biến đối tác' : 'Expand coverage via partner sensors'}
      subheading={lang === 'vi'
        ? 'Schema sẵn sàng tiếp nhận cảm biến vi vùng từ trường học, doanh nghiệp BĐS, công ty quan trắc — khi có thoả thuận chính thức. Hiện chưa có tích hợp trực tiếp.'
        : 'Schema is ready to ingest micro-area sensors from schools, real-estate, monitoring companies — under formal agreement. No live integration yet.'}
      benefits={[
        { icon: <Layers className="w-4 h-4" />, title: lang === 'vi' ? 'Vi vùng < 200m' : 'Micro-area < 200m', text: lang === 'vi' ? 'Bổ sung độ phủ ở nơi WAQI/Open-Meteo không có trạm.' : 'Fills gaps where WAQI/Open-Meteo have no station.' },
        { icon: <Handshake className="w-4 h-4" />, title: lang === 'vi' ? 'Chỉ với đối tác đã ký' : 'Only signed partners', text: lang === 'vi' ? 'Cần MoU và kiểm chuẩn (factory hoặc co-located) trước khi nhận dữ liệu.' : 'Requires MoU and calibration (factory / co-located).' },
        { icon: <ShieldCheck className="w-4 h-4" />, title: lang === 'vi' ? 'Aggregated, không cá nhân' : 'Aggregated, not personal', text: lang === 'vi' ? 'Dữ liệu lưu ở mức tổng hợp, không gắn người dùng.' : 'Stored aggregated, never tied to a user.' },
      ]}
      chips={[lang === 'vi' ? 'Cảm biến đối tác' : 'Partner sensors', lang === 'vi' ? 'Vi vùng' : 'Micro-area', 'Aggregated']}
    >
    <div className="h-full overflow-y-auto bg-background">
      <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-4">
        <header className="flex items-center gap-2">
          <Database className="w-5 h-5 text-primary" />
          <h1 className="font-heading text-xl md:text-2xl font-bold text-foreground">
            {lang === 'vi' ? 'Dữ liệu đối tác' : 'Partner Data'}
          </h1>
        </header>

        <div className="rounded-2xl border border-dashed border-border bg-card/60 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Radio className="w-4 h-4 text-muted-foreground" />
            <p className="text-sm font-heading font-bold text-foreground">
              {lang === 'vi' ? 'Partner Sensor Metadata Placeholder' : 'Partner Sensor Metadata Placeholder'}
            </p>
            <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground border border-border font-heading font-bold uppercase">
              {lang === 'vi' ? 'Chưa kết nối' : 'Not connected'}
            </span>
          </div>
          <p className="text-xs text-muted-foreground font-body mt-1">
            {lang === 'vi'
              ? 'Cấu trúc dữ liệu sẵn sàng tiếp nhận cảm biến vi vùng từ đối tác (công ty quan trắc tư nhân, trường học, doanh nghiệp BĐS) khi có thoả thuận chính thức. Hiện chưa có tích hợp trực tiếp.'
              : 'Schema is ready to ingest micro-area sensors from partners (private monitoring companies, schools, real-estate firms) once an official agreement exists. No live integration yet.'}
          </p>
          <pre className="mt-2 text-[10px] bg-muted/40 rounded p-3 overflow-x-auto font-mono text-muted-foreground">
{`// Future schema — Partner sensor event
{
  sensor_id, partner_id,
  lat, lng, location_grid,
  pm25, pm10, co2, temperature, humidity,
  timestamp,
  calibration: "factory" | "co_located",
  privacy_level: "aggregated_data"
}`}
          </pre>
        </div>
      </div>
    </div>
    </FeatureExperienceLayout>
  );
};

export default PartnerData;
