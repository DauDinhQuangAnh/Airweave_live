import { useEffect, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import { API_URL } from '@/lib/api-client';
import type { CommunityReport } from '@/integrations/api';

/** Gốc server WebSocket — cắt bỏ hậu tố /api của REST base URL. */
const WS_URL = API_URL.replace(/\/api\/?$/, '');

let sharedSocket: Socket | null = null;
let refCount = 0;

/** Dùng chung một kết nối cho mọi component đang lắng nghe. */
function acquireSocket(): Socket {
  sharedSocket ??= io(`${WS_URL}/community`, {
    transports: ['websocket'],
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10_000,
  });
  refCount += 1;
  return sharedSocket;
}

function releaseSocket() {
  refCount -= 1;
  if (refCount <= 0 && sharedSocket) {
    sharedSocket.disconnect();
    sharedSocket = null;
    refCount = 0;
  }
}

interface Handlers {
  onNew?: (report: CommunityReport) => void;
  onDeleted?: (id: string) => void;
}

/**
 * Nhận báo cáo cộng đồng theo thời gian thực.
 * Thay cho supabase.channel(...).on('postgres_changes', ...).
 */
export function useCommunityRealtime({ onNew, onDeleted }: Handlers) {
  // Giữ handler trong ref để không phải gỡ/đăng ký lại socket mỗi lần render
  const handlersRef = useRef<Handlers>({ onNew, onDeleted });
  handlersRef.current = { onNew, onDeleted };

  useEffect(() => {
    const socket = acquireSocket();

    const handleNew = (report: CommunityReport) => handlersRef.current.onNew?.(report);
    const handleDeleted = ({ id }: { id: string }) => handlersRef.current.onDeleted?.(id);

    socket.on('report:new', handleNew);
    socket.on('report:deleted', handleDeleted);

    return () => {
      socket.off('report:new', handleNew);
      socket.off('report:deleted', handleDeleted);
      releaseSocket();
    };
  }, []);
}
