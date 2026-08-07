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
| STT | Linh kiện | Model khuyên dùng | Chuẩn kết nối | Chức năng | Chi phí ước tính |
|---|---|---|---|---|---|
| 1 | Vi điều khiển | ESP32-WROOM-32D | Wi-Fi / Bluetooth | Xử lý logic, Deep Sleep, MQTT | ~70.000 VNĐ |
| 2 | Cảm biến Bụi mịn | Plantower PMS7003 | UART (GPIO16/17) | Đo PM1.0, PM2.5, PM10 bằng laser | ~350.000 VNĐ |
| 3 | Cảm biến Nhiệt Ẩm | Sensirion SHT30 | I2C (GPIO21/22) | Đo Nhiệt/Ẩm %, Bù ẩm PM2.5 | ~50.000 VNĐ |
| 4 | Cảm biến Tia UV | Lite-On LTR-390 | I2C (GPIO21/22) | Đo chỉ số Tia cực tím (UV Index) | ~75.000 VNĐ |
| 5 | Tấm pin Mặt trời | Solar Panel 5V - 6W | Khối nguồn | Cấp điện ban ngày | ~90.000 VNĐ |
| 6 | Mạch sạc & Pin | Mạch TP4056 + 2x Pin 18650 | Khối nguồn | Tích điện 5200mAh (Dùng đêm/mưa) | ~110.000 VNĐ |
| 7 | Vỏ hộp ngoài trời | Vỏ ABS chống nước IP65 | Khung vỏ | Chống mưa nắng ngoài trời | ~35.000 VNĐ |
| **TỔNG** | | | | **Đo Bụi + Nhiệt Ẩm + UV (Pin Solar)** | **~780.000 VNĐ** |

### B. Phiên bản 2: Indoor / Campus Grid Edition (Trong phòng học / Văn phòng / Sảnh)
| STT | Linh kiện | Model khuyên dùng | Chuẩn kết nối | Chức năng | Chi phí ước tính |
|---|---|---|---|---|---|
| 1 | Vi điều khiển | ESP32-WROOM-32D | Wi-Fi / Bluetooth | Xử lý logic 24/7, Realtime MQTT | ~70.000 VNĐ |
| 2 | Cảm biến Bụi mịn | Plantower PMS7003 | UART2 (GPIO16/17) | Đo PM1.0, PM2.5, PM10 | ~350.000 VNĐ |
| 3 | Cảm biến Nhiệt Ẩm | Sensirion SHT30 | I2C (GPIO21/22) | Đo Nhiệt độ & Độ ẩm % | ~50.000 VNĐ |
| 4 | Cảm biến Khí CO2 | Winsen MH-Z19C | UART1 (GPIO4/5) | Đo nồng độ CO2 (ppm) phòng học | ~180.000 VNĐ |
| 5 | Cảm biến Khí độc | Sensirion SGP40 | I2C (GPIO21/22) | Chỉ số khí độc VOC Index (0-500) | ~120.000 VNĐ |
| 6 | Nguồn Adapter | Adapter 5V / 2A Type-C | Nguồn điện lưới | Cấp điện 220V liên tục 24/7 | ~40.000 VNĐ |
| **TỔNG** | | | | **Đo Bụi + Nhiệt Ẩm + CO2 + VOCs (Điện 220V)** | **~810.000 VNĐ** |

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
