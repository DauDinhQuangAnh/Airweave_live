// Future government open-data gateway. Returns "unavailable" until a real
// endpoint is configured via env. NEVER fabricate data.
import type { GatewayStatus, GovernmentMetadataEvent } from './types';

const GOV_API_BASE_URL = (import.meta.env.VITE_GOV_API_BASE_URL as string) || '';
const GOV_API_KEY = (import.meta.env.VITE_GOV_API_KEY as string) || '';
const GOV_API_ENABLED = (import.meta.env.VITE_GOV_API_ENABLED as string) === 'true';

export const governmentMetadataGateway = {
  isEnabled(): boolean {
    return GOV_API_ENABLED && Boolean(GOV_API_BASE_URL);
  },

  async fetchEvents(): Promise<GatewayStatus<GovernmentMetadataEvent>> {
    if (!this.isEnabled()) {
      return {
        status: 'unavailable',
        reason:
          'Chưa kết nối dữ liệu chính thức. Đây là cấu trúc sẵn sàng tích hợp khi có cơ quan quản lý cho phép.',
        data: [],
      };
    }
    // Real integration would go here. Intentionally not implemented to avoid
    // any chance of returning fake government data.
    return { status: 'configured', data: [] };
  },

  configHint: {
    GOV_API_BASE_URL: GOV_API_BASE_URL ? 'set' : 'unset',
    GOV_API_KEY: GOV_API_KEY ? 'set' : 'unset',
    GOV_API_ENABLED,
  },
};
