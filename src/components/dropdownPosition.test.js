import { describe, expect, it } from 'vitest';
import { dropdownPosition } from './dropdownPosition';

describe('shared dropdown placement', () => {
  it('fits narrow screens and flips above a low trigger', () => {
    const pos = dropdownPosition({ left: 290, width: 250, top: 680, bottom: 725 }, 320, 760);
    expect(pos.width).toBe('250px');
    expect(pos.left).toBe('62px');
    expect(pos.bottom).toBe('86px');
    expect(Number.parseInt(pos.maxHeight)).toBeLessThanOrEqual(380);
  });
  it('opens below when there is space', () => {
    expect(dropdownPosition({ left: 15, width: 100, top: 40, bottom: 84 }, 360, 800)).toMatchObject({ left: '15px', top: '90px', width: '180px' });
  });
});
