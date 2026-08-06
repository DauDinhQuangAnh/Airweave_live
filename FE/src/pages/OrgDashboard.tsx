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
  HeartHandshake,
  AlertCircle,
  Wind,
  CheckCircle2,
} from 'lucide-react';
import AuroraBackground from '@/components/AuroraBackground';
import { nodesApi } from '@/integrations/api';

export default function OrgDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedOrgId, setSelectedOrgId] = useState('org-001');

  const fetchOrgData = async (id: string) => {
    try {
      const res = await nodesApi.getOrgDashboard(id);
      setData(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrgData(selectedOrgId);
    const interval = setInterval(() => fetchOrgData(selectedOrgId), 4000);
    return () => clearInterval(interval);
  }, [selectedOrgId]);

  if (loading && !data) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#030810] text-white/50 text-sm gap-2">
        <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
        Đang tải Bảng điều khiển Tổ chức...
      </div>
    );
  }

  const { organization, nodes, summary } = data || {};

  return (
    <div className="min-h-screen flex flex-col bg-[#030810] text-white relative overflow-hidden font-body">
      <AuroraBackground />

      {/* Top Header */}
      <header className="relative z-20 h-[60px] border-b border-white/10 bg-[rgba(3,8,15,0.96)] px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors"
            title="Quay lại Trang chính"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-cyan-400" />
            <div>
              <h1 className="font-heading font-bold text-sm text-white">
                {organization?.name || 'Bảng điều khiển Tổ chức'}
              </h1>
              <p className="text-[10px] text-white/50">
                Mã: {organization?.code} · {organization?.address}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Org Selector Switcher for Testing */}
          <select
            value={selectedOrgId}
            onChange={(e) => setSelectedOrgId(e.target.value)}
            className="bg-black/60 border border-white/15 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
          >
            <option value="org-001">Trường THPT Chu Văn An</option>
            <option value="org-002">Bệnh viện Đa khoa Hồng Ngọc</option>
            <option value="org-003">Tòa Keangnam Landmark</option>
          </select>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 relative z-20 p-4 md:p-6 overflow-y-auto max-w-6xl mx-auto w-full space-y-6">
        {/* Top Summary Banner */}
        <div className="p-6 rounded-3xl bg-gradient-to-r from-blue-950/70 via-slate-900/70 to-cyan-950/70 border border-cyan-500/25 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              Mạng lưới IoT Đã gán Riêng
            </div>
            <h2 className="font-heading font-extrabold text-xl md:text-2xl text-white">
              Chất lượng Không khí Toàn Khuôn viên
            </h2>
            <p className="text-xs text-white/70 max-w-xl leading-relaxed">
              Theo dõi liên tục từ các node cảm biến đo vật lý được lắp đặt trực tiếp tại sân trường, nhà thể thao và các tầng phòng học.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-black/50 border border-white/10 flex items-center gap-4 text-center shrink-0 min-w-[200px] justify-center">
            <div>
              <div className="text-[10px] text-white/50 uppercase font-heading font-semibold">
                AQI Trung bình
              </div>
              <div className="font-heading font-black text-3xl text-emerald-400">
                {summary?.avgAqi ?? 50}
              </div>
              <div className="text-xs text-emerald-300 font-semibold mt-0.5">
                {summary?.airQualityCategory ?? 'Tốt'}
              </div>
            </div>
          </div>
        </div>

        {/* Nodes Grid for the Organization */}
        <div className="space-y-3">
          <h3 className="font-heading font-bold text-base text-white flex items-center gap-2">
            <Cpu className="w-4 h-4 text-cyan-400" />
            Các Node Cảm biến trong Cơ quan ({nodes?.length ?? 0} Nodes)
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {nodes?.map((node: any) => (
              <div
                key={node.id}
                className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-4 hover:border-cyan-500/30 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-heading font-bold text-sm text-white">{node.name}</h4>
                    <p className="text-[11px] text-white/50 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-cyan-400" />
                      {node.location_name}
                    </p>
                  </div>

                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    AQI {node.aqi}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                  <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                    <div className="text-white/40 text-[10px]">PM2.5 / AQI</div>
                    <div className="font-semibold text-white mt-0.5">{node.pm25} µg/m³</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                    <div className="text-white/40 text-[10px]">Khí CO2</div>
                    <div className={`font-semibold mt-0.5 ${(node.co2 || 450) > 1000 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {node.co2 || 450} ppm
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                    <div className="text-white/40 text-[10px]">Khí độc VOCs</div>
                    <div className="font-semibold text-cyan-300 mt-0.5">
                      Index {node.voc_index || 35}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                    <div className="text-white/40 text-[10px]">Tia UV / Nhiệt</div>
                    <div className="font-semibold text-amber-300 mt-0.5">
                      UV {node.uv_index || 4.2} · {node.temperature}°C
                    </div>
                  </div>
                </div>

              </div>
            ))}
          </div>
        </div>

        {/* Tailored Organization Health Advice */}
        <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-3">
          <h4 className="font-heading font-bold text-sm text-white flex items-center gap-2">
            <HeartHandshake className="w-4 h-4 text-emerald-400" />
            Khuyến nghị Vận hành theo Loại hình ({organization?.type?.toUpperCase()})
          </h4>

          <ul className="text-xs text-white/70 space-y-2 list-disc list-inside leading-relaxed">
            <li>
              Chất lượng không khí ở mức <strong className="text-emerald-400 font-semibold">Tốt</strong>. Các hoạt động thể dục thể thao ngoài trời cho học sinh / cán bộ hoàn toàn an toàn.
            </li>
            <li>
              Nên mở cửa thông thoáng gió tự nhiên vào các khung giờ ít ô nhiễm giao thông (09:00 - 11:00).
            </li>
            <li>
              Hệ thống IoT tiếp tục tự động đo đạc mỗi phút và gửi cảnh báo nếu PM2.5 vượt ngưỡng 50 µg/m³.
            </li>
          </ul>
        </div>
      </main>
    </div>
  );
}
