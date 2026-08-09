# BẢN THUYẾT MINH DỰ ÁN AIRWEAVE 2026
## HỆ THỐNG MẠNG LƯỚI IOT NODES QUAN TRẮC VI KHÍ HẬU VÀ NỀN TẢNG DỮ LIỆU SỨC KHỎE HÔ HẤP THÔNG MINH

> **Tài liệu Thuyết minh Chính thức (Phiên bản Cập nhật 2026)**
> **Cơ quan phát triển**: Đội ngũ Dự án AirWeave
> **Lĩnh vực**: Công nghệ Môi trường (CleanTech) / Công nghệ Y tế Sức khỏe (HealthTech) / Internet vạn vật (IoT) / Trí tuệ Nhân tạo (AI)

---

## 📌 I. THÔNG TIN SƠ LƯỢC DỰ ÁN & ĐỘI NGŨ THỰC HIỆN

### 1. Thông tin chung
- **Tên dự án**: AirWeave — Nền tảng Giám sát Chất lượng Không khí Vi vùng & Cảnh báo Sức khỏe Hô hấp Khẩn cấp.
- **Lĩnh vực hoạt động**: Smart City, IoT Hardware, Environmental Health SaaS, AI Analytics.
- **Trạng thái hiện tại**: Đã hoàn thiện thiết kế bản vẽ phần cứng IoT Nodes 2.0 (Outdoor Solar & Indoor Grid Edition), thử nghiệm firmware ESP32-S3, ra mắt hệ thống Web & Mobile Web PWA, hoàn thiện phân hệ Admin Management & Enterprise Org Dashboard, hoàn thiện hồ sơ y tế Medical ID & SOS Engine.
- **Thành tựu & Giải thưởng**:
  - Quán quân UFM LaunchPad 50 - Beyond Startup 2026.
  - Quán quân Smart City 2025 (NIION Biotech).
  - Á quân Digital Innovation C.P Cup 2025.
  - Chung kết UFM Startup 2026.

### 2. Đội ngũ 3 nhân sự nòng cốt sáng lập (Founding Team)
| STT | Họ và tên | Vai trò | Chuyên ngành | Thành tích & Trách nhiệm |
|---|---|---|---|---|
| 1 | **Đoàn Thị Mỹ Trinh** | Chief Executive Officer (CEO) | Marketing — ĐH Tài chính Marketing | Điều hành chung, chiến lược Go-To-Market, gọi vốn & đối ngoại B2B/B2G. Quán Quân UFM LaunchPad 50 - Beyond Startup 2026; Quán quân Smart City 2025; Á quân Digital Innovation C.P Cup 2025. |
| 2 | **Đậu Đình Quang Anh** | Chief Technology Officer (CTO / QA) | Hệ thống Thông tin — ĐH CNTT ĐHQG TP.HCM | Kiến trúc hạ tầng phần cứng IoT Nodes, Firmware ESP32-S3, backend API NestJS, AI Engine & Admin Portal. Khóa luận 8,75/10; Chứng chỉ AI Engineer Path (Scrimba); Agile Scrum Developer. |
| 3 | **Võ Minh Nghĩa** | Chief Product Officer (CPO) | Khoa học Máy tính — ĐH Greenwich Việt Nam | Quản lý sản phẩm, thiết kế giao diện UI/UX 3D Glassmorphic, trải nghiệm người dùng User Experience. Sinh viên xuất sắc 2025; Quán quân Tin học trẻ 2022. |

---

## 💥 II. BỐI CẢNH VĨ MÔ, BA LỖ HỔNG VÀ INSIGHT ĐỘC BẢN

### 1. Khủng hoảng chất lượng không khí tại Việt Nam
Việt Nam liên tục nằm trong nhóm các quốc gia có chỉ số ô nhiễm không khí cao tại Đông Nam Á. Hà Nội và TP. Hồ Chí Minh thường xuyên ghi nhận chỉ số AQI vượt ngưỡng 150–200 (Mức Nguy hại cho sức khỏe), với nồng độ bụi mịn PM2.5 cao gấp 5–8 lần khuyến nghị của Tổ chức Y tế Thế giới (WHO).

