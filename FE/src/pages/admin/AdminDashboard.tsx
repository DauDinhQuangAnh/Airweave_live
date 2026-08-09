import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Cpu,
  Building2,
  Activity,
  Play,
  Pause,
  Wifi,
  Wrench,
  ChevronRight,
  TrendingUp,
  AlertTriangle,
  Sparkles,
  ShieldAlert,
  Sun,
  Zap,
  X,
  MapPin,
  Radio,
} from 'lucide-react';
import { nodesApi } from '@/integrations/api';

export const MOCK_NODES = [
  {
    id: 'node-1',
    chip_id: 'AWNODE-HN01',
    name: 'Trạm Quan trắc Hoàn Kiếm',
    edition: '☀️ Outdoor Solar Edition',
    edition_type: 'outdoor',
    location_name: 'Phố đi bộ Hoàn Kiếm, Hà Nội',
    organization_id: 'org-1',
    organization_name: 'Sở TN&MT Hà Nội',
    status: 'online',
    aqi: 42,
    pm25: 18.5,
    pm10: 32.0,
    temperature: 29.5,
    humidity: 68,
    co2: 410,
    voc_index: 45,
    uv_index: 6.2,
    battery: 98,
    rssi: -58,
    mcu: 'ESP32-S3 (Anten IPEX 8dBi)',
    power_source: 'Solar Panel 5V/6W + 2x 18650 Battery (5200mAh)',
    sensors: ['Winsen ZH03B Laser', 'Sensirion SHT30', 'Winsen ZE12A (CO/NO2/SO2/O3)', 'UVM-30A UV Sensor'],
  },
  {
    id: 'node-2',
    chip_id: 'AWNODE-HN02',
    name: 'Trạm Cầu Giấy - ĐHQG',
    edition: '🔌 Indoor Campus Grid Edition',
    edition_type: 'indoor',
    location_name: 'Đại học Quốc gia Hà Nội',
    organization_id: 'org-3',
    organization_name: 'Đại học Quốc Gia Hà Nội',
    status: 'online',
    aqi: 78,
    pm25: 38.2,
    pm10: 64.0,
    temperature: 31.0,
    humidity: 62,
    co2: 520,
    voc_index: 110,
    uv_index: 2.1,
    battery: 100,
    rssi: -64,
    mcu: 'ESP32-S3 (Dual-Core 240MHz)',
    power_source: 'Nguồn điện lưới 220V (Adapter 5V/2A Type-C 24/7)',
    sensors: ['Winsen ZH03B Laser', 'Sensirion SHT30', 'Winsen ZE12A', 'Winsen MH-Z19C NDIR CO2', 'Sensirion SGP40 VOCs'],
  },
  {
    id: 'node-3',
    chip_id: 'AWNODE-HCM01',
    name: 'Trạm Q1 - Công viên 23/9',
    edition: '☀️ Outdoor Solar Edition',
    edition_type: 'outdoor',
    location_name: 'Công viên 23/9, Quận 1, TP.HCM',
    organization_id: 'org-2',
    organization_name: 'UBND TP. Hồ Chí Minh',
    status: 'online',
    aqi: 35,
    pm25: 14.2,
    pm10: 25.0,
    temperature: 32.5,
    humidity: 75,
    co2: 395,
    voc_index: 30,
    uv_index: 8.4,
    battery: 100,
    rssi: -52,
    mcu: 'ESP32-S3 (Anten IPEX 8dBi)',
    power_source: 'Solar Panel 5V/6W + 2x 18650 Battery',
    sensors: ['Winsen ZH03B Laser', 'Sensirion SHT30', 'Winsen ZE12A (CO/NO2/SO2/O3)', 'UVM-30A UV Sensor'],
  },
  {
    id: 'node-4',
    chip_id: 'AWNODE-HCM02',
    name: 'Trạm Khu Công Nghệ Cao',
    edition: '🔌 Indoor Campus Grid Edition',
    edition_type: 'indoor',
    location_name: 'SHTP, Thủ Đức, TP.HCM',
    organization_id: 'org-4',
    organization_name: 'Khu Công Nghệ Cao TP.HCM',
    status: 'online',
    aqi: 125,
    pm25: 68.0,
    pm10: 95.0,
    temperature: 33.0,
    humidity: 58,
    co2: 780,
    voc_index: 240,
    uv_index: 4.0,
    battery: 100,
    rssi: -70,
    mcu: 'ESP32-S3 (Dual-Core 240MHz)',
    power_source: 'Nguồn điện lưới 220V (Adapter 5V/2A Type-C 24/7)',
    sensors: ['Winsen ZH03B Laser', 'Sensirion SHT30', 'Winsen ZE12A', 'Winsen MH-Z19C NDIR CO2', 'Sensirion SGP40 VOCs'],
  },
  {
    id: 'node-5',
    chip_id: 'AWNODE-BD01',
    name: 'Trạm KCN VSIP 1',
    edition: '☀️ Outdoor Solar Edition',
    edition_type: 'outdoor',
    location_name: 'KCN VSIP 1, Thuận An, Bình Dương',
    organization_id: 'org-5',
    organization_name: 'Ban Quản lý KCN Bình Dương',
    status: 'warning',
    aqi: 158,
    pm25: 85.0,
    pm10: 140.0,
    temperature: 34.0,
    humidity: 52,
    co2: 920,
    voc_index: 310,
    uv_index: 9.1,
    battery: 88,
    rssi: -75,
    mcu: 'ESP32-S3 (Anten IPEX 8dBi)',
    power_source: 'Solar Panel 5V/6W + 2x 18650 Battery',
    sensors: ['Winsen ZH03B Laser', 'Sensirion SHT30', 'Winsen ZE12A (CO/NO2/SO2/O3)', 'UVM-30A UV Sensor'],
  },
  {
    id: 'node-6',
    chip_id: 'AWNODE-DN01',
    name: 'Trạm Hải Châu (Tự do)',
    edition: '☀️ Outdoor Solar Edition',
    edition_type: 'outdoor',
    location_name: 'Nguyễn Văn Linh, Hải Châu, Đà Nẵng',
    organization_id: null,
    organization_name: null,
    status: 'online',
    aqi: 28,
    pm25: 9.8,
    pm10: 16.0,
    temperature: 30.0,
    humidity: 70,
    co2: 380,
    voc_index: 20,
    uv_index: 7.2,
    battery: 96,
    rssi: -55,
    mcu: 'ESP32-S3 (Anten IPEX 8dBi)',
    power_source: 'Solar Panel 5V/6W + 2x 18650 Battery',
    sensors: ['Winsen ZH03B Laser', 'Sensirion SHT30', 'Winsen ZE12A (CO/NO2/SO2/O3)', 'UVM-30A UV Sensor'],
  },
  {
    id: 'node-7',
    chip_id: 'AWNODE-HP01',
    name: 'Trạm Cảng Hải Phòng (Tự do)',
    edition: '☀️ Outdoor Solar Edition',
    edition_type: 'outdoor',
    location_name: 'Cảng Hoàng Diệu, Ngô Quyền, Hải Phòng',
    organization_id: null,
    organization_name: null,
    status: 'online',
    aqi: 88,
    pm25: 44.5,
    pm10: 72.0,
    temperature: 28.5,
    humidity: 82,
    co2: 590,
    voc_index: 145,
    uv_index: 5.5,
    battery: 78,
    rssi: -68,
    mcu: 'ESP32-S3 (Anten IPEX 8dBi)',
    power_source: 'Solar Panel 5V/6W + 2x 18650 Battery',
    sensors: ['Winsen ZH03B Laser', 'Sensirion SHT30', 'Winsen ZE12A (CO/NO2/SO2/O3)', 'UVM-30A UV Sensor'],
  },
  {
    id: 'node-8',
    chip_id: 'AWNODE-CT01',
    name: 'Trạm Bến Ninh Kiều (Tự do)',
    edition: '☀️ Outdoor Solar Edition',
    edition_type: 'outdoor',
    location_name: 'Ninh Kiều, Cần Thơ',
    organization_id: null,
    organization_name: null,
    status: 'online',
    aqi: 32,
    pm25: 12.0,
    pm10: 22.0,
    temperature: 31.5,
    humidity: 78,
    co2: 390,
    voc_index: 25,
    uv_index: 8.0,
    battery: 94,
    rssi: -60,
    mcu: 'ESP32-S3 (Anten IPEX 8dBi)',
    power_source: 'Solar Panel 5V/6W + 2x 18650 Battery',
    sensors: ['Winsen ZH03B Laser', 'Sensirion SHT30', 'Winsen ZE12A (CO/NO2/SO2/O3)', 'UVM-30A UV Sensor'],
  },
  {
    id: 'node-9',
    chip_id: 'AWNODE-TN01',
    name: 'Trạm KCN Sông Công (Tự do)',
    edition: '🔌 Indoor Campus Grid Edition',
    edition_type: 'indoor',
    location_name: 'KCN Sông Công 1, Thái Nguyên',
    organization_id: null,
    organization_name: null,
    status: 'offline',
    aqi: 95,
    pm25: 49.0,
    pm10: 78.0,
    temperature: 29.0,
    humidity: 65,
    co2: 610,
    voc_index: 160,
    uv_index: 1.0,
    battery: 12,
    rssi: -88,
    mcu: 'ESP32-S3 (Dual-Core 240MHz)',
    power_source: 'Nguồn điện lưới 220V (Adapter 5V/2A Type-C 24/7)',
    sensors: ['Winsen ZH03B Laser', 'Sensirion SHT30', 'Winsen ZE12A', 'Winsen MH-Z19C NDIR CO2', 'Sensirion SGP40 VOCs'],
  },
  {
    id: 'node-10',
    chip_id: 'AWNODE-VT01',
    name: 'Trạm Bãi Sau Vũng Tàu (Tự do)',
    edition: '☀️ Outdoor Solar Edition',
    edition_type: 'outdoor',
    location_name: 'Thùy Vân, TP. Vũng Tàu',
    organization_id: null,
    organization_name: null,
    status: 'online',
    aqi: 22,
    pm25: 7.5,
    pm10: 13.0,
    temperature: 29.8,
    humidity: 74,
    co2: 375,
    voc_index: 15,
    uv_index: 9.8,
    battery: 100,
    rssi: -50,
    mcu: 'ESP32-S3 (Anten IPEX 8dBi)',
    power_source: 'Solar Panel 5V/6W + 2x 18650 Battery',
    sensors: ['Winsen ZH03B Laser', 'Sensirion SHT30', 'Winsen ZE12A (CO/NO2/SO2/O3)', 'UVM-30A UV Sensor'],
  },
];

