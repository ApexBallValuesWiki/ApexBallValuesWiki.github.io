import { describe, expect, it } from 'vitest';
import { matchHistoryRecord, historyChanges, displayAuditValue } from './auditLog';

describe('activity history', () => {
  it('matches only the requested event, not another edit of the same unit', () => {
    const history = [{ id: 1, at: '2026-01-01', before: { value: 1 }, after: { value: 2 } }, { id: 2, at: '2026-01-02', before: { value: 2 }, after: { value: 3 } }];
    expect(matchHistoryRecord({ id: 2 }, history)).toBe(history[1]);
    expect(matchHistoryRecord({ id: 3, at: '2026-01-01' }, history)).toBeNull();
  });
  it('only uses a timestamp for old records if it is unique', () => {
    expect(matchHistoryRecord({ at: 'a', section: 'value', slug: 'x' }, [{ at: 'a' }, { at: 'a' }])).toBeNull();
    expect(matchHistoryRecord({ at: 'a', section: 'value', slug: 'x' }, [{ at: 'a', section: 'value', slug: 'x' }])).toBeTruthy();
  });
  it('distinguishes unavailable snapshots, empty snapshots and actual changes', () => {
    expect(historyChanges({ before: {} })).toBeNull();
    expect(historyChanges({ before: { a: 0, updated_at: 'old' }, after: { a: 0, updated_at: 'new' } })).toEqual([]);
    expect(historyChanges({ before: null, after: { value: 0 } })).toEqual([{ key: 'value', before: undefined, after: 0 }]);
    expect(displayAuditValue(undefined)).toBe('Not present');
    expect(displayAuditValue(null)).toBe('null');
    expect(displayAuditValue(0)).toBe('0');
  });
});
