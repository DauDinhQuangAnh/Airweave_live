/**
 * Centralized TanStack Query key factory.
 *
 * Lợi ích:
 * - Tránh string duplication → không bao giờ typo query key
 * - Hỗ trợ invalidation chính xác (scope theo user, location, v.v.)
 * - Dễ tìm kiếm trong codebase: grep "queryKeys.air" thay vì grep string
 *
 * Cách dùng:
 *   useQuery({ queryKey: queryKeys.air.current(lat, lng), queryFn: ... })
 *   queryClient.invalidateQueries({ queryKey: queryKeys.air.all() })
 */

export const queryKeys = {
  // ---------- Auth & Profile ----------
  auth: {
    me: () => ['auth', 'me'] as const,
    loginHistory: (limit?: number) => ['auth', 'login-history', limit] as const,
  },

  profiles: {
    all: () => ['profiles'] as const,
    me: () => ['profiles', 'me'] as const,
  },

  preferences: {
    all: () => ['preferences'] as const,
    me: () => ['preferences', 'me'] as const,
  },

  locations: {
    all: () => ['locations'] as const,
    list: () => ['locations', 'list'] as const,
  },

  liveContext: {
    all: () => ['live-context'] as const,
    me: () => ['live-context', 'me'] as const,
  },

  // ---------- Air Quality ----------
  air: {
    all: () => ['air'] as const,
    current: (lat: number, lng: number) => ['air', 'current', lat, lng] as const,
    history: (lat: number, lng: number, days: number) => ['air', 'history', lat, lng, days] as const,
    ranking: () => ['air', 'ranking'] as const,
    waqiPoint: (lat: number, lng: number) => ['air', 'waqi', 'point', lat, lng] as const,
    waqiBounds: (lat1: number, lng1: number, lat2: number, lng2: number) =>
      ['air', 'waqi', 'bounds', lat1, lng1, lat2, lng2] as const,
  },

  // ---------- Community ----------
  community: {
    all: () => ['community'] as const,
    active: (bbox?: object) => ['community', 'active', bbox ?? 'global'] as const,
    mine: () => ['community', 'mine'] as const,
  },

  // ---------- Medical ----------
  medical: {
    all: () => ['medical'] as const,
    profiles: () => ['medical', 'profiles'] as const,
    profilesWithConditions: () => ['medical', 'profiles', 'with-conditions'] as const,
    conditions: (profileId?: string) => ['medical', 'conditions', profileId ?? 'all'] as const,
  },

  // ---------- SOS ----------
  sos: {
    all: () => ['sos'] as const,
    events: () => ['sos', 'events'] as const,
    share: (token: string) => ['sos', 'share', token] as const,
  },

  // ---------- Config keys ----------
  config: {
    windyKey: () => ['config', 'windy-key'] as const,
    mapboxToken: () => ['config', 'mapbox-token'] as const,
    onesignal: () => ['config', 'onesignal'] as const,
  },

  // ---------- AI ----------
  ai: {
    insight: (locationLabel?: string) => ['ai', 'insight', locationLabel ?? ''] as const,
  },
} as const;
