export type AQILevel = 'good' | 'moderate' | 'unhealthy-sensitive' | 'unhealthy' | 'very-unhealthy' | 'hazardous';

export function getAQILevel(aqi: number): AQILevel {
  if (aqi <= 50) return 'good';
  if (aqi <= 100) return 'moderate';
  if (aqi <= 150) return 'unhealthy-sensitive';
  if (aqi <= 200) return 'unhealthy';
  if (aqi <= 300) return 'very-unhealthy';
  return 'hazardous';
}

export function getAQIColor(aqi: number): string {
  const level = getAQILevel(aqi);
  const colors: Record<AQILevel, string> = {
    'good': '#00E400',
    'moderate': '#FFFF00',
    'unhealthy-sensitive': '#FF7E00',
    'unhealthy': '#FF0000',
    'very-unhealthy': '#8F3F97',
    'hazardous': '#7E0023',
  };
  return colors[level];
}

export function getAQIBgColor(aqi: number): string {
  if (aqi <= 50) return '#E8F5E9';
  if (aqi <= 100) return '#FFFDE7';
  if (aqi <= 150) return '#FFF3E0';
  if (aqi <= 200) return '#FFEBEE';
  if (aqi <= 300) return '#F3E5F5';
  return '#4A1420';
}

export function getAQIGradient(aqi: number): string {
  const color = getAQIColor(aqi);
  return `linear-gradient(135deg, ${color}22, ${color}08)`;
}

export function getAQILabel(aqi: number, lang: 'vi' | 'en' = 'vi'): string {
  const level = getAQILevel(aqi);
  const labels: Record<AQILevel, { vi: string; en: string }> = {
    'good': { vi: 'Tốt', en: 'Good' },
    'moderate': { vi: 'Trung bình', en: 'Moderate' },
    'unhealthy-sensitive': { vi: 'Kém', en: 'Unhealthy for Sensitive' },
    'unhealthy': { vi: 'Xấu', en: 'Unhealthy' },
    'very-unhealthy': { vi: 'Rất xấu', en: 'Very Unhealthy' },
    'hazardous': { vi: 'Nguy hại', en: 'Hazardous' },
  };
  return labels[level][lang];
}

export function getAQITextColor(aqi: number): string {
  if (aqi <= 100) return '#000';
  return '#fff';
}
