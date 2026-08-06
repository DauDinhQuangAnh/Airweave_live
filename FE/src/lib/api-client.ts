/**
 * HTTP client cho AirWeave API — thay thế hoàn toàn supabase-js.
 * Tự gắn access token, tự làm mới khi hết hạn, và gom mọi request refresh
 * trùng nhau vào một lần gọi duy nhất.
 */

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

const ACCESS_TOKEN_KEY = 'airweave.access_token';
const REFRESH_TOKEN_KEY = 'airweave.refresh_token';

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in?: number;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ---------- lưu token ----------

export const tokenStore = {
  getAccess: () => localStorage.getItem(ACCESS_TOKEN_KEY),
  getRefresh: () => localStorage.getItem(REFRESH_TOKEN_KEY),

  set(tokens: AuthTokens) {
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access_token);
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);
  },

  clear() {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },
};

// ---------- thông báo khi phiên kết thúc ----------

type UnauthorizedListener = () => void;
const unauthorizedListeners = new Set<UnauthorizedListener>();

/** Đăng ký callback chạy khi refresh token hết hạn (dùng để đăng xuất FE). */
export function onUnauthorized(listener: UnauthorizedListener) {
  unauthorizedListeners.add(listener);
  return () => unauthorizedListeners.delete(listener);
}

function notifyUnauthorized() {
  tokenStore.clear();
  unauthorizedListeners.forEach((listener) => listener());
}

// ---------- làm mới token ----------

let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = tokenStore.getRefresh();
  if (!refreshToken) return null;

  // Nhiều request 401 cùng lúc chỉ kích hoạt một lần refresh
  refreshInFlight ??= (async () => {
    try {
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      if (!res.ok) {
        notifyUnauthorized();
        return null;
      }
      const tokens: AuthTokens = await res.json();
      tokenStore.set(tokens);
      return tokens.access_token;
    } catch {
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

// ---------- request ----------

interface RequestOptions extends Omit<RequestInit, 'body'> {
  /** Bỏ qua Authorization header (dùng cho login/register/public). */
  skipAuth?: boolean;
  body?: unknown;
  /** Query string, giá trị undefined/null sẽ bị bỏ qua. */
  query?: Record<string, string | number | boolean | undefined | null>;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { skipAuth, body, query, headers, ...init } = options;

  let url = `${API_URL}${path}`;
  if (query) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null) params.set(key, String(value));
    }
    const qs = params.toString();
    if (qs) url += `?${qs}`;
  }

  const isFormData = body instanceof FormData;

  const send = async (token: string | null) => {
    const finalHeaders: Record<string, string> = {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...((headers as Record<string, string>) ?? {}),
    };
    if (token && !skipAuth) finalHeaders.Authorization = `Bearer ${token}`;

    return fetch(url, {
      ...init,
      headers: finalHeaders,
      body: isFormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
    });
  };

  let res = await send(skipAuth ? null : tokenStore.getAccess());

  // Access token hết hạn → refresh rồi thử lại đúng một lần
  if (res.status === 401 && !skipAuth && tokenStore.getRefresh()) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      res = await send(newToken);
    } else {
      notifyUnauthorized();
    }
  }

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const payload = text ? safeParse(text) : null;

  if (!res.ok) {
    const message =
      (Array.isArray(payload?.message) ? payload.message.join(', ') : payload?.message) ||
      `Yêu cầu thất bại (${res.status})`;
    throw new ApiError(message, res.status, payload?.code);
  }

  return payload as T;
}

function safeParse(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'GET' }),

  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'POST', body }),

  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'PUT', body }),

  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'PATCH', body }),

  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'DELETE' }),
};

export { API_URL };
