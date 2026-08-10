/**
 * Lớp "backend giả" cho chế độ Demo.
 *
 * Nhận (method, path, body, query) từ api-client và trả về dữ liệu hardcode/JSON.
 * Dữ liệu được nạp từ các file JSON trong ./data và giữ một bản sao có thể thay đổi
 * trong bộ nhớ, để các thao tác ghi (thêm/sửa/xoá địa điểm, báo cáo...) vẫn hoạt
 * động mượt trong suốt phiên demo (mất khi tải lại trang — đúng tính chất demo).
 *
 * Muốn mở rộng dữ liệu demo cho màn hình mới: thêm JSON vào ./data rồi khai báo
 * route tương ứng ở bảng ROUTES bên dưới. Route không khai báo sẽ trả về mặc định
 * an toàn (null / mảng rỗng / { success: true }) nên không màn hình nào bị lỗi.
 */
import identity from './data/identity.json';
import air from './data/air.json';
import social from './data/social.json';
import {
  DEMO_ACCESS_TOKEN,
  DEMO_REFRESH_TOKEN,
} from './demo-mode';

const clone = <T>(v: T): T =>
  typeof structuredClone === 'function' ? structuredClone(v) : JSON.parse(JSON.stringify(v));

// Bản sao có thể thay đổi trong bộ nhớ cho phiên demo.
const store = {
  profile: clone(identity.profile) as Record<string, any>,
  preferences: clone(identity.preferences) as Record<string, any>,
  locations: clone(identity.locations) as Record<string, any>[],
  liveContext: clone(identity.liveContext) as Record<string, any>,
  medicalProfiles: clone(social.medicalProfiles) as Record<string, any>[],
  conditions: clone(social.conditions) as Record<string, any>[],
  sosEvents: clone(social.sosEvents) as Record<string, any>[],
  communityReports: clone(social.communityReports) as Record<string, any>[],
  myCommunityReports: clone(social.myCommunityReports) as Record<string, any>[],
};