export const MOCK_STATS = {
  totalNodes: 10,
  onlineNodes: 8,
  offlineNodes: 1,
  warningNodes: 1,
  totalOrgs: 5,
  avgAqi: 60,
  isSimulating: true,
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(MOCK_STATS);
  const [nodes, setNodes] = useState<any[]>(MOCK_NODES);
  const [loading, setLoading] = useState(false);
  const [toggling, setToggling] = useState(false);

  // Selected node pop-up
  const [selectedNode, setSelectedNode] = useState<any | null>(null);

  const fetchData = async () => {
    try {
      const [sData, nData] = await Promise.all([
        nodesApi.adminStats().catch(() => null),
        nodesApi.listNodes().catch(() => []),
      ]);
      if (sData && sData.totalNodes > 0) setStats(sData);
      if (Array.isArray(nData) && nData.length > 0) setNodes(nData);
    } catch {
      /* fallback to mock */
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
      const res = await nodesApi.toggleSimulator().catch(() => null);
      const nextSim = res?.isSimulating ?? !stats?.isSimulating;
      setStats((prev: any) => ({ ...prev, isSimulating: nextSim }));
    } finally {
      setToggling(false);
    }
  };

  return (
    <div className="space-y-6 font-body">
      {/* Mock Data Banner */}
      <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-heading font-semibold">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
          <span>
            📌 <strong>[QUẢN LÝ SƠ BỘ DASHBOARD]</strong> — Bấm vào bất kỳ dòng Trạm đo nào trong bảng để mở Pop-up xem chi tiết telemetry thời gian thực.
          </span>
        </div>
        <span className="hidden sm:inline-block px-2 py-0.5 rounded bg-amber-500/20 text-[10px] font-bold text-amber-200">
          SUMMARY DASHBOARD
        </span>
      </div>

      {/* Top Banner & Telemetry Simulator Control */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-blue-950/60 via-slate-900/60 to-cyan-950/60 border border-cyan-500/20 shadow-xl relative overflow-hidden">
        <div className="space-y-1 relative z-10">
          <div className="flex items-center gap-2">
            <h2 className="font-heading text-lg font-bold text-white">
              Bảng điều khiển Giám sát IoT Nodes
            </h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              ESP32-S3 REALTIME
            </span>
          </div>
          <p className="text-xs text-white/60">
            Cảm biến Bụi Laser Winsen ZH03B, Nhiệt ẩm Sensirion SHT30, Khí độc Winsen ZE12A (CO/NO2/SO2/O3), CO2 NDIR MH-Z19C.
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
            {stats?.totalNodes ?? 10}
          </div>
          <div className="text-[11px] text-cyan-400 flex items-center gap-1 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            Outdoor Solar & Indoor Grid
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-1">
          <div className="flex items-center justify-between text-emerald-300/70 text-xs font-heading">
            <span>Nodes Online</span>
            <Wifi className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="font-heading font-extrabold text-2xl text-emerald-400">
            {stats?.onlineNodes ?? 8}
          </div>
          <div className="text-[11px] text-emerald-300/80">
            Heartbeat 4s (Read-Only Status)
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
          <div className="flex items-center justify-between text-white/50 text-xs font-heading">
            <span>Tổng số Tổ chức</span>
            <Building2 className="w-4 h-4 text-blue-400" />
          </div>
          <div className="font-heading font-extrabold text-2xl text-white">
            {stats?.totalOrgs ?? 5}
          </div>
          <div className="text-[11px] text-white/40">
            Cơ quan, Trường học, KCN
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
          <div className="flex items-center justify-between text-white/50 text-xs font-heading">
            <span>AQI Trung bình Nodes</span>
            <Activity className="w-4 h-4 text-amber-400" />
          </div>
          <div className="font-heading font-extrabold text-2xl text-amber-300">
            {stats?.avgAqi ?? 60}
          </div>
          <div className="text-[11px] text-amber-400/80 font-semibold">
            Thuật toán EMA & Hygroscopic
          </div>
        </div>
      </div>

      {/* Main Grid: Live Nodes Table + Hardware Spec Notice */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Nodes Status Table (Summary rows) */}
        <div className="lg:col-span-2 rounded-2xl bg-white/5 border border-white/10 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-heading font-bold text-sm text-white flex items-center gap-2">
                <Cpu className="w-4 h-4 text-cyan-400" />
                Danh sách Trạm Quan trắc (Sơ bộ)
              </h3>
              <p className="text-[11px] text-white/50">Bấm vào bất kỳ dòng nào để mở Pop-up chi tiết telemetry</p>
            </div>
            <button
              onClick={() => navigate('/admin/nodes')}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 font-heading"
            >
              Quản lý chi tiết <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-body">
              <thead>
                <tr className="border-b border-white/10 text-white/40 font-heading font-semibold">
                  <th className="pb-3 pl-1">Tên Node / Chip ID</th>
                  <th className="pb-3">Phiên bản Hardware</th>
                  <th className="pb-3">Tổ chức gán</th>
                  <th className="pb-3">Trạng thái</th>
                  <th className="pb-3">AQI / PM2.5</th>
                  <th className="pb-3 text-right pr-1">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {nodes.map((node) => {
                  const isOnline = node.status === 'online';
                  const isWarning = node.status === 'warning';
                  const isOutdoor = node.edition_type === 'outdoor';
                  const aqiColor =
                    node.aqi <= 50
                      ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                      : node.aqi <= 100
                      ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                      : 'text-rose-400 bg-rose-500/10 border-rose-500/20';

                  return (
                    <tr
                      key={node.id || node.chip_id}
                      onClick={() => setSelectedNode(node)}
                      className="hover:bg-white/[0.05] transition-colors cursor-pointer group"
                    >
                      <td className="py-3 pl-1 font-semibold text-white group-hover:text-cyan-300">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400' : isWarning ? 'bg-rose-400 animate-ping' : 'bg-white/30'}`} />
                          <div>
                            <div>{node.name}</div>
                            <div className="text-[10px] text-white/40 font-mono">{node.chip_id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${isOutdoor ? 'bg-amber-500/15 text-amber-300 border-amber-500/30' : 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'}`}>
                          {isOutdoor ? '☀️ Outdoor Solar' : '🔌 Indoor Grid'}
                        </span>
                      </td>
                      <td className="py-3 text-white/70">
                        {node.organization_name ? (
                          <span className="text-white/80">{node.organization_name}</span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-white/10 text-[10px] font-semibold text-amber-300">
                            Chưa gán (Tự do)
                          </span>
                        )}
                      </td>
                      <td className="py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            isOnline
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : isWarning
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          }`}
                        >
                          {isOnline ? <Wifi className="w-3 h-3" /> : isWarning ? <ShieldAlert className="w-3 h-3" /> : <Wrench className="w-3 h-3" />}
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
                      <td className="py-3 text-right pr-1">
                        <span className="text-[11px] font-heading font-semibold text-cyan-400 group-hover:text-cyan-300 inline-flex items-center gap-1">
                          Chi tiết <ChevronRight className="w-3.5 h-3.5" />
                        </span>
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
              <Sun className="w-4 h-4 text-amber-400" />
              Phiên bản 1: Outdoor Solar Edition
            </h4>
            <p className="text-xs text-white/60 leading-relaxed">
              Trang bị vi điều khiển <strong>ESP32-S3 + Anten râu 8dBi</strong>, Cảm biến bụi Laser <strong>Winsen ZH03B</strong>, Nhiệt/Ẩm Sensirion SHT30, Tia UV UVM-30A, Khí độc điện hóa Winsen ZE12A.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-3">
            <h4 className="font-heading font-bold text-sm text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-400" />
              Phiên bản 2: Indoor Campus Grid Edition
            </h4>
            <p className="text-xs text-white/60 leading-relaxed">
              Chạy nguồn điện lưới 220V (Adapter 5V/2A Type-C) 24/7. Tích hợp bổ sung Cảm biến khí CO2 NDIR <strong>Winsen MH-Z19C</strong> và VOCs <strong>Sensirion SGP40</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* POP-UP MODAL: Xem Chi tiết Telemetry từ Dashboard */}
      {selectedNode && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedNode(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl rounded-2xl bg-slate-900 border border-cyan-500/40 p-6 shadow-2xl space-y-5 relative max-h-[90vh] overflow-y-auto cursor-default font-body"
          >
            {/* Header Pop-up */}
            <div className="flex items-start justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Cpu className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-heading font-extrabold text-lg text-white">
                      {selectedNode.name}
                    </h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                      {selectedNode.chip_id}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {selectedNode.edition || '☀️ Outdoor Solar Edition'}
                    </span>
                    <p className="text-xs text-white/60 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                      {selectedNode.location_name}
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedNode(null)}
                className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Grid 1: Telemetry Realtime */}
            <div className="space-y-2">
              <h4 className="font-heading font-bold text-xs uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                <Activity className="w-4 h-4" /> Telemetry Môi trường Realtime
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
                  <span className="text-white/50 text-[10px]">Bụi PM2.5</span>
                  <div className="font-heading font-bold text-base text-white">{selectedNode.pm25} µg/m³</div>
                </div>

                <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
                  <span className="text-white/50 text-[10px]">Bụi PM10</span>
                  <div className="font-heading font-bold text-base text-white">{selectedNode.pm10} µg/m³</div>
                </div>

                <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
                  <span className="text-white/50 text-[10px]">Chỉ số AQI</span>
                  <div className="font-heading font-bold text-base text-amber-300">AQI {selectedNode.aqi}</div>
                </div>

                <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
                  <span className="text-white/50 text-[10px]">Nhiệt / Ẩm</span>
                  <div className="font-heading font-bold text-base text-white">{selectedNode.temperature}°C · {selectedNode.humidity}%</div>
                </div>

                <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
                  <span className="text-white/50 text-[10px]">Khí độc CO2</span>
                  <div className="font-heading font-bold text-base text-cyan-300">{selectedNode.co2 || 410} ppm</div>
                </div>

                <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
                  <span className="text-white/50 text-[10px]">Sensirion SGP40 VOCs</span>
                  <div className="font-heading font-bold text-base text-amber-400">{selectedNode.voc_index || 45}</div>
                </div>

                <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
                  <span className="text-white/50 text-[10px]">Tia UV (LTR-390)</span>
                  <div className="font-heading font-bold text-base text-purple-400">UV Index {selectedNode.uv_index || 6.2}</div>
                </div>

                <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
                  <span className="text-white/50 text-[10px]">Pin & Tín hiệu</span>
                  <div className="font-heading font-bold text-sm text-emerald-400">🔋 {selectedNode.battery}% · {selectedNode.rssi} dBm</div>
                </div>
              </div>
            </div>

            {/* Grid 2: Hardware BOM specs */}
            <div className="space-y-2 pt-2 border-t border-white/10">
              <h4 className="font-heading font-bold text-xs uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                <Zap className="w-4 h-4" /> Danh mục Cảm biến & Linh kiện Phần cứng
              </h4>
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-white/10 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-white/60">Vi điều khiển MCU:</span>
                  <span className="font-mono text-cyan-300 font-semibold">{selectedNode.mcu || 'ESP32-S3 (Anten IPEX 8dBi)'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/60">Khối Nguồn cấp điện:</span>
                  <span className="font-mono text-emerald-300 text-[11px]">{selectedNode.power_source || 'Solar Panel 5V/6W + 2x 18650 Pin 5200mAh'}</span>
                </div>
                <div className="space-y-1 pt-1">
                  <span className="text-white/60 block">Cảm biến tích hợp:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {(selectedNode.sensors || ['Winsen ZH03B Laser', 'Sensirion SHT30', 'Winsen ZE12A (CO/NO2/SO2/O3)', 'UVM-30A UV Sensor']).map((s: string) => (
                      <span key={s} className="px-2 py-1 rounded bg-cyan-500/10 border border-cyan-500/30 text-[10px] text-cyan-300 font-semibold font-mono">
                        ✓ {s}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end border-t border-white/10">
              <button
                onClick={() => {
                  setSelectedNode(null);
                  navigate('/admin/nodes');
                }}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-heading font-bold text-xs flex items-center gap-1.5"
              >
                Đến Trang Quản lý Nodes <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
