// CURRENCY CONVERSION — gems and coins are NOT a flat ratio. Measured from
// the live APEX value database (328 units, 2026-09): coins-per-gem falls
// from ~100 on cheap units to ~65 around 1M and ~50-62 on 4M+ Omegas, while
// gems track value closely with a small premium at the top end.

/**
 * Coins one gem is worth at a given value scale. Smooth curve fitted to the
 * live data:  ~100 at ~0 · ~97 at 10k · ~85 at 100k · ~64 at 1M · ~55 at 4M
 * @param {number} valueScale - the value tier being converted
 */
export function coinsPerGem(valueScale) {
  const v = Math.max(0, Number(valueScale) || 0);
  return 50 + 50 / (1 + Math.pow(v / 300000, 0.8));
}

/**
 * How much value one gem carries at a given scale (gems ≈ value with a
 * growing premium on high tiers: 1.0x cheap → ~1.17x at 100M+).
 */
export function valuePerGem(valueScale) {
  const v = Math.max(0, Number(valueScale) || 0);
  return 1 + (0.18 * v) / (v + 2000000);
}

/** Convert a pure gems amount into equivalent trade value. */
export function valueFromGems(gems) {
  const g = Math.max(0, Number(gems) || 0);
  return Math.round(g * valuePerGem(g * 1.05));
}

/** Convert a pure coins amount into equivalent trade value (iterative —
 *  the coins-per-gem ratio depends on the value tier being solved for). */
export function valueFromCoins(coins) {
  const c = Math.max(0, Number(coins) || 0);
  let v = c / 75; // seed
  for (let i = 0; i < 4; i += 1) v = c / coinsPerGem(v);
  return Math.round(v * valuePerGem(v));
}

/** Smallest whole currency amount whose trade value reaches `target`
 *  (binary search — both forward curves are monotonic but tier-scaled). */
function smallestAmountReaching(target, forward) {
  const goal = Math.floor(Number(target) || 0);
  if (goal <= 0) return 0;
  if (forward(1) >= goal) return 1;
  let lo = 1;
  let hi = 2;
  while (forward(hi) < goal && hi < 2 ** 53) {
    lo = hi;
    hi *= 2;
  }
  while (hi - lo > 1) {
    const mid = Math.floor((lo + hi) / 2);
    if (forward(mid) < goal) lo = mid;
    else hi = mid;
  }
  return hi;
}

/** Inverse of valueFromGems: gems needed to reach a target trade value.
 *  Powers the calculator's "close the gap" top-up button. */
export function gemsFromValue(target) {
  return smallestAmountReaching(target, valueFromGems);
}

/** Inverse of valueFromCoins — same contract as gemsFromValue. */
export function coinsFromValue(target) {
  return smallestAmountReaching(target, valueFromCoins);
}

/**
 * Apex trade value — the number the team types is the number everyone sees.
 * Demand and Scarcity NO LONGER modify prices (owner decision): they remain
 * on the cards as information only. The labels are kept in the signature so
 * existing callers work unchanged.
 *
 * @param {number} baseValue - the value exactly as entered in the editor
 * @returns {number} the same number, rounded to a whole amount
 */
export function computeTradeValue(baseValue) {
  const base = Number(baseValue) || 0;
  return Math.round(base);
}

/** Prices are exact — there is no combined multiplier anymore (always 1). */
export function getCombinedMultiplier() {
  return 1;
}

/**
 * Compares two "sides" of a trade (arrays of {tradeValue}) and returns a
 * verdict from the "YOU" side's perspective — sideA is always YOU, sideB is
 * always THEM (the other player).
 *
 * A trade is good FOR YOU when THEM is putting in MORE value than you are
 * (you're receiving more than you give), so:
 *   totalB > totalA  -> "Win"  (favors you)
 *   totalA > totalB  -> "Loss" (favors them)
 *   roughly equal    -> "Fair Trade"
 */
export function evaluateTrade(sideA, sideB) {
  const totalA = sideA.reduce((sum, e) => sum + (e.tradeValue || 0), 0);
  const totalB = sideB.reduce((sum, e) => sum + (e.tradeValue || 0), 0);
  const diff = totalB - totalA; // positive diff = good for YOU (you gain value)
  const favors = totalA === totalB ? null : totalB > totalA ? 'you' : 'them';
  const lowerTotal = Math.min(totalA, totalB) || 1;
  const percentDiff = (Math.abs(diff) / lowerTotal) * 100;

  let verdict = 'Fair Trade';
  let outcome = 'fair'; // 'win' | 'loss' | 'fair'
  if (percentDiff > 10) {
    verdict = favors === 'you' ? 'Win' : 'Loss';
    outcome = favors === 'you' ? 'win' : 'loss';
  } else if (percentDiff > 2) {
    verdict = favors === 'you' ? 'Slight Win' : 'Slight Loss';
    outcome = favors === 'you' ? 'win' : 'loss';
  }

  return { totalA, totalB, diff, favors, outcome, percentDiff, verdict };
}

/** DPS helpers used across WIKI stat sheets */
export function computeDPS(damage, cooldownSeconds) {
  const cd = Number(cooldownSeconds);
  if (!cd || cd <= 0) return 0;
  return Number(damage) / cd;
}

export function computeCostPerDPS(cost, dps) {
  if (!dps || dps <= 0) return null;
  return Number(cost) / dps;
}
