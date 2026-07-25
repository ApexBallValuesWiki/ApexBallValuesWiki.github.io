import { describe, it, expect } from 'vitest';
import { computeTradeValue, evaluateTrade, getCombinedMultiplier } from './calculator';

describe('computeTradeValue', () => {
  it('applies the formula BaseValue × Demand × Scarcity, rounded', () => {
    // 1000 × 1.0 (Normal) × 1.0 (Standard) = 1000
    expect(computeTradeValue(1000, 'Normal', 'Standard')).toBe(1000);
  });

  it('scales by demand multiplier', () => {
    // 1000 × 1.06 (Godly) × 1.0 = 1060
    expect(computeTradeValue(1000, 'Godly', 'Standard')).toBe(1060);
  });

  it('scales by scarcity multipliers', () => {
    // 1000 × 1.0 × 1.02 (Rare) = 1020
    expect(computeTradeValue(1000, 'Normal', 'Rare')).toBe(1020);
  });

  it('combines demand + scarcity', () => {
    // 1000 × 1.03 (High) × 1.01 (Limited) = 1040.3 -> 1040
    expect(computeTradeValue(1000, 'High', 'Limited')).toBe(1040);
  });

  it('treats missing/invalid base value as 0', () => {
    expect(computeTradeValue(null, 'Normal', 'Standard')).toBe(0);
    expect(computeTradeValue('abc', 'Normal', 'Standard')).toBe(0);
  });

  it('falls back to 1× multiplier for unknown labels', () => {
    expect(computeTradeValue(500, 'UnknownDemand', 'UnknownScarcity')).toBe(500);
  });
});

describe('evaluateTrade', () => {
  const v = (tradeValue) => ({ tradeValue });

  it('returns "Win" when YOU give less than you receive (>10% diff)', () => {
    // YOU (sideA) = 100, THEM (sideB) = 200 -> you receive more -> Win
    const result = evaluateTrade([v(100)], [v(200)]);
    expect(result.outcome).toBe('win');
    expect(result.verdict).toBe('Win');
    expect(result.favors).toBe('you');
  });

  it('returns "Loss" when YOU overpay (>10% diff)', () => {
    const result = evaluateTrade([v(200)], [v(100)]);
    expect(result.outcome).toBe('loss');
    expect(result.verdict).toBe('Loss');
    expect(result.favors).toBe('them');
  });

  it('returns "Fair Trade" when sides are equal', () => {
    const result = evaluateTrade([v(100)], [v(100)]);
    expect(result.outcome).toBe('fair');
    expect(result.verdict).toBe('Fair Trade');
    expect(result.favors).toBe(null);
  });

  it('sums multiple items per side', () => {
    const result = evaluateTrade([v(50), v(60)], [v(110)]);
    expect(result.totalA).toBe(110);
    expect(result.totalB).toBe(110);
    expect(result.verdict).toBe('Fair Trade');
  });
});

describe('getCombinedMultiplier', () => {
  it('returns the product of demand and scarcity multipliers', () => {
    expect(getCombinedMultiplier('Godly', 'Rare')).toBeCloseTo(1.06 * 1.02);
  });
});
