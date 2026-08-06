import { useState, useEffect, useCallback, useRef } from 'react';
import { cacheGeoPosition, getCachedGeoSample, prewarmGeolocation, type CachedGeoSample } from '@/lib/geolocation-prewarm';

export type GPSStatus =
  | 'idle'           // Not requested yet
  | 'requesting'     // Awaiting permission / first fix
  | 'active'         // Real GPS fix available
  | 'denied'         // User blocked permission
  | 'unavailable'    // POSITION_UNAVAILABLE / TIMEOUT / unsupported
  | 'manual'         // User provided location manually
  | 'iframe-blocked';// Likely blocked inside iframe (preview)

export interface GeoLocation {
  lat: number;
  lng: number;
  label: string;
  loading: boolean;
  error: string | null;
  permissionState: 'prompt' | 'granted' | 'denied' | 'unsupported';
  accuracy: number | null;
  isRefining: boolean;
  updatedAt: string | null;
  status: GPSStatus;
  isManual: boolean;
  isInIframe: boolean;
  isLiveTracking: boolean;
}

interface UseGeolocationOptions {
  /** When true, requests location automatically on mount. Defaults to false — user must click. */
  autoRequest?: boolean;
  /** When true, auto-request only runs after stored consent from a previous click. */
  requirePriorConsentForAutoRequest?: boolean;
}

type LocationSample = CachedGeoSample;

const HIGH_ACCURACY_TARGET_METERS = 30;
const SAMPLE_IMPROVEMENT_THRESHOLD_METERS = 8;
const MAX_REFINEMENT_TIME_MS = 12000;
const INITIAL_FIX_TIMEOUT_MS = 15000;
const CONSENT_KEY = 'aw-gps-consent';

