import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearUnitTombstones,
  isLocalUnitTombstoned,
  loadLocalDeletedOverrides,
  loadLocalDeletedUnits,
  markLocalOverrideDeleted,
  markLocalUnitDeleted,
  setLocalWikiOverride,
  LOCAL_WIKI_OVERRIDES_KEY,
  LOCAL_DELETED_OVERRIDES_KEY,
} from './localOverrides';

// The parrot-ball incident: a unit created by an editor was deleted by
// mistake and could then neither be undeleted nor re-created. Cause was two
// independent tombstone registries (per-brain "deleted overrides" and a
// browser "deleted units" mark) where every surface only cleared its own half,
// so the unit stayed buried no matter which button was pressed.

const DELETED_UNITS_KEY = 'apex-deleted-units-v1';

function makeStore(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v)),
    removeItem: (k) => data.delete(k),
    _data: data,
  };
}

describe('unit delete / restore round trip', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', makeStore());
    vi.stubGlobal('window', { dispatchEvent: vi.fn(), CustomEvent: class {} });
  });

  it('a delete marks the unit in every registry that hides it', () => {
    markLocalUnitDeleted('parrotball');
    markLocalOverrideDeleted('wiki', 'parrotball');
    markLocalOverrideDeleted('value', 'parrotball');

    expect(isLocalUnitTombstoned('parrotball')).toBe(true);
    expect(loadLocalDeletedUnits()).toContain('parrotball');
    expect(loadLocalDeletedOverrides().wiki).toContain('parrotball');
  });

  it('clearUnitTombstones undoes BOTH registries at once', () => {
    markLocalUnitDeleted('parrotball');
    markLocalOverrideDeleted('wiki', 'parrotball');
    markLocalOverrideDeleted('value', 'parrotball');

    clearUnitTombstones('parrotball');

    expect(isLocalUnitTombstoned('parrotball')).toBe(false);
    expect(loadLocalDeletedUnits()).toEqual([]);
    expect(loadLocalDeletedOverrides()).toEqual({
      value: [], wiki: [], map: [], crate: [], materials: [],
    });
  });

  it('clearing tombstones never throws when nothing was deleted', () => {
    expect(() => clearUnitTombstones('never-existed')).not.toThrow();
    expect(() => clearUnitTombstones('')).not.toThrow();
    expect(() => clearUnitTombstones(null)).not.toThrow();
  });

  it('a restore also frees the shiny twin this browser hid', () => {
    markLocalUnitDeleted('parrotball');
    markLocalUnitDeleted('shiny-parrotball');

    clearUnitTombstones('parrotball');

    expect(loadLocalDeletedUnits()).toEqual([]);
  });

  it('re-creating a deleted slug starts from a live row', () => {
    markLocalUnitDeleted('parrotball');
    markLocalOverrideDeleted('wiki', 'parrotball');

    // What handleCreateUnit now does before writing the row.
    clearUnitTombstones('parrotball');
    setLocalWikiOverride('parrotball', { slug: 'parrotball', name: 'Parrot Ball' });

    const store = globalThis.localStorage;
    const rows = JSON.parse(store.getItem(LOCAL_WIKI_OVERRIDES_KEY));
    expect(rows.parrotball.name).toBe('Parrot Ball');
    expect(JSON.parse(store.getItem(LOCAL_DELETED_OVERRIDES_KEY)).wiki).toEqual([]);
    expect(isLocalUnitTombstoned('parrotball')).toBe(false);
  });

  it('leaves other tombstoned entries alone', () => {
    markLocalUnitDeleted('parrotball');
    markLocalOverrideDeleted('wiki', 'parrotball');
    markLocalOverrideDeleted('wiki', 'nemesis');
    markLocalUnitDeleted('nemesis');

    clearUnitTombstones('parrotball');

    expect(loadLocalDeletedOverrides().wiki).toEqual(['nemesis']);
    expect(loadLocalDeletedUnits()).toEqual(['nemesis']);
  });
});
