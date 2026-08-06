export type AirQualitySource = 'waqi' | 'open-meteo';

export function pm25ToAQI(pm25: number): number {
  const breakpoints = [
    { cLow: 0, cHigh: 12, iLow: 0, iHigh: 50 },
    { cLow: 12.1, cHigh: 35.4, iLow: 51, iHigh: 100 },
    { cLow: 35.5, cHigh: 55.4, iLow: 101, iHigh: 150 },
    { cLow: 55.5, cHigh: 150.4, iLow: 151, iHigh: 200 },
    { cLow: 150.5, cHigh: 250.4, iLow: 201, iHigh: 300 },
    { cLow: 250.5, cHigh: 500.4, iLow: 301, iHigh: 500 },
  ];
  const c = Math.max(0, pm25);
  for (const bp of breakpoints) {
    if (c <= bp.cHigh) {
      return Math.round(((bp.iHigh - bp.iLow) / (bp.cHigh - bp.cLow)) * (c - bp.cLow) + bp.iLow);
    }
  }
  return 500;
}

export function degToCompass(deg: number, lang: 'vi' | 'en'): string {
  const directionsVi = ['Bắc', 'Đông Bắc', 'Đông', 'Đông Nam', 'Nam', 'Tây Nam', 'Tây', 'Tây Bắc'];
  const directionsEn = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const dirs = lang === 'vi' ? directionsVi : directionsEn;
  const index = Math.round(deg / 45) % 8;
  return dirs[index];
}

export function getAQIColor(aqi: number): string {
  if (aqi <= 50) return '#22c55e';
  if (aqi <= 100) return '#eab308';
  if (aqi <= 150) return '#f97316';
  if (aqi <= 200) return '#ef4444';
  if (aqi <= 300) return '#7c3aed';
  return '#7c1f1f';
}

export function getAQIStatusVi(aqi: number): string {
  if (aqi <= 50) return 'Tốt';
  if (aqi <= 100) return 'Trung bình';
  if (aqi <= 150) return 'Không tốt cho nhóm nhạy cảm';
  if (aqi <= 200) return 'Không lành mạnh';
  if (aqi <= 300) return 'Rất xấu';
  return 'Nguy hiểm';
}

export function getAQIStatusEn(aqi: number): string {
  if (aqi <= 50) return 'Good';
  if (aqi <= 100) return 'Moderate';
  if (aqi <= 150) return 'Unhealthy for sensitive groups';
  if (aqi <= 200) return 'Unhealthy';
  if (aqi <= 300) return 'Very unhealthy';
  return 'Hazardous';
}

export function getAQIStatus(aqi: number, lang: 'vi' | 'en' = 'vi'): string {
  return lang === 'vi' ? getAQIStatusVi(aqi) : getAQIStatusEn(aqi);
}

export function formatAirQualitySource(source: AirQualitySource, lang: 'vi' | 'en' = 'vi'): string {
  if (source === 'waqi') return 'WAQI · trạm đo thật';
  return lang === 'vi' ? 'Open-Meteo · ước tính theo tọa độ' : 'Open-Meteo · coordinate estimate';
}

export function formatMicroUpdatedAt(iso: string | null, lang: 'vi' | 'en' = 'vi'): string {
  if (!iso) return lang === 'vi' ? 'không rõ' : 'unknown';
  return new Date(iso).toLocaleTimeString(lang === 'vi' ? 'vi-VN' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}