function isInIframe(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

const defaultLocation: GeoLocation = {
  lat: 21.0285,
  lng: 105.8542,
  label: 'Đang chờ vị trí hiện tại',
  loading: false,
  error: null,
  permissionState: 'prompt',
  accuracy: null,
  isRefining: false,
  updatedAt: null,
  status: 'idle',
  isManual: false,
  isInIframe: isInIframe(),
  isLiveTracking: false,
};

function formatCoordinateFallback(lat: number, lng: number): string {
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

function pickFirst(values: Array<string | undefined | null>): string | null {
  return values.find((v) => typeof v === 'string' && v.trim().length > 0)?.trim() ?? null;
}

function dedupeParts(parts: Array<string | null>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  parts.forEach((p) => {
    if (!p) return;
    const t = p.trim();
    if (!t) return;
    const k = t.toLowerCase();
    if (seen.has(k)) return;
    seen.add(k);
    out.push(t);
  });
  return out;
}

function getReverseGeocodeZoom(accuracy: number | null): number {
  if (accuracy === null) return 18;
  if (accuracy <= 20) return 18;
  if (accuracy <= 50) return 17;
  if (accuracy <= 120) return 16;
  if (accuracy <= 300) return 15;
  return 14;
}

async function reverseGeocode(lat: number, lng: number, accuracy: number | null): Promise<string> {
  try {
    const zoom = getReverseGeocodeZoom(accuracy);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=jsonv2&addressdetails=1&accept-language=vi&zoom=${zoom}`
    );
    if (!res.ok) throw new Error('Geocode failed');
    const data = await res.json();
    const addr = data.address ?? {};
    const streetLine = [addr.house_number, pickFirst([addr.road, addr.pedestrian, addr.footway, addr.path, addr.cycleway])]
      .filter(Boolean).join(' ').trim();
    const neighborhood = pickFirst([addr.quarter, addr.neighbourhood, addr.suburb, addr.residential, addr.hamlet, addr.village]);
    const district = pickFirst([addr.city_district, addr.borough, addr.township, addr.district, addr.county]);
    const city = pickFirst([addr.city, addr.town, addr.municipality, addr.state_district, addr.state]);
    const label = dedupeParts([streetLine || null, neighborhood, district, city]).join(', ');
    if (label) return label;
    const fallback = (data.display_name as string | undefined)
      ?.split(',').map((p) => p.trim()).filter(Boolean).slice(0, 4).join(', ');
    return fallback || formatCoordinateFallback(lat, lng);
  } catch {
    return formatCoordinateFallback(lat, lng);
  }
}

function createSample(position: GeolocationPosition): LocationSample {
  return cacheGeoPosition(position);
}

function isBetterSample(next: LocationSample, current: LocationSample | null): boolean {
  if (!current) return true;
  if (next.accuracy <= HIGH_ACCURACY_TARGET_METERS && current.accuracy > HIGH_ACCURACY_TARGET_METERS) return true;
  return next.accuracy + SAMPLE_IMPROVEMENT_THRESHOLD_METERS < current.accuracy;
}

function mapErrorToMessage(err: GeolocationPositionError): string {
  const FRIENDLY = 'Không thể lấy vị trí hiện tại. Vui lòng cấp quyền GPS hoặc nhập vị trí thủ công.';
  switch (err.code) {
    case err.PERMISSION_DENIED:
      return 'Quyền vị trí bị từ chối. ' + FRIENDLY;
    case err.POSITION_UNAVAILABLE:
      return 'Không có tín hiệu GPS. ' + FRIENDLY;
    case err.TIMEOUT:
      return 'Hết thời gian chờ GPS. ' + FRIENDLY;
    default:
      return FRIENDLY;
  }
}

export function useGeolocation(options: UseGeolocationOptions = {}) {
  const { autoRequest = false, requirePriorConsentForAutoRequest = true } = options;
  const [location, setLocation] = useState<GeoLocation>(defaultLocation);
  const watchIdRef = useRef<number | null>(null);
  const refinementTimerRef = useRef<number | null>(null);
  const requestIdRef = useRef(0);
  const lastResolvedTimestampRef = useRef(0);
  const refinementEndedRequestRef = useRef<number | null>(null);
  const liveTrackingRef = useRef(false);
  const autoRequestStartedRef = useRef(false);

  const stopWatch = useCallback(() => {
    if (watchIdRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (refinementTimerRef.current !== null) {
      window.clearTimeout(refinementTimerRef.current);
      refinementTimerRef.current = null;
    }
  }, []);

  const applySample = useCallback((sample: LocationSample, isRefining: boolean) => {
    setLocation((prev) => ({
      ...prev,
      lat: sample.lat,
      lng: sample.lng,
      label: prev.updatedAt && !prev.isManual ? prev.label : formatCoordinateFallback(sample.lat, sample.lng),
      loading: false,
      error: null,
      permissionState: 'granted',
      status: 'active',
      isManual: false,
      accuracy: Math.round(sample.accuracy),
      isRefining,
      updatedAt: new Date(sample.timestamp).toISOString(),
    }));
  }, []);

  const resolveLabel = useCallback(async (sample: LocationSample, reqId: number, isRefining: boolean) => {
    const label = await reverseGeocode(sample.lat, sample.lng, sample.accuracy);
    if (reqId !== requestIdRef.current) return;
    if (sample.timestamp < lastResolvedTimestampRef.current) return;
    lastResolvedTimestampRef.current = sample.timestamp;
    setLocation((prev) => ({
      ...prev,
      lat: sample.lat,
      lng: sample.lng,
      label,
      loading: false,
      error: null,
      permissionState: 'granted',
      status: 'active',
      isManual: false,
      accuracy: Math.round(sample.accuracy),
      isRefining: refinementEndedRequestRef.current === reqId ? false : isRefining,
      updatedAt: new Date(sample.timestamp).toISOString(),
    }));
  }, []);

  const requestLocation = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setLocation((prev) => ({
        ...prev,
        loading: false,
        isRefining: false,
        permissionState: 'unsupported',
        status: 'unavailable',
        isLiveTracking: false,
        error: 'Trình duyệt không hỗ trợ định vị GPS.',
      }));
      return;
    }

    // Persist consent — user explicitly clicked.
    try { localStorage.setItem(CONSENT_KEY, '1'); } catch { /* ignore */ }

    requestIdRef.current += 1;
    const currentRequestId = requestIdRef.current;
    let bestSample: LocationSample | null = null;
    refinementEndedRequestRef.current = null;
    lastResolvedTimestampRef.current = 0;
    stopWatch();

    setLocation((prev) => ({
      ...prev,
      loading: true,
      error: null,
      isRefining: false,
      status: 'requesting',
      isManual: false,
    }));

    if (navigator.permissions?.query) {
      try {
        const ps = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
        if (currentRequestId === requestIdRef.current) {
          setLocation((prev) => ({ ...prev, permissionState: ps.state as GeoLocation['permissionState'] }));
        }
      } catch { /* ignore */ }
    }

    const handleSuccess = (position: GeolocationPosition) => {
      if (currentRequestId !== requestIdRef.current) return;
      const sample = createSample(position);
      if (!isBetterSample(sample, bestSample)) return;
      bestSample = sample;
      const reachedTarget = sample.accuracy <= HIGH_ACCURACY_TARGET_METERS;
      applySample(sample, !reachedTarget);
      void resolveLabel(sample, currentRequestId, !reachedTarget);
      if (reachedTarget && !liveTrackingRef.current) {
        stopWatch();
      }
    };

    const handleError = (err: GeolocationPositionError) => {
      if (currentRequestId !== requestIdRef.current) return;

      if (err.code === err.PERMISSION_DENIED) {
        stopWatch();
        const inIframe = isInIframe();
        setLocation((prev) => ({
          ...prev,
          loading: false,
          isRefining: false,
          error: mapErrorToMessage(err),
          permissionState: 'denied',
          status: inIframe ? 'iframe-blocked' : 'denied',
          isLiveTracking: false,
        }));
        return;
      }

      if (!bestSample) {
        setLocation((prev) => ({
          ...prev,
          loading: false,
          isRefining: false,
          error: mapErrorToMessage(err),
          status: 'unavailable',
        }));
      }
    };

    // 1) Initial fix via getCurrentPosition (per user requirement).
    navigator.geolocation.getCurrentPosition(handleSuccess, handleError, {
      enableHighAccuracy: true,
      timeout: INITIAL_FIX_TIMEOUT_MS,
      maximumAge: 0,
    });

    // Warmed cache shortcut.
    const warmed = getCachedGeoSample();
    if (warmed) {
      bestSample = warmed;
      applySample(warmed, false);
      void resolveLabel(warmed, currentRequestId, false);
    }

    // 2) Short refinement window via watchPosition to upgrade accuracy.
    //    Auto-stops at MAX_REFINEMENT_TIME_MS or when accuracy ≤30m, unless live tracking is on.
    watchIdRef.current = navigator.geolocation.watchPosition(handleSuccess, handleError, {
      enableHighAccuracy: true,
      timeout: 20000,
      maximumAge: 0,
    });

    refinementTimerRef.current = window.setTimeout(() => {
      if (!liveTrackingRef.current) stopWatch();
      if (requestIdRef.current !== currentRequestId) return;
      refinementEndedRequestRef.current = currentRequestId;

      // Stop the visible refinement state even if the browser never reaches the
      // ideal accuracy target. A usable fix should not leave the UI spinning.
      if (bestSample) {
        setLocation((prev) => ({
          ...prev,
          loading: false,
          isRefining: false,
        }));
        return;
      }

      // If still no fix at all, surface a friendly error.
      if (!bestSample) {
        setLocation((prev) => ({
          ...prev,
          loading: false,
          isRefining: false,
          status: prev.status === 'requesting' ? 'unavailable' : prev.status,
          error: prev.error || 'Không thể lấy vị trí hiện tại. Vui lòng cấp quyền GPS hoặc nhập vị trí thủ công.',
        }));
      }
    }, MAX_REFINEMENT_TIME_MS);
  }, [applySample, resolveLabel, stopWatch]);

  const enableLiveTracking = useCallback(() => {
    liveTrackingRef.current = true;
    setLocation((prev) => ({ ...prev, isLiveTracking: true }));
    if (watchIdRef.current === null) {
      void requestLocation();
    }
  }, [requestLocation]);

  const disableLiveTracking = useCallback(() => {
    liveTrackingRef.current = false;
    setLocation((prev) => ({ ...prev, isLiveTracking: false }));
    stopWatch();
  }, [stopWatch]);

  const setManualLocation = useCallback((lat: number, lng: number, label: string) => {
    requestIdRef.current += 1;
    stopWatch();
    liveTrackingRef.current = false;
    setLocation({
      lat,
      lng,
      label,
      loading: false,
      error: null,
      permissionState: 'prompt',
      accuracy: null,
      isRefining: false,
      updatedAt: new Date().toISOString(),
      status: 'manual',
      isManual: true,
      isInIframe: isInIframe(),
      isLiveTracking: false,
    });
  }, [stopWatch]);

  const clearLocation = useCallback(() => {
    requestIdRef.current += 1;
    stopWatch();
    liveTrackingRef.current = false;
    setLocation({ ...defaultLocation, isInIframe: isInIframe() });
  }, [stopWatch]);

  useEffect(() => {
    if (!autoRequest) return;
    if (autoRequestStartedRef.current) return;
    // Auto-request only if the user has previously consented in this browser,
    // unless the caller intentionally wants the browser prompt on first load.
    if (requirePriorConsentForAutoRequest) {
      let hasConsent = false;
      try { hasConsent = localStorage.getItem(CONSENT_KEY) === '1'; } catch { /* ignore */ }
      if (!hasConsent) return;
    }

    // Skip prewarm if permission is denied to avoid noise.
    if (navigator.permissions?.query) {
      navigator.permissions.query({ name: 'geolocation' as PermissionName })
        .then((s) => {
          if (s.state !== 'denied') {
            autoRequestStartedRef.current = true;
            void requestLocation();
          }
        })
        .catch(() => {
          autoRequestStartedRef.current = true;
          void requestLocation();
        });
    } else {
      autoRequestStartedRef.current = true;
      void requestLocation();
    }

    return () => {
      requestIdRef.current += 1;
      stopWatch();
    };
  }, [autoRequest, requirePriorConsentForAutoRequest, requestLocation, stopWatch]);

  // Always clean up on unmount.
  useEffect(() => {
    return () => { stopWatch(); };
  }, [stopWatch]);

  return {
    location,
    requestLocation,
    enableLiveTracking,
    disableLiveTracking,
    setManualLocation,
    clearLocation,
  };
}
