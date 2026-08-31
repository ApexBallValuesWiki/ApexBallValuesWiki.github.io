import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { saveFormDraft, loadFormDraft, clearFormDraft, shouldReseedEditor } from './adminSafety';

// Regression guard for the "saved values follow me to the next unit" bug:
// the post-save exemption was a one-shot flag, so the NEXT unit the editor
// clicked skipped its re-seed and inherited the values just typed.

describe('shouldReseedEditor', () => {
  it('seeds normally when nothing was just saved', () => {
    expect(shouldReseedEditor('', 'fireball')).toBe(true);
    expect(shouldReseedEditor(null, 'fireball')).toBe(true);
  });

  it('protects the unit that was just saved', () => {
    expect(shouldReseedEditor('fireball', 'fireball')).toBe(false);
  });

  it('re-seeds the next unit after a save — the reported bug', () => {
    expect(shouldReseedEditor('fireball', 'iceball')).toBe(true);
  });

  it('re-seeds when the selection is gone', () => {
    expect(shouldReseedEditor('fireball', undefined)).toBe(true);
  });

  it('is exempt for exactly one unit, not one run', () => {
    // Old behaviour: the flag was consumed by whatever ran next, so a save
    // could poison a different unit. Two switches must both seed correctly.
    const justSaved = 'fireball';
    expect(shouldReseedEditor(justSaved, 'fireball')).toBe(false); // stays put
    expect(shouldReseedEditor(justSaved, 'iceball')).toBe(true);   // switch 1
    expect(shouldReseedEditor(justSaved, 'normieball')).toBe(true); // switch 2
  });
});

describe('editor form drafts stay with their own unit', () => {
  beforeEach(() => {
    const store = new Map();
    vi.stubGlobal('localStorage', {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('a draft written for one slug is never restored for another', () => {
    const aValues = { baseValue: 999, gems: 999, coins: 999, demand: 'Very High', scarcity: 'Rare' };
    saveFormDraft('value', 'fireball', aValues);

    const draft = loadFormDraft('value');
    expect(draft.slug).toBe('fireball');
    // The restore condition is `draft.slug === selectedUnit?.slug`, so a
    // different unit cannot pick these values up.
    expect(draft.slug === 'iceball').toBe(false);
  });

  it('re-saving under the new slug replaces the stale draft', () => {
    saveFormDraft('value', 'fireball', { baseValue: 999 });
    saveFormDraft('value', 'iceball', { baseValue: 12 });

    const draft = loadFormDraft('value');
    expect(draft.slug).toBe('iceball');
    expect(draft.form.baseValue).toBe(12);
  });

  it('clearFormDraft drops it for good', () => {
    saveFormDraft('value', 'fireball', { baseValue: 999 });
    clearFormDraft('value');
    expect(loadFormDraft('value')).toBeNull();
  });
});
