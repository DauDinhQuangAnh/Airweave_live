import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, Loader2, Moon, Sun, Wind } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/hooks/use-auth';
import { useGeolocation } from '@/hooks/use-geolocation';
import { hasWeatherMetric, useWeatherData } from '@/hooks/use-weather-data';
import { hasAirQualityReading } from '@/lib/air-quality';
import AuroraBackground from '@/components/AuroraBackground';
import AQITicker, { buildCurrentAirTickerItems } from '@/components/landing/AQITicker';
import HeroSection from '@/components/landing/HeroSection';
import { getStoredLanguage, persistLanguage } from '@/lib/language';
import { useAppLang } from '@/hooks/use-app-lang';

const FeaturesSection = lazy(() => import('@/components/landing/FeaturesSection'));
const HowItWorks = lazy(() => import('@/components/landing/HowItWorks'));
const PricingCards = lazy(() => import('@/components/landing/PricingCards'));
const CTABottom = lazy(() => import('@/components/landing/CTABottom'));
const LandingFooter = lazy(() => import('@/components/landing/LandingFooter'));

const DeferredFallback = () => <div className="h-24" aria-hidden="true" />;

const LandingAQITicker = () => {
  const lang = useAppLang();
  const { location } = useGeolocation({
    autoRequest: true,
    requirePriorConsentForAutoRequest: false,
  });
  const { weather } = useWeatherData(location, lang);
  const hasUsableLocation = location.status === 'active' || location.status === 'manual';
  const hasLiveAQI = hasUsableLocation && hasAirQualityReading(weather);

  return (
    <AQITicker
      items={hasLiveAQI ? buildCurrentAirTickerItems({
        locationLabel: location.label,
        aqi: weather.aqi,
        pm25: hasWeatherMetric(weather, 'pm25') ? weather.pm25 : null,
        pm10: hasWeatherMetric(weather, 'pm10') ? weather.pm10 : null,
        temperature: hasWeatherMetric(weather, 'temperature') ? weather.temperature : null,
        humidity: hasWeatherMetric(weather, 'humidity') ? weather.humidity : null,
        windSpeed: hasWeatherMetric(weather, 'windSpeed') ? weather.windSpeed : null,
        source: weather.source === 'demo' ? (lang === 'vi' ? 'Dữ liệu mô phỏng' : 'Simulated data') : weather.station || (weather.source === 'waqi' ? 'WAQI' : 'Open-Meteo'),
        lang,
      }) : []}
      loading={location.loading || weather.loading}
      message={
        location.status === 'denied'
          ? (lang === 'vi' ? 'Bạn đã chặn quyền vị trí. Hãy cấp quyền rồi thử lại.' : 'Location permission denied. Grant access and try again.')
          : location.status === 'unavailable' || location.status === 'iframe-blocked'
            ? (lang === 'vi' ? 'Không lấy được vị trí hiện tại.' : 'Current location is unavailable.')
            : (lang === 'vi' ? 'Chưa có dữ liệu AQI theo vị trí hiện tại.' : 'No location-based AQI data available.')
      }
      lang={lang}
      animate
    />
  );
};

let authPreload: Promise<unknown> | null = null;
const preloadAuth = () => {
  authPreload ??= import('./Auth.tsx');
  return authPreload;
};

const DeferredLandingSections = () => {
  const [ready, setReady] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ready) return;
    const target = sentinelRef.current;

    if ('IntersectionObserver' in window && target) {
      const observer = new IntersectionObserver(
        (entries) => {
          if (!entries.some((entry) => entry.isIntersecting)) return;
          setReady(true);
          observer.disconnect();
        },
        { rootMargin: '720px 0px' }
      );

      observer.observe(target);
      return () => observer.disconnect();
    }

    const requestIdle = (window as any).requestIdleCallback as
      | ((callback: () => void, options?: { timeout: number }) => number)
      | undefined;
    const cancelIdle = (window as any).cancelIdleCallback as ((id: number) => void) | undefined;

    if (requestIdle) {
      const id = requestIdle(() => setReady(true), { timeout: 1200 });
      return () => cancelIdle?.(id);
    }

    const id = window.setTimeout(() => setReady(true), 600);
    return () => window.clearTimeout(id);
  }, [ready]);

  if (!ready) return <div ref={sentinelRef}><DeferredFallback /></div>;

  return (
    <Suspense fallback={<DeferredFallback />}>
      <FeaturesSection />
      <HowItWorks />
      <PricingCards />
      <CTABottom />
      <LandingFooter />
    </Suspense>
  );
};

