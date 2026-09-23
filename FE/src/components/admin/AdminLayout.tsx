import { useEffect, useState } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  Cpu,
  Building2,
  Activity,
  Radio,
  Zap,
  BellRing,
  Key,
  ShieldX,
} from 'lucide-react';
import AuroraBackground from '@/components/AuroraBackground';
import { isDemoMode } from '@/lib/demo/demo-mode';
import { nodesApi } from '@/integrations/api';
import { useAppLang } from '@/hooks/use-app-lang';

export default function AdminLayout() {
  const lang = useAppLang();
  const navigate = useNavigate();
  const location = useLocation();
  const demo = isDemoMode();
  const [checkingAccess, setCheckingAccess] = useState(!demo);
  const [hasAdminAccess, setHasAdminAccess] = useState(demo);

  useEffect(() => {
    if (demo) return;
    let cancelled = false;
    nodesApi.adminStats()
      .then(() => {
        if (!cancelled) setHasAdminAccess(true);
      })
      .catch(() => {
        if (!cancelled) setHasAdminAccess(false);
      })
      .finally(() => {
        if (!cancelled) setCheckingAccess(false);
      });
    return () => { cancelled = true; };
  }, [demo]);

  const navItems = [
    { label: lang === 'vi' ? 'Tổng quan Hệ thống' : 'System Overview', path: '/admin', icon: LayoutDashboard },
    { label: lang === 'vi' ? 'Quản lý IoT Nodes' : 'IoT Node Management', path: '/admin/nodes', icon: Cpu },
    { label: lang === 'vi' ? 'Quản lý Tổ chức' : 'Organization Management', path: '/admin/orgs', icon: Building2 },
    { label: lang === 'vi' ? 'Ngưỡng Cảnh báo' : 'Alert Thresholds', path: '/admin/alerts', icon: BellRing },
    { label: lang === 'vi' ? 'Khóa API & Bảo mật' : 'API Keys & Security', path: '/admin/api-keys', icon: Key },
    { label: lang === 'vi' ? 'Bảng điều khiển Tổ chức' : 'Organization Dashboard', path: '/org-dashboard', icon: Activity },
  ];

  if (checkingAccess) {
    return <div className="h-full grid place-items-center bg-[#050911] text-white/70">{lang === 'vi' ? 'Đang kiểm tra quyền quản trị...' : 'Checking administrator access...'}</div>;
  }

  if (!hasAdminAccess) {
    return (
      <div className="h-full grid place-items-center bg-[#050911] text-white p-6">
        <div className="max-w-md text-center space-y-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6">
          <ShieldX className="w-10 h-10 text-amber-300 mx-auto" />
          <h1 className="font-heading text-xl font-bold">{lang === 'vi' ? 'Không có quyền quản trị' : 'Administrator access required'}</h1>
          <p className="text-sm text-white/65">{lang === 'vi' ? 'Tài khoản này không được phép xem hoặc thay đổi dữ liệu hệ thống.' : 'This account cannot view or modify system data.'}</p>
          <button onClick={() => navigate('/dashboard')} className="px-4 py-2 rounded-lg bg-cyan-500 text-slate-950 font-semibold text-sm">{lang === 'vi' ? 'Về bảng điều khiển' : 'Back to dashboard'}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#050911] text-white relative overflow-hidden font-body">
      <AuroraBackground />

      {/* Top Admin Sub-Header Bar */}
      <header className="relative z-20 border-b border-white/10 bg-[#050911]/80 backdrop-blur-md px-4 py-3 shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-white shadow-lg shadow-cyan-500/25 shrink-0">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-heading font-extrabold text-base md:text-lg tracking-wide text-white">
                  AirWeave <span className="text-cyan-400 font-semibold">IoT Admin Portal</span>
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-[10px] font-mono text-cyan-300 font-bold uppercase">
                  {demo ? 'v2.4 Demo' : 'v2.4'}
                </span>
              </div>
              <p className="text-xs text-white/50">{lang === 'vi' ? 'Trung tâm Điều hành Trạm Quan trắc IoT & Quản lý Tổ chức' : 'IoT Monitoring Station & Organization Operations Center'}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              {demo ? (lang === 'vi' ? 'Telemetry mô phỏng' : 'Simulated telemetry') : (lang === 'vi' ? 'Broker: chưa xác minh' : 'Broker: unverified')}
            </div>
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white/60 text-xs">
              <Radio className="w-3.5 h-3.5 text-cyan-400" />
              ESP32-S3 Mesh
            </div>
          </div>
        </div>

        {/* Bento Cyber Horizontal Sub-Navigation Tab Bar */}
        <div className="mt-3 -mb-1 flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-none border-t border-white/5 pt-2.5">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-heading text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${
                  isActive
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-md shadow-cyan-500/10'
                    : 'text-white/60 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-400' : 'text-white/40'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Content View with Scroll */}
      <main className="flex-1 overflow-y-auto relative z-10 p-4 md:p-6 scrollbar-thin">
        <Outlet />
      </main>
    </div>
  );
}
