import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Cpu,
  Building2,
  Activity,
  Play,
  Pause,
  RefreshCw,
  Wifi,
  WifiOff,
  Wrench,
  ChevronRight,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';
import { nodesApi } from '@/integrations/api';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [nodes, setNodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  const fetchData = async () => {
    try {
      const [sData, nData] = await Promise.all([
        nodesApi.adminStats(),
        nodesApi.listNodes(),
      ]);
      setStats(sData);
      setNodes(nData);
    } catch (e) {
      console.error('Failed to fetch admin stats', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleSimulator = async () => {
    setToggling(true);
    try {
      const res = await nodesApi.toggleSimulator();
      setStats((prev: any) => ({ ...prev, isSimulating: res.isSimulating }));
    } finally {
      setToggling(false);
    }
  };

  if (loading && !stats) {
    return (
      <div className="h-full flex items-center justify-center text-white/50 text-sm gap-2">
        <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
        Đang tải dữ liệu Trung tâm IoT Admin...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & Telemetry Simulator Control */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-blue-950/60 via-slate-900/60 to-cyan-950/60 border border-cyan-500/20 shadow-xl relative overflow-hidden">
        <div className="space-y-1 relative z-10">
          <div className="flex items-center gap-2">
            <h2 className="font-heading text-lg font-bold text-white">
              Bảng điều khiển Giám sát IoT Nodes
            </h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              v2.4 REALTIME
            </span>
          </div>
          <p className="text-xs text-white/60">
            Theo dõi tín hiệu, dung lượng pin, chỉ số AQI và telemetry từ các node cảm biến vật lý.
          </p>
        </div>

        <div className="flex items-center gap-3 relative z-10 shrink-0">
          <button
            onClick={handleToggleSimulator}
            disabled={toggling}
            className={`px-4 py-2 rounded-xl text-xs font-heading font-bold flex items-center gap-2 transition-all shadow-lg ${
              stats?.isSimulating
                ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 shadow-amber-500/10'
                : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 shadow-emerald-500/10'
            }`}
          >
            {stats?.isSimulating ? (
              <>
                <Pause className="w-4 h-4 text-amber-400" />
                Tạm dừng Simulator
              </>
            ) : (
              <>
                <Play className="w-4 h-4 text-emerald-400" />
                Bật Telemetry Simulator
              </>
            )}
          </button>
        </div>
      </div>

      {/* Quick Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
          <div className="flex items-center justify-between text-white/50 text-xs font-heading">
            <span>Tổng số IoT Nodes</span>
            <Cpu className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="font-heading font-extrabold text-2xl text-white">
            {stats?.totalNodes ?? 0}
          </div>
          <div className="text-[11px] text-cyan-400 flex items-center gap-1 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            Đã đăng ký hệ thống
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-1">
          <div className="flex items-center justify-between text-emerald-300/70 text-xs font-heading">
            <span>Nodes Online</span>
            <Wifi className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="font-heading font-extrabold text-2xl text-emerald-400">
            {stats?.onlineNodes ?? 0}
          </div>
          <div className="text-[11px] text-emerald-300/80">
            Mạng ổn định, sẵn sàng đo
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
          <div className="flex items-center justify-between text-white/50 text-xs font-heading">
            <span>Tổng số Tổ chức</span>
            <Building2 className="w-4 h-4 text-blue-400" />
          </div>
          <div className="font-heading font-extrabold text-2xl text-white">
            {stats?.totalOrgs ?? 0}
          </div>
          <div className="text-[11px] text-white/40">
            Trường học, Bệnh viện, Cơ quan
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
          <div className="flex items-center justify-between text-white/50 text-xs font-heading">
            <span>AQI Trung bình Nodes</span>
            <Activity className="w-4 h-4 text-amber-400" />
          </div>
          <div className="font-heading font-extrabold text-2xl text-amber-300">
            {stats?.avgAqi ?? 0}
          </div>
          <div className="text-[11px] text-amber-400/80 font-semibold">
            {stats?.avgAqi <= 50 ? 'Tốt' : stats?.avgAqi <= 100 ? 'Trung bình' : 'Kém'}
          </div>
        </div>
      </div>

      {/* Main Grid: Live Nodes Table + Simulator Activity Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Nodes Status Table */}
        <div className="lg:col-span-2 rounded-2xl bg-white/5 border border-white/10 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-heading font-bold text-sm text-white flex items-center gap-2">
                <Cpu className="w-4 h-4 text-cyan-400" />
                Danh sách IoT Nodes Thời gian Thực
              </h3>
              <p className="text-[11px] text-white/50">Cập nhật telemetry liên tục mỗi 4s</p>
            </div>
            <button
              onClick={() => navigate('/admin/nodes')}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1"
            >
              Quản lý chi tiết <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-body">
              <thead>
                <tr className="border-b border-white/10 text-white/40 font-heading font-semibold">
                  <th className="pb-3 pl-1">Tên Node / Chip ID</th>
                  <th className="pb-3">Tổ chức gán</th>
                  <th className="pb-3">Trạng thái</th>
                  <th className="pb-3">AQI / PM2.5</th>
                  <th className="pb-3">Nhiệt độ</th>
                  <th className="pb-3">Pin / Tín hiệu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {nodes.map((node) => {
                  const isOnline = node.status === 'online';
                  const aqiColor =
                    node.aqi <= 50
                      ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                      : node.aqi <= 100
                      ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                      : 'text-rose-400 bg-rose-500/10 border-rose-500/20';

                  return (
                    <tr key={node.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 pl-1 font-semibold text-white">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-cyan-400" />
                          <div>
                            <div>{node.name}</div>
                            <div className="text-[10px] text-white/40 font-mono">{node.chip_id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 text-white/70">{node.organization_name || 'Tự do'}</td>
                      <td className="py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            isOnline
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          }`}
                        >
                          {isOnline ? <Wifi className="w-3 h-3" /> : <Wrench className="w-3 h-3" />}
                          {node.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded font-bold border text-xs ${aqiColor}`}>
                            AQI {node.aqi}
                          </span>
                          <span className="text-white/50 text-[11px]">{node.pm25} µg/m³</span>
                        </div>
                      </td>
                      <td className="py-3 text-white/80">{node.temperature}°C</td>
                      <td className="py-3">
                        <div className="text-[11px] text-white/60">
                          🔋 {node.battery}% · 📶 {node.rssi} dBm
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Info Panel */}
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-3">
            <h4 className="font-heading font-bold text-sm text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-cyan-400" />
              Giao thức Kết nối MQTT
            </h4>
            <p className="text-xs text-white/60 leading-relaxed">
              Các node ESP32 gửi dữ liệu telemetry qua chủ đề (topic) MQTT mặc định:
            </p>
            <div className="p-3 rounded-xl bg-black/60 font-mono text-[11px] text-cyan-300 border border-white/10 break-all">
              airweave/nodes/&#123;chip_id&#125;/telemetry
            </div>
            <div className="text-[11px] text-white/50 space-y-1">
              <div>• Payload định dạng JSON tiêu chuẩn.</div>
              <div>• Tự động đăng ký node mới khi phát hiện chip_id lạ.</div>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-3">
            <h4 className="font-heading font-bold text-sm text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Cơ chế Backup & Fallback
            </h4>
            <p className="text-xs text-white/60 leading-relaxed">
              Nếu một node bị ngắt nguồn hoặc mất mạng quá 15 phút, hệ thống tự động bù bằng số liệu trạm WAQI gần nhất hoặc Open-Meteo để không đứt đoạn dữ liệu.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
