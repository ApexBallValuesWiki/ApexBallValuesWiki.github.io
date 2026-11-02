import { describe, it, expect, beforeEach, vi } from 'vitest';
import worker from './cloudflare-proxy-worker';

const TEAM_EMAIL = 'gustavo.rb1410@gmail.com';
const TEST_PASSWORD = 'a-unique-test-passcode';
const auth = { 'x-admin-email': TEAM_EMAIL, 'x-admin-passcode': TEST_PASSWORD };
let database;
let env;
let ipCounter = 1;

function call(path, options = {}) {
  const headers = { 'cf-connecting-ip': `198.51.100.${ipCounter++}`, ...options.headers };
  const request = new Request(`https://worker.example${path}`, { ...options, headers });
  return worker.fetch(request, env, { waitUntil: () => {} });
}

beforeEach(() => {
  database = new Map(Object.entries({
    adminPasswords: JSON.stringify({ [TEAM_EMAIL]: TEST_PASSWORD }),
    bugReports: JSON.stringify([{ id: 1, title: 'Legacy report', contact: 'private@example.test' }]),
    fanartEntries: JSON.stringify([
      { id: 1, title: 'Public art', approved: true, updated_by: TEAM_EMAIL },
      { id: 2, title: 'Pending art', approved: false, updated_by: TEAM_EMAIL },
    ]),
    staticOverrides: JSON.stringify({ __v: 10, wikiOverrides: { unit: { name: 'Unit', updated_by: TEAM_EMAIL, upgrades: [{ value: 1, editor_email: TEAM_EMAIL }] } }, materialOverrides: { material: { name: 'Material' } }, deletedUnits: ['hidden-unit'] }),
    maintenance: JSON.stringify({ on: false, message: '', by: TEAM_EMAIL }),
    'history:value:unit': JSON.stringify([{ by: TEAM_EMAIL, before: { updated_by: TEAM_EMAIL, baseValue: 4 } }]),
    announcements: JSON.stringify([{ id: 1, message: 'Update', sentBy: TEAM_EMAIL }]),
  }));
  env = { APEX_OVERRIDES: {
    get: vi.fn(async (key) => database.get(key) || null),
    put: vi.fn(async (key, value) => { database.set(key, value); }),
  } };
});

