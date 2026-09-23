// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { pm25ToAQI } from '@/lib/air-quality';
import { buildMicroGrid, fetchMicroAirPoints, microAirCacheKey } from './use-micro-air-grid';

afterEach(() => vi.unstubAllGlobals());

function bounds(south: number, west: number, north: number, east: number) {
  return {
    getSouth: () => south,
    getWest: () => west,
    getNorth: () => north,
    getEast: () => east,
  };
}

describe('micro air grid helpers', () => {
  it('keeps grid disabled below street zoom', () => {
    expect(buildMicroGrid(bounds(10, 106, 11, 107), 13)).toEqual([]);
  });

  it('builds bounded viewport grids by zoom', () => {
    const grid14 = buildMicroGrid(bounds(10, 106, 11, 107), 14);
    const grid15 = buildMicroGrid(bounds(10, 106, 11, 107), 15);
    const grid16 = buildMicroGrid(bounds(10, 106, 11, 107), 16);

    expect(grid14).toHaveLength(9);
    expect(grid15).toHaveLength(16);
    expect(grid16).toHaveLength(25);
    expect(grid16.every((p) => p.lat > 10 && p.lat < 11 && p.lng > 106 && p.lng < 107)).toBe(true);
  });

  it('uses stable rounded cache keys', () => {
    expect(microAirCacheKey(10.123456, 106.987654)).toBe('10.1235,106.9877');
  });

  it('converts PM2.5 to AQI across common breakpoints', () => {
    expect(pm25ToAQI(0)).toBe(0);
    expect(pm25ToAQI(12)).toBe(50);
    expect(pm25ToAQI(35.4)).toBe(100);
    expect(pm25ToAQI(55.4)).toBe(150);
  });

  it('omits a point without a current PM2.5 reading instead of inventing zero', async () => {
    const time = new Date().toISOString().slice(0, 16);
    vi.stubGlobal('fetch', vi.fn(async (input: string) => ({
      ok: true,
      json: async () => input.includes('air-quality-api')
        ? { current: { time, pm2_5: null, pm10: 10 } }
        : { current: { time, temperature_2m: 26 } },
    })));

    expect(await fetchMicroAirPoints([{ lat: 10.7711, lng: 106.7711 }])).toEqual([]);
  });

  it('keeps a measured zero and leaves optional weather missing', async () => {
    const time = new Date().toISOString().slice(0, 16);
    vi.stubGlobal('fetch', vi.fn(async (input: string) => ({
      ok: true,
      json: async () => input.includes('air-quality-api')
        ? { current: { time, pm2_5: 0, pm10: null } }
        : { current: { time, temperature_2m: null } },
    })));

    const [point] = await fetchMicroAirPoints([{ lat: 10.7722, lng: 106.7722 }]);
    expect(point).toMatchObject({ pm25: 0, aqi: 0, pm10: null, temperature: null });
  });
});
