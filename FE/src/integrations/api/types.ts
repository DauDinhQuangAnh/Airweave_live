/** Kiểu dữ liệu trả về từ AirWeave API — giữ nguyên snake_case như bảng trong Postgres. */

export interface AuthUser {
  id: string;
  email: string;
  provider: string;
  display_name: string | null;
  avatar_url: string | null;
  onboarding_completed: boolean;
}

export interface AuthSession {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: 'Bearer';
  user: AuthUser;
}

export interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  date_of_birth: string | null;
  account_tier: string;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserPreferences {
  id: string;
  user_id: string;
  health_tier: string[];
  active_hours: string[];
  commute_type: string[];
  medical_history: string[];
  purifier_status: string;
  route_priority: string;
  alert_mode: string;
  sensitive_group: string;
  custom_sensitivity_note: string | null;
  not_sure: boolean;
  alert_threshold: number;
  high_exposure: boolean;
  affiliate_target: boolean;
  notify_enabled: boolean;
  quiet_hours_start: number;
  quiet_hours_end: number;
  last_alert_aqi: number | null;
  last_alert_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserLocation {
  id: string;
  user_id: string;
  location_type: 'home' | 'work' | 'school';
  label: string;
  lat: number;
  lng: number;
  created_at: string;
  updated_at: string;
}

export interface LiveContext {
  id: string;
  user_id: string;
  label: string | null;
  lat: number;
  lng: number;
  accuracy: number | null;
  aqi: number | null;
  pm25: number | null;
  pm10: number | null;
  temperature: number | null;
  humidity: number | null;
  wind_speed: number | null;
  wind_direction: string | null;
  source: string;
  station: string | null;
  snapshot_updated_at: string;
  created_at: string;
  updated_at: string;
}

export interface MedicalProfile {
  id: string;
  user_id: string;
  relation: string;
  display_name: string;
  birth_year: number | null;
  blood_type: string | null;
  emergency_phone: string | null;
  emergency_name: string | null;
  avatar_emoji: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface MedicalCondition {
  id: string;
  profile_id: string;
  user_id: string;
  category: string;
  code: string;
  note: string | null;
  created_at?: string;
}

export interface SosEvent {
  id: string;
  user_id: string;
  profile_id: string;
  lat: number | null;
  lng: number | null;
  aqi: number | null;
  pm25: number | null;
  share_token: string;
  triggered_at: string;
  expires_at: string;
  share_url?: string;
}

/** Payload công khai khi quét QR Medical ID. */
export interface MedicalQrPayload {
  event: {
    lat: number | null;
    lng: number | null;
    aqi: number | null;
    pm25: number | null;
    triggered_at: string;
    expires_at: string;
  };
  profile: {
    display_name: string;
    relation: string;
    birth_year: number | null;
    blood_type: string | null;
    emergency_phone: string | null;
    emergency_name: string | null;
    avatar_emoji: string | null;
  };
  conditions: { category: string; code: string; note: string | null }[];
}

export interface CommunityReport {
  id: string;
  lat: number;
  lng: number;
  kind: string;
  text: string | null;
  created_at: string;
  expires_at: string;
}

export interface LoginHistoryEntry {
  id: string;
  user_id: string;
  login_at: string;
  ip_address: string | null;
  user_agent: string | null;
}

export interface WaqiPointResult {
  source: 'waqi';
  available: boolean;
  reason?: string;
  aqi?: number;
  station?: string | null;
  distanceKm?: number | null;
  pm25?: number | null;
  pm10?: number | null;
  o3?: number | null;
  no2?: number | null;
  so2?: number | null;
  co?: number | null;
  temperature?: number | null;
  humidity?: number | null;
  wind?: number | null;
  dominantPollutant?: string | null;
  time?: string | null;
}

export interface WaqiStation {
  uid: number;
  lat: number;
  lng: number;
  aqi: number;
  station: string | null;
  time: string | null;
}

export interface WaqiBoundsResult {
  source: 'waqi';
  available: boolean;
  stations: WaqiStation[];
}
