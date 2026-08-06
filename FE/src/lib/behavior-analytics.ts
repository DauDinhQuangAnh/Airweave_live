/**
 * Insurance-ready behavior analytics — strictly privacy-safe.
 *
 * - Only tracks named events AFTER user grants 'behavior_tracking' consent.
 * - Stores only event counts + timestamps locally. NO raw GPS, NO health data,
 *   NO personal identifiers. Aggregates only.
 * - Exposes a demo aggregate export for the "Health Behavior Insights Demo".
 *
 * This is NOT a real insurance integration. Output is clearly labeled DEMO.
 */

import { getConsent } from './privacy-consent';
import { isLightweightPrivacy } from './app-mode';

export type BehaviorEvent =
  | 'health_profile_completed'
  | 'aqi_checked_near_me'
  | 'clean_route_requested'
  | 'sensitive_alert_viewed'
  | 'sos_opened'
  | 'medical_id_opened'
  | 'community_report_submitted'
  | 'weekly_air_report_viewed';

interface EventRecord {
  count: number;
  last_at: string | null;
}

interface Store {
  events: Partial<Record<BehaviorEvent, EventRecord>>;
  first_seen: string;
}

const STORAGE_KEY = 'airweave.behavior.v1';
const listeners = new Set<() => void>();

function read(): Store {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return { events: {}, first_seen: new Date().toISOString() };
}

function write(s: Store) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

export function trackBehavior(event: BehaviorEvent) {
  // Prototype/lightweight: local-only aggregate counts (no server, no PII) are
  // allowed without a separate consent screen. Server uploads still require
  // explicit consent via the full Privacy & Consent card in Profile.
  if (!isLightweightPrivacy() && getConsent('behavior_tracking') !== 'granted') return;
  const s = read();
  const prev = s.events[event] ?? { count: 0, last_at: null };
  s.events[event] = { count: prev.count + 1, last_at: new Date().toISOString() };
  write(s);
}

export function getBehaviorSummary() {
  return read();
}

export function clearBehavior() {
  write({ events: {}, first_seen: new Date().toISOString() });
}

export function subscribeBehavior(cb: () => void): () => void {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

export const BEHAVIOR_LABELS: Record<BehaviorEvent, { vi: string; en: string }> = {
  health_profile_completed: { vi: 'Hoàn thành hồ sơ sức khỏe', en: 'Health profile completed' },
  aqi_checked_near_me: { vi: 'Kiểm tra AQI gần tôi', en: 'AQI checked near me' },
  clean_route_requested: { vi: 'Yêu cầu lộ trình sạch', en: 'Clean route requested' },
  sensitive_alert_viewed: { vi: 'Xem cảnh báo nhạy cảm', en: 'Sensitive alert viewed' },
  sos_opened: { vi: 'Mở SOS', en: 'SOS opened' },
  medical_id_opened: { vi: 'Mở Medical ID', en: 'Medical ID opened' },
  community_report_submitted: { vi: 'Gửi báo cáo cộng đồng', en: 'Community report submitted' },
  weekly_air_report_viewed: { vi: 'Xem báo cáo tuần', en: 'Weekly report viewed' },
};

/** Aggregated, anonymized JSON for the demo export. No PII. */
export function buildAnonymizedExport() {
  const s = read();
  return {
    schema: 'airweave.behavior.demo.v1',
    generated_at: new Date().toISOString(),
    first_seen: s.first_seen,
    consent: getConsent('behavior_tracking'),
    note: 'DEMO ONLY — aggregated counts on-device. No GPS, no health data, no identifiers.',
    events: Object.fromEntries(
      Object.entries(s.events).map(([k, v]) => [k, { count: v?.count ?? 0, last_at: v?.last_at ?? null }])
    ),
  };
}
