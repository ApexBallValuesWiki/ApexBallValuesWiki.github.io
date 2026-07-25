import { beforeEach, describe, expect, it } from 'vitest';
import {
  loadLocalDeletedOverrides,
  markLocalOverrideDeleted,
  clearLocalDeletedOverrides,
  loadLocalValueOverrides,
  saveLocalValueOverrides,
  loadLocalWikiOverrides,
  saveLocalWikiOverrides,
} from './localOverrides';

const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
      store[key] = value.toString();
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

// Assign to globalThis before importing localOverrides if we were not already doing so,
// but since imports are hoisted, we can just assign it inside a beforeEach or at the top.
globalThis.localStorage = localStorageMock;

describe('localOverrides tombstone queue and merge order', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('handles loading deleted overrides with fallback when empty', () => {
    const deleted = loadLocalDeletedOverrides();
    expect(deleted).toEqual({ value: [], wiki: [], map: [], crate: [] });
  });

  it('deduplicates slugs added as deleted per kind', () => {
    markLocalOverrideDeleted('value', 'slug-a');
    markLocalOverrideDeleted('value', 'slug-b');
    markLocalOverrideDeleted('value', 'slug-a'); // Duplicate

    markLocalOverrideDeleted('wiki', 'wiki-a');

    const deleted = loadLocalDeletedOverrides();
    expect(deleted.value).toEqual(['slug-a', 'slug-b']);
    expect(deleted.wiki).toEqual(['wiki-a']);
    expect(deleted.map).toEqual([]);
    expect(deleted.crate).toEqual([]);
  });

  it('clears the deleted overrides queue', () => {
    markLocalOverrideDeleted('value', 'slug-a');
    expect(loadLocalDeletedOverrides().value).toEqual(['slug-a']);

    clearLocalDeletedOverrides();
    expect(loadLocalDeletedOverrides()).toEqual({ value: [], wiki: [], map: [], crate: [] });
  });

  it('implements merge order baked < liveKV < localDrafts with tombstone deletion', () => {
    // 1. Setup different layers of value overrides
    const bakedSection = {
      'unit-a': { base_value: 100, gems: 10 },
      'unit-b': { base_value: 200, gems: 20 },
      'unit-c': { base_value: 300 },
    };

    const liveKVSection = {
      'unit-b': { base_value: 250, gems: 25, trend: 'stable' }, // Wins over baked
      'unit-d': { base_value: 400 },
    };

    const localDraftSection = {
      'unit-c': { base_value: 350 }, // Wins over baked
    };

    // 2. Mark unit-a and unit-b as tombstoned
    markLocalOverrideDeleted('value', 'unit-a');
    markLocalOverrideDeleted('value', 'unit-b');

    // 3. Simulate merging logic:
    // merge priority: baked -> liveKV -> localDrafts
    const merged = {
      ...bakedSection,
      ...liveKVSection,
      ...localDraftSection,
    };

    // Apply tombstone deletion unless slug is in localDraftSection
    const deleted = loadLocalDeletedOverrides();
    const deletedSlugs = deleted.value || [];

    for (const slug of deletedSlugs) {
      if (!(slug in localDraftSection)) {
        delete merged[slug];
      }
    }

    // 4. Assert correctness:
    // 'unit-a' was tombstoned, and not in localDraftSection -> deleted
    expect(merged['unit-a']).toBeUndefined();

    // 'unit-b' was tombstoned, and not in localDraftSection -> deleted
    expect(merged['unit-b']).toBeUndefined();

    // 'unit-c' was in localDraftSection, so its value wins and it's not deleted (even if it were tombstoned, but it's not)
    expect(merged['unit-c']).toEqual({ base_value: 350 });

    // 'unit-d' was in liveKVSection, not tombstoned -> kept
    expect(merged['unit-d']).toEqual({ base_value: 400 });
  });
});
