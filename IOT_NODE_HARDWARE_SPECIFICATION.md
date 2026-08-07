> **Tài liệu Kỹ thuật Chuẩn hóa**: Mô hình thiết kế 2 phiên bản IoT Node cảm biến đo chất lượng không khí dành cho dự án AirWeave.
> 
> ⚡ **Quyết định Thiết kế Phần cứng (Hardware Architecture Decision)**:
> - **KHÔNG sử dụng Module Relay công tắc Tắt/Mở phần cứng**: Để tối ưu chi phí linh kiện BOM, giảm nguy cơ cháy nổ mạch relay và đảm bảo thiết bị hoạt động thu thập dữ liệu đo đạc liên tục.
> - **Trạng thái Node (Status)**: Hoàn toàn là dạng **Chỉ Đọc (Read-Only Status)**:
>   - `🟢 ONLINE` (Đang hoạt động): Node phát nhịp tim (heartbeat/telemetry) liên tục về hệ thống.
>   - `🔴 OFFLINE` (Ngừng hoạt động / Mất kết nối): Node không gửi dữ liệu quá 5 phút (do mất điện/mất Wi-Fi).

---


## 📌 1. TỔNG QUAN 2 PHIÊN BẢN NODE (HARDWARE EDITIONS)

AirWeave hỗ trợ 2 phiên bản IoT Node phần cứng chuyên biệt cho từng môi trường:

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
│ • Nguồn: Pin Mặt Trời + Pin 18650     │            │ • Nguồn: Điện lưới 220V (Adapter 5V)  │
│ • Chế độ: Deep Sleep (Mỗi 5-10 phút) │            │ • Chế độ: Chạy liên tục 24/7 (4 sec) │
│ • Cảm biến:                          │            │ • Cảm biến:                          │
│   - PM2.5 / PM10 (Plantower PMS7003) │            │   - PM2.5 / PM10 (Plantower PMS7003) │
│   - Nhiệt/Ẩm (Sensirion SHT30)       │            │   - Nhiệt/Ẩm (Sensirion SHT30)       │
│   - Tia UV (LTR-390)                 │            │   - Khí CO2 (MH-Z19C / SCD40)        │
│ • Vỏ hộp: IP65 + Radiation Shield    │            │   - Khí độc VOCs (Sensirion SGP40)   │
└──────────────────────────────────────┘            └──────────────────────────────────────┘
```

---

## 📊 2. BẢNG CHI TIẾT CẢM BIẾN & LINH KIỆN (BOM)

### A. Phiên bản 1: Outdoor Solar Edition (Bên ngoài trường / Đường phố)
| STT | Linh kiện | Model khuyên dùng | Chuẩn kết nối | Chức năng | Ghi chú |
|---|---|---|---|---|---|
| 1 | **Vi điều khiển** | ESP32-S3 (Anten mở rộng IPEX/SMA) | Wi-Fi / Bluetooth | Xử lý logic, Deep Sleep, Anten râu thu sóng xa | *Module ESP32-S3 + Anten râu 8dBi* |
| 2 | **Cảm biến Bụi Laser** | Winsen ZH03B Laser | UART (GPIO16/17) | Đo PM1.0, PM2.5, PM10 bằng laser chính xác | *Cảm biến laser công nghiệp* |
| 3 | **Cảm biến Nhiệt Ẩm** | Sensirion SHT30 | I2C (GPIO21/22) | Đo Nhiệt/Ẩm %, Bù sấy nồm ẩm | *Mạch SHT30-D vỏ bọc* |
| 4 | **Cảm biến Tia UV** | UV UVM-30A (Op-Amp) | Analog (GPIO34) | Đo cường độ & chỉ số Tia cực tím (UV Index) | *Mạch khuếch đại tín hiệu UV* |
| 5 | **Tấm pin Mặt trời** | Solar Panel 5V - 6W | Khối nguồn | Cấp điện ban ngày | *Pin Solar khung nhôm ngoài trời* |
| 6 | **Mạch sạc & Pin** | TP4056 + 2x Pin 18650 | Khối nguồn | Tích điện 5200mAh (Dùng đêm/mưa) | *Khối pin dung lượng cao* |
| 7 | **Vỏ hộp bảo vệ** | Vỏ đúc ABS IP67 ngoài trời | Khung vỏ | Khung vỏ bảo vệ chuyên dụng ngoài trời | *Vỏ bọc chuyên dụng* |
| **BỘ THIẾT BỊ** | | | | **Đo Bụi ZH03B + SHT30 + UVM-30A (Pin Solar)** | *Trọn bộ thiết bị Outdoor* |

### B. Phiên bản 2: Indoor / Campus Grid Edition (Trong phòng học / Văn phòng / Sảnh)
| STT | Linh kiện | Model khuyên dùng | Chuẩn kết nối | Chức năng | Ghi chú |
|---|---|---|---|---|---|
| 1 | **Vi điều khiển** | ESP32-S3 (Anten mở rộng IPEX/SMA) | Wi-Fi / Bluetooth | Xử lý logic 24/7, Anten xuyên tường cực khỏe | *Module ESP32-S3 + Anten râu* |
| 2 | **Cảm biến Bụi Laser** | Winsen ZH03B Laser | UART2 (GPIO16/17) | Đo PM1.0, PM2.5, PM10 phòng học | *Cảm biến laser công nghiệp* |
| 3 | **Cảm biến Nhiệt Ẩm** | Sensirion SHT30 | I2C (GPIO21/22) | Đo Nhiệt độ & Độ ẩm % phòng học | *Mạch SHT30-D chính xác cao* |
| 4 | **Cảm biến UV** | UV UVM-30A | Analog (GPIO34) | Đo chỉ số UV môi trường | *Mạch khuếch đại UV* |
| 5 | **Cảm biến Khí Điện hóa** | Winsen ZE12A | UART1 (GPIO4/5) | Đo khí điện hóa đa chỉ số (CO/NO2/SO2/O3) | *Module điện hóa 4 chỉ số* |
| 6 | **Nguồn Adapter** | Adapter 5V / 2A Type-C | Nguồn điện lưới | Cấp điện 220V liên tục 24/7 qua cổng Type-C | *Nguồn chống nhiễu 5V/2A* |
| **BỘ THIẾT BỊ** | | | | **Đo Bụi ZH03B + SHT30 + UVM-30A + ZE12A (Nguồn Type-C)** | *Trọn bộ thiết bị Indoor* |




> 📌 **Ghi chú về Cảm biến $CO_2$ (Carbon Dioxide)**:
> - **Cảm biến MQ-5**: KHÔNG đo được $CO_2$ (MQ-5 là cảm biến bán dẫn chuyên đo khí Gas LPG, Methane $CH_4$, Khí đun nấu).
> - **Kế hoạch triển khai $CO_2$**: Cảm biến $CO_2$ chuyên dụng dạng quang phổ NDIR (**Winsen MH-Z19C** hoặc **Sensirion SCD40**) sẽ được thiết kế thành mô-đun đo riêng biệt và **triển khai tích hợp ở bước tiếp theo (Hardware Expansion Phase 2)**.

---


## ⚡ 3. SƠ ĐỒ MẠCH ĐIỆN TỔNG HỢP (PINOUT CONNECTIONS)

ESP32 kết nối chung tất cả cảm biến chuẩn I2C trên 2 chân `GPIO21` (SDA) và `GPIO22` (SCL):

```
                  ┌──────────────────────┐
                  │     ESP32 DevKit     │
                  │                      │
   Adapter/Pin5V─►│ VIN              3V3 ├────┬──► SHT30 VCC
   Adapter/GND ──►│ GND              GND ├────┼──► SHT30 GND
                  │                      │    ├──► LTR390 VCC
   PMS7003 VCC───►│ 5V               5V  ├────┴──► MH-Z19C VCC (5V)
   PMS7003 GND───►│ GND              GND ├───────► MH-Z19C GND
                  │                      │
   PMS7003 TX ───►│ GPIO16 (RX2)  GPIO21 ├────┬──► SHT30 SDA ──► LTR390 SDA ──► SGP40 SDA
   PMS7003 RX ◄───│ GPIO17 (TX2)  GPIO22 ├─┬  ├──► SHT30 SCL ──► LTR390 SCL ──► SGP40 SCL
                  │                      │ │  └───────────────────────────────────────
   MH-Z19C TX ───►│ GPIO4 (RX1)          │
   MH-Z19C RX ◄───│ GPIO5 (TX1)          │
                  └──────────────────────┘
