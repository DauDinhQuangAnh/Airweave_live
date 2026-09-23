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

const nowIso = () => new Date().toISOString();
const hoursAgo = (hours: number) => new Date(Date.now() - hours * 3600_000).toISOString();
const hoursFromNow = (hours: number) => new Date(Date.now() + hours * 3600_000).toISOString();
const genId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 10)}`;

const demoOrganizations = [
  {
    id: 'org-1',
    name: 'Sở TN&MT TP.HCM',
    code: 'STNMT-HCM',
    type: 'government',
    address: 'TP. Hồ Chí Minh',
    contact_name: 'Đầu mối minh họa AirWeave',
    contact_phone: '0901 234 567',
    description: 'Đơn vị vận hành mạng quan trắc minh họa tại TP.HCM.',
    contact_email: 'demo-org@airweave.vn',
    plan_tier: 'Demo',
    status: 'sample',
    created_at: hoursAgo(24 * 90),
    updated_at: nowIso(),
  },
];

const demoNodes = [
  {
    id: 'demo-node-q1', node_code: 'HCM-Q1-001', name: 'Trạm Quận 1',
    edition: 'outdoor_solar', edition_type: 'outdoor', status: 'online',
    lat: 10.7769, lng: 106.7009, location_name: 'Outdoor Solar Node', organization_id: 'org-1', organization_name: 'Sở TN&MT TP.HCM',
    aqi: 96, pm25: 34.2, pm10: 58.1, temperature: 31.5, humidity: 72,
    battery_level: 86, battery: 86, signal_strength: -57, rssi: -57, last_reading_at: nowIso(),
  },
  {
    id: 'demo-node-q3', node_code: 'HCM-Q3-002', name: 'Trạm Quận 3',
    edition: 'indoor_grid', edition_type: 'indoor', status: 'online',
    lat: 10.7797, lng: 106.6875, location_name: 'Indoor Campus Grid Node', organization_id: 'org-1', organization_name: 'Sở TN&MT TP.HCM',
    aqi: 88, pm25: 29.4, pm10: 49.8, temperature: 29.2, humidity: 68,
    battery_level: 100, battery: 100, signal_strength: -48, rssi: -48, last_reading_at: nowIso(),
  },
  {
    id: 'demo-node-q7', node_code: 'HCM-Q7-003', name: 'Trạm Quận 7',
    edition: 'outdoor_solar', edition_type: 'outdoor', status: 'maintenance',
    lat: 10.7326, lng: 106.7196, location_name: 'Outdoor Solar Node', organization_id: 'org-1', organization_name: 'Sở TN&MT TP.HCM',
    aqi: 134, pm25: 49.0, pm10: 71.2, temperature: 32.1, humidity: 70,
    battery_level: 42, battery: 42, signal_strength: -76, rssi: -76, last_reading_at: hoursAgo(3),
  },
];

// Bản sao có thể thay đổi trong bộ nhớ cho phiên demo.
const store: any = {
  profile: clone(identity.profile) as Record<string, any>,
  preferences: clone(identity.preferences) as Record<string, any>,
  locations: clone(identity.locations) as Record<string, any>[],
  liveContext: { ...clone(identity.liveContext), snapshot_updated_at: nowIso(), updated_at: nowIso() } as Record<string, any> | null,
  medicalProfiles: clone(social.medicalProfiles) as Record<string, any>[],
  conditions: clone(social.conditions) as Record<string, any>[],
  sosEvents: clone(social.sosEvents) as Record<string, any>[],
  communityReports: (clone(social.communityReports) as Record<string, any>[]).map((item, index) => ({
    ...item,
    created_at: hoursAgo([0.5, 1.25, 2.5][index] ?? 3),
    expires_at: hoursFromNow([5.5, 4.75, 3.5][index] ?? 3),
  })),
  myCommunityReports: (clone(social.myCommunityReports) as Record<string, any>[]).map((item) => ({
    ...item,
    created_at: hoursAgo(0.75),
    expires_at: hoursFromNow(5.25),
  })),
  organizations: clone(demoOrganizations) as Record<string, any>[],
  nodes: clone(demoNodes) as Record<string, any>[],
  simulatorEnabled: false,
};

function demoAirPoint() {
  return { ...clone(air.waqiPoint), time: nowIso() };
}

function demoHistory() {
  const source = clone(air.history) as Record<string, any>[];
  return source.map((item, index) => ({
    ...item,
    date: new Date(Date.now() - (source.length - 1 - index) * 86_400_000).toISOString().slice(0, 10),
  }));
}

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
    store.preferences = { ...(store.preferences ?? {}), ...(body ?? {}), updated_at: nowIso() };
    return clone(store.preferences);
  }),
  route('POST', '/preferences/mark-alert-sent', ({ body }) => {
    store.preferences ??= {};
    store.preferences.last_alert_aqi = body?.aqi ?? store.preferences.last_alert_aqi;
    store.preferences.last_alert_at = nowIso();
    return clone(store.preferences);
  }),
  route('DELETE', '/preferences', () => {
    store.preferences = null;
    return { success: true };
  }),

  // ----- Địa điểm -----
  route('GET', '/locations', () => clone(store.locations)),
  route('POST', '/locations', ({ body }) => {
    const existing = store.locations.find((l: any) => l.location_type === (body?.location_type ?? 'home'));
    if (existing) {
      Object.assign(existing, body ?? {}, { updated_at: nowIso() });
      return clone(existing);
    }
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
    store.liveContext = {
      ...(store.liveContext ?? { id: 'demo-live-0001', user_id: identity.user.id, created_at: nowIso() }),
      ...(body ?? {}),
      updated_at: nowIso(),
    };
    return clone(store.liveContext);
  }),
  route('DELETE', '/live-context', () => {
    store.liveContext = null;
    return { success: true };
  }),

  // ----- Không khí -----
  route('POST', '/air/waqi', () => demoAirPoint()),
  route('POST', '/air/waqi/bounds', () => ({
    source: 'waqi' as const,
    available: true,
    stations: (clone(air.stations) as Record<string, any>[]).map((station) => ({ ...station, time: nowIso() })),
  })),
  route('GET', '/air/current', () => ({ ...clone(air.current), updated_at: nowIso() })),
  route('GET', '/air/history', () => demoHistory()),
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
    const mine = store.myCommunityReports.find((r: any) => r.id === params.id);
    if (mine) Object.assign(mine, body ?? {});
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
    store.conditions = store.conditions.filter((c: any) => c.profile_id !== params.id);
    store.sosEvents = store.sosEvents.filter((event: any) => event.profile_id !== params.id);
    return { success: true };
  }),
  route('GET', '/medical/conditions', () => clone(store.conditions)),
  route('PUT', '/medical/conditions/note', ({ body }) => {
    const existing = store.conditions.find(
      (c) => c.profile_id === body?.profile_id && c.code === body?.code,
    );
    if (existing) {
      existing.note = body?.note ?? existing.note;
      const profileCondition = store.medicalProfiles
        .find((p: any) => p.id === existing.profile_id)?.conditions
        ?.find((c: any) => c.id === existing.id);
      if (profileCondition) profileCondition.note = existing.note;
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
    const profile = store.medicalProfiles.find((p: any) => p.id === item.profile_id);
    if (profile) profile.conditions.push(clone(item));
    return clone(item);
  }),
  route('POST', '/medical/conditions/toggle', ({ body }) => {
    const index = store.conditions.findIndex(
      (c: any) => c.profile_id === body?.profile_id && c.category === body?.category && c.code === body?.code,
    );
    if (index >= 0) {
      const [removed] = store.conditions.splice(index, 1);
      const profile = store.medicalProfiles.find((p: any) => p.id === removed.profile_id);
      if (profile) profile.conditions = profile.conditions.filter((c: any) => c.id !== removed.id);
      return { action: 'removed', condition: clone(removed) };
    }

    const item = {
      id: genId('demo-cond'), profile_id: body?.profile_id ?? 'demo-med-self', user_id: identity.user.id,
      category: body?.category ?? 'other', code: body?.code ?? 'other', note: body?.note ?? null,
      created_at: nowIso(),
    };
    store.conditions.push(item);
    const profile = store.medicalProfiles.find((p: any) => p.id === item.profile_id);
    if (profile) profile.conditions.push(clone(item));
    return { action: 'added', condition: clone(item) };
  }),
  route('DELETE', '/medical/conditions/:id', ({ params }) => {
    store.conditions = store.conditions.filter((c) => c.id !== params.id);
    store.medicalProfiles.forEach((profile: any) => {
      profile.conditions = profile.conditions.filter((c: any) => c.id !== params.id);
    });
    return { success: true };
  }),

  // ----- SOS -----
  route('POST', '/sos/events', ({ body }) => {
    const token = genId('demo-share');
    const live = store.liveContext ?? identity.liveContext;
    const ttlHours = Math.max(1, Number(body?.ttl_hours) || 24);
    const item = {
      id: genId('demo-sos'),
      user_id: identity.user.id,
      profile_id: body?.profile_id ?? 'demo-med-self',
      lat: body?.lat ?? live.lat,
      lng: body?.lng ?? live.lng,
      aqi: body?.aqi ?? live.aqi,
      pm25: body?.pm25 ?? live.pm25,
      share_token: token,
      triggered_at: nowIso(),
      expires_at: hoursFromNow(ttlHours),
      share_url: `${location.origin}/qr/${token}`,
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
    const live = store.liveContext ?? identity.liveContext;
    return {
      event: {
        lat: event?.lat ?? live.lat,
        lng: event?.lng ?? live.lng,
        aqi: event?.aqi ?? live.aqi,
        pm25: event?.pm25 ?? live.pm25,
        triggered_at: event?.triggered_at ?? nowIso(),
        expires_at: event?.expires_at ?? hoursFromNow(24),
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
  // Một nguồn dữ liệu duy nhất phục vụ bản đồ, Admin và Enterprise View.
  route('GET', '/nodes/admin/stats', () => ({
    totalNodes: store.nodes.length,
    onlineNodes: store.nodes.filter((node: any) => node.status === 'online').length,
    offlineNodes: store.nodes.filter((node: any) => node.status === 'offline').length,
    warningNodes: store.nodes.filter((node: any) => node.status === 'maintenance').length,
    totalOrgs: store.organizations.length,
    avgAqi: Math.round(store.nodes.reduce((sum: number, node: any) => sum + (node.aqi ?? 0), 0) / Math.max(store.nodes.length, 1)),
    isSimulating: store.simulatorEnabled,
    simulatorEnabled: false,
  })),
  route('GET', '/nodes/admin/simulator/status', () => ({ isSimulating: false, simulatorEnabled: false })),
  route('POST', '/nodes/admin/simulator/toggle', () => ({ isSimulating: false, simulatorEnabled: false })),
  route('GET', '/nodes/organizations', () => clone(store.organizations.map((org: any) => ({
    ...org,
    nodesCount: store.nodes.filter((node: any) => node.organization_id === org.id).length,
    _count: { nodes: store.nodes.filter((node: any) => node.organization_id === org.id).length },
  })))),
  route('POST', '/nodes/organizations', ({ body }) => {
    const item = {
      id: genId('demo-org'), ...(body ?? {}), plan_tier: 'Demo', status: 'sample',
      created_at: nowIso(), updated_at: nowIso(), nodesCount: 0, _count: { nodes: 0 },
    };
    store.organizations.push(item);
    return clone(item);
  }),
  route('GET', '/nodes/list', ({ query }) => clone(
    query?.orgId ? store.nodes.filter((node: any) => node.organization_id === query.orgId) : store.nodes,
  )),
  route('GET', '/nodes/details/:id', ({ params }) => clone(store.nodes.find((node: any) => node.id === params.id) ?? null)),
  route('POST', '/nodes/create', ({ body }) => {
    const edition = body?.edition ?? 'outdoor_solar';
    const org = store.organizations.find((item: any) => item.id === body?.organization_id);
    const item = {
      id: genId('demo-node'), node_code: body?.chip_id ?? genId('HCM'), chip_id: body?.chip_id,
      name: body?.name ?? 'Trạm demo mới', edition,
      edition_type: edition === 'outdoor_solar' ? 'outdoor' : 'indoor', status: 'online',
      organization_id: org?.id ?? null, organization_name: org?.name ?? null,
      lat: body?.lat ?? 0, lng: body?.lng ?? 0, location_name: body?.location_name ?? null,
      aqi: 0, pm25: 0, pm10: 0, temperature: 0, humidity: 0,
      battery_level: 100, battery: 100, signal_strength: -50, rssi: -50, last_reading_at: nowIso(),
    };
    store.nodes.push(item);
    return clone(item);
  }),
  route('PATCH', '/nodes/assign/:nodeId/org/:orgId', ({ params }) => {
    const node = store.nodes.find((item: any) => item.id === params.nodeId);
    const org = store.organizations.find((item: any) => item.id === params.orgId);
    if (node) {
      node.organization_id = org?.id ?? null;
      node.organization_name = org?.name ?? null;
    }
    return clone(node ?? { success: false });
  }),
  route('POST', '/nodes/autodiscover', ({ body }) => {
    const item = {
      id: genId('demo-node'), node_code: body?.chip_id, chip_id: body?.chip_id,
      name: `Trạm ${body?.chip_id ?? 'mới'}`, edition: body?.edition ?? 'outdoor_solar',
      edition_type: body?.edition === 'indoor_grid' ? 'indoor' : 'outdoor', status: 'online',
      organization_id: null, organization_name: null, lat: 0, lng: 0,
      aqi: 0, pm25: 0, pm10: 0, temperature: 0, humidity: 0, last_reading_at: nowIso(),
    };
    store.nodes.push(item);
    return clone(item);
  }),
  route('GET', '/nodes/unassigned', () => clone(store.nodes.filter((node: any) => !node.organization_id))),
  route('GET', '/nodes/org-dashboard/:id', ({ params }) => {
    const organization = store.organizations.find((org: any) => org.id === params.id) ?? null;
    const nodes = store.nodes.filter((node: any) => node.organization_id === params.id);
    return {
      organization: clone(organization),
      nodes: clone(nodes),
      summary: {
        totalNodes: nodes.length,
        onlineNodes: nodes.filter((node: any) => node.status === 'online').length,
        offlineNodes: nodes.filter((node: any) => node.status === 'offline').length,
        avgAqi: nodes.length ? Math.round(nodes.reduce((sum: number, node: any) => sum + node.aqi, 0) / nodes.length) : null,
      },
    };
  }),
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
