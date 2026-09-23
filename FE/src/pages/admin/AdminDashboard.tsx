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
import { useAppLang } from '@/hooks/use-app-lang';
import { localizeDemoText } from '@/lib/localize-demo';
import { isDemoMode } from '@/lib/demo/demo-mode';

export default function AdminDashboard() {
  const lang = useAppLang();
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [nodes, setNodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [toggling, setToggling] = useState(false);

  // Selected node pop-up
  const [selectedNode, setSelectedNode] = useState<any | null>(null);

  const fetchData = async () => {
    try {
      const [sData, nData] = await Promise.all([nodesApi.adminStats(), nodesApi.listNodes()]);
      if (sData && typeof sData.totalNodes === 'number') setStats(sData);
      if (Array.isArray(nData) && (!isDemoMode() || nData.length)) setNodes(nData);
      setError(false);
    } catch {
      if (!isDemoMode()) {
        setStats(null);
        setNodes([]);
        setError(true);
      }
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
      if (typeof res?.isSimulating === 'boolean') {
        setStats((prev: any) => ({ ...prev, isSimulating: res.isSimulating }));
      }
    } catch {
      setError(true);
    } finally {
      setToggling(false);
    }
  };

  if (loading) return <div className="p-6 text-white/70">{lang === 'vi' ? 'Đang tải dữ liệu trạm...' : 'Loading station data...'}</div>;
  if (error) return <div className="p-6 text-amber-300" role="alert">{lang === 'vi' ? 'Không thể tải bảng quản trị. Vui lòng kiểm tra quyền quản trị và kết nối máy chủ.' : 'Unable to load the admin dashboard. Check administrator access and the server connection.'}</div>;

  return (
    <div className="space-y-6 font-body">
      {/* Mock Data Banner */}
      <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-heading font-semibold">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
          <span>
            📌 <strong>{lang === 'vi' ? '[QUẢN LÝ SƠ BỘ DASHBOARD]' : '[ADMIN DASHBOARD PREVIEW]'}</strong> — {lang === 'vi' ? 'Bấm vào bất kỳ dòng Trạm đo nào trong bảng để mở Pop-up xem chi tiết telemetry thời gian thực.' : 'Select any station row to inspect its real-time telemetry.'}
          </span>
        </div>
        <span className="hidden sm:inline-block px-2 py-0.5 rounded bg-amber-500/20 text-[10px] font-bold text-amber-200">
          {lang === 'vi' ? 'BẢNG TỔNG QUAN' : 'SUMMARY DASHBOARD'}
        </span>
      </div>

      {/* Top Banner & Telemetry Simulator Control */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-blue-950/60 via-slate-900/60 to-cyan-950/60 border border-cyan-500/20 shadow-xl relative overflow-hidden">
        <div className="space-y-1 relative z-10">
          <div className="flex items-center gap-2">
            <h2 className="font-heading text-lg font-bold text-white">
              {lang === 'vi' ? 'Bảng điều khiển Giám sát IoT Nodes' : 'IoT Node Monitoring Dashboard'}
            </h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              {isDemoMode() ? (lang === 'vi' ? 'DỮ LIỆU MÔ PHỎNG' : 'SIMULATED DATA') : (lang === 'vi' ? 'TRẠNG THÁI THIẾT BỊ' : 'DEVICE STATUS')}
            </span>
          </div>
          <p className="text-xs text-white/60">
            {lang === 'vi' ? 'Danh sách và số đo lấy từ các thiết bị đã đăng ký. Trạm không có telemetry mới sẽ hiển thị ngoại tuyến.' : 'Stations and readings come from registered devices. Stations without fresh telemetry appear offline.'}
          </p>
        </div>

        <div className="flex items-center gap-3 relative z-10 shrink-0">
          <button
            onClick={handleToggleSimulator}
            disabled={toggling || stats?.simulatorEnabled !== true}
            className={`px-4 py-2 rounded-xl text-xs font-heading font-bold flex items-center gap-2 transition-all shadow-lg ${
              stats?.isSimulating
                ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 shadow-amber-500/10'
                : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 shadow-emerald-500/10'
            }`}
          >
            {stats?.isSimulating ? (
              <>
                <Pause className="w-4 h-4 text-amber-400" />
                {lang === 'vi' ? 'Tạm dừng Simulator' : 'Pause Simulator'}
              </>
            ) : (
              <>
                <Play className="w-4 h-4 text-emerald-400" />
                {lang === 'vi' ? 'Bật Telemetry Simulator' : 'Start Telemetry Simulator'}
              </>
            )}
          </button>
          {stats?.simulatorEnabled !== true && <span className="text-xs text-white/50">{isDemoMode() ? (lang === 'vi' ? 'Simulator không chạy trong bản demo' : 'Simulator does not run in demo mode') : (lang === 'vi' ? 'Simulator đang tắt trong cấu hình máy chủ' : 'Simulator disabled in server configuration')}</span>}
        </div>
      </div>

      {/* Quick Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
          <div className="flex items-center justify-between text-white/50 text-xs font-heading">
            <span>{lang === 'vi' ? 'Tổng số IoT Nodes' : 'Total IoT Nodes'}</span>
            <Cpu className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="font-heading font-extrabold text-2xl text-white">
            {stats?.totalNodes ?? '—'}
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
            {stats?.onlineNodes ?? '—'}
          </div>
          <div className="text-[11px] text-emerald-300/80">
            {lang === 'vi' ? 'Heartbeat 4 giây (Chỉ đọc)' : '4s Heartbeat (Read-Only Status)'}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
          <div className="flex items-center justify-between text-white/50 text-xs font-heading">
            <span>{lang === 'vi' ? 'Tổng số Tổ chức' : 'Total Organizations'}</span>
            <Building2 className="w-4 h-4 text-blue-400" />
          </div>
          <div className="font-heading font-extrabold text-2xl text-white">
            {stats?.totalOrgs ?? '—'}
          </div>
          <div className="text-[11px] text-white/40">
            {lang === 'vi' ? 'Cơ quan, Trường học, KCN' : 'Agencies, schools, industrial parks'}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
          <div className="flex items-center justify-between text-white/50 text-xs font-heading">
            <span>{lang === 'vi' ? 'AQI Trung bình Nodes' : 'Average Node AQI'}</span>
            <Activity className="w-4 h-4 text-amber-400" />
          </div>
          <div className="font-heading font-extrabold text-2xl text-amber-300">
            {stats?.avgAqi ?? '—'}
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
                {lang === 'vi' ? 'Danh sách Trạm Quan trắc (Sơ bộ)' : 'Monitoring Stations (Preview)'}
              </h3>
              <p className="text-[11px] text-white/50">{lang === 'vi' ? 'Bấm vào bất kỳ dòng nào để mở Pop-up chi tiết telemetry' : 'Select a row to open detailed telemetry'}</p>
            </div>
            <button
              onClick={() => navigate('/admin/nodes')}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 font-heading"
            >
              {lang === 'vi' ? 'Quản lý chi tiết' : 'Manage details'} <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-body">
              <thead>
                <tr className="border-b border-white/10 text-white/40 font-heading font-semibold">
                  <th className="pb-3 pl-1">{lang === 'vi' ? 'Tên Node / Chip ID' : 'Node Name / Chip ID'}</th>
                  <th className="pb-3">{lang === 'vi' ? 'Phiên bản Hardware' : 'Hardware Edition'}</th>
                  <th className="pb-3">{lang === 'vi' ? 'Tổ chức gán' : 'Assigned Organization'}</th>
                  <th className="pb-3">{lang === 'vi' ? 'Trạng thái' : 'Status'}</th>
                  <th className="pb-3">AQI / PM2.5</th>
                  <th className="pb-3 text-right pr-1">{lang === 'vi' ? 'Thao tác' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {nodes.map((node) => {
                  const isOnline = node.status === 'online';
                  const isWarning = node.status === 'warning';
                  const isOutdoor = node.edition_type === 'outdoor' || node.edition === 'outdoor_solar';
                  const aqiColor =
                    node.aqi == null ? 'text-slate-400 bg-slate-500/10 border-slate-500/30' : node.aqi <= 50
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
                            <div>{localizeDemoText(node.name, lang)}</div>
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
                            {lang === 'vi' ? 'Chưa gán (Tự do)' : 'Unassigned'}
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
                            AQI {node.aqi ?? '—'}
                          </span>
                          <span className="text-white/50 text-[11px]">{node.pm25} µg/m³</span>
                        </div>
                      </td>
                      <td className="py-3 text-right pr-1">
                        <span className="text-[11px] font-heading font-semibold text-cyan-400 group-hover:text-cyan-300 inline-flex items-center gap-1">
                          {lang === 'vi' ? 'Chi tiết' : 'Details'} <ChevronRight className="w-3.5 h-3.5" />
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
              {lang === 'vi' ? 'Phiên bản 1' : 'Edition 1'}: Outdoor Solar Edition
            </h4>
            <p className="text-xs text-white/60 leading-relaxed">
              {lang === 'vi' ? <>Trang bị vi điều khiển <strong>ESP32-S3 + Anten râu 8dBi</strong>, Cảm biến bụi Laser <strong>Winsen ZH03B</strong>, Nhiệt/Ẩm Sensirion SHT30, Tia UV UVM-30A, Khí độc điện hóa Winsen ZE12A.</> : <>Equipped with an <strong>ESP32-S3 + 8dBi external antenna</strong>, <strong>Winsen ZH03B</strong> laser particulate sensor, Sensirion SHT30 temperature/humidity, UVM-30A UV, and Winsen ZE12A electrochemical gas sensor.</>}
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-3">
            <h4 className="font-heading font-bold text-sm text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-400" />
              {lang === 'vi' ? 'Phiên bản 2' : 'Edition 2'}: Indoor Campus Grid Edition
            </h4>
            <p className="text-xs text-white/60 leading-relaxed">
              {lang === 'vi' ? <>Chạy nguồn điện lưới 220V (Adapter 5V/2A Type-C) 24/7. Tích hợp bổ sung Cảm biến khí CO2 NDIR <strong>Winsen MH-Z19C</strong> và VOCs <strong>Sensirion SGP40</strong>.</> : <>Runs continuously from 220V mains power (5V/2A Type-C adapter), with a <strong>Winsen MH-Z19C</strong> NDIR CO2 sensor and <strong>Sensirion SGP40</strong> VOC sensor.</>}
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
                <Activity className="w-4 h-4" /> {lang === 'vi' ? 'Telemetry Môi trường Realtime' : 'Real-time Environmental Telemetry'}
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
                  <span className="text-white/50 text-[10px]">{lang === 'vi' ? 'Bụi PM2.5' : 'PM2.5'}</span>
                  <div className="font-heading font-bold text-base text-white">{selectedNode.pm25 == null ? '—' : `${selectedNode.pm25} µg/m³`}</div>
                </div>

                <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
                  <span className="text-white/50 text-[10px]">{lang === 'vi' ? 'Bụi PM10' : 'PM10'}</span>
                  <div className="font-heading font-bold text-base text-white">{selectedNode.pm10 == null ? '—' : `${selectedNode.pm10} µg/m³`}</div>
                </div>

                <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
                  <span className="text-white/50 text-[10px]">{lang === 'vi' ? 'Chỉ số AQI' : 'AQI Index'}</span>
                  <div className="font-heading font-bold text-base text-amber-300">AQI {selectedNode.aqi ?? '—'}</div>
                </div>

                <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
                  <span className="text-white/50 text-[10px]">{lang === 'vi' ? 'Nhiệt / Ẩm' : 'Temperature / Humidity'}</span>
                  <div className="font-heading font-bold text-base text-white">{selectedNode.temperature == null ? '—' : `${selectedNode.temperature}°C`} · {selectedNode.humidity == null ? '—' : `${selectedNode.humidity}%`}</div>
                </div>

                <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
                  <span className="text-white/50 text-[10px]">CO2</span>
                  <div className="font-heading font-bold text-base text-cyan-300">{selectedNode.co2 == null ? '—' : `${selectedNode.co2} ppm`}</div>
                </div>

                <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
                  <span className="text-white/50 text-[10px]">Sensirion SGP40 VOCs</span>
                  <div className="font-heading font-bold text-base text-amber-400">{selectedNode.voc_index ?? '—'}</div>
                </div>

                <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
                  <span className="text-white/50 text-[10px]">{lang === 'vi' ? 'Tia UV' : 'UV'} (LTR-390)</span>
                  <div className="font-heading font-bold text-base text-purple-400">UV Index {selectedNode.uv_index ?? '—'}</div>
                </div>

                <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
                  <span className="text-white/50 text-[10px]">{lang === 'vi' ? 'Pin & Tín hiệu' : 'Battery & Signal'}</span>
                  <div className="font-heading font-bold text-sm text-emerald-400">🔋 {selectedNode.battery == null ? '—' : `${selectedNode.battery}%`} · {selectedNode.rssi == null ? '—' : `${selectedNode.rssi} dBm`}</div>
                </div>
              </div>
            </div>

            {/* Grid 2: Hardware BOM specs */}
            <div className="space-y-2 pt-2 border-t border-white/10">
              <h4 className="font-heading font-bold text-xs uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                <Zap className="w-4 h-4" /> {lang === 'vi' ? 'Danh mục Cảm biến & Linh kiện Phần cứng' : 'Sensor & Hardware Components'}
              </h4>
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-white/10 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-white/60">{lang === 'vi' ? 'Vi điều khiển MCU' : 'MCU'}:</span>
                  <span className="font-mono text-cyan-300 font-semibold">{selectedNode.mcu || 'ESP32-S3 (Anten IPEX 8dBi)'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/60">{lang === 'vi' ? 'Khối Nguồn cấp điện' : 'Power supply'}:</span>
                  <span className="font-mono text-emerald-300 text-[11px]">{selectedNode.power_source || 'Solar Panel 5V/6W + 2x 18650 Pin 5200mAh'}</span>
                </div>
                <div className="space-y-1 pt-1">
                  <span className="text-white/60 block">{lang === 'vi' ? 'Cảm biến tích hợp' : 'Integrated sensors'}:</span>
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
                {lang === 'vi' ? 'Đến Trang Quản lý Nodes' : 'Open Node Management'} <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
