/**
 * Map response THÔ của BE về shape đã chuẩn hoá cho Admin Portal.
 *
 * Đối chiếu shape BE:
 *  - Node:  nodes.service.ts → shapeNode() + Prisma iot_nodes / iot_telemetry
 *  - Org:   listOrganizations() trả kèm _count.{nodes, users}
 *  - Stats: getAdminStats()
 */

import type { AdminNode, AdminOrg, AdminStats, NodeStatus } from './types';
import { HARDWARE_SPEC, editionKeyFromNode } from './hardware';

const num = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? v : v == null ? null : Number.isFinite(Number(v)) ? Number(v) : null;

function normalizeStatus(raw: unknown): NodeStatus {
  const s = String(raw ?? 'online').toLowerCase();
  if (s === 'offline') return 'offline';
  // BE dùng 'maintenance'; mock cũ dùng 'warning' → gộp về 'maintenance'.
  if (s === 'maintenance' || s === 'warning') return 'maintenance';
  return 'online';
}

export function normalizeNode(raw: any): AdminNode {
  const edition = editionKeyFromNode(raw);
  const spec = HARDWARE_SPEC[edition];

  // BE trả organization_name = 'Tự do (Chưa gán)' khi node chưa gán tổ chức.
  const orgId = raw.organization_id ?? null;
  const orgName = orgId ? raw.organization_name ?? null : null;

  return {
    id: raw.id ?? raw.chip_id,
    chip_id: raw.chip_id,
    name: raw.name ?? raw.chip_id,
    edition,
    editionLabel: spec.label,
    editionShortLabel: spec.shortLabel,
    location_name: raw.location_name || 'Chưa đặt tên vị trí',
    organization_id: orgId,
    organization_name: orgName,
    status: normalizeStatus(raw.status),
    aqi: num(raw.aqi),
    pm25: num(raw.pm25),
    pm10: num(raw.pm10),
    temperature: num(raw.temperature),
    humidity: num(raw.humidity),
    co2: num(raw.co2),
    voc_index: num(raw.voc_index),
    uv_index: num(raw.uv_index),
    battery: typeof raw.battery === 'number' ? raw.battery : 100,
    rssi: typeof raw.rssi === 'number' ? raw.rssi : -65,
    // Ưu tiên giá trị BE nếu có, ngược lại suy ra từ phiên bản.
    mcu: raw.mcu || spec.mcu,
    power_source: prettyPowerSource(raw.power_source) || spec.powerSource,
    sensors: Array.isArray(raw.sensors) && raw.sensors.length ? raw.sensors : [...spec.sensors],
    hardware_ver: raw.hardware_ver ?? spec.hardwareVer,
    lat: num(raw.lat) ?? undefined,
    lng: num(raw.lng) ?? undefined,
    last_reading_at: raw.last_reading_at ?? raw.last_seen_at ?? null,
  };
}

/** BE lưu power_source = 'solar' | 'grid' (rút gọn) → nhãn đầy đủ. */
function prettyPowerSource(v?: string | null): string | null {
  if (!v) return null;
  if (v === 'solar') return HARDWARE_SPEC.outdoor.powerSource;
  if (v === 'grid') return HARDWARE_SPEC.indoor.powerSource;
  return v; // đã là chuỗi mô tả sẵn (dữ liệu demo)
}

export function normalizeOrg(raw: any): AdminOrg {
  return {
    id: raw.id,
    name: raw.name,
    code: raw.code,
    type: raw.type ?? 'school',
    address: raw.address ?? null,
    contact_name: raw.contact_name ?? null,
    contact_phone: raw.contact_phone ?? null,
    nodesCount: raw._count?.nodes ?? raw.nodesCount ?? 0,
    usersCount: raw._count?.users ?? raw.usersCount ?? 0,
    plan_tier: raw.plan_tier ?? defaultPlanTier(raw.type),
    status: raw.status ?? 'active',
  };
}

/** Placeholder gói dịch vụ tới khi BE có cột thật (gov/industrial thường Enterprise). */
function defaultPlanTier(type?: string): string {
  return type === 'gov' || type === 'industrial' || type === 'enterprise'
    ? 'Enterprise'
    : 'Professional';
}

export function normalizeStats(raw: any): AdminStats {
  const totalNodes = raw.totalNodes ?? 0;
  const onlineNodes = raw.onlineNodes ?? 0;
  const offlineNodes = raw.offlineNodes ?? 0;
  return {
    totalNodes,
    onlineNodes,
    offlineNodes,
    maintenanceNodes:
      raw.maintenanceNodes ?? raw.warningNodes ?? Math.max(0, totalNodes - onlineNodes - offlineNodes),
    totalOrgs: raw.totalOrgs ?? 0,
    avgAqi: raw.avgAqi ?? 0,
    totalTelemetry24h: raw.totalTelemetry24h ?? null,
    isSimulating: !!raw.isSimulating,
    ingestConfigured: !!raw.ingestConfigured,
  };
}