Các bệnh lý đường hô hấp cấp và mạn tính (Hen suyễn, Viêm phế quản, Bệnh phổi tắc nghẽn mạn tính COPD, Dị ứng thời tiết) gia tăng nhanh chóng, đặc biệt ở nhóm đối tượng dễ bị tổn thương: Trẻ em, Người cao tuổi và Phụ nữ mang thai.

### 2. Ba lỗ hổng công nghệ & thị trường chưa được giải quyết
1. **Lỗ hổng 1: Thiếu dữ liệu vi khí hậu vi vùng (Lack of Hyper-local Data)**:
   - Các trạm đo truyền thống của nhà nước hoặc tổ chức quốc tế (IQAir, WAQI) có bán kính bao phủ quá rộng (5–10km/trạm), không phản ánh chính xác chất lượng không khí thực tế tại từng con phố, cổng trường học hay khu công nghiệp.
2. **Lỗ hổng 2: Dữ liệu ô nhiễm mang tính "thụ động", không kết nối với Y tế hô hấp**:
   - Các ứng dụng hiện nay chỉ hiển thị con số AQI thuần túy mà không cho người dùng biết con số đó ảnh hưởng thế nào đến tình trạng bệnh lý của riêng họ, không cung cấp lộ trình di chuyển giảm phơi nhiễm (Smart Route) và thiếu cơ chế cứu hộ y tế khẩn cấp SOS khi gặp sự cố bùng phát hô hấp.
3. **Lỗ hổng 3: Thiếu hạ tầng phần cứng IoT Nodes tự chủ, chi phí thấp**:
   - Thiết bị nhập khẩu chính ngạch có giá thành đắt đỏ (từ 50–200 triệu VNĐ/trạm), khó nhân rộng đại đại trà cho trường học, khu dân cư hay doanh nghiệp vừa và nhỏ.

### 3. Insight độc bản của AirWeave
> **Giá trị cốt lõi của AirWeave không nằm ở một ứng dụng xem thời tiết thông thường — mà nằm ở Hệ sinh thái Hạ tầng Mạng lưới IoT Nodes kết hợp với Tập dữ liệu Zero-Party Y tế Hô hấp.**

Khi người dùng thiết lập **Medical ID** (Hồ sơ y tế hô hấp 30 giây), AirWeave liên kết chỉ số phơi nhiễm PM2.5/khí độc theo tọa độ thời gian thực với bệnh lý cá nhân. Điều này giúp AirWeave sở hữu tập dữ liệu dịch tễ học môi trường – y tế có độ phân giải cao nhất, mở ra cơ hội hợp tác chiến lược với các Tập đoàn Dược phẩm, Công ty Tái bảo hiểm và Cơ quan Quản lý Đô thị Thông minh.

---

## ⚡ III. THIẾT KẾ PHẦN CỨNG IOT NODES & CƠ CHẾ VẬN HÀNH HỆ THỐNG

Để giải quyết bài toán thiếu trạm đo vi khí hậu, AirWeave đã nghiên cứu và chuẩn hóa **Tài liệu Kỹ thuật Phần cứng IoT Node 2.0** với 2 phiên bản phần cứng chuyên biệt:

```
                  ┌─────────────────────────────────────────────────────────┐
                  │             AIRWEAVE IOT NODE HARDWARE                  │
                  └───────────────────────────┬─────────────────────────────┘
                                              │
                    ┌─────────────────────────┴─────────────────────────┐
                    │                                                   │
    ▼                                                   ▼
┌──────────────────────────────────────┐            ┌──────────────────────────────────────┐
│ ☀️ PHIÊN BẢN OUTDOOR SOLAR           │            │ 🔌 PHIÊN BẢN INDOOR / CAMPUS GRID    │
├──────────────────────────────────────┤            ├──────────────────────────────────────┤
│ • Nguồn: Solar Panel + 2x Pin 18650  │            │ • Nguồn: Điện lưới 220V (Adapter 5V)  │
│ • Chế độ: Deep Sleep (Mỗi 5-10 phút) │            │ • Chế độ: Chạy liên tục 24/7 (4 sec) │
│ • Cảm biến:                          │            │ • Cảm biến:                          │
│   - PM1.0/2.5/10 (Winsen ZH03B Laser)│            │   - PM1.0/2.5/10 (Winsen ZH03B Laser)│
│   - Nhiệt/Ẩm (Sensirion SHT30)       │            │   - Nhiệt/Ẩm (Sensirion SHT30)       │
│   - Tia UV (UVM-30A / LTR-390)       │            │   - Khí CO2 NDIR (Winsen MH-Z19C)    │
│   - Khí độc (Winsen ZE12A 4-in-1)    │            │   - Khí độc VOCs (Sensirion SGP40)   │
│ • Vỏ hộp: Đúc ABS IP67 Chống nước    │            │   - Khí độc (Winsen ZE12A 4-in-1)    │
└──────────────────────────────────────┘            └──────────────────────────────────────┘
```

