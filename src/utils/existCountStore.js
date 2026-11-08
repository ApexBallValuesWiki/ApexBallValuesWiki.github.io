// AUTOMATIC EXIST COUNTS — browser store.
//
// The game does not publish "X exist" numbers through Roblox's public API, so
// the worker accepts them from a machine publisher (game HttpService, a public
// JSON/CSV feed, or Roblox Open Cloud) and bumps `existV`. That version rides
// inside the SAME /status response the app already polls once a minute. Only
// when it changes do we fetch the small /exist-counts payload. No new timer,
// no second per-minute request, no manual editing, no invented numbers.
//
// An older worker simply has no `existV`: the first fetch returns 404 and the
// site renders nothing. Backwards compatible by construction.
import { fetchExistCounts } from './apexClient';
import { getLiveStatus, startLiveStatus, subscribeLiveStatus } from './liveStatus';

const EMPTY = Object.freeze({ v: 0, at: null, source: 'none', counts: Object.freeze({}) });
export const EXIST_STALE_MS = 24 * 60 * 60 * 1000;

let snapshot = EMPTY;
let started = false;
let unsubscribe = null;
let inFlight = null;
let lastV = -1;
const listeners = new Set();

export function getExistSnapshot() { return snapshot; }

export function subscribeExistCounts(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function publish(next) {
  snapshot = next;
  listeners.forEach((listener) => { try { listener(); } catch { /* keep others alive */ } });
}

export function normalizeExistSnapshot(data) {
  if (!data || typeof data !== 'object' || !data.counts || typeof data.counts !== 'object') return EMPTY;
  const counts = {};
  for (const [rawSlug, value] of Object.entries(data.counts)) {
    if (Number.isInteger(value) && value >= 0) counts[String(rawSlug).toLowerCase()] = value;
  }
  return {
    v: Number(data.v) || 0,
    at: typeof data.at === 'string' ? data.at : null,
    source: typeof data.source === 'string' ? data.source : 'unknown',
    counts,
  };
}

/** Shared in-flight fetch; every subscriber costs at most one request. */
export async function refreshExistCounts() {
  if (inFlight) return inFlight;
  inFlight = (async () => {
    const data = await fetchExistCounts();
    if (!data) return snapshot;
    const next = normalizeExistSnapshot(data);
    lastV = next.v;
    publish(next);
    return next;
  })().finally(() => { inFlight = null; });
  return inFlight;
}

/** Idempotent. Start once from App; the store lives for the page lifetime. */
export function startExistCounts() {
  if (started || typeof window === 'undefined') return;
  started = true;
  startLiveStatus();
  unsubscribe = subscribeLiveStatus((status) => {
    const version = status?.existV;
    if (typeof version === 'number' && version !== lastV) {
      lastV = version;
      refreshExistCounts();
    }
  });
  const current = getLiveStatus();
  if (current && typeof current.existV === 'number') lastV = current.existV;
  refreshExistCounts();
}

/** Test-only teardown so a suite can re-start the store cleanly. */
export function resetExistCountsForTests() {
  try { unsubscribe?.(); } catch { /* already closed */ }
  unsubscribe = null;
  started = false;
  inFlight = null;
  lastV = -1;
  snapshot = EMPTY;
  listeners.clear();
}

export function formatExistCount(value) {
  return Number.isInteger(value) ? value.toLocaleString('en-US') : '—';
}

export function isExistStale(at, now = Date.now()) {
  if (!at) return true;
  const ms = Date.parse(at);
  return !Number.isFinite(ms) || now - ms > EXIST_STALE_MS;
}

export function existAgeLabel(at, now = Date.now()) {
  if (!at) return 'no timestamp';
  const ms = Date.parse(at);
  if (!Number.isFinite(ms)) return 'unknown time';
  const seconds = Math.max(0, Math.floor((now - ms) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export function existCountFor(slug) {
  const value = snapshot.counts[String(slug || '').toLowerCase()];
  return Number.isInteger(value) ? value : null;
}
