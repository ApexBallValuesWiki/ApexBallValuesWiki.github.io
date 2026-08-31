import { beforeEach, describe, expect, it } from 'vitest';

// The deployed worker, driven through its fetch handler with an in-memory KV.
// This is the SERVER half of the save flow: a single-entry write is what every
// Save button performs, and it has to agree with the client's publish bundle
// about what "editing a hidden unit" means — otherwise the admin saves, gets a
// green check, and the unit stays hidden (it looked like "saving does nothing").
import worker from './cloudflare-proxy-worker.js';

const EMAIL = 'gustavo.rb1410@gmail.com';
const PASS = 'test-passcode';

function makeEnv(bundle) {
  const store = new Map([
    ['adminPasswords', JSON.stringify({ [EMAIL]: PASS })],
    ['staticOverrides', JSON.stringify(bundle)],
  ]);
  return {
    store,
    APEX_OVERRIDES: {
      async get(key) { return store.has(key) ? store.get(key) : null; },
      async put(key, value) { store.set(key, String(value)); },
      async delete(key) { store.delete(key); },
    },
  };
}

const readBundle = (env) => JSON.parse(env.store.get('staticOverrides'));

async function post(env, path, body, method = 'POST') {
  const response = await worker.fetch(
    new Request(`https://worker.test${path}`, {
      method,
      headers: { 'x-admin-passcode': PASS, 'x-admin-email': EMAIL, 'content-type': 'application/json' },
      body: method === 'DELETE' ? undefined : JSON.stringify(body),
    }),
    env,
    { waitUntil() {} }
  );
  return { status: response.status, json: await response.json().catch(() => ({})) };
}

describe('worker — writing one entry', () => {
  let env;
  beforeEach(() => {
    env = makeEnv({
      __v: 7,
      valueOverrides: {},
      wikiOverrides: { parrotball: { slug: 'parrotball', name: 'OLD' } },
      mapOverrides: {},
      crateOverrides: {},
      materialOverrides: { cube: { slug: 'cube', name: 'Cube Plating' } },
      deletedUnits: ['parrotball', 'cube', 'shiny-parrotball'],
    });
  });

  it('revives the unit whose wiki row is saved', async () => {
    const res = await post(env, '/overrides/wiki/parrotball', { slug: 'parrotball', name: 'NEW' });
    expect(res.status).toBe(200);
    const bundle = readBundle(env);
    expect(bundle.wikiOverrides.parrotball.name).toBe('NEW');
    // The tombstone goes, including its shiny twin — but only for that unit.
    expect(bundle.deletedUnits).not.toContain('parrotball');
    expect(bundle.deletedUnits).not.toContain('shiny-parrotball');
    expect(bundle.deletedUnits).toContain('cube');
  });

  it('revives a unit from a value-only save (no wiki row touched)', async () => {
    const res = await post(env, '/overrides/value/parrotball', { base_value: 250 });
    expect(res.status).toBe(200);
    const bundle = readBundle(env);
    expect(bundle.deletedUnits).not.toContain('parrotball');
    expect(bundle.wikiOverrides.parrotball).toBeDefined();
  });

  it('never touches the registry for a materials write', async () => {
    const res = await post(env, '/overrides/materials/cube', { slug: 'cube', name: 'renamed' });
    expect(res.status).toBe(200);
    const bundle = readBundle(env);
    expect(bundle.materialOverrides.cube.name).toBe('renamed');
    expect(bundle.deletedUnits).toContain('cube');
  });

  it('bumps the version so concurrent admins are detected', async () => {
    const res = await post(env, '/overrides/wiki/parrotball', { slug: 'parrotball', name: 'NEW' });
    expect(res.json.version).toBe(8);
  });
});
