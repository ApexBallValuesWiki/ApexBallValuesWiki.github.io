// APEX KV API CLIENT (Cloudflare Workers KV — Supabase-free)
// The single-file Cloudflare Worker (scripts/cloudflare-proxy-worker.js,
// deployed as `apex-db`) is the ONLY backend. It serves the live database
// bundle, announcements, bug reports and fanart straight from KV.

export const APEX_KV_URL =
  import.meta.env.VITE_APEX_KV_URL ||
  'https://apex-db.apexballtd-admin.workers.dev';

/** Admin credentials saved by the /admin login screen. */
export function getAdminHeaders() {
  const email = typeof localStorage !== 'undefined' ? localStorage.getItem('apex-admin-email-v1') || '' : '';
  const passcode = typeof localStorage !== 'undefined' ? localStorage.getItem('apex-admin-passcode-v1') || '' : '';
  return {
    'Content-Type': 'application/json',
    'X-Admin-Email': email,
    'X-Admin-Passcode': passcode,
  };
}

/**
 * Fetch the ENTIRE live database bundle (values + WIKI + maps + crates
 * overrides) from the KV worker. Falls back to null when unreachable —
 * callers layer the baked static snapshot underneath.
 */
export async function fetchKvBundle({ cacheBust = true } = {}) {
  const url = cacheBust ? `${APEX_KV_URL}/overrides?_=${Date.now()}` : `${APEX_KV_URL}/overrides`;
  const response = await fetch(url, { headers: { Accept: 'application/json' } }).catch(() => null);
  if (!response || !response.ok) return null;
  try {
    return await response.json();
  } catch {
    return null;
  }
}

/** Fetch the ACTIVE global announcements (a list; may be empty). */
export async function fetchActiveAnnouncements() {
  // no-store + cache-buster: a replaced announcement must show up on the
  // NEXT poll, never a stale cached response. Handles both the new list
  // format ({announcements: [...]}) and the legacy single-object format.
  const response = await fetch(`${APEX_KV_URL}/announcements?_=${Date.now()}`, { cache: 'no-store' }).catch(() => null);
  if (!response || !response.ok) return [];
  try {
    const data = await response.json();
    const now = Date.now();
    const alive = (a) => a && a.message && (!a.expiresAt || new Date(a.expiresAt).getTime() > now);
    if (Array.isArray(data?.announcements)) return data.announcements.filter(alive);
    if (data && data.message && alive(data)) return [data]; // legacy worker
    return [];
  } catch {
    return [];
  }
}

/** Fetch the currently active global announcement (legacy helper, first item). */
export async function fetchActiveAnnouncement() {
  const list = await fetchActiveAnnouncements();
  return list[0] || null;
}

