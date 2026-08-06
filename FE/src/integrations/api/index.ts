/**
 * Các service gọi AirWeave API, nhóm theo domain.
 * Import như sau: import { authApi, profilesApi } from '@/integrations/api';
 */
import { api, tokenStore, API_URL } from '@/lib/api-client';
import type {
  AuthSession,
  AuthUser,
  CommunityReport,
  LiveContext,
  LoginHistoryEntry,
  MedicalCondition,
  MedicalProfile,
  MedicalQrPayload,
  Profile,
  SosEvent,
  UserLocation,
  UserPreferences,
  WaqiBoundsResult,
  WaqiPointResult,
} from './types';

// ---------- Auth ----------

export const authApi = {
  async signUp(email: string, password: string, displayName?: string) {
    const session = await api.post<AuthSession>(
      '/auth/register',
      { email, password, display_name: displayName },
      { skipAuth: true },
    );
    tokenStore.set(session);
    return session;
  },

  async signIn(email: string, password: string) {
    const session = await api.post<AuthSession>(
      '/auth/login',
      { email, password },
      { skipAuth: true },
    );
    tokenStore.set(session);
    return session;
  },

  async demoLogin() {
    const session = await api.post<AuthSession>('/auth/demo-login', {}, { skipAuth: true });
    tokenStore.set(session);
    return session;
  },

  async signOut() {
    const refresh_token = tokenStore.getRefresh();
    try {
      await api.post('/auth/logout', { refresh_token });
    } finally {
      tokenStore.clear();
    }
  },

  /** Chuyển hướng sang Google — BE sẽ trả token về {FRONTEND_URL}/auth/callback#... */
  signInWithGoogle() {
    window.location.href = `${API_URL}/auth/google`;
  },

  me: () =>
    api.get<{
      id: string;
      email: string;
      provider: string;
      email_verified: boolean;
      created_at: string;
      last_login_at: string | null;
      profile: Profile | null;
      user_metadata: { display_name: string | null; avatar_url: string | null };
    }>('/auth/me'),

  changePassword: (current_password: string, new_password: string) =>
    api.post<{ success: boolean }>('/auth/change-password', { current_password, new_password }),

  loginHistory: (limit = 20) =>
    api.get<LoginHistoryEntry[]>('/auth/login-history', { query: { limit } }),
};

// ---------- Hồ sơ ----------

export const profilesApi = {
  me: () => api.get<Profile>('/profiles/me'),

  update: (patch: Partial<Omit<Profile, 'id' | 'user_id' | 'created_at' | 'updated_at'>>) =>
    api.patch<Profile>('/profiles/me', patch),

  completeOnboarding: () => api.post<Profile>('/profiles/me/complete-onboarding'),

  uploadAvatar: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post<{ avatar_url: string; profile: Profile }>('/profiles/me/avatar', form);
  },

  deleteAccount: () => api.delete<{ success: boolean }>('/profiles/me'),
};

// ---------- Tuỳ chọn ----------

export const preferencesApi = {
  get: () => api.get<UserPreferences | null>('/preferences'),
  upsert: (patch: Partial<UserPreferences>) => api.put<UserPreferences>('/preferences', patch),
  markAlertSent: (last_alert_aqi?: number) =>
    api.post<UserPreferences>('/preferences/mark-alert-sent', { last_alert_aqi }),
  remove: () => api.delete<{ success: boolean }>('/preferences'),
};

// ---------- Địa điểm ----------

export const locationsApi = {
  list: () => api.get<UserLocation[]>('/locations'),
  upsert: (payload: {
    location_type: 'home' | 'work' | 'school';
    label: string;
    lat: number;
    lng: number;
  }) => api.post<UserLocation>('/locations', payload),
  update: (id: string, patch: { label?: string; lat?: number; lng?: number }) =>
    api.patch<UserLocation>(`/locations/${id}`, patch),
  remove: (id: string) => api.delete<{ success: boolean }>(`/locations/${id}`),
};

// ---------- Snapshot vị trí ----------

export const liveContextApi = {
  get: () => api.get<LiveContext | null>('/live-context'),
  upsert: (payload: Partial<LiveContext> & { lat: number; lng: number }) =>
    api.put<LiveContext>('/live-context', payload),
  remove: () => api.delete<{ success: boolean }>('/live-context'),
};

// ---------- Hồ sơ y tế ----------

