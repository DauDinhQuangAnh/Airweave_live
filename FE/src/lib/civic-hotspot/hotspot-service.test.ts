import { describe, expect, it } from 'vitest';
import { hotspotIntelligenceService } from './hotspot-service';

describe('live hotspot evidence', () => {
  it('does not call community reports verified merely because AQI is high', () => {
    const time = new Date().toISOString();
    const reports = [
      { id: 'a', lat: 21.01, lng: 105.8, kind: 'smoke', text: null, created_at: time },
      { id: 'b', lat: 21.0101, lng: 105.8001, kind: 'smoke', text: null, created_at: time },
    ];
    const stations = [{ uid: 123, lat: 21.01, lng: 105.8, aqi: 200, station: 'WAQI', time }];

    const events = hotspotIntelligenceService.buildFromReports(reports, stations);
    expect(events.find((event) => event.id.startsWith('hotspot_g_'))?.status).toBe('community_detected');
  });

  it('uses the observation time for a standalone station anomaly', () => {
    const time = new Date(Date.now() - 30 * 60_000).toISOString();
    const events = hotspotIntelligenceService.buildFromReports([], [
      { uid: 124, lat: 21.02, lng: 105.81, aqi: 220, station: 'WAQI', time },
    ]);

    expect(events).toMatchObject([{ timestamp: time, lastUpdated: time, status: 'pending' }]);
  });
});
