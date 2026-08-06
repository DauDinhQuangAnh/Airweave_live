/**
 * air-analytics.util.ts — Bộ Thuật toán Xử lý & Phân tích Chất lượng Không khí Chuẩn Quốc tế
 *
 * Bao gồm:
 * 1. US EPA 2024 NowCast Algorithm (Làm mượt trọng số thời gian thực)
 * 2. Hampel Outlier Filter (Loại bỏ nhiễu ảo ngắt quãng từ cảm biến laser)
 * 3. Adaptive Exponential Moving Average (EMA — Làm mượt xung nhiễu)
 * 4. Hygroscopic Relative Humidity Growth Correction (Bù nở hạt bụi do nồm ẩm)
 * 5. US EPA AQI Breakpoints Matrix (Bảng quy đổi chuẩn 2024)
 */

// ---------- 1. US EPA 2024 AQI Breakpoints Matrix ----------

interface Breakpoint {
  cLow: number;
  cHigh: number;
  iLow: number;
  iHigh: number;
}

const PM25_BREAKPOINTS: Breakpoint[] = [
  { cLow: 0.0, cHigh: 12.0, iLow: 0, iHigh: 50 },
  { cLow: 12.1, cHigh: 35.4, iLow: 51, iHigh: 100 },
  { cLow: 35.5, cHigh: 55.4, iLow: 101, iHigh: 150 },
  { cLow: 55.5, cHigh: 150.4, iLow: 151, iHigh: 200 },
  { cLow: 150.5, cHigh: 250.4, iLow: 201, iHigh: 300 },
  { cLow: 250.5, cHigh: 350.4, iLow: 301, iHigh: 400 },
  { cLow: 350.5, cHigh: 500.4, iLow: 401, iHigh: 500 },
];

/**
 * Quy đổi PM2.5 sang AQI theo công thức nội suy tuyến tính chuẩn US EPA 2024:
 * I = ((I_high - I_low) / (C_high - C_low)) * (C - C_low) + I_low
 */
export function calculateAqiFromPm25(pm25: number): number {
  if (pm25 < 0) return 0;
  if (pm25 > 500.4) return 500;

  const bp = PM25_BREAKPOINTS.find((b) => pm25 >= b.cLow && pm25 <= b.cHigh);
  if (!bp) return Math.round(pm25);

  const aqi = ((bp.iHigh - bp.iLow) / (bp.cHigh - bp.cLow)) * (pm25 - bp.cLow) + bp.iLow;
  return Math.round(aqi);
}

// ---------- 2. US EPA NowCast Algorithm (Làm mượt trọng số 12h) ----------

/**
 * Thuật toán NowCast (US EPA):
 * Tính trung bình có trọng số động dựa trên tỷ lệ giữa giá trị nhỏ nhất và lớn nhất.
 * - Nếu không khí biến động mạnh (min/max thấp) -> Trọng số giờ gần nhất cao hơn (phản ứng nhanh).
 * - Nếu không khí ổn định (min/max cao) -> Trọng số dàn đều 12h (làm mượt tối đa).
 */
export function calculateNowCast(hourlyReadings: number[]): number {
  if (!hourlyReadings || hourlyReadings.length === 0) return 0;
  const readings = hourlyReadings.slice(0, 12).filter((v) => typeof v === 'number' && !isNaN(v));

  if (readings.length === 0) return 0;
  if (readings.length === 1) return readings[0];

  const min = Math.min(...readings);
  const max = Math.max(...readings);
  const range = max - min;

  // Tính hệ số trọng số w = 1 - (range / max)
  let w = max > 0 ? 1 - range / max : 1;
  if (w < 0.5) w = 0.5; // Trọng số tối thiểu 0.5 theo quy chuẩn US EPA

  let numerator = 0;
  let denominator = 0;

  readings.forEach((c, i) => {
    const weight = Math.pow(w, i);
    numerator += c * weight;
    denominator += weight;
  });

  return denominator > 0 ? Number((numerator / denominator).toFixed(1)) : readings[0];
}

// ---------- 3. Hygroscopic Relative Humidity Growth Correction ----------

/**
 * Thuật toán Bù nở hạt bụi do nồm ẩm (Wark-Warner & US EPA Hygroscopic Correction):
 * Hạt bụi mịn PM2.5 hút nước nở to khi độ ẩm RH > 70%, làm cảm biến tán xạ laser đọc cao ảo.
 */
export function applyHumidityCorrection(pm25Raw: number, relativeHumidity: number): number {
  if (relativeHumidity <= 70 || pm25Raw <= 0) return pm25Raw;

  // Công thức hiệu chỉnh độ ẩm tương đối
  const rhRatio = relativeHumidity / 100.0;
  const growthFactor = 1.0 + 0.25 * Math.pow(rhRatio, 2.5);

  const corrected = pm25Raw / growthFactor;
  return Number(Math.max(1.0, corrected).toFixed(1));
}

// ---------- 4. Hampel Filter (Outlier Rejection — Bỏ xung nhiễu ảo) ----------

/**
 * Thuật toán Lọc nhiễu Hampel Filter (Median Absolute Deviation):
 * Phát hiện và loại bỏ các đỉnh nhiễu ảo tức thời (vd: ai đó hút thuốc hoặc thổi bụi ngay sát cảm biến trong 2 giây).
 */
export function hampelFilter(data: number[], windowSize = 5, nSigmas = 3): number[] {
  if (data.length < windowSize) return data;

  const result = [...data];
  const halfWindow = Math.floor(windowSize / 2);

  for (let i = halfWindow; i < data.length - halfWindow; i++) {
    const window = data.slice(i - halfWindow, i + halfWindow + 1);

    // Tính Median
    const sorted = [...window].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];

    // Tính MAD (Median Absolute Deviation)
    const medianDeviations = window.map((val) => Math.abs(val - median)).sort((a, b) => a - b);
    const mad = medianDeviations[Math.floor(medianDeviations.length / 2)];

    // Khống chế ngưỡng sai số
    const threshold = nSigmas * 1.4826 * mad;

    if (Math.abs(data[i] - median) > threshold && threshold > 0) {
      result[i] = Number(median.toFixed(1)); // Thay thế xung nhiễu bằng giá trị trung vị
    }
  }

  return result;
}

// ---------- 5. Adaptive Exponential Moving Average (EMA Smoothing) ----------

/**
 * Thuật toán Làm mượt thích ứng EMA:
 * Giúp dữ liệu từ cảm biến phần cứng bay bổng mịn màng hơn khi vẽ biểu đồ.
 */
export class AdaptiveEmaFilter {
  private currentValue: number | null = null;

  constructor(private readonly alpha = 0.3) {}

  public filter(newValue: number): number {
    if (this.currentValue === null) {
      this.currentValue = newValue;
      return newValue;
    }

    // Công thức EMA: S_t = alpha * Y_t + (1 - alpha) * S_{t-1}
    this.currentValue = this.alpha * newValue + (1 - this.alpha) * this.currentValue;
    return Number(this.currentValue.toFixed(1));
  }
}
