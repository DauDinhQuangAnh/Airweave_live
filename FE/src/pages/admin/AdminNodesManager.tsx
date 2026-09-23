import { useState, useEffect, useMemo } from 'react';
import {
  Cpu,
  Plus,
  Building2,
  MapPin,
  Wifi,
  Wrench,
  X,
  Sparkles,
  ShieldAlert,
  Battery,
  Radio,
  Search,
  SlidersHorizontal,
  Info,
  RefreshCw,
  Zap,
  Activity,
  ChevronRight,
  AlertCircle,
  Sun,
  ShieldCheck,
} from 'lucide-react';
import { useAppLang } from '@/hooks/use-app-lang';
import { localizeDemoText } from '@/lib/localize-demo';

import { nodesApi } from '@/integrations/api';
import { toast } from 'sonner';
import { isDemoMode } from '@/lib/demo/demo-mode';

export default function AdminNodesManager() {
  const lang = useAppLang();
  const [nodes, setNodes] = useState<any[]>([]);
  const [orgs, setOrgs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Search & Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [orgFilter, setOrgFilter] = useState<string>('all');
  const [editionFilter, setEditionFilter] = useState<string>('all');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedNode, setSelectedNode] = useState<any | null>(null);

  // Form state for creating Node
  const [chipId, setChipId] = useState('');
  const [name, setName] = useState('');
  const [locationName, setLocationName] = useState('');
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [editionType, setEditionType] = useState('outdoor');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchData = async () => {
    try {
      const [nData, oData] = await Promise.all([nodesApi.listNodes(), nodesApi.listOrganizations()]);
      if (Array.isArray(nData) && (!isDemoMode() || nData.length)) setNodes(nData);
      if (Array.isArray(oData) && (!isDemoMode() || oData.length)) setOrgs(oData);
      setError(false);
    } catch {
      if (!isDemoMode()) setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered nodes logic
  const filteredNodes = useMemo(() => {
    return nodes.filter((n) => {
      const matchesSearch =
        n.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        n.chip_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (n.location_name && n.location_name.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesStatus =
        statusFilter === 'all' || n.status.toLowerCase() === statusFilter.toLowerCase();

      const matchesOrg =
        orgFilter === 'all'
          ? true
          : orgFilter === 'unassigned'
          ? !n.organization_id && !n.organization_name
          : n.organization_id === orgFilter || n.organization_name === orgFilter;

      const matchesEdition =
        editionFilter === 'all' ||
        n.edition_type === editionFilter ||
        (editionFilter === 'outdoor' && n.edition === 'outdoor_solar') ||
        (editionFilter === 'indoor' && n.edition === 'indoor_grid');

      return matchesSearch && matchesStatus && matchesOrg && matchesEdition;
    });
  }, [nodes, searchTerm, statusFilter, orgFilter, editionFilter]);

  const handleCreateNode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chipId || !name) return;
    const nodeLat = Number(lat);
    const nodeLng = Number(lng);
    if (!lat.trim() || !lng.trim() || !Number.isFinite(nodeLat) || !Number.isFinite(nodeLng) || Math.abs(nodeLat) > 90 || Math.abs(nodeLng) > 180) {
      toast.error(lang === 'vi' ? 'Hãy nhập tọa độ thật, hợp lệ cho node.' : 'Enter valid, real coordinates for this node.');
      return;
    }

    setCreating(true);
    try {
      const created = await nodesApi
        .createNode({
          chip_id: chipId,
          name,
          location_name: locationName || 'Khu vực chính',
          organization_id: selectedOrgId || undefined,
          lat: nodeLat,
          lng: nodeLng,
          edition: editionType === 'indoor' ? 'indoor_grid' : 'outdoor_solar',
        });
      setNodes((prev) => [created, ...prev]);
      toast.success(lang === 'vi' ? `Đã đăng ký IoT Node "${name}".` : `IoT node "${name}" registered.`);
      setShowAddModal(false);
      setChipId('');
      setName('');
      setLocationName('');
    } catch (err) {
      toast.error('Không thể tạo node: ' + (err as Error).message);
    } finally {
      setCreating(false);
    }
  };

  const handleAssignOrg = async (nodeId: string, orgId: string) => {
    try {
      await nodesApi.assignNodeToOrg(nodeId, orgId);
      const orgObj = orgs.find((o) => o.id === orgId);
      setNodes((prev) =>
        prev.map((n) =>
          n.id === nodeId
            ? {
                ...n,
                organization_id: orgId || null,
                organization_name: orgObj?.name || null,
              }
            : n
        )
      );
      if (selectedNode && selectedNode.id === nodeId) {
        setSelectedNode((prev: any) => ({
          ...prev,
          organization_id: orgId || null,
          organization_name: orgObj?.name || null,
        }));
      }
      toast.success('Đã gán lại Tổ chức sở hữu cho Trạm!');
    } catch (err) {
      toast.error('Không thể gán tổ chức cho trạm. Vui lòng kiểm tra quyền và thử lại.');
    }
  };

  const handleSendRemoteCommand = (command: string) => {
    toast.info(`Lệnh "${command}" chưa được kết nối với thiết bị. Không có lệnh nào được gửi.`);
  };

  if (loading) return <div className="p-6 text-white/70">{lang === 'vi' ? 'Đang tải danh sách trạm...' : 'Loading station list...'}</div>;
  if (error) return <div className="p-6 text-amber-300" role="alert">{lang === 'vi' ? 'Không thể tải trạm và tổ chức. Vui lòng kiểm tra quyền quản trị và kết nối máy chủ.' : 'Unable to load stations and organizations. Check administrator access and the server connection.'}</div>;

  return (
    <div className="space-y-6">
      {/* Mock Data Notice */}
      <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-heading font-semibold">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
          <span>
            📌 <strong>{lang === 'vi' ? '[QUẢN LÝ THIẾT BỊ HARDWARE SPEC 2.0]' : '[HARDWARE SPEC 2.0 DEVICE MANAGEMENT]'}</strong> — {lang === 'vi' ? 'Chuẩn hóa 2 phiên bản: ☀️ Outdoor Solar Edition (Pin Solar 18650) & 🔌 Indoor Campus Grid Edition (Adapter 5V Type-C).' : 'Two standardized editions: ☀️ Outdoor Solar Edition (18650 solar battery) and 🔌 Indoor Campus Grid Edition (5V Type-C adapter).'}
          </span>
        </div>
        <span className="hidden sm:inline-block px-2 py-0.5 rounded bg-amber-500/20 text-[10px] font-bold text-amber-200">
          HARDWARE SPEC 2.0
        </span>
      </div>

      {/* Top Controls Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-heading text-lg font-bold text-white flex items-center gap-2">
            <Cpu className="w-5 h-5 text-cyan-400" />
            {lang === 'vi' ? 'Quản lý Mạng lưới IoT Nodes' : 'IoT Node Network Management'} ({filteredNodes.length}/{nodes.length})
          </h2>
          <p className="text-xs text-white/60">
            {lang === 'vi' ? 'Tìm kiếm, lọc phiên bản Outdoor/Indoor và bấm mở Pop-up chi tiết linh kiện BOM & cảm biến.' : 'Search and filter Outdoor/Indoor editions, then inspect sensor and BOM details.'}
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-slate-950 font-heading text-xs font-bold flex items-center gap-2 shadow-lg shadow-cyan-500/20 transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          {lang === 'vi' ? 'Đăng ký IoT Node Mới' : 'Register New IoT Node'}
        </button>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col md:flex-row items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={lang === 'vi' ? 'Tìm theo Tên trạm, Chip ID (AWNODE-HN01)...' : 'Search station name or Chip ID (AWNODE-HN01)...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900/80 border border-white/10 text-xs text-white placeholder:text-white/40 focus:outline-none focus:border-cyan-400 font-body"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Edition Filter */}
        <div className="w-full md:w-44 shrink-0">
          <select
            value={editionFilter}
            onChange={(e) => setEditionFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-amber-300 font-heading focus:outline-none"
          >
            <option value="all">-- {lang === 'vi' ? 'Tất cả Phiên bản' : 'All Editions'} --</option>
            <option value="outdoor">☀️ Outdoor Solar</option>
            <option value="indoor">🔌 Indoor Grid</option>
          </select>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto shrink-0">
          <SlidersHorizontal className="w-4 h-4 text-cyan-400 shrink-0 hidden sm:inline-block" />
          <div className="flex gap-1.5 bg-slate-900/60 p-1 rounded-xl border border-white/10 text-xs font-heading">
            {[
              { key: 'all', label: lang === 'vi' ? 'Tất cả' : 'All' },
              { key: 'online', label: 'Online' },
              { key: 'warning', label: lang === 'vi' ? 'Cảnh báo' : 'Warning' },
              { key: 'offline', label: 'Offline' },
            ].map((st) => (
              <button
                key={st.key}
                onClick={() => setStatusFilter(st.key)}
                className={`px-3 py-1 rounded-lg transition-all text-xs font-semibold ${
                  statusFilter === st.key
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>

        {/* Org Filter */}
        <div className="w-full md:w-48 shrink-0">
          <select
            value={orgFilter}
            onChange={(e) => setOrgFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-cyan-300 font-heading focus:outline-none"
          >
            <option value="all">-- {lang === 'vi' ? 'Tất cả Tổ chức' : 'All Organizations'} --</option>
            <option value="unassigned">⚠️ {lang === 'vi' ? 'Trụ tự do (Chưa gán)' : 'Unassigned Node'}</option>
            {orgs.map((o) => (
              <option key={o.id} value={o.id}>
                🏢 {o.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Clean Summary Cards Grid (No heavy details upfront) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredNodes.map((node) => {
          const isOnline = node.status === 'online';
          const isWarning = node.status === 'warning';
          const isUnassigned = !node.organization_id && !node.organization_name;
          const isOutdoor = node.edition_type === 'outdoor' || node.edition === 'outdoor_solar';
          const aqiColor =
            node.aqi == null ? 'text-slate-400 bg-slate-500/10 border-slate-500/30' : node.aqi <= 50
              ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
              : node.aqi <= 100
              ? 'text-amber-400 bg-amber-500/10 border-amber-500/30'
              : 'text-rose-400 bg-rose-500/10 border-rose-500/30';

          return (
            <div
              key={node.id || node.chip_id}
              onClick={() => setSelectedNode(node)}
              className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-cyan-400/50 hover:bg-white/[0.07] transition-all cursor-pointer space-y-3 group relative shadow-lg"
            >
              {/* Header: Name + Chip ID + Status */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-heading font-bold text-sm text-white group-hover:text-cyan-300 transition-colors truncate">
                      {localizeDemoText(node.name, lang)}
                    </h3>
                  </div>
                  <div className="text-[10px] text-cyan-400 font-mono mt-0.5 flex items-center gap-1">
                    <Radio className="w-3 h-3 text-cyan-400 shrink-0" />
                    {node.chip_id}
                  </div>
                </div>

                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase shrink-0 ${
                    isOnline
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40'
                      : isWarning
                      ? 'bg-rose-500/15 text-rose-400 border-rose-500/40 animate-pulse'
                      : 'bg-amber-500/15 text-amber-400 border-amber-500/40'
                  }`}
                >
                  {isOnline ? <Wifi className="w-3 h-3" /> : isWarning ? <ShieldAlert className="w-3 h-3" /> : <Wrench className="w-3 h-3" />}
                  {node.status}
                </span>
              </div>

              {/* Sơ bộ: Phiên bản + Vị trí + Tổ chức + AQI tóm tắt */}
              <div className="space-y-1.5 text-xs text-white/70 font-body">
                <div className="flex items-center gap-1.5">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${isOutdoor ? 'bg-amber-500/15 text-amber-300 border-amber-500/30' : 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'}`}>
                    {isOutdoor ? '☀️ Outdoor Solar' : '🔌 Indoor Campus Grid'}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-white/60">
                  <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span className="truncate">{localizeDemoText(node.location_name, lang) || (lang === 'vi' ? 'Vị trí trạm' : 'Station location')}</span>
                </div>

                <div className="flex items-center gap-1.5 text-white/60">
                  <Building2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  {isUnassigned ? (
                    <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-semibold flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 text-amber-400" />
                      {lang === 'vi' ? 'Chưa gán (Trụ tự do)' : 'Unassigned Node'}
                    </span>
                  ) : (
                    <span className="truncate text-white/90 font-medium">
                      {node.organization_name}
                    </span>
                  )}
                </div>
              </div>

              {/* Footer row: Quick AQI chip + Click to view popup */}
              <div className="pt-2.5 border-t border-white/10 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded font-bold border text-xs font-heading ${aqiColor}`}>
                    AQI {node.aqi ?? '—'}
                  </span>
                  <span className="text-[11px] text-white/50">{node.pm25} µg/m³</span>
                </div>

                <span className="text-[11px] font-heading font-semibold text-cyan-400 group-hover:text-cyan-300 flex items-center gap-1">
                  {lang === 'vi' ? 'Chi tiết hardware' : 'Hardware details'} <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {filteredNodes.length === 0 && (
        <div className="p-8 text-center rounded-2xl bg-white/5 border border-white/10 space-y-2 text-white/50 text-sm">
          <Info className="w-6 h-6 text-cyan-400 mx-auto" />
          <p>{lang === 'vi' ? 'Không tìm thấy IoT Node nào phù hợp với bộ lọc.' : 'No IoT nodes match the current filters.'}</p>
        </div>
      )}

      {/* POP-UP MODAL: Chi tiết Thông số Kỹ thuật Chuẩn & Linh kiện BOM */}
      {selectedNode && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedNode(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl rounded-2xl bg-slate-900 border border-cyan-500/40 p-6 shadow-2xl space-y-5 relative max-h-[90vh] overflow-y-auto font-body cursor-default"
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

            {/* Grid 1: Các chỉ số telemetry kỹ thuật chi tiết */}
            <div className="space-y-2">
              <h4 className="font-heading font-bold text-xs uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                <Activity className="w-4 h-4" /> {lang === 'vi' ? 'Telemetry Môi trường Realtime' : 'Real-time Environmental Telemetry'}
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
                  <span className="text-white/50 text-[10px]">Bụi ZH03B Laser PM2.5</span>
                  <div className="font-heading font-bold text-base text-white">{selectedNode.pm25 == null ? '—' : `${selectedNode.pm25} µg/m³`}</div>
                </div>

                <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
                  <span className="text-white/50 text-[10px]">Bụi PM10</span>
                  <div className="font-heading font-bold text-base text-white">{selectedNode.pm10 == null ? '—' : `${selectedNode.pm10} µg/m³`}</div>
                </div>

                <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
                  <span className="text-white/50 text-[10px]">Chỉ số AQI</span>
                  <div className="font-heading font-bold text-base text-amber-300">AQI {selectedNode.aqi ?? '—'}</div>
                </div>

                <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
                  <span className="text-white/50 text-[10px]">Sensirion SHT30 Nhiệt/Ẩm</span>
                  <div className="font-heading font-bold text-base text-white">{selectedNode.temperature == null ? '—' : `${selectedNode.temperature}°C`} · {selectedNode.humidity == null ? '—' : `${selectedNode.humidity}%`}</div>
                </div>

                <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
                  <span className="text-white/50 text-[10px]">Khí độc ZE12A (CO/NO2/SO2/O3)</span>
                  <div className="font-heading font-bold text-base text-cyan-300">{selectedNode.co2 == null ? '—' : `${selectedNode.co2} ppm`}</div>
                </div>

                <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
                  <span className="text-white/50 text-[10px]">Sensirion SGP40 VOCs</span>
                  <div className="font-heading font-bold text-base text-amber-400">{selectedNode.voc_index ?? '—'}</div>
                </div>

                <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
                  <span className="text-white/50 text-[10px]">Cường độ UV (LTR-390/UVM-30A)</span>
                  <div className="font-heading font-bold text-base text-purple-400">UV Index {selectedNode.uv_index ?? '—'}</div>
                </div>

                <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
                  <span className="text-white/50 text-[10px]">Pin & Tín hiệu Sóng</span>
                  <div className="font-heading font-bold text-sm text-emerald-400">🔋 {selectedNode.battery == null ? '—' : `${selectedNode.battery}%`} · {selectedNode.rssi == null ? '—' : `${selectedNode.rssi} dBm`}</div>
                </div>
              </div>
            </div>

            {/* Grid 2: Thông tin Linh kiện Phần cứng chuẩn BOM (IOT_NODE_HARDWARE_SPECIFICATION.md) */}
            <div className="space-y-2 pt-2 border-t border-white/10">
              <h4 className="font-heading font-bold text-xs uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                <Zap className="w-4 h-4" /> {lang === 'vi' ? 'Danh mục Linh kiện Phần cứng BOM' : 'Hardware BOM Components'}
              </h4>
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-white/10 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-white/60">MCU Vi điều khiển:</span>
                  <span className="font-mono text-cyan-300 font-semibold">{selectedNode.mcu || 'ESP32-S3 (Anten IPEX 8dBi)'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/60">Khối Nguồn cấp điện:</span>
                  <span className="font-mono text-emerald-300 text-[11px]">{selectedNode.power_source || 'Solar Panel 5V/6W + 2x 18650 Pin 5200mAh'}</span>
                </div>
                <div className="space-y-1 pt-1">
                  <span className="text-white/60 block">Mô-đun Cảm biến tích hợp:</span>
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

            {/* Grid 3: Gán Tổ chức & Điều khiển Từ xa */}
            <div className="space-y-3 pt-2 border-t border-white/10">
              <div className="flex items-center justify-between">
                <label className="font-heading font-bold text-xs text-white flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-cyan-400" />
                  {lang === 'vi' ? 'Gán Tổ chức / Doanh nghiệp Quản lý' : 'Assign Managing Organization'}:
                </label>
                <select
                  value={selectedNode.organization_id || ''}
                  onChange={(e) => handleAssignOrg(selectedNode.id, e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 border border-white/15 text-xs text-cyan-300 font-heading focus:outline-none"
                >
                  <option value="">-- {lang === 'vi' ? 'Trụ tự do (Chưa gán)' : 'Unassigned Node'} --</option>
                  {orgs.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Action Remote Commands */}
              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  onClick={() => handleSendRemoteCommand('Remote Reboot')}
                  className="flex-1 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-heading font-semibold text-xs flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
                  {lang === 'vi' ? 'Khởi động lại' : 'Reboot'}
                </button>
                <button
                  onClick={() => handleSendRemoteCommand('Deep Sleep Mode')}
                  className="flex-1 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-heading font-semibold text-xs flex items-center justify-center gap-1.5"
                >
                  <Battery className="w-3.5 h-3.5 text-amber-400" />
                  {lang === 'vi' ? 'Chế độ Deep Sleep' : 'Deep Sleep Mode'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Add Node */}
      {showAddModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAddModal(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl bg-slate-900 border border-white/20 p-6 shadow-2xl space-y-4 relative font-body cursor-default"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-heading font-bold text-base text-white flex items-center gap-2">
                <Cpu className="w-5 h-5 text-cyan-400" />
                {lang === 'vi' ? 'Đăng ký IoT Node Mới' : 'Register New IoT Node'}
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-white/50 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNode} className="space-y-3 text-xs font-body">
              <div>
                <label className="block text-white/70 mb-1 font-heading font-semibold">
                  {lang === 'vi' ? 'Mã Hardware Chip ID' : 'Hardware Chip ID'} *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: AWNODE-HN03"
                  value={chipId}
                  onChange={(e) => setChipId(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 font-mono focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-white/70 mb-1 font-heading font-semibold">
                  {lang === 'vi' ? 'Tên gợi nhớ Trạm đo' : 'Station Display Name'} *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Trạm Đống Đa - Thái Hà"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-white/70 mb-1 font-heading font-semibold">
                  {lang === 'vi' ? 'Phiên bản Phần cứng' : 'Hardware Edition'}
                </label>
                <select
                  value={editionType}
                  onChange={(e) => setEditionType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-amber-300 focus:outline-none"
                >
                  <option value="outdoor">☀️ Outdoor Solar Edition (Pin Solar 18650)</option>
                  <option value="indoor">🔌 Indoor Campus Grid Edition (Adapter 5V Type-C)</option>
                </select>
              </div>

              <div>
                <label className="block text-white/70 mb-1 font-heading font-semibold">
                  {lang === 'vi' ? 'Tổ chức sở hữu (Tùy chọn)' : 'Owning Organization (Optional)'}
                </label>
                <select
                  value={selectedOrgId}
                  onChange={(e) => setSelectedOrgId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white focus:outline-none focus:border-cyan-400"
                >
                  <option value="">-- {lang === 'vi' ? 'Chưa gán (Trụ tự do)' : 'Unassigned Node'} --</option>
                  {orgs.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-white/70 mb-1 font-heading font-semibold">
                    Vĩ độ (Latitude)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={lat}
                    onChange={(e) => setLat(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white font-mono focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="block text-white/70 mb-1 font-heading font-semibold">
                    Kinh độ (Longitude)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={lng}
                    onChange={(e) => setLng(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white font-mono focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white font-heading font-semibold"
                >
                  {lang === 'vi' ? 'Hủy' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-heading font-bold"
                >
                  {creating ? (lang === 'vi' ? 'Đang tạo...' : 'Creating...') : (lang === 'vi' ? 'Xác nhận Đăng ký' : 'Confirm Registration')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
