import { useState } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  Cpu,
  Building2,
  Activity,
  ArrowLeft,
  RefreshCw,
  Radio,
  Zap,
} from 'lucide-react';
import AuroraBackground from '@/components/AuroraBackground';

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { label: 'Tổng quan Hệ thống', path: '/admin', icon: LayoutDashboard },
    { label: 'Quản lý IoT Nodes', path: '/admin/nodes', icon: Cpu },
    { label: 'Quản lý Tổ chức', path: '/admin/orgs', icon: Building2 },
    { label: 'Org Dashboard (Xem mẫu)', path: '/org-dashboard', icon: Activity },
  ];

  return (
    <div className="h-screen flex flex-col bg-[#030810] text-white relative overflow-hidden font-body">
      <AuroraBackground />

      {/* Header Bar */}
      <header className="relative z-20 h-[60px] border-b border-white/10 bg-[rgba(3,8,15,0.96)] px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors"
            title="Về ứng dụng chính"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-white shadow-lg shadow-cyan-500/20">
              ⚡
            </div>
            <div>
              <h1 className="font-heading font-bold text-sm tracking-wide text-white">
                AirWeave <span className="text-cyan-400 font-normal">IoT Admin</span>
              </h1>
              <p className="text-[10px] text-white/50">Trung tâm Điều hành Node Cảm biến & Tổ chức</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            MQTT Broker: Live
          </div>
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white/60 text-xs">
            <Radio className="w-3.5 h-3.5 text-cyan-400" />
            Node Protocol: MQTT / HTTP
          </div>
        </div>
      </header>

      {/* Main Body */}
      <div className="flex-1 flex min-h-0 relative z-20">
        {/* Navigation Sidebar */}
        <aside className="w-64 border-r border-white/10 bg-black/40 backdrop-blur-md p-4 hidden md:flex flex-col gap-2 shrink-0">
          <div className="text-[11px] font-heading font-semibold text-white/40 uppercase tracking-wider px-3 mb-1">
            Menu Quản trị
          </div>

          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-heading text-xs font-semibold transition-all text-left ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/10 text-cyan-300 border border-cyan-500/30 shadow-lg shadow-cyan-500/10'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-white/40'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}

          <div className="mt-auto p-3.5 rounded-2xl bg-gradient-to-b from-white/5 to-white/[0.02] border border-white/10 text-xs space-y-2">
            <div className="flex items-center gap-2 text-cyan-400 font-semibold text-[11px]">
              <Zap className="w-3.5 h-3.5" />
              Hybrid Node Network
            </div>
            <p className="text-[11px] text-white/60 leading-relaxed">
              Tự động fallback về dữ liệu WAQI/Open-Meteo khi các node vật lý tạm dừng kết nối.
            </p>
          </div>
        </aside>

        {/* Content View */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 scrollbar-thin">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