```

---

## 🧮 4. THUẬT TOÁN XỬ LÝ SỐ LIỆU TẠI NODE (ON-NODE COMPUTATION)

### A. Hiệu chỉnh sai số Bụi mịn PM2.5 khi nồm ẩm (US EPA Formula):
khi độ ẩm $RH > 70\%$:
$$PM_{2.5\_corrected} = \frac{PM_{2.5\_raw}}{1 + 0.24 \times \left(\frac{RH}{100}\right)^2}$$

### B. Chỉ số Cảm nhận Nhiệt thực tế (Heat Index):
$$HI = -8.784 + 1.6113 \times T + 2.3385 \times RH - 0.146 \times T \times RH$$

---

## 🌐 5. CẤU TRÚC PAYLOAD MQTT GỬI VỀ AIRWEAVE BACKEND

- **Topic MQTT**: `airweave/nodes/{chip_id}/telemetry`
- **JSON Format**:

```json
{
  "chip_id": "ESP32-CVA-01",
  "edition": "outdoor_solar",
  "power_source": "solar",
  "pm25": 18.4,
  "pm10": 32.1,
  "temperature": 28.5,
  "humidity": 62.0,
  "uv_index": 5.4,
  "co2": 520,
  "voc_index": 35,
  "battery": 98,
  "rssi": -58
}
```

---

## 💻 6. MÃ NGUỒN ARDUINO C++ MẪU CHO ESP32

```cpp
#include <WiFi.h>
#include <PubSubClient.h>
#include <Wire.h>
#include <SHT31.h>
#include <HardwareSerial.h>

