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
      // Fallback silent
    }
  };

  useEffect(() => {
    fetchNodes();
    const interval = setInterval(fetchNodes, 5000);
    return () => clearInterval(interval);
  }, []);

  const closestCalc = useMemo(() => {
    if (!userLat || !userLng || nodes.length === 0) {
      return { node: null, distance: null };
    }

    let minDistance = Infinity;
    let closestNode: any = null;

    nodes.forEach((n) => {
      if (n.lat && n.lng && n.status !== 'offline') {
        const d = calculateDistanceMeters(userLat, userLng, n.lat, n.lng);
        if (d < minDistance) {
          minDistance = d;
          closestNode = n;
        }
      }
    });

    return { node: closestNode, distance: minDistance };
  }, [userLat, userLng, nodes]);

  // Hysteresis Logic to prevent flickering
  useEffect(() => {
    const { node, distance } = closestCalc;

    if (!node || distance === null) {
      setActiveMatchedNodeId(null);
      return;
    }

    if (activeMatchedNodeId) {
      // Đang kết nối -> chỉ ngắt khi đi xa > 650m
      if (distance > DISCONNECT_THRESHOLD_METERS) {
        setActiveMatchedNodeId(null);
      }
    } else {
      // Chưa kết nối -> kích hoạt khi đi vào < 500m
      if (distance <= CONNECT_THRESHOLD_METERS) {
        setActiveMatchedNodeId(node.id);
      }
    }
  }, [closestCalc, activeMatchedNodeId]);

  const matchedNode = useMemo(() => {
    if (!activeMatchedNodeId) return null;
    return nodes.find((n) => n.id === activeMatchedNodeId) || closestCalc.node;
  }, [activeMatchedNodeId, nodes, closestCalc.node]);

  return {
    matchedNode: activeMatchedNodeId ? matchedNode : null,
    distanceMeters: activeMatchedNodeId ? closestCalc.distance : null,
    isConnectedToNode: !!activeMatchedNodeId,
    refetchNodes: fetchNodes,
  };
}
