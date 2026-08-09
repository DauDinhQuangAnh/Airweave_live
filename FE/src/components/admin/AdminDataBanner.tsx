import { Database, Radio, AlertTriangle, Loader2 } from 'lucide-react';
import type { DataMode } from '@/pages/admin/_data/mode';

interface Props {
  mode: DataMode;
  connected: boolean;
  error?: string | null;
  loading?: boolean;
  /** Ghi chú thêm cho từng trang (ví dụ: "Trang này hiện Demo-only"). */
  note?: string;
}

/**
 * Banner trạng thái nguồn dữ liệu, đặt ở đầu mỗi trang admin.
 * Nói rõ đang DEMO hay LIVE, và nếu LIVE mà chưa kết nối thì cảnh báo đỏ —
 * không bao giờ âm thầm trình bày mock như dữ liệu thật.
 */
export default function AdminDataBanner({ mode, connected, error, loading, note }: Props) {
  const isDemo = mode === 'demo';
  const liveOk = mode === 'live' && connected;
  const liveDown = mode === 'live' && !connected;

  const tone = isDemo
    ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
    : liveOk
    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
    : 'bg-rose-500/15 border-rose-500/40 text-rose-300';

  const Icon = isDemo ? Database : liveOk ? Radio : AlertTriangle;

  return (
    <div className={`flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl border text-xs font-heading font-semibold ${tone}`}>
      <div className="flex items-center gap-2 min-w-0">
        {loading ? (
          <Loader2 className="w-4 h-4 shrink-0 animate-spin" />
        ) : (
          <Icon className={`w-4 h-4 shrink-0 ${liveOk ? '' : 'animate-pulse'}`} />
        )}
        <span className="truncate">
          {isDemo && (
            <>
              📦 <strong>Chế độ DEMO</strong> — dữ liệu mẫu hardcode. Thao tác lưu/tạo chỉ mô phỏng cục bộ, không ghi vào hệ thống thật.
            </>
          )}
          {liveOk && (
            <>
              🛰️ <strong>Chế độ LIVE</strong> — dữ liệu thật từ API AirWeave.
            </>
          )}
          {liveDown && (
            <>
              ⚠️ <strong>Chế độ LIVE — CHƯA KẾT NỐI.</strong> {error || 'Không lấy được dữ liệu từ API.'}
            </>
          )}
          {note ? <span className="opacity-80"> · {note}</span> : null}
        </span>
      </div>

      <span className={`hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
        isDemo ? 'bg-amber-500/20 text-amber-200' : liveOk ? 'bg-emerald-500/20 text-emerald-200' : 'bg-rose-500/20 text-rose-200'
      }`}>
        {isDemo ? 'DEMO' : liveOk ? 'LIVE' : 'LIVE · OFFLINE'}
      </span>
    </div>
  );
}
