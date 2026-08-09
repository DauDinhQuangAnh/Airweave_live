# Module Thời tiết & Chất lượng Không khí — Thông số cần đo
Danh sách rút từ mã nguồn và thông số trạm đo AirWeave.

> **AQI không đo trực tiếp — được tính từ PM2.5 & các thông số ô nhiễm** (thang US EPA). Đo PM2.5 và khí độc là app tự tính ra AQI tương ứng.

## 1. Thông số môi trường & bụi cơ bản

| Thông số | Field | Đơn vị | Cảm biến khuyến nghị | Mức |
|---|---|---|---|---|
| Nhiệt độ | `temperature` | °C | BME280 / SHT31 | 🔴 Bắt buộc |
| Độ ẩm | `humidity` | % RH | BME280 / SHT31 | 🔴 Bắt buộc |
| Bụi PM2.5 | `pm25` | µg/m³ | SPS30 / PMS7003 | 🔴 Bắt buộc (→ AQI) |
| Bụi PM10 | `pm10` | µg/m³ | (chung SPS30) | 🔴 Bắt buộc |
| UV Index | `uv_index` | 0–11+ | VEML6075 / LTR390 | 🔴 Bắt buộc |

## 2. Thông số Khí độc (Lựa chọn Cảm biến Tối ưu)

> **Cảm biến khí độc tối ưu nhất: MiCS-6814 (3-in-1 MEMS Gas Sensor)**  
> Chỉ cần đúng **1 module cảm biến MiCS-6814** là đo được cả 3 nhóm khí độc nguy hiểm nhất đô thị.

| Khí độc | Field | Đơn vị | Kênh cảm biến MiCS-6814 | Mức | Mô tả / Tác hại |
|---|---|---|---|---|---|
| Cacbon Monoxit | `co` | ppm / µg/m³ | Kênh RED (Reductive) | 🔴 Bắt buộc | Khí độc từ ống bô xe cộ, khói đun đốt; gây ngạt, đau đầu |
| Nitơ Dioxit | `no2` | ppb / µg/m³ | Kênh NOX (Oxidizing) | 🔴 Bắt buộc | Khí độc từ động cơ dầu/xăng; gây viêm đường hô hấp, khởi phát hen |
| Amoniac & Khói độc | `nh3` | ppm | Kênh NH3 | 🟡 Tùy chọn | Khí khai độc hại từ rác thải, cống rãnh, phân hủy chất hữu cơ |

*(Tùy chọn bổ sung indoor nếu cần đo sơn/hóa chất: **Sensirion SGP40** xuất chỉ số `tvoc` qua I2C).*

## 3. Ghi chú phần cứng & cảm biến

- **Bụi:** 1 cảm biến (Sensirion SPS30) xuất đồng thời cả PM2.5 + PM10.
- **Khí độc tối ưu:** **MiCS-6814** (đo đồng thời 3 khí `co`, `no2`, `nh3` chỉ với 1 chip MEMS nhỏ gọn, tiết kiệm chi phí & chân pin ESP32).
- **Gió:** Lấy từ Open-Meteo API (không dùng cảm biến cơ học).
- **MCU:** ESP32 — đọc toàn bộ cảm biến qua I2C/UART/ADC, đóng gói và gửi JSON qua WiFi/MQTT.

## 4. JSON node gửi về backend

```json
{
  "lat": 21.0285,
  "lng": 105.8542,
  "station": "AWNODE-01",
  "source": "sensor-node",
  "temperature": 31,
  "humidity": 70,
  "pm25": 42.5,
  "pm10": 68.0,
  "uv_index": 8,
  "co": 1.2,
  "no2": 24.5,
  "nh3": 0.4,
  "snapshot_updated_at": "2026-08-06T15:00:00Z"
}
```
