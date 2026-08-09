/**
 * Dữ liệu DEMO (hardcode) cho Admin Portal — đã ở đúng shape chuẩn hoá.
 *
 * Đây là nơi DUY NHẤT chứa mock. Các trang admin import từ đây (không còn export
 * mock rải rác trong từng page nữa). Khi ở chế độ DEMO, hook trả thẳng các mảng
 * này; khi LIVE, dữ liệu API được normalize về cùng shape rồi thay thế.
 */

import type { AdminNode, AdminOrg, AdminStats, AlertConfig, ApiKey } from './types';
import { HARDWARE_SPEC } from './hardware';

type NodeSeed = Pick<
  AdminNode,
  'id' | 'chip_id' | 'name' | 'edition' | 'location_name' | 'organization_id' | 'organization_name' | 'status'
> &
  Partial<AdminNode>;

/** Bơm đầy sensors/mcu/power_source theo phiên bản để mock giống hệt LIVE. */
function mkNode(seed: NodeSeed): AdminNode {
  const spec = HARDWARE_SPEC[seed.edition];
  return {
    editionLabel: spec.label,
    editionShortLabel: spec.shortLabel,
    mcu: spec.mcu,
    power_source: spec.powerSource,
    sensors: [...spec.sensors],
    hardware_ver: spec.hardwareVer,
    aqi: 35,
    pm25: 14,
    pm10: 24,
    temperature: 30,
    humidity: 70,
    co2: seed.edition === 'indoor' ? 480 : null,
    voc_index: seed.edition === 'indoor' ? 60 : null,
    uv_index: seed.edition === 'outdoor' ? 6.5 : null,
    battery: 98,
    rssi: -55,
    ...seed,
  };
}

export const MOCK_NODES: AdminNode[] = [
  mkNode({ id: 'node-1', chip_id: 'AWNODE-HN01', name: 'Trạm Quan trắc Hoàn Kiếm', edition: 'outdoor', location_name: 'Phố đi bộ Hoàn Kiếm, Hà Nội', organization_id: 'org-1', organization_name: 'Sở TN&MT Hà Nội', status: 'online', aqi: 42, pm25: 18.5, pm10: 32, temperature: 29.5, humidity: 68, uv_index: 6.2, battery: 98, rssi: -58 }),
  mkNode({ id: 'node-2', chip_id: 'AWNODE-HN02', name: 'Trạm Cầu Giấy - ĐHQG', edition: 'indoor', location_name: 'Đại học Quốc gia Hà Nội', organization_id: 'org-3', organization_name: 'Đại học Quốc Gia Hà Nội', status: 'online', aqi: 78, pm25: 38.2, pm10: 64, temperature: 31, humidity: 62, co2: 520, voc_index: 110, battery: 100, rssi: -64 }),
  mkNode({ id: 'node-3', chip_id: 'AWNODE-HCM01', name: 'Trạm Q1 - Công viên 23/9', edition: 'outdoor', location_name: 'Công viên 23/9, Quận 1, TP.HCM', organization_id: 'org-2', organization_name: 'UBND TP. Hồ Chí Minh', status: 'online', aqi: 35, pm25: 14.2, pm10: 25, temperature: 32.5, humidity: 75, uv_index: 8.4, battery: 100, rssi: -52 }),
  mkNode({ id: 'node-4', chip_id: 'AWNODE-HCM02', name: 'Trạm Khu Công Nghệ Cao', edition: 'indoor', location_name: 'SHTP, Thủ Đức, TP.HCM', organization_id: 'org-4', organization_name: 'Khu Công Nghệ Cao TP.HCM', status: 'online', aqi: 125, pm25: 68, pm10: 95, temperature: 33, humidity: 58, co2: 780, voc_index: 240, battery: 100, rssi: -70 }),
  mkNode({ id: 'node-5', chip_id: 'AWNODE-BD01', name: 'Trạm KCN VSIP 1', edition: 'outdoor', location_name: 'KCN VSIP 1, Thuận An, Bình Dương', organization_id: 'org-5', organization_name: 'Ban Quản lý KCN Bình Dương', status: 'maintenance', aqi: 158, pm25: 85, pm10: 140, temperature: 34, humidity: 52, uv_index: 9.1, battery: 88, rssi: -75 }),
  mkNode({ id: 'node-6', chip_id: 'AWNODE-DN01', name: 'Trạm Hải Châu (Tự do)', edition: 'outdoor', location_name: 'Nguyễn Văn Linh, Hải Châu, Đà Nẵng', organization_id: null, organization_name: null, status: 'online', aqi: 28, pm25: 9.8, pm10: 16, temperature: 30, humidity: 70, uv_index: 7.2, battery: 96, rssi: -55 }),
  mkNode({ id: 'node-7', chip_id: 'AWNODE-HP01', name: 'Trạm Cảng Hải Phòng (Tự do)', edition: 'outdoor', location_name: 'Cảng Hoàng Diệu, Ngô Quyền, Hải Phòng', organization_id: null, organization_name: null, status: 'online', aqi: 88, pm25: 44.5, pm10: 72, temperature: 28.5, humidity: 82, uv_index: 5.5, battery: 78, rssi: -68 }),
  mkNode({ id: 'node-8', chip_id: 'AWNODE-CT01', name: 'Trạm Bến Ninh Kiều (Tự do)', edition: 'outdoor', location_name: 'Ninh Kiều, Cần Thơ', organization_id: null, organization_name: null, status: 'online', aqi: 32, pm25: 12, pm10: 22, temperature: 31.5, humidity: 78, uv_index: 8, battery: 94, rssi: -60 }),
  mkNode({ id: 'node-9', chip_id: 'AWNODE-TN01', name: 'Trạm KCN Sông Công (Tự do)', edition: 'indoor', location_name: 'KCN Sông Công 1, Thái Nguyên', organization_id: null, organization_name: null, status: 'offline', aqi: 95, pm25: 49, pm10: 78, temperature: 29, humidity: 65, co2: 610, voc_index: 160, battery: 12, rssi: -88 }),
  mkNode({ id: 'node-10', chip_id: 'AWNODE-VT01', name: 'Trạm Bãi Sau Vũng Tàu (Tự do)', edition: 'outdoor', location_name: 'Thùy Vân, TP. Vũng Tàu', organization_id: null, organization_name: null, status: 'online', aqi: 22, pm25: 7.5, pm10: 13, temperature: 29.8, humidity: 74, uv_index: 9.8, battery: 100, rssi: -50 }),
];

