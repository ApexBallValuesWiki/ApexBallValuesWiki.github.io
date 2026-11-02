import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchMaintenanceStatus } from './apexClient';

afterEach(() => vi.unstubAllGlobals());

describe('maintenance confirmation', () => {
  it('does not claim maintenance is confirmed off when the worker is unreachable or malformed', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    expect((await fetchMaintenanceStatus()).confirmed).toBe(false);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 200 })));
    expect((await fetchMaintenanceStatus()).confirmed).toBe(false);
  });

  it('confirms only an explicit worker boolean', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"on":false}', { status: 200 })));
    expect(await fetchMaintenanceStatus()).toMatchObject({ on: false, confirmed: true });
  });
});
