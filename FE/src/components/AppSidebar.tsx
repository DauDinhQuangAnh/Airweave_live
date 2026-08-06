import {
  LayoutDashboard, Map, Route, Siren, User, LogOut, Crown,
  ShieldAlert, Users, Heart, IdCard, History, Car, Building2, Database, Cpu,
} from 'lucide-react';

import { NavLink } from '@/components/NavLink';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import { usePremium } from '@/hooks/use-premium';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';

type Item = { url: string; vi: string; en: string; icon: any; danger?: boolean };

const MAIN: Item[] = [
  { url: '/dashboard', vi: 'Tổng quan', en: 'Overview', icon: LayoutDashboard },
  { url: '/map', vi: 'Bản đồ AQI', en: 'AQI Map', icon: Map },
  { url: '/smart-route', vi: 'Lộ trình sạch', en: 'Smart Clean Route', icon: Route },
  { url: '/civic-hotspots', vi: 'Điểm nóng ô nhiễm', en: 'Civic Hotspots', icon: ShieldAlert },
  { url: '/community-report', vi: 'Báo cáo cộng đồng', en: 'Community Report', icon: Users },
  { url: '/sos', vi: 'AirWeave SOS', en: 'AirWeave SOS', icon: Siren, danger: true },
];

const PERSONAL: Item[] = [
  { url: '/health-profile', vi: 'Hồ sơ sức khỏe', en: 'Health Profile', icon: Heart },
  { url: '/medical-id', vi: 'Medical ID', en: 'Medical ID', icon: IdCard },
  { url: '/exposure-history', vi: 'Lịch sử phơi nhiễm', en: 'Exposure History', icon: History },
];

const INTEGRATIONS: Item[] = [
  { url: '/admin', vi: '⚡ IoT Admin Portal', en: '⚡ IoT Admin Portal', icon: Cpu },
  { url: '/org-dashboard', vi: 'Bảng điều khiển Tổ chức', en: 'Org Dashboard', icon: Building2 },
  { url: '/mobility-handoff', vi: 'Di chuyển & đặt xe', en: 'Mobility Handoff', icon: Car },
  { url: '/gov-camera-api', vi: 'Gov API / Camera AI', en: 'Gov API / Camera AI', icon: Building2 },
  { url: '/partner-data', vi: 'Dữ liệu đối tác', en: 'Partner Data', icon: Database },
];


interface AppSidebarProps { lang: 'vi' | 'en' }

function NavItem({ item, lang, collapsed }: { item: Item; lang: 'vi' | 'en'; collapsed: boolean }) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild>
        <NavLink
          to={item.url}
          end
          className={
            item.danger
              ? 'hover:bg-red-500/10 text-red-600 dark:text-red-400 font-semibold'
              : 'hover:bg-sidebar-accent/50'
          }
          activeClassName={
            item.danger
              ? 'bg-red-500/15 text-red-600 dark:text-red-400 font-bold ring-1 ring-red-500/30'
              : 'bg-sidebar-accent text-sidebar-primary font-medium'
          }
        >
          {item.danger ? (
            <span className="mr-2 inline-flex items-center justify-center w-5 h-5 rounded-md bg-gradient-to-br from-red-500 to-red-700 shadow-sm shadow-red-500/40">
              <item.icon className="w-3 h-3 text-white" strokeWidth={2.5} />
            </span>
          ) : (
            <item.icon className="mr-2 h-4 w-4" />
          )}
          {!collapsed && <span>{lang === 'vi' ? item.vi : item.en}</span>}
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export function AppSidebar({ lang }: AppSidebarProps) {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { user, signOut } = useAuth();
  const { isPremium } = usePremium();
  const navigate = useNavigate();

  const sections: { label: { vi: string; en: string }; items: Item[] }[] = [
    { label: { vi: 'Điều hướng', en: 'Main' }, items: MAIN },
    { label: { vi: 'Cá nhân', en: 'Personal Health' }, items: PERSONAL },
    { label: { vi: 'Tích hợp', en: 'Integrations' }, items: INTEGRATIONS },
  ];

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className="flex items-center gap-2 px-4 py-4">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <Map className="w-4 h-4 text-primary-foreground" />
          </div>
          {!collapsed && (
            <span className="font-heading text-lg font-bold text-foreground tracking-tight">
              AirWeave
            </span>
          )}
        </div>

        {sections.map((section) => (
          <SidebarGroup key={section.label.en}>
            <SidebarGroupLabel>{lang === 'vi' ? section.label.vi : section.label.en}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => (
                  <NavItem key={item.url} item={item} lang={lang} collapsed={collapsed} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <NavLink
                to="/premium"
                className="hover:bg-amber-500/10"
                activeClassName="bg-amber-500/15 text-amber-600 font-medium"
              >
                <Crown className={`mr-2 h-4 w-4 ${isPremium ? 'text-amber-500' : 'text-muted-foreground'}`} />
                {!collapsed && (
                  <span className="text-sm">
                    {isPremium ? (lang === 'vi' ? 'Premium · Đang dùng' : 'Premium · Active') : 'Premium'}
                  </span>
                )}
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <NavLink
                to="/profile"
                className="hover:bg-sidebar-accent/50"
                activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
              >
                <User className="mr-2 h-4 w-4" />
                {!collapsed && (
                  <span className="text-sm truncate">
                    {user?.email?.split('@')[0] || 'Profile'}
                  </span>
                )}
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => { signOut(); navigate('/'); }}>
              <LogOut className="mr-2 h-4 w-4" />
              {!collapsed && (
                <span className="text-sm">
                  {lang === 'vi' ? 'Đăng xuất' : 'Sign Out'}
                </span>
              )}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
