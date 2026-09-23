import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Cpu,
  MapPin,
  Activity,
  Wind,
  CheckCircle2,
  Sparkles,
  Zap,
  Radio,
  SlidersHorizontal,
} from 'lucide-react';
import AuroraBackground from '@/components/AuroraBackground';
import { nodesApi } from '@/integrations/api';
import { isDemoMode } from '@/lib/demo/demo-mode';
import { useAppLang } from '@/hooks/use-app-lang';
import { localizeDemoText } from '@/lib/localize-demo';

export default function OrgDashboard() {
  const lang = useAppLang();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState(isDemoMode() ? 'org-1' : '');

  const fetchOrgData = async (id: string) => {
    try {
      const res = await nodesApi.getOrgDashboard(id);
      if (res && Array.isArray(res.nodes)) {
        const readings = res.nodes.filter((node: any) => Number.isFinite(node.pm25));
        setData({
          org: res.organization ?? res.org,
          nodes: res.nodes,
          stats: {
            ...(res.summary ?? res.stats),
            avgPm25: readings.length
              ? Math.round(readings.reduce((sum: number, node: any) => sum + node.pm25, 0) / readings.length * 10) / 10
              : null,
          },
        });
      }
      setError(false);
    } catch {
      if (!isDemoMode()) {
        setData(null);
        setError(true);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    nodesApi.listOrganizations().then((orgs) => {
      setOrganizations(orgs);
      setSelectedOrgId((current) => current || orgs[0]?.id || '');
      if (!orgs.length) setLoading(false);
    }).catch(() => {
      setError(true);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!selectedOrgId) return;
    fetchOrgData(selectedOrgId);
    const interval = setInterval(() => fetchOrgData(selectedOrgId), 4000);
    return () => clearInterval(interval);
  }, [selectedOrgId]);

  if (loading) return <div className="p-6 text-white/70">{lang === 'vi' ? 'Đang tải dữ liệu tổ chức...' : 'Loading organization data...'}</div>;
  if (error) return <div className="p-6 text-amber-300" role="alert">{lang === 'vi' ? 'Không thể tải dữ liệu tổ chức. Vui lòng kiểm tra quyền truy cập và kết nối máy chủ.' : 'Unable to load organization data. Check your access and server connection.'}</div>;
  if (!data) return <div className="p-6 text-white/70">{lang === 'vi' ? 'Chưa có tổ chức hoặc dữ liệu trạm để hiển thị.' : 'No organization or station data is available.'}</div>;

  return (
    <div className="h-full overflow-y-auto bg-[#050911] text-white relative font-body p-4 md:p-6 space-y-6 scrollbar-thin">
      <AuroraBackground />

      <div className="max-w-6xl mx-auto space-y-6 relative z-10">
        {/* Mock Data Banner */}
        <div className="flex items-center justify-between px-4 py-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs font-heading font-semibold shadow-sm">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400 animate-pulse shrink-0" />
            <span>
              📌 <strong>{lang === 'vi' ? 'BẢNG QUAN TRẮC TỔ CHỨC' : 'ENTERPRISE MONITORING VIEW'}</strong> — {lang === 'vi' ? 'Bảng điều hành giám sát nội bộ dành cho Doanh nghiệp, Trường học & Cơ quan Nhà nước.' : 'Internal monitoring for businesses, schools, and government agencies.'}
            </span>
          </div>
          <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full bg-amber-500/20 text-[10px] font-bold text-amber-200 uppercase tracking-wide border border-amber-500/30">
            {lang === 'vi' ? 'Dữ liệu Nội bộ' : 'Internal Data'}
          </span>
        </div>

        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-[#0a1120]/80 backdrop-blur-md border border-white/10 shadow-lg">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500/30 to-blue-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-md shrink-0">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="font-heading font-extrabold text-xl md:text-2xl text-white">
                  {data.org?.name || (lang === 'vi' ? 'Tổ chức chưa có tên' : 'Unnamed organization')}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono">
                  {data.org?.code || '—'}
                </span>
              </div>
              <p className="text-xs text-white/60 mt-0.5">
                {lang === 'vi' ? 'Bảng điều khiển Giám sát mạng lưới trạm cảm biến môi trường nội bộ' : 'Internal environmental sensor network monitoring dashboard'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-white/15 text-xs">
              <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-white/60 text-xs hidden sm:inline">{lang === 'vi' ? 'Tổ chức' : 'Organization'}:</span>
              <select
                value={selectedOrgId}
                onChange={(e) => {
                  setSelectedOrgId(e.target.value);
                  if (!isDemoMode()) setLoading(true);
                }}
                className="bg-transparent border-none text-xs text-cyan-300 font-heading font-semibold focus:outline-none cursor-pointer"
              >
                {organizations.map((org) => (
                  <option key={org.id} value={org.id} className="bg-slate-900 text-white">{org.name}</option>
                ))}
              </select>
            </div>

            <button
              onClick={() => navigate('/admin')}
              className="px-3.5 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 text-xs font-heading font-semibold transition-colors flex items-center gap-1.5"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>IoT Admin</span>
            </button>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-[#0a1120]/80 backdrop-blur-md border border-white/10 space-y-1 hover:border-cyan-500/30 transition-all shadow-md">
            <div className="flex items-center justify-between text-white/50 text-xs font-heading">
              <span>{lang === 'vi' ? 'Trạm đo sở hữu' : 'Owned stations'}</span>
              <Cpu className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="font-heading font-extrabold text-2xl text-white">
              {data.stats?.totalNodes ?? 0} {lang === 'vi' ? 'trạm' : 'stations'}
            </div>
            <div className="text-[11px] text-cyan-400 flex items-center gap-1 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" /> {data.stats?.onlineNodes ?? 0} {lang === 'vi' ? 'trạm trực tuyến' : 'stations online'}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-500/10 backdrop-blur-md border border-emerald-500/25 space-y-1 shadow-md">
            <div className="flex items-center justify-between text-emerald-300/70 text-xs font-heading">
              <span>{lang === 'vi' ? 'AQI Trung bình' : 'Average AQI'}</span>
              <Wind className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="font-heading font-extrabold text-2xl text-emerald-400">
              AQI {data.stats?.avgAqi ?? '—'}
            </div>
            <div className="text-[11px] text-emerald-300/80 font-medium">{lang === 'vi' ? 'Trung bình các trạm của tổ chức' : 'Average across organization stations'}</div>
          </div>

          <div className="p-4 rounded-2xl bg-[#0a1120]/80 backdrop-blur-md border border-white/10 space-y-1 shadow-md">
            <div className="flex items-center justify-between text-white/50 text-xs font-heading">
              <span>{lang === 'vi' ? 'PM2.5 Trung bình' : 'Average PM2.5'}</span>
              <Activity className="w-4 h-4 text-blue-400" />
            </div>
            <div className="font-heading font-extrabold text-2xl text-white">
              {data.stats?.avgPm25 ?? '—'} µg/m³
            </div>
            <div className="text-[11px] text-white/50">{lang === 'vi' ? 'Chuẩn an toàn hô hấp' : 'Respiratory safety reference'}</div>
          </div>

          <div className="p-4 rounded-2xl bg-[#0a1120]/80 backdrop-blur-md border border-white/10 space-y-1 shadow-md">
            <div className="flex items-center justify-between text-white/50 text-xs font-heading">
              <span>{lang === 'vi' ? 'Trạng thái Hệ thống' : 'System Status'}</span>
              <Zap className="w-4 h-4 text-amber-400" />
            </div>
            <div className="font-heading font-extrabold text-lg text-emerald-400 flex items-center gap-1.5 pt-1">
              <span className={`w-2 h-2 rounded-full ${data.stats?.onlineNodes > 0 ? 'bg-emerald-400' : 'bg-slate-400'}`} />
              {isDemoMode() ? (lang === 'vi' ? 'MÔ PHỎNG' : 'SIMULATED') : data.stats?.onlineNodes > 0 ? (lang === 'vi' ? 'CÓ TRẠM TRỰC TUYẾN' : 'STATIONS ONLINE') : (lang === 'vi' ? 'KHÔNG CÓ TRẠM TRỰC TUYẾN' : 'NO STATIONS ONLINE')}
            </div>
            <div className="text-[11px] text-white/40">{isDemoMode() ? (lang === 'vi' ? 'Dữ liệu mô phỏng trong phiên demo' : 'Simulated data for this demo session') : (lang === 'vi' ? 'Kiểm tra thời gian cập nhật ở từng trạm' : 'Check the update time for each station')}</div>
          </div>
        </div>

        {/* Nodes Detail List */}
        <div className="p-5 rounded-2xl bg-[#0a1120]/80 backdrop-blur-md border border-white/10 space-y-4 shadow-lg">
          <div className="flex items-center justify-between">
            <h3 className="font-heading font-bold text-sm text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-cyan-400" />
              {lang === 'vi' ? 'Danh sách Trạm Quan trắc thuộc Tổ chức' : 'Organization Monitoring Stations'}
            </h3>
            <span className="text-xs text-white/40 font-mono">
              {lang === 'vi' ? 'Hiển thị' : 'Showing'} {data.nodes?.length ?? 0} {lang === 'vi' ? 'trạm' : 'stations'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(data.nodes || []).map((n: any) => (
              <div key={n.id} className="p-4 rounded-xl bg-slate-900/70 border border-white/10 space-y-3 hover:border-cyan-500/30 transition-all shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-heading font-bold text-sm text-white">{localizeDemoText(n.name, lang)}</h4>
                    <div className="text-[10px] text-cyan-300 font-mono">{n.chip_id}</div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-xs font-heading font-bold border ${
                    n.aqi == null
                      ? 'bg-slate-500/20 text-slate-300 border-slate-500/30'
                      : n.aqi <= 50
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : n.aqi <= 100
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                      : 'bg-red-500/20 text-red-300 border-red-500/30'
                  }`}>
                    AQI {n.aqi ?? '—'}
                  </span>
                </div>

                <div className="text-xs text-white/60 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span className="truncate">{localizeDemoText(n.location_name, lang)}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] text-white/70 pt-2.5 border-t border-white/10">
                  <div>PM2.5: <strong className="text-white">{n.pm25 ?? '—'} µg/m³</strong></div>
                  <div>PM10: <strong className="text-white">{n.pm10 ?? '—'} µg/m³</strong></div>
                  <div>{lang === 'vi' ? 'Nhiệt độ' : 'Temperature'}: <strong className="text-white">{n.temperature ?? '—'}°C</strong></div>
                  <div>{lang === 'vi' ? 'Độ ẩm' : 'Humidity'}: <strong className="text-white">{n.humidity ?? '—'}%</strong></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
