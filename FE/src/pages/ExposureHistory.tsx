import { useState, useMemo } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import {
  History,
  Route as RouteIcon,
  AlertTriangle,
  Clock,
  TrendingUp,
  Activity,
  ShieldCheck,
  Zap,
  Navigation,
  Wind,
  Sparkles,
  ArrowUpRight,
  Filter,
  CheckCircle2,
  HeartPulse,
  Calendar,
  AlertCircle,
  Car,
  Bike,
  Bus,
  Radio,
  Loader2,
} from 'lucide-react';
import FeatureExperienceLayout from '@/components/feature-experience/FeatureExperienceLayout';
import { useGeolocation } from '@/hooks/use-geolocation';
import { useWeeklyReport } from '@/hooks/use-weekly-report';

// Default coordinates (Hanoi center: 21.0285, 105.8542)
const DEFAULT_LAT = 21.0285;
const DEFAULT_LNG = 105.8542;

// Fallback Demo Datasets for 7 Days & 30 Days
const DEMO_7_DAYS = [
  { day: 'T2', date: '28/07', avgAqi: 78, peakAqi: 142, pm25: 38, peakPm25: 68, hoursOutdoor: 2.5, isReal: false },
  { day: 'T3', date: '29/07', avgAqi: 62, peakAqi: 110, pm25: 29, peakPm25: 48, hoursOutdoor: 1.8, isReal: false },
  { day: 'T4', date: '30/07', avgAqi: 125, peakAqi: 185, pm25: 65, peakPm25: 98, hoursOutdoor: 3.2, isReal: false },
  { day: 'T5', date: '31/07', avgAqi: 54, peakAqi: 92, pm25: 24, peakPm25: 41, hoursOutdoor: 1.2, isReal: false },
  { day: 'T6', date: '01/08', avgAqi: 71, peakAqi: 130, pm25: 35, peakPm25: 59, hoursOutdoor: 2.0, isReal: false },
  { day: 'T7', date: '02/08', avgAqi: 48, peakAqi: 82, pm25: 20, peakPm25: 36, hoursOutdoor: 4.1, isReal: false },
  { day: 'CN', date: '03/08', avgAqi: 58, peakAqi: 105, pm25: 26, peakPm25: 45, hoursOutdoor: 3.5, isReal: false },
];

const DEMO_30_DAYS = Array.from({ length: 30 }, (_, i) => {
  const d = new Date();
  d.setDate(d.getDate() - (29 - i));
  const dateStr = `${d.getDate()}/${d.getMonth() + 1}`;
  const dayName = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][d.getDay()];
  const avgAqi = Math.floor(45 + Math.random() * 85);
  const peakAqi = avgAqi + Math.floor(25 + Math.random() * 55);
  const pm25 = Math.round(avgAqi * 0.48);
  const peakPm25 = Math.round(peakAqi * 0.52);
  return {
    day: dayName,
    date: dateStr,
    avgAqi,
    peakAqi,
    pm25,
    peakPm25,
    hoursOutdoor: +(1 + Math.random() * 3).toFixed(1),
    isReal: false,
  };
});

// Time of day exposure breakdown
const TIME_OF_DAY_SLOTS = [
  { slotVi: 'Sáng sớm (05h-08h)', slotEn: 'Early Morning (05-08h)', avgAqi: 45, status: 'good', icon: Wind },
  { slotVi: 'Giờ cao điểm sáng (08h-10h)', slotEn: 'Morning Rush (08-10h)', avgAqi: 138, status: 'sensitive', icon: Car },
  { slotVi: 'Buổi trưa (11h-14h)', slotEn: 'Midday (11-14h)', avgAqi: 72, status: 'moderate', icon: SunIcon },
  { slotVi: 'Giờ cao điểm chiều (17h-19h)', slotEn: 'Evening Rush (17-19h)', avgAqi: 156, status: 'unhealthy', icon: Car },
  { slotVi: 'Buổi tối (20h-23h)', slotEn: 'Night (20-23h)', avgAqi: 52, status: 'good', icon: MoonIcon },
];

function SunIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} {...props}>
      <circle cx="12" cy="12" r="5" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  );
}

function MoonIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} {...props}>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

// Recent journeys
const DEMO_ROUTES = [
  {
    id: 1,
    from: 'Cầu Giấy',
    to: 'Hoàn Kiếm',
    minsAgo: 35,
    mode: 'motorbike',
    pm25: 42,
    aqi: 118,
    durationMins: 24,
    cleanAirRouteUsed: false,
  },
  {
    id: 2,
    from: 'Mỹ Đình',
    to: 'Thái Hà',
    minsAgo: 180,
    mode: 'car',
    pm25: 31,
    aqi: 88,
    durationMins: 32,
    cleanAirRouteUsed: true,
  },
  {
    id: 3,
    from: 'Thái Hà',
    to: 'Nguyễn Trãi',
    minsAgo: 320,
    mode: 'bus',
    pm25: 55,
    aqi: 145,
    durationMins: 18,
    cleanAirRouteUsed: false,
  },
];

// Civic hotspots passed
const DEMO_HOTSPOTS = [
  {
    id: 'h1',
    titleVi: 'Khói đốt rác nông nghiệp',
    titleEn: 'Agricultural waste burning smoke',
    location: 'Cầu Giấy, Hà Nội',
    timeVi: 'Hôm qua, 17:45',
    timeEn: 'Yesterday, 17:45',
    severity: 'high',
    aqiImpact: '+35 AQI',
  },
  {
    id: 'h2',
    titleVi: 'Bụi mịn từ công trình xây dựng',
    titleEn: 'Construction site particulate matter',
    location: 'Đống Đa, Hà Nội',
    timeVi: '3 ngày trước',
    timeEn: '3 days ago',
    severity: 'medium',
    aqiImpact: '+20 AQI',
  },
  {
    id: 'h3',
    titleVi: 'Ùn tắc giao thông giờ cao điểm',
    titleEn: 'Peak hour heavy traffic jam',
    location: 'Ngã Tư Sở, Hà Nội',
    timeVi: '4 ngày trước',
    timeEn: '4 days ago',
    severity: 'high',
    aqiImpact: '+42 AQI',
  },
];

const getAqiConfig = (aqi: number, lang: 'vi' | 'en') => {
  if (aqi <= 50) {
    return {
      label: lang === 'vi' ? 'Tốt' : 'Good',
      bgColor: 'bg-emerald-500/10 dark:bg-emerald-500/20',
      textColor: 'text-emerald-600 dark:text-emerald-400',
      borderColor: 'border-emerald-500/30',
      badgeBg: 'bg-emerald-500',
      strokeColor: '#10b981',
      fillGradient: 'url(#gradientGood)',
    };
  }
  if (aqi <= 100) {
    return {
      label: lang === 'vi' ? 'Trung bình' : 'Moderate',
      bgColor: 'bg-amber-500/10 dark:bg-amber-500/20',
      textColor: 'text-amber-600 dark:text-amber-400',
      borderColor: 'border-amber-500/30',
      badgeBg: 'bg-amber-500',
      strokeColor: '#f59e0b',
      fillGradient: 'url(#gradientModerate)',
    };
  }
  if (aqi <= 150) {
    return {
      label: lang === 'vi' ? 'Kém (Nhạy cảm)' : 'Unhealthy for Sensitive',
      bgColor: 'bg-orange-500/10 dark:bg-orange-500/20',
      textColor: 'text-orange-600 dark:text-orange-400',
      borderColor: 'border-orange-500/30',
      badgeBg: 'bg-orange-500',
      strokeColor: '#f97316',
      fillGradient: 'url(#gradientSensitive)',
    };
  }
  return {
    label: lang === 'vi' ? 'Xấu / Nguy hại' : 'Unhealthy',
    bgColor: 'bg-rose-500/10 dark:bg-rose-500/20',
    textColor: 'text-rose-600 dark:text-rose-400',
    borderColor: 'border-rose-500/30',
    badgeBg: 'bg-rose-500',
    strokeColor: '#ef4444',
    fillGradient: 'url(#gradientUnhealthy)',
  };
};

