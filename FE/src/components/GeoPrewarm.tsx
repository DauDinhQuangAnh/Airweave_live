/**
 * Previously prewarmed GPS automatically on page load. Per the updated GPS policy,
 * we never request location without an explicit user gesture. This component now
 * only prewarms if (a) the user previously granted permission AND (b) consent flag
 * is set — making it a silent cache refresh, not a permission prompt.
 */
import { useEffect } from 'react';
import { prewarmGeolocation } from '@/lib/geolocation-prewarm';

const CONSENT_KEY = 'aw-gps-consent';

export default function GeoPrewarm() {
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;

    let hasConsent = false;
    try { hasConsent = localStorage.getItem(CONSENT_KEY) === '1'; } catch { /* ignore */ }
    if (!hasConsent) return;

    if (!navigator.permissions?.query) return;

    navigator.permissions
      .query({ name: 'geolocation' as PermissionName })
      .then((status) => {
        if (status.state === 'granted') {
          void prewarmGeolocation();
        }
      })
      .catch(() => { /* ignore */ });
  }, []);

  return null;
}
