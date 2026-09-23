import { describe, expect, it } from 'vitest';
import { hasFreshStationReading } from './use-waqi-stations';

const station = { uid: 1, lat: 21, lng: 105, aqi: 0, station: 'Hà Nội', time: new Date().toISOString() };

describe('WAQI station validity', () => {
  it('accepts a fresh measured AQI of zero', () => {
    expect(hasFreshStationReading(station)).toBe(true);
  });

  it('rejects stale, missing and invalid station readings', () => {
    expect(hasFreshStationReading({ ...station, time: new Date(Date.now() - 3 * 60 * 60_000).toISOString() })).toBe(false);
    expect(hasFreshStationReading({ ...station, time: null })).toBe(false);
    expect(hasFreshStationReading({ ...station, aqi: Number.NaN })).toBe(false);
  });
});