/** Remove ONE announcement by id (owner or admin). */
export async function deleteAnnouncement(id) {
  const response = await fetch(`${APEX_KV_URL}/announcements/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: getAdminHeaders(),
  }).catch(() => null);
  return { ok: !!(response && response.ok) };
}

/** Live worker version (for the dashboard's deploy-status chip). */
export async function fetchWorkerVersion() {
  const response = await fetch(`${APEX_KV_URL}/version?_=${Date.now()}`, { cache: 'no-store' }).catch(() => null);
  if (!response || !response.ok) return null;
  try {
    const data = await response.json();
    return data?.version || null;
  } catch {
    return null;
  }
}

/** Read the maintenance-mode state (public). Never throws. */
export async function fetchMaintenanceStatus() {
  const response = await fetch(`${APEX_KV_URL}/maintenance?_=${Date.now()}`, { cache: 'no-store' }).catch(() => null);
  if (!response || !response.ok) return { on: false, message: '' };
  try {
    const data = await response.json();
    return { on: !!data?.on, message: data?.message || '', at: data?.at || null, by: data?.by || null };
  } catch {
    return { on: false, message: '' };
  }
}

/** Turn maintenance mode on/off (owner or admin). */
export async function setMaintenance(on, message = '') {
  const response = await fetch(`${APEX_KV_URL}/maintenance`, {
    method: 'POST',
    headers: getAdminHeaders(),
    body: JSON.stringify({ on: !!on, message }),
  }).catch(() => null);
  const data = response ? await response.json().catch(() => ({})) : {};
  return { ok: !!(response && response.ok), status: response ? response.status : 0, error: data.error };
}

/**
 * Write ONE entry (value|wiki|map|crate) straight to the KV database.
 * Concurrent-safe: no full-bundle overwrite, records history server-side.
 */
export async function pushKvEntry(section, slug, entry) {
  const response = await fetch(`${APEX_KV_URL}/overrides/${section}/${encodeURIComponent(slug)}`, {
    method: 'POST',
    headers: getAdminHeaders(),
    body: JSON.stringify(entry),
  }).catch(() => null);
  const data = response ? await response.json().catch(() => ({})) : {};
  return { ok: !!(response && response.ok), status: response ? response.status : 0, version: data.version, error: data.error };
}

/** Remove ONE entry from the KV database (records history server-side). */
export async function deleteKvEntry(section, slug) {
  const response = await fetch(`${APEX_KV_URL}/overrides/${section}/${encodeURIComponent(slug)}`, {
    method: 'DELETE',
    headers: getAdminHeaders(),
  }).catch(() => null);
  const data = response ? await response.json().catch(() => ({})) : {};
  return { ok: !!(response && response.ok), status: response ? response.status : 0, version: data.version, error: data.error };
}

/** Shared recent-changes feed (admin-only). Returns [] on failure. */
export async function fetchChangeLog() {
  const response = await fetch(`${APEX_KV_URL}/changes`, { headers: getAdminHeaders() }).catch(() => null);
  if (!response || !response.ok) return [];
  try {
    const arr = await response.json();
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

/** Public per-unit edit history (powers the shared value trend graph). */
// 60s in-flight/result cache: hovering a unit card warms its history so the
// detail page's trend graph renders instantly on click.
const unitHistoryCache = new Map();

export function fetchUnitHistory(section, slug) {
  const key = `${section}:${slug}`;
  const cached = unitHistoryCache.get(key);
  if (cached && Date.now() - cached.at < 60000) return cached.promise;
  const promise = (async () => {
    const response = await fetch(`${APEX_KV_URL}/history/${section}/${encodeURIComponent(slug)}`).catch(() => null);
    if (!response || !response.ok) return [];
    try {
      const arr = await response.json();
      return Array.isArray(arr) ? arr : [];
    } catch { return []; }
  })();
  unitHistoryCache.set(key, { at: Date.now(), promise });
  return promise;
}

/**
 * Log out everywhere: the worker rotates this account's passcode and returns
 * the new one. We store it locally, so every OTHER device's saved login
 * becomes invalid instantly. Requires the updated worker (404 = not deployed).
 */
export async function logoutEverywhere() {
  const response = await fetch(`${APEX_KV_URL}/logout-all`, { method: 'POST', headers: getAdminHeaders() }).catch(() => null);
  const data = response ? await response.json().catch(() => ({})) : {};
  return { ok: !!(response && response.ok), status: response ? response.status : 0, passcode: data.passcode, error: data.error };
}

/** Delete the live announcement for everyone (admin/owner). */
export async function clearActiveAnnouncement() {
  const response = await fetch(`${APEX_KV_URL}/announcements/clear`, { method: 'POST', headers: getAdminHeaders() }).catch(() => null);
  return !!(response && response.ok);
}

/** Site-wide unit deletion registry (any unit, incl. built-ins). */
export async function addDeletedUnit(slug) {
  const response = await fetch(`${APEX_KV_URL}/deletedunits/${encodeURIComponent(slug)}`, { method: 'POST', headers: getAdminHeaders() }).catch(() => null);
  const data = response ? await response.json().catch(() => ({})) : {};
  return { ok: !!(response && response.ok), status: response ? response.status : 0, version: data.version, error: data.error };
}

export async function restoreDeletedUnit(slug) {
  const response = await fetch(`${APEX_KV_URL}/deletedunits/${encodeURIComponent(slug)}`, { method: 'DELETE', headers: getAdminHeaders() }).catch(() => null);
  const data = response ? await response.json().catch(() => ({})) : {};
  return { ok: !!(response && response.ok), status: response ? response.status : 0, version: data.version, error: data.error };
}
