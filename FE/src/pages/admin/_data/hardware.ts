/**
 * Thông số phần cứng chuẩn theo 2 phiên bản AirWeave Node.
 * Nguồn: IOT_NODE_HARDWARE_SPECIFICATION.md.
 *
 * BE (Prisma) hiện KHÔNG lưu danh mục cảm biến / MCU cho từng node — chỉ lưu
 * `edition` ('outdoor_solar' | 'indoor_grid') và `hardware_ver`. Vì vậy tầng
 * normalize suy ra sensors/mcu/power_source từ bảng tra cứu này, đảm bảo DEMO và
 * LIVE hiển thị nhất quán.
 */

import type { NodeEdition } from './types';

export const HARDWARE_SPEC = {
  outdoor: {
    label: '☀️ Outdoor Solar Edition',
    shortLabel: '☀️ Outdoor Solar',
    mcu: 'ESP32-S3 (Anten IPEX 8dBi)',
    powerSource: 'Solar Panel 5V/6W + 2x 18650 Battery (5200mAh)',
    hardwareVer: 'ESP32-Solar-v2.1',
    sensors: [
      'Winsen ZH03B Laser',
      'Sensirion SHT30',
      'Winsen ZE12A (CO/NO2/SO2/O3)',
      'UVM-30A UV Sensor',
    ],
  },
  indoor: {
    label: '🔌 Indoor Campus Grid Edition',
    shortLabel: '🔌 Indoor Campus Grid',
    mcu: 'ESP32-S3 (Dual-Core 240MHz)',
    powerSource: 'Nguồn điện lưới 220V (Adapter 5V/2A Type-C 24/7)',
    hardwareVer: 'ESP32-Grid-v2.1',
    sensors: [
      'Winsen ZH03B Laser',
      'Sensirion SHT30',
      'Winsen ZE12A',
      'Winsen MH-Z19C NDIR CO2',
      'Sensirion SGP40 VOCs',
    ],
  },
} as const satisfies Record<NodeEdition, unknown>;

/**
 * Suy ra phiên bản đã chuẩn hoá từ 1 node thô (DEMO hoặc BE).
 * Ưu tiên `edition` → `edition_type` → dò trong `hardware_ver`.
 */
export function editionKeyFromNode(raw: {
  edition?: string | null;
  edition_type?: string | null;
  hardware_ver?: string | null;
}): NodeEdition {
  const e = (raw.edition ?? raw.edition_type ?? '').toLowerCase();
  if (e === 'indoor_grid' || e === 'indoor') return 'indoor';
  if (e === 'outdoor_solar' || e === 'outdoor') return 'outdoor';
  if (/grid|indoor/i.test(String(raw.hardware_ver ?? ''))) return 'indoor';
  return 'outdoor';
}
