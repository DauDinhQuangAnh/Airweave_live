export type CachedGeoSample = {
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: number;
};

const CACHE_MAX_AGE_MS = 5 * 60 * 1000;

let cachedSample: CachedGeoSample | null = null;
let prewarmPromise: Promise<CachedGeoSample | null> | null = null;

export function cacheGeoPosition(position: GeolocationPosition): CachedGeoSample {
  const { latitude, longitude, accuracy } = position.coords;

  cachedSample = {
    lat: latitude,
    lng: longitude,
    accuracy: Number.isFinite(accuracy) ? accuracy : 9999,
    timestamp: position.timestamp || Date.now(),
  };

  return cachedSample;
}

export function getCachedGeoSample(maxAgeMs = CACHE_MAX_AGE_MS): CachedGeoSample | null {
  if (!cachedSample) return null;
  if (Date.now() - cachedSample.timestamp > maxAgeMs) return null;
  return cachedSample;
}

export function prewarmGeolocation(): Promise<CachedGeoSample | null> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return Promise.resolve(null);
  }

  const cached = getCachedGeoSample();
  if (cached) return Promise.resolve(cached);
  if (prewarmPromise) return prewarmPromise;

  prewarmPromise = new Promise<CachedGeoSample | null>((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => resolve(cacheGeoPosition(position)),
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: CACHE_MAX_AGE_MS }
    );
  }).finally(() => {
    prewarmPromise = null;
  });

  return prewarmPromise;
}
