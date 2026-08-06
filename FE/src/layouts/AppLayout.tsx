import { lazy, Suspense, useState, useEffect } from 'react';
import { Navigate, Outlet, useLocation, useOutletContext } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/use-theme';
import { LiveAirProvider, useLiveAirContext } from '@/contexts/live-air-context';
import { cn } from '@/lib/utils';
import { Bot, Globe, Loader2, Sun, Moon, ArrowLeft, Home, UserCog, LogOut, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { profilesApi } from '@/integrations/api';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const FloatingAIChat = lazy(() => import('@/components/FloatingAIChat'));
import GPSStatusChip from '@/components/GPSStatusChip';
import { useRiskProfile } from '@/hooks/use-risk-profile';
import EssentialProfileGuard from '@/components/profile/EssentialProfileGuard';

const InnerLayout = ({
  lang,
  setLang,
  auth,
}: {
  lang: 'vi' | 'en';
  setLang: (fn: (l: 'vi' | 'en') => 'vi' | 'en') => void;
  auth: ReturnType<typeof useAuth>;
}) => {
  const route = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { location, weather } = useLiveAirContext();
  const { user, signOut } = auth;
  const { risk } = useRiskProfile();
  const [profile, setProfile] = useState<{ display_name: string | null; avatar_url: string | null } | null>(null);
  const [chatEnabled, setChatEnabled] = useState(true);
  const isMapRoute = route.pathname === '/map';
  const isDashboard = route.pathname === '/dashboard';

  useEffect(() => {
    if (!user) return;
    profilesApi
      .me()
      .then((data) => setProfile(data as any))
      .catch(() => setProfile(null));
  }, [user]);

  // Allow other components (e.g. SOS modal) to open the AI assistant
  useEffect(() => {
    const handler = () => setChatEnabled(true);
    window.addEventListener('airweave:open-ai-chat', handler as EventListener);
    return () => window.removeEventListener('airweave:open-ai-chat', handler as EventListener);
  }, []);
  const initial = (profile?.display_name || user?.email || '?').charAt(0).toUpperCase();
  const handleSwitchAccount = async () => { await signOut(); navigate('/auth'); };

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    if (isMapRoute) {
      root.classList.add('map-route-lock');
      body.classList.add('map-route-lock');
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    } else {
      root.classList.remove('map-route-lock');
      body.classList.remove('map-route-lock');
    }

    return () => {
      root.classList.remove('map-route-lock');
      body.classList.remove('map-route-lock');
    };
  }, [isMapRoute]);

  return (
    <SidebarProvider>
      <div className="h-svh flex w-full overflow-hidden">
        <AppSidebar lang={lang} />
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          {/* Automatic Missing Essential Fields Inspection & Banner/Modal */}
          <EssentialProfileGuard lang={lang} />

          <header className="h-14 flex items-center border-b border-border px-4 gap-2 shrink-0">
            <SidebarTrigger className="mr-1" />
            {!isDashboard && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(-1)}
                  className="h-9 gap-1.5 font-heading text-xs"
                  title={lang === 'vi' ? 'Quay lại' : 'Back'}
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">{lang === 'vi' ? 'Quay lại' : 'Back'}</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/dashboard')}
                  className="h-9 gap-1.5 font-heading text-xs"
                  title={lang === 'vi' ? 'Trang chủ' : 'Home'}
                >
                  <Home className="w-4 h-4" />
                  <span className="hidden sm:inline">{lang === 'vi' ? 'Trang chủ' : 'Home'}</span>
                </Button>
              </>
            )}
            <div className="flex-1" />
            <GPSStatusChip lang={lang} />

            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="h-9 w-9"
              title={theme === 'light' ? 'Chế độ tối' : 'Chế độ sáng'}
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLang(l => l === 'vi' ? 'en' : 'vi')}
              className="font-heading text-sm font-semibold gap-1.5"
            >
              <Globe className="w-4 h-4" />
              {lang === 'vi' ? 'VN' : 'EN'}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  aria-label="Tài khoản"
                  className="ml-1 w-9 h-9 rounded-full overflow-hidden ring-1 ring-border hover:ring-primary/50 transition-all flex items-center justify-center bg-gradient-to-br from-primary to-primary/70 text-primary-foreground font-heading font-bold text-sm shrink-0"
                >
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span>{initial}</span>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-heading">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold truncate">{profile?.display_name || user?.email?.split('@')[0]}</span>
                    <span className="text-[11px] text-muted-foreground font-normal truncate">{user?.email}</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/profile')} className="gap-2 cursor-pointer">
                  <UserCog className="w-4 h-4" /> {lang === 'vi' ? 'Chỉnh sửa hồ sơ' : 'Edit Profile'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSwitchAccount} className="gap-2 cursor-pointer">
                  <RefreshCw className="w-4 h-4" /> {lang === 'vi' ? 'Đổi tài khoản' : 'Switch Account'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut} className="gap-2 cursor-pointer text-destructive focus:text-destructive">
                  <LogOut className="w-4 h-4" /> {lang === 'vi' ? 'Đăng xuất' : 'Log Out'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </header>
          <main
            className={cn(
              'flex-1 min-h-0',
              isMapRoute ? 'overflow-hidden' : 'overflow-auto'
            )}
          >
            <Outlet context={{ lang }} />
          </main>
          {chatEnabled ? (
            <Suspense
              fallback={
                <button
                  type="button"
                  disabled
                  className="fixed left-6 bottom-6 z-[45] w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center"
                  aria-label="Đang tải AI Assistant"
                >
                  <Loader2 className="w-6 h-6 animate-spin" />
                </button>
              }
            >
              <FloatingAIChat
                lang={lang}
                context={{
                  location: location.label,
                  aqi: weather.aqi,
                  pm25: weather.pm25,
                  temperature: weather.temperature,
                  humidity: weather.humidity,
                  riskGroup: risk.group,
                }}
              />
            </Suspense>
          ) : (
            <button
              type="button"
              onClick={() => setChatEnabled(true)}
              className="fixed left-6 bottom-6 z-[45] w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl hover:scale-[1.03] active:scale-95 flex items-center justify-center transition"
              aria-label="Mở AI Assistant"
            >
              <div className="relative">
                <Bot className="w-6 h-6" />
                <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-green-500 border-2 border-primary animate-pulse" />
              </div>
            </button>
          )}
        </div>
      </div>
    </SidebarProvider>
  );
};

const AppLayout = () => {
  const auth = useAuth();
  const { user, loading, onboardingCompleted } = auth;
  const [lang, setLang] = useState<'vi' | 'en'>('vi');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (onboardingCompleted === false) return <Navigate to="/onboarding" replace />;

  return (
    <LiveAirProvider lang={lang}>
      <InnerLayout lang={lang} setLang={setLang} auth={auth} />
    </LiveAirProvider>
  );
};

export default AppLayout;

export function useAppLang() {
  return useOutletContext<{ lang: 'vi' | 'en' }>();
}
