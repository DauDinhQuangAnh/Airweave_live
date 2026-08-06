import { useState, useEffect, useMemo } from 'react';
import { Cpu, MapPin, Zap, Navigation, ShieldCheck, ChevronRight, RefreshCw } from 'lucide-react';
import { useLiveAirContext } from '@/contexts/live-air-context';
import { nodesApi } from '@/integrations/api';
import { useNavigate } from 'react-router-dom';

/** Thuật toán Haversine tính khoảng cách giữa 2 điểm (km) */
function getDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return Number((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(2));
}

export default function NearbyNodesMapWidget() {
  const { location } = useLiveAirContext();
  const navigate = useNavigate();
  const [nodes, setNodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const fetchNodes = async () => {
    try {
      setLoading(true);
      const data = await nodesApi.listNodes();
      setNodes(data || []);
    } catch {
      // Silent catch
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNodes();
  }, []);

  // Tính khoảng cách từ GPS hiện tại đến tất cả các Node và sắp xếp từ gần đến xa
  const sortedNearbyNodes = useMemo(() => {
    if (!location.lat || !location.lng || nodes.length === 0) return nodes;

    return [...nodes]
      .map((node) => ({
        ...node,
        distanceKm: getDistanceKm(location.lat, location.lng, node.lat, node.lng),
      }))
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }, [location, nodes]);

  const activeNode = useMemo(() => {
    if (selectedNodeId) {
      return sortedNearbyNodes.find((n) => n.id === selectedNodeId) || sortedNearbyNodes[0];
    }
    return sortedNearbyNodes[0];
  }, [selectedNodeId, sortedNearbyNodes]);

  return (
    <div className="w-full rounded-2xl bg-[#09111e]/90 border border-white/10 p-4 md:p-5 shadow-2xl backdrop-blur-md space-y-4 text-white">
      {/* Widget Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Cpu className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="font-heading font-bold text-sm md:text-base text-white flex items-center gap-2">
              Bản đồ Node IoT Khu vực Gần nhất
              <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] border border-cyan-500/30 font-semibold">
                {sortedNearbyNodes.length} Node Hoạt động
              </span>
            </h3>
            <p className="text-[11px] text-white/50 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-cyan-400" />
              Vị trí hiện tại: <span className="text-white/80 font-medium">{location.label || 'Hà Nội'}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchNodes}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
            title="Làm mới danh sách Node"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => navigate('/map')}
            className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 text-cyan-300 text-xs font-heading font-semibold transition-colors flex items-center gap-1"
          >
            Mở Bản đồ Lớn
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Nodes List Carousel / Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {sortedNearbyNodes.slice(0, 3).map((node) => {
          const isSelected = activeNode?.id === node.id;
          return (
            <div
              key={node.id}
              onClick={() => setSelectedNodeId(node.id)}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer relative overflow-hidden ${
                isSelected
                  ? 'bg-gradient-to-br from-cyan-950/80 to-blue-950/80 border-cyan-500/50 shadow-lg shadow-cyan-500/10'
                  : 'bg-white/5 border-white/5 hover:border-white/20'
              }`}
            >
              {node.distanceKm !== undefined && (
                <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                  <Navigation className="w-2.5 h-2.5" />
                  {node.distanceKm < 1 ? `Cách ${Math.round(node.distanceKm * 1000)}m` : `Cách ${node.distanceKm}km`}
                </span>
              )}

              <div className="flex items-center gap-2 mb-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                <h4 className="font-heading font-bold text-xs text-white truncate pr-16">
                  {node.name}
                </h4>
              </div>

              <p className="text-[11px] text-white/50 truncate mb-3">
                🏢 {node.organization_name || 'Tổ chức vi vùng'}
              </p>

              <div className="grid grid-cols-3 gap-1.5 text-center">
                <div className="p-1.5 rounded-lg bg-black/40 border border-white/5">
                  <div className="text-[9px] text-white/40 uppercase font-semibold">AQI</div>
                  <div className="font-heading font-extrabold text-xs text-emerald-400">{node.aqi}</div>
                </div>
                <div className="p-1.5 rounded-lg bg-black/40 border border-white/5">
                  <div className="text-[9px] text-white/40 uppercase font-semibold">PM2.5</div>
                  <div className="font-heading font-bold text-xs text-cyan-300">{node.pm25}</div>
                </div>
                <div className="p-1.5 rounded-lg bg-black/40 border border-white/5">
                  <div className="text-[9px] text-white/40 uppercase font-semibold">Nhiệt độ</div>
                  <div className="font-heading font-bold text-xs text-amber-300">{node.temperature}°C</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Node Details Bar */}
      {activeNode && (
        <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-white/80">
            <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>
              Đang xem chi tiết Node: <strong className="text-white">{activeNode.name}</strong> ({activeNode.location_name})
            </span>
          </div>

          <div className="flex items-center gap-3 text-[11px] text-white/60">
            {activeNode.uv_index !== undefined && <span>☀️ UV: <strong className="text-amber-300">{activeNode.uv_index}</strong></span>}
            {activeNode.co2 !== undefined && <span>💨 CO2: <strong className="text-cyan-300">{activeNode.co2} ppm</strong></span>}
            <span>🔋 Pin: <strong className="text-emerald-400">{activeNode.battery}%</strong></span>
          </div>
        </div>
      )}
    </div>
  );
}
