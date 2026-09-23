import React, { useState, useEffect, useMemo } from 'react';
import {
  Cpu,
  MapPin,
  Navigation,
  ChevronRight,
  RefreshCw,
  Radio,
  BatteryCharging,
  Wifi,
  Map,
} from 'lucide-react';
import { useLiveAirContext } from '@/contexts/live-air-context';
import { nodesApi } from '@/integrations/api';
import { useNavigate } from 'react-router-dom';
import { getAQIColorNew } from '@/lib/pam-stations';
import { useAppLang } from '@/hooks/use-app-lang';
import { localizeDemoText } from '@/lib/localize-demo';
import { hasAirQualityReading } from '@/lib/air-quality';

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
  const lang = useAppLang();
  const { location, weather } = useLiveAirContext();
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
      // Fallback: If unauthenticated or no nodes in DB, nodes will be []
      setNodes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNodes();
  }, []);

  const sortedNearbyNodes = useMemo(() => {
    if (!nodes || nodes.length === 0) return [];
    if ((location.status !== 'active' && location.status !== 'manual') || !Number.isFinite(location.lat) || !Number.isFinite(location.lng)) return nodes;

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
    <div className="w-full rounded-2xl bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-slate-950/90 border border-white/10 p-5 sm:p-6 shadow-xl backdrop-blur-xl space-y-4 text-white">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3.5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
            <Cpu className="w-4 h-4 text-cyan-300" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-heading font-bold text-sm sm:text-base text-white">
                {lang === 'vi' ? 'Mạng Lưới IoT & Trạm Quan Trắc' : 'IoT Network & Monitoring Stations'}
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] border border-cyan-500/30 font-semibold font-mono">
                {sortedNearbyNodes.length > 0
                  ? `${sortedNearbyNodes.length} ${lang === 'vi' ? 'Node Trong Danh Sách' : 'Listed Nodes'}`
                  : (lang === 'vi' ? 'Không có node IoT' : 'No IoT nodes')}
              </span>
            </div>
            <p className="text-xs text-white/50 flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3 text-cyan-400 shrink-0" />
              <span className="truncate max-w-[280px]">
                {localizeDemoText(location.label, lang) || (lang === 'vi' ? 'Đang cập nhật vị trí GPS...' : 'Updating GPS location...')}
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
          <button
            type="button"
            onClick={fetchNodes}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
            title={lang === 'vi' ? 'Làm mới danh sách Node' : 'Refresh node list'}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => navigate('/map')}
            className="px-3 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 text-xs font-heading font-bold transition-all flex items-center gap-1.5"
          >
            <Map className="w-3.5 h-3.5" />
            <span>{lang === 'vi' ? 'Mở Bản Đồ' : 'Open Map'}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* When Real IoT Nodes are Present */}
      {sortedNearbyNodes.length > 0 ? (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {sortedNearbyNodes.slice(0, 3).map((node) => {
              const isSelected = activeNode?.id === node.id;
              const nodeColor = Number.isFinite(node.aqi) ? getAQIColorNew(node.aqi) : '#94a3b8';
              return (
                <div
                  key={node.id}
                  onClick={() => setSelectedNodeId(node.id)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer space-y-2 ${
                    isSelected
                      ? 'bg-gradient-to-br from-cyan-950/80 via-slate-900 to-blue-950/80 border-cyan-500/50 shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-500/30'
                      : 'bg-white/[0.03] border-white/5 hover:border-white/15 hover:bg-white/[0.06]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${node.status === 'online' ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                      <h4 className="font-heading font-bold text-xs text-white truncate" title={localizeDemoText(node.name, lang)}>
                        {localizeDemoText(node.name, lang)}
                      </h4>
                    </div>
                    {node.distanceKm !== undefined && (
                      <span className="shrink-0 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                        <Navigation className="w-2.5 h-2.5" />
                        {node.distanceKm < 1 ? `${Math.round(node.distanceKm * 1000)}m` : `${node.distanceKm}km`}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-white/50">
                    <span className="truncate">{localizeDemoText(node.location_name, lang) || 'Outdoor Solar Node'}</span>
                    <span className="font-mono font-bold text-xs" style={{ color: nodeColor }}>
                      AQI {Number.isFinite(node.aqi) ? node.aqi : '—'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {activeNode && (
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/10 text-xs text-white/70 flex items-center justify-between flex-wrap gap-2 font-mono">
              <span className="text-cyan-300 font-sans font-medium">
                📡 {lang === 'vi' ? 'Chi tiết node' : 'Node details'}: <strong>{localizeDemoText(activeNode.name, lang)}</strong>{activeNode.edition ? ` (${activeNode.edition})` : ''}
              </span>
              <div className="flex items-center gap-3 text-[11px] text-white/50">
                <span className="flex items-center gap-1">
                  <BatteryCharging className="w-3 h-3 text-emerald-400" />
                  {activeNode.battery == null ? '—' : `${activeNode.battery}%`}
                </span>
                <span className="flex items-center gap-1">
                  <Wifi className="w-3 h-3 text-cyan-400" />
                  {activeNode.rssi == null ? '—' : `${activeNode.rssi} dBm`}
                </span>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Fallback View: Nearest Regional Reference Station (Never empty!) */
        <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-950/30 via-slate-900/60 to-slate-950/40 border border-cyan-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-heading font-bold text-sm text-white">
                  {weather.station || (lang === 'vi' ? 'Dữ liệu không khí tại vị trí' : 'Air data at your location')}
                </h4>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono font-semibold">
                  {hasAirQualityReading(weather) ? (lang === 'vi' ? 'Có dữ liệu' : 'Data available') : (lang === 'vi' ? 'Chưa có dữ liệu' : 'No data')}
                </span>
              </div>
              <p className="text-xs text-white/60 mt-0.5">
                {lang === 'vi'
                  ? 'Không có node IoT gần đây. Chỉ số bên phải lấy từ nguồn dữ liệu không khí của vị trí hiện tại (nếu khả dụng).'
                  : 'No nearby IoT nodes. The reading on the right comes from the current location air-data source, when available.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
            <div className="text-right">
              <span className="text-[10px] text-white/40 block font-mono">{lang === 'vi' ? 'Chỉ số hiện tại' : 'Current reading'}</span>
              <span
                className="font-heading font-black text-lg"
                style={{ color: hasAirQualityReading(weather) ? getAQIColorNew(weather.aqi) : '#94a3b8' }}
              >
                AQI {hasAirQualityReading(weather) ? weather.aqi : '—'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => navigate('/map')}
              className="p-2 rounded-xl bg-cyan-500 text-slate-950 hover:bg-cyan-400 font-bold transition-all shadow-md shadow-cyan-500/20"
              title={lang === 'vi' ? 'Khám phá bản đồ toàn trạm' : 'Explore all stations on map'}
            >
              <Navigation className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
