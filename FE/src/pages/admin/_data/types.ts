/**
 * Kiểu dữ liệu CHUẨN HOÁ cho toàn bộ Admin Portal.
 *
 * Đây là "một nguồn sự thật" duy nhất: cả dữ liệu DEMO (hardcode) lẫn dữ liệu
 * LIVE (lấy từ API) đều được đưa về đúng các shape dưới đây trước khi render,
 * nhờ vậy các component không cần biết đang ở chế độ nào.
 *
 * Khi bật LIVE, tầng `normalize.ts` chịu trách nhiệm map response thô của BE
 * (shape trong nodes.service.ts + Prisma) về đúng các interface này.
 */

export type NodeEdition = 'outdoor' | 'indoor';

/** Trạng thái thiết bị — khớp Prisma iot_nodes.status (online | offline | maintenance). */
export type NodeStatus = 'online' | 'offline' | 'maintenance';

export interface AdminNode {
  id: string;
  chip_id: string;
  name: string;

  /** Khoá phiên bản đã chuẩn hoá (BE lưu 'outdoor_solar' | 'indoor_grid'). */
  edition: NodeEdition;
  /** Nhãn hiển thị, ví dụ '☀️ Outdoor Solar Edition'. */
  editionLabel: string;
  editionShortLabel: string;

  location_name: string;
  organization_id: string | null;
  organization_name: string | null;

  status: NodeStatus;

  // Telemetry mới nhất — có thể null ở LIVE khi node chưa có bản đo nào.
  aqi: number | null;
  pm25: number | null;
  pm10: number | null;
  temperature: number | null;
  humidity: number | null;
  co2: number | null;
  voc_index: number | null;
  uv_index: number | null;

  battery: number;
  rssi: number;

  // Thông số phần cứng (suy ra từ phiên bản qua HARDWARE_SPEC).
  mcu: string;
  power_source: string;
  sensors: string[];
  hardware_ver?: string;

  lat?: number;
  lng?: number;
  last_reading_at?: string | null;
}

export interface AdminOrg {
  id: string;
  name: string;
  code: string;
  type: string; // gov | school | hospital | office | enterprise | industrial | residential
  address: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  nodesCount: number;
  usersCount: number;
  /** Không có trong Prisma — placeholder cho tới khi BE bổ sung cột gói dịch vụ. */
  plan_tier: string;
  status: string; // active | suspended
}

export interface AdminStats {
  totalNodes: number;
  onlineNodes: number;
  offlineNodes: number;
  maintenanceNodes: number;
  totalOrgs: number;
  avgAqi: number;
  totalTelemetry24h: number | null;
  isSimulating: boolean;
  ingestConfigured: boolean;
}

// ---------- Alerts & API Keys (hiện DEMO-ONLY, chưa có endpoint BE) ----------

export interface AlertConfig {
  aqiWarning: number;
  aqiHazardous: number;
  vocThreshold: number;
  co2Threshold: number;
  autoPush: boolean;
  autoSmsEmergency: boolean;
}

export interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  full_secret: string;
  created_at: string;
  scope: string;
  status: 'active' | 'revoked';
  ip_whitelist: string;
  revocation_history: string;
}
