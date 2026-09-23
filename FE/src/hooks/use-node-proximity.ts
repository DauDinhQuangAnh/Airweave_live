import { useState, useEffect, useMemo } from 'react';
import { nodesApi } from '@/integrations/api';

/** Thuật toán Haversine tính khoảng cách giữa 2 điểm (mét). */
function calculateDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371000; // Bán kính Trái Đất (mét)
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export interface ProximityResult {
  matchedNode: any | null;
  distanceMeters: number | null;
  isConnectedToNode: boolean;
  refetchNodes: () => Promise<void>;
}

const CONNECT_THRESHOLD_METERS = 500; // Đi vào bán kính 500m -> Kết nối Node
const DISCONNECT_THRESHOLD_METERS = 650; // Đi xa quá 650m -> Mới ngắt kết nối (Hysteresis)

export function useNodeProximity(userLat: number, userLng: number): ProximityResult {
  const [nodes, setNodes] = useState<any[]>([]);
  const [activeMatchedNodeId, setActiveMatchedNodeId] = useState<string | null>(null);

  const fetchNodes = async () => {
    try {
      const data = await nodesApi.listNodes();
      setNodes(data || []);
    } catch {
      // Do not keep presenting an old node snapshot as a live connection.
      setNodes([]);
    }
  };

  useEffect(() => {
    fetchNodes();
    const interval = setInterval(fetchNodes, 5000);
    return () => clearInterval(interval);
  }, []);

  const closestCalc = useMemo(() => {
    if (!Number.isFinite(userLat) || !Number.isFinite(userLng) || nodes.length === 0) {
      return { node: null, distance: null };
    }

    let minDistance = Infinity;
    let closestNode: any = null;

    nodes.forEach((n) => {
      if (Number.isFinite(n.lat) && Number.isFinite(n.lng) && n.status === 'online' && Number.isFinite(n.aqi)) {
        const d = calculateDistanceMeters(userLat, userLng, n.lat, n.lng);
        if (d < minDistance) {
          minDistance = d;
          closestNode = n;
        }
      }
    });

    return { node: closestNode, distance: minDistance };
  }, [userLat, userLng, nodes]);

  const activeNode = useMemo(() => nodes.find((n) =>
    n.id === activeMatchedNodeId && n.status === 'online' && Number.isFinite(n.aqi) && Number.isFinite(n.lat) && Number.isFinite(n.lng)
  ) ?? null, [activeMatchedNodeId, nodes]);
  const activeDistance = activeNode && Number.isFinite(userLat) && Number.isFinite(userLng)
    ? calculateDistanceMeters(userLat, userLng, activeNode.lat, activeNode.lng) : null;

  // Hysteresis only applies to the same healthy node; never retain an offline node.
  useEffect(() => {
    const { node, distance } = closestCalc;
    if (activeMatchedNodeId && (!activeNode || activeDistance === null || activeDistance > DISCONNECT_THRESHOLD_METERS)) {
      setActiveMatchedNodeId(null);
      return;
    }
    if (!activeMatchedNodeId && node && distance !== null && distance <= CONNECT_THRESHOLD_METERS) {
      setActiveMatchedNodeId(node.id);
    }
  }, [closestCalc, activeMatchedNodeId, activeNode, activeDistance]);

  return {
    matchedNode: activeNode,
    distanceMeters: activeDistance,
    isConnectedToNode: !!activeNode && activeDistance !== null && activeDistance <= DISCONNECT_THRESHOLD_METERS,
    refetchNodes: fetchNodes,
  };
}
