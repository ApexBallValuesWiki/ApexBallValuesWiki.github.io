// APEX — Cloudflare KV worker: the live Values & WIKI database.
// Deploy: Dashboard -> Workers & Pages -> create/paste this code, then
// Settings -> KV Namespace Bindings -> bind "APEX_OVERRIDES" -> Deploy.

// Build marker for this worker — bump on every deploy so the admin panel
// can tell the team when a deploy is still pending.
const WORKER_VERSION = '2026-11-02.5';

// Browser origins permitted to call state-changing endpoints. Public GETs are
// open, but no credentials are ever accepted from an unlisted origin and no
// wildcard + credentials combination is emitted. Add localhost here only when
// running a local development copy of the worker.
const ALLOWED_ORIGINS = new Set([
  'https://apexballvalueswiki.github.io',
  'https://zenithvalues.github.io',
]);
const ADMIN_HEADERS = 'Content-Type, X-Admin-Email, X-Admin-Passcode, X-Admin-Session, If-None-Match';
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

function isWriteMethod(method) { return method === 'POST' || method === 'DELETE' || method === 'PUT'; }
function requestOrigin(request) { return request.headers.get('Origin') || ''; }
function originAllowed(request) {
  const origin = requestOrigin(request);
  // Non-browser clients (no Origin header) are not a CSRF vector.
  return !origin || ALLOWED_ORIGINS.has(origin);
}

async function hmacHex(secret, payload) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(payload));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function sha256Hex(value) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(value)));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

// ---- Admin credential backend ----------------------------------------------
// No shared / guessable default passcode is ever created. Every credential is
// generated with crypto.getRandomValues and handed out exactly once (through a
// one-time invite link or an owner-triggered reset). KV is operator-only, so
// the map is kept readable by the existing per-endpoint guards, but invite
// tokens themselves are stored ONLY as SHA-256 digests.
const PASSCODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789-_';
const WEAK_PASSCODES = new Set(['apex2026', 'password', 'admin', '12345678', 'apex']);

function strongPasscode(length = 24) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => PASSCODE_ALPHABET[b % PASSCODE_ALPHABET.length]).join('');
}

function jsonResponse(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...extraHeaders },
  });
}

// Actionable auth failures. The old backend returned the same "Unauthorized"
// for a wrong password, an unprovisioned editor and an email not on the roster,
// which is why a new editor could never tell what to do next.
function authFailure(code, status = 401) {
  const messages = {
    not_on_roster: 'This email is not on the APEX team roster. Ask the owner to add you first.',
    account_not_provisioned: 'This account has no passcode yet. Ask an owner or admin for an invite link.',
    invalid_passcode: 'Wrong email or passcode. Check the passcode you were given, or request a reset.',
    legacy_default: 'The old default passcode is disabled. Ask an owner for a secure invite link.',
    locked: 'Too many failed attempts. Try again in a few minutes.',
    forbidden: 'This action is for owners and admins only.',
    unauthorized: 'Please sign in to the admin panel first.',
  };
  return jsonResponse({ error: messages[code] || 'Unauthorized', code }, status);
}

function normalizeTeamEmail(value) {
  return String(value || '').trim().toLowerCase();
}

// Remove staff identifiers from all public data, including nested history rows.
const PRIVATE_PUBLIC_KEYS = new Set(['updated_by', 'updatedBy', 'created_by', 'createdBy', 'changed_by', 'changedBy', 'editor_email', 'editorEmail', 'author_email', 'authorEmail', 'email', 'sentBy', 'by']);
function publicData(value) {
  if (Array.isArray(value)) return value.map(publicData);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value)
    .filter(([key]) => !PRIVATE_PUBLIC_KEYS.has(key))
    .map(([key, item]) => [key, publicData(item)]));
}

// Simple in-memory fallback for initial tests/cold starts in case KV is not bound
let IN_MEMORY_DB_FALLBACK = null;
let IN_MEMORY_PASSWORDS_FALLBACK = null;
let IN_MEMORY_BUG_REPORTS = null;
let IN_MEMORY_ANNOUNCEMENTS_FALLBACK = null;
let IN_MEMORY_MAINTENANCE_FALLBACK = null;
let IN_MEMORY_FANART_FALLBACK = null;

// ---- Per-isolate hot-path caches -------------------------------------------
// An isolate serves many requests. KV is still the single source of truth;
// these caches only remove redundant 7.5 MB parses, repeated metadata reads
// and repeated credential lookups. Every write invalidates the data caches.
const PUBLIC_BODY_CACHE = new Map();      // __v -> sanitized JSON string
const META_CACHE = { at: 0, value: null };
const CREDENTIAL_CACHE = { at: 0, value: null };
const RAW_BUNDLE_CACHE = { key: '', value: null };
const META_TTL_MS = 3000;
const CREDENTIAL_TTL_MS = 30000;

function invalidateDataCaches() {
  PUBLIC_BODY_CACHE.clear();
  META_CACHE.at = 0; META_CACHE.value = null;
}
function invalidateCredentialCache() {
  CREDENTIAL_CACHE.at = 0; CREDENTIAL_CACHE.value = null;
}
function rememberRawBundle(raw) {
  if (typeof raw === 'string') {
    RAW_BUNDLE_CACHE.key = 'staticOverrides';
    RAW_BUNDLE_CACHE.value = raw;
  }
}
let IN_MEMORY_CHANGELOG_FALLBACK = null;

// LOGIN RATE LIMITING (brute-force protection)
// Per-isolate sliding window: 5 failed logins per IP within 5 minutes ->
// 10 minute lockout. Success resets the counter.
const LOGIN_ATTEMPTS = new Map();
const LOGIN_WINDOW_MS = 5 * 60 * 1000;
const LOGIN_MAX_FAILS = 5;
const LOGIN_BLOCK_MS = 10 * 60 * 1000;

function clientIp(request) {
  return request.headers.get('cf-connecting-ip') || 'unknown';
}

function loginBlocked(ip) {
  const rec = LOGIN_ATTEMPTS.get(ip);
  if (!rec) return false;
  if (rec.blockedUntil && rec.blockedUntil > Date.now()) return true;
  if (rec.blockedUntil && rec.blockedUntil <= Date.now()) { LOGIN_ATTEMPTS.delete(ip); return false; }
  return false;
}

function recordLoginFail(ip) {
  const now = Date.now();
  const rec = LOGIN_ATTEMPTS.get(ip) || { fails: 0, firstAt: now, blockedUntil: 0 };
  if (now - rec.firstAt > LOGIN_WINDOW_MS) { rec.fails = 0; rec.firstAt = now; }
  rec.fails += 1;
  if (rec.fails >= LOGIN_MAX_FAILS) {
    rec.blockedUntil = now + LOGIN_BLOCK_MS;
    rec.fails = 0;
    rec.firstAt = now;
  }
  LOGIN_ATTEMPTS.set(ip, rec);
}

// GENERIC RATE LIMITING for public/semi-public POST routes (bug reports,
// login attempts, password changes). Per-isolate sliding window — best-effort
// abuse deterrence without any storage cost (KV writes cost quota).
const RATE_BUCKETS = new Map();

function rateLimited(key, max, windowMs) {
  const now = Date.now();
  let hits = (RATE_BUCKETS.get(key) || []).filter((t) => now - t < windowMs);
  if (hits.length >= max) {
    RATE_BUCKETS.set(key, hits);
    return Math.ceil((windowMs - (now - hits[0])) / 1000); // seconds until the oldest hit expires
  }
  hits.push(now);
  RATE_BUCKETS.set(key, hits);
  if (RATE_BUCKETS.size > 4000) {
    for (const [k, v] of RATE_BUCKETS) {
      if (!v.some((t) => now - t < 24 * 3600 * 1000)) RATE_BUCKETS.delete(k);
    }
  }
  return 0;
}

function tooManyResponse(retryAfterSec) {
  return new Response(JSON.stringify({ error: `Too many requests. Try again in about ${Math.max(1, retryAfterSec)} seconds.` }), {
    status: 429,
    headers: { 'Content-Type': 'application/json', 'Retry-After': String(Math.max(1, retryAfterSec)) },
  });
}


// BUNDLE VERSIONING + CHANGE HISTORY
// The live bundle carries __v (bumped on every write). Full-bundle POSTs can
// pass __baseVersion — a stale version is rejected with 409 so concurrent
// admins can no longer silently overwrite each other (last-writer-wins).
// Every per-slug write/delete appends to:
//   changeLog            — shared recent-changes feed (cap 200)
//   history:<sec>:<slug> — per-unit edit history (cap 50) for trends/rollback
const BUNDLE_SECTIONS = {
  value: 'valueOverrides',
  wiki: 'wikiOverrides',
  map: 'mapOverrides',
  crate: 'crateOverrides',
  materials: 'materialOverrides',
};

async function readOverridesBundle(env) {
  let data = null;
  try { data = env.APEX_OVERRIDES ? await env.APEX_OVERRIDES.get('staticOverrides') : IN_MEMORY_DB_FALLBACK; }
  catch (e) { console.error('Failed to read overrides from KV:', e); throw new Error('Database temporarily unavailable; no changes were written.'); }
  rememberRawBundle(data);
  if (!data && env.APEX_OVERRIDES) throw new Error('Database record is missing; no changes were written.');
  let bundle = null;
  try { bundle = data ? JSON.parse(data) : null; } catch { throw new Error('Database data is malformed; no changes were written.'); }
  if (data && (!bundle || typeof bundle !== 'object' || Array.isArray(bundle))) throw new Error('Database data is malformed; no changes were written.');
  if (!bundle) {
    bundle = { valueOverrides: {}, wikiOverrides: {}, mapOverrides: {}, crateOverrides: {}, materialOverrides: {}, timestamp: new Date().toISOString() };
  }
  if (typeof bundle.__v !== 'number') bundle.__v = 0;
  if (!Array.isArray(bundle.deletedUnits)) bundle.deletedUnits = [];
  if (!bundle.materialOverrides || typeof bundle.materialOverrides !== 'object') bundle.materialOverrides = {};
  // MATERIALS ARE NOT UNITS — they live in their OWN section. One-time
  // self-heal: any legacy material rows stored in the wiki section (the old
  // shared system) migrate over automatically. There are NO shiny materials:
  // any 'shiny-'-prefixed material junk is dropped outright.
  let materialsMigrated = false;
  for (const slug of Object.keys(bundle.wikiOverrides || {})) {
    const row = bundle.wikiOverrides[slug];
    if (row && typeof row === 'object' && row.kind === 'material') {
      if (!slug.startsWith('shiny-')) bundle.materialOverrides[slug] = row;
      delete bundle.wikiOverrides[slug];
      materialsMigrated = true;
    }
  }
  if (materialsMigrated) await writeOverridesBundle(env, bundle);
  return bundle;
}

