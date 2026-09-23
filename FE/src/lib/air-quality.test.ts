import { describe, expect, it } from 'vitest';
import { hasAirQualityReading } from './air-quality';

describe('hasAirQualityReading', () => {
  const reading = { aqi: 68, updatedAt: new Date().toISOString(), loading: false, error: null };

  it('rejects the initial zero-filled state and failed requests', () => {
    expect(hasAirQualityReading({ ...reading, aqi: 0, updatedAt: '' })).toBe(false);
    expect(hasAirQualityReading({ ...reading, loading: true })).toBe(false);
    expect(hasAirQualityReading({ ...reading, error: 'network error' })).toBe(false);
    expect(hasAirQualityReading({ ...reading, aqi: Number.NaN })).toBe(false);
    expect(hasAirQualityReading({ ...reading, updatedAt: new Date(Date.now() - 3 * 60 * 60_000).toISOString() })).toBe(false);
  });

  it('accepts a recorded AQI including a genuine zero', () => {
    expect(hasAirQualityReading(reading)).toBe(true);
    expect(hasAirQualityReading({ ...reading, aqi: 0 })).toBe(true);
  });
});
