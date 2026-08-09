/**
 * Chế độ dữ liệu của Admin Portal: DEMO (hardcode) hay LIVE (gọi API thật).
 *
 * Thứ tự ưu tiên:
 *   1. localStorage override (người dùng bấm công tắc trên header)  → ưu tiên cao nhất
 *   2. VITE_ADMIN_DATA_MODE trong .env                              → mặc định build
 *   3. 'demo'                                                       → an toàn mặc định
 *
 * Toàn bộ page dùng chung state này qua hook `useDataMode()`; đổi ở 1 nơi thì mọi
 * trang cùng cập nhật (pub/sub đơn giản, không cần thêm thư viện).
 */

import { useEffect, useState } from 'react';

export type DataMode = 'demo' | 'live';

const STORAGE_KEY = 'airweave.admin.dataMode';

function readInitial(): DataMode {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'demo' || saved === 'live') return saved;
  } catch {
    /* SSR / storage bị chặn */
  }
  const env = (import.meta.env.VITE_ADMIN_DATA_MODE as string | undefined)?.toLowerCase();
  return env === 'live' ? 'live' : 'demo';
}

let current: DataMode = readInitial();
const listeners = new Set<(m: DataMode) => void>();

export function getDataMode(): DataMode {
  return current;
}

export function setDataMode(mode: DataMode): void {
  if (mode === current) return;
  current = mode;
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    /* bỏ qua nếu storage bị chặn */
  }
  listeners.forEach((fn) => fn(mode));
}

export function toggleDataMode(): DataMode {
  const next: DataMode = current === 'demo' ? 'live' : 'demo';
  setDataMode(next);
  return next;
}

export function onDataModeChange(fn: (m: DataMode) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Hook React: đọc + tự re-render khi chế độ đổi ở bất kỳ đâu. */
export function useDataMode(): DataMode {
  const [mode, setMode] = useState<DataMode>(current);
  useEffect(() => onDataModeChange(setMode), []);
  return mode;
}