async function writeOverridesBundle(env, bundle) {
  // readOverridesBundle() already fetched the raw value. Reuse it instead of
  // performing a second multi-megabyte KV read purely for the backup.
  const previous = env.APEX_OVERRIDES
    ? (RAW_BUNDLE_CACHE.key === 'staticOverrides'
        ? RAW_BUNDLE_CACHE.value
        : await env.APEX_OVERRIDES.get('staticOverrides').catch(() => null))
    : IN_MEMORY_DB_FALLBACK;
  bundle.__v = (bundle.__v || 0) + 1;
  bundle.timestamp = new Date().toISOString();
  const serialized = JSON.stringify(bundle);
  try {
    if (env.APEX_OVERRIDES) {
      // The main record must land first: it is the source of truth.
      await env.APEX_OVERRIDES.put('staticOverrides', serialized);
      rememberRawBundle(serialized);
      // Metadata + rollback are non-critical: run them together, tolerate
      // individual failures, and never fail an already-committed edit.
      await Promise.allSettled([
        env.APEX_OVERRIDES.put('bundleMeta', JSON.stringify({ v: bundle.__v, at: bundle.timestamp })),
        previous && previous !== serialized
          ? env.APEX_OVERRIDES.put('backup:previous', previous)
          : Promise.resolve(null),
      ]);
    } else {
      IN_MEMORY_DB_FALLBACK = serialized;
      rememberRawBundle(serialized);
    }
    invalidateDataCaches();
  } catch (e) {
    return new Response(JSON.stringify({ error: `KV Write Failed: ${e.message}` }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
  return null; // success
}

/** Cheap bundle version. Cached for a few seconds so a fleet of polling
 *  visitors costs one KV read per edge isolate instead of one per request. */
async function readBundleMeta(env) {
  if (META_CACHE.value && Date.now() - META_CACHE.at < META_TTL_MS) return META_CACHE.value;
  let meta = { v: 0, at: null };
  try {
    const raw = env.APEX_OVERRIDES ? await env.APEX_OVERRIDES.get('bundleMeta') : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      meta = { v: typeof parsed.v === 'number' ? parsed.v : 0, at: parsed.at || null };
    } else {
      const bundle = await readOverridesBundle(env);
      meta = { v: typeof bundle.__v === 'number' ? bundle.__v : 0, at: bundle.timestamp || null };
    }
  } catch { /* neutral version: clients simply fetch the bundle */ }
  META_CACHE.value = meta; META_CACHE.at = Date.now();
  return meta;
}

// History storage is best effort, but a failed/malformed read must never be
// replaced with an empty array. Returning a status lets clients be truthful
// when a database write succeeded but its audit record could not be stored.
function archivedChangeKey(entry) {
  const ms = Date.parse(entry?.at || '');
  // Reverse timestamp means KV's lexical order is newest archived entry first.
  const inverse = Number.isFinite(ms) ? String(9999999999999 - ms).padStart(13, '0') : '9999999999999';
  return `auditArchive:change:${inverse}:${encodeURIComponent(String(entry?.id ?? crypto.randomUUID()))}`;
}
function archivedHistoryKey(section, slug, id) {
  return `auditArchive:history:${section}:${encodeURIComponent(slug)}:${encodeURIComponent(String(id))}`;
}

async function appendChangeLog(env, entry) {
  try {
    const raw = env.APEX_OVERRIDES ? await env.APEX_OVERRIDES.get('changeLog') : IN_MEMORY_CHANGELOG_FALLBACK;
    const arr = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(arr)) return false;
    arr.unshift(entry);
    if (arr.length > 200 && env.APEX_OVERRIDES) {
      // Preserve evicted entries before shortening the hot feed. If archiving
      // fails, do not overwrite the existing feed; report an audit failure.
      for (const old of arr.slice(200)) await env.APEX_OVERRIDES.put(archivedChangeKey(old), JSON.stringify(old));
      arr.length = 200;
    }
    const serialized = JSON.stringify(arr);
    if (env.APEX_OVERRIDES) await env.APEX_OVERRIDES.put('changeLog', serialized);
    else IN_MEMORY_CHANGELOG_FALLBACK = serialized;
    return true;
  } catch { return false; }
}

async function readChangeLog(env) {
  const raw = env.APEX_OVERRIDES ? await env.APEX_OVERRIDES.get('changeLog') : IN_MEMORY_CHANGELOG_FALLBACK;
  const arr = raw ? JSON.parse(raw) : [];
  if (!Array.isArray(arr)) throw new Error('Change log is malformed');
  return arr;
}

async function appendUnitHistory(env, section, slug, record) {
  if (!env.APEX_OVERRIDES) return false;
  const key = `history:${section}:${slug}`;
  try {
    const raw = await env.APEX_OVERRIDES.get(key);
    let arr = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(arr)) return false;
    arr.push(record);
    if (arr.length > 50) {
      for (const old of arr.slice(0, -50)) {
        await env.APEX_OVERRIDES.put(archivedHistoryKey(section, slug, old.id ?? crypto.randomUUID()), JSON.stringify(old));
      }
      arr = arr.slice(-50);
    }
    await env.APEX_OVERRIDES.put(key, JSON.stringify(arr));
    return true;
  } catch { return false; }
}

async function readUnitHistory(env, section, slug) {
  if (!env.APEX_OVERRIDES) return [];
  const raw = await env.APEX_OVERRIDES.get(`history:${section}:${slug}`);
  const arr = raw ? JSON.parse(raw) : [];
  if (!Array.isArray(arr)) throw new Error('Unit history is malformed');
  return arr;
}

// Single source of truth for the team: one map, everything else derives from
// it. New entries do not receive an automatic password; provision them securely.
const TEAM_ROLES = {
  'gustavo.rb1410@gmail.com': 'owner',
  'bananatempest25@gmail.com': 'admin',
  'johnmustard129@gmail.com': 'admin',
  'isaacconnan@gmail.com': 'admin',
  'bigbig4780@gmail.com': 'editor',
  // Moonlight — Editor (Values + WIKI), confirmed by the operator.
  // No passcode lives in this file; provision it out-of-band in the
  // `adminPasswords` KV map (see DEPLOY-WORKER.md).
  'mnlghtapexhelper@gmail.com': 'editor',
  // Added on operator request (2026-11-02): least-privilege Values + WIKI editor.
  // Onboard with an invite link from /admin -> Team & access; no passcode in code.
  'knwasdo@gmail.com': 'editor',
};

const TEAM_EMAILS = Object.keys(TEAM_ROLES);

// Rarities that always require owner approval
const HIGH_VALUE_RARITIES = ['Shiny Transcendents', 'Shiny Omegas'];

// Max change amount before requiring approval (for non-high-value units)
const AUTO_APPROVE_LIMIT = 5_000_000;

