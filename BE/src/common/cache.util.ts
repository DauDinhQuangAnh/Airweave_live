import type Redis from 'ioredis';

/** Cache TTL trong bộ nhớ — giảm số lần gọi API ngoài (WAQI/Open-Meteo có giới hạn rate). */
export class TtlCache<T> {
  private readonly store = new Map<string, { value: T; expiresAt: number }>();
  private readonly inFlight = new Map<string, Promise<T>>();

  constructor(private readonly ttlMs: number, private readonly maxEntries = 500) {}

  get(key: string): T | undefined {
    const hit = this.store.get(key);
    if (!hit) return undefined;
    if (hit.expiresAt < Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    return hit.value;
  }

  set(key: string, value: T) {
    if (this.store.size >= this.maxEntries) {
      // Xoá entry cũ nhất (Map giữ thứ tự chèn)
      const oldest = this.store.keys().next().value;
      if (oldest !== undefined) this.store.delete(oldest);
    }
    this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }

  async wrap(key: string, factory: () => Promise<T>): Promise<T> {
    const cached = this.get(key);
    if (cached !== undefined) return cached;

    // Single-flight: nhiều lời gọi cùng key khi cache miss chỉ chạy factory MỘT lần
    // (tránh cache stampede làm gọi API ngoài trùng lặp).
    const existing = this.inFlight.get(key);
    if (existing) return existing;

    const p = (async () => {
      try {
        const value = await factory();
        this.set(key, value);
        return value;
      } finally {
        this.inFlight.delete(key);
      }
    })();
    this.inFlight.set(key, p);
    return p;
  }
}

/**
 * RedisTtlCache — Wrapper dùng Redis làm backend cache.
 * Tự động fallback về TtlCache in-memory khi Redis = null (graceful degradation).
 * API giống hệt TtlCache để dễ swap.
 */
export class RedisTtlCache<T> {
  private readonly fallback: TtlCache<T>;
  private readonly inFlight = new Map<string, Promise<T>>();

  constructor(
    private readonly redis: Redis | null,
    private readonly ttlSeconds: number,
    private readonly namespace: string,
    fallbackMaxEntries = 500,
  ) {
    this.fallback = new TtlCache<T>(ttlSeconds * 1000, fallbackMaxEntries);
  }

  private key(k: string) {
    return `airweave:${this.namespace}:${k}`;
  }

  async get(key: string): Promise<T | undefined> {
    if (!this.redis) return this.fallback.get(key);
    try {
      const raw = await this.redis.get(this.key(key));
      if (!raw) return undefined;
      return JSON.parse(raw) as T;
    } catch {
      return this.fallback.get(key);
    }
  }

  async set(key: string, value: T): Promise<void> {
    if (!this.redis) {
      this.fallback.set(key, value);
      return;
    }
    try {
      await this.redis.set(this.key(key), JSON.stringify(value), 'EX', this.ttlSeconds);
    } catch {
      this.fallback.set(key, value);
    }
  }

  async wrap(key: string, factory: () => Promise<T>): Promise<T> {
    const cached = await this.get(key);
    if (cached !== undefined) return cached;

    // Single-flight per-instance: gộp các miss đồng thời cùng key vào 1 lần gọi factory.
    const existing = this.inFlight.get(key);
    if (existing) return existing;

    const p = (async () => {
      try {
        const value = await factory();
        await this.set(key, value);
        return value;
      } finally {
        this.inFlight.delete(key);
      }
    })();
    this.inFlight.set(key, p);
    return p;
  }
}


/** fetch có timeout — tránh treo request khi API ngoài không phản hồi. */
export async function fetchJson<T = any>(url: string, timeoutMs = 8000, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      const err = new Error(`Upstream ${res.status}: ${body.slice(0, 200)}`);
      (err as any).status = res.status;
      throw err;
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

/** Khoảng cách Haversine (km). */
export function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Quy đổi PM2.5 → AQI đã gộp về một nguồn duy nhất: calculateAqiFromPm25()
// trong air-analytics.util.ts (tránh trùng lặp & lệch kết quả ở khe hở breakpoint).
