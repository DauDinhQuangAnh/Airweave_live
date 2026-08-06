import { useMemo } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { ShieldCheck, Users, Radio, Building2, Camera, Database, AlertTriangle, ThumbsUp, Route as RouteIcon } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useWaqiStations } from '@/hooks/use-waqi-stations';
import {
  hotspotIntelligenceService,
  governmentMetadataGateway,
  cityCameraMetadataGateway,
  getDemoHotspots,
  type HotspotEvent,
} from '@/lib/civic-hotspot';
import { useQuery } from '@tanstack/react-query';
import { useLiveAirContext } from '@/contexts/live-air-context';
import { USE_DEMO_DATA } from '@/lib/app-mode';

const EVENT_LABEL: Record<string, { vi: string; en: string; icon: string }> = {
  construction_dust: { vi: 'Bụi công trình', en: 'Construction dust', icon: '🏗️' },
  burning_smoke: { vi: 'Khói đốt', en: 'Burning smoke', icon: '🔥' },
  traffic_emission: { vi: 'Khí thải giao thông', en: 'Traffic emission', icon: '🚗' },
  chemical_smell: { vi: 'Mùi hóa chất', en: 'Chemical smell', icon: '🧪' },
  road_dust: { vi: 'Bụi đường', en: 'Road dust', icon: '🌫️' },
  abnormal_air_quality: { vi: 'AQI bất thường', en: 'Abnormal AQI', icon: '⚠️' },
  unknown: { vi: 'Chưa rõ', en: 'Unknown', icon: '❓' },
};

const CONF_COLOR: Record<string, string> = {
  low: 'bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30',
  medium: 'bg-orange-500/15 text-orange-600 dark:text-orange-300 border-orange-500/30',
  high: 'bg-red-500/15 text-red-600 dark:text-red-300 border-red-500/30',
};

