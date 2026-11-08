// ONE consolidated poll for the whole app.
//
// Before this module the site ran three independent timers: DataContext polled
// /overrides/version every 60s, App polled /maintenance every 60s and
// GlobalAnnouncement polled /announcements every 30s. The worker now exposes
// GET /status with all three, so a visible tab sends ONE small request per
// minute. Other tabs receive the result over BroadcastChannel and skip their
// own tick. Legacy workers (no /status) automatically fall back to the three
// original endpoints, so this module never breaks an un-upgraded deployment.
import {
  APEX_KV_URL,
  fetchBundleMeta,
  fetchMaintenanceStatus,
  fetchActiveAnnouncements,
} from './apexClient';

const EVENT = 'apex-live-status';
const CHANNEL_NAME = 'apex-live-status-sync';
export const LIVE_POLL_MS = 60000;
const FIRST_WAIT_MS = 1200;
const FETCH_TIMEOUT_MS = 8000;
const OTHER_TAB_GRACE_MS = 5000;

let cached = null;
let inFlight = null;
let started = false;
let timer = null;
let channel = null;
let legacy = false;
let lastReceivedAt = 0;
let failures = 0;

export function getLiveStatus() { return cached; }
export function isLiveStatusLegacy() { return legacy; }

function publish(status) {
  if (!status) return;
  cached = status;
  lastReceivedAt = Date.now();
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(EVENT, { detail: status }));
  try { channel?.postMessage({ type: 'status', status }); } catch { /* channel closed */ }
}

function openChannel() {
  if (channel || typeof BroadcastChannel === 'undefined') return;
  try {
    channel = new BroadcastChannel(CHANNEL_NAME);
    channel.onmessage = (event) => {
      const status = event?.data?.status;
      if (event?.data?.type === 'status' && status && typeof status.v === 'number') {
        lastReceivedAt = Date.now();
        cached = status;
        if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(EVENT, { detail: status }));
      }
    };
  } catch { /* BroadcastChannel unavailable: every tab polls */ }
}

function abortAfter(ms) {
  if (typeof AbortController === 'undefined') return null;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, clear: () => clearTimeout(id) };
}

function normaliseStatus(data) {
  if (!data || typeof data.v !== 'number') return null;
  const maintenance = data.maintenance?.confirmed === true
    ? data.maintenance
    : { on: false, message: '', confirmed: false };
  return {
    v: data.v,
    at: data.at || null,
    maintenance,
    announcements: Array.isArray(data.announcements) ? data.announcements : [],
    workerVersion: data.workerVersion || null,
    time: data.time || Date.now(),
    // Automatic exist counts ride in the SAME poll. An older worker simply
    // has no existV and the exist-count store stays empty.
    existV: typeof data.existV === 'number' ? data.existV : null,
    existAt: data.existAt || null,
    existSource: data.existSource || null,
    existUnits: typeof data.existUnits === 'number' ? data.existUnits : 0,
  };
}

/** Fetch once. In-flight calls are shared so every subscriber costs one request. */
export function refreshLiveStatus() {
  if (inFlight) return inFlight;
  const abort = abortAfter(FETCH_TIMEOUT_MS);
  inFlight = (async () => {
    let status = null;
    if (!legacy) {
      try {
        const response = await fetch(`${APEX_KV_URL}/status`, {
          cache: 'no-store',
          ...(abort ? { signal: abort.signal } : {}),
        });
        if (response.ok) status = normaliseStatus(await response.json());
        else if (response.status === 404 || response.status === 405) legacy = true;
      } catch { /* transient failure: keep the last good status */ }
    }
    if (!status) {
      // Legacy worker: preserve the original three endpoints. Parallelising
      // them removes the old serial waterfall.
      const [meta, maintenance, announcements] = await Promise.all([
        fetchBundleMeta().catch(() => null),
        fetchMaintenanceStatus().catch(() => ({ on: false, message: '', confirmed: false })),
        fetchActiveAnnouncements().catch(() => []),
      ]);
      status = {
        v: meta?.version ?? null,
        at: meta?.updatedAt ?? null,
        maintenance,
        announcements,
        workerVersion: null,
        time: Date.now(),
        existV: null,
        existAt: null,
        existSource: null,
        existUnits: 0,
      };
    }
    failures = status ? 0 : failures + 1;
    publish(status);
    return status;
  })().finally(() => { abort?.clear(); inFlight = null; });
  return inFlight;
}

