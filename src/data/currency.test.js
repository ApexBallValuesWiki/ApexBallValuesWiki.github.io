import { describe, expect, it } from 'vitest';
import { clampQuantity } from './currency';

describe('calculator currency suffix input', () => {
  it('accepts K/M/B/T for gems and coins', () => {
    expect(clampQuantity('currency:gems', '20M')).toBe(20_000_000);
    expect(clampQuantity('currency:coins', '1.5B')).toBe(1_500_000_000);
    expect(clampQuantity('currency:gems', '3K')).toBe(3000);
  });

  it('still accepts plain, grouped and quick-button values', () => {
    expect(clampQuantity('currency:coins', '1,000')).toBe(1000);
    expect(clampQuantity('currency:gems', 100000)).toBe(100000);
    expect(clampQuantity('currency:gems', '')).toBe(0);
  });

  it('does not change unit quantity behaviour', () => {
    expect(clampQuantity('ball', '5')).toBe(5);
    expect(clampQuantity('ball', '99999')).toBe(9999);
  });
});