const nowIso = () => new Date().toISOString();
const genId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 10)}`;

type Ctx = {
  params: Record<string, string>;
  body: any;
  query: Record<string, any>;
};
type Handler = (ctx: Ctx) => unknown;

interface Route {
  method: string;
  regex: RegExp;
  keys: string[];
  handler: Handler;
}

/** Khai báo một route với template kiểu '/locations/:id'. */
function route(method: string, template: string, handler: Handler): Route {
  const keys: string[] = [];
  const pattern = template.replace(/:[^/]+/g, (m) => {
    keys.push(m.slice(1));
    return '([^/]+)';
  });
  return { method, regex: new RegExp(`^${pattern}$`), keys, handler };
}

// ---- Session giả dùng chung ----
const buildSession = () => ({
  access_token: DEMO_ACCESS_TOKEN,
  refresh_token: DEMO_REFRESH_TOKEN,
  expires_in: 3600,
  token_type: 'Bearer' as const,
  user: clone(identity.user),
});

const buildMe = () => ({
  id: identity.user.id,
  email: identity.user.email,
  provider: identity.user.provider,
  email_verified: true,
  created_at: store.profile.created_at,
  last_login_at: nowIso(),
  profile: clone(store.profile),
  user_metadata: {
    display_name: store.profile.display_name ?? null,
    avatar_url: store.profile.avatar_url ?? null,
  },
});

const ROUTES: Route[] = [
  // ----- Auth -----
  route('POST', '/auth/demo-login', () => buildSession()),
  route('GET', '/auth/me', () => buildMe()),
  route('POST', '/auth/logout', () => ({})),
  route('POST', '/auth/change-password', () => ({ success: true })),
  route('GET', '/auth/login-history', () => clone(identity.loginHistory)),

  // ----- Hồ sơ -----
  route('GET', '/profiles/me', () => clone(store.profile)),
  route('PATCH', '/profiles/me', ({ body }) => {
    Object.assign(store.profile, body ?? {}, { updated_at: nowIso() });
    return clone(store.profile);
  }),
  route('POST', '/profiles/me/complete-onboarding', () => {
    store.profile.onboarding_completed = true;
    store.profile.updated_at = nowIso();
    return clone(store.profile);
  }),
  route('POST', '/profiles/me/avatar', () => ({
    avatar_url: store.profile.avatar_url ?? '',
    profile: clone(store.profile),
  })),
  route('DELETE', '/profiles/me', () => ({ success: true })),

  // ----- Tuỳ chọn -----
  route('GET', '/preferences', () => clone(store.preferences)),
  route('PUT', '/preferences', ({ body }) => {
    Object.assign(store.preferences, body ?? {}, { updated_at: nowIso() });
    return clone(store.preferences);
  }),
  route('POST', '/preferences/mark-alert-sent', ({ body }) => {
    store.preferences.last_alert_aqi = body?.aqi ?? store.preferences.last_alert_aqi;
    store.preferences.last_alert_at = nowIso();
    return clone(store.preferences);
  }),
  route('DELETE', '/preferences', () => ({ success: true })),

  // ----- Địa điểm -----
  route('GET', '/locations', () => clone(store.locations)),
  route('POST', '/locations', ({ body }) => {
    const item = {
      id: genId('demo-loc'),
      user_id: identity.user.id,
      location_type: body?.location_type ?? 'home',
      label: body?.label ?? 'Địa điểm mới',
      lat: body?.lat ?? 0,
      lng: body?.lng ?? 0,
      created_at: nowIso(),
      updated_at: nowIso(),
    };
    store.locations.push(item);
    return clone(item);
  }),
  route('PATCH', '/locations/:id', ({ params, body }) => {
    const item = store.locations.find((l) => l.id === params.id);
    if (item) Object.assign(item, body ?? {}, { updated_at: nowIso() });
    return clone(item ?? {});
  }),
  route('DELETE', '/locations/:id', ({ params }) => {
    store.locations = store.locations.filter((l) => l.id !== params.id);
    return { success: true };
  }),

  // ----- Ngữ cảnh trực tiếp -----
  route('GET', '/live-context', () => clone(store.liveContext)),
  route('PUT', '/live-context', ({ body }) => {
    Object.assign(store.liveContext, body ?? {}, { updated_at: nowIso() });
    return clone(store.liveContext);
  }),
  route('DELETE', '/live-context', () => ({ success: true })),

  // ----- Không khí -----
  route('POST', '/air/waqi', () => clone(air.waqiPoint)),
  route('POST', '/air/waqi/bounds', () => ({
    source: 'waqi' as const,
    available: true,
    stations: clone(air.stations),
  })),
  route('GET', '/air/current', () => clone(air.current)),
  route('GET', '/air/history', () => clone(air.history)),
  route('GET', '/air/ranking', () => clone(air.ranking)),

  // ----- Cộng đồng -----
  route('GET', '/community-reports/mine', () => clone(store.myCommunityReports)),
  route('GET', '/community-reports', () => clone(store.communityReports)),
  route('POST', '/community-reports', ({ body }) => {
    const item = {
      id: genId('demo-report'),
      lat: body?.lat ?? 0,
      lng: body?.lng ?? 0,
      kind: body?.kind ?? 'other',
      text: body?.text ?? null,
      created_at: nowIso(),
      expires_at: new Date(Date.now() + 6 * 3600 * 1000).toISOString(),
    };
    store.communityReports.unshift(item);
    store.myCommunityReports.unshift(clone(item));
    return clone(item);
  }),
  route('PATCH', '/community-reports/:id', ({ params, body }) => {
    const item = store.communityReports.find((r) => r.id === params.id);
    if (item) Object.assign(item, body ?? {});
    return clone(item ?? {});
  }),
  route('DELETE', '/community-reports/:id', ({ params }) => {
    store.communityReports = store.communityReports.filter((r) => r.id !== params.id);
    store.myCommunityReports = store.myCommunityReports.filter((r) => r.id !== params.id);
    return { success: true };
  }),

  // ----- Y tế -----
  route('GET', '/medical/profiles', () => clone(store.medicalProfiles)),
  route('POST', '/medical/profiles', ({ body }) => {
    const item = {
      id: genId('demo-med'),
      user_id: identity.user.id,
      relation: body?.relation ?? 'other',
      display_name: body?.display_name ?? 'Thành viên mới',
      birth_year: body?.birth_year ?? null,
      blood_type: body?.blood_type ?? null,
      emergency_phone: body?.emergency_phone ?? null,
      emergency_name: body?.emergency_name ?? null,
      avatar_emoji: body?.avatar_emoji ?? '🧑',
      created_at: nowIso(),
      updated_at: nowIso(),
      conditions: [],
    };
    store.medicalProfiles.push(item);
    return clone(item);
  }),
  route('PATCH', '/medical/profiles/:id', ({ params, body }) => {
    const item = store.medicalProfiles.find((p) => p.id === params.id);
    if (item) Object.assign(item, body ?? {}, { updated_at: nowIso() });
    return clone(item ?? {});
  }),
  route('DELETE', '/medical/profiles/:id', ({ params }) => {
    store.medicalProfiles = store.medicalProfiles.filter((p) => p.id !== params.id);
    return { success: true };
  }),
  route('GET', '/medical/conditions', () => clone(store.conditions)),
  route('PUT', '/medical/conditions/note', ({ body }) => {
    const existing = store.conditions.find(
      (c) => c.profile_id === body?.profile_id && c.code === body?.code,
    );
    if (existing) {
      existing.note = body?.note ?? existing.note;
      return clone(existing);
    }
    const item = {
      id: genId('demo-cond'),
      profile_id: body?.profile_id ?? 'demo-med-self',
      user_id: identity.user.id,
      category: body?.category ?? 'other',
      code: body?.code ?? 'note',
      note: body?.note ?? null,
      created_at: nowIso(),
    };
    store.conditions.push(item);
    return clone(item);
  }),
  route('DELETE', '/medical/conditions/:id', ({ params }) => {
    store.conditions = store.conditions.filter((c) => c.id !== params.id);
    return { success: true };
  }),

  // ----- SOS -----
  route('POST', '/sos/events', ({ body }) => {
    const token = genId('demo-share');
    const item = {
      id: genId('demo-sos'),
      user_id: identity.user.id,
      profile_id: body?.profile_id ?? 'demo-med-self',
      lat: body?.lat ?? store.liveContext.lat,
      lng: body?.lng ?? store.liveContext.lng,
      aqi: body?.aqi ?? store.liveContext.aqi,
      pm25: body?.pm25 ?? store.liveContext.pm25,
      share_token: token,
      triggered_at: nowIso(),
      expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
      share_url: `${location.origin}/sos/${token}`,
    };
    store.sosEvents.unshift(item);
    return clone(item);
  }),
  route('GET', '/sos/events', () => clone(store.sosEvents)),
  route('DELETE', '/sos/events/:id', ({ params }) => {
    store.sosEvents = store.sosEvents.filter((e) => e.id !== params.id);
    return { success: true };
  }),
  route('GET', '/sos/share/:token', ({ params }) => {
    const event = store.sosEvents.find((e) => e.share_token === params.token);
    const profile = store.medicalProfiles[0] ?? {};
    return {
      event: {
        lat: event?.lat ?? store.liveContext.lat,
        lng: event?.lng ?? store.liveContext.lng,
        aqi: event?.aqi ?? store.liveContext.aqi,
        pm25: event?.pm25 ?? store.liveContext.pm25,
        triggered_at: event?.triggered_at ?? nowIso(),
        expires_at: event?.expires_at ?? nowIso(),
      },
      profile: {
        display_name: profile.display_name ?? 'Nguyễn Văn A',
        relation: profile.relation ?? 'self',
        birth_year: profile.birth_year ?? null,
        blood_type: profile.blood_type ?? null,
        emergency_phone: profile.emergency_phone ?? null,
        emergency_name: profile.emergency_name ?? null,
        avatar_emoji: profile.avatar_emoji ?? '🧑',
      },
      conditions: (profile.conditions ?? store.conditions).map((c: any) => ({
        category: c.category,
        code: c.code,
        note: c.note,
      })),
    };
  }),

  // ----- AI (trả lời mẫu) -----
  route('POST', '/ai/chat', () => ({
    reply:
      'Đây là phản hồi mẫu trong chế độ demo. AQI hiện tại quanh mức 96 (Trung bình) — ' +
      'bạn nên đeo khẩu trang khi ra ngoài lâu và ưu tiên tuyến đường ít khói bụi.',
    provider: 'demo',
  })),
  route('POST', '/ai/insight', () => ({
    insight:
      'Chất lượng không khí hôm nay ở mức Trung bình. Nhóm nhạy cảm (hen suyễn) nên hạn chế ' +
      'vận động mạnh ngoài trời vào giờ cao điểm.',
    provider: 'demo',
  })),

  // ----- Thông báo & cấu hình -----
  route('POST', '/notifications/push', () => ({ success: true, id: 'demo-push' })),
  route('GET', '/config/windy-key', () => ({ key: '' })),
  route('GET', '/config/mapbox-token', () => ({ token: '' })),
  route('GET', '/config/onesignal', () => ({ appId: null })),

  // ----- IoT Nodes & Tổ chức -----
  // Các trang Admin (AdminDashboard, AdminNodesManager, AdminOrgsManager, OrgDashboard)
  // ĐÃ chứa sẵn dữ liệu MOCK phong phú (MOCK_NODES / MOCK_ORGS / MOCK_ORG_DASHBOARD)
  // và tự dùng khi API không trả dữ liệu. Trong demo ta "tránh đường" bằng cách trả
  // null cho các endpoint đọc → mỗi trang tự render mock hardcode của chính nó.
  //   - Dashboard/Nodes/Orgs: chỉ ghi đè khi mảng length > 0 → null giữ mock.
  //   - OrgDashboard: guard `if (res && res.nodes)` coi [] là truthy → BẮT BUỘC trả null.
  route('GET', '/nodes/admin/stats', () => null),
  route('GET', '/nodes/admin/simulator/status', () => null),
  // Trả null để handleToggleSimulator tự lật trạng thái dựa trên state hiện tại.
  route('POST', '/nodes/admin/simulator/toggle', () => null),
  route('GET', '/nodes/organizations', () => null),
  route('POST', '/nodes/organizations', ({ body }) => ({ id: genId('demo-org'), ...(body ?? {}) })),
  route('GET', '/nodes/list', () => null),
  route('GET', '/nodes/details/:id', () => null),
  route('POST', '/nodes/create', ({ body }) => ({ id: genId('demo-node'), ...(body ?? {}) })),
  route('PATCH', '/nodes/assign/:nodeId/org/:orgId', () => ({ success: true })),
  route('POST', '/nodes/autodiscover', ({ body }) => ({ id: genId('demo-node'), ...(body ?? {}) })),
  route('GET', '/nodes/unassigned', () => null),
  route('GET', '/nodes/org-dashboard/:id', () => null),
];

/**
 * Giải quyết một request trong chế độ demo.
 * Trả về Promise để khớp chữ ký của api-client.request().
 */
export async function resolveDemo<T>(
  method: string,
  path: string,
  body?: unknown,
  query?: Record<string, any>,
): Promise<T> {
  const m = method.toUpperCase();
  for (const r of ROUTES) {
    if (r.method !== m) continue;
    const match = r.regex.exec(path);
    if (!match) continue;
    const params: Record<string, string> = {};
    r.keys.forEach((key, i) => (params[key] = decodeURIComponent(match[i + 1] ?? '')));
    const result = r.handler({ params, body: body as any, query: query ?? {} });
    return result as T;
  }

  // Không có route khai báo → mặc định an toàn, không để màn hình bị lỗi.
  if (import.meta.env.DEV) {
    console.warn(`[demo] Chưa có dữ liệu demo cho ${m} ${path} — trả về mặc định an toàn.`);
  }
  if (m === 'GET') return null as T;
  return { success: true } as T;
}