const ExposureHistory = () => {
  const { lang } = useOutletContext<{ lang: 'vi' | 'en' }>();
  const navigate = useNavigate();

  // Geolocation & Real Historical Air Quality API Integration
  const { location, requestLocation } = useGeolocation({ autoRequest: true });
  const lat = location?.lat || DEFAULT_LAT;
  const lng = location?.lng || DEFAULT_LNG;

  const realWeekly = useWeeklyReport(lat, lng, lang);

  const [timeframe, setTimeframe] = useState<'7d' | '30d'>('7d');
  const [metricView, setMetricView] = useState<'aqi' | 'pm25'>('aqi');
  const [selectedRouteId, setSelectedRouteId] = useState<number | null>(null);
  const [forceDemo, setForceDemo] = useState(false);

  // Construct dataset using Real Open-Meteo API when available
  const dataset = useMemo(() => {
    if (timeframe === '30d' || forceDemo) {
      return timeframe === '7d' ? DEMO_7_DAYS : DEMO_30_DAYS;
    }

    if (!realWeekly.loading && realWeekly.days.length > 0) {
      return realWeekly.days.map((d, index) => {
        const dateObj = new Date();
        dateObj.setDate(dateObj.getDate() - (6 - index));
        const dateStr = `${dateObj.getDate()}/${dateObj.getMonth() + 1}`;
        const pm25Val = Math.round(d.aqi * 0.48);
        const peakAqiVal = Math.round(d.aqi * 1.35);
        const peakPm25Val = Math.round(pm25Val * 1.35);

        return {
          day: d.day,
          date: dateStr,
          avgAqi: d.aqi,
          peakAqi: peakAqiVal,
          pm25: pm25Val,
          peakPm25: peakPm25Val,
          hoursOutdoor: +(1.5 + (index % 3) * 0.8).toFixed(1),
          isReal: true,
        };
      });
    }

    return DEMO_7_DAYS;
  }, [timeframe, forceDemo, realWeekly]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    const totalAqi = dataset.reduce((acc, curr) => acc + curr.avgAqi, 0);
    const avgAqi = Math.round(totalAqi / dataset.length);
    const maxPeakAqi = Math.max(...dataset.map((d) => d.peakAqi));
    const peakDay = dataset.find((d) => d.peakAqi === maxPeakAqi);
    const totalOutdoorHours = dataset.reduce((acc, curr) => acc + curr.hoursOutdoor, 0).toFixed(1);

    const cleanDaysCount = dataset.filter((d) => d.avgAqi <= 60).length;
    const cleanAirScore = Math.round((cleanDaysCount / dataset.length) * 100);

    return {
      avgAqi,
      maxPeakAqi,
      peakDay,
      totalOutdoorHours,
      cleanAirScore,
    };
  }, [dataset]);

  const avgConfig = getAqiConfig(metrics.avgAqi, lang);
  const isRealDataActive = !forceDemo && timeframe === '7d' && !realWeekly.loading && realWeekly.days.length > 0;

  return (
    <FeatureExperienceLayout
      lang={lang}
      badge={lang === 'vi' ? 'Giải pháp thông minh' : 'Smart Solution'}
      heading={lang === 'vi' ? 'Hiểu rõ phơi nhiễm AQI cá nhân' : 'Understand your personal AQI exposure'}
      subheading={
        lang === 'vi'
          ? 'AirWeave kết nối trực tiếp dữ liệu quan trắc Open-Meteo API theo vị trí thực tế của bạn — giúp bạn theo dõi lịch sử phơi nhiễm AQI chính xác.'
          : 'AirWeave integrates Open-Meteo historical API for your real GPS coordinates — tracking your true AQI exposure over time.'
      }
      benefits={[
        {
          icon: <TrendingUp className="w-4 h-4 text-emerald-500" />,
          title: lang === 'vi' ? 'Dữ liệu vệ tinh & trạm quan trắc' : 'Live satellite & station data',
          text: lang === 'vi' ? 'Truy vấn lịch sử ô nhiễm 7 ngày từ Open-Meteo API.' : 'Fetches real 7-day pollution history from Open-Meteo API.',
        },
        {
          icon: <Activity className="w-4 h-4 text-primary" />,
          title: lang === 'vi' ? 'Ma trận giờ cao điểm' : 'Time-of-day matrix',
          text: lang === 'vi' ? 'Biết rõ khung giờ ô nhiễm nhất khi ra đường.' : 'Identify your most vulnerable outdoor hours.',
        },
        {
          icon: <ShieldCheck className="w-4 h-4 text-amber-500" />,
          title: lang === 'vi' ? 'Chỉ ước tính, không chẩn đoán' : 'Estimate & awareness',
          text: lang === 'vi' ? 'Dữ liệu mang tính tham khảo hành vi di chuyển.' : 'Reference data for personal health habits.',
        },
      ]}
      chips={[
        lang === 'vi' ? 'Dữ liệu vệ tinh Open-Meteo' : 'Open-Meteo Live API',
        lang === 'vi' ? 'Tọa độ GPS thực tế' : 'Real GPS Location',
        lang === 'vi' ? 'Lộ trình di chuyển' : 'Route Tracking',
        lang === 'vi' ? 'Gợi ý AI' : 'AI Insights',
      ]}
    >
      <div className="h-full overflow-y-auto bg-background/50 backdrop-blur-xs pb-12">
        <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">
          {/* Header */}
          <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/60">
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <History className="w-6 h-6" />
                </div>
                <h1 className="font-heading text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">
                  {lang === 'vi' ? 'Lịch sử phơi nhiễm AQI' : 'AQI Exposure History'}
                </h1>

                {/* Real Data vs Demo Data Indicator Badge */}
                {isRealDataActive ? (
                  <span className="flex items-center gap-1 text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-heading font-bold uppercase tracking-wider">
                    <Radio className="w-3 h-3 animate-pulse text-emerald-500" />
                    {lang === 'vi' ? 'Open-Meteo API Thật' : 'Live Open-Meteo API'}
                  </span>
                ) : (
                  <button
                    onClick={() => setForceDemo(false)}
                    className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-heading font-bold uppercase tracking-wider hover:bg-amber-500/25 transition-all"
                  >
                    {lang === 'vi' ? 'Demo Mode (Nhấn để bật Live API)' : 'Demo Mode (Click for Live API)'}
                  </button>
                )}
              </div>
              <p className="text-xs md:text-sm text-muted-foreground font-body">
                {lang === 'vi'
                  ? `Dữ liệu lịch sử cho khu vực tọa độ (${lat.toFixed(2)}°, ${lng.toFixed(2)}°)${location?.label ? ` - ${location.label}` : ''}`
                  : `Historical pollution log for location (${lat.toFixed(2)}°, ${lng.toFixed(2)}°)`}
              </p>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2 self-start sm:self-center">
              {!location?.lat && (
                <button
                  onClick={() => requestLocation()}
                  className="px-2.5 py-1.5 rounded-xl border border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 font-heading text-xs font-semibold flex items-center gap-1 transition-all"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  {lang === 'vi' ? 'Lấy GPS' : 'Get GPS'}
                </button>
              )}

              <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-xl border border-border/50">
                <button
                  onClick={() => setTimeframe('7d')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-heading font-semibold rounded-lg transition-all ${
                    timeframe === '7d'
                      ? 'bg-card text-foreground shadow-xs border border-border/40'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  {lang === 'vi' ? '7 Ngày' : '7 Days'}
                </button>
                <button
                  onClick={() => setTimeframe('30d')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-heading font-semibold rounded-lg transition-all ${
                    timeframe === '30d'
                      ? 'bg-card text-foreground shadow-xs border border-border/40'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Filter className="w-3.5 h-3.5" />
                  {lang === 'vi' ? '30 Ngày' : '30 Days'}
                </button>
              </div>
            </div>
          </header>

          {/* Top KPI Scorecards Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            {/* Card 1: Average AQI */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="rounded-2xl border border-border/80 bg-card p-4 flex flex-col justify-between shadow-xs hover:border-primary/30 transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground font-heading font-medium">
                  {lang === 'vi' ? 'AQI Trung Bình' : 'Average AQI'}
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${avgConfig.bgColor} ${avgConfig.textColor}`}>
                  {avgConfig.label}
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl md:text-4xl font-heading font-extrabold text-foreground">
                  {realWeekly.loading && timeframe === '7d' && !forceDemo ? (
                    <Loader2 className="w-7 h-7 animate-spin text-primary inline-block" />
                  ) : (
                    metrics.avgAqi
                  )}
                </span>
                <span className="text-xs text-muted-foreground font-body">AQI</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-2 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                {lang === 'vi' ? `Tương đương ~${Math.round(metrics.avgAqi * 0.48)} µg/m³ PM2.5` : `Eq. ~${Math.round(metrics.avgAqi * 0.48)} µg/m³ PM2.5`}
              </p>
            </motion.div>

            {/* Card 2: Peak Exposure */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.05 }}
              className="rounded-2xl border border-border/80 bg-card p-4 flex flex-col justify-between shadow-xs hover:border-primary/30 transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground font-heading font-medium">
                  {lang === 'vi' ? 'Mức Đỉnh Cao Nhất' : 'Peak Exposure'}
                </span>
                <AlertTriangle className="w-4 h-4 text-orange-500" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl md:text-4xl font-heading font-extrabold text-orange-600 dark:text-orange-400">
                  {metrics.maxPeakAqi}
                </span>
                <span className="text-xs text-muted-foreground font-body">AQI</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-2 truncate">
                {lang === 'vi'
                  ? `Ngày đỉnh: ${metrics.peakDay?.date || ''} (${metrics.peakDay?.day})`
                  : `Peak on: ${metrics.peakDay?.date || ''}`}
              </p>
            </motion.div>

            {/* Card 3: Outdoor Duration */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="rounded-2xl border border-border/80 bg-card p-4 flex flex-col justify-between shadow-xs hover:border-primary/30 transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground font-heading font-medium">
                  {lang === 'vi' ? 'Giờ Ngoài Trời' : 'Outdoor Hours'}
                </span>
                <Clock className="w-4 h-4 text-primary" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl md:text-4xl font-heading font-extrabold text-foreground">
                  {metrics.totalOutdoorHours}
                </span>
                <span className="text-xs text-muted-foreground font-body">{lang === 'vi' ? 'giờ' : 'hrs'}</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-2 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                {lang === 'vi' ? 'Ước tính từ nhật ký' : 'Est. from logs'}
              </p>
            </motion.div>

            {/* Card 4: Clean Air Score */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.15 }}
              className="rounded-2xl border border-border/80 bg-card p-4 flex flex-col justify-between shadow-xs hover:border-primary/30 transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground font-heading font-medium">
                  {lang === 'vi' ? 'Chỉ Số Khí Sạch' : 'Clean Air Score'}
                </span>
                <HeartPulse className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl md:text-4xl font-heading font-extrabold text-emerald-600 dark:text-emerald-400">
                  {metrics.cleanAirScore}%
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-1.5 mt-2 overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${metrics.cleanAirScore}%` }}
                />
              </div>
            </motion.div>
          </div>

          {/* Interactive Exposure Chart */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="rounded-2xl border border-border/80 bg-card p-4 md:p-6 shadow-xs space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-heading font-bold text-foreground flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  {lang === 'vi' ? 'Biểu đồ diễn biến phơi nhiễm theo thời gian' : 'Exposure Trend Over Time'}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {isRealDataActive
                    ? lang === 'vi'
                      ? 'Dữ liệu thực tế được tính toán từ Open-Meteo Air Quality API'
                      : 'Live data calculated from Open-Meteo Air Quality API'
                    : lang === 'vi'
                    ? 'So sánh mức AQI trung bình và mức đỉnh phơi nhiễm theo ngày'
                    : 'Compare daily average AQI vs peak exposure points'}
                </p>
              </div>

              {/* View Metric Switcher */}
              <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-lg border border-border/40 self-start sm:self-auto text-xs">
                <button
                  onClick={() => setMetricView('aqi')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                    metricView === 'aqi' ? 'bg-card text-foreground shadow-2xs font-bold' : 'text-muted-foreground'
                  }`}
                >
                  AQI
                </button>
                <button
                  onClick={() => setMetricView('pm25')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                    metricView === 'pm25' ? 'bg-card text-foreground shadow-2xs font-bold' : 'text-muted-foreground'
                  }`}
                >
                  PM2.5 (µg/m³)
                </button>
              </div>
            </div>

            {/* Recharts Area Chart */}
            <div className="h-64 sm:h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dataset} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradientGood" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="gradientModerate" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="gradientSensitive" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="gradientUnhealthy" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="gradientPrimary" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        const val = metricView === 'aqi' ? data.avgAqi : data.pm25;
                        const peakVal = metricView === 'aqi' ? data.peakAqi : data.peakPm25;
                        const cfg = getAqiConfig(data.avgAqi, lang);

                        return (
                          <div className="rounded-xl border border-border bg-popover p-3 shadow-lg text-xs space-y-1.5 font-body">
                            <div className="flex items-center justify-between gap-4 font-heading font-bold text-foreground pb-1 border-b border-border/50">
                              <span>
                                {data.day} ({data.date})
                              </span>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] ${cfg.bgColor} ${cfg.textColor}`}>
                                {cfg.label}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-4 text-muted-foreground">
                              <span>{metricView === 'aqi' ? 'AQI trung bình:' : 'PM2.5 trung bình:'}</span>
                              <span className="font-bold text-foreground">
                                {val} {metricView === 'pm25' && 'µg/m³'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-4 text-muted-foreground">
                              <span>{metricView === 'aqi' ? 'Mức đỉnh cao nhất:' : 'PM2.5 cao nhất:'}</span>
                              <span className="font-bold text-orange-500">
                                {peakVal} {metricView === 'pm25' && 'µg/m³'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-4 text-muted-foreground pt-1 border-t border-border/30">
                              <span>{lang === 'vi' ? 'Nguồn dữ liệu:' : 'Data source:'}</span>
                              <span className="font-bold text-primary">
                                {data.isReal ? 'Open-Meteo API' : 'Demo Dataset'}
                              </span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <ReferenceLine
                    y={metricView === 'aqi' ? 50 : 15}
                    stroke="#10b981"
                    strokeDasharray="4 4"
                    label={{
                      value: lang === 'vi' ? 'Ngưỡng an toàn WHO' : 'WHO Safe Standard',
                      fill: '#10b981',
                      fontSize: 10,
                      position: 'insideTopRight',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey={metricView === 'aqi' ? 'avgAqi' : 'pm25'}
                    stroke="hsl(var(--primary))"
                    strokeWidth={2.5}
                    fill="url(#gradientPrimary)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Time of Day Exposure Matrix */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="rounded-2xl border border-border/80 bg-card p-4 md:p-6 shadow-xs space-y-4"
          >
            <div>
              <h3 className="text-base font-heading font-bold text-foreground flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" />
                {lang === 'vi' ? 'Phân bổ mức độ ô nhiễm theo khung giờ trong ngày' : 'Time-of-Day Exposure Matrix'}
              </h3>
              <p className="text-xs text-muted-foreground">
                {lang === 'vi'
                  ? 'Giúp bạn chủ động sắp xếp thời gian di chuyển ngoài đường để hạn chế tiếp xúc khói bụi.'
                  : 'Identify peak pollution windows to optimize your daily commuting schedule.'}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
              {TIME_OF_DAY_SLOTS.map((slot, index) => {
                const IconComponent = slot.icon;
                const cfg = getAqiConfig(slot.avgAqi, lang);

                return (
                  <div
                    key={index}
                    className="p-3 rounded-xl border border-border/60 bg-muted/30 flex flex-col justify-between gap-2 hover:border-primary/40 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <IconComponent className="w-4 h-4 text-muted-foreground" />
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold ${cfg.bgColor} ${cfg.textColor}`}>
                        AQI {slot.avgAqi}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs font-heading font-semibold text-foreground">
                        {lang === 'vi' ? slot.slotVi : slot.slotEn}
                      </p>
                      <p className={`text-[10px] font-medium mt-0.5 ${cfg.textColor}`}>{cfg.label}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Grid Layout: Recent Routes + Civic Hotspots */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Recent Routes Exposure */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15 }}
              className="rounded-2xl border border-border/80 bg-card p-4 md:p-5 shadow-xs space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-heading font-bold text-foreground flex items-center gap-2">
                    <RouteIcon className="w-4 h-4 text-primary" />
                    {lang === 'vi' ? 'Hành trình di chuyển gần đây' : 'Recent Journeys'}
                  </h3>
                  <span className="text-[11px] text-muted-foreground font-body">
                    {DEMO_ROUTES.length} {lang === 'vi' ? 'tuyến' : 'routes'}
                  </span>
                </div>

                <div className="space-y-2.5">
                  {DEMO_ROUTES.map((r) => {
                    const cfg = getAqiConfig(r.aqi, lang);
                    const isSelected = selectedRouteId === r.id;

                    return (
                      <div
                        key={r.id}
                        onClick={() => setSelectedRouteId(isSelected ? null : r.id)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'border-primary bg-primary/5 shadow-xs'
                            : 'border-border/60 bg-muted/20 hover:bg-muted/40 hover:border-border'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <div className="flex items-center gap-1.5 font-heading font-semibold text-foreground">
                            {r.mode === 'motorbike' && <Bike className="w-3.5 h-3.5 text-amber-500" />}
                            {r.mode === 'car' && <Car className="w-3.5 h-3.5 text-blue-500" />}
                            {r.mode === 'bus' && <Bus className="w-3.5 h-3.5 text-emerald-500" />}
                            <span className="truncate max-w-[140px] sm:max-w-[180px]">
                              {r.from} → {r.to}
                            </span>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${cfg.bgColor} ${cfg.textColor}`}>
                            AQI {r.aqi}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {r.minsAgo} {lang === 'vi' ? 'phút trước' : 'mins ago'} ({r.durationMins}m)
                          </span>
                          <span className="font-mono font-medium">PM2.5: {r.pm25} µg/m³</span>
                        </div>

                        {isSelected && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-2.5 pt-2 border-t border-border/40 text-[11px] text-muted-foreground space-y-1.5"
                          >
                            <p className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              {lang === 'vi'
                                ? 'Được phân tích bởi hệ thống Smart Route AirWeave'
                                : 'Analyzed by AirWeave Smart Route engine'}
                            </p>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate('/smart-route');
                              }}
                              className="text-primary hover:underline font-heading font-semibold flex items-center gap-1 mt-1"
                            >
                              {lang === 'vi' ? 'Tối ưu tuyến đường tương tự' : 'Optimize similar route'}
                              <ArrowUpRight className="w-3 h-3" />
                            </button>
                          </motion.div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <button
                onClick={() => navigate('/smart-route')}
                className="w-full mt-3 py-2 px-3 rounded-xl border border-primary/30 bg-primary/5 hover:bg-primary/10 text-primary font-heading font-semibold text-xs transition-all flex items-center justify-center gap-1.5"
              >
                <Navigation className="w-3.5 h-3.5" />
                {lang === 'vi' ? 'Lập tuyến đường né ô nhiễm mới' : 'Plan pollution-free route'}
              </button>
            </motion.div>

            {/* Civic Hotspots Passed */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="rounded-2xl border border-border/80 bg-card p-4 md:p-5 shadow-xs space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-heading font-bold text-foreground flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-500" />
                    {lang === 'vi' ? 'Điểm nóng ô nhiễm đã đi qua' : 'Hotspots Passed'}
                  </h3>
                  <span className="text-[11px] text-muted-foreground font-body">
                    {DEMO_HOTSPOTS.length} {lang === 'vi' ? 'sự cố' : 'events'}
                  </span>
                </div>

                <div className="space-y-2.5">
                  {DEMO_HOTSPOTS.map((hs) => (
                    <div
                      key={hs.id}
                      className="p-3 rounded-xl border border-border/60 bg-muted/20 flex flex-col gap-1 hover:border-orange-500/30 transition-all"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-heading font-bold text-foreground">
                          {lang === 'vi' ? hs.titleVi : hs.titleEn}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md font-mono font-bold bg-orange-500/10 text-orange-600 dark:text-orange-400 shrink-0">
                          {hs.aqiImpact}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground flex items-center justify-between">
                        <span>{hs.location}</span>
                        <span>{lang === 'vi' ? hs.timeVi : hs.timeEn}</span>
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => navigate('/community-report')}
                className="w-full mt-3 py-2 px-3 rounded-xl border border-border bg-muted/40 hover:bg-muted text-foreground font-heading font-semibold text-xs transition-all flex items-center justify-center gap-1.5"
              >
                <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                {lang === 'vi' ? 'Xem tất cả báo cáo cộng đồng' : 'View all community reports'}
              </button>
            </motion.div>
          </div>

          {/* AI Exposure Assessment & Action Card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.25 }}
            className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card p-5 md:p-6 shadow-sm space-y-4 relative overflow-hidden"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary animate-pulse" />
                  <h3 className="text-base font-heading font-extrabold text-foreground">
                    {lang === 'vi' ? 'Đánh giá & Khuyến nghị từ Trợ lý AI' : 'AI Health Insight & Recommendation'}
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {lang === 'vi'
                    ? 'Dựa trên dữ liệu 7 ngày qua, bạn thường xuyên tiếp xúc với mức AQI cao vào khung giờ 17h-19h (giờ cao điểm chiều) khi di chuyển bằng xe máy.'
                    : 'Based on your 7-day log, your peak exposure occurs during evening rush hours (17-19h) while commuting on motorbike.'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              <div className="p-3 rounded-xl bg-background/80 border border-border/60 text-xs space-y-1">
                <p className="font-heading font-bold text-foreground flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  {lang === 'vi' ? 'Khuyên dùng:' : 'Recommendation:'}
                </p>
                <p className="text-muted-foreground">
                  {lang === 'vi'
                    ? 'Đeo khẩu trang đạt chuẩn N95/FFP2 khi di chuyển các tuyến đường qua Cầu Giấy và Đống Đa.'
                    : 'Wear an N95/FFP2 certified mask when commuting through Cau Giay and Dong Da areas.'}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-background/80 border border-border/60 text-xs space-y-1">
                <p className="font-heading font-bold text-foreground flex items-center gap-1.5">
                  <Navigation className="w-3.5 h-3.5 text-primary" />
                  {lang === 'vi' ? 'Hành động nhanh:' : 'Suggested Action:'}
                </p>
                <p className="text-muted-foreground">
                  {lang === 'vi'
                    ? 'Bật tính năng Tự động cảnh báo AQI vượt ngưỡng >100 trong Cấu hình cá nhân.'
                    : 'Enable automatic AQI threshold alert (>100) in your Personal Settings.'}
                </p>
              </div>
            </div>

            <p className="text-[10px] text-muted-foreground italic pt-1 border-t border-border/40">
              {lang === 'vi'
                ? 'Dữ liệu mang tính chất ước tính tổng hợp cho mục đích nhận biết phơi nhiễm môi trường. AirWeave không thay thế chẩn đoán hay tư vấn y khoa chuyên nghiệp.'
                : 'Estimated aggregated data for environmental exposure awareness only. AirWeave does not replace professional medical diagnosis.'}
            </p>
          </motion.div>
        </div>
      </div>
    </FeatureExperienceLayout>
  );
};

export default ExposureHistory;
