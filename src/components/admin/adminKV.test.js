import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildFullPublishBundle } from './adminKV';

// The publish bundle replaces the ENTIRE KV bundle. Anything the client does
// not send back is wiped server-side — which is how created materials never
// appeared and deleted units quietly came back.

function makeStore(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v)),
    removeItem: (k) => data.delete(k),
    _data: data,
  };
}

describe('buildFullPublishBundle', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', makeStore({
      'apex-local-material-overrides-v1': JSON.stringify({
        'iron-shard': { slug: 'iron-shard', kind: 'material', name: 'Iron Shard' },
      }),
      'apex-deleted-units-v1': JSON.stringify(['fireball']),
    }));
    vi.stubGlobal('window', { dispatchEvent: vi.fn(), CustomEvent: class {} });
    vi.stubGlobal('fetch', vi.fn(async (url) => {
      if (String(url).includes('/overrides')) {
        return {
          ok: true,
          json: async () => ({
            __v: 42,
            valueOverrides: { ball: { base_value: 1 } },
            wikiOverrides: {},
            mapOverrides: {},
            crateOverrides: {},
            materialOverrides: { 'old-gem': { slug: 'old-gem' } },
            deletedUnits: ['iceball'],
          }),
        };
      }
      return { ok: false };
    }));
  });

  afterEach(() => vi.unstubAllGlobals());

  it('carries material overrides through a full publish', async () => {
    const bundle = await buildFullPublishBundle();
    expect(bundle.materialOverrides).toMatchObject({
      'old-gem': { slug: 'old-gem' },
      'iron-shard': { slug: 'iron-shard' },
    });
  });

  it('keeps the site-wide deleted-unit registry and merges local deletions', async () => {
    const bundle = await buildFullPublishBundle();
    expect(bundle.deletedUnits.sort()).toEqual(['fireball', 'iceball']);
  });

  it('sends the base version so the worker can reject stale writes', async () => {
    const bundle = await buildFullPublishBundle();
    expect(bundle.__baseVersion).toBe(42);
  });
});

describe('buildFullPublishBundle — deleted-vs-recreated rules', () => {
  const store = (extra = {}) => ({
    'apex-deleted-units-v1': JSON.stringify(['parrotball']),
    'apex-local-overrides-deleted-v1': JSON.stringify({
      value: [], wiki: ['parrotball', 'nemesis'], map: [], crate: [], materials: [],
    }),
    ...extra,
  });

  beforeEach(() => {
    vi.stubGlobal('window', { dispatchEvent: vi.fn(), CustomEvent: class {} });
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({
        __v: 75,
        valueOverrides: {},
        wikiOverrides: { parrotball: { slug: 'parrotball', name: 'OLD ROW' } },
        mapOverrides: {},
        crateOverrides: {},
        materialOverrides: {},
        deletedUnits: ['parrotball', 'cube'],
      }),
    })));
  });

  afterEach(() => vi.unstubAllGlobals());

  it('keeps a site-wide tombstone for a unit nobody revived', async () => {
    vi.stubGlobal('localStorage', makeStore(store()));
    const bundle = await buildFullPublishBundle();
    expect(bundle.wikiOverrides.parrotball).toBeUndefined();
    expect(bundle.deletedUnits).toContain('cube');
  });

  it('a local draft for a tombstoned slug revives it and clears the registry entry', async () => {
    vi.stubGlobal('localStorage', makeStore({
      ...store(),
      'apex-local-wiki-overrides-v1': JSON.stringify({
        parrotball: { slug: 'parrotball', name: 'Parrot Ball (re-created)' },
      }),
    }));

    const bundle = await buildFullPublishBundle();

    // The re-created row must survive the publish...
    expect(bundle.wikiOverrides.parrotball.name).toBe('Parrot Ball (re-created)');
    // ...and it must not stay in the site-wide deleted list, or the unit is
    // written back and hidden again in the same breath.
    expect(bundle.deletedUnits).not.toContain('parrotball');
    expect(bundle.deletedUnits).toContain('cube');
    expect(bundle.__baseVersion).toBe(75);
  });

  it('a unit still hidden only site-wide keeps its published row out of reach', async () => {
    vi.stubGlobal('localStorage', makeStore({
      'apex-deleted-units-v1': JSON.stringify([]),
      'apex-local-overrides-deleted-v1': JSON.stringify({ value: [], wiki: [], map: [], crate: [], materials: [] }),
    }));

    const bundle = await buildFullPublishBundle();

    expect(bundle.deletedUnits).toContain('parrotball');
    expect(bundle.wikiOverrides.parrotball).toBeUndefined();
  });

  it('a draft in ANY unit section revives the whole unit, not just that section', async () => {
    // Regression: saving only the stat sheet of a deleted unit published the
    // value and silently deleted the unit's wiki row, because the site-wide
    // strip looked at each section's own drafts instead of at the unit.
    vi.stubGlobal('localStorage', makeStore({
      'apex-deleted-units-v1': JSON.stringify([]),
      'apex-local-overrides-deleted-v1': JSON.stringify({ value: [], wiki: [], map: [], crate: [], materials: [] }),
      'apex-local-value-overrides-v1': JSON.stringify({ parrotball: { slug: 'parrotball', base_value: 250 } }),
    }));

    const bundle = await buildFullPublishBundle();

    expect(bundle.valueOverrides.parrotball.base_value).toBe(250);
    expect(bundle.wikiOverrides.parrotball).toBeDefined();
    expect(bundle.deletedUnits).not.toContain('parrotball');
    expect(bundle.deletedUnits).toContain('cube');
  });

  it('a unit tombstone never reaches the materials lane', async () => {
    // Materials are not units. A material sharing a slug with a hidden unit
    // used to be deleted from the database on every full publish.
    vi.stubGlobal('localStorage', makeStore({
      'apex-deleted-units-v1': JSON.stringify([]),
      'apex-local-overrides-deleted-v1': JSON.stringify({ value: [], wiki: [], map: [], crate: [], materials: [] }),
      'apex-local-material-overrides-v1': JSON.stringify({ cube: { slug: 'cube', kind: 'material', name: 'Cube Plating' } }),
    }));

    const bundle = await buildFullPublishBundle();

    expect(bundle.materialOverrides.cube).toBeDefined();
    expect(bundle.deletedUnits).toContain('cube');
  });
})
