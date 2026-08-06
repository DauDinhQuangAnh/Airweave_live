/**
 * AirWeave global app-mode configuration.
 *
 * Prototype mode keeps the demo flow smooth: no repeated consent popups,
 * no full-screen privacy gates, no blocking modals — replaced with short
 * inline notices and one-time confirmations only for SOS / external handoff.
 *
 * Safety boundaries that always remain:
 *  - SOS still requires an explicit per-event confirmation.
 *  - Mobility handoff never shares Health Profile / Medical ID.
 *  - Government & city-camera data stay placeholder unless real API is configured.
 *  - No raw camera video, faces or license plates are processed anywhere.
 */

export const APP_MODE = 'prototype' as const;
export const PRIVACY_MODE = 'lightweight' as const;
export const USE_DEMO_DATA = true;

export const isPrototype = () => APP_MODE === 'prototype';
export const isLightweightPrivacy = () => PRIVACY_MODE === 'lightweight';

/** Short inline notices used across the app to replace long privacy screens. */
export const INLINE_NOTICES = {
  gps: {
    vi: 'Vị trí chỉ được dùng để hiển thị AQI gần bạn, gợi ý tuyến đường sạch hơn và hỗ trợ SOS trong bản demo.',
    en: 'Your location is used only to show nearby AQI, suggest cleaner routes and assist SOS in this demo.',
  },
  health: {
    vi: 'Hồ sơ sức khỏe giúp AirWeave cá nhân hóa cảnh báo AQI. Bản demo không chia sẻ dữ liệu này cho bên thứ ba.',
    en: 'Your health profile personalises AQI alerts. This demo never shares it with third parties.',
  },
  sos: {
    vi: 'Bạn có muốn chia sẻ vị trí hiện tại và Medical ID demo cho liên hệ khẩn cấp không?',
    en: 'Share your current location and demo Medical ID with your emergency contact?',
  },
  mobility: {
    vi: 'AirWeave chỉ chuyển điểm đi, điểm đến hoặc waypoint tuyến đường. Hồ sơ sức khỏe và Medical ID không được chia sẻ.',
    en: 'AirWeave only passes origin, destination or route waypoints. Health profile and Medical ID are never shared.',
  },
} as const;
