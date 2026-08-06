# 📱 AirWeave Mobile App — Tài liệu Đặc tả Kỹ thuật & Mã nguồn

Tài liệu hướng dẫn và mô tả chi tiết toàn bộ kiến trúc, chức năng, luồng dữ liệu và hướng dẫn đóng gói ứng dụng **AirWeave Mobile App (Flutter / Android / iOS)** tại thư mục `flutter`.

---

## 🏛️ 1. Kiến trúc Tổng quan (Mobile Architecture)

- **Framework**: Flutter 3.x (Dart >= 3.0).
- **Thiết kế Giao diện**: Dark Glassmorphism High-Tech Theme (`#030810` background, `#06101E` surface, `#00E5FF` cyan accent, `#0077FE` secondary blue).
- **Quản lý Trạng thái (State Management)**: `Provider` / `MultiProvider` với `AuthProvider` và `LiveAirProvider`.
- **Bản đồ Di động**: `flutter_map` kết hợp `latlong2` và `RadarMarker` (Custom Animation 60fps).
- **Tích hợp Backend**: Kết nối REST API thời gian thực với NestJS Backend (`http://10.0.2.2:3000/api` cho Android Emulator, `http://<IP_LAN>:3000/api` cho máy thật).

---

## 📂 2. Cấu trúc Thư mục Mã nguồn (`/flutter`)

```text
flutter/
├── pubspec.yaml                        # Dependencies: http, provider, flutter_map, geolocator, latlong2, intl
├── android/
│   └── app/src/main/AndroidManifest.xml # Quyền Android: INTERNET, ACCESS_FINE_LOCATION, POST_NOTIFICATIONS
└── lib/
    ├── main.dart                       # Entrypoint ứng dụng & Điều hướng BottomNavigationBar
    ├── models/
    │   ├── iot_node.dart               # Model IoT Node (Outdoor Solar & Indoor Grid)
    │   ├── weather_data.dart           # Model Chất lượng Không khí & Trạm thời tiết
    │   └── organization.dart           # Model Trường học / Cơ quan / Bệnh viện
    ├── services/
    │   └── api_service.dart            # Client gọi REST API NestJS với Fallback Mock khi mất mạng
    ├── providers/
    │   ├── auth_provider.dart          # Quản lý Đăng nhập, lưu SharedPreferences, phân quyền admin/admin
    │   └── live_air_provider.dart      # Quản lý vị trí GPS, Haversine, Hysteresis Geofencing (<500m)
    ├── widgets/
    │   ├── node_proximity_badge.dart   # Banner kết nối trực tiếp với Node gần nhất (<500m)
    │   ├── radar_marker.dart           # Marker sóng Radar Cyan nhấp nháy 60fps trên bản đồ
    │   ├── health_guidance_card.dart   # Thẻ Khuyến cáo Sức khỏe cho nhóm nhạy cảm
    │   └── report_incident_dialog.dart # Dialog gửi Báo cáo Ô nhiễm Cộng đồng
    └── screens/
        ├── login_screen.dart           # Màn hình Đăng nhập (với Preset 1-Click admin/admin & User demo)
        ├── dashboard_screen.dart       # Màn hình Dashboard AQI vi vùng & Node lân cận
        ├── air_map_screen.dart         # Màn hình Bản đồ vi vùng tương tác
        ├── smart_route_screen.dart     # Màn hình Lộ trình Tránh Ô nhiễm Smart Route
        ├── org_dashboard_screen.dart   # Màn hình Bảng điều khiển vi vùng Tổ chức
        └── admin_nodes_screen.dart     # Màn hình Admin Quản lý Phần cứng & Auto-Discovery
```

---

## 🔐 3. Phân quyền & Đăng nhập Role-Based (Auth Gateway)

Ứng dụng hỗ trợ cơ chế điều hướng linh hoạt dựa trên quyền đăng nhập:

| Loại Tài khoản | Tài khoản / Mật khẩu | Các Màn hình & Tab Được Mở |
| :--- | :--- | :--- |
| **🛠️ Admin Quản trị** | `admin` / `admin` | **Tổng quan**, **Bản đồ**, **Tổ chức**, **⚡ IoT Admin** (xem mã Chip, Pin %, RSSI dBm, kích hoạt Zero-Touch MQTT Auto-Discover) |
| **👤 Người dùng Thường** | `User Demo` / `123456` | **Tổng quan**, **Bản đồ**, ** Smart Route**, **Tổ chức** (giao diện xem chỉ số AQI công cộng, giấu thông số pin/chip) |
| **🌐 Khách** | Bấm *"Tiếp tục với tư cách Khách"* | Giao diện Người dùng cơ bản, tra cứu AQI tại chỗ |

---

## 🚀 4. Chi tiết 8 Chức năng Nổi bật trên Mobile