function tick() {
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
  // Another tab refreshed recently: this tab can sit out this minute.
  if (Date.now() - lastReceivedAt < LIVE_POLL_MS - OTHER_TAB_GRACE_MS) return;
  refreshLiveStatus();
}

// `lastReceivedAt === 0` means no successful poll yet. Chromium often fires a
// visibilitychange/online event right after navigation; without this guard
// every boot paid for a second, redundant request.
function onVisible() {
  if (lastReceivedAt > 0 && document.visibilityState === 'visible' && Date.now() - lastReceivedAt > 15000) refreshLiveStatus();
}
function onOnline() {
  if (lastReceivedAt > 0 && Date.now() - lastReceivedAt > 5000) refreshLiveStatus();
}


// ---- INSTANT LIVE UPDATES ---------------------------------------------------
// One long-poll connection replaces the "wait up to 60s" behaviour. When the
// worker sees a new version it answers immediately, we refresh /status and
// every subscriber (DataContext, announcements, exist counts) updates in place.
// Nothing reloads the page. BroadcastChannel already mirrors it to other tabs
// of the same browser instantly.
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let instantActive = false;
let instantAbort = null;
let fastTimer = null;

function startFastFallback() {
  if (fastTimer || typeof window === 'undefined') return;
  // Only used against an older deployed worker without /overrides/wait.
  fastTimer = window.setInterval(() => {
    if (document.visibilityState === 'visible') refreshLiveStatus();
  }, 10000);
}

async function instantLoop() {
  while (instantActive && typeof window !== 'undefined') {
    if (document.visibilityState === 'hidden') { await sleep(1000); continue; }
    const since = Number(getLiveStatus()?.v) || 0;
    instantAbort = typeof AbortController !== 'undefined' ? new AbortController() : null;
    try {
      const response = await fetch(`${APEX_KV_URL}/overrides/wait?since=${since}`, {
        cache: 'no-store',
        ...(instantAbort ? { signal: instantAbort.signal } : {}),
      });
      if (response.status === 404 || response.status === 405) { startFastFallback(); return; }
      if (!response.ok) { await sleep(3000); }
      else {
        const data = await response.json().catch(() => null);
        if (data?.changed && Number(data.v) > since) {
          await refreshLiveStatus();
          continue;
        }
      }
    } catch {
      if (!instantActive) break;
      await sleep(3000);
    } finally { instantAbort = null; }
    await sleep(120);
  }
}

/** Idempotent. Wakes this tab the moment an editor publishes. */
export function startInstantSync() {
  if (instantActive || typeof window === 'undefined') return;
  instantActive = true;
  instantLoop();
  const check = () => { if (document.visibilityState === 'visible') refreshLiveStatus(); };
  document.addEventListener('visibilitychange', check);
  window.addEventListener('focus', check);
  window.addEventListener('storage', check);
}

/** Idempotent: the poller lives for the lifetime of the page. */
export function startLiveStatus() {
  if (started || typeof window === 'undefined') return;
  started = true;
  openChannel();
  timer = window.setInterval(tick, LIVE_POLL_MS);
  document.addEventListener('visibilitychange', onVisible);
  window.addEventListener('online', onOnline);
  refreshLiveStatus();
  // Let the initial page load settle before opening the long-poll.
  // Global setTimeout also keeps the unit-test window stub happy.
  if (typeof setTimeout === 'function') setTimeout(startInstantSync, 2500);
}

/** Wait briefly for the first status; never blocks a render for long. */
export async function ensureLiveStatus(timeout = FIRST_WAIT_MS) {
  startLiveStatus();
  if (getLiveStatus()) return getLiveStatus();
  const pending = inFlight || refreshLiveStatus();
  if (!timeout) return pending;
  return Promise.race([
    pending,
    new Promise((resolve) => setTimeout(() => resolve(getLiveStatus()), timeout)),
  ]);
}

/** Subscribe to consolidated updates. Returns an unsubscribe function. */
export function subscribeLiveStatus(listener) {
  if (typeof window === 'undefined') return () => {};
  const handler = (event) => listener(event.detail);
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}
