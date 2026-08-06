/**
 * Privacy-first consent layer.
 * Stores user consent flags in localStorage (device-local). Never sent to server unless
 * the user explicitly confirms an action (e.g. SOS share). Pure helpers + tiny pub/sub.
 */

export type ConsentKey =
  | 'health_profile'      // saving health profile / sensitivity note
  | 'gps_location'        // using device GPS
  | 'behavior_tracking'   // anonymized behavior analytics
  | 'sos_share';          // sharing location in SOS (per-event confirmation)

type ConsentState = Partial<Record<ConsentKey, 'granted' | 'denied'>>;

const STORAGE_KEY = 'airweave.consent.v1';
const listeners = new Set<() => void>();

function read(): ConsentState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function write(next: ConsentState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore quota */
  }
  listeners.forEach((l) => l());
}

export function getConsent(key: ConsentKey): 'granted' | 'denied' | 'unknown' {
  return read()[key] ?? 'unknown';
}

export function setConsent(key: ConsentKey, value: 'granted' | 'denied') {
  const cur = read();
  cur[key] = value;
  write(cur);
}

export function clearConsent(key?: ConsentKey) {
  if (!key) {
    write({});
    return;
  }
  const cur = read();
  delete cur[key];
  write(cur);
}

export function subscribeConsent(cb: () => void): () => void {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) cb();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener('storage', onStorage);
  };
}

export const CONSENT_LABELS: Record<ConsentKey, { vi: string; en: string }> = {
  health_profile: { vi: 'Hồ sơ sức khoẻ', en: 'Health profile' },
  gps_location: { vi: 'Vị trí GPS', en: 'GPS location' },
  behavior_tracking: { vi: 'Phân tích hành vi (ẩn danh)', en: 'Behavior analytics (anonymous)' },
  sos_share: { vi: 'Chia sẻ vị trí SOS', en: 'SOS location share' },
};
