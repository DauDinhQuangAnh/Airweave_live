/**
 * Hook dữ liệu dùng chung cho mọi trang Admin.
 *
 * - DEMO  : trả thẳng mock (đồng bộ, không gọi mạng).
 * - LIVE  : gọi API → normalize. Nếu lỗi hoặc DB rỗng thì KHÔNG âm thầm giả dữ
 *           liệu: đặt cờ `connected = false` + `error`, và tạm hiển thị mock để
 *           layout không vỡ — banner ở đầu trang nói rõ đang là dữ liệu Demo.
 *
 * Nhờ vậy khi môi trường thật được dựng xong, chỉ cần gạt công tắc sang LIVE là
 * chạy; không phải sửa từng page.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { nodesApi } from '@/integrations/api';
import type { DataMode } from './mode';
import { useDataMode } from './mode';
import { normalizeNode, normalizeOrg, normalizeStats } from './normalize';
import { MOCK_NODES, MOCK_ORGS, MOCK_STATS } from './mock';
import type { AdminNode, AdminOrg, AdminStats } from './types';

export interface AdminQuery<T> {
  data: T;
  loading: boolean;
  /** LIVE và lấy được dữ liệu thật? DEMO luôn true. */
  connected: boolean;
  /** Lý do chưa kết nối (chỉ có ở LIVE khi lỗi/rỗng). */
  error: string | null;
  mode: DataMode;
  refetch: () => void;
}

interface ResourceOptions<T> {
  demo: () => T;
  live: () => Promise<T>;
  isEmpty: (data: T) => boolean;
  intervalMs?: number;
}

function useAdminResource<T>(opts: ResourceOptions<T>): AdminQuery<T> {
  const mode = useDataMode();
  const [data, setData] = useState<T>(opts.demo);
  const [loading, setLoading] = useState(mode === 'live');
  const [connected, setConnected] = useState(mode === 'demo');
  const [error, setError] = useState<string | null>(null);

  // Giữ tham chiếu opts mới nhất mà không đưa vào deps (tránh vòng lặp effect).
  const optsRef = useRef(opts);
  optsRef.current = opts;

  const load = useCallback(async () => {
    const o = optsRef.current;
    if (mode === 'demo') {
      setData(o.demo());
      setConnected(true);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const live = await o.live();
      if (o.isEmpty(live)) {
        setData(o.demo());
        setConnected(false);
        setError('API phản hồi nhưng chưa có dữ liệu (DB rỗng / chưa seed). Đang tạm hiển thị dữ liệu Demo.');
      } else {
        setData(live);
        setConnected(true);
        setError(null);
      }
    } catch (e) {
      setData(o.demo());
      setConnected(false);
      setError(`Không kết nối được API: ${(e as Error).message}. Đang tạm hiển thị dữ liệu Demo.`);
    } finally {
      setLoading(false);
    }
  }, [mode]);

  useEffect(() => {
    void load();
    if (mode === 'live' && optsRef.current.intervalMs) {
      const id = setInterval(() => void load(), optsRef.current.intervalMs);
      return () => clearInterval(id);
    }
  }, [load, mode]);

  return { data, loading, connected, error, mode, refetch: load };
}

// ---------- Hooks cụ thể ----------

export function useAdminStats(intervalMs?: number): AdminQuery<AdminStats> {
  return useAdminResource<AdminStats>({
    demo: () => MOCK_STATS,
    live: async () => normalizeStats(await nodesApi.adminStats()),
    isEmpty: (s) => !s || s.totalNodes === 0,
    intervalMs,
  });
}

export function useAdminNodes(intervalMs?: number): AdminQuery<AdminNode[]> {
  return useAdminResource<AdminNode[]>({
    demo: () => MOCK_NODES,
    live: async () => {
      const raw = await nodesApi.listNodes();
      return Array.isArray(raw) ? raw.map(normalizeNode) : [];
    },
    isEmpty: (arr) => arr.length === 0,
    intervalMs,
  });
}

export function useAdminOrgs(): AdminQuery<AdminOrg[]> {
  return useAdminResource<AdminOrg[]>({
    demo: () => MOCK_ORGS,
    live: async () => {
      const raw = await nodesApi.listOrganizations();
      return Array.isArray(raw) ? raw.map(normalizeOrg) : [];
    },
    isEmpty: (arr) => arr.length === 0,
  });
}
