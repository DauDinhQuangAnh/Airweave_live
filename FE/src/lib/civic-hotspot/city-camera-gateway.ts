// Future city AI camera *metadata* gateway. AirWeave never receives raw video,
// faces, or license plates. This module only accepts pre-anonymized metadata
// events when a real partner endpoint is configured.
import type { CityCameraMetadataEvent, GatewayStatus } from './types';

const CITY_CAMERA_METADATA_API_URL =
  (import.meta.env.VITE_CITY_CAMERA_METADATA_API_URL as string) || '';
const CITY_CAMERA_METADATA_API_KEY =
  (import.meta.env.VITE_CITY_CAMERA_METADATA_API_KEY as string) || '';
const CITY_CAMERA_METADATA_ENABLED =
  (import.meta.env.VITE_CITY_CAMERA_METADATA_ENABLED as string) === 'true';

function assertSafe(event: CityCameraMetadataEvent): boolean {
  return (
    event.raw_video === false &&
    event.face_data === false &&
    event.license_plate_data === false &&
    event.privacy_level === 'anonymized_metadata'
  );
}

export const cityCameraMetadataGateway = {
  isEnabled(): boolean {
    return CITY_CAMERA_METADATA_ENABLED && Boolean(CITY_CAMERA_METADATA_API_URL);
  },

  async fetchEvents(): Promise<GatewayStatus<CityCameraMetadataEvent>> {
    if (!this.isEnabled()) {
      return {
        status: 'unavailable',
        reason:
          'Chưa kết nối dữ liệu chính thức. Đây là cấu trúc sẵn sàng tích hợp khi có đối tác cho phép.',
        data: [],
      };
    }
    return { status: 'configured', data: [] };
  },

  accept(event: CityCameraMetadataEvent): boolean {
    return assertSafe(event);
  },

  configHint: {
    CITY_CAMERA_METADATA_API_URL: CITY_CAMERA_METADATA_API_URL ? 'set' : 'unset',
    CITY_CAMERA_METADATA_API_KEY: CITY_CAMERA_METADATA_API_KEY ? 'set' : 'unset',
    CITY_CAMERA_METADATA_ENABLED,
  },
};
