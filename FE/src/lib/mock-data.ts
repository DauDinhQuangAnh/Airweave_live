export const currentAQI = {
  aqi: 142,
  pm25: 55.3,
  pm10: 78.1,
  temperature: 31,
  humidity: 72,
  windSpeed: 8,
  windDirection: 'Đông Bắc',
  location: 'Phường Dịch Vọng, Cầu Giấy, Hà Nội',
  updatedAt: new Date().toISOString(),
};

export const aiInsight = {
  vi: 'Không khí đang ở mức kém do mật độ giao thông giờ cao điểm buổi sáng. Hướng gió Đông Bắc đưa bụi từ khu công nghiệp phía Bắc. Dự kiến cải thiện sau 14h chiều.',
  en: 'Air quality is unhealthy due to morning rush hour traffic density. Northeast winds carry dust from northern industrial zones. Expected to improve after 2 PM.',
};

export function generateHourlyForecast() {
  const hours = [];
  const now = new Date();
  for (let i = 0; i < 24; i++) {
    const hour = new Date(now);
    hour.setHours(now.getHours() + i, 0, 0, 0);
    const baseAqi = 100 + Math.sin((hour.getHours() - 8) * 0.5) * 60;
    const aqi = Math.max(20, Math.min(200, Math.round(baseAqi + (Math.random() - 0.5) * 30)));
    hours.push({
      time: hour,
      aqi,
      label: `${hour.getHours().toString().padStart(2, '0')}:00`,
    });
  }
  return hours;
}

export const historicalNews = [
  {
    title: 'Hà Nội ô nhiễm không khí nghiêm trọng, AQI vượt 200',
    source: 'VNExpress',
    date: '2024-12-15',
    url: '#',
  },
  {
    title: 'TP.HCM lọt top 5 thành phố ô nhiễm nhất thế giới',
    source: 'Tuổi Trẻ',
    date: '2024-12-15',
    url: '#',
  },
  {
    title: 'Chuyên gia cảnh báo bụi mịn PM2.5 gây ung thư phổi',
    source: 'Thanh Niên',
    date: '2024-12-15',
    url: '#',
  },
  {
    title: 'Người dân Hà Nội đổ xô mua máy lọc không khí',
    source: 'VNExpress',
    date: '2024-12-14',
    url: '#',
  },
];

// Global ranking mock data
export const globalRanking = {
  isInTop10: true,
  city: 'Hà Nội',
  rank: 3,
  source: 'IQAir',
  url: 'https://www.iqair.com/world-air-quality-ranking',
};
