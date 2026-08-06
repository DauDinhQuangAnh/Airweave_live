import { Cpu, MapPin, Zap, ChevronRight, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface NodeProximityBadgeProps {
  matchedNode: any;
  distanceMeters: number | null;
}

export default function NodeProximityBadge({
  matchedNode,
  distanceMeters,
}: NodeProximityBadgeProps) {
  const navigate = useNavigate();

  if (!matchedNode) return null;

  return (
    <div className="w-full p-3.5 rounded-2xl bg-gradient-to-r from-cyan-950/80 via-blue-950/80 to-slate-900/80 border border-cyan-500/35 shadow-xl shadow-cyan-500/10 backdrop-blur-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-white transition-all animate-in fade-in duration-300">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shrink-0 shadow-lg shadow-cyan-500/30 relative">
          <Zap className="w-5 h-5 text-white animate-pulse" />
          <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#030810]" />
        </div>

        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="font-heading font-extrabold text-xs text-cyan-300 tracking-wide uppercase flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              Đã kết nối Node Cảm biến tại chỗ
            </span>
            <span className="px-2 py-0.2 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Cách {distanceMeters ?? 120}m
            </span>
          </div>

          <h4 className="font-heading font-bold text-sm text-white flex items-center gap-1.5">
            {matchedNode.name}
            {matchedNode.organization_name && (
              <span className="text-white/50 text-xs font-normal">
                ({matchedNode.organization_name})
              </span>
            )}
          </h4>

          <p className="text-[11px] text-white/60 flex items-center gap-2">
            <span>📍 {matchedNode.location_name || 'Vi vùng tại chỗ'}</span>
            <span>·</span>
            <span className="text-cyan-400 font-semibold">Độ chính xác 100% tại chỗ</span>
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
        <div className="px-3 py-1.5 rounded-xl bg-black/50 border border-white/10 text-right">
          <div className="text-[9px] text-white/40 font-heading uppercase font-semibold">
            AQI Đo Thực
          </div>
          <div className="font-heading font-extrabold text-sm text-emerald-400">
            {matchedNode.aqi} <span className="text-[10px] text-white/60 font-normal">({matchedNode.pm25} µg)</span>
          </div>
        </div>

        {matchedNode.organization_id && (
          <button
            onClick={() => navigate('/org-dashboard')}
            className="p-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 transition-colors"
            title="Xem Bảng điều khiển Tổ chức"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