### 1. 📊 Màn hình Dashboard AQI Vi vùng Thời gian thực (`dashboard_screen.dart`)
- Thẻ AQI khổng lồ đổi màu động theo quy chuẩn US EPA 2024 (*Xanh tốt $\rightarrow$ Vàng $\rightarrow$ Cam $\rightarrow$ Đỏ $\rightarrow$ Tím $\rightarrow$ Nâu nguy hại*).
- Hiển thị đầy đủ 4 chỉ số phụ: nồng độ bụi mịn $PM_{2.5}$, $PM_{10}$, Nhiệt độ (°C), Độ ẩm ($RH\%$).

### 2. 🎯 Tự động Nhận diện Node vật lý gần nhất <500m (`live_air_provider.dart`)
- Tự động tính khoảng cách Haversine từ vị trí GPS người dùng đến các Node cảm biến.
- Thuật toán **Hysteresis Geofencing**: Đi vào bán kính $\le 500\text{m} \rightarrow$ Kết nối Node. Đi xa $> 650\text{m} \rightarrow$ Mới ngắt kết nối.
- Khi kết nối, ứng dụng đè (override) 100% dữ liệu đo thực tế từ Node kèm Banner phát sáng `NodeProximityBadge`.

### 3. ⚡ Bản đồ Vi vùng Sóng Radar Cyan 60fps (`air_map_screen.dart` & `radar_marker.dart`)
- Bản đồ tương tác dark mode `flutter_map` (OpenStreetMap / CartoDB).
- Hiển thị các IoT Node bằng Marker sóng Radar Cyan lan tỏa liên tục (`RadarMarker`).
- Bấm vào Marker mở Modal Sheet xem chi tiết nồng độ khí $CO_2$, tia $UV$, độ ẩm, nhiệt độ và loại nguồn (*Solar / Điện lưới*).

### 4. 📢 Báo cáo Ô nhiễm Cộng đồng (`report_incident_dialog.dart`)
- Người dùng bấm nút **"⚠️ Báo cáo Ô nhiễm"** để khai báo các sự cố khói bụi tại chỗ (*Đốt rác, Khói công trình, Xe xả khói đen, Mùi hóa chất*).
- Tự động gắn tọa độ GPS hiện tại vào báo cáo để gửi lên hệ thống.

### 5. 🫁 Khuyến cáo Sức khỏe Cá nhân hóa (`health_guidance_card.dart`)
- Đưa ra lời khuyên sức khỏe phù hợp với từng đối tượng: *Người khỏe mạnh, Hen suyễn / Hô hấp, Trẻ nhỏ, Người cao tuổi*.
- Khuyến nghị việc đeo khẩu trang N95, bật máy lọc không khí hoặc hạn chế hoạt động ngoài trời.

### 6. 🛣️ Lộ trình Tránh Ô nhiễm Smart Route (`smart_route_screen.dart`)
- Nhập điểm đi và điểm đến để so sánh giữa 2 tuyến đường:
  - 🟢 **Lộ trình Xanh Sạch AirWeave** (AQI 42, giảm 68% phơi nhiễm bụi mịn).
  - 🔴 **Lộ trình Ngắn nhất** (AQI 145, đi qua các điểm nghẽn ô nhiễm khói xe).

### 7. 🏢 Bảng điều khiển Vi vùng Tổ chức (`org_dashboard_screen.dart`)
- Dành cho Quản lý Trường học / Tòa nhà Keangnam / Bệnh viện xem danh sách các Node thuộc quản lý của mình và tình trạng môi trường trong khuôn viên.

### 8. 🛠️ IoT Admin & Zero-Touch MQTT Auto-Discovery (`admin_nodes_screen.dart`)
- Dành riêng cho Admin khi đăng nhập `admin`/`admin`.
- Rà soát dung lượng pin 🔋 %, mức sóng 📶 dBm, mã chip_id, topic MQTT.
- Nút bấm **`⚡ Zero-Touch MQTT Auto-Discover`** giả lập thợ kỹ thuật cắm nguồn thiết bị mới tinh để ứng dụng tự động nhận diện trong 1-Click!

---

## 🛠️ 5. Hướng dẫn Biên dịch & Đóng gói File `.apk` (Android Build Guide)

### Bước 1: Mở terminal tại thư mục `flutter`
```bash
cd d:/hoctap/AIR/airweave_real/Airweave_live/flutter
```

### Bước 2: Tải các thư viện phụ thuộc
```bash
flutter pub get
```

### Bước 3: Đóng gói bản Release APK cho Android
```bash
flutter build apk --release
```

### Kết quả:
File cài đặt `app-release.apk` sẽ được sinh ra tại:
`d:/hoctap/AIR/airweave_real/Airweave_live/flutter/build/app/outputs/flutter-apk/app-release.apk`

Bạn chỉ cần copy file `.apk` này sang điện thoại Android bất kỳ để cài đặt và sử dụng ngay!
