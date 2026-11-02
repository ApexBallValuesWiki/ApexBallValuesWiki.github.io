import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';

// The consolidated poll replaces three independent timers. These tests prove
// both the fast path (one request) and the legacy-worker fallback (three
// parallel requests), without ever touching the live endpoint.
const listeners = {};
let documentStub;
let windowStub;

beforeEach(() => {
  documentStub = {
    visibilityState: 'visible',
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
  windowStub = {
    addEventListener: vi.fn((type, fn) => { (listeners[type] ||= []).push(fn); }),
    removeEventListener: vi.fn((type, fn) => {
      listeners[type] = (listeners[type] || []).filter((item) => item !== fn);
    }),
    dispatchEvent: vi.fn((event) => {
      (listeners[event.type] || []).slice().forEach((fn) => fn(event));
      return true;
    }),
    setInterval: vi.fn(() => 1),
    clearInterval: vi.fn(),
  };
  for (const key of Object.keys(listeners)) delete listeners[key];
  vi.stubGlobal('document', documentStub);
  vi.stubGlobal('window', windowStub);
  vi.stubGlobal('BroadcastChannel', undefined);
  vi.resetModules();
});
afterEach(() => vi.unstubAllGlobals());

function json(data, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => data };
}

describe('consolidated live status', () => {
  it('uses a single /status request and exposes version, maintenance and announcements', async () => {
    const fetchMock = vi.fn(async (url) => {
      expect(String(url)).toContain('/status');
      return json({
        v: 42,
        at: '2026-11-02T00:00:00Z',
        workerVersion: '2026-11-02.5',
        maintenance: { on: false, message: '', confirmed: true },
        announcements: [{ id: 1, message: 'Live' }],
      });
    });
    vi.stubGlobal('fetch', fetchMock);
    const mod = await import('./liveStatus');
    const status = await mod.ensureLiveStatus(0);
    expect(status.v).toBe(42);
    expect(status.maintenance.confirmed).toBe(true);
    expect(status.announcements).toHaveLength(1);
    expect(mod.getLiveStatus()).toBe(status);
    expect(mod.isLiveStatusLegacy()).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    // A second caller shares the cached value; no extra network.
    expect(await mod.ensureLiveStatus(0)).toBe(status);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('falls back to the three legacy endpoints when /status is missing', async () => {
    const calls = [];
    const fetchMock = vi.fn(async (url) => {
      const path = new URL(String(url), 'https://apex-db.test').pathname;
      calls.push(path);
      if (path === '/status') return json({}, 404);
      if (path === '/overrides/version') return json({ version: 7, updatedAt: 'x' });
      if (path === '/maintenance') return json({ on: false, message: '', confirmed: true });
      if (path === '/announcements') return json({ announcements: [{ message: 'Legacy' }] });
      return json({});
    });
    vi.stubGlobal('fetch', fetchMock);
    const mod = await import('./liveStatus');
    const status = await mod.ensureLiveStatus(0);
    expect(status.v).toBe(7);
    expect(status.maintenance.confirmed).toBe(true);
    expect(status.announcements[0].message).toBe('Legacy');
    expect(mod.isLiveStatusLegacy()).toBe(true);
    expect(calls).toContain('/overrides/version');
    expect(calls).toContain('/maintenance');
    expect(calls).toContain('/announcements');
  });

  it('delivers updates to subscribers', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({
      v: 3, maintenance: { on: false, message: '', confirmed: true }, announcements: [],
    })));
    const mod = await import('./liveStatus');
    const seen = [];
    const stop = mod.subscribeLiveStatus((status) => seen.push(status?.v));
    await mod.refreshLiveStatus();
    expect(seen).toContain(3);
    stop();
    await mod.refreshLiveStatus();
    expect(seen).toHaveLength(1);
  });
});