---

### 1. Bảng Chi tiết Cấu hình Linh kiện Hardware (BOM)

#### A. Phiên bản 1: Outdoor Solar Edition (Ngoài trời / Công viên / Đường phố)
| STT | Linh kiện | Model chuẩn | Chuẩn giao tiếp | Chức năng kỹ thuật | Ghi chú |
|---|---|---|---|---|---|
| 1 | **Vi điều khiển (MCU)** | ESP32-S3 (Anten râu IPEX/SMA) | Wi-Fi 802.11 b/g/n / Bluetooth 5.0 | Xử lý logic, thuật toán EMA, hỗ trợ Deep Sleep | Anten râu 8dBi thu sóng xuyên vật cản |
| 2 | **Cảm biến Bụi Laser** | Winsen ZH03B Laser | UART2 (GPIO16/17) | Đo nồng độ bụi PM1.0, PM2.5, PM10 bằng cảm biến laser công nghiệp chính xác | Tuổi thọ nguồn laser > 10.000 giờ |
| 3 | **Cảm biến Nhiệt/Ẩm** | Sensirion SHT30 | I2C (GPIO21/22) | Đo Nhiệt độ (°C) và Độ ẩm (RH%), cấp dữ liệu bù sấy nồm ẩm | Mạch bọc màng chống sương nồm |
| 4 | **Cảm biến Tia UV** | UVM-30A / LTR-390 | Analog (GPIO34) / I2C | Đo cường độ tia cực tím và tính chỉ số UV Index | Mạch khuếch đại tín hiệu cực tím |
| 5 | **Cảm biến Khí Điện hóa** | Winsen ZE12A (4-in-1) | UART1 (GPIO4/5) | Đo các nhóm khí độc nguy hiểm đô thị: $CO$, $NO_2$, $SO_2$, $O_3$ | Module điện hóa 4 kênh |
| 6 | **Module Truyền dữ liệu di động** | SIM 4G LTE / NB-IoT (A7670C / SIM7080G) / LoRa SX1276 | UART3 / SIM Slot | Truyền dữ liệu di động 4G về Server khi lắp đặt ngoài đường phố không có Wi-Fi | Bắt buộc cho trạm Outdoor không có Wi-Fi |
| 7 | **Khối Nguồn Solar** | Solar Panel 5V / 6W | Mạch sạc TP4056 | Hấp thụ năng lượng mặt trời ban ngày | Khung nhôm kính cường lực chống nước |
| 8 | **Khối Pin lưu trữ** | 2x Pin Lithium 18650 | Khối nguồn | Tích trữ 5200mAh giúp node hoạt động liên tục đêm/mưa | Đạt chuẩn an toàn cháy nổ |
| 9 | **Vỏ hộp bảo vệ** | Vỏ đúc ABS IP67 | Khung vỏ | Bảo vệ chống mưa nắng, bụi bẩn, va đập ngoài trời | Đạt chuẩn kháng nước IP67 |