// Thông tin cấu hình WiFi & MQTT Server
const char* WIFI_SSID = "YOUR_WIFI_NAME";
const char* WIFI_PASS = "YOUR_WIFI_PASSWORD";
const char* MQTT_SERVER = "broker.airweave.vn";
const char* CHIP_ID = "ESP32-CVA-01";
const char* EDITION = "outdoor_solar"; // outdoor_solar hoặc indoor_grid

WiFiClient espClient;
PubSubClient client(espClient);
SHT31 sht;
HardwareSerial pmsSerial(2); // UART2 (RX2=16, TX2=17)

void setup() {
  Serial.begin(115200);
  pmsSerial.begin(9600, SERIAL_8N1, 16, 17);
  Wire.begin(21, 22);
  sht.begin(0x44);

  WiFi.begin(WIFI_SSID, WIFI_PASS);
  while (WiFi.status() != WL_CONNECTED) { delay(500); }

  client.setServer(MQTT_SERVER, 1883);
}

void loop() {
  if (!client.connected()) {
    while (!client.connected()) {
      client.connect(CHIP_ID);
      delay(1000);
    }
  }
  client.loop();

  static unsigned long lastTime = 0;
  if (millis() - lastTime > 4000) { // Gửi mỗi 4 giây
    lastTime = millis();
    sht.read();

    float temp = sht.getTemperature();
    float hum = sht.getHumidity();

    String json = "{";
    json += "\"chip_id\":\"" + String(CHIP_ID) + "\",";
    json += "\"edition\":\"" + String(EDITION) + "\",";
    json += "\"pm25\":18.5,";
    json += "\"pm10\":30.2,";
    json += "\"temperature\":" + String(temp, 1) + ",";
    json += "\"humidity\":" + String(hum, 1) + ",";
    json += "\"uv_index\":4.5,";
    json += "\"battery\":98,";
    json += "\"rssi\":" + String(WiFi.RSSI());
    json += "}";

    String topic = "airweave/nodes/" + String(CHIP_ID) + "/telemetry";
    client.publish(topic.c_str(), json.c_str());
  }
}
```
