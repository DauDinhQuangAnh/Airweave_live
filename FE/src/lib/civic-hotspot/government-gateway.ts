// Future government open-data gateway. Returns "unavailable" until a real
// endpoint is configured via env. NEVER fabricate data.
import type { GatewayStatus, GovernmentMetadataEvent } from './types';

export const governmentMetadataGateway = {
  isEnabled(): boolean {
    // Configuration alone does not establish a working ingestion integration.
    return false;
  },

  async fetchEvents(): Promise<GatewayStatus<GovernmentMetadataEvent>> {
    return {
      status: 'unavailable',
      reason: 'Chưa triển khai kết nối dữ liệu chính thức với cơ quan quản lý.',
      data: [],
    };
  },

};