function HotspotCard({ ev, lang, onAvoid, onConfirm }: {
  ev: HotspotEvent; lang: 'vi' | 'en'; onAvoid: () => void; onConfirm: () => void;
}) {
  const meta = EVENT_LABEL[ev.eventType] ?? EVENT_LABEL.unknown;
  return (
    <div className="rounded-xl border border-border bg-card/80 p-3 flex flex-col gap-2">
      <div className="flex items-start gap-3">
        <span className="text-xl shrink-0" aria-hidden>{meta.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-heading font-bold text-foreground">
              {lang === 'vi' ? meta.vi : meta.en}
            </span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-heading font-bold uppercase ${CONF_COLOR[ev.confidence]}`}>
              {ev.confidence}
            </span>
            {ev.isDemo && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-300 font-heading font-bold">
                DEMO
              </span>
            )}
          </div>
          <div className="text-[11px] text-muted-foreground font-body mt-0.5 truncate">
            {ev.sourceLabel} · {ev.status.replace(/_/g, ' ')} · {new Date(ev.lastUpdated).toLocaleString(lang === 'vi' ? 'vi-VN' : 'en-US')}
          </div>
          <div className="text-[11px] text-muted-foreground font-body">
            {lang === 'vi' ? 'Vị trí' : 'Location'}: {ev.location.lat.toFixed(4)}, {ev.location.lng.toFixed(4)}
            {' · '}{lang === 'vi' ? 'xác nhận' : 'confirmations'}: {ev.confirmationsCount}
          </div>
          {ev.description && (
            <div className="text-xs text-foreground/80 font-body mt-1 line-clamp-2">{ev.description}</div>
          )}
          <div className="text-[10px] text-muted-foreground font-body mt-1">
            {lang === 'vi' ? 'Quyền riêng tư' : 'Privacy'}: {ev.privacyLevel.replace(/_/g, ' ')}
          </div>
        </div>
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" className="flex-1 h-8 text-[11px] font-heading gap-1" onClick={onConfirm}>
          <ThumbsUp className="w-3 h-3" />
          {lang === 'vi' ? 'Tôi cũng thấy' : 'Confirm'}
        </Button>
        <Button size="sm" className="flex-1 h-8 text-[11px] font-heading gap-1" onClick={onAvoid}>
          <RouteIcon className="w-3 h-3" />
          {lang === 'vi' ? 'Tránh trong Smart Route' : 'Avoid in Smart Route'}
        </Button>
      </div>
    </div>
  );
}

function PlaceholderPanel({ lang, title, reason, schema, statusLabel }: {
  lang: 'vi' | 'en'; title: string; reason: string; schema?: string; statusLabel?: string;
}) {
  return (
    <div className="space-y-2">
      <div className="rounded-xl border border-dashed border-border bg-muted/30 p-4">
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck className="w-4 h-4 text-muted-foreground" />
          <p className="text-sm font-heading font-bold text-foreground">{title}</p>
          <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-heading font-bold uppercase">
            {statusLabel ?? (lang === 'vi' ? 'Chưa kết nối' : 'Not connected')}
          </span>
        </div>
        <p className="text-xs text-muted-foreground font-body leading-relaxed">{reason}</p>
      </div>
      {schema && (
        <pre className="text-[10px] bg-muted/40 rounded-lg p-3 overflow-x-auto font-mono text-muted-foreground">
          {schema}
        </pre>
      )}
    </div>
  );
}

const CivicHotspots = () => {
  const { lang } = useOutletContext<{ lang: 'vi' | 'en' }>();
  const { stations } = useWaqiStations();
  const { location } = useLiveAirContext();
  const navigate = useNavigate();

  const reportsQuery = useQuery({
    queryKey: ['hotspot-community-reports'],
    queryFn: () => hotspotIntelligenceService.loadCommunityReports(),
    staleTime: 60_000,
  });

  const liveEvents = useMemo(() => {
    const reports = (reportsQuery.data ?? []) as never;
    return hotspotIntelligenceService.buildFromReports(
      reports,
      (stations ?? []).map((s) => ({
        uid: s.id, lat: s.lat, lng: s.lng, aqi: s.aqi, station: s.name,
      }))
    );
  }, [reportsQuery.data, stations]);

  const demoEvents = useMemo(
    () => (USE_DEMO_DATA ? getDemoHotspots({ lat: location.lat, lng: location.lng }) : []),
    [location.lat, location.lng]
  );

  const liveCommunity = liveEvents.filter(
    (e) => e.sourceType === 'community_report' || e.sourceType === 'gps_cluster'
  );
  const liveStation = liveEvents.filter((e) => e.sourceType === 'station_data');

  const demoCommunity = demoEvents.filter(
    (e) => e.sourceType === 'community_report' || e.sourceType === 'gps_cluster'
  );
  const demoStation = demoEvents.filter((e) => e.sourceType === 'station_data');

  const communityList = [...liveCommunity, ...demoCommunity];
  const stationList = [...liveStation, ...demoStation];

  const govStatus = governmentMetadataGateway.isEnabled() ? 'configured' : 'unavailable';
  const camStatus = cityCameraMetadataGateway.isEnabled() ? 'configured' : 'unavailable';

  const onAvoid = (ev: HotspotEvent) => {
    try {
      sessionStorage.setItem(
        'airweave.smart-route.avoid',
        JSON.stringify({ lat: ev.location.lat, lng: ev.location.lng, reason: ev.eventType, ts: Date.now() })
      );
    } catch { /* ignore */ }
    toast.success(
      lang === 'vi'
        ? 'Đã thêm vào danh sách tránh cho Smart Route.'
        : 'Added to Smart Route avoid list.'
    );
    navigate('/smart-route');
  };
  const onConfirm = (ev: HotspotEvent) => {
    toast.success(
      lang === 'vi'
        ? `Cảm ơn! Đã ghi nhận xác nhận của bạn (demo) cho điểm ${ev.eventType.replace(/_/g, ' ')}.`
        : `Thanks! Your confirmation (demo) was recorded for ${ev.eventType.replace(/_/g, ' ')}.`
    );
  };

  return (
    <div className="h-full overflow-y-auto bg-background">
      <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-4">
        <header>
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-primary" />
            <h1 className="font-heading text-xl md:text-2xl font-bold text-foreground">
              Civic Hotspot Intelligence
            </h1>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground font-body mt-1">
            {lang === 'vi'
              ? 'Lớp hợp nhất phát hiện điểm nóng ô nhiễm từ cộng đồng, trạm AQI và đối tác — không xử lý video thô, không nhận diện khuôn mặt, không lưu biển số.'
              : 'Data fusion layer that detects pollution hotspots from community, AQI stations and partners — never processes raw video, faces or license plates.'}
          </p>
        </header>

        <div className="rounded-xl border border-border bg-card/60 p-3 flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-primary mt-0.5 shrink-0" />
          <p className="text-[11px] text-muted-foreground font-body leading-relaxed">
            {lang === 'vi'
              ? 'Nguồn dữ liệu: Người dùng báo cáo · Dữ liệu trạm (nếu khả dụng) · Cảm biến đối tác · Chính phủ / Camera đô thị (chưa kết nối). Bản demo có dán nhãn DEMO rõ ràng.'
              : 'Sources: User reports · Station data (if available) · Partner sensors · Government / city cameras (not connected). Demo items are clearly labelled.'}
          </p>
        </div>

        <Tabs defaultValue="community" className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 h-auto">
            <TabsTrigger value="community" className="gap-1.5 text-[11px]"><Users className="w-3.5 h-3.5" />{lang === 'vi' ? 'Cộng đồng' : 'Community'}</TabsTrigger>
            <TabsTrigger value="station" className="gap-1.5 text-[11px]"><Radio className="w-3.5 h-3.5" />{lang === 'vi' ? 'Trạm' : 'Station'}</TabsTrigger>
            <TabsTrigger value="partner" className="gap-1.5 text-[11px]"><Database className="w-3.5 h-3.5" />Partner</TabsTrigger>
            <TabsTrigger value="gov" className="gap-1.5 text-[11px]"><Building2 className="w-3.5 h-3.5" />Gov API</TabsTrigger>
            <TabsTrigger value="camera" className="gap-1.5 text-[11px]"><Camera className="w-3.5 h-3.5" />Camera</TabsTrigger>
          </TabsList>

          <TabsContent value="community" className="space-y-2 mt-3">
            {communityList.length === 0 && (
              <p className="text-xs text-muted-foreground font-body text-center py-6">
                {lang === 'vi' ? 'Chưa có báo cáo cộng đồng còn hiệu lực.' : 'No active community reports.'}
              </p>
            )}
            {communityList.map((e) => (
              <HotspotCard key={e.id} ev={e} lang={lang} onAvoid={() => onAvoid(e)} onConfirm={() => onConfirm(e)} />
            ))}
          </TabsContent>

          <TabsContent value="station" className="space-y-2 mt-3">
            {stationList.length === 0 && (
              <p className="text-xs text-muted-foreground font-body text-center py-6 flex flex-col items-center gap-1">
                <AlertTriangle className="w-4 h-4" />
                {lang === 'vi' ? 'Không có trạm WAQI nào đang bất thường (AQI ≥ 200).' : 'No WAQI stations currently anomalous (AQI ≥ 200).'}
              </p>
            )}
            {stationList.map((e) => (
              <HotspotCard key={e.id} ev={e} lang={lang} onAvoid={() => onAvoid(e)} onConfirm={() => onConfirm(e)} />
            ))}
          </TabsContent>

          <TabsContent value="partner" className="mt-3">
            <PlaceholderPanel
              lang={lang}
              title={lang === 'vi' ? 'Partner Sensor Metadata Placeholder' : 'Partner Sensor Metadata Placeholder'}
              reason={lang === 'vi'
                ? 'Chưa kết nối cảm biến đối tác. Cấu trúc sẵn sàng tiếp nhận dữ liệu vi vùng khi có đối tác chính thức.'
                : 'No partner sensor connected. Structure is ready to ingest micro-area data when an official partner is available.'}
            />
          </TabsContent>

          <TabsContent value="gov" className="mt-3">
            <PlaceholderPanel
              lang={lang}
              title={lang === 'vi' ? 'Government API Placeholder' : 'Government API Placeholder'}
              reason={lang === 'vi'
                ? 'Chưa kết nối dữ liệu chính thức từ cơ quan quản lý.'
                : 'Not connected to any official government data source.'}
              schema={`// Future schema (placeholder)
{
  event_id, source: "government_api",
  event_type, location_grid, district, ward,
  timestamp, confidence, privacy_level: "anonymized_metadata",
  raw_video: false, personal_data: false
}
// Status: ${govStatus}`}
            />
          </TabsContent>

          <TabsContent value="camera" className="mt-3">
            <PlaceholderPanel
              lang={lang}
              title={lang === 'vi' ? 'City AI Camera Metadata Placeholder' : 'City AI Camera Metadata Placeholder'}
              reason={lang === 'vi'
                ? 'Chưa kết nối metadata camera đô thị. AirWeave không xử lý video thô, không nhận diện khuôn mặt, không lưu biển số.'
                : 'Not connected to city AI camera metadata. AirWeave does NOT process raw video, faces or license plates.'}
              schema={`// Future schema (placeholder)
{
  event_id, source: "city_ai_camera_metadata",
  event_type, location_grid, timestamp, confidence,
  raw_video: false, face_data: false,
  license_plate_data: false,
  privacy_level: "anonymized_metadata"
}
// Status: ${camStatus}`}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default CivicHotspots;
