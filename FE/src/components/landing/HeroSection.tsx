import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, MapPin, Loader2, LocateFixed, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useGeolocation } from '@/hooks/use-geolocation';
import { useWeatherData } from '@/hooks/use-weather-data';

function getAQIColor(aqi: number) {
  if (aqi <= 50) return '#22c55e';
  if (aqi <= 100) return '#eab308';
  if (aqi <= 150) return '#f97316';
  if (aqi <= 200) return '#ef4444';
  if (aqi <= 300) return '#7c3aed';
  return '#7c1f1f';
}

function getAQIStatus(aqi: number) {
  if (aqi <= 50) return '✅ Tốt';
  if (aqi <= 100) return '🟡 Trung bình';
  if (aqi <= 150) return '⚠️ Không tốt cho nhóm nhạy cảm';
  if (aqi <= 200) return '🔴 Không lành mạnh';
  if (aqi <= 300) return '🟣 Rất xấu';
  return '☠️ Nguy hiểm';
}

const HeroSection = () => {
  const navigate = useNavigate();
  const { location: geo, requestLocation } = useGeolocation({
    autoRequest: true,
    requirePriorConsentForAutoRequest: false,
  });
  const { weather, hourlyForecast } = useWeatherData(geo, 'vi');

  const [aqi, setAqi] = useState(0);
  const [shouldRenderVideo, setShouldRenderVideo] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const animatedRef = useRef(false);

  useEffect(() => {
    const motionQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    const isMobile = window.innerWidth < 768;
    const slowNet = connection?.effectiveType ? /(^|-)2g$/.test(connection.effectiveType) : false;

    // Mobile / reduced-motion / saveData / slow network → static poster only
    if (isMobile || motionQuery?.matches || connection?.saveData || slowNet) {
      return;
    }

    // Defer the heavy video until the browser is idle (after main content interactive)
    const requestIdle = (window as any).requestIdleCallback as
      | ((cb: IdleRequestCallback, opts?: { timeout: number }) => number)
      | undefined;
    const cancelIdle = (window as any).cancelIdleCallback as ((id: number) => void) | undefined;

    let idleId: number | undefined;
    let timeoutId: number | undefined;
    const enable = () => setShouldRenderVideo(true);

    if (requestIdle) {
      idleId = requestIdle(enable, { timeout: 3000 });
    } else {
      timeoutId = window.setTimeout(enable, 1800);
    }

    return () => {
      if (idleId !== undefined && cancelIdle) cancelIdle(idleId);
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    };
  }, []);

  // Count-up animation when real AQI arrives
  useEffect(() => {
    if (weather.loading || weather.aqi === 0) return;
    const target = weather.aqi;
    if (animatedRef.current) {
      // Smooth transition for subsequent updates
      setAqi(target);
      return;
    }
    animatedRef.current = true;
    let frame = 0;
    const totalFrames = 60;
    const iv = setInterval(() => {
      frame++;
      setAqi(Math.round((frame / totalFrames) * target));
      if (frame >= totalFrames) {
        setAqi(target);
        clearInterval(iv);
      }
    }, 25);
    return () => clearInterval(iv);
  }, [weather.aqi, weather.loading]);

  const metrics = [
    { label: 'PM2.5', value: weather.pm25 ? weather.pm25.toFixed(1) : '--', unit: 'µg/m³', color: '#f59e0b' },
    { label: 'PM10', value: weather.pm10 ? weather.pm10.toFixed(1) : '--', unit: 'µg/m³', color: '#0ea5e9' },
    { label: 'Nhiệt độ', value: weather.temperature ? `${weather.temperature}` : '--', unit: '°C', color: '#22c55e' },
    { label: 'Độ ẩm', value: weather.humidity ? `${weather.humidity}` : '--', unit: '%', color: '#0ea5e9' },
    { label: 'Gió', value: weather.windSpeed ? `${weather.windSpeed}` : '--', unit: `km/h`, color: '#7c3aed' },
    { label: 'Hướng', value: weather.windDirection || '--', unit: '', color: '#00d4aa' },
  ];

  const now = weather.updatedAt
    ? new Date(weather.updatedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    : new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  const pct = Math.min(aqi / 300, 1) * 100;
  const isDenied = geo.permissionState === 'denied';
  const isUnsupported = geo.permissionState === 'unsupported';
  const isIframeBlocked = geo.status === 'iframe-blocked';
  const isIdle = geo.status === 'idle';
  const hasGeoError = !geo.loading && !isIdle && (isDenied || isUnsupported || isIframeBlocked || geo.status === 'unavailable');
  const locationLabel = geo.loading
    ? 'Đang xác định vị trí...'
    : isIdle
      ? 'Đang chờ quyền vị trí của bạn'
      : isIframeBlocked
        ? 'GPS bị chặn trong Preview — mở Published URL'
        : isDenied
          ? 'Bạn đã chặn quyền vị trí'
          : isUnsupported
            ? 'Trình duyệt không hỗ trợ GPS'
            : hasGeoError
              ? 'Không lấy được vị trí hiện tại'
              : geo.label;
  const isLoadingData = weather.loading || geo.loading;


  return (
    <section className="relative py-12 md:py-32 overflow-hidden isolate">
      {/* 3D Video Background Layer — only on hero */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
        style={{
          perspective: '1200px',
          backgroundImage: "url('/landing-hero-poster.svg')",
          backgroundSize: 'cover',
          backgroundPosition: 'center 40%',
        }}
      >
        {shouldRenderVideo && (
          <video
            poster="/landing-hero-poster.svg"
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            onCanPlay={() => setVideoReady(true)}
            className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700 pointer-events-none"
            style={{
              objectPosition: 'center 40%',
              transform: 'scale(1.04)',
              filter: 'saturate(1.2) contrast(1.08)',
              opacity: videoReady ? 1 : 0,
              willChange: 'opacity',
            }}
          >
            <source src="/landing-hero.webm" type="video/webm" />
          </video>
        )}
        {/* Cinematic deep-navy gradient overlay — lets video breathe, keeps premium medical-tech mood */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#020617]/55 via-[#0a1f3d]/45 to-[#020617]/80" />
        {/* Subtle cyan glow from top for brand atmosphere */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(94,234,212,0.12),transparent_55%)]" />
        {/* Radial vignette to focus center */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,transparent_55%,rgba(2,6,23,0.55)_100%)]" />
        {/* Bottom blend to next section */}
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-b from-transparent to-background" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 md:px-4 py-1.5 rounded-full border border-[#5EEAD4]/40 bg-[#020617]/40 backdrop-blur-md mb-6 md:mb-8 shadow-[0_0_20px_rgba(94,234,212,0.15)] animate-fade-in">
          <span className="w-2 h-2 rounded-full bg-[#5EEAD4] animate-pulse shadow-[0_0_8px_rgba(94,234,212,0.8)]" />
          <span className="text-[11px] md:text-sm font-body font-semibold text-[#CBD5E1]">Nền tảng không khí #1 Việt Nam</span>
        </div>

        {/* H1 */}
        <h1 className="font-heading text-[clamp(32px,8vw,88px)] font-extrabold leading-[1.05] tracking-[-1px] md:tracking-[-2px] mb-4 md:mb-6 [text-shadow:0_2px_20px_rgba(2,6,23,0.7),0_1px_3px_rgba(2,6,23,0.5)] animate-fade-in">
          <span className="text-[#F5F7FA]">Hít thở thông minh hơn.</span>
          <br />
          <span className="bg-gradient-to-r from-[#5EEAD4] via-[#67E8F9] to-[#7DD3FC] bg-clip-text text-transparent">Sống khỏe hơn.</span>
        </h1>

        {/* Subtitle */}
        <p className="text-sm md:text-lg font-body font-medium text-[#CBD5E1] max-w-[560px] mx-auto mb-8 md:mb-10 leading-relaxed px-2 [text-shadow:0_1px_8px_rgba(2,6,23,0.6)] animate-fade-in">
          Trợ lý hô hấp cá nhân giúp bạn theo dõi chất lượng không khí vi vùng, tìm lộ trình sạch và bảo vệ sức khỏe mỗi ngày tại Hà Nội & TP.HCM.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-10 md:mb-16 animate-fade-in">
          <Button size="lg" onClick={() => navigate('/auth')} className="font-heading font-bold gap-2 px-6 md:px-8 bg-gradient-to-r from-[#14B8A6] via-[#06B6D4] to-[#0EA5E9] hover:opacity-90 text-white shadow-[0_0_30px_rgba(94,234,212,0.4)] border-0">
            Tải ứng dụng miễn phí
            <ArrowRight className="w-4 h-4" />
          </Button>
          <Button size="lg" variant="outline" onClick={() => navigate('/auth')} className="font-heading font-semibold px-6 md:px-8 border-[#5EEAD4]/40 bg-[#020617]/40 backdrop-blur-md hover:bg-[#5EEAD4]/10 hover:border-[#5EEAD4]/70 text-[#F5F7FA]">
            Xem demo live →
          </Button>
        </div>

        {/* Dashboard Preview Card */}
        <div className="max-w-[900px] mx-auto rounded-2xl p-4 md:p-6 bg-card/80 backdrop-blur-xl border border-border shadow-xl animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between mb-3 text-sm font-body gap-2 flex-wrap">
            <span className="flex items-center gap-1.5 text-foreground/70 min-w-0">
              {geo.loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
              ) : hasGeoError ? (
                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-500" />
              ) : (
                <MapPin className="w-3.5 h-3.5 shrink-0" />
              )}
              <span className="truncate text-xs md:text-sm">{locationLabel}</span>
              {geo.isRefining && <span className="text-[10px] text-amber-500 ml-1 shrink-0">GPS refining...</span>}
              {typeof geo.accuracy === 'number' && !geo.loading && !hasGeoError && (
                <span className="text-[10px] text-primary/70 ml-1 shrink-0">±{geo.accuracy}m</span>
              )}
            </span>
            <span className="flex items-center gap-2 text-muted-foreground shrink-0">
              {weather.source === 'waqi' && weather.station && !weather.loading && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-heading font-semibold bg-green-500/15 text-green-600 border border-green-500/20">
                  📡 {weather.station}
                </span>
              )}
              {weather.source === 'open-meteo' && !weather.loading && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-heading font-semibold bg-blue-500/15 text-blue-600 border border-blue-500/20">
                  Open-Meteo
                </span>
              )}
              <span className="hidden sm:inline">Cập nhật {now}</span>
            </span>
          </div>

          {/* Idle / opt-in row — visible if the browser has not started the prompt yet */}
          {isIdle && !hasGeoError && (
            <div className="mb-4 p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs text-foreground/80 flex items-start gap-2">
              <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold mb-1">Xem AQI tại vị trí của bạn</p>
                <p className="text-muted-foreground leading-relaxed">
                  Trình duyệt sẽ hỏi quyền vị trí để tải AQI theo nơi bạn đang đứng. Nếu chưa thấy hộp thoại, bấm lại nút bên cạnh.
                </p>
              </div>
              <Button size="sm" onClick={requestLocation} className="gap-1.5 shrink-0">
                <LocateFixed className="w-3.5 h-3.5" />
                Dùng vị trí của tôi
              </Button>
            </div>
          )}

          {/* Geolocation help row */}
          {hasGeoError && (
            <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-foreground/80 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold mb-1">Không thể lấy vị trí hiện tại</p>
                <p className="text-muted-foreground leading-relaxed">
                  {isIframeBlocked
                    ? 'GPS có thể bị chặn trong Preview. Hãy mở trang Published URL trực tiếp để kiểm tra.'
                    : isDenied
                      ? 'Vui lòng cấp quyền GPS hoặc nhập vị trí thủ công. Trên trình duyệt: nhấn 🔒 trên thanh địa chỉ → Cho phép Vị trí, rồi bấm "Thử lại".'
                      : isUnsupported
                        ? 'Trình duyệt của bạn không hỗ trợ định vị GPS. Vui lòng nhập vị trí thủ công.'
                        : 'GPS không phản hồi (POSITION_UNAVAILABLE/TIMEOUT). Hãy ra nơi thoáng và bấm "Thử lại".'}
                </p>
              </div>
              {!isUnsupported && !isIframeBlocked && (
                <Button size="sm" variant="outline" onClick={requestLocation} className="gap-1.5 shrink-0">
                  <LocateFixed className="w-3.5 h-3.5" />
                  Thử lại
                </Button>
              )}
            </div>
          )}



          <div className="grid grid-cols-1 md:grid-cols-[1fr_1.5fr] gap-5">
            {/* AQI Widget */}
            <div className="flex flex-col items-center justify-center p-6 rounded-xl bg-muted/50 border border-border">
              {isLoadingData ? (
                <div className="flex flex-col items-center py-6">
                  <Loader2 className="w-12 h-12 animate-spin text-primary mb-2" />
                  <span className="text-xs text-muted-foreground font-body">Đang tải dữ liệu thực...</span>
                </div>
              ) : (
                <>
                  {/* AQI number + danger pulse glow when > 150 (lighter on mobile) */}
                  <div className="relative flex items-center justify-center">
                    {aqi > 150 && (
                      <>
                        <span
                          className="hidden md:block absolute inset-0 m-auto w-32 h-32 rounded-full blur-2xl animate-ping"
                          style={{ backgroundColor: `${getAQIColor(aqi)}55`, animationDuration: '2.5s' }}
                          aria-hidden="true"
                        />
                        <span
                          className="absolute inset-0 m-auto w-20 h-20 md:w-28 md:h-28 rounded-full blur-lg md:blur-xl animate-pulse"
                          style={{ backgroundColor: `${getAQIColor(aqi)}66` }}
                          aria-hidden="true"
                        />
                      </>
                    )}
                    <span
                      className="relative text-6xl md:text-7xl font-heading font-extrabold tabular-nums z-10"
                      style={{
                        color: getAQIColor(aqi),
                        textShadow: aqi > 150
                          ? `0 0 20px ${getAQIColor(aqi)}, 0 0 40px ${getAQIColor(aqi)}80`
                          : `0 0 30px ${getAQIColor(aqi)}40`,
                      }}
                    >
                      {aqi}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground font-body mt-1 mb-3">
                    {aqi > 150 ? '⚠️ AQI Nguy hiểm' : 'Chỉ số AQI thực tế'}
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-body font-medium" style={{ backgroundColor: `${getAQIColor(aqi)}20`, color: getAQIColor(aqi) }}>
                    {getAQIStatus(aqi)}
                  </span>
                  <div className="w-full mt-4 h-2 rounded-full overflow-hidden" style={{ background: 'linear-gradient(to right, #22c55e, #eab308, #f97316, #ef4444, #7c3aed)' }}>
                    <div className="relative h-full" style={{ width: `${pct}%` }}>
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-background border-2 shadow-lg" style={{ borderColor: getAQIColor(aqi) }} />
                    </div>
                  </div>

                  {/* Mini 24h sparkline */}
                  {hourlyForecast.length > 0 && (
                    <div className="w-full mt-4 pt-3 border-t border-border/50">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-body text-muted-foreground uppercase tracking-wider">Xu hướng 24h</span>
                        <span className="text-[10px] font-body text-muted-foreground">
                          AQI {Math.min(...hourlyForecast.map(h => h.aqi))}–{Math.max(...hourlyForecast.map(h => h.aqi))}
                        </span>
                      </div>
                      <Sparkline data={hourlyForecast.map(h => h.aqi)} />
                    </div>
                  )}
                </>
              )}
            </div>

            {/* 6 Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 md:gap-3">
              {metrics.map(m => (
                <div key={m.label} className="flex flex-col items-center p-2 md:p-3 rounded-xl bg-muted/50 border border-border">
                  <span className="text-base md:text-lg font-heading font-bold" style={{ color: m.color }}>{m.value}</span>
                  <span className="text-[10px] text-muted-foreground font-body">{m.unit}</span>
                  <span className="text-[11px] md:text-xs text-foreground/60 font-body mt-1">{m.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

// Mini AQI sparkline (24h forecast)
function Sparkline({ data }: { data: number[] }) {
  if (data.length < 2) return null;
  const w = 240;
  const h = 32;
  const max = Math.max(...data, 50);
  const min = Math.min(...data, 0);
  const range = Math.max(max - min, 1);
  const stepX = w / (data.length - 1);
  const points = data.map((v, i) => {
    const x = i * stepX;
    const y = h - ((v - min) / range) * h;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const path = `M ${points.join(' L ')}`;
  const area = `${path} L ${w},${h} L 0,${h} Z`;
  const last = data[data.length - 1];
  const lastX = (data.length - 1) * stepX;
  const lastY = h - ((last - min) / range) * h;
  const color = last > 150 ? '#ef4444' : last > 100 ? '#f97316' : last > 50 ? '#eab308' : '#22c55e';

  return (
    <svg viewBox={`0 0 ${w} ${h + 4}`} className="w-full h-10" preserveAspectRatio="none">
      <defs>
        <linearGradient id="sparkFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#sparkFill)" />
      <path d={path} fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lastX} cy={lastY} r="2.5" fill={color}>
        <animate attributeName="r" values="2.5;4;2.5" dur="1.6s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

export default HeroSection;
