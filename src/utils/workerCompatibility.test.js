import { describe, expect, it } from 'vitest';
import { isWorkerAtLeast } from './workerCompatibility';
describe('worker compatibility', () => {
  it('accepts equal and newer dated worker versions, including multi-digit revisions', () => {
    expect(isWorkerAtLeast('2026-10-30.2', '2026-10-30.2')).toBe(true);
    expect(isWorkerAtLeast('2026-10-30.10', '2026-10-30.2')).toBe(true);
    expect(isWorkerAtLeast('2027-01-01.1', '2026-10-30.2')).toBe(true);
    expect(isWorkerAtLeast('2026-09-02.1', '2026-10-30.2')).toBe(false);
    expect(isWorkerAtLeast('unknown', '2026-10-30.2')).toBe(false);
  });
});
