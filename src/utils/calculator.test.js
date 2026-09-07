import { describe, it, test, expect } from 'vitest';
import { computeTradeValue, evaluateTrade, getCombinedMultiplier } from './calculator';

describe('computeTradeValue', () => {
  it('returns the base value exactly - demand/scarcity no longer modify prices', () => {
    expect(computeTradeValue(1000)).toBe(1000);
  });

  it('is exact regardless of demand/scarcity labels', () => {
    expect(computeTradeValue(1000, 'Huge', 'Rare')).toBe(1000);
    expect(computeTradeValue(1000, 'Abysmal', 'Flooded')).toBe(1000);
  });

  it('rounds to a whole number', () => {
    expect(computeTradeValue(10.4)).toBe(10);
    expect(computeTradeValue(10.6)).toBe(11);
  });

  it('treats missing/invalid base value as 0', () => {
    expect(computeTradeValue(null)).toBe(0);
    expect(computeTradeValue(undefined)).toBe(0);
    expect(computeTradeValue('abc')).toBe(0);
  });

  it('passes unknown labels through exactly', () => {
    expect(computeTradeValue(250, 'does-not-exist', 'nope')).toBe(250);
  });
});

describe('getCombinedMultiplier', () => {
  it('is always 1 - prices are exact', () => {
    expect(getCombinedMultiplier('Huge', 'Rare')).toBe(1);
    expect(getCombinedMultiplier()).toBe(1);
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

// Currency conversion curve (gems <-> coins <-> value)
import { coinsPerGem, valuePerGem, valueFromGems, valueFromCoins, gemsFromValue, coinsFromValue } from './calculator';

describe('currency conversion curve', () => {
  test('coins-per-gem falls from ~100 (cheap) to ~50-65 (top tiers)', () => {
    expect(coinsPerGem(0)).toBeCloseTo(100, 0);
    expect(coinsPerGem(10000)).toBeGreaterThan(90);
    expect(coinsPerGem(100000)).toBeGreaterThan(75);
    const aroundTranscendents = coinsPerGem(1000000);
    expect(aroundTranscendents).toBeGreaterThan(58);
    expect(aroundTranscendents).toBeLessThan(72);
    const omegaTier = coinsPerGem(4000000);
    expect(omegaTier).toBeGreaterThanOrEqual(50);
    expect(omegaTier).toBeLessThan(62);
    expect(coinsPerGem(100000000)).toBeLessThan(53);
  });

  test('curve is monotonic (more expensive => fewer coins per gem)', () => {
    let prev = Infinity;
    [0, 1000, 10000, 100000, 1000000, 4000000, 100000000].forEach((v) => {
      const next = coinsPerGem(v);
      expect(next).toBeLessThanOrEqual(prev);
      prev = next;
    });
  });

  test('gems track value with a small premium at the top', () => {
    expect(valuePerGem(0)).toBeCloseTo(1, 3);
    expect(valuePerGem(100000000)).toBeGreaterThan(1.1);
    expect(valuePerGem(100000000)).toBeLessThan(1.25);
  });

  test('amount conversions are sane', () => {
    expect(valueFromGems(1000)).toBeGreaterThan(950);
    expect(valueFromGems(1000)).toBeLessThan(1100);
    expect(valueFromCoins(10000)).toBeGreaterThan(90);
    expect(valueFromCoins(10000)).toBeLessThan(130);
    const mid = valueFromCoins(10000000);
    expect(mid).toBeGreaterThan(110000);
    expect(mid).toBeLessThan(135000);
    const omega = valueFromCoins(5000000000);
    expect(omega).toBeGreaterThan(100000000);
    expect(omega).toBeLessThan(135000000);
    expect(valueFromGems(0)).toBe(0);
    expect(valueFromCoins(0)).toBe(0);
  });
});

describe('currency inverse (close-the-gap top-up)', () => {
  it('gemsFromValue round-trips within one gem across tiers', () => {
    for (const g of [1, 100, 999, 1000, 12345, 250000, 5000000]) {
      const back = gemsFromValue(valueFromGems(g));
      expect(back).toBeGreaterThanOrEqual(g);
      expect(back - g).toBeLessThanOrEqual(1);
      expect(valueFromGems(back)).toBeGreaterThanOrEqual(valueFromGems(g));
    }
  });

  it('coinsFromValue covers the target value, overshooting by at most 1 value', () => {
    // Coin amounts are dense (~80 coins per value unit at small scale), so
    // the contract is on VALUE: the returned amount covers the gap with at
    // most one value unit of overshoot.
    for (const c of [1000, 99999, 1000000, 5000000000]) {
      const v = valueFromCoins(c);
      const back = coinsFromValue(v);
      expect(valueFromCoins(back)).toBeGreaterThanOrEqual(v);
      expect(valueFromCoins(back) - v).toBeLessThanOrEqual(1);
    }
  });

  it('returns 0 for zero or negative targets', () => {
    expect(gemsFromValue(0)).toBe(0);
    expect(coinsFromValue(0)).toBe(0);
    expect(gemsFromValue(-500)).toBe(0);
    expect(coinsFromValue(-500)).toBe(0);
  });

  it('reaches tiny targets with the minimum amount', () => {
    expect(gemsFromValue(1)).toBe(1);
    expect(gemsFromValue(2)).toBeGreaterThan(0);
    expect(coinsFromValue(2)).toBeGreaterThan(0);
  });

  it('degenerate sub-value coin amounts invert to 0 (forward rounds to 0)', () => {
    // 1 coin is worth ~0.01 value, so valueFromCoins(1) rounds to 0 and the
    // inverse correctly returns 0 — the UI hides the top-up button then.
    expect(valueFromCoins(1)).toBe(0);
    expect(coinsFromValue(valueFromCoins(1))).toBe(0);
  });
});
