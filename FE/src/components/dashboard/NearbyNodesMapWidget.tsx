import { useState, useEffect, useMemo } from 'react';
import { Cpu, MapPin, Navigation, ChevronRight, RefreshCw } from 'lucide-react';
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
    <div className="w-full rounded-2xl bg-slate-900/90 border border-cyan-500/20 p-4 sm:p-5 shadow-2xl backdrop-blur-md space-y-4 text-white">
      {/* Widget Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3.5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
            <Cpu className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-heading font-bold text-sm sm:text-base text-white">
                Bản đồ Node IoT Khu vực Gần nhất
              </h3>
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] border border-cyan-500/30 font-semibold font-mono">
                {sortedNearbyNodes.length} Node Hoạt động
              </span>
            </div>
            <p className="text-xs text-white/60 flex items-center gap-1 mt-0.5">
              <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              Vị trí của bạn: <span className="text-cyan-200 font-semibold">{location.label || 'Đang định vị GPS...'}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
          <button
            onClick={fetchNodes}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
            title="Làm mới danh sách Node"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => navigate('/map')}
            className="px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-slate-950 text-xs font-heading font-bold transition-all flex items-center gap-1 shadow-lg shadow-cyan-500/20"
          >
            Mở Bản đồ Lớn
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Nodes List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {sortedNearbyNodes.slice(0, 3).map((node) => {
          const isSelected = activeNode?.id === node.id;
          return (
            <div
              key={node.id}
              onClick={() => setSelectedNodeId(node.id)}
              className={`p-4 rounded-xl border transition-all cursor-pointer space-y-2.5 ${
                isSelected
                  ? 'bg-gradient-to-br from-cyan-950/90 via-slate-900 to-blue-950/90 border-cyan-400/50 shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-500/30'
                  : 'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/[0.07]'
              }`}
            >
              {/* Header Title + Distance Badge (No overlap!) */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
                  <h4 className="font-heading font-bold text-xs sm:text-sm text-white truncate" title={node.name}>
                    {node.name}
                  </h4>
                </div>
                {node.distanceKm !== undefined && (
                  <span className="shrink-0 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                    <Navigation className="w-2.5 h-2.5" />
                    {node.distanceKm < 1 ? `${Math.round(node.distanceKm * 1000)}m` : `${node.distanceKm}km`}
                  </span>
                )}
              </div>

              <p className="text-xs text-white/60 truncate">
                🏢 {node.organization_name || 'Tổ chức vi vùng'}
              </p>

              <div className="grid grid-cols-3 gap-2 text-center pt-1">
                <div className="p-2 rounded-lg bg-black/50 border border-white/10">
                  <div className="text-[9px] text-white/50 uppercase font-heading font-semibold">AQI</div>
                  <div className="font-heading font-extrabold text-sm text-emerald-400">{node.aqi}</div>
                </div>
                <div className="p-2 rounded-lg bg-black/50 border border-white/10">
                  <div className="text-[9px] text-white/50 uppercase font-heading font-semibold">PM2.5</div>
                  <div className="font-heading font-bold text-sm text-cyan-300">{node.pm25}</div>
                </div>
                <div className="p-2 rounded-lg bg-black/50 border border-white/10">
                  <div className="text-[9px] text-white/50 uppercase font-heading font-semibold">Nhiệt độ</div>
                  <div className="font-heading font-bold text-sm text-amber-300">{node.temperature}°C</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {activeNode && (
        <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-500/20 text-xs text-white/80 flex items-center justify-between gap-3 flex-wrap font-body">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span>Đang xem chi tiết Node: <strong>{activeNode.name}</strong></span>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-cyan-300 font-mono">
            <span>☀️ UV: {activeNode.uv_index || 2.3}</span>
            <span>💨 CO2: {activeNode.co2 || 410} ppm</span>
            <span>🔋 Pin: {activeNode.battery || 100}%</span>
          </div>
        </div>
      )}
    </div>
  );
}
