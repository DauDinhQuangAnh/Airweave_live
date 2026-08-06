export interface PAMStation {
  id: string;
  name: string;
  district: string;
  city: string;
  aqi: number;
  // Optional: WAQI bounds endpoint only returns AQI per station. Detailed
  // pollutants are only available via per-station feed calls, so we leave
  // these undefined rather than fabricating values.
  pm25?: number;
  pm10?: number;
  no2?: number;
  temp?: number;
  lat: number;
  lng: number;
  trend?: 'up' | 'down' | 'stable';
  time?: string | null;
  source?: 'waqi' | 'fallback';
}

// NOTE: No hardcoded / simulated stations. All station data must come from
// the real WAQI API via `useWaqiStations`. Do not re-introduce mock arrays
// or random simulators here — they were removed intentionally.

export function getAQIColorNew(aqi: number) {
  if (aqi <= 50) return '#22c55e';
  if (aqi <= 100) return '#eab308';
  if (aqi <= 150) return '#f97316';
  if (aqi <= 200) return '#ef4444';
  if (aqi <= 300) return '#7c3aed';
  return '#7c1f1f';
}

export function getAQIStatusVi(aqi: number) {
  if (aqi <= 50) return '✅ Tốt';
  if (aqi <= 100) return '🟡 Trung bình';
  if (aqi <= 150) return '⚠️ Không tốt cho nhóm nhạy cảm';
  if (aqi <= 200) return '🔴 Không lành mạnh';
  if (aqi <= 300) return '🟣 Rất xấu';
  return '☠️ Nguy hiểm';
}
