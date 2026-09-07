// APEX — Cloudflare KV worker: the live Values & WIKI database.
// Deploy: Dashboard -> Workers & Pages -> create/paste this code, then
// Settings -> KV Namespace Bindings -> bind "APEX_OVERRIDES" -> Deploy.

// Build marker for this worker — bump on every deploy so the admin panel
// can tell the team when a deploy is still pending.
const WORKER_VERSION = '2026-09-02.1';

// Simple in-memory fallback for initial tests/cold starts in case KV is not bound
let IN_MEMORY_DB_FALLBACK = null;
let IN_MEMORY_PASSWORDS_FALLBACK = null;
let IN_MEMORY_BUG_REPORTS = null;
let IN_MEMORY_ANNOUNCEMENTS_FALLBACK = null;
let IN_MEMORY_MAINTENANCE_FALLBACK = null;
let IN_MEMORY_FANART_FALLBACK = null;
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
  try { data = env.APEX_OVERRIDES ? await env.APEX_OVERRIDES.get('staticOverrides') : IN_MEMORY_DB_FALLBACK; } catch (e) { console.error('Failed to read overrides from KV:', e); }
  let bundle = null;
  try { bundle = data ? JSON.parse(data) : null; } catch {}
  if (!bundle || typeof bundle !== 'object') {
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
  bundle.__v = (bundle.__v || 0) + 1;
  bundle.timestamp = new Date().toISOString();
  const serialized = JSON.stringify(bundle);
  try {
    if (env.APEX_OVERRIDES) await env.APEX_OVERRIDES.put('staticOverrides', serialized);
    else IN_MEMORY_DB_FALLBACK = serialized;
  } catch (e) {
    return new Response(JSON.stringify({ error: `KV Write Failed: ${e.message}` }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
  return null; // success
}

async function appendChangeLog(env, entry) {
  let arr = [];
  try {
    const raw = env.APEX_OVERRIDES ? await env.APEX_OVERRIDES.get('changeLog') : IN_MEMORY_CHANGELOG_FALLBACK;
    if (raw) arr = JSON.parse(raw);
    if (!Array.isArray(arr)) arr = [];
  } catch {}
  arr.unshift(entry);
  if (arr.length > 200) arr.length = 200;
  const serialized = JSON.stringify(arr);
  try {
    if (env.APEX_OVERRIDES) await env.APEX_OVERRIDES.put('changeLog', serialized);
    else IN_MEMORY_CHANGELOG_FALLBACK = serialized;
  } catch {}
}

async function readChangeLog(env) {
  try {
    const raw = env.APEX_OVERRIDES ? await env.APEX_OVERRIDES.get('changeLog') : IN_MEMORY_CHANGELOG_FALLBACK;
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

async function appendUnitHistory(env, section, slug, record) {
  if (!env.APEX_OVERRIDES) return; // history requires real KV persistence
  const key = `history:${section}:${slug}`;
  let arr = [];
  try {
    const raw = await env.APEX_OVERRIDES.get(key);
    if (raw) arr = JSON.parse(raw);
    if (!Array.isArray(arr)) arr = [];
  } catch {}
  arr.push(record);
  if (arr.length > 50) arr = arr.slice(-50);
  try { await env.APEX_OVERRIDES.put(key, JSON.stringify(arr)); } catch {}
}

async function readUnitHistory(env, section, slug) {
  if (!env.APEX_OVERRIDES) return [];
  try {
    const raw = await env.APEX_OVERRIDES.get(`history:${section}:${slug}`);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

// Single source of truth for the team: one map, everything else derives from
// it. Never list an address here that is not on the roster — getPasswordsMap()
// hands out the default passcode to any roster entry missing one.
const TEAM_ROLES = {
  'gustavo.rb1410@gmail.com': 'owner',
  'bananatempest25@gmail.com': 'admin',
  'treymurphy3rd@gmail.com': 'admin',
  'johnmustard129@gmail.com': 'admin',
  'destroyha3@gmail.com': 'editor',
  'gloomy302010@gmail.com': 'editor',
  'alieldaw6@gmail.com': 'editor',
  'hungryaistukas@gmail.com': 'editor',
  'luquitas290414@gmail.com': 'editor'
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

  // WORKER VERSION — bump on every deploy. The admin dashboard compares
  // this against the version the site expects and shows a chip when the
  // worker is outdated (features that need a deploy stay visible).
  if (path === '/version' && request.method === 'GET') {
    return new Response(JSON.stringify({ version: WORKER_VERSION }), { status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  }

  // Handle CORS preflight check immediately with standard 204 No Content
  if (request.method === 'OPTIONS') {
    const origin = request.headers.get('Origin') || '*';
    const reqHeaders = request.headers.get('Access-Control-Request-Headers') || '*';
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': reqHeaders,
        'Access-Control-Max-Age': '0', // Force browser to bypass stale preflight caches
      },
    });
  }

  // Helper: Retrieve all individual admin passwords map (KV or fallback or defaults)
  async function getPasswordsMap() {
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

    // Initialize defaults for any team member who does not have a password yet
    let updated = false;
    TEAM_EMAILS.forEach(email => {
      const clean = email.toLowerCase().trim();
      if (!map[clean]) {
        map[clean] = 'apex2026'; // Default initial passcode
        updated = true;
      }
    });

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

    return map;
  }

  // 1. GET /bug-reports - Fetch bug reports from KV
  if (path === '/bug-reports' && request.method === 'GET') {
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
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 2. POST /bug-reports - Submit a bug report into KV
  if (path === '/bug-reports' && request.method === 'POST') {
    const payloadText = await request.text();
    let newReport = null;
    try {
      newReport = JSON.parse(payloadText);
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Invalid JSON payload format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

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

    const reportId = Date.now() + Math.floor(Math.random() * 1000);
    const reportRow = {
      id: reportId,
      title: newReport.title || 'Untitled Report',
      category: newReport.category || 'Other',
      description: newReport.description || '',
      page_url: newReport.page_url || '',
      contact: newReport.contact || null,
      browser: newReport.browser || null,
      resolved: false,
      created_at: new Date().toISOString()
    };

    reports.push(reportRow);

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
    request.headers.forEach((val, key) => {
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
    request.headers.forEach((val, key) => {
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
    let data = null;
    try {
      if (env.APEX_OVERRIDES) {
        data = await env.APEX_OVERRIDES.get('staticOverrides');
      } else {
        data = IN_MEMORY_DB_FALLBACK;
      }
    } catch (e) {
      console.error('Failed to read from Cloudflare KV:', e);
    }

    // Fallback: If KV database is completely empty/fresh, fetch the latest baked database from your GitHub Pages live site!
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

    // Expose the bundle version so admins can detect concurrent edits.
    try {
      const bundle = JSON.parse(data);
      if (typeof bundle.__v !== 'number') bundle.__v = 0;
      data = JSON.stringify(bundle);
    } catch {}

    return new Response(data, {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 6. POST /overrides - Write the live staticOverrides JSON database
  if (path === '/overrides' && request.method === 'POST') {
    // Validate headers (support case-insensitive headers by scanning all keys)
    let passcode = null;
    let emailHeader = null;
    request.headers.forEach((val, key) => {
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

    // ---- Concurrency guard: reject full-bundle writes based on a stale
    // snapshot (unless it's an explicit force-restore). Prevents two admins
    // from silently erasing each other's edits.
    if (!payload.__forceRestore && typeof payload.__baseVersion === 'number') {
      const current = await readOverridesBundle(env);
      if (payload.__baseVersion !== current.__v) {
        return new Response(JSON.stringify({
          error: 'Out of date: the database changed while you were editing. Refetched and re-merged — please save again.',
          currentVersion: current.__v,
        }), { status: 409, headers: { 'Content-Type': 'application/json' } });
      }
    }

    const nextBundle = { ...payload };
    delete nextBundle.__baseVersion;
    delete nextBundle.__forceRestore;

    const writeError = await writeOverridesBundle(env, nextBundle);
    if (writeError) return writeError;

    await appendChangeLog(env, {
      id: Date.now() + Math.floor(Math.random() * 1000),
      at: new Date().toISOString(),
      by: cleanEmail,
      kind: 'bundle',
      detail: payload.__forceRestore ? 'Full database restore' : 'Full database publish',
    });

    return new Response(JSON.stringify({ success: true, version: nextBundle.__v, message: 'Saved successfully to Cloudflare KV database!' }), {
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

    // Match the client-side rule (Admin reset screen): at least 6 characters
    if (cleanNewPassword.length < 6 || cleanNewPassword.length > 200) {
      return new Response(JSON.stringify({ error: 'New password must be between 6 and 200 characters.' }), {
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
      const serialized = JSON.stringify(passwordsMap);
      if (env.APEX_OVERRIDES) {
        await env.APEX_OVERRIDES.put('adminPasswords', serialized);
      } else {
        IN_MEMORY_PASSWORDS_FALLBACK = serialized;
      }
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

    const cleanEmail = rawEmail.trim().toLowerCase();
    const passwordsMap = await getPasswordsMap();

    if (!Object.prototype.hasOwnProperty.call(passwordsMap, cleanEmail)) {
      return new Response(JSON.stringify({ error: 'Email not found on the APEX team roster.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const livePass = passwordsMap[cleanEmail];

    if (password !== livePass) {
      recordLoginFail(ip);
      return new Response(JSON.stringify({ error: 'Incorrect password' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    LOGIN_ATTEMPTS.delete(ip);
    // Members still on the default passcode must change it before editing
    // (the client blocks the admin panel until they do).
    const mustChangePassword = livePass === 'apex2026';
    return new Response(JSON.stringify({ success: true, message: 'Authenticated successfully!', mustChangePassword }), {
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
      return new Response(JSON.stringify({ announcements: list }), { status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
    } catch (e) {
      return new Response(JSON.stringify({ announcements: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
  }

  if (path === '/announcements' && request.method === 'POST') {
    let passcode = null; let emailHeader = null;
    request.headers.forEach((val, key) => { const k = key.toLowerCase(); if (k === 'x-admin-passcode') passcode = val; if (k === 'x-admin-email') emailHeader = val; });
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
    request.headers.forEach((val, key) => { const k = key.toLowerCase(); if (k === 'x-admin-passcode') passcode = val; if (k === 'x-admin-email') emailHeader = val; });
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
    request.headers.forEach((val, key) => { const k = key.toLowerCase(); if (k === 'x-admin-passcode') passcode = val; if (k === 'x-admin-email') emailHeader = val; });
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
    return new Response(JSON.stringify({ on: !!state.on, message: state.message || '', at: state.at || null, by: state.by || null }), { status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  }
  if (path === '/maintenance' && request.method === 'POST') {
    let passcode = null; let emailHeader = null;
    request.headers.forEach((val, key) => { const k = key.toLowerCase(); if (k === 'x-admin-passcode') passcode = val; if (k === 'x-admin-email') emailHeader = val; });
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

  // 11a. GET /fanart - Read all FanArt gallery entries from KV
  if (path === '/fanart' && request.method === 'GET') {
    let data = null;
    try { if (env.APEX_OVERRIDES) data = await env.APEX_OVERRIDES.get('fanartEntries'); else data = IN_MEMORY_FANART_FALLBACK; } catch (e) { console.error('Failed to read fanart from KV:', e); }
    if (!data) data = '[]';
    return new Response(data, { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  // 11b. POST /fanart - Create or update a FanArt entry (Admin-only)
  if (path === '/fanart' && request.method === 'POST') {
    let passcode = null; let emailHeader = null;
    request.headers.forEach((val, key) => { const k = key.toLowerCase(); if (k === 'x-admin-passcode') passcode = val; if (k === 'x-admin-email') emailHeader = val; });
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
    request.headers.forEach((val, key) => { const k = key.toLowerCase(); if (k === 'x-admin-passcode') passcode = val; if (k === 'x-admin-email') emailHeader = val; });
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
    request.headers.forEach((val, key) => { const k = key.toLowerCase(); if (k === 'x-admin-passcode') passcode = val; if (k === 'x-admin-email') emailHeader = val; });
    const passwordsMap = await getPasswordsMap();
    const cleanEmail = String(emailHeader || '').trim().toLowerCase();
    if (!cleanEmail || !Object.prototype.hasOwnProperty.call(passwordsMap, cleanEmail) || !passcode || passcode !== passwordsMap[cleanEmail]) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Invalid Admin Passcode or Session' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
    const randomPasscode = Array.from({ length: 16 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
    passwordsMap[cleanEmail] = randomPasscode;
    await env.KV.put('adminPasswords', JSON.stringify(passwordsMap));
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
    request.headers.forEach((val, key) => { const k = key.toLowerCase(); if (k === 'x-admin-passcode') passcode = val; if (k === 'x-admin-email') emailHeader = val; });
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
    await appendChangeLog(env, { by: cleanEmail, kind: request.method === 'POST' ? 'delete' : 'restore', detail: `${request.method === 'POST' ? 'Deleted' : 'Restored'} unit ${slug} site-wide` });
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
    request.headers.forEach((val, key) => { const k = key.toLowerCase(); if (k === 'x-admin-passcode') passcode = val; if (k === 'x-admin-email') emailHeader = val; });
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
      bundle[sectionKey][slug] = entry;
    }
    const writeError = await writeOverridesBundle(env, bundle);
    if (writeError) return writeError;
    const record = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      at: new Date().toISOString(),
      by: cleanEmail,
      section, slug,
      kind: request.method === 'DELETE' ? 'delete' : 'edit',
      before,
      after: request.method === 'DELETE' ? null : bundle[sectionKey][slug],
    };
    await appendUnitHistory(env, section, slug, record);
    await appendChangeLog(env, { id: record.id, at: record.at, by: cleanEmail, section, slug, kind: record.kind, detail: record.kind === 'delete' ? `Deleted ${section} override` : `Updated ${section} override` });
    return new Response(JSON.stringify({ success: true, version: bundle.__v }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  // 12b. GET /changes - Shared recent-changes feed (admin-only)
  if (path === '/changes' && request.method === 'GET') {
    let passcode = null; let emailHeader = null;
    request.headers.forEach((val, key) => { const k = key.toLowerCase(); if (k === 'x-admin-passcode') passcode = val; if (k === 'x-admin-email') emailHeader = val; });
    const passwordsMap = await getPasswordsMap();
    const cleanEmail = String(emailHeader || '').trim().toLowerCase();
    if (!cleanEmail || !Object.prototype.hasOwnProperty.call(passwordsMap, cleanEmail) || !passcode || passcode !== passwordsMap[cleanEmail]) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }
    const changes = await readChangeLog(env);
    return new Response(JSON.stringify(changes), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  // 12c. GET /history/:section/:slug - Public per-unit edit history
  //      (editor emails stripped — public trends don't need them)
  if (seg[0] === 'history' && seg.length === 3 && request.method === 'GET') {
    const section = seg[1];
    const slug = decodeURIComponent(seg[2]);
    if (!BUNDLE_SECTIONS[section]) {
      return new Response(JSON.stringify({ error: 'Unknown section' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    const history = await readUnitHistory(env, section, slug);
    const publicHistory = history.map((h) => ({ ...h, by: undefined }));
    return new Response(JSON.stringify(publicHistory), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  // 12. GET /roles - Get team roles
  if (path === '/roles' && request.method === 'GET') {
    return new Response(JSON.stringify(TEAM_ROLES), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  return new Response(
    JSON.stringify({
      status: '✅ APEX Serverless Cloudflare KV Engine is Live!',
      endpoints: {
        'GET /bug-reports': 'Read bug reports from KV',
        'POST /bug-reports': 'Submit bug reports directly to KV',
        'POST /bug-reports/resolve': 'Mark reports resolved securely via KV',
        'POST /bug-reports/delete': 'Delete bug reports securely via KV',
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
  // If preflight options response already has complete headers, pass through
  if (request.method === 'OPTIONS') return response;

  const newResponse = new Response(response.body, response);
  const origin = request.headers.get('Origin') || '*';
  newResponse.headers.set('Access-Control-Allow-Origin', origin);
  newResponse.headers.set('Access-Control-Allow-Credentials', 'true');
  newResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  
  const reqHeaders = request.headers.get('Access-Control-Request-Headers') || '*';
  newResponse.headers.set('Access-Control-Allow-Headers', reqHeaders);
  
  return newResponse;
}
