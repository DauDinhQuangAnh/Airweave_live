/**
 * Chế độ Demo của AirWeave — chạy hoàn toàn bằng dữ liệu hardcode/JSON trên FE,
 * KHÔNG gọi backend. Dùng cho nút "Trải nghiệm nhanh (Demo)" ở trang đăng nhập.
 *
 * Luồng đăng nhập/đăng ký THẬT không bị ảnh hưởng: nó gọi API thật như cũ.
 * Khi bật demo, mọi request qua api-client sẽ được lớp resolver trả về dữ liệu giả.
 *
 * Trạng thái được giữ trong localStorage để demo sống sót qua reload trang.
 */

const DEMO_FLAG_KEY = 'airweave.demo_mode';

/** Token giả để luồng khôi phục phiên (initAuthStore) coi như đã đăng nhập. */
export const DEMO_ACCESS_TOKEN = 'demo-access-token';
export const DEMO_REFRESH_TOKEN = 'demo-refresh-token';

let cached: boolean | null = null;

/** Có đang ở chế độ demo hay không. */
export function isDemoMode(): boolean {
  if (cached !== null) return cached;
  try {
    cached = localStorage.getItem(DEMO_FLAG_KEY) === '1';
  } catch {
    cached = false;
  }
  return cached;
}

/** Bật chế độ demo (khi bấm nút Trải nghiệm nhanh). */
export function enableDemoMode(): void {
  cached = true;
  try {
    localStorage.setItem(DEMO_FLAG_KEY, '1');
  } catch {
    /* ignore */
  }
}

/** Tắt chế độ demo (khi thoát demo hoặc chuyển sang đăng nhập thật). */
export function disableDemoMode(): void {
  cached = false;
  try {
    localStorage.removeItem(DEMO_FLAG_KEY);
  } catch {
    /* ignore */
  }
}
