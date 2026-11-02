import { describe, expect, it } from 'vitest';
import { makeSpreadsheetRow, makeSpreadsheetPatch, makeSpreadsheetInitialRow } from './spreadsheetValues';

const unit = { slug: 'test-unit', name: 'Test Unit', rarity: 'Normie' };

describe('spreadsheet values', () => {
  it('prefills every field, including zeroes, ranges, statuses and notes', () => {
    const row = makeSpreadsheetRow(unit, { baseValue: 0, baseValueMax: 100, gems: 0, gemsMax: 8, coins: 'O/C', coinsMax: 20, demand: 'High', scarcity: 'Limited', trend: 'rising', notes: 'keep me' });
    expect(row).toMatchObject({ base_value: 0, base_value_max: 100, gems: 0, gems_max: 8, coins: 'O/C', coins_max: 20, demand: 'High', scarcity: 'Limited', trend: 'rising', notes: 'keep me' });
  });
  it('uses the same fallback values as the single-unit editor', () => {
    const row = makeSpreadsheetRow({ ...unit, slug: 'ball' }, null);
    expect(row.base_value).not.toBe('');
    expect(row.demand).toBeTruthy();
  });
  it('updates only edited columns, with both supported aliases', () => {
    expect(makeSpreadsheetPatch({ base_value: '3.75M', demand: 'High' })).toEqual({ base_value: 3750000, baseValue: 3750000, demand: 'High' });
    expect(makeSpreadsheetPatch({ gems: 'O/C', coins: 'N/A', gems_max: '' })).toEqual({ gems: 'O/C', coins: 'N/A', gems_max: null, gemsMax: null });
  });
  it('does not turn special values or typos into zero', () => {
    expect(() => makeSpreadsheetPatch({ base_value: '1oops' })).toThrow(/Invalid/);
    expect(() => makeSpreadsheetPatch({ base_value: '-50' })).toThrow(/Invalid/);
    expect(() => makeSpreadsheetPatch({ base_value: '3,75M' })).toThrow(/Invalid/);
    expect(makeSpreadsheetPatch({ coins: '1,200' }).coins).toBe(1200);
    expect(() => makeSpreadsheetPatch({ coins_max: 'O/C' })).toThrow(/Invalid/);
  });
  it('only seeds a complete row for a brand-new override', () => {
    const row = makeSpreadsheetRow(unit, { base_value: 200, gems: 'O/C', coins: 0, notes: 'remember', trend: 'falling' });
    expect(makeSpreadsheetInitialRow(row)).toMatchObject({ base_value: 200, gems: 'O/C', coins: 0, notes: 'remember', trend: 'falling' });
  });
});
