import type { AppLanguage } from '@/lib/language';

const exactEnglish: Record<string, string> = {
  'Vị trí hiện tại (demo)': 'Current location (demo)',
  'Trạm Quận 1': 'District 1 Station',
  'Trạm Quận 3': 'District 3 Station',
  'Trạm Quận 7': 'District 7 Station',
  'Bụi công trình gần nhà (báo cáo demo của tôi).': 'Construction dust near home (my demo report).',
  'Bụi công trình mạnh, công nhân không che chắn (demo).': 'Heavy construction dust with inadequate dust control (demo).',
  'Khói đốt rác gần khu dân cư (demo).': 'Waste-burning smoke near a residential area (demo).',
  'Khói đốt rác ở khu dân cư Quận 7.': 'Waste-burning smoke in a District 7 residential area.',
  'Bụi mù khu vực Bến Thành, tầm nhìn giảm.': 'Dust haze around Ben Thanh with reduced visibility.',
  'Dị ứng bụi mịn.': 'Fine-particle allergy.',
  'Nguyễn Văn A (bố)': 'Nguyễn Văn A (father)',
  'Trần Thị B (vợ)': 'Trần Thị B (spouse)',
  'Hen suyễn nhẹ, dùng ống hít khi cần.': 'Mild asthma; uses an inhaler as needed.',
  'Khói đốt rác vi vùng (demo)': 'Local waste-burning smoke (demo)',
  'Bụi công trình đang thi công (demo)': 'Active construction dust (demo)',
  'Kẹt xe nghiêm trọng, khói nồng (demo)': 'Severe congestion with heavy exhaust (demo)',
  'Công ty — Quận 1': 'Work — District 1',
  'Trường con — Quận Bình Thạnh': "Child's school — Binh Thanh District",
};

export function localizeDemoText(value: string | null | undefined, lang: AppLanguage): string {
  if (!value || lang === 'vi') return value || '';
  if (exactEnglish[value]) return exactEnglish[value];
  return value
    .replace(/\bQuận (\d+)\b/g, 'District $1')
    .replace(/\bTP\.HCM\b/g, 'Ho Chi Minh City')
    .replace(/\bBình Thạnh\b/g, 'Binh Thanh District')
    .replace(/\bTân Bình\b/g, 'Tan Binh District')
    .replace(/\bThủ Đức\b/g, 'Thu Duc City');
}

export function localizeHotspotSource(value: string, lang: AppLanguage): string {
  if (lang === 'en') return value;
  if (value === 'Community report') return 'Báo cáo cộng đồng';
  if (value === 'Community report · DEMO') return 'Báo cáo cộng đồng · DEMO';
  if (value === 'WAQI station') return 'Trạm WAQI';
  const clustered = value.match(/^(\d+) community reports clustered( · DEMO)?$/i);
  if (clustered) return `Cụm ${clustered[1]} báo cáo cộng đồng${clustered[2] || ''}`;
  return value;
}

export function localizeHotspotStatus(value: string, lang: AppLanguage): string {
  const normalized = value.replace(/_/g, ' ').toLowerCase();
  if (lang === 'en') return normalized.replace(/\b\w/g, (char) => char.toUpperCase());
  const labels: Record<string, string> = {
    pending: 'Chờ xác minh',
    active: 'Đang hoạt động',
    resolved: 'Đã xử lý',
    'community detected': 'Cộng đồng phát hiện',
    'station alert': 'Cảnh báo từ trạm',
  };
  return labels[normalized] || value;
}