#### B. Phiên bản 2: Indoor Campus Grid Edition (Trong phòng học / Văn phòng / Sảnh)
| STT | Linh kiện | Model chuẩn | Chuẩn giao tiếp | Chức năng kỹ thuật | Ghi chú |
|---|---|---|---|---|---|
| 1 | **Vi điều khiển (MCU)** | ESP32-S3 (Dual-Core 240MHz) | Wi-Fi / Bluetooth | Xử lý logic 24/7, phát tín hiệu telemetry mỗi 4 giây | Tích hợp ROM/RAM dung lượng cao |
| 2 | **Cảm biến Bụi Laser** | Winsen ZH03B Laser | UART2 (GPIO16/17) | Đo nồng độ bụi mịn PM2.5, PM10 trong không gian kín | Đọc hạt bụi liên tục 24/7 |
| 3 | **Cảm biến Nhiệt/Ẩm** | Sensirion SHT30 | I2C (GPIO21/22) | Giám sát độ ẩm và nhiệt độ phòng học/văn phòng | Độ chính xác cao ±0.2°C, ±2% RH |
| 4 | **Cảm biến $CO_2$ NDIR** | Winsen MH-Z19C / SCD40 | UART1 (GPIO4/5) / I2C | Cảm biến quang phổ NDIR đo nồng độ $CO_2$ bí khí phòng học (ppm) | Ngăn ngừa tình trạng thiếu oxy, buồn ngủ |
| 5 | **Cảm biến Khí độc VOCs** | Sensirion SGP40 | I2C (GPIO21/22) | Giám sát chỉ số hợp chất hữu cơ dễ bay hơi VOC Index (Sơn, khói, hóa chất) | Thuật toán VOC Index tích hợp sẵn |
| 6 | **Cảm biến Khí Điện hóa** | Winsen ZE12A (4-in-1) | UART1 (GPIO4/5) | Đo khí điện hóa đa chỉ số ($CO$, $NO_2$, $SO_2$, $O_3$) | Phát hiện rò rỉ khí độc |
| 7 | **Nguồn cấp điện** | Adapter 5V / 2A Type-C | Điện lưới 220V | Cấp điện liên tục 24/7 qua cổng USB Type-C | Chống sụt áp, chống nhiễu sóng |

---

### 2. Quyết định Kiến trúc Phần cứng (Hardware Architecture Decisions)

1. **KHÔNG sử dụng Module Relay công tắc Tắt/Mở phần cứng**:
   - *Lý do kỹ thuật*: Nhằm tối ưu chi phí linh kiện BOM, loại bỏ nguy cơ cháy nổ mạch rơ-le do đóng cắt liên tục và đảm bảo trạm cảm biến thu thập dữ liệu vi khí hậu liên tục 24/7 mà không bị ngắt quãng.
2. **Cơ chế Trạng thái Node Chỉ Đọc (Read-Only Status)**:
   - `🟢 ONLINE` (Đang hoạt động): Node phát nhịp tim (heartbeat) và gói tin telemetry liên tục về server (mỗi 4 giây với bản Indoor Grid hoặc mỗi 5–10 phút sau chu kỳ Deep Sleep với bản Outdoor Solar).
   - `🔴 OFFLINE` (Ngừng hoạt động / Mất kết nối): Hệ thống đánh dấu Offline khi Node không phát dữ liệu quá 5 phút (do mất nguồn điện lưới hoặc mất sóng Wi-Fi).
   - `🟡 WARNING` (Cảnh báo ô nhiễm / Lỗi cảm biến): Phát hiện chỉ số $AQI \ge 158$ hoặc $VOCs \ge 300$.

---

### 3. Năm Cơ chế Vận hành Chuẩn hóa của Mạng lưới IoT Nodes

#### Mechanism 1: Giao thức Truyền dữ liệu MQTT Streaming & WebSockets
Các IoT Node đóng gói chỉ số đo thành chuỗi JSON tiêu chuẩn và phát về MQTT Broker theo chủ đề:
`airweave/nodes/{chip_id}/telemetry`

*Cấu trúc JSON Payload mẫu từ Node*:
```json
{
  "chip_id": "AWNODE-HN01",
  "hardware_ver": "v2.4-esp32s3",
  "edition": "outdoor_solar",
  "pm25": 18.5,
  "pm10": 32.0,
  "temp": 29.5,
  "hum": 68.0,
  "co2": 410,
  "voc_index": 45,
  "uv_index": 6.2,
  "co": 0.4,
  "no2": 12.5,
  "battery": 98,
  "rssi": -58,
  "timestamp": 1754611200
}
```

