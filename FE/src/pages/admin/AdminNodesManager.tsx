import { useState, useEffect, useMemo } from 'react';
import {
  Cpu,
  Plus,
  Building2,
  MapPin,
  Wifi,
  Wrench,
  X,
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
} from 'lucide-react';

import { nodesApi } from '@/integrations/api';
import { toast } from 'sonner';
import { useAdminNodes, useAdminOrgs } from './_data/useAdminData';
import { normalizeNode } from './_data/normalize';
import { HARDWARE_SPEC } from './_data/hardware';
import type { AdminNode, NodeEdition, NodeStatus } from './_data/types';
import AdminDataBanner from '@/components/admin/AdminDataBanner';

function statusStyle(status: NodeStatus) {
  if (status === 'online') return { pill: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40', Icon: Wifi };
  if (status === 'maintenance') return { pill: 'bg-amber-500/15 text-amber-400 border-amber-500/40 animate-pulse', Icon: Wrench };
  return { pill: 'bg-rose-500/15 text-rose-400 border-rose-500/40', Icon: ShieldAlert };
}

function aqiStyle(aqi: number | null) {
  if (aqi == null) return 'text-white/50 bg-white/5 border-white/10';
  if (aqi <= 50) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
  if (aqi <= 100) return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
  return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
}

export default function AdminNodesManager() {
  const nodesQuery = useAdminNodes();
  const orgsQuery = useAdminOrgs();

  const [nodes, setNodes] = useState<AdminNode[]>(nodesQuery.data);
  useEffect(() => setNodes(nodesQuery.data), [nodesQuery.data]);
  const orgs = orgsQuery.data;

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [orgFilter, setOrgFilter] = useState<string>('all');
  const [editionFilter, setEditionFilter] = useState<string>('all');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedNode, setSelectedNode] = useState<AdminNode | null>(null);

  // Form
  const [chipId, setChipId] = useState('');
  const [name, setName] = useState('');
  const [locationName, setLocationName] = useState('');
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [editionType, setEditionType] = useState<NodeEdition>('outdoor');
  const [lat, setLat] = useState('21.0285');
  const [lng, setLng] = useState('105.8542');
  const [creating, setCreating] = useState(false);

  const filteredNodes = useMemo(() => {
    return nodes.filter((n) => {
      const matchesSearch =
        n.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        n.chip_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (n.location_name && n.location_name.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesStatus = statusFilter === 'all' || n.status === statusFilter;

      const matchesOrg =
        orgFilter === 'all'
          ? true
          : orgFilter === 'unassigned'
          ? !n.organization_id
          : n.organization_id === orgFilter;

      const matchesEdition = editionFilter === 'all' || n.edition === editionFilter;

      return matchesSearch && matchesStatus && matchesOrg && matchesEdition;
    });
  }, [nodes, searchTerm, statusFilter, orgFilter, editionFilter]);

  const handleCreateNode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chipId || !name) return;

    setCreating(true);
    try {
      const spec = HARDWARE_SPEC[editionType];
      const orgObj = orgs.find((o) => o.id === selectedOrgId);

      if (nodesQuery.mode === 'live') {
        const created = await nodesApi
          .createNode({
            chip_id: chipId,
            name,
            location_name: locationName || 'Khu vực chính',
            organization_id: selectedOrgId || undefined,
            lat: parseFloat(lat) || 21.0285,
            lng: parseFloat(lng) || 105.8542,
            // BE chưa nhận `edition`; truyền hardware_ver để normalize suy ra phiên bản.
            hardware_ver: spec.hardwareVer,
          })
          .catch(() => null);
        if (created) {
          setNodes((prev) => [normalizeNode(created), ...prev]);
          toast.success(`Đã đăng ký IoT Node "${name}" (LIVE)!`);
        } else {
          toast.error('LIVE: Không tạo được node (kiểm tra API / Chip ID trùng / quyền admin).');
          return;
        }
      } else {
        const localNode: AdminNode = {
          id: `node-${Date.now()}`,
          chip_id: chipId,
          name,
          edition: editionType,
          editionLabel: spec.label,
          editionShortLabel: spec.shortLabel,
          location_name: locationName || 'Khu vực chính',
          organization_id: selectedOrgId || null,
          organization_name: orgObj?.name || null,
          status: 'online',
          aqi: 35,
          pm25: 14,
          pm10: 24,
          temperature: 30,
          humidity: 70,
          co2: editionType === 'indoor' ? 480 : null,
          voc_index: editionType === 'indoor' ? 60 : null,
          uv_index: editionType === 'outdoor' ? 6.5 : null,
          battery: editionType === 'outdoor' ? 98 : 100,
          rssi: -55,
          mcu: spec.mcu,
          power_source: spec.powerSource,
          sensors: [...spec.sensors],
          hardware_ver: spec.hardwareVer,
          lat: parseFloat(lat) || 21.0285,
          lng: parseFloat(lng) || 105.8542,
          last_reading_at: null,
        };
        setNodes((prev) => [localNode, ...prev]);
        toast.success(`Đã thêm IoT Node "${name}" (Demo cục bộ)!`);
      }

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
      const orgObj = orgs.find((o) => o.id === orgId);
      if (nodesQuery.mode === 'live') {
        await nodesApi.assignNodeToOrg(nodeId, orgId).catch(() => null);
      }
      const patch = { organization_id: orgId || null, organization_name: orgObj?.name || null };
      setNodes((prev) => prev.map((n) => (n.id === nodeId ? { ...n, ...patch } : n)));
      if (selectedNode && selectedNode.id === nodeId) {
        setSelectedNode((prev) => (prev ? { ...prev, ...patch } : prev));
      }
      toast.success('Đã gán lại Tổ chức sở hữu cho Trạm!');
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendRemoteCommand = (command: string) => {
    if (nodesQuery.mode === 'live') {
      toast.info(`LIVE: Kênh điều khiển từ xa (MQTT downlink) chưa được nối. Lệnh "${command}" chưa gửi.`);
    } else {
      toast.success(`[Demo] Đã mô phỏng gửi lệnh "${command}" tới trạm ${selectedNode?.chip_id}!`);
    }
  };

  return (
    <div className="space-y-6">
      <AdminDataBanner mode={nodesQuery.mode} connected={nodesQuery.connected} error={nodesQuery.error} loading={nodesQuery.loading} />

      {/* Top Controls Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-heading text-lg font-bold text-white flex items-center gap-2">
            <Cpu className="w-5 h-5 text-cyan-400" />
            Quản lý Mạng lưới IoT Nodes ({filteredNodes.length}/{nodes.length})
          </h2>
          <p className="text-xs text-white/60">
            Tìm kiếm, lọc phiên bản Outdoor/Indoor và bấm mở Pop-up chi tiết linh kiện BOM & cảm biến.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-slate-950 font-heading text-xs font-bold flex items-center gap-2 shadow-lg shadow-cyan-500/20 transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          Đăng ký IoT Node Mới
        </button>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo Tên trạm, Chip ID (AWNODE-HN01)..."
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

        <div className="w-full md:w-44 shrink-0">
          <select
            value={editionFilter}
            onChange={(e) => setEditionFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-amber-300 font-heading focus:outline-none"
          >
            <option value="all">-- Tất cả Phiên bản --</option>
            <option value="outdoor">☀️ Outdoor Solar</option>
            <option value="indoor">🔌 Indoor Grid</option>
          </select>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto shrink-0">
          <SlidersHorizontal className="w-4 h-4 text-cyan-400 shrink-0 hidden sm:inline-block" />
          <div className="flex gap-1.5 bg-slate-900/60 p-1 rounded-xl border border-white/10 text-xs font-heading">
            {[
              { key: 'all', label: 'Tất cả' },
              { key: 'online', label: 'Online' },
              { key: 'maintenance', label: 'Bảo trì' },
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

        <div className="w-full md:w-48 shrink-0">
          <select
            value={orgFilter}
            onChange={(e) => setOrgFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-cyan-300 font-heading focus:outline-none"
          >
            <option value="all">-- Tất cả Tổ chức --</option>
            <option value="unassigned">⚠️ Trụ tự do (Chưa gán)</option>
            {orgs.map((o) => (
              <option key={o.id} value={o.id}>
                🏢 {o.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Node Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredNodes.map((node) => {
          const st = statusStyle(node.status);
          const isUnassigned = !node.organization_id;
          const isOutdoor = node.edition === 'outdoor';

          return (
            <div
              key={node.id || node.chip_id}
              onClick={() => setSelectedNode(node)}
              className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-cyan-400/50 hover:bg-white/[0.07] transition-all cursor-pointer space-y-3 group relative shadow-lg"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-heading font-bold text-sm text-white group-hover:text-cyan-300 transition-colors truncate">
                      {node.name}
                    </h3>
                  </div>
                  <div className="text-[10px] text-cyan-400 font-mono mt-0.5 flex items-center gap-1">
                    <Radio className="w-3 h-3 text-cyan-400 shrink-0" />
                    {node.chip_id}
                  </div>
                </div>

                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase shrink-0 ${st.pill}`}>
                  <st.Icon className="w-3 h-3" />
                  {node.status}
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-white/70 font-body">
                <div className="flex items-center gap-1.5">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${isOutdoor ? 'bg-amber-500/15 text-amber-300 border-amber-500/30' : 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'}`}>
                    {node.editionShortLabel}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-white/60">
                  <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span className="truncate">{node.location_name}</span>
                </div>

                <div className="flex items-center gap-1.5 text-white/60">
                  <Building2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  {isUnassigned ? (
                    <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-semibold flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 text-amber-400" />
                      Chưa gán (Trụ tự do)
                    </span>
                  ) : (
                    <span className="truncate text-white/90 font-medium">{node.organization_name}</span>
                  )}
                </div>
              </div>

              <div className="pt-2.5 border-t border-white/10 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded font-bold border text-xs font-heading ${aqiStyle(node.aqi)}`}>
                    AQI {node.aqi ?? '—'}
                  </span>
                  <span className="text-[11px] text-white/50">{node.pm25 ?? '—'} µg/m³</span>
                </div>

                <span className="text-[11px] font-heading font-semibold text-cyan-400 group-hover:text-cyan-300 flex items-center gap-1">
                  Chi tiết hardware <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {filteredNodes.length === 0 && (
        <div className="p-8 text-center rounded-2xl bg-white/5 border border-white/10 space-y-2 text-white/50 text-sm">
          <Info className="w-6 h-6 text-cyan-400 mx-auto" />
          <p>Không tìm thấy IoT Node nào phù hợp với bộ lọc.</p>
        </div>
      )}

      {/* POP-UP MODAL: Chi tiết Node */}
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
            <div className="flex items-start justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Cpu className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-heading font-extrabold text-lg text-white">{selectedNode.name}</h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                      {selectedNode.chip_id}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {selectedNode.editionLabel}
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

            <div className="space-y-2">
              <h4 className="font-heading font-bold text-xs uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                <Activity className="w-4 h-4" /> Telemetry Môi trường Realtime
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
                  <span className="text-white/50 text-[10px]">Bụi ZH03B Laser PM2.5</span>
                  <div className="font-heading font-bold text-base text-white">{selectedNode.pm25 ?? '—'} µg/m³</div>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
                  <span className="text-white/50 text-[10px]">Bụi PM10</span>
                  <div className="font-heading font-bold text-base text-white">{selectedNode.pm10 ?? '—'} µg/m³</div>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
                  <span className="text-white/50 text-[10px]">Chỉ số AQI</span>
                  <div className="font-heading font-bold text-base text-amber-300">AQI {selectedNode.aqi ?? '—'}</div>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
                  <span className="text-white/50 text-[10px]">Sensirion SHT30 Nhiệt/Ẩm</span>
                  <div className="font-heading font-bold text-base text-white">{selectedNode.temperature ?? '—'}°C · {selectedNode.humidity ?? '—'}%</div>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
                  <span className="text-white/50 text-[10px]">Khí CO2 NDIR (Indoor)</span>
                  <div className="font-heading font-bold text-base text-cyan-300">{selectedNode.co2 ?? '—'} ppm</div>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
                  <span className="text-white/50 text-[10px]">Sensirion SGP40 VOCs</span>
                  <div className="font-heading font-bold text-base text-amber-400">{selectedNode.voc_index ?? '—'}</div>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
                  <span className="text-white/50 text-[10px]">Cường độ UV (Outdoor)</span>
                  <div className="font-heading font-bold text-base text-purple-400">UV {selectedNode.uv_index ?? '—'}</div>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
                  <span className="text-white/50 text-[10px]">Pin & Tín hiệu Sóng</span>
                  <div className="font-heading font-bold text-sm text-emerald-400">🔋 {selectedNode.battery}% · {selectedNode.rssi} dBm</div>
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-white/10">
              <h4 className="font-heading font-bold text-xs uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                <Zap className="w-4 h-4" /> Danh mục Linh kiện Phần cứng BOM (Hardware Spec)
              </h4>
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-white/10 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-white/60">MCU Vi điều khiển:</span>
                  <span className="font-mono text-cyan-300 font-semibold">{selectedNode.mcu}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/60">Khối Nguồn cấp điện:</span>
                  <span className="font-mono text-emerald-300 text-[11px]">{selectedNode.power_source}</span>
                </div>
                <div className="space-y-1 pt-1">
                  <span className="text-white/60 block">Mô-đun Cảm biến tích hợp:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedNode.sensors.map((s) => (
                      <span key={s} className="px-2 py-1 rounded bg-cyan-500/10 border border-cyan-500/30 text-[10px] text-cyan-300 font-semibold font-mono">
                        ✓ {s}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-2 border-t border-white/10">
              <div className="flex items-center justify-between">
                <label className="font-heading font-bold text-xs text-white flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-cyan-400" />
                  Gán Tổ chức / Doanh nghiệp Quản lý:
                </label>
                <select
                  value={selectedNode.organization_id || ''}
                  onChange={(e) => handleAssignOrg(selectedNode.id, e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 border border-white/15 text-xs text-cyan-300 font-heading focus:outline-none"
                >
                  <option value="">-- Trụ tự do (Chưa gán) --</option>
                  {orgs.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  onClick={() => handleSendRemoteCommand('Remote Reboot')}
                  className="flex-1 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-heading font-semibold text-xs flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
                  Khởi động lại (Reboot)
                </button>
                <button
                  onClick={() => handleSendRemoteCommand('Deep Sleep Mode')}
                  className="flex-1 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-heading font-semibold text-xs flex items-center justify-center gap-1.5"
                >
                  <Battery className="w-3.5 h-3.5 text-amber-400" />
                  Chế độ Deep Sleep
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
                Đăng ký IoT Node Mới
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-white/50 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNode} className="space-y-3 text-xs font-body">
              <div>
                <label className="block text-white/70 mb-1 font-heading font-semibold">Mã Hardware Chip ID *</label>
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
                <label className="block text-white/70 mb-1 font-heading font-semibold">Tên gợi nhớ Trạm đo *</label>
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
                <label className="block text-white/70 mb-1 font-heading font-semibold">Phiên bản Phần cứng (Edition)</label>
                <select
                  value={editionType}
                  onChange={(e) => setEditionType(e.target.value as NodeEdition)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-amber-300 focus:outline-none"
                >
                  <option value="outdoor">☀️ Outdoor Solar Edition (Pin Solar 18650)</option>
                  <option value="indoor">🔌 Indoor Campus Grid Edition (Adapter 5V Type-C)</option>
                </select>
              </div>

              <div>
                <label className="block text-white/70 mb-1 font-heading font-semibold">Tổ chức sở hữu (Tùy chọn)</label>
                <select
                  value={selectedOrgId}
                  onChange={(e) => setSelectedOrgId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white focus:outline-none focus:border-cyan-400"
                >
                  <option value="">-- Chưa gán (Trụ tự do) --</option>
                  {orgs.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-white/70 mb-1 font-heading font-semibold">Vĩ độ (Latitude)</label>
                  <input
                    type="number"
                    step="any"
                    value={lat}
                    onChange={(e) => setLat(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white font-mono focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="block text-white/70 mb-1 font-heading font-semibold">Kinh độ (Longitude)</label>
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
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-heading font-bold"
                >
                  {creating ? 'Đang tạo...' : 'Xác nhận Đăng ký'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
