export interface PAMStation {
  id: string;
  name: string;
  district: string;
  city: string;
  aqi: number;
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

export function getAQIStatusEn(aqi: number) {
  if (aqi <= 50) return '✅ Good';
  if (aqi <= 100) return '🟡 Moderate';
  if (aqi <= 150) return '⚠️ Unhealthy for Sensitive';
  if (aqi <= 200) return '🔴 Unhealthy';
  if (aqi <= 300) return '🟣 Very Unhealthy';
  return '☠️ Hazardous';
}

export function getAQIStatus(aqi: number, lang: 'vi' | 'en' = 'vi') {
  return lang === 'en' ? getAQIStatusEn(aqi) : getAQIStatusVi(aqi);
}
