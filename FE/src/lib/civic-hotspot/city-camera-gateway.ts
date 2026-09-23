// Future city AI camera *metadata* gateway. AirWeave never receives raw video,
// faces, or license plates. This module only accepts pre-anonymized metadata
// events when a real partner endpoint is configured.
import type { CityCameraMetadataEvent, GatewayStatus } from './types';

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
    // A supplied URL is not proof that edge metadata is being ingested.
    return false;
  },

  async fetchEvents(): Promise<GatewayStatus<CityCameraMetadataEvent>> {
    return {
      status: 'unavailable',
      reason: 'Chưa triển khai kết nối metadata camera với đối tác.',
      data: [],
    };
  },

  accept(event: CityCameraMetadataEvent): boolean {
    return assertSafe(event);
  },

};
