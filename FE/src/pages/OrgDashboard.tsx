import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Cpu,
  ShieldCheck,
  MapPin,
  RefreshCw,
  ArrowLeft,
  Activity,
  Wind,
  CheckCircle2,
  Sparkles,
  Zap,
} from 'lucide-react';
import AuroraBackground from '@/components/AuroraBackground';
import { nodesApi } from '@/integrations/api';

const MOCK_ORG_DASHBOARD = {
  org: {
    id: 'org-1',
    name: 'Sở Tài nguyên & Môi trường Hà Nội',
    code: 'STNMT-HN',
    type: 'gov',
    address: 'Huỳnh Thúc Kháng, Đống Đa, Hà Nội',
    contact_name: 'Ông Nguyễn Văn An (Trưởng phòng Quản lý MT)',
    contact_phone: '024.3835.1234',
  },
  stats: {
    totalNodes: 3,
    onlineNodes: 3,
    avgAqi: 45,
    avgPm25: 19.5,
    lastUpdate: 'Vừa xong',
  },
  nodes: [
    {
      id: 'node-1',
      chip_id: 'AWNODE-HN01',
      name: 'Trạm Quan trắc Hoàn Kiếm',
      location_name: 'Phố đi bộ Hoàn Kiếm, Hà Nội',
      status: 'online',
      aqi: 42,
      pm25: 18.5,
      pm10: 32.0,
      temperature: 29.5,
      humidity: 68,
      co2: 410,
      voc_index: 45,
      battery: 98,
      rssi: -58,
    },
    {
      id: 'node-2',
      chip_id: 'AWNODE-HN02',
      name: 'Trạm Cầu Giấy - ĐHQG',
      location_name: 'Đại học Quốc gia Hà Nội',
      status: 'online',
      aqi: 78,
      pm25: 38.2,
      pm10: 64.0,
      temperature: 31.0,
      humidity: 62,
      co2: 520,
      voc_index: 110,
      battery: 85,
      rssi: -64,
    },
    {
      id: 'node-3',
      chip_id: 'AWNODE-HN03',
      name: 'Trạm Đống Đa - Thái Hà',
      location_name: 'Ngã tư Thái Hà, Đống Đa, Hà Nội',
      status: 'online',
      aqi: 52,
      pm25: 22.0,
      pm10: 40.0,
      temperature: 30.2,
      humidity: 65,
      co2: 440,
      voc_index: 55,
      battery: 92,
      rssi: -60,
    },
  ],
};

export default function OrgDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState<any>(MOCK_ORG_DASHBOARD);
  const [loading, setLoading] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState('org-1');

  const fetchOrgData = async (id: string) => {
    try {
      const res = await nodesApi.getOrgDashboard(id).catch(() => null);
      if (res && res.nodes) setData(res);
    } catch (e) {
      /* fallback */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrgData(selectedOrgId);
    const interval = setInterval(() => fetchOrgData(selectedOrgId), 4000);
    return () => clearInterval(interval);
  }, [selectedOrgId]);

  return (
    <div className="min-h-screen bg-[#030810] text-white relative overflow-hidden font-body p-4 md:p-8">
      <AuroraBackground />

      <div className="max-w-6xl mx-auto space-y-6 relative z-10">
        {/* Mock Data Banner */}
        <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-heading font-semibold">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
            <span>
              📌 <strong>[DỮ LIỆU MẪU TỔ CHỨC / MOCK ORG DASHBOARD]</strong> — Bảng quan trắc nội bộ dành cho đối tác Doanh nghiệp / Cơ quan nhà nước.
            </span>
          </div>
          <span className="hidden sm:inline-block px-2 py-0.5 rounded bg-amber-500/20 text-[10px] font-bold text-amber-200">
            ENTERPRISE VIEW
          </span>
        </div>

        {/* Top Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/admin')}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-heading font-extrabold text-xl text-white">
                  {data?.org?.name || 'Sở Tài nguyên & Môi trường Hà Nội'}
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  {data?.org?.code || 'STNMT-HN'}
                </span>
              </div>
              <p className="text-xs text-white/60">
                Bảng điều khiển Giám sát chất lượng không khí dành riêng cho Tổ chức
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-white/50 hidden sm:inline">Chuyển xem Organization:</span>
            <select
              value={selectedOrgId}
              onChange={(e) => setSelectedOrgId(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 border border-white/15 text-xs text-cyan-300 font-heading focus:outline-none"
            >
              <option value="org-1">Sở TN&MT Hà Nội</option>
              <option value="org-2">UBND TP. Hồ Chí Minh</option>
              <option value="org-3">Đại học Quốc gia Hà Nội</option>
              <option value="org-4">Khu Công Nghệ Cao TP.HCM</option>
              <option value="org-5">BQL KCN Bình Dương</option>
            </select>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
            <div className="flex items-center justify-between text-white/50 text-xs font-heading">
              <span>Trạm đo sở hữu</span>
              <Cpu className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="font-heading font-extrabold text-2xl text-white">
              {data?.stats?.totalNodes ?? 3} Nodes
            </div>
            <div className="text-[11px] text-cyan-400 flex items-center gap-1 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" /> 100% Trực tuyến
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-1">
            <div className="flex items-center justify-between text-emerald-300/70 text-xs font-heading">
              <span>AQI Trung bình</span>
              <Wind className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="font-heading font-extrabold text-2xl text-emerald-400">
              AQI {data?.stats?.avgAqi ?? 45}
            </div>
            <div className="text-[11px] text-emerald-300/80">Chất lượng không khí Tốt</div>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
            <div className="flex items-center justify-between text-white/50 text-xs font-heading">
              <span>PM2.5 Trung bình</span>
              <Activity className="w-4 h-4 text-blue-400" />
            </div>
            <div className="font-heading font-extrabold text-2xl text-white">
              {data?.stats?.avgPm25 ?? 19.5} µg/m³
            </div>
            <div className="text-[11px] text-white/40">Chuẩn an toàn hô hấp</div>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
            <div className="flex items-center justify-between text-white/50 text-xs font-heading">
              <span>Trạng thái Hệ thống</span>
              <Zap className="w-4 h-4 text-amber-400" />
            </div>
            <div className="font-heading font-extrabold text-lg text-emerald-400 flex items-center gap-1.5 pt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              HOẠT ĐỘNG
            </div>
            <div className="text-[11px] text-white/40">Cập nhật mỗi 4s</div>
          </div>
        </div>

        {/* Nodes Detail List */}
        <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-4">
          <h3 className="font-heading font-bold text-sm text-white flex items-center gap-2">
            <Building2 className="w-4 h-4 text-cyan-400" />
            Danh sách Trạm Quan trắc thuộc Tổ chức
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(data?.nodes || MOCK_ORG_DASHBOARD.nodes).map((n: any) => (
              <div key={n.id} className="p-4 rounded-xl bg-slate-900/60 border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-heading font-bold text-sm text-white">{n.name}</h4>
                    <div className="text-[10px] text-cyan-300 font-mono">{n.chip_id}</div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-xs font-heading font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    AQI {n.aqi}
                  </span>
                </div>

                <div className="text-xs text-white/60 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span className="truncate">{n.location_name}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] text-white/70 pt-2 border-t border-white/10">
                  <div>PM2.5: <strong className="text-white">{n.pm25} µg/m³</strong></div>
                  <div>PM10: <strong className="text-white">{n.pm10} µg/m³</strong></div>
                  <div>Nhiệt độ: <strong className="text-white">{n.temperature}°C</strong></div>
                  <div>Độ ẩm: <strong className="text-white">{n.humidity}%</strong></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
