// Civic Hotspot Intelligence — data fusion model.
// Combines community reports, AQI stations, GPS clusters and (future) partner /
// government / city-camera metadata. NO raw video, faces, or license plates are
// ever processed or stored.

export type HotspotEventType =
  | 'construction_dust'
  | 'burning_smoke'
  | 'traffic_emission'
  | 'chemical_smell'
  | 'road_dust'
  | 'abnormal_air_quality'
  | 'unknown';

export type HotspotSourceType =
  | 'community_report'
  | 'station_data'
  | 'gps_cluster'
  | 'partner_sensor'
  | 'government_api_placeholder'
  | 'city_ai_camera_metadata_placeholder'
  | 'demo';

export type HotspotConfidence = 'low' | 'medium' | 'high';

export type HotspotStatus =
  | 'pending'
  | 'community_detected'
  | 'partner_detected'
  | 'government_metadata'
  | 'verified';

export type HotspotPrivacyLevel =
  | 'anonymized_metadata'
  | 'aggregated_data'
  | 'user_submitted'
  | 'unavailable';

export interface HotspotLocation {
  lat: number;
  lng: number;
  gridCellId: string;
  district?: string;
  ward?: string;
}

export interface HotspotEvent {
  id: string;
  eventType: HotspotEventType;
  location: HotspotLocation;
  sourceType: HotspotSourceType;
  sourceLabel: string;
  confidence: HotspotConfidence;
  status: HotspotStatus;
  timestamp: string;       // ISO
  lastUpdated: string;     // ISO
  description?: string;
  confirmationsCount: number;
  isDemo: boolean;
  privacyLevel: HotspotPrivacyLevel;
}

// --- Future government API metadata schema (placeholder only, not live) ---
export interface GovernmentMetadataEvent {
  event_id: string;
  source: 'government_api';
  event_type: 'traffic_congestion' | 'smoke' | 'construction_dust' | 'abnormal_air_quality';
  location_grid: string;
  district: string;
  ward: string;
  timestamp: string;
  confidence: HotspotConfidence;
  privacy_level: 'anonymized_metadata';
  raw_video: false;
  personal_data: false;
}

// --- Future city AI camera metadata schema (placeholder only) ---
export interface CityCameraMetadataEvent {
  event_id: string;
  source: 'city_ai_camera_metadata';
  event_type: 'traffic_congestion' | 'smoke_detected' | 'dust_detected';
  location_grid: string;
  timestamp: string;
  confidence: HotspotConfidence;
  raw_video: false;
  face_data: false;
  license_plate_data: false;
  privacy_level: 'anonymized_metadata';
}

// --- Future partner clean-route API ---
export interface CleanRoutePartnerAPI {
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  recommendedWaypoints: { lat: number; lng: number }[];
  avoidHotspots: string[]; // HotspotEvent ids
  routeAirScore: number;
  userRiskProfile: 'low' | 'medium' | 'high';
  timestamp: string;
}

export interface GatewayStatus<T = unknown> {
  status: 'unavailable' | 'configured' | 'live';
  reason?: string;
  data?: T[];
}
