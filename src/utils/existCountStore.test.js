import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';

// Automatic exist counts: one shared store driven by the SAME /status poll.
// No live endpoint is ever contacted in these tests.
const listeners = {};
let windowStub;
let documentStub;

beforeEach(() => {
  for (const key of Object.keys(listeners)) delete listeners[key];
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
  vi.stubGlobal('window', windowStub);
  vi.stubGlobal('document', documentStub);
  vi.stubGlobal('BroadcastChannel', undefined);
  vi.stubGlobal('CustomEvent', class {
    constructor(type, options) { this.type = type; this.detail = options?.detail; }
  });
  vi.resetModules();
});
afterEach(() => vi.unstubAllGlobals());

function json(data, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => data };
}
function emitStatus(detail) {
  windowStub.dispatchEvent(new CustomEvent('apex-live-status', { detail }));
}
const status = (existV) => ({
  v: 10, at: null, time: Date.now(), workerVersion: '2026-11-05.0',
  maintenance: { on: false, message: '', confirmed: true },
  announcements: [],
  existV, existAt: new Date().toISOString(), existSource: 'game', existUnits: 2,
});
const counts = (forestball) => ({
  v: 1, at: new Date().toISOString(), source: 'game',
  counts: { forestball, ShowManBall: 311 },
});

describe('automatic exist counts — pure helpers', () => {
  it('normalises slugs, drops invalid numbers, never invents a zero', async () => {
    const mod = await import('./existCountStore');
    const snap = mod.normalizeExistSnapshot({
      v: 4, at: '2026-11-05T12:00:00Z', source: 'feed',
      counts: { ForestBall: 1842, bad: -3, worse: '4', okay: 7 },
    });
    expect(snap.counts).toEqual({ forestball: 1842, okay: 7 });
    expect(snap.v).toBe(4);
    expect(mod.normalizeExistSnapshot(null).counts).toEqual({});
    expect(mod.existCountFor('forestball')).toBeNull();
  });

  it('formats, ages and marks staleness honestly', async () => {
    const mod = await import('./existCountStore');
    expect(mod.formatExistCount(1842)).toBe('1,842');
    expect(mod.formatExistCount(null)).toBe('—');
    const now = Date.parse('2026-11-05T12:00:00Z');
    expect(mod.isExistStale('2026-11-05T11:00:00Z', now)).toBe(false);
    expect(mod.isExistStale('2026-11-03T11:00:00Z', now)).toBe(true);
    expect(mod.isExistStale(null, now)).toBe(true);
    expect(mod.existAgeLabel('2026-11-05T11:59:30Z', now)).toBe('30s ago');
    expect(mod.existAgeLabel('2026-11-05T10:00:00Z', now)).toBe('2h ago');
  });
});

describe('automatic exist counts — live delivery', () => {
  it('fetches once, publishes to every subscriber, and keeps the number', async () => {
    const mod = await import('./existCountStore');
    const fetchMock = vi.fn(async () => json(counts(1842)));
    vi.stubGlobal('fetch', fetchMock);
    let notified = 0;
    const unsubscribe = mod.subscribeExistCounts(() => { notified += 1; });
    await mod.refreshExistCounts();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(notified).toBe(1);
    expect(mod.getExistSnapshot().counts.forestball).toBe(1842);
    expect(mod.getExistSnapshot().counts.showmanball).toBe(311);
    expect(mod.existCountFor('FORESTBALL')).toBe(1842);
    unsubscribe();
  });

  it('an old worker (404) leaves the site with NO numbers at all', async () => {
    const mod = await import('./existCountStore');
    vi.stubGlobal('fetch', vi.fn(async () => json({}, 404)));
    await mod.refreshExistCounts();
    expect(Object.keys(mod.getExistSnapshot().counts)).toHaveLength(0);
    expect(mod.existCountFor('forestball')).toBeNull();
  });

  it('one consolidated /status poll drives updates; no second timer', async () => {
    const mod = await import('./existCountStore');
    let existCalls = 0;
    let statusCalls = 0;
    let currentVersion = 7;
    const payload = () => ({
      v: currentVersion,
      at: new Date().toISOString(),
      source: 'game',
      counts: { forestball: 1842 + (currentVersion - 7), ShowManBall: 311 },
    });
    const fetchMock = vi.fn(async (url) => {
      const target = String(url);
      if (target.includes('/exist-counts')) { existCalls += 1; return json(payload()); }
      if (target.includes('/status')) { statusCalls += 1; return json(status(currentVersion)); }
      return json({});
    });
    vi.stubGlobal('fetch', fetchMock);

    mod.startExistCounts();
    await mod.refreshExistCounts();
    expect(existCalls).toBe(1);
    expect(statusCalls).toBeGreaterThanOrEqual(1);
    expect(mod.getExistSnapshot().counts.forestball).toBeGreaterThan(0);

    // Same version: no new request. Changed version: exactly one new request.
    await vi.waitFor(() => expect(statusCalls).toBeGreaterThanOrEqual(1));
    emitStatus(status(7));
    expect(existCalls).toBe(1);
    currentVersion = 8;
    emitStatus(status(8));
    await vi.waitFor(() => expect(existCalls).toBe(2));
    expect(mod.getExistSnapshot().source).toBe('game');
    mod.resetExistCountsForTests();
    expect(mod.getExistSnapshot().counts).toEqual({});
  });
});
