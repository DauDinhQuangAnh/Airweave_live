// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { nodesApi } from '@/integrations/api';
import { useNodeProximity } from './use-node-proximity';

vi.mock('@/integrations/api', () => ({ nodesApi: { listNodes: vi.fn() } }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('nearby IoT connection', () => {
  it('switches away from an offline node instead of retaining its old reading', async () => {
    const first = { id: 'a', lat: 21, lng: 105, status: 'online', aqi: 50 };
    const replacement = { id: 'b', lat: 21.001, lng: 105, status: 'online', aqi: 75 };
    vi.mocked(nodesApi.listNodes).mockResolvedValueOnce([first] as never).mockResolvedValueOnce([
      { ...first, status: 'offline', aqi: null }, replacement,
    ] as never);

    const { result } = renderHook(() => useNodeProximity(21, 105));
    await waitFor(() => expect(result.current.matchedNode?.id).toBe('a'));
    await act(async () => { await result.current.refetchNodes(); });
    await waitFor(() => expect(result.current.matchedNode?.id).toBe('b'));
    expect(result.current.isConnectedToNode).toBe(true);
    expect(result.current.distanceMeters).toBeGreaterThan(0);
  });
});