export const MOCK_ORGS: AdminOrg[] = [
  { id: 'org-1', name: 'Sở Tài nguyên & Môi trường Hà Nội', code: 'STNMT-HN', type: 'gov', address: 'Huỳnh Thúc Kháng, Đống Đa, Hà Nội', contact_name: 'Ông Nguyễn Văn An (Trưởng phòng Quản lý MT)', contact_phone: '024.3835.1234', nodesCount: 3, usersCount: 4, plan_tier: 'Enterprise', status: 'active' },
  { id: 'org-2', name: 'UBND Thành phố Hồ Chí Minh', code: 'UBND-TPHCM', type: 'gov', address: 'Lê Thánh Tôn, Bến Nghé, Quận 1, TP.HCM', contact_name: 'Bà Trần Thị Bình (Chánh Văn phòng)', contact_phone: '028.3829.5678', nodesCount: 2, usersCount: 3, plan_tier: 'Enterprise', status: 'active' },
  { id: 'org-3', name: 'Đại học Quốc gia Hà Nội', code: 'VNU-HN', type: 'school', address: '144 Xuân Thủy, Cầu Giấy, Hà Nội', contact_name: 'PGS.TS Phạm Văn Cường (Viện Môi trường)', contact_phone: '024.3754.7571', nodesCount: 2, usersCount: 5, plan_tier: 'Professional', status: 'active' },
  { id: 'org-4', name: 'Khu Công Nghệ Cao TP.HCM (SHTP)', code: 'SHTP-HCM', type: 'enterprise', address: 'Xa lộ Hà Nội, Tân Phú, Thủ Đức, TP.HCM', contact_name: 'Ông Lê Hoàng Dũng (Giám đốc Kỹ thuật)', contact_phone: '028.3736.0088', nodesCount: 3, usersCount: 6, plan_tier: 'Enterprise', status: 'active' },
  { id: 'org-5', name: 'Ban Quản lý KCN Bình Dương', code: 'BQLKCN-BD', type: 'industrial', address: 'Đại lộ Bình Dương, Thủ Dầu Một, Bình Dương', contact_name: 'Ông Vũ Minh Đức (Trưởng ban BQL)', contact_phone: '0274.3822.123', nodesCount: 2, usersCount: 3, plan_tier: 'Professional', status: 'active' },
];

export const MOCK_STATS: AdminStats = {
  totalNodes: 10,
  onlineNodes: 8,
  offlineNodes: 1,
  maintenanceNodes: 1,
  totalOrgs: 5,
  avgAqi: 60,
  totalTelemetry24h: 5760,
  isSimulating: true,
  ingestConfigured: false,
};

export const MOCK_ALERT_CONFIG: AlertConfig = {
  aqiWarning: 100,
  aqiHazardous: 150,
  vocThreshold: 200,
  co2Threshold: 800,
  autoPush: true,
  autoSmsEmergency: true,
};

export const MOCK_API_KEYS: ApiKey[] = [
  { id: 'key-1', name: 'ESP32 Nodes Hardware Master Key', prefix: 'awk_node_live_9f823...', full_secret: 'awk_node_live_9f823a4b9c1d0e2f3a4b5c6d7e8f9012', created_at: '2026-08-01', scope: 'Node Telemetry Ingest', status: 'active', ip_whitelist: '14.225.10.15, 113.160.22.4', revocation_history: 'Chưa có lịch sử thu hồi' },
  { id: 'key-2', name: 'MQTT Broker Auth Token', prefix: 'awk_mqtt_prod_77c12...', full_secret: 'awk_mqtt_prod_77c12d3e4f5a6b7c8d9e0f1a2b3c4d5e', created_at: '2026-08-02', scope: 'MQTT Pub/Sub Telemetry', status: 'active', ip_whitelist: 'Tất cả IP (MQTT Port 1883/8883)', revocation_history: 'Chưa có lịch sử thu hồi' },
  { id: 'key-3', name: 'Enterprise Organization API Access Token', prefix: 'awk_org_ent_11b54...', full_secret: 'awk_org_ent_11b54c3d2e1f0a9b8c7d6e5f4a3b2c1d', created_at: '2026-08-05', scope: 'REST API Org Read', status: 'active', ip_whitelist: '118.70.180.20', revocation_history: 'Thu hồi lần 1 vào 2026-07-28' },
];
