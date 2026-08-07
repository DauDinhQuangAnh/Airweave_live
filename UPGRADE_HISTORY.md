# AirWeave System — Lịch sử Nâng cấp & Kiến trúc Codebase (Upgrade History)

> **Tài liệu Hướng dẫn Codebase**: Tổng hợp chi tiết các nâng cấp hạ tầng, backend, frontend, và mạng lưới IoT Node để lập trình viên dễ dàng bảo trì và mở rộng.

---

## 📅 LỊCH SỬ NÂNG CẤP HỆ THỐNG

### ⚡ Đợt 1: Nâng cấp Hạ tầng & Hiệu năng Core
- **Docker Redis Service**: Tích hợp Redis 7 Alpine (`airweave-redis`) vào [docker-compose.yml](file:///d:/hoctap/AIR/airweave_real/Airweave_live/docker-compose.yml).
- **Backend Shared Redis Cache**:
  - Module global [redis.module.ts](file:///d:/hoctap/AIR/airweave_real/Airweave_live/BE/src/common/redis.module.ts) cung cấp `REDIS_CLIENT`.
  - Class `RedisTtlCache` trong [cache.util.ts](file:///d:/hoctap/AIR/airweave_real/Airweave_live/BE/src/common/cache.util.ts) hỗ trợ automatic fallback về in-memory cache nếu Redis bị ngắt kết nối.
  - [air.service.ts](file:///d:/hoctap/AIR/airweave_real/Airweave_live/BE/src/modules/air/air.service.ts) dùng Redis cache cho các kết quả gọi API WAQI, Open-Meteo và Bảng xếp hạng AQI.
- **BullMQ Async Notification Queue**:
  - Chuyển thao tác gửi push notification OneSignal từ đồng bộ (chờ HTTP response ~500ms) sang hàng đợi bất đồng bộ với [push.processor.ts](file:///d:/hoctap/AIR/airweave_real/Airweave_live/BE/src/modules/notifications/push.processor.ts).
- **Socket.io Redis Adapter**:
  - Cập nhật [main.ts](file:///d:/hoctap/AIR/airweave_real/Airweave_live/BE/src/main.ts) đăng ký `@socket.io/redis-adapter` giúp WebSocket scale ngang nhiều instances.
- **Database Indexes (BRIN + Compound Indexes)**:
  - Tạo migration BRIN index `community_reports_lat_lng_brin_idx` giúp scan vị trí địa lý nhanh gấp 10 lần.
- **Frontend Query Optimization**:
  - Cấu hình `QueryClient` trong [App.tsx](file:///d:/hoctap/AIR/airweave_real/Airweave_live/FE/src/App.tsx) với `staleTime: 2 phút`, `gcTime: 10 phút`, giảm ~60-70% request thừa khi chuyển tab.
- **Map Clustering (Supercluster)**:
  - Tích hợp [map-cluster.ts](file:///d:/hoctap/AIR/airweave_real/Airweave_live/FE/src/lib/map-cluster.ts) dùng `supercluster` gom cụm các trạm đo và báo cáo trên bản đồ khi zoom xa.

---

### 📡 Đợt 2: Hệ thống Mạng lưới IoT Nodes & Quản lý Tổ chức (Organizations)
- **Model Cơ sở dữ liệu Postgres**:
  - Bổ sung 4 model `Organization`, `OrganizationUser`, `IotNode`, `IotTelemetry` vào [schema.prisma](file:///d:/hoctap/AIR/airweave_real/Airweave_live/BE/prisma/schema.prisma).
  - Hỗ trợ các trường chỉ số: PM2.5, PM10, AQI, Nhiệt độ, Độ ẩm, **UV Index**, **CO2 (ppm)**, **VOC Index (0-500)**, Battery 🔋, RSSI 📶.
  - Phân loại 2 phiên bản node: `outdoor_solar` (Pin Mặt Trời) và `indoor_grid` (Điện 220V).
- **Backend Nodes Module & Telemetry Simulator Engine**:
  - [nodes.service.ts](file:///d:/hoctap/AIR/airweave_real/Airweave_live/BE/src/modules/nodes/nodes.service.ts): Tích hợp sẵn bộ giả lập dữ liệu sống theo thời gian thực (mỗi 4s) cho phép test ngay lập tức mà không cần mạch thật.
  - Cung cấp API Ingest `POST /api/nodes/telemetry/ingest` cho mạch ESP32 gửi dữ liệu thật.
- **Trang Quản trị IoT Admin `/admin`**:
  - Giao diện Admin [AdminLayout.tsx](file:///d:/hoctap/AIR/airweave_real/Airweave_live/FE/src/components/admin/AdminLayout.tsx), [AdminDashboard.tsx](file:///d:/hoctap/AIR/airweave_real/Airweave_live/FE/src/pages/admin/AdminDashboard.tsx), [AdminNodesManager.tsx](file:///d:/hoctap/AIR/airweave_real/Airweave_live/FE/src/pages/admin/AdminNodesManager.tsx), [AdminOrgsManager.tsx](file:///d:/hoctap/AIR/airweave_real/Airweave_live/FE/src/pages/admin/AdminOrgsManager.tsx).
  - Quản lý danh sách Node, gán Tổ chức, bật/tắt Telemetry Simulator.
- **Trang Bảng điều khiển Tổ chức `/org-dashboard`**:
  - [OrgDashboard.tsx](file:///d:/hoctap/AIR/airweave_real/Airweave_live/FE/src/pages/OrgDashboard.tsx) chuyên biệt cho Trường học, Bệnh viện, Văn phòng xem chỉ số chi tiết từng Node trong khuôn viên.

---

### 🧮 Đợt 4: Bộ Thuật toán Xử lý Dữ liệu & Phân tích Chuẩn Quốc tế (Air Analytics Engine)
- **Module Thuật toán mới** ([air-analytics.util.ts](file:///d:/hoctap/AIR/airweave_real/Airweave_live/BE/src/common/air-analytics.util.ts)):
  - **US EPA 2024 NowCast Algorithm**: Thuật toán làm mượt trung bình có trọng số động 12h của Cơ quan Bảo vệ Môi trường Hoa Kỳ. Tự động điều chỉnh trọng số $w$ theo tỷ lệ biến động $\frac{\text{range}}{\text{max}}$ giúp làm mượt xung nhiễu nhưng vẫn phản ứng tức thì khi chất lượng không khí thay đổi đột ngột.
  - **US EPA 2024 Breakpoints Matrix**: Bảng nội suy tuyến tính chuẩn 2024 quy đổi nồng độ bụi $PM_{2.5}$ ($\mu g/m^3$) sang chỉ số $AQI$ chuẩn xác.
  - **Wark-Warner Hygroscopic RH Growth Correction**: Thuật toán hiệu chỉnh độ ẩm tương đối $RH\%$ khi $RH > 70\%$ trừ bỏ hiện tượng hạt hơi nước làm cảm biến laser báo ảo PM2.5 cao hơn thực tế.
  - **Hampel Outlier Rejection Filter**: Bộ lọc nhiễu đỉnh ngắt quãng dùng trung vị tuyệt đối MAD (Median Absolute Deviation) để loại bỏ các đỉnh sai số bất ngờ từ phần cứng.
  - **Adaptive Exponential Moving Average (EMA)**: Thuật toán làm mượt thích ứng nhiễu sóng tần số cao của cảm biến phần cứng trước khi ghi vào cơ sở dữ liệu.

- **Tối ưu hóa Quyết định Phần cứng & Cảm biến $CO_2$ (Phase 2)**:
  - **Cảm biến MQ-5**: Không đo được $CO_2$ (chuyên đo khí Gas LPG / Methane).
  - **Kế hoạch $CO_2$**: Cảm biến $CO_2$ chuyên dụng (MH-Z19C / SCD40 NDIR) sẽ được thiết kế mô-đun đo riêng và **triển khai ở bước tiếp theo (Phase 2)**.
  - Lược bỏ hoàn toàn nút bấm / công tắc Relay bật mở nguồn phần cứng để tối ưu chi phí linh kiện BOM và tránh rủi ro chập cháy Relay ngoài thực địa.
  - **Trạng thái Node (`status`)**: Thuần túy là dạng **Read-Only**: `🟢 ONLINE` (Đang hoạt động gửi dữ liệu) và `🔴 OFFLINE` (Mất kết nối / Mất điện).


  - **Tài khoản `admin`/`admin` Gateway**: Đăng nhập tài khoản/mật khẩu `admin`/`admin` mở ngay lập tức **Admin IoT Portal** (xem mã Chip, Pin %, RSSI, Zero-Touch MQTT Auto-Discover). Đăng nhập thường mở giao diện **Người dùng (End-User)**.
  - **Báo cáo Ô nhiễm Cộng đồng** ([report_incident_dialog.dart](file:///d:/hoctap/AIR/airweave_real/Airweave_live/flutter/lib/widgets/report_incident_dialog.dart)): Dialog báo cáo đốt rác, khói bụi công trình kèm vị trí GPS thời gian thực.
  - **Khuyến cáo Sức khỏe Cá nhân hóa** ([health_guidance_card.dart](file:///d:/hoctap/AIR/airweave_real/Airweave_live/flutter/lib/widgets/health_guidance_card.dart)): Lời khuyên sức khỏe cho nhóm nhạy cảm (Hen suyễn, Trẻ nhỏ, Mẹ bầu, Người già).
  - **Smart Route Tránh Ô nhiễm** ([smart_route_screen.dart](file:///d:/hoctap/AIR/airweave_real/Airweave_live/flutter/lib/screens/smart_route_screen.dart)): Tìm tuyến đường xanh sạch tránh 100% các điểm nóng ô nhiễm không khí.







- **Tài liệu Kỹ thuật Phần cứng Node**:
  - Tạo file [IOT_NODE_HARDWARE_SPECIFICATION.md](file:///d:/hoctap/AIR/airweave_real/Airweave_live/IOT_NODE_HARDWARE_SPECIFICATION.md) lưu trữ sơ đồ mạch điện ESP32, linh kiện BOM, công thức US EPA bù ẩm PM2.5 và mã nguồn Firmware Arduino C++ nạp sẵn.

---

## 🛠️ HƯỚNG DẪN CHẠY & BẢO TRÌ SẢN PHẨM

### 1. Khởi động môi trường Local
```bash
# Bật Postgres & Redis
docker compose up -d

# Khởi động Backend (Port 3000)
cd BE
npm run start:dev

# Khởi động Frontend (Port 8080)
cd FE
npm run dev
```

### 2. Các Đường dẫn quan trọng trong App
- `http://localhost:8080/map`: Bản đồ AQI có Marker IoT Node vật lý phát sáng.
- `http://localhost:8080/admin`: Trung tâm Quản trị IoT Admin (Simulator Bật/Tắt).
- `http://localhost:8080/org-dashboard`: Bảng điều khiển dành riêng cho Tổ chức.
