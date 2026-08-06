import { Globe, User, Wind, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';

interface AppHeaderProps {
  lang: 'vi' | 'en';
  onToggleLang: () => void;
}

const AppHeader = ({ lang, onToggleLang }: AppHeaderProps) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
            <Wind className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-heading text-xl font-bold text-foreground tracking-tight">
            AirWeave
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleLang}
            className="font-heading text-sm font-semibold gap-1.5"
          >
            <Globe className="w-4 h-4" />
            {lang === 'vi' ? 'VN' : 'EN'}
          </Button>

          {user ? (
            <>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => navigate('/profile')}
              >
                <User className="w-4 h-4" />
                <span className="hidden sm:inline font-heading text-xs">
                  {user.email?.split('@')[0]}
                </span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={signOut}
                className="gap-1"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => navigate('/auth')}
            >
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">
                {lang === 'vi' ? 'Đăng nhập' : 'Sign In'}
              </span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