const Landing = () => {
  const navigate = useNavigate();
  const [lang, setLang] = useState<'vi' | 'en'>(getStoredLanguage);
  const { theme, toggleTheme } = useTheme();
  const { user, loading, onboardingCompleted } = useAuth();
  const goApp = () => navigate('/dashboard');
  const prefetchAuth = () => { void preloadAuth(); };
  const prefetchApp = () => { import('./Dashboard.tsx'); import('../layouts/AppLayout.tsx'); };

  useEffect(() => {
    if (loading || !user) return;
    // Chỉ tự chuyển vào app khi đã onboarding — nếu chưa, để user xem được
    // trang chủ (tránh vòng lặp Landing → dashboard → onboarding).
    if (onboardingCompleted) navigate('/dashboard', { replace: true });
  }, [loading, navigate, user, onboardingCompleted]);

  useEffect(() => {
    const requestIdle = (window as any).requestIdleCallback as
      | ((callback: () => void, options?: { timeout: number }) => number)
      | undefined;
    const cancelIdle = (window as any).cancelIdleCallback as ((id: number) => void) | undefined;

    if (requestIdle) {
      const id = requestIdle(() => { void preloadAuth(); }, { timeout: 900 });
      return () => cancelIdle?.(id);
    }

    const id = window.setTimeout(() => { void preloadAuth(); }, 500);
    return () => window.clearTimeout(id);
  }, []);

  // Chỉ hiện loader khi đang tải auth, hoặc khi user đã onboarding (sắp bị
  // chuyển vào /dashboard). User đã đăng nhập nhưng CHƯA onboarding vẫn xem
  // được trang chủ (vd bấm "Trang chủ" từ onboarding).
  if (loading || (user && onboardingCompleted)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background text-foreground">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="font-heading text-sm font-bold">{lang === 'vi' ? 'Đang mở AirWeave...' : 'Opening AirWeave...'}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      <AuroraBackground />

      {/* Navbar */}
      <nav className="relative z-30 flex items-center justify-between max-w-5xl mx-auto px-4 py-4">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#00d4aa] to-[#0ea5e9] flex items-center justify-center shadow-lg">
            <Wind className="w-5 h-5 text-white" />
          </div>
          <span className="font-heading text-xl font-extrabold tracking-tight text-foreground">AirWeave</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => { const next = lang === 'vi' ? 'en' : 'vi'; persistLanguage(next); setLang(next); }} aria-label={lang === 'vi' ? 'Chuyển sang tiếng Anh' : 'Switch to Vietnamese'} className="font-heading text-xs font-semibold">
            {lang === 'vi' ? 'EN' : 'VI'}
          </Button>
          <Button variant="ghost" size="icon" onClick={toggleTheme} className="w-9 h-9 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent">
            {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </Button>
          {user ? (
            <Button size="sm" onMouseEnter={prefetchApp} onClick={goApp} className="font-heading text-sm font-semibold gap-1.5 bg-gradient-to-r from-[#00d4aa] to-[#0ea5e9] hover:opacity-90 text-white border-0">
              <LayoutDashboard className="w-4 h-4" /> {lang === 'vi' ? 'Vào ứng dụng' : 'Open app'}
            </Button>
          ) : (
            <>
              <Button variant="ghost" size="sm" onFocus={prefetchAuth} onPointerEnter={prefetchAuth} onTouchStart={prefetchAuth} onMouseDown={prefetchAuth} onClick={() => { prefetchAuth(); navigate('/auth'); }} className="font-heading text-sm text-muted-foreground hover:text-foreground hover:bg-accent">
                {lang === 'vi' ? 'Đăng nhập' : 'Sign in'}
              </Button>
              <Button size="sm" onFocus={prefetchAuth} onPointerEnter={prefetchAuth} onTouchStart={prefetchAuth} onMouseDown={prefetchAuth} onClick={() => { prefetchAuth(); navigate('/auth'); }} className="font-heading text-sm font-semibold bg-gradient-to-r from-[#00d4aa] to-[#0ea5e9] hover:opacity-90 text-white border-0">
                {lang === 'vi' ? 'Bắt đầu' : 'Get started'}
              </Button>
            </>
          )}
        </div>
      </nav>

      <LandingAQITicker />
      <HeroSection />
      <DeferredLandingSections />
    </div>
  );
};

export default Landing;
