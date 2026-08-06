import { useOutletContext } from 'react-router-dom';
import { Building2, Camera, ShieldCheck, EyeOff, Grid3x3 } from 'lucide-react';
import { governmentMetadataGateway, cityCameraMetadataGateway } from '@/lib/civic-hotspot';
import FeatureExperienceLayout from '@/components/feature-experience/FeatureExperienceLayout';

const StatusChip = ({ status }: { status: string }) => (
  <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground border border-border font-heading font-bold uppercase">
    {status}
  </span>
);

const GovCameraAPI = () => {
  const { lang } = useOutletContext<{ lang: 'vi' | 'en' }>();
  const govStatus = governmentMetadataGateway.isEnabled() ? 'configured' : 'not connected';
  const camStatus = cityCameraMetadataGateway.isEnabled() ? 'configured' : 'not connected';

  return (
    <FeatureExperienceLayout
      lang={lang}
      badge={lang === 'vi' ? 'Giải pháp' : 'Solution'}
      heading={lang === 'vi' ? 'Tiếp nhận metadata, không phải video' : 'Ingest metadata, not video'}
      subheading={lang === 'vi'
        ? 'Khi có thoả thuận chính thức với cơ quan quản lý, AirWeave chỉ nhận metadata ẩn danh ở mức ô lưới — không nhận video, không nhận diện khuôn mặt, không lưu biển số.'
        : 'With an official agreement, AirWeave ingests only anonymized grid-level metadata — no raw video, faces, or license plates.'}
      benefits={[
        { icon: <EyeOff className="w-4 h-4" />, title: lang === 'vi' ? 'Không video, không khuôn mặt' : 'No video, no faces', text: lang === 'vi' ? 'Raw video, khuôn mặt, biển số bị từ chối ở tầng gateway.' : 'Raw video, faces, plates rejected at gateway level.' },
        { icon: <Grid3x3 className="w-4 h-4" />, title: lang === 'vi' ? 'Ẩn danh ở mức ô lưới' : 'Grid-level anonymization', text: lang === 'vi' ? 'Vị trí được làm mờ về ô lưới ~200m, không cá nhân hoá.' : 'Locations bucketed to ~200m grids, never personalized.' },
        { icon: <ShieldCheck className="w-4 h-4" />, title: lang === 'vi' ? 'Chỉ khi có MoU chính thức' : 'Only with official MoU', text: lang === 'vi' ? 'Mặc định tắt; chỉ bật khi có thoả thuận pháp lý.' : 'Disabled by default; enabled only under legal agreement.' },
      ]}
      chips={[lang === 'vi' ? 'Gov API' : 'Gov API', lang === 'vi' ? 'Camera AI metadata' : 'Camera AI metadata', lang === 'vi' ? 'Ẩn danh' : 'Anonymized']}
    >
    <div className="h-full overflow-y-auto bg-background">
      <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-4">
        <header className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-primary" />
          <h1 className="font-heading text-xl md:text-2xl font-bold text-foreground">
            {lang === 'vi' ? 'Gov API / Camera AI' : 'Gov API / Camera AI'}
          </h1>
        </header>

        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-primary mt-0.5 shrink-0" />
          <p className="text-[11px] text-muted-foreground font-body leading-relaxed">
            {lang === 'vi'
              ? 'AirWeave KHÔNG nhận video thô, KHÔNG nhận diện khuôn mặt, KHÔNG lưu biển số. Chỉ tiếp nhận metadata ẩn danh ở mức ô lưới khi có thoả thuận chính thức với cơ quan quản lý.'
              : 'AirWeave does NOT receive raw video, faces or license plates. It only ingests anonymized grid-level metadata if an official agreement exists with the authority.'}
          </p>
        </div>

        {/* Gov API */}
        <div className="rounded-2xl border border-dashed border-border bg-card/60 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="w-4 h-4 text-muted-foreground" />
            <p className="text-sm font-heading font-bold text-foreground">
              {lang === 'vi' ? 'Government API Placeholder' : 'Government API Placeholder'}
            </p>
            <StatusChip status={govStatus} />
          </div>
          <p className="text-xs text-muted-foreground font-body mt-1">
            {lang === 'vi'
              ? 'Chưa kết nối dữ liệu chính thức từ cơ quan quản lý.'
              : 'Not connected to any official government data source.'}
          </p>
          <pre className="mt-2 text-[10px] bg-muted/40 rounded p-3 overflow-x-auto font-mono text-muted-foreground">
{`// Future schema — Government metadata event
{
  event_id, source: "government_api",
  event_type, location_grid, district, ward,
  timestamp, confidence,
  privacy_level: "anonymized_metadata",
  raw_video: false,
  personal_data: false
}`}
          </pre>
        </div>

        {/* Camera */}
        <div className="rounded-2xl border border-dashed border-border bg-card/60 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Camera className="w-4 h-4 text-muted-foreground" />
            <p className="text-sm font-heading font-bold text-foreground">
              {lang === 'vi' ? 'City AI Camera Metadata Placeholder' : 'City AI Camera Metadata Placeholder'}
            </p>
            <StatusChip status={camStatus} />
          </div>
          <p className="text-xs text-muted-foreground font-body mt-1">
            {lang === 'vi'
              ? 'Chưa kết nối metadata camera đô thị. AirWeave không xử lý video thô, không nhận diện khuôn mặt, không lưu biển số.'
              : 'Not connected to city AI camera metadata. AirWeave does NOT process raw video, faces or license plates.'}
          </p>
          <pre className="mt-2 text-[10px] bg-muted/40 rounded p-3 overflow-x-auto font-mono text-muted-foreground">
{`// Future schema — City AI camera metadata event
{
  event_id, source: "city_ai_camera_metadata",
  event_type, location_grid, timestamp, confidence,
  raw_video: false,
  face_data: false,
  license_plate_data: false,
  privacy_level: "anonymized_metadata"
}`}
          </pre>
        </div>
      </div>
    </div>
    </FeatureExperienceLayout>
  );
};

export default GovCameraAPI;