#### Mechanism 2: Thuật toán Xử lý Số liệu tại Trạm (On-Node Edge Computation)
- **Thuật toán EMA (Adaptive Exponential Moving Average)**: Làm mượt nhiễu xung tần số cao của cảm biến bụi mịn do bụi thô phát tán trước khi ghi dữ liệu vào cơ sở dữ liệu NestJS.
- **Thuật toán Wark-Warner Hygroscopic RH Growth Correction**: Khi độ ẩm không khí $RH > 70\%$, hơi nước đọng làm tia laser bị khúc xạ ảo gây báo tăng $PM2.5$. Thuật toán tự động bù trừ chỉ số $PM2.5_{calibrated}$ theo công thức:
  $$PM2.5_{calibrated} = \frac{PM2.5_{raw}}{1 + a \cdot \left(\frac{RH}{100 - RH}\right)^b}$$

#### Mechanism 3: Cơ chế Backup & Fallback Thông minh (WAQI / Open-Meteo Integration)
- Nếu một trạm đo vật lý bị ngắt điện hoặc mất kết nối quá 15 phút, hệ thống backend NestJS tự động chuyển sang chế độ **Virtual Node Backup**:
  - Lấy dữ liệu từ Trạm tham chiếu WAQI (World Air Quality Index) gần nhất trong bán kính 5km.
  - Kết hợp chỉ số thời tiết từ Open-Meteo API.
  - Đảm bảo bản đồ vi khí hậu trên ứng dụng người dùng không bao giờ bị đứt đoạn hoặc thủng dữ liệu.

#### Mechanism 4: Cơ chế Phân gán Tổ chức & Cấp quyền Khóa API (Node Registration & Org Assignment)
- **Tự động đăng ký (Auto-Discovery)**: Khi cắm điện một ESP32 mới, server phát hiện `chip_id` lạ và đưa vào danh sách **Trụ tự do (Chưa gán tổ chức)**.
- **Cấp khóa API Secret**: Mỗi trạm hoặc đối tác Doanh nghiệp được cấp một mã khóa bảo mật (`awk_node_live_9f823...`) để xác thực gói tin MQTT, ngăn chặn tấn công giả mạo dữ liệu (Spoofing Attack).
- **Phân gán linh hoạt**: Admin có thể gán hoặc hủy gán trụ đo cho các Tổ chức/Trường học (Sở TN&MT Hà Nội, UBND TP.HCM, ĐHQG Hà Nội, SHTP...) chỉ với 1-click trên giao diện Admin.

#### Mechanism 5: Cơ chế Tự động Kích hoạt Cảnh báo Khẩn cấp (Auto Dispatch Alarm Rules)
- Khi bất kỳ trạm đo nào ghi nhận chỉ số ô nhiễm nguy hại ($AQI \ge 150$, $CO_2 \ge 1000ppm$, hoặc rò rỉ khí độc $CO/NO_2$), hệ thống tự động:
  1. Bắn thông báo **Push Notification** đến toàn bộ người dùng đang ở trong bán kính 3km của trạm.
  2. Gửi tin nhắn **SMS SOS Khẩn cấp** cho Đại diện Ban quản trị Tổ chức sở hữu trạm đo để kịp thời di dời học sinh/bệnh nhân.

---

## 📱 IV. HỆ SINH THÁI TÍNH NĂNG ỨNG DỤNG & GIAO DIỆN QUẢN TRỊ

```
                     ┌─────────────────────────────────────────────────────────┐
                     │              AIRWEAVE ECOSYSTEM 2026                    │
                     └───────────────────────────┬─────────────────────────────┘
                                                 │
        ┌────────────────────────────────────────┼────────────────────────────────────────┐
        │                                        │                                        │
        ▼                                        ▼                                        ▼
┌──────────────────────────────┐        ┌──────────────────────────────┐        ┌──────────────────────────────┐
│ 🏥 AIRWEAVE SOS & MEDICAL ID │        │ 🗺️ BẢN ĐỒ VI KHÍ HẬU & AI    │        │ 🏛️ PHÂN HỆ ADMIN PORTAL      │
├──────────────────────────────┤        ├──────────────────────────────┤        ├──────────────────────────────┤
│ • Kích hoạt Hồ sơ y tế 30s   │        │ • Lưới vi vùng 500m × 500m   │        │ • Dashboard Giám sát Realtime│
│ • Thẻ QR Cứu hộ Y tế SOS     │        │ • Smart Route (Tìm đường sạch│        │ • Quản lý IoT Nodes sơ bộ    │
│ • Live GPS Location Sharing  │        │ • Trợ lý AI Khuyên bảo Hô hấp│        │ • Quản lý Tổ chức & Gói cước │
│ • Bilingual VI / EN 100%     │        │ • Báo cáo Ô nhiễm Cộng đồng  │        │ • Cấu hình Ngưỡng Cảnh báo   │
└──────────────────────────────┘        └──────────────────────────────┘        └──────────────────────────────┘
```

