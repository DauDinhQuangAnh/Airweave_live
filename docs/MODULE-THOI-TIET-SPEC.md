# Module Thời tiết — Thông số cần đo
 Danh sách rút từ mã nguồn AirWeave.

> **AQI không đo — được tính từ PM2.5** (thang US EPA). Đo PM2.5 là app tự ra AQI.

## Thông số & cảm biến

| Thông số | Field | Đơn vị | Cảm biến | Mức |
|---|---|---|---|---|
| Nhiệt độ | `temperature` | °C | BME280 / SHT31 | 🔴 Bắt buộc |
| Độ ẩm | `humidity` | % RH | BME280 / SHT31 | 🔴 Bắt buộc |
| Bụi PM2.5 | `pm25` | µg/m³ | SPS30 / PMS7003 | 🔴 Bắt buộc (→ AQI) |
| Bụi PM10 | `pm10` | µg/m³ | (chung SPS30) | 🔴 Bắt buộc |
| UV Index | `uv_index` | 0–11+ | VEML6075 / LTR390 | 🔴 Bắt buộc |


- **Bụi:** 1 cảm biến (SPS30) ra cả PM2.5 + PM10.
- **Gió:** lấy từ Open-Meteo API (không cảm biến).
- **MCU:** ESP32 — đọc cảm biến, gửi JSON qua WiFi.

## JSON node gửi về backend

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
  "snapshot_updated_at": "2026-08-01T15:00:00Z"
}
```