export const medicalApi = {
  listProfiles: () => api.get<MedicalProfile[]>('/medical/profiles'),

  listProfilesWithConditions: () =>
    api.get<(MedicalProfile & { conditions: MedicalCondition[] })[]>('/medical/profiles', {
      query: { include: 'conditions' },
    }),

  createProfile: (payload: Partial<MedicalProfile> & { display_name: string }) =>
    api.post<MedicalProfile>('/medical/profiles', payload),

  updateProfile: (id: string, patch: Partial<MedicalProfile>) =>
    api.patch<MedicalProfile>(`/medical/profiles/${id}`, patch),

  removeProfile: (id: string) => api.delete<{ success: boolean }>(`/medical/profiles/${id}`),

  listConditions: (profileId?: string) =>
    api.get<MedicalCondition[]>('/medical/conditions', { query: { profile_id: profileId } }),

  toggleCondition: (profile_id: string, category: string, code: string, note?: string) =>
    api.post<{ action: 'added' | 'removed'; condition: MedicalCondition }>(
      '/medical/conditions/toggle',
      { profile_id, category, code, note },
    ),

  setConditionNote: (profile_id: string, category: string, code: string, note: string) =>
    api.put<MedicalCondition>('/medical/conditions/note', { profile_id, category, code, note }),

  removeCondition: (id: string) => api.delete<{ success: boolean }>(`/medical/conditions/${id}`),
};

// ---------- SOS ----------

export const sosApi = {
  trigger: (payload: {
    profile_id: string;
    lat?: number;
    lng?: number;
    aqi?: number;
    pm25?: number;
    ttl_hours?: number;
  }) => api.post<SosEvent>('/sos/events', payload),

  list: () => api.get<SosEvent[]>('/sos/events'),

  remove: (id: string) => api.delete<{ success: boolean }>(`/sos/events/${id}`),

  /** Công khai — không cần đăng nhập, dùng cho trang quét QR. */
  byShareToken: (token: string) =>
    api.get<MedicalQrPayload>(`/sos/share/${token}`, { skipAuth: true }),
};

// ---------- Báo cáo cộng đồng ----------

export const communityApi = {
  listActive: (bbox?: { lat1: number; lng1: number; lat2: number; lng2: number }, limit = 200) =>
    api.get<CommunityReport[]>('/community-reports', { query: { ...bbox, limit } }),

  listMine: () => api.get<CommunityReport[]>('/community-reports/mine'),

  create: (payload: {
    lat: number;
    lng: number;
    kind?: string;
    text?: string;
    ttl_minutes?: number;
  }) => api.post<CommunityReport>('/community-reports', payload),

  update: (id: string, patch: { kind?: string; text?: string }) =>
    api.patch<CommunityReport>(`/community-reports/${id}`, patch),

  remove: (id: string) => api.delete<{ success: boolean }>(`/community-reports/${id}`),
};

// ---------- Dữ liệu không khí ----------

export const airApi = {
  waqiPoint: (lat: number, lng: number) => api.post<WaqiPointResult>('/air/waqi', { lat, lng }),

  waqiBounds: (lat1: number, lng1: number, lat2: number, lng2: number) =>
    api.post<WaqiBoundsResult>('/air/waqi/bounds', { lat1, lng1, lat2, lng2 }),

  current: (lat: number, lng: number) => api.get<any>('/air/current', { query: { lat, lng } }),

  history: (lat: number, lng: number, days = 7) =>
    api.get<any>('/air/history', { query: { lat, lng, days } }),

  ranking: () => api.get<any>('/air/ranking'),
};

// ---------- AI ----------

export const aiApi = {
  chat: (payload: {
    lang?: 'vi' | 'en';
    messages: { role: 'user' | 'assistant'; content: string }[];
    context?: Record<string, unknown>;
  }) => api.post<{ reply: string; provider: string }>('/ai/chat', payload),

  insight: (payload: {
    lang?: 'vi' | 'en';
    location?: { label?: string };
    weather?: Record<string, unknown>;
    preferences?: Record<string, unknown>;
  }) => api.post<{ insight: string; provider: string }>('/ai/insight', payload),
};

// ---------- Thông báo & khoá cấu hình ----------

export const notificationsApi = {
  push: (payload: {
    title: string;
    message: string;
    userIds?: string[];
    data?: Record<string, unknown>;
  }) => api.post<{ success: boolean; id?: string }>('/notifications/push', payload),
};

export const configApi = {
  windyKey: () => api.get<{ key: string }>('/config/windy-key'),
  mapboxToken: () => api.get<{ token: string }>('/config/mapbox-token'),
  onesignal: () => api.get<{ appId: string | null }>('/config/onesignal'),
};

export type { AuthUser };
export * from './types';