### 1. Phân hệ Cứu hộ Y tế Hô hấp Khẩn cấp (AirWeave SOS & Medical ID)
- **Kích hoạt nhanh 30 giây**: Cho phép người dùng nhập 4 thông tin thiết yếu (*Họ tên, SĐT Người thân khẩn cấp, Ngày sinh, Bệnh lý hô hấp*) để có ngay Thẻ Medical ID hợp lệ.
- **Thẻ QR Cứu hộ Y tế**: Nhân viên y tế quét mã QR công khai để xem nhóm máu, tiền sử hen suyễn, dị ứng thuốc và SĐT người thân.
- **Song ngữ Việt - Anh (Bilingual 100%)**: Toàn bộ thẻ Medical ID và các nút bấm SOS đều hỗ trợ hoàn hảo cả 2 ngôn ngữ.

### 2. Phân hệ Admin Management & Org Dashboard (Giao diện Quản trị Chuyên nghiệp)
- **Mô hình giao diện Sơ bộ & Pop-up Chi tiết (Summary View + Detail Modal)**:
  - *Bên ngoài*: Các trang Admin (`/admin`, `/admin/nodes`, `/admin/orgs`, `/admin/alerts`, `/admin/api-keys`) hiển thị thông tin thẻ/bảng tóm tắt rút gọn.
  - *Khi click vào*: Mở Pop-up Modal hiển thị 100% dữ liệu chi tiết, thông số cảm biến BOM, secret key, thanh trượt kéo chỉnh ngưỡng ô nhiễm.
  - *Click ngoài nền mờ (Backdrop Click)*: Tự động tắt Pop-up tức thì.

---

## 💰 V. MÔ HÌNH KINH DOANH & PHÂN TÍCH TÀI CHÍNH

### 1. Nguồn doanh thu đa dạng (Dòng tiền B2C, B2B & B2G)
1. **B2C Premium Subscription (29.000 – 49.000 VNĐ/tháng)**: Người dùng cá nhân đăng ký gói Premium để mở khóa Trợ lý AI Khuyên bảo Hô hấp chuyên sâu và Smart Route.
2. **B2B Hardware & SaaS Monitoring Node (15 – 25 triệu VNĐ/trạm)**: Bán trạm đo IoT Nodes (Outdoor Solar / Indoor Grid Edition) kèm gói phần mềm quản trị Org Dashboard cho Trường học, Khu đô thị, Khu công nghiệp.
3. **B2G & Enterprise Data API (Air Twin API)**: Cung cấp API dữ liệu vi khí hậu vi vùng cho cơ quan nhà nước và doanh nghiệp.

### 2. Dự phóng Tài chính 3 năm (P&L Forecast)
| Chỉ số Tài chính | Năm 1 (2026) | Năm 2 (2027) | Năm 3 (2028) |
|---|---|---|---|
| **Số lượng Nodes triển khai** | 150 Trạm | 800 Trạm | 3.500 Trạm |
| **Người dùng hoạt động hàng tháng (MAU)** | 50.000 MAU | 300.000 MAU | 1.500.000 MAU |
| **TỔNG DOANH THU** | **3,25 Tỷ VNĐ** | **20,0 Tỷ VNĐ** | **95,0 Tỷ VNĐ** |
| **Lợi nhuận ròng (Net Profit)** | **450 Triệu VNĐ** | **4,8 Tỷ VNĐ** | **28,5 Tỷ VNĐ** |

---

## 🏁 VI. KẾT LUẬN

AirWeave là một **Hệ sinh thái Toàn diện đã được thử nghiệm thực tế** từ thiết kế phần cứng vi điều khiển ESP32-S3, hạ tầng truyền tin MQTT, thuật toán xử lý dữ liệu cảm biến, cho đến ứng dụng di động cứu hộ y tế và phân hệ quản trị IoT Admin Portal với đội ngũ 3 thành viên nòng cốt (CEO Mỹ Trinh, CTO Quang Anh, CPO Minh Nghĩa).
