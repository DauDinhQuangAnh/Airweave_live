-- Migration: Tối ưu index cho community_reports và user_live_contexts
-- Mục tiêu: Tăng tốc truy vấn theo bounding box địa lý và expires_at filtering

-- 1. BRIN index trên (lat, lng) của community_reports
--    BRIN (Block Range Index) rất nhẹ (~1/100 kích thước B-Tree) và hiệu quả
--    khi dữ liệu có tính locality địa lý (insert gần đây thường ở gần nhau về vị trí lưu).
--    Phù hợp với quy mô vừa (< 10 triệu rows).
CREATE INDEX IF NOT EXISTS community_reports_lat_lng_brin_idx
  ON community_reports USING BRIN (lat, lng)
  WITH (pages_per_range = 32);

-- 2. Compound index tối ưu thứ tự cột: expires_at (filter đầu tiên) → lat, lng (range scan)
--    Index hiện tại (expires_at, lat, lng) đúng thứ tự nhưng tạo thêm partial index
--    chỉ cho records chưa expired để index nhỏ hơn và scan nhanh hơn.
CREATE INDEX IF NOT EXISTS community_reports_active_geo_idx
  ON community_reports (expires_at, lat, lng)
  WHERE expires_at > NOW() - INTERVAL '7 days';

-- 3. Index cho user_live_contexts.snapshot_updated_at (dùng khi query snapshot mới nhất)
CREATE INDEX IF NOT EXISTS user_live_contexts_snapshot_idx
  ON user_live_contexts (user_id, snapshot_updated_at DESC);

-- 4. Index partial cho refresh_tokens chưa bị thu hồi (phổ biến nhất khi verify token)
CREATE INDEX IF NOT EXISTS refresh_tokens_active_idx
  ON refresh_tokens (token_hash, expires_at)
  WHERE revoked_at IS NULL;
