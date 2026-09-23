import { Link } from 'react-router-dom';
import { Wind } from 'lucide-react';
import { useAppLang } from '@/hooks/use-app-lang';

const LandingFooter = () => {
  const lang = useAppLang();
  const vi = lang === 'vi';
  const links = [
    { to: '/dashboard', label: vi ? 'Bảng điều khiển' : 'Dashboard' },
    { to: '/map', label: vi ? 'Bản đồ AQI' : 'AQI map' },
    { to: '/smart-route', label: vi ? 'Lộ trình' : 'Routes' },
    { to: '/community-report', label: vi ? 'Báo cáo cộng đồng' : 'Community reports' },
    { to: '/data-transparency', label: vi ? 'Minh bạch dữ liệu' : 'Data transparency' },
  ];

  return (
    <footer className="relative z-10 border-t border-border mt-8">
      <div className="max-w-5xl mx-auto px-4 py-12 space-y-7">
        <div className="flex flex-col md:flex-row gap-8 justify-between">
          <div className="max-w-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00d4aa] to-[#0ea5e9] flex items-center justify-center">
                <Wind className="w-4 h-4 text-white" />
              </div>
              <span className="font-heading text-lg font-bold text-foreground">AirWeave</span>
            </div>
            <p className="text-xs font-body text-muted-foreground leading-relaxed">
              {vi ? 'Thông tin chất lượng không khí theo vị trí, kèm nguồn và trạng thái dữ liệu.' : 'Location-based air quality information with sources and data status.'}
            </p>
          </div>
          <nav aria-label={vi ? 'Liên kết ứng dụng' : 'App links'} className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
            {links.map((link) => <Link key={link.to} to={link.to} className="hover:text-foreground transition-colors">{link.label}</Link>)}
          </nav>
        </div>
        <p className="pt-5 border-t border-border text-xs text-muted-foreground/70">© {new Date().getFullYear()} AirWeave</p>
      </div>
    </footer>
  );
};

export default LandingFooter;
