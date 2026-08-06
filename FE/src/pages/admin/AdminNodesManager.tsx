import { useState, useEffect } from 'react';
import {
  Cpu,
  Plus,
  Building2,
  MapPin,
  Wifi,
  Wrench,
  CheckCircle2,
  X,
  LineChart,
  Zap,
} from 'lucide-react';

import { nodesApi } from '@/integrations/api';

export default function AdminNodesManager() {
  const [nodes, setNodes] = useState<any[]>([]);
  const [orgs, setOrgs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedNodeDetails, setSelectedNodeDetails] = useState<any | null>(null);

  // Form state for creating Node
  const [chipId, setChipId] = useState('');
  const [name, setName] = useState('');
  const [locationName, setLocationName] = useState('');
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [lat, setLat] = useState('21.0285');
  const [lng, setLng] = useState('105.8542');
  const [creating, setCreating] = useState(false);

  const fetchData = async () => {
    try {
      const [nData, oData] = await Promise.all([
        nodesApi.listNodes(),
        nodesApi.listOrganizations(),
      ]);
      setNodes(nData);
      setOrgs(oData);
    } catch (e) {
      console.error('Failed to load nodes data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateNode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chipId || !name) return;

    setCreating(true);
    try {
      await nodesApi.createNode({
        chip_id: chipId,
        name,
        location_name: locationName || 'Khu vực chính',
        organization_id: selectedOrgId || undefined,
        lat: parseFloat(lat) || 21.0285,
        lng: parseFloat(lng) || 105.8542,
      });

      setShowAddModal(false);
      setChipId('');
      setName('');
      setLocationName('');
      fetchData();
    } catch (err) {
      alert('Không thể tạo node: ' + (err as Error).message);
    } finally {
      setCreating(false);
    }
  };

  const handleAssignOrg = async (nodeId: string, orgId: string) => {
    try {
      await nodesApi.assignNodeToOrg(nodeId, orgId);
      fetchData();
    } catch (err) {
      alert('Không thể gán tổ chức: ' + (err as Error).message);
    }
  };

  const handleSimulateAutoDiscover = async () => {
    const randomChipId = 'ESP32-AUTO-' + Math.floor(1000 + Math.random() * 9000);
    try {
      await nodesApi.autoDiscover({
        chip_id: randomChipId,
        hardware_ver: 'ESP32-ZeroTouch-v2',
        edition: Math.random() > 0.5 ? 'outdoor_solar' : 'indoor_grid',
      });
      alert(`✨ Đã nhận tín hiệu MQTT Auto-Discovery từ Node mới [${randomChipId}]! Node đã tự động thêm vào danh sách.`);
      fetchData();
    } catch (err) {
      alert('Lỗi auto discover: ' + (err as Error).message);
    }
  };


  const handleViewDetails = async (nodeId: string) => {
    try {
      const details = await nodesApi.getNodeDetails(nodeId);
      setSelectedNodeDetails(details);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-heading text-lg font-bold text-white flex items-center gap-2">
            <Cpu className="w-5 h-5 text-cyan-400" />
            Quản lý IoT Nodes Vật lý
          </h2>
          <p className="text-xs text-white/50">
            Khai báo chip_id ESP32, cấu hình tọa độ GPS và gán cho các Cơ quan/Trường học.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSimulateAutoDiscover}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/40 text-amber-300 hover:text-white font-heading font-semibold text-xs transition-all flex items-center gap-1.5 shadow-lg shadow-amber-500/10"
            title="Thợ kỹ thuật cắm nguồn ESP32 mới tinh lần đầu -> Node tự phát hiện chào mừng qua MQTT topic airweave/nodes/autodiscover"
          >
            <Zap className="w-4 h-4 text-amber-400 animate-pulse" />
            Zero-Touch MQTT Auto-Discover
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-heading font-semibold text-xs shadow-lg shadow-cyan-500/20 transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Khai báo Node Thủ công
          </button>
        </div>
      </div>

      {/* Nodes Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {nodes.map((node) => (
          <div
            key={node.id}
            className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-4 hover:border-cyan-500/30 transition-all relative overflow-hidden group"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-heading font-bold text-sm text-white">{node.name}</h3>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      node.status === 'online'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                    }`}
                  >
                    {node.status.toUpperCase()}
                  </span>
                </div>
                <div className="text-[11px] font-mono text-cyan-400">{node.chip_id}</div>
              </div>

              <button
                onClick={() => handleViewDetails(node.id)}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors"
                title="Xem lịch sử telemetry"
              >
                <LineChart className="w-4 h-4 text-cyan-400" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1">
                <div className="text-white/40 text-[10px]">Tổ chức quản lý</div>
                <div className="font-semibold text-white/90 truncate">
                  {node.organization_name || 'Tự do (Chưa gán)'}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1">
                <div className="text-white/40 text-[10px]">Chỉ số Hiện tại</div>
                <div className="font-semibold text-emerald-400 flex items-center gap-2">
                  <span>AQI {node.aqi}</span>
                  <span className="text-[11px] text-white/50">{node.pm25} µg/m³</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-white/50 pt-2 border-t border-white/5">
              <div className="flex items-center gap-1 truncate">
                <MapPin className="w-3.5 h-3.5 text-white/40" />
                <span>{node.location_name || 'Khu vực chưa tên'}</span>
              </div>
              <div>
                🔋 {node.battery}% · 📶 {node.rssi} dBm
              </div>
            </div>

            {/* Quick Assign Dropdown */}
            <div className="flex items-center gap-2 pt-2">
              <span className="text-[11px] text-white/40 shrink-0">Gán lại Tổ chức:</span>
              <select
                value={node.organization_id || ''}
                onChange={(e) => handleAssignOrg(node.id, e.target.value)}
                className="flex-1 bg-black/60 border border-white/10 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="">-- Chưa gán (Tự do) --</option>
                {orgs.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name} ({org.code})
                  </option>
                ))}
              </select>
            </div>
          </div>
        ))}
      </div>

      {/* Create Node Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0a1120] border border-white/15 rounded-2xl p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-heading font-bold text-base text-white flex items-center gap-2">
                <Cpu className="w-5 h-5 text-cyan-400" />
                Khai báo IoT Node Mới
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-white/40 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNode} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-white/70 font-semibold">Mã Phần cứng Chip ID (ESP32)</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: ESP32-SCHOOL-01"
                  value={chipId}
                  onChange={(e) => setChipId(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white font-mono placeholder:text-white/30 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-white/70 font-semibold">Tên Gọi Node</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Node Cảm biến Sân trường"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-white/70 font-semibold">Tổ chức Tiếp nhận</label>
                <select
                  value={selectedOrgId}
                  onChange={(e) => setSelectedOrgId(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="">-- Chưa gán (Tự do) --</option>
                  {orgs.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-white/70 font-semibold">Vĩ độ (Lat)</label>
                  <input
                    type="number"
                    step="any"
                    value={lat}
                    onChange={(e) => setLat(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-white/70 font-semibold">Kinh độ (Lng)</label>
                  <input
                    type="number"
                    step="any"
                    value={lng}
                    onChange={(e) => setLng(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold shadow-lg shadow-cyan-500/20"
                >
                  {creating ? 'Đang tạo...' : 'Khai báo Node'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Node Details History Modal */}
      {selectedNodeDetails && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#0a1120] border border-white/15 rounded-2xl p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="font-heading font-bold text-base text-white">
                  {selectedNodeDetails.name}
                </h3>
                <p className="text-xs text-cyan-400 font-mono">{selectedNodeDetails.chip_id}</p>
              </div>
              <button
                onClick={() => setSelectedNodeDetails(null)}
                className="text-white/40 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="font-heading font-semibold text-white/70">
                Lịch sử Đo Telemetry Gần nhất
              </div>
              <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                {selectedNodeDetails.history?.map((item: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-white/40 text-[10px]">
                        {new Date(item.recorded_at).toLocaleTimeString('vi-VN')}
                      </div>
                      <div className="font-semibold text-white">
                        PM2.5: {item.pm25} µg/m³ · PM10: {item.pm10}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="px-2 py-0.5 rounded font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                        AQI {item.aqi}
                      </span>
                      <div className="text-[10px] text-white/50 mt-1">{item.temperature}°C</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
