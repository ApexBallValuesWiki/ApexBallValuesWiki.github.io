import { describe, it, expect } from 'vitest';
import { errorMessage, canEditValue, canEditWiki, normalizeValueForm, parseCost, linesToObject, objectToLines } from './adminForms';

describe('errorMessage', () => {
  it('returns the fallback for null/undefined', () => {
    expect(errorMessage(null)).toBe('Something went wrong. Please try again.');
    expect(errorMessage(undefined, 'custom')).toBe('custom');
  });

  it('returns the string directly', () => {
    expect(errorMessage('boom')).toBe('boom');
  });

  it('reads .message from an error object', () => {
    expect(errorMessage({ message: 'rate limited' })).toBe('rate limited');
  });

  it('reads .status when message is empty', () => {
    // The original bug: `if (typeof error)` was always truthy and returned
    // error.message even when empty — swallowing the real cause. This test
    // guards the corrected fallthrough to the status branch.
    expect(errorMessage({ message: '', status: 500 })).toBe('Request failed (status 500).');
  });

  it('reads .error_description', () => {
    expect(errorMessage({ error_description: 'bad redirect' })).toBe('bad redirect');
  });
});

describe('role checks', () => {
  it('owner can edit both', () => {
    expect(canEditValue('owner')).toBe(true);
    expect(canEditWiki('owner')).toBe(true);
  });
  it('value_editor can edit values only', () => {
    expect(canEditValue('value_editor')).toBe(true);
    expect(canEditWiki('value_editor')).toBe(false);
  });
  it('wiki_editor can edit wiki only', () => {
    expect(canEditValue('wiki_editor')).toBe(false);
    expect(canEditWiki('wiki_editor')).toBe(true);
  });
  it('no role edits nothing', () => {
    expect(canEditValue(null)).toBe(false);
    expect(canEditWiki(null)).toBe(false);
  });
});

describe('normalizeValueForm', () => {
  it('coerces numeric strings and defaults', () => {
    const out = normalizeValueForm({ baseValue: '500', gems: '', coins: '0' });
    expect(out.baseValue).toBe(500);
    expect(out.gems).toBe(0);
    expect(out.coins).toBe(0);
    expect(out.demand).toBe('Normal');
    expect(out.scarcity).toBe('Standard');
  });
});

describe('parseCost', () => {
  it('parses K/M/B suffixes', () => {
    expect(parseCost('1.5K')).toBe(1500);
    expect(parseCost('2M')).toBe(2_000_000);
    expect(parseCost('3B')).toBe(3_000_000_000);
  });
  it('strips $ and commas', () => {
    expect(parseCost('$1,000')).toBe(1000);
  });
  it('returns null for empty/garbage', () => {
    expect(parseCost('')).toBe(null);
    expect(parseCost(null)).toBe(null);
    expect(parseCost('abc')).toBe(null);
  });
});

describe('lines <-> object', () => {
  it('round-trips', () => {
    const text = objectToLines({ Damage: '10', Range: '5' });
    expect(linesToObject(text)).toEqual({ Damage: '10', Range: '5' });
  });
  it('skips lines without a colon', () => {
    expect(linesToObject('key: val\nnope\nx: 1')).toEqual({ key: 'val', x: '1' });
  });
});