export default {
  async fetch(request, env, ctx) {
    try {
      const response = await handleRequest(request, env, ctx);
      return addCorsHeaders(request, response);
    } catch (e) {
      return addCorsHeaders(
        request,
        new Response(JSON.stringify({ error: e.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        })
      );
    }
  }
};

async function handleRequest(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname;

  // CSRF: browsers always send Origin on cross-origin writes. Only the two
  // official realms may mutate the shared database.
  if (isWriteMethod(request.method) && !originAllowed(request)) {
    return new Response(JSON.stringify({ error: 'Origin not allowed' }), {
      status: 403, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  }

  // WORKER VERSION — bump on every deploy. The admin dashboard compares
  // this against the version the site expects and shows a chip when the
  // worker is outdated (features that need a deploy stay visible).
  if (path === '/version' && request.method === 'GET') {
    return new Response(JSON.stringify({ version: WORKER_VERSION }), { status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  }

  // Deployment health check. Verify the KV binding is actually attached and
  // that the session secret is configured before trusting this worker with
  // editor writes. Read-only; safe to call from anywhere.
  if (path === '/health' && request.method === 'GET') {
    let provisioned = 0;
    let pendingInvites = 0;
    try {
      const raw = env.APEX_OVERRIDES ? await env.APEX_OVERRIDES.get('adminPasswords') : IN_MEMORY_PASSWORDS_FALLBACK;
      const map = raw ? JSON.parse(raw) : {};
      provisioned = Object.keys(map).filter((email) => TEAM_ROLES[email]).length;
    } catch { /* never fail /health over a credential read */ }
    try {
      const raw = env.APEX_OVERRIDES ? await env.APEX_OVERRIDES.get('adminInvites') : null;
      const invites = raw ? JSON.parse(raw) : {};
      pendingInvites = Object.values(invites).filter((i) => i && i.expiresAt > Date.now()).length;
    } catch { /* ignore */ }
    return jsonResponse({
      ok: true,
      version: WORKER_VERSION,
      kvBound: Boolean(env.APEX_OVERRIDES),
      sessions: Boolean(env.APEX_SESSION_SECRET),
      allowedOrigins: [...ALLOWED_ORIGINS],
      statusEndpoint: true,
      cache: 'hot-path',
      authBackend: 'invites-v3',
      provisionedAccounts: provisioned,
      rosterSize: Object.keys(TEAM_ROLES).length,
      pendingInvites,
    });
  }

  // Same-origin UTC clock. Replaces third-party time APIs so public visitors
  // do not leak their IP address to unrelated services.
  if (path === '/time' && request.method === 'GET') {
    return new Response(JSON.stringify({ ms: Date.now(), utc: new Date().toISOString() }), {
      status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  }

  // Lightweight bundle version (~80 bytes). ETag lets a polling browser pay
  // only the 304 cost when nothing changed.
  if (path === '/overrides/version' && request.method === 'GET') {
    const meta = await readBundleMeta(env);
    const etag = `W/"v${meta.v}"`;
    if (request.headers.get('If-None-Match') === etag) {
      return new Response(null, { status: 304, headers: { 'ETag': etag, 'Cache-Control': 'public, max-age=15', 'Vary': 'Origin' } });
    }
    return new Response(JSON.stringify({ version: meta.v, updatedAt: meta.at }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'ETag': etag, 'Cache-Control': 'public, max-age=15', 'Vary': 'Origin' },
    });
  }

  // ONE consolidated status request replaces three independent 30-60s polls
  // (bundle version, maintenance, announcements). A single tab is elected
  // leader via BroadcastChannel and shares the result with the others.
  if (path === '/status' && request.method === 'GET') {
    const meta = await readBundleMeta(env);
    let maintenance = { on: false, message: '', confirmed: true };
    try {
      const raw = env.APEX_OVERRIDES ? await env.APEX_OVERRIDES.get('maintenance') : IN_MEMORY_MAINTENANCE_FALLBACK;
      if (raw) {
        const parsed = JSON.parse(raw);
        maintenance = { on: !!parsed.on, message: parsed.message || '', confirmed: true };
      }
    } catch { /* default: open and confirmed */ }
    let announcements = [];
    try { announcements = publicData(await readAnnouncements(env)); } catch { /* empty list */ }
    const etag = `W/"s${meta.v}:${maintenance.on ? 1 : 0}:${announcements.length}"`;
    if (request.headers.get('If-None-Match') === etag) {
      return new Response(null, { status: 304, headers: { 'ETag': etag, 'Cache-Control': 'no-store', 'Vary': 'Origin' } });
    }
    return new Response(JSON.stringify({
      v: meta.v,
      at: meta.at,
      time: Date.now(),
      workerVersion: WORKER_VERSION,
      maintenance,
      announcements,
    }), { status: 200, headers: { 'Content-Type': 'application/json', 'ETag': etag, 'Cache-Control': 'no-store', 'Vary': 'Origin' } });
  }

  // Short-lived, HMAC-signed session token. Editors keep the token in
  // sessionStorage instead of a plaintext passcode in localStorage. When the
  // secret is not configured the endpoint reports legacy mode and clients
  // fall back to passcode headers (backwards compatible with the old worker).
  if (path === '/session' && request.method === 'POST') {
    if (!env.APEX_SESSION_SECRET) {
      return new Response(JSON.stringify({ legacy: true }), { status: 501, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
    }
    const rl = rateLimited(`session:${clientIp(request)}`, 10, 10 * 60 * 1000);
    if (rl) return tooManyResponse(rl);
    // This handler runs BEFORE authHeaders is built, so read the raw headers.
    const email = String(request.headers.get('x-admin-email') || '').trim().toLowerCase();
    const passcode = request.headers.get('x-admin-passcode') || '';
    const passwords = await getPasswordsMap();
    if (!Object.prototype.hasOwnProperty.call(TEAM_ROLES, email)) {
      recordLoginFail(clientIp(request));
      return authFailure('not_on_roster');
    }
    if (!passwords[email]) {
      recordLoginFail(clientIp(request));
      return authFailure('account_not_provisioned', 403);
    }
    if (WEAK_PASSCODES.has(passcode)) {
      recordLoginFail(clientIp(request));
      return authFailure('legacy_default', 403);
    }
    if (passcode !== passwords[email]) {
      recordLoginFail(clientIp(request));
      return authFailure('invalid_passcode');
    }
    const expiresAt = Date.now() + SESSION_TTL_MS;
    const emailB64 = btoa(email);
    // Binding the token to the current passcode means "log out everywhere"
    // (which rotates the passcode) instantly invalidates every other session.
    const passHash = await sha256Hex(passwords[email]);
    const payload = `${emailB64}.${expiresAt}.${passHash}`;
    const signature = await hmacHex(env.APEX_SESSION_SECRET, payload);
    return new Response(JSON.stringify({ token: `${payload}.${signature}`, expiresAt, email }), {
      status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  }

  // Handle CORS preflight check immediately with standard 204 No Content
  if (request.method === 'OPTIONS') {
    const origin = requestOrigin(request);
    if (origin && !ALLOWED_ORIGINS.has(origin)) {
      return new Response(JSON.stringify({ error: 'Origin not allowed' }), {
        status: 403, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      });
    }
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': origin || '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': ADMIN_HEADERS,
        'Access-Control-Max-Age': '600',
        'Vary': 'Origin',
      },
    });
  }

  // Helper: Retrieve all individual admin passwords map (KV or fallback or defaults)
  async function getPasswordsMap() {
    if (CREDENTIAL_CACHE.value && Date.now() - CREDENTIAL_CACHE.at < CREDENTIAL_TTL_MS) return CREDENTIAL_CACHE.value;
    let passwordsText = null;
    try {
      if (env.APEX_OVERRIDES) {
        passwordsText = await env.APEX_OVERRIDES.get('adminPasswords');
      } else {
        passwordsText = IN_MEMORY_PASSWORDS_FALLBACK;
      }
    } catch (e) {
      console.error('Failed to read passwords from KV:', e);
    }

    let map = {};
    if (passwordsText) {
      try {
        map = JSON.parse(passwordsText);
      } catch (e) {
        console.error('Failed to parse passwords map:', e);
      }
    }

    // Do not create shared, publicly known default passwords. The operator
    // must provision unique credentials in KV for new roster members.
    let updated = false;

    // Roster changes must actually revoke access: /login, /overrides and the
    // delete routes all authorise against this map rather than TEAM_ROLES, so
    // anyone still listed here keeps a working passcode after leaving the team.
    const roster = new Set(TEAM_EMAILS.map((e) => e.toLowerCase().trim()));
    for (const stored of Object.keys(map)) {
      if (!roster.has(stored.toLowerCase().trim())) {
        delete map[stored];
        updated = true;
      }
    }

    // Cache back to KV if updated
    if (updated) {
      try {
        const serialized = JSON.stringify(map);
        if (env.APEX_OVERRIDES) {
          await env.APEX_OVERRIDES.put('adminPasswords', serialized);
        } else {
          IN_MEMORY_PASSWORDS_FALLBACK = serialized;
        }
      } catch (e) {
        console.error('Failed to write initialized passwords to KV:', e);
      }
    }

    CREDENTIAL_CACHE.value = map; CREDENTIAL_CACHE.at = Date.now();
    return map;
  }

  // Persist credential changes in one place. Every write invalidates the
  // in-isolate cache so the very next request sees the new passcode.
  async function writePasswordsMap(map) {
    const serialized = JSON.stringify(map);
    if (env.APEX_OVERRIDES) await env.APEX_OVERRIDES.put('adminPasswords', serialized);
    else IN_MEMORY_PASSWORDS_FALLBACK = serialized;
    invalidateCredentialCache();
  }

  async function readInvites() {
    try {
      const raw = env.APEX_OVERRIDES ? await env.APEX_OVERRIDES.get('adminInvites') : null;
      const parsed = raw ? JSON.parse(raw) : {};
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch { return {}; }
  }
  async function writeInvites(map) {
    if (env.APEX_OVERRIDES) await env.APEX_OVERRIDES.put('adminInvites', JSON.stringify(map));
  }
  async function auditAuth(action, actor, target, detail = '') {
    try {
      const raw = env.APEX_OVERRIDES ? await env.APEX_OVERRIDES.get('adminAudit') : null;
      const list = raw ? JSON.parse(raw) : [];
      const entries = Array.isArray(list) ? list : [];
      entries.unshift({ at: new Date().toISOString(), action, actor, target, detail });
      if (env.APEX_OVERRIDES) await env.APEX_OVERRIDES.put('adminAudit', JSON.stringify(entries.slice(0, 50)));
    } catch { /* audit must never break a credential operation */ }
  }

  // A claimed email alone is never sufficient for private data or cache bypass.
  // Normalize admin auth ONCE. A validated signed session hydrates the legacy
  // email/passcode headers so every existing per-endpoint guard keeps working,
  // while the browser never retains a long-lived plaintext passcode. Tokens
  // are bound to the current passcode hash: rotating a passcode (logout-all or
  // change-password) revokes all outstanding sessions immediately.
  const authHeaders = new Headers(request.headers);
  const sessionToken = request.headers.get('x-admin-session') || '';
  const sessionSecret = env.APEX_SESSION_SECRET;
  if (sessionToken && sessionSecret) {
    const parts = sessionToken.split('.');
    if (parts.length === 4) {
      const [emailB64, expText, passHash, signature] = parts;
      const payload = `${emailB64}.${expText}.${passHash}`;
      const expected = await hmacHex(sessionSecret, payload);
      const expiresAt = Number(expText);
      if (expected === signature && Number.isFinite(expiresAt) && expiresAt > Date.now()) {
        let candidate = '';
        try { candidate = atob(emailB64).trim().toLowerCase(); } catch { /* invalid */ }
        if (candidate && Object.prototype.hasOwnProperty.call(TEAM_ROLES, candidate)) {
          const passwords = await getPasswordsMap();
          const currentHash = await sha256Hex(passwords[candidate] || '');
          if (currentHash === passHash) {
            authHeaders.set('x-admin-email', candidate);
            authHeaders.set('x-admin-passcode', passwords[candidate] || '');
          }
        }
      }
    }
  }

  async function computeAuthenticatedAdmin() {
    const email = String(authHeaders.get('x-admin-email') || '').trim().toLowerCase();
    const passcode = authHeaders.get('x-admin-passcode') || '';
    if (!email && !passcode) return null;
    const ip = clientIp(request);
    if (loginBlocked(ip)) return null;
    if (!email || !passcode || WEAK_PASSCODES.has(passcode) || !Object.prototype.hasOwnProperty.call(TEAM_ROLES, email)) {
      recordLoginFail(ip);
      return null;
    }
    const passwords = await getPasswordsMap();
    if (passwords[email] && passwords[email] === passcode) {
      LOGIN_ATTEMPTS.delete(ip);
      return email;
    }
    recordLoginFail(ip);
    return null;
  }

  // The global guard and the per-endpoint guard both ask this question.
  // Resolve it once per request so a single bad login cannot burn several
  // rate-limit slots, and a valid session triggers only one KV lookup.
  let adminAuthPromise = null;
  function authenticatedAdmin() {
    if (!adminAuthPromise) adminAuthPromise = computeAuthenticatedAdmin();
    return adminAuthPromise;
  }

  // One authorization primitive for the whole admin panel. Previously a dozen
  // handlers each re-read headers and re-compared a plaintext passcode; this
  // centralizes role checks so a change to the credential store applies once.
  async function requireAdminRole(roles = null) {
    const email = await authenticatedAdmin();
    if (!email) return null;
    const role = TEAM_ROLES[email];
    if (roles && !roles.includes(role)) return null;
    return { email, role };
  }
  function denyAdmin(code = 'unauthorized', status = 401) {
    return authFailure(code, status);
  }

  // ---- Admin account onboarding / recovery (invites-v3) -------------------
  // Owner or admin creates a single-use invite; the new editor opens a link and
  // receives a freshly generated strong passcode exactly once. No KV console
  // access, no shared default password, no password sent over chat.
  if (path === '/admin/accounts' && request.method === 'GET') {
    const admin = await requireAdminRole(['owner', 'admin']);
    if (!admin) return denyAdmin('forbidden', 403);
    const passwords = await getPasswordsMap();
    return jsonResponse({
      version: WORKER_VERSION,
      sessions: Boolean(env.APEX_SESSION_SECRET),
      accounts: Object.entries(TEAM_ROLES).map(([email, role]) => ({
        email, role, provisioned: Boolean(passwords[email]),
      })),
    });
  }

  if (path === '/admin/invite' && request.method === 'POST') {
    const admin = await requireAdminRole(['owner', 'admin']);
    if (!admin) return denyAdmin('forbidden', 403);
    const payload = await request.json().catch(() => null);
    const email = normalizeTeamEmail(payload?.email);
    if (!Object.prototype.hasOwnProperty.call(TEAM_ROLES, email)) {
      return jsonResponse({ error: 'That email is not on the team roster.', code: 'not_on_roster' }, 400);
    }
    // Editors cannot mint owner/admin invites; an admin may not elevate anyone.
    if (admin.role !== 'owner' && TEAM_ROLES[email] !== 'editor') {
      return jsonResponse({ error: 'Only the owner can invite owners or admins.', code: 'forbidden' }, 403);
    }
    const rl = rateLimited(`invite:${clientIp(request)}`, 12, 10 * 60 * 1000);
    if (rl) return tooManyResponse(rl);
    const ttlMinutes = Math.min(Math.max(Number(payload?.ttlMinutes) || 60, 5), 60 * 24 * 7);
    const expiresAt = Date.now() + ttlMinutes * 60000;
    const token = strongPasscode(32);
    const tokenHash = await sha256Hex(token);
    const invites = await readInvites();
    // Expire stale invites on every mint so the record cannot grow unbounded.
    for (const [hash, invite] of Object.entries(invites)) {
      if (!invite || invite.expiresAt <= Date.now()) delete invites[hash];
    }
    invites[tokenHash] = { email, role: TEAM_ROLES[email], expiresAt, issuedBy: admin.email, createdAt: Date.now() };
    await writeInvites(invites);
    await auditAuth('invite.created', admin.email, email, `expires in ${ttlMinutes} min`);
    return jsonResponse({
      email, role: TEAM_ROLES[email], token, expiresAt,
      claimPath: `/invite?token=${encodeURIComponent(token)}`,
      note: 'Share this link once. The passcode is generated when it is opened.',
    });
  }

  if (path === '/admin/claim' && request.method === 'POST') {
    const rl = rateLimited(`claim:${clientIp(request)}`, 10, 10 * 60 * 1000);
    if (rl) return tooManyResponse(rl);
    const payload = await request.json().catch(() => null);
    const token = String(payload?.token || '').trim();
    if (token.length < 20) return authFailure('invalid_passcode', 400);
    const tokenHash = await sha256Hex(token);
    const invites = await readInvites();
    const invite = invites[tokenHash];
    if (!invite || invite.expiresAt <= Date.now()) {
      delete invites[tokenHash];
      await writeInvites(invites);
      return jsonResponse({ error: 'This invite link has expired or was already used. Ask an owner for a new one.', code: 'invite_expired' }, 410);
    }
    const email = normalizeTeamEmail(invite.email);
    if (!Object.prototype.hasOwnProperty.call(TEAM_ROLES, email)) {
      delete invites[tokenHash];
      await writeInvites(invites);
      return authFailure('not_on_roster', 403);
    }
    const passcode = strongPasscode(24);
    const passwords = await getPasswordsMap();
    const replacing = Boolean(passwords[email]);
    passwords[email] = passcode;
    await writePasswordsMap(passwords);
    delete invites[tokenHash];
    await writeInvites(invites);
    await auditAuth(replacing ? 'passcode.reset_by_invite' : 'account.provisioned', invite.issuedBy || 'system', email);
    // Returned ONCE. The client must show it immediately and never log it.
    return jsonResponse({
      email, role: TEAM_ROLES[email], passcode,
      message: 'Save this passcode now — it will not be shown again.',
    });
  }

  if (path === '/admin/reset-passcode' && request.method === 'POST') {
    const admin = await requireAdminRole(['owner', 'admin']);
    if (!admin) return denyAdmin('forbidden', 403);
    const payload = await request.json().catch(() => null);
    const email = normalizeTeamEmail(payload?.email);
    if (!Object.prototype.hasOwnProperty.call(TEAM_ROLES, email)) {
      return jsonResponse({ error: 'That email is not on the team roster.', code: 'not_on_roster' }, 400);
    }
    if (admin.role !== 'owner' && TEAM_ROLES[email] !== 'editor' && email !== admin.email) {
      return jsonResponse({ error: 'Only the owner may reset another admin.', code: 'forbidden' }, 403);
    }
    const rl = rateLimited(`reset:${clientIp(request)}`, 12, 10 * 60 * 1000);
    if (rl) return tooManyResponse(rl);
    const passcode = strongPasscode(24);
    const passwords = await getPasswordsMap();
    passwords[email] = passcode;
    await writePasswordsMap(passwords);
    // Rotation also revokes every HMAC session bound to the old passcode.
    await auditAuth('passcode.reset', admin.email, email);
    return jsonResponse({
      email, passcode,
      message: 'Old passcode and every active session were revoked. Share this new passcode once, privately.',
    });
  }

  // First-deploy escape hatch: only when NO roster account is provisioned and
  // the operator supplied APEX_BOOTSTRAP_SECRET as a Worker secret. Without
  // both conditions this endpoint is a no-op, so it cannot be abused.
  if (path === '/admin/bootstrap' && request.method === 'POST') {
    const secret = env.APEX_BOOTSTRAP_SECRET;
    if (!secret) return jsonResponse({ error: 'Bootstrap is not configured.', code: 'bootstrap_disabled' }, 404);
    const rl = rateLimited(`bootstrap:${clientIp(request)}`, 5, 10 * 60 * 1000);
    if (rl) return tooManyResponse(rl);
    const payload = await request.json().catch(() => null);
    if (String(payload?.secret || '') !== secret) return authFailure('invalid_passcode', 401);
    const passwords = await getPasswordsMap();
    const owner = Object.keys(TEAM_ROLES).find((email) => TEAM_ROLES[email] === 'owner');
    if (Object.keys(passwords).some((email) => TEAM_ROLES[email])) {
      return jsonResponse({ error: 'Accounts already exist. Use an invite or reset instead.', code: 'already_bootstrapped' }, 409);
    }
    const passcode = strongPasscode(24);
    passwords[owner] = passcode;
    await writePasswordsMap(passwords);
    await auditAuth('account.bootstrap', 'system', owner);
    return jsonResponse({ email: owner, passcode, message: 'Save this passcode now — it will not be shown again.' });
  }

  // A supplied admin header must pass the same checks for every endpoint;
  // this also applies the in-isolate login lockout to write endpoints. This is
  // defense in depth, not a substitute for Access/MFA or distributed rate limits.
  const hasAdminHeaders = Boolean(authHeaders.get('x-admin-email') || authHeaders.get('x-admin-passcode') || sessionToken);
  if (hasAdminHeaders && path !== '/session' && !await authenticatedAdmin()) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  }

  // 1. GET /bug-reports - Team only; existing records may contain PII.
  if (path === '/bug-reports' && request.method === 'GET') {
    if (!await authenticatedAdmin()) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
    let data = null;
    try {
      if (env.APEX_OVERRIDES) {
        data = await env.APEX_OVERRIDES.get('bugReports');
      } else {
        data = IN_MEMORY_BUG_REPORTS;
      }
    } catch (e) {
      console.error('Failed to read bug reports from KV:', e);
    }
    if (!data) data = '[]';
    return new Response(data, {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  }

  // 2. POST /bug-reports - Submit a bug report into KV
  if (path === '/bug-reports' && request.method === 'POST') {
    // Rate limit: 5 reports per IP per hour — stops spam floods cold.
    const rl = rateLimited(`bug-report:${clientIp(request)}`, 5, 60 * 60 * 1000);
    if (rl) return tooManyResponse(rl);

    const payloadText = await request.text();
    if (payloadText.length > 2048) return new Response(JSON.stringify({ error: 'Report payload too large.' }), { status: 413, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
    let newReport = null;
    try {
      newReport = JSON.parse(payloadText);
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Invalid JSON payload format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // The public form accepts fixed, non-identifying choices only. Never
    // persist free text, URLs, browser strings, or contact information.
    const categories = ['Wrong Data', 'Broken Link', 'UI/Display Issue', 'Missing Information', 'Performance', 'Crash/Error', 'Other'];
    const areas = ['Home', 'Wiki', 'Values', 'Trade Calculator', 'Minigames', 'Other'];
    if (newReport?.type !== 'structured-v1' || !categories.includes(newReport.category) || !areas.includes(newReport.area)) {
      return new Response(JSON.stringify({ error: 'Please update the site and choose an issue type and site area.' }), { status: 400, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
    }
    const { category, area } = newReport;
    newReport = { title: `${category} — ${area}`, category, description: `Issue: ${category}; area: ${area}.`, page_url: '', contact: null, browser: null };

    let reports = [];
    try {
      let raw = null;
      if (env.APEX_OVERRIDES) {
        raw = await env.APEX_OVERRIDES.get('bugReports');
      } else {
        raw = IN_MEMORY_BUG_REPORTS;
      }
      if (raw) reports = JSON.parse(raw);
    } catch {}

    // DEDUPE: an identical OPEN report (same normalized title + page) folds
    // into the existing row and bumps its count instead of spamming the list.
    const norm = (v) => String(v || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const dupKey = `${norm(newReport.title)}|${norm(newReport.page_url)}`;
    const dup = reports.find((r) => !r.resolved && (r.dup_key || `${norm(r.title)}|${norm(r.page_url)}`) === dupKey);
    if (dup) {
      dup.count = (dup.count || 1) + 1;
      dup.last_duplicate_at = new Date().toISOString();
      try {
        const serialized = JSON.stringify(reports);
        if (env.APEX_OVERRIDES) {
          await env.APEX_OVERRIDES.put('bugReports', serialized);
        } else {
          IN_MEMORY_BUG_REPORTS = serialized;
        }
      } catch (e) {
        return new Response(JSON.stringify({ error: `KV Write Failed: ${e.message}` }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ success: true, merged: true, message: 'Thanks! We already had this one — your report was counted.' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const reportId = Date.now() + Math.floor(Math.random() * 1000);
    const reportRow = {
      id: reportId,
      title: newReport.title || 'Untitled Report',
      category: newReport.category || 'Other',
      description: newReport.description || '',
      page_url: newReport.page_url || '',
      contact: newReport.contact || null,
      browser: newReport.browser || null,
      count: 1,
      dup_key: dupKey,
      resolved: false,
      created_at: new Date().toISOString()
    };

    reports.push(reportRow);

    // Storage cap: keep at most 500 rows — oldest resolved ones go first.
    if (reports.length > 500) {
      const resolvedOld = reports.filter((r) => r.resolved).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      let overflow = reports.length - 500;
      for (const r of resolvedOld) {
        if (overflow <= 0) break;
        reports = reports.filter((x) => x.id !== r.id);
        overflow -= 1;
      }
      if (reports.length > 500) reports = reports.slice(-500);
    }

    try {
      const serialized = JSON.stringify(reports);
      if (env.APEX_OVERRIDES) {
        await env.APEX_OVERRIDES.put('bugReports', serialized);
      } else {
        IN_MEMORY_BUG_REPORTS = serialized;
      }
    } catch (e) {
      return new Response(JSON.stringify({ error: `KV Write Failed: ${e.message}` }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, message: 'Bug report submitted successfully!' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 3. POST /bug-reports/resolve - Mark bug report resolved in KV (Admin-only)
  if (path === '/bug-reports/resolve' && request.method === 'POST') {
    let passcode = null;
    let emailHeader = null;
    authHeaders.forEach((val, key) => {
      const k = key.toLowerCase();
      if (k === 'x-admin-passcode') passcode = val;
      if (k === 'x-admin-email') emailHeader = val;
    });

    const passwordsMap = await getPasswordsMap();
    const cleanEmail = String(emailHeader || '').trim().toLowerCase();

    if (!cleanEmail || !Object.prototype.hasOwnProperty.call(passwordsMap, cleanEmail)) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Email not found on the APEX team roster.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const expectedPass = passwordsMap[cleanEmail];
    if (!passcode || passcode !== expectedPass) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Invalid Admin Passcode or Session' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const payloadText = await request.text();
    let payload = null;
    try {
      payload = JSON.parse(payloadText);
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Invalid JSON payload' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const reportId = Number(payload.id);
    let reports = [];
    try {
      let raw = null;
      if (env.APEX_OVERRIDES) {
        raw = await env.APEX_OVERRIDES.get('bugReports');
      } else {
        raw = IN_MEMORY_BUG_REPORTS;
      }
      if (raw) reports = JSON.parse(raw);
    } catch {}

    reports = reports.map(r => r.id === reportId ? { ...r, resolved: true } : r);

    try {
      const serialized = JSON.stringify(reports);
      if (env.APEX_OVERRIDES) {
        await env.APEX_OVERRIDES.put('bugReports', serialized);
      } else {
        IN_MEMORY_BUG_REPORTS = serialized;
      }
    } catch (e) {
      return new Response(JSON.stringify({ error: `KV Write Failed: ${e.message}` }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, message: 'Resolved successfully!' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 4. POST /bug-reports/delete - Delete a bug report from KV (Admin-only)
  if (path === '/bug-reports/delete' && request.method === 'POST') {
    let passcode = null;
    let emailHeader = null;
    authHeaders.forEach((val, key) => {
      const k = key.toLowerCase();
      if (k === 'x-admin-passcode') passcode = val;
      if (k === 'x-admin-email') emailHeader = val;
    });

    const passwordsMap = await getPasswordsMap();
    const cleanEmail = String(emailHeader || '').trim().toLowerCase();

    if (!cleanEmail || !Object.prototype.hasOwnProperty.call(passwordsMap, cleanEmail)) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Email not found on the APEX team roster.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const expectedPass = passwordsMap[cleanEmail];
    if (!passcode || passcode !== expectedPass) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Invalid Admin Passcode or Session' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const payloadText = await request.text();
    let payload = null;
    try {
      payload = JSON.parse(payloadText);
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Invalid JSON payload' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const reportId = Number(payload.id);
    let reports = [];
    try {
      let raw = null;
      if (env.APEX_OVERRIDES) {
        raw = await env.APEX_OVERRIDES.get('bugReports');
      } else {
        raw = IN_MEMORY_BUG_REPORTS;
      }
      if (raw) reports = JSON.parse(raw);
    } catch {}

    reports = reports.filter(r => r.id !== reportId);

    try {
      const serialized = JSON.stringify(reports);
      if (env.APEX_OVERRIDES) {
        await env.APEX_OVERRIDES.put('bugReports', serialized);
      } else {
        IN_MEMORY_BUG_REPORTS = serialized;
      }
    } catch (e) {
      return new Response(JSON.stringify({ error: `KV Write Failed: ${e.message}` }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, message: 'Deleted successfully!' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 5. GET /overrides - Read the live staticOverrides JSON database
  if (path === '/overrides' && request.method === 'GET') {
    // Edge cache: the 60s live-update poll from every visitor otherwise burns
    // one full-bundle KV read per poll (free tier: 100k reads/day). With the
    // cache, KV is read at most ~once a minute per edge location. Authenticated
    // admin requests skip the cache so editors always see fresh data.
    const isAdminFetch = Boolean(await authenticatedAdmin());
    const cache = globalThis.caches?.default;
    let cached = null;
    if (!isAdminFetch) {
      try { cached = await cache?.match(request.url); } catch { /* cache miss is fine */ }
      if (cached) {
        // Responses written by this worker are already redacted (marker).
        // Legacy entries are sanitized once, then re-cached below.
        if (cached.headers.get('X-Apex-Sanitized') === '1') return cached;
        try { return new Response(JSON.stringify(publicData(await cached.json())), { status: cached.status, headers: cached.headers }); } catch { /* read fresh */ }
      }
    }

    let data = null;
    let kvFailed = false;
    try {
      if (env.APEX_OVERRIDES) {
        data = await env.APEX_OVERRIDES.get('staticOverrides');
      } else {
        data = IN_MEMORY_DB_FALLBACK;
      }
    } catch (e) {
      // KV read failed (daily quota / transient). NEVER fall through to the
      // GitHub bootstrap below — that would overwrite the live database with
      // the static baseline and wipe every editor's overrides.
      console.error('KV read failed (NOT bootstrapping — live data must survive):', e);
      kvFailed = true;
    }

    if (kvFailed) {
      return new Response(JSON.stringify({ error: 'KV temporarily unavailable — try again shortly.' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      });
    }

    // Fallback: ONLY when KV is genuinely empty (fresh deployment), fetch the
    // latest baked database from the GitHub Pages live site.
    if (!data) {
      try {
        const fbResponse = await fetch('https://apexballvalueswiki.github.io/overrides/staticOverrides.json');
        if (fbResponse.ok) {
          data = await fbResponse.text();
          // Automatically bootstrap/cache it into KV so we don't have to fetch GitHub again!
          if (env.APEX_OVERRIDES) {
            await env.APEX_OVERRIDES.put('staticOverrides', data);
          } else {
            IN_MEMORY_DB_FALLBACK = data;
          }
        }
      } catch (err) {
        console.error('Failed to fetch static bootstrap from GitHub:', err);
      }
    }

    // Default fallback structure if KV database and GitHub fetch both failed
    if (!data) {
      data = JSON.stringify({
        timestamp: new Date().toISOString(),
        valueOverrides: {},
        wikiOverrides: {},
        mapOverrides: {},
        crateOverrides: {}
      });
    }

    // Admins receive the complete bundle; public requests never expose staff
    // identifiers. Fail closed if a malformed bundle cannot be redacted.
    let etag = 'W/"0"';
    let version = 0;
    try {
      // Reading __v from the raw string avoids a 7.5 MB JSON.parse on the
      // overwhelming majority of requests: after one build, every poll for
      // the same version is served from PUBLIC_BODY_CACHE or a browser 304.
      const found = typeof data === 'string' ? data.match(/"__v"\s*:\s*(\d+)/) : null;
      version = found ? Number(found[1]) : ((JSON.parse(data).__v || 0));
      etag = `W/"${version}"`;
      const hit = isAdminFetch ? null : PUBLIC_BODY_CACHE.get(version);
      if (hit) {
        data = hit;
      } else {
        const bundle = JSON.parse(data);
        if (typeof bundle.__v !== 'number') bundle.__v = version;
        data = JSON.stringify(isAdminFetch ? bundle : publicData(bundle));
        if (!isAdminFetch) {
          PUBLIC_BODY_CACHE.set(version, data);
          if (PUBLIC_BODY_CACHE.size > 3) PUBLIC_BODY_CACHE.delete(PUBLIC_BODY_CACHE.keys().next().value);
        }
      }
    } catch {
      return new Response(JSON.stringify({ error: 'Database data is temporarily unavailable.' }), { status: 503, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
    }

    if (!isAdminFetch && request.headers.get('If-None-Match') === etag) {
      return new Response(null, {
        status: 304,
        headers: { 'ETag': etag, 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300', 'Vary': 'Origin' },
      });
    }

    const response = new Response(data, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'ETag': etag,
        'Vary': 'Origin',
        ...(isAdminFetch
          ? { 'Cache-Control': 'no-store' }
          : { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300', 'X-Apex-Sanitized': '1' }),
      },
    });
    // Previously the worker only READ the edge cache and never filled it, so
    // every cold request still hit KV. Populate it out-of-band on the public
    // path; admin responses are never cached.
    if (!isAdminFetch && !request.headers.get('If-None-Match') && ctx?.waitUntil) {
      try {
        const cache = globalThis.caches?.default;
        if (cache) ctx.waitUntil(cache.put(new Request(request.url, { method: 'GET' }), response.clone()).catch(() => {}));
      } catch { /* cache API unavailable in some runtimes */ }
    }
    return response;
  }

  // 6. POST /overrides - Write the live staticOverrides JSON database
  if (path === '/overrides' && request.method === 'POST') {
    // Validate headers (support case-insensitive headers by scanning all keys)
    let passcode = null;
    let emailHeader = null;
    authHeaders.forEach((val, key) => {
      const k = key.toLowerCase();
      if (k === 'x-admin-passcode') passcode = val;
      if (k === 'x-admin-email') emailHeader = val;
    });

    const passwordsMap = await getPasswordsMap();
    const cleanEmail = String(emailHeader || '').trim().toLowerCase();

    // HARD REJECT unknown editors
    if (!cleanEmail || !Object.prototype.hasOwnProperty.call(passwordsMap, cleanEmail)) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Email not found on the APEX team roster.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const expectedPass = passwordsMap[cleanEmail];

    if (!passcode || passcode !== expectedPass) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Invalid Admin Passcode or Session' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const payloadText = await request.text();
    let payload = null;
    try {
      payload = JSON.parse(payloadText);
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Invalid JSON payload format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return new Response(JSON.stringify({ error: 'Expected a database bundle.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    // Require a current version for ordinary full-bundle publishes. Old or
    // offline clients must not overwrite the shared database with a partial
    // fallback; intentional force-restores remain an explicit admin action.
    const current = await readOverridesBundle(env);
    if (!payload.__forceRestore && typeof payload.__baseVersion !== 'number') {
      return new Response(JSON.stringify({ error: 'A current database version is required. Refresh and retry.', currentVersion: current.__v }), { status: 409, headers: { 'Content-Type': 'application/json' } });
    }
    if (!payload.__forceRestore && payload.__baseVersion !== current.__v) {
      return new Response(JSON.stringify({
        error: 'Out of date: the database changed while you were editing. Refetched and re-merged — please save again.',
        currentVersion: current.__v,
      }), { status: 409, headers: { 'Content-Type': 'application/json' } });
    }

    const nextBundle = payload.__forceRestore ? { ...payload } : { ...current, ...payload };
    // Older clients may have built their bundle from a public, redacted read.
    // Preserve private per-row metadata they did not send rather than silently
    // erasing it. An explicitly provided value (including null) still wins.
    if (!payload.__forceRestore) {
      for (const sectionKey of Object.values(BUNDLE_SECTIONS)) {
        const incoming = nextBundle[sectionKey];
        const previous = current[sectionKey];
        if (!incoming || !previous || typeof incoming !== 'object' || typeof previous !== 'object') continue;
        for (const [slug, row] of Object.entries(incoming)) {
          const old = previous[slug];
          if (!row || typeof row !== 'object' || Array.isArray(row) || !old || typeof old !== 'object') continue;
          for (const key of PRIVATE_PUBLIC_KEYS) {
            if (!(key in row) && Object.prototype.hasOwnProperty.call(old, key)) row[key] = old[key];
          }
        }
      }
    }
    // The version must remain monotonic even when restoring an older backup.
    nextBundle.__v = current.__v;
    delete nextBundle.__baseVersion;
    delete nextBundle.__forceRestore;

    const writeError = await writeOverridesBundle(env, nextBundle);
    if (writeError) return writeError;

    const auditStored = await appendChangeLog(env, {
      id: crypto.randomUUID(),
      at: new Date().toISOString(),
      by: cleanEmail,
      section: 'bundle',
      kind: 'bundle',
      detail: payload.__forceRestore ? 'Full database restore' : 'Full database publish',
    });

    return new Response(JSON.stringify({ success: true, version: nextBundle.__v, audit: { changeLog: auditStored }, message: auditStored ? 'Saved to the database.' : 'Saved to the database, but the change log could not be recorded.' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 7. POST /change-password - Update an individual editor's secure password in KV
  if (path === '/change-password' && request.method === 'POST') {
    const payloadText = await request.text();
    let payload = null;
    try {
      payload = JSON.parse(payloadText);
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Invalid JSON payload format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { email: rawEmail, currentPassword, newPassword } = payload;
    if (!rawEmail || !currentPassword || !newPassword) {
      return new Response(JSON.stringify({ error: 'Missing email, currentPassword or newPassword' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const cleanEmail = rawEmail.trim().toLowerCase();
    const cleanNewPassword = String(newPassword).trim();

    // The public legacy default cannot authenticate a reset. The operator must
    // provision a unique replacement out-of-band before access is restored.
    if (currentPassword === 'apex2026') {
      return new Response(JSON.stringify({ error: 'Legacy default disabled. Ask the operator to reset this account securely.' }), { status: 403, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
    }
    if (cleanNewPassword.length < 12 || cleanNewPassword.length > 200 || WEAK_PASSCODES.has(cleanNewPassword)) {
      return new Response(JSON.stringify({ error: 'Choose a unique passcode of 12 to 200 characters. A generated reset passcode is stronger.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const cpIp = clientIp(request);
    if (loginBlocked(cpIp)) {
      return new Response(JSON.stringify({ error: 'Too many failed attempts. Try again in a few minutes.' }), { status: 429, headers: { 'Content-Type': 'application/json' } });
    }

    const passwordsMap = await getPasswordsMap();

    if (!Object.prototype.hasOwnProperty.call(passwordsMap, cleanEmail)) {
      return new Response(JSON.stringify({ error: 'Email not found on the APEX team roster.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const livePass = passwordsMap[cleanEmail];

    if (currentPassword !== livePass) {
      recordLoginFail(cpIp);
      return new Response(JSON.stringify({ error: 'Incorrect current password' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    passwordsMap[cleanEmail] = cleanNewPassword;

    try {
      await writePasswordsMap(passwordsMap);
      await auditAuth('passcode.changed', cleanEmail, cleanEmail);
    } catch (e) {
      return new Response(JSON.stringify({ error: `KV Password Write Failed: ${e.message}` }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, message: 'Password updated successfully!' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 8. POST /login - Verify individual editor credentials
  if (path === '/login' && request.method === 'POST') {
    // Rate limit: 30 attempts per IP per hour (on top of the fail-lockout).
    const loginRl = rateLimited(`login:${clientIp(request)}`, 30, 60 * 60 * 1000);
    if (loginRl) return tooManyResponse(loginRl);

    const ip = clientIp(request);
    if (loginBlocked(ip)) {
      return new Response(JSON.stringify({ error: 'Too many failed attempts. Try again in a few minutes.' }), { status: 429, headers: { 'Content-Type': 'application/json' } });
    }
    const payloadText = await request.text();
    let payload = null;
    try {
      payload = JSON.parse(payloadText);
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Invalid JSON payload format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { email: rawEmail, password } = payload;
    if (!rawEmail || !password) {
      return new Response(JSON.stringify({ error: 'Missing email or password' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const cleanEmail = normalizeTeamEmail(rawEmail);
    const passwordsMap = await getPasswordsMap();

    if (!Object.prototype.hasOwnProperty.call(TEAM_ROLES, cleanEmail)) {
      recordLoginFail(ip);
      return authFailure('not_on_roster', 404);
    }
    if (!passwordsMap[cleanEmail]) {
      return authFailure('account_not_provisioned', 404);
    }
    if (WEAK_PASSCODES.has(password)) {
      recordLoginFail(ip);
      return authFailure('legacy_default', 403);
    }
    if (password !== passwordsMap[cleanEmail]) {
      recordLoginFail(ip);
      return authFailure('invalid_passcode');
    }

    LOGIN_ATTEMPTS.delete(ip);
    return new Response(JSON.stringify({ success: true, message: 'Authenticated successfully!', mustChangePassword: false }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // ANNOUNCEMENTS — a LIST of active announcements (multiple can be live at
  // once, each with its own type and expiry; max 5). Stored in KV as a JSON
  // array under 'announcements'; a legacy single-object value is migrated
  // automatically. Expired entries are dropped on every read/write.
  async function readAnnouncements(env) {
    let raw = null;
    try { raw = env.APEX_OVERRIDES ? await env.APEX_OVERRIDES.get('announcements') : IN_MEMORY_ANNOUNCEMENTS_FALLBACK; } catch {}
    let list = [];
    try {
      const parsed = raw ? JSON.parse(raw) : null;
      if (Array.isArray(parsed)) list = parsed;
      else if (parsed && parsed.message) list = [parsed]; // legacy single object
    } catch {}
    const now = Date.now();
    return list.filter((a) => a && a.message && (!a.expiresAt || new Date(a.expiresAt).getTime() > now));
  }
  async function writeAnnouncements(env, list) {
    const s = JSON.stringify(list.slice(0, 5));
    if (env.APEX_OVERRIDES) await env.APEX_OVERRIDES.put('announcements', s);
    else IN_MEMORY_ANNOUNCEMENTS_FALLBACK = s;
  }

  if (path === '/announcements' && request.method === 'GET') {
    try {
      const list = await readAnnouncements(env);
      return new Response(JSON.stringify({ announcements: publicData(list) }), { status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
    } catch (e) {
      return new Response(JSON.stringify({ announcements: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
  }

  if (path === '/announcements' && request.method === 'POST') {
    let passcode = null; let emailHeader = null;
    authHeaders.forEach((val, key) => { const k = key.toLowerCase(); if (k === 'x-admin-passcode') passcode = val; if (k === 'x-admin-email') emailHeader = val; });
    const passwordsMap = await getPasswordsMap();
    const cleanEmail = String(emailHeader || '').trim().toLowerCase();
    const role = TEAM_ROLES[cleanEmail];
    if (role !== 'owner' && role !== 'admin') return new Response(JSON.stringify({ error: 'Owner or admin only' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    if (passcode !== passwordsMap[cleanEmail]) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    const payload = await request.json().catch(() => null);
    const message = String(payload?.message || '').trim();
    if (!message) return new Response(JSON.stringify({ error: 'Missing message' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    if (message.length > 200) return new Response(JSON.stringify({ error: 'Message too long (max 200 chars)' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    const list = await readAnnouncements(env);
    if (list.length >= 5) return new Response(JSON.stringify({ error: 'Announcement limit reached (5 active). Clear one first.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    const announcement = { id: Date.now(), title: String(payload?.title || '').trim().slice(0, 60), message, type: payload.type || 'info', sentAt: new Date().toISOString(), expiresAt: new Date(Date.now() + (payload.durationMinutes || 60) * 60000).toISOString(), sentBy: cleanEmail };
    list.push(announcement);
    try { await writeAnnouncements(env, list); } catch (e) { return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } }); }
    await appendChangeLog(env, { id: announcement.id, at: new Date().toISOString(), by: cleanEmail, section: 'announcements', kind: 'edit', detail: `Published announcement: ${message.slice(0, 60)}` });
    return new Response(JSON.stringify({ success: true, announcements: list }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  const annSeg = path.split('/').filter(Boolean);
  if (annSeg[0] === 'announcements' && annSeg.length === 2 && request.method === 'DELETE') {
    let passcode = null; let emailHeader = null;
    authHeaders.forEach((val, key) => { const k = key.toLowerCase(); if (k === 'x-admin-passcode') passcode = val; if (k === 'x-admin-email') emailHeader = val; });
    const passwordsMap = await getPasswordsMap();
    const cleanEmail = String(emailHeader || '').trim().toLowerCase();
    const role = TEAM_ROLES[cleanEmail];
    if (role !== 'owner' && role !== 'admin') return new Response(JSON.stringify({ error: 'Owner or admin only' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    if (passcode !== passwordsMap[cleanEmail]) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    const list = await readAnnouncements(env);
    const next = list.filter((a) => String(a.id) !== String(annSeg[1]));
    try { await writeAnnouncements(env, next); } catch (e) { return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } }); }
    await appendChangeLog(env, { id: Date.now(), at: new Date().toISOString(), by: cleanEmail, section: 'announcements', kind: 'delete', detail: 'Removed an announcement' });
    return new Response(JSON.stringify({ success: true, announcements: next }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  if (path === '/announcements/clear' && request.method === 'POST') {
    let passcode = null; let emailHeader = null;
    authHeaders.forEach((val, key) => { const k = key.toLowerCase(); if (k === 'x-admin-passcode') passcode = val; if (k === 'x-admin-email') emailHeader = val; });
    const passwordsMap = await getPasswordsMap();
    const cleanEmail = String(emailHeader || '').trim().toLowerCase();
    const role = TEAM_ROLES[cleanEmail];
    if (role !== 'owner' && role !== 'admin') return new Response(JSON.stringify({ error: 'Owner or admin only' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    if (passcode !== passwordsMap[cleanEmail]) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    try { if (env.APEX_OVERRIDES) await env.APEX_OVERRIDES.delete('announcements'); else IN_MEMORY_ANNOUNCEMENTS_FALLBACK = null; } catch (e) { return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } }); }
    await appendChangeLog(env, { id: Date.now(), at: new Date().toISOString(), by: cleanEmail, section: 'announcements', kind: 'delete', detail: 'Cleared all announcements' });
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  // MAINTENANCE MODE — owner/admin can close the site for everyone except
  // the team. GET is public; POST is owner/admin-only.
  if (path === '/maintenance' && request.method === 'GET') {
    let state = { on: false };
    try {
      const raw = env.APEX_OVERRIDES ? await env.APEX_OVERRIDES.get('maintenance') : IN_MEMORY_MAINTENANCE_FALLBACK;
      if (raw) state = JSON.parse(raw);
    } catch {}
    return new Response(JSON.stringify({ on: !!state.on, message: state.message || '', at: state.at || null }), { status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  }
  if (path === '/maintenance' && request.method === 'POST') {
    let passcode = null; let emailHeader = null;
    authHeaders.forEach((val, key) => { const k = key.toLowerCase(); if (k === 'x-admin-passcode') passcode = val; if (k === 'x-admin-email') emailHeader = val; });
    const passwordsMap = await getPasswordsMap();
    const cleanEmail = String(emailHeader || '').trim().toLowerCase();
    const role = TEAM_ROLES[cleanEmail];
    if (role !== 'owner' && role !== 'admin') return new Response(JSON.stringify({ error: 'Owner or admin only' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    if (passcode !== passwordsMap[cleanEmail]) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    const payload = await request.json().catch(() => null);
    const state = { on: !!payload?.on, message: String(payload?.message || '').slice(0, 200), at: new Date().toISOString(), by: cleanEmail };
    try {
      const s = JSON.stringify(state);
      if (env.APEX_OVERRIDES) await env.APEX_OVERRIDES.put('maintenance', s);
      else IN_MEMORY_MAINTENANCE_FALLBACK = s;
    } catch (e) { return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } }); }
    await appendChangeLog(env, { id: Date.now(), at: new Date().toISOString(), by: cleanEmail, section: 'maintenance', kind: state.on ? 'edit' : 'delete', detail: state.on ? `Maintenance mode ON${state.message ? `: ${state.message}` : ''}` : 'Maintenance mode OFF' });
    return new Response(JSON.stringify({ success: true, ...state }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  // Public visitors see only approved art without staff metadata. Team
  // moderation tools may request the full list using verified credentials.
  if (path === '/fanart' && request.method === 'GET') {
    let data = null;
    try { if (env.APEX_OVERRIDES) data = await env.APEX_OVERRIDES.get('fanartEntries'); else data = IN_MEMORY_FANART_FALLBACK; } catch (e) { console.error('Failed to read fanart from KV:', e); }
    let entries = [];
    try { const parsed = data ? JSON.parse(data) : []; entries = Array.isArray(parsed) ? parsed : []; } catch { /* fail closed */ }
    const isAdmin = Boolean(await authenticatedAdmin());
    const visible = isAdmin ? entries : publicData(entries.filter((entry) => entry && entry.approved === true));
    return new Response(JSON.stringify(visible), { status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  }

  // 11b. POST /fanart - Create or update a FanArt entry (Admin-only)
  if (path === '/fanart' && request.method === 'POST') {
    let passcode = null; let emailHeader = null;
    authHeaders.forEach((val, key) => { const k = key.toLowerCase(); if (k === 'x-admin-passcode') passcode = val; if (k === 'x-admin-email') emailHeader = val; });
    const passwordsMap = await getPasswordsMap();
    const cleanEmail = String(emailHeader || '').trim().toLowerCase();
    if (!cleanEmail || !Object.prototype.hasOwnProperty.call(passwordsMap, cleanEmail)) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Email not found on the APEX team roster.' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }
    if (!passcode || passcode !== passwordsMap[cleanEmail]) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Invalid Admin Passcode or Session' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }
    const payload = await request.json().catch(() => null);
    if (!payload || !payload.title || !payload.artist_name || !payload.image_url) {
      return new Response(JSON.stringify({ error: 'Missing required fields: title, artist_name, image_url' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    let entries = [];
    try {
      let raw = null;
      if (env.APEX_OVERRIDES) raw = await env.APEX_OVERRIDES.get('fanartEntries');
      else raw = IN_MEMORY_FANART_FALLBACK;
      if (raw) entries = JSON.parse(raw);
      if (!Array.isArray(entries)) entries = [];
    } catch {}
    const entryId = payload.id != null ? Number(payload.id) : Date.now() + Math.floor(Math.random() * 1000);
    const entryRow = {
      id: entryId,
      title: String(payload.title),
      artist_name: String(payload.artist_name),
      image_url: String(payload.image_url),
      description: payload.description || null,
      approved: payload.approved !== false,
      updated_by: cleanEmail,
      created_at: payload.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const existingIndex = entries.findIndex((entry) => entry && entry.id === entryId);
    if (existingIndex >= 0) entries[existingIndex] = { ...entries[existingIndex], ...entryRow };
    else entries.unshift(entryRow);
    try {
      const serialized = JSON.stringify(entries);
      if (env.APEX_OVERRIDES) await env.APEX_OVERRIDES.put('fanartEntries', serialized);
      else IN_MEMORY_FANART_FALLBACK = serialized;
    } catch (e) { return new Response(JSON.stringify({ error: `KV Write Failed: ${e.message}` }), { status: 500, headers: { 'Content-Type': 'application/json' } }); }
    return new Response(JSON.stringify({ success: true, entry: entryRow }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  // 11c. POST /fanart/delete - Delete a FanArt entry (Admin-only)
  if (path === '/fanart/delete' && request.method === 'POST') {
    let passcode = null; let emailHeader = null;
    authHeaders.forEach((val, key) => { const k = key.toLowerCase(); if (k === 'x-admin-passcode') passcode = val; if (k === 'x-admin-email') emailHeader = val; });
    const passwordsMap = await getPasswordsMap();
    const cleanEmail = String(emailHeader || '').trim().toLowerCase();
    if (!cleanEmail || !Object.prototype.hasOwnProperty.call(passwordsMap, cleanEmail)) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Email not found on the APEX team roster.' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }
    if (!passcode || passcode !== passwordsMap[cleanEmail]) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Invalid Admin Passcode or Session' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }
    const payload = await request.json().catch(() => null);
    const entryId = Number(payload?.id);
    if (!entryId) return new Response(JSON.stringify({ error: 'Missing entry id' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    let entries = [];
    try {
      let raw = null;
      if (env.APEX_OVERRIDES) raw = await env.APEX_OVERRIDES.get('fanartEntries');
      else raw = IN_MEMORY_FANART_FALLBACK;
      if (raw) entries = JSON.parse(raw);
      if (!Array.isArray(entries)) entries = [];
    } catch {}
    const next = entries.filter((entry) => entry && entry.id !== entryId);
    try {
      const serialized = JSON.stringify(next);
      if (env.APEX_OVERRIDES) await env.APEX_OVERRIDES.put('fanartEntries', serialized);
      else IN_MEMORY_FANART_FALLBACK = serialized;
    } catch (e) { return new Response(JSON.stringify({ error: `KV Write Failed: ${e.message}` }), { status: 500, headers: { 'Content-Type': 'application/json' } }); }
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  // 12-pre. POST /logout-all (admin-only) - "Log out everywhere": rotates
  //      the caller's passcode to a fresh random one and returns it. The
  //      calling browser saves the new passcode; every OTHER device's saved
  //      login instantly fails auth. No session tables needed.
  if (path === '/logout-all' && request.method === 'POST') {
    let passcode = null; let emailHeader = null;
    authHeaders.forEach((val, key) => { const k = key.toLowerCase(); if (k === 'x-admin-passcode') passcode = val; if (k === 'x-admin-email') emailHeader = val; });
    const passwordsMap = await getPasswordsMap();
    const cleanEmail = String(emailHeader || '').trim().toLowerCase();
    if (!cleanEmail || !Object.prototype.hasOwnProperty.call(passwordsMap, cleanEmail) || !passcode || passcode !== passwordsMap[cleanEmail]) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Invalid Admin Passcode or Session' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }
    const randomPasscode = strongPasscode(24);
    passwordsMap[cleanEmail] = randomPasscode;
    await auditAuth('passcode.rotated', cleanEmail, cleanEmail, 'logout-all');
    // BUGFIX: the old code wrote through `env.KV`, which is never bound —
    // logout-all reported success but never persisted the rotation.
    const serializedPasswords = JSON.stringify(passwordsMap);
    if (env.APEX_OVERRIDES) await env.APEX_OVERRIDES.put('adminPasswords', serializedPasswords);
    else IN_MEMORY_PASSWORDS_FALLBACK = serializedPasswords;
    invalidateCredentialCache();
    console.log(`[auth] Passcode rotated for ${cleanEmail} via logout-all`);
    return new Response(JSON.stringify({ success: true, passcode: randomPasscode, message: 'All other sessions logged out.' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  // 12-pre2. POST/DELETE /deletedunits/:slug - Site-wide unit deletion
  //      registry (admin-only). Any unit (built-in or created) can be
  //      hidden from the entire site; DELETE restores it. The registry is
  //      part of the overrides bundle (bundle.deletedUnits).
  const dseg = path.split('/').filter(Boolean);
  if (dseg[0] === 'deletedunits' && dseg.length === 2 && (request.method === 'POST' || request.method === 'DELETE')) {
    const slug = decodeURIComponent(dseg[1]);
    if (!slug) return new Response(JSON.stringify({ error: 'Missing slug' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    let passcode = null; let emailHeader = null;
    authHeaders.forEach((val, key) => { const k = key.toLowerCase(); if (k === 'x-admin-passcode') passcode = val; if (k === 'x-admin-email') emailHeader = val; });
    const passwordsMap = await getPasswordsMap();
    const cleanEmail = String(emailHeader || '').trim().toLowerCase();
    if (!cleanEmail || !Object.prototype.hasOwnProperty.call(passwordsMap, cleanEmail) || !passcode || passcode !== passwordsMap[cleanEmail]) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Invalid Admin Passcode or Session' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }
    const bundle = await readOverridesBundle(env);
    let message;
    if (request.method === 'POST') {
      if (!bundle.deletedUnits.includes(slug)) bundle.deletedUnits.push(slug);
      message = 'Unit deleted site-wide.';
    } else {
      bundle.deletedUnits = bundle.deletedUnits.filter((s) => s !== slug);
      message = 'Unit restored site-wide.';
    }
    const writeError = await writeOverridesBundle(env, bundle);
    if (writeError) return writeError;
    await appendChangeLog(env, { id: crypto.randomUUID(), at: new Date().toISOString(), by: cleanEmail, section: 'wiki', slug, kind: request.method === 'POST' ? 'delete' : 'restore', detail: `${request.method === 'POST' ? 'Deleted' : 'Restored'} unit ${slug} site-wide` });
    return new Response(JSON.stringify({ success: true, version: bundle.__v, message }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  // 12a. POST/DELETE /overrides/:section/:slug - Write or remove ONE entry
  //      (admin-only). section: value | wiki | map | crate. Records history
  //      and the shared change feed, and bumps the bundle version.
  const seg = path.split('/').filter(Boolean);
  if (seg[0] === 'overrides' && seg.length === 3 && (request.method === 'POST' || request.method === 'DELETE')) {
    const section = seg[1];
    const slug = decodeURIComponent(seg[2]);
    const sectionKey = BUNDLE_SECTIONS[section];
    if (!sectionKey) {
      return new Response(JSON.stringify({ error: 'Unknown section. Use value, wiki, map, crate or materials.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    let passcode = null; let emailHeader = null;
    authHeaders.forEach((val, key) => { const k = key.toLowerCase(); if (k === 'x-admin-passcode') passcode = val; if (k === 'x-admin-email') emailHeader = val; });
    const passwordsMap = await getPasswordsMap();
    const cleanEmail = String(emailHeader || '').trim().toLowerCase();
    if (!cleanEmail || !Object.prototype.hasOwnProperty.call(passwordsMap, cleanEmail) || !passcode || passcode !== passwordsMap[cleanEmail]) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Invalid Admin Passcode or Session' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }
    const bundle = await readOverridesBundle(env);
    if (!bundle[sectionKey] || typeof bundle[sectionKey] !== 'object') bundle[sectionKey] = {};
    const before = bundle[sectionKey][slug] || null;
    if (request.method === 'DELETE') {
      if (!before) {
        return new Response(JSON.stringify({ success: true, version: bundle.__v, message: 'Nothing to delete.' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      delete bundle[sectionKey][slug];
    } else {
      const entry = await request.json().catch(() => null);
      if (!entry || typeof entry !== 'object') {
        return new Response(JSON.stringify({ error: 'Invalid JSON entry' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }
      // MERGE, never replace: a client payload that omits a field (e.g. a
      // wiki save that doesn't include rarity) must not erase the stored
      // value — replacing rows is how units lost their rarity and vanished.
      const existing = bundle[sectionKey][slug];
      const incoming = Object.fromEntries(
        Object.entries(entry).filter(([, v]) => v !== undefined)
      );
      bundle[sectionKey][slug] = existing && typeof existing === 'object' && !Array.isArray(existing)
        ? { ...existing, ...incoming }
        : entry;
    }
    const writeError = await writeOverridesBundle(env, bundle);
    if (writeError) return writeError;
    // Per-entry publishes get the same instant-visibility cache purge.
    try { ctx.waitUntil(caches.default.delete(new URL('/overrides', request.url).toString())); } catch { /* best effort */ }
    const record = {
      id: crypto.randomUUID(),
      at: new Date().toISOString(),
      by: cleanEmail,
      section, slug,
      kind: request.method === 'DELETE' ? 'delete' : 'edit',
      before,
      after: request.method === 'DELETE' ? null : bundle[sectionKey][slug],
    };
    const unitHistory = await appendUnitHistory(env, section, slug, record);
    const changeLog = await appendChangeLog(env, { id: record.id, at: record.at, by: cleanEmail, section, slug, kind: record.kind, detail: record.kind === 'delete' ? `Deleted ${section} override` : `Updated ${section} override` });
    return new Response(JSON.stringify({ success: true, version: bundle.__v, audit: { unitHistory, changeLog } }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  // 12b. GET /changes - Shared recent-changes feed (admin-only)
  if (path === '/changes' && request.method === 'GET') {
    let passcode = null; let emailHeader = null;
    authHeaders.forEach((val, key) => { const k = key.toLowerCase(); if (k === 'x-admin-passcode') passcode = val; if (k === 'x-admin-email') emailHeader = val; });
    const passwordsMap = await getPasswordsMap();
    const cleanEmail = String(emailHeader || '').trim().toLowerCase();
    if (!cleanEmail || !Object.prototype.hasOwnProperty.call(passwordsMap, cleanEmail) || !passcode || passcode !== passwordsMap[cleanEmail]) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }
    try {
      const changes = await readChangeLog(env);
      return new Response(JSON.stringify(changes), { status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
    } catch {
      return new Response(JSON.stringify({ error: 'The change log is unavailable.' }), { status: 503, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
    }
  }

  // Archived shared feed is available only to authenticated team members.
  if (path === '/changes/archive' && request.method === 'GET') {
    if (!await authenticatedAdmin()) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
    if (!env.APEX_OVERRIDES?.list) return new Response(JSON.stringify({ error: 'Audit archive is unavailable.' }), { status: 503, headers: { 'Content-Type': 'application/json' } });
    try {
      const cursor = url.searchParams.get('cursor') || undefined;
      const page = await env.APEX_OVERRIDES.list({ prefix: 'auditArchive:change:', limit: 100, ...(cursor ? { cursor } : {}) });
      const raw = await Promise.all(page.keys.map((key) => env.APEX_OVERRIDES.get(key.name)));
      const entries = raw.filter(Boolean).map((value) => JSON.parse(value));
      return new Response(JSON.stringify({ entries, cursor: page.cursor || null, complete: page.list_complete === true }), { status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
    } catch {
      return new Response(JSON.stringify({ error: 'Audit archive could not be read.' }), { status: 503, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
    }
  }

  // 12c. GET /history/:section/:slug - Public per-unit edit history
  //      (editor emails stripped — public trends don't need them)
  if (seg[0] === 'history' && seg.length === 3 && request.method === 'GET') {
    const section = seg[1];
    const slug = decodeURIComponent(seg[2]);
    if (!BUNDLE_SECTIONS[section]) {
      return new Response(JSON.stringify({ error: 'Unknown section' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    try {
      const history = await readUnitHistory(env, section, slug);
      const requestedId = url.searchParams.get('id');
      if (requestedId && !history.some((row) => String(row?.id) === requestedId) && env.APEX_OVERRIDES) {
        const raw = await env.APEX_OVERRIDES.get(archivedHistoryKey(section, slug, requestedId));
        if (raw) history.push(JSON.parse(raw));
      }
      const privateView = url.searchParams.get('private') === '1';
      if (privateView && !await authenticatedAdmin()) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
      return new Response(JSON.stringify(privateView ? history : publicData(history)), { status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
    } catch {
      return new Response(JSON.stringify({ error: 'Unit history is unavailable.' }), { status: 503, headers: { 'Content-Type': 'application/json' } });
    }
  }

  // Team email addresses are not a public API.
  if (path === '/roles' && request.method === 'GET') {
    if (!await authenticatedAdmin()) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
    return new Response(JSON.stringify(TEAM_ROLES), { status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  }

  return new Response(
    JSON.stringify({
      status: '✅ APEX Serverless Cloudflare KV Engine is Live!',
      endpoints: {
        'GET /bug-reports': 'Read bug reports from KV',
        'POST /bug-reports': 'Submit bug reports directly to KV',
        'POST /bug-reports/resolve': 'Mark reports resolved securely via KV',
        'POST /bug-reports/delete': 'Delete bug reports securely via KV',
        'GET /health': 'Deployment status: KV binding, session secret, version',
        'GET /status': 'Consolidated version + maintenance + announcements (one poll)',
        'GET /time': 'Same-origin UTC clock (no third-party time services)',
        'POST /session': 'Exchange editor credentials for a short-lived signed session',
        'GET /overrides/version': 'Tiny bundle version for conditional sync',
        'GET /overrides': 'Read the live values and WIKI overrides database',
        'POST /overrides': 'Update and publish the live database',
        'POST /change-password': 'Change an individual editor password dynamically in KV',
        'POST /login': 'Authenticate an individual editor dynamically in KV',
        'GET /announcements': 'Get active announcements',
        'POST /announcements': 'Send a global announcement (owner only)',
        'POST /announcements/clear': 'Clear active announcement',
        'GET /fanart': 'Read all FanArt gallery entries from KV',
        'POST /fanart': 'Create or update a FanArt entry (admin only)',
        'POST /fanart/delete': 'Delete a FanArt entry (admin only)',
        'POST /overrides/:section/:slug': 'Write ONE entry (value|wiki|map|crate|materials) - concurrent-safe',
        'POST /logout-all': 'Log out everywhere (rotates your passcode, invalidates other devices)',
        'POST /deletedunits/:slug': 'Hide ANY unit from the entire site (admin only)',
        'DELETE /deletedunits/:slug': 'Restore a deleted unit site-wide (admin only)',
        'DELETE /overrides/:section/:slug': 'Remove ONE entry (value|wiki|map|crate|materials, admin only)',
        'GET /changes': 'Shared recent-changes feed (admin only)',
        'GET /history/:section/:slug': 'Per-unit edit history (powers public trends)',
        'GET /roles': 'Get team roles'
      },
    }, null, 2),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

function addCorsHeaders(request, response) {
  // Preflight responses already carry their complete CORS headers.
  if (request.method === 'OPTIONS') return response;

  const newResponse = new Response(response.body, response);
  const origin = requestOrigin(request);
  // No wildcard + credentials. Unlisted browser origins get an opaque origin,
  // which browsers treat as a CORS failure for credentialed/admin requests.
  newResponse.headers.set('Access-Control-Allow-Origin', origin ? (ALLOWED_ORIGINS.has(origin) ? origin : 'null') : '*');
  newResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  newResponse.headers.set('Access-Control-Allow-Headers', ADMIN_HEADERS);
  newResponse.headers.set('Access-Control-Max-Age', '600');
  newResponse.headers.set('Vary', 'Origin');
  newResponse.headers.set('X-Content-Type-Options', 'nosniff');
  newResponse.headers.set('Referrer-Policy', 'no-referrer');
  return newResponse;
}