describe('worker privacy and authorization', () => {
  it('does not expose the report inbox or roster without verified credentials', async () => {
    expect((await call('/bug-reports')).status).toBe(401);
    expect((await call('/roles')).status).toBe(401);
    expect((await call('/bug-reports', { headers: { 'x-admin-email': TEAM_EMAIL, 'x-admin-passcode': 'wrong' } })).status).toBe(401);
    expect((await call('/bug-reports', { headers: auth })).status).toBe(200);
  });

  it('rejects old free-text reports and stores only allow-listed selections', async () => {
    const old = await call('/bug-reports', { method: 'POST', body: JSON.stringify({ title: 'free text', contact: 'child@example.test' }) });
    expect(old.status).toBe(400);
    const response = await call('/bug-reports', {
      method: 'POST',
      body: JSON.stringify({ type: 'structured-v1', category: 'Broken Link', area: 'Wiki', description: 'Sensitive free text', contact: 'child@example.test', page_url: 'https://private.test/' }),
    });
    expect(response.status).toBe(200);
    const stored = database.get('bugReports');
    expect(stored).toContain('Broken Link');
    expect(stored).not.toContain('child@example.test');
    expect(stored).not.toContain('Sensitive free text');
    expect(stored).not.toContain('private.test');
  });

  it('redacts staff metadata recursively for visitors, but preserves it for editors', async () => {
    const publicBundle = await (await call('/overrides')).json();
    expect(publicBundle.wikiOverrides.unit.name).toBe('Unit');
    expect(publicBundle.wikiOverrides.unit.updated_by).toBeUndefined();
    expect(publicBundle.wikiOverrides.unit.upgrades[0].editor_email).toBeUndefined();
    const editorBundle = await (await call('/overrides', { headers: auth })).json();
    expect(editorBundle.wikiOverrides.unit.updated_by).toBe(TEAM_EMAIL);
    const history = await (await call('/history/value/unit')).json();
    expect(history[0].by).toBeUndefined();
    expect(history[0].before.updated_by).toBeUndefined();
  });

  it('requires a current bundle version and preserves omitted sections and staff metadata on publish', async () => {
    const missingVersion = await call('/overrides', { method: 'POST', headers: auth, body: JSON.stringify({ wikiOverrides: {} }) });
    expect(missingVersion.status).toBe(409);
    const response = await call('/overrides', { method: 'POST', headers: auth, body: JSON.stringify({ __baseVersion: 10, wikiOverrides: { unit: { name: 'Renamed' } } }) });
    expect(response.status).toBe(200);
    const saved = JSON.parse(database.get('staticOverrides'));
    expect(saved.__v).toBe(11);
    expect(saved.materialOverrides.material.name).toBe('Material');
    expect(saved.deletedUnits).toEqual(['hidden-unit']);
    expect(saved.wikiOverrides.unit.updated_by).toBe(TEAM_EMAIL);
    expect(saved.wikiOverrides.unit.name).toBe('Renamed');
  });

  it('fails closed rather than writing when the current database cannot be read', async () => {
    env.APEX_OVERRIDES.get = vi.fn(async (key) => {
      if (key === 'staticOverrides') throw new Error('temporary KV failure');
      return database.get(key) || null;
    });
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const response = await call('/overrides', { method: 'POST', headers: auth, body: JSON.stringify({ __baseVersion: 0, wikiOverrides: {} }) });
      expect(response.status).toBe(500);
      expect(JSON.parse(database.get('staticOverrides')).__v).toBe(10);
    } finally { log.mockRestore(); }
  });

  it('redacts a public edge-cache response created by an older worker', async () => {
    const oldCached = new Response(JSON.stringify({ wikiOverrides: { unit: { updated_by: TEAM_EMAIL, name: 'Unit' } } }), { headers: { 'Content-Type': 'application/json' } });
    vi.stubGlobal('caches', { default: { match: vi.fn(async () => oldCached) } });
    try {
      const cachedBundle = await (await call('/overrides')).json();
      expect(cachedBundle.wikiOverrides.unit.name).toBe('Unit');
      expect(cachedBundle.wikiOverrides.unit.updated_by).toBeUndefined();
    } finally { vi.unstubAllGlobals(); }
  });

  it('hides pending fan art and public staff metadata', async () => {
    const publicEntries = await (await call('/fanart')).json();
    expect(publicEntries).toHaveLength(1);
    expect(publicEntries[0].title).toBe('Public art');
    expect(publicEntries[0].updated_by).toBeUndefined();
    expect(await (await call('/fanart', { headers: auth })).json()).toHaveLength(2);
    expect((await (await call('/maintenance')).json()).by).toBeUndefined();
    expect((await (await call('/announcements')).json()).announcements[0].sentBy).toBeUndefined();
  });

  it('does not silently create default passwords for new roster members', async () => {
    await call('/bug-reports', { headers: auth });
    expect(JSON.parse(database.get('adminPasswords'))).toEqual({ [TEAM_EMAIL]: TEST_PASSWORD });
    database.set('adminPasswords', JSON.stringify({ [TEAM_EMAIL]: 'apex2026' }));
    expect((await call('/bug-reports', { headers: { 'x-admin-email': TEAM_EMAIL, 'x-admin-passcode': 'apex2026' } })).status).toBe(401);
    const legacyLogin = await call('/login', { method: 'POST', body: JSON.stringify({ email: TEAM_EMAIL, password: 'apex2026' }) });
    expect(legacyLogin.status).toBe(403);
    expect((await legacyLogin.json()).code).toBe('legacy_default');
    expect((await call('/change-password', { method: 'POST', body: JSON.stringify({ email: TEAM_EMAIL, currentPassword: 'apex2026', newPassword: 'a-new-strong-password' }) })).status).toBe(403);
  });
});

describe('truthful audit storage', () => {
  it('links a shared entry to its exact before/after history record', async () => {
    const response = await call('/overrides/wiki/unit', { method: 'POST', headers: auth, body: JSON.stringify({ name: 'Revised' }) });
    expect(response.status).toBe(200);
    expect((await response.json()).audit).toEqual({ changeLog: true, unitHistory: true });
    const changes = JSON.parse(database.get('changeLog'));
    const history = JSON.parse(database.get('history:wiki:unit'));
    expect(changes[0].id).toBe(history[0].id);
    expect(history[0].before.name).toBe('Unit');
    expect(history[0].after.name).toBe('Revised');
  });
  it('archives evicted entries and field history without exposing staff data publicly', async () => {
    const oldChanges = Array.from({ length: 200 }, (_, i) => ({ id: `old-${i}`, at: new Date(Date.UTC(2026, 0, 1, 0, 0, 200 - i)).toISOString(), by: TEAM_EMAIL, section: 'wiki', slug: 'unit' }));
    const oldHistory = Array.from({ length: 50 }, (_, i) => ({ id: `history-${i}`, by: TEAM_EMAIL, before: { n: i }, after: { n: i + 1 } }));
    database.set('changeLog', JSON.stringify(oldChanges));
    database.set('history:wiki:unit', JSON.stringify(oldHistory));
    env.APEX_OVERRIDES.list = vi.fn(async ({ prefix }) => ({ keys: [...database.keys()].filter((k) => k.startsWith(prefix)).sort().map((name) => ({ name })), list_complete: true }));
    const response = await call('/overrides/wiki/unit', { method: 'POST', headers: auth, body: JSON.stringify({ name: 'Revised' }) });
    expect((await response.json()).audit).toEqual({ changeLog: true, unitHistory: true });
    expect(JSON.parse(database.get('changeLog'))).toHaveLength(200);
    expect(JSON.parse(database.get('history:wiki:unit'))).toHaveLength(50);
    expect((await call('/changes/archive')).status).toBe(401);
    const archived = await (await call('/changes/archive', { headers: auth })).json();
    expect(archived.entries[0].id).toBe('old-199');
    const publicHistory = await (await call('/history/wiki/unit?id=history-0')).json();
    const restored = publicHistory.find((row) => row.id === 'history-0');
    expect(restored.before.n).toBe(0);
    expect(restored.by).toBeUndefined();
    expect((await call('/history/wiki/unit?private=1&id=history-0')).status).toBe(401);
    const privateHistory = await (await call('/history/wiki/unit?private=1&id=history-0', { headers: auth })).json();
    expect(privateHistory.find((row) => row.id === 'history-0').by).toBe(TEAM_EMAIL);
  });
  it('retains the old feed if archiving an evicted entry fails', async () => {
    const oldChanges = Array.from({ length: 200 }, (_, i) => ({ id: `old-${i}`, at: '2026-01-01T00:00:00Z' }));
    database.set('changeLog', JSON.stringify(oldChanges));
    env.APEX_OVERRIDES.put = vi.fn(async (key, value) => {
      if (key.startsWith('auditArchive:change:')) throw new Error('Archive write failed');
      database.set(key, value);
    });
    const response = await call('/overrides/wiki/unit', { method: 'POST', headers: auth, body: JSON.stringify({ name: 'Revised' }) });
    expect((await response.json()).audit.changeLog).toBe(false);
    expect(JSON.parse(database.get('changeLog'))).toEqual(oldChanges);
  });
  it('never wipes existing audit history after a failed read and reports the failure', async () => {
    database.set('changeLog', JSON.stringify([{ id: 'keep' }]));
    database.set('history:wiki:unit', JSON.stringify([{ id: 'keep-history' }]));
    env.APEX_OVERRIDES.get = vi.fn(async (key) => {
      if (key === 'changeLog' || key === 'history:wiki:unit') throw new Error('KV unavailable');
      return database.get(key) || null;
    });
    const response = await call('/overrides/wiki/unit', { method: 'POST', headers: auth, body: JSON.stringify({ name: 'Updated' }) });
    expect(response.status).toBe(200);
    expect((await response.json()).audit).toEqual({ changeLog: false, unitHistory: false });
    expect(JSON.parse(database.get('changeLog'))).toEqual([{ id: 'keep' }]);
    expect(JSON.parse(database.get('history:wiki:unit'))).toEqual([{ id: 'keep-history' }]);
    expect((await call('/changes', { headers: auth })).status).toBe(503);
    expect((await call('/history/wiki/unit')).status).toBe(503);
  });
});
