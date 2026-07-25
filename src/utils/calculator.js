import { DEMAND, SCARCITY } from '../data/taxonomy';

/**
 * Core Apex trade-value formula:
 *   TradeValue = BaseValue × DemandMultiplier × ScarcityMultiplier
 *
 * @param {number} baseValue - raw base value of the unit/item (Values page "BaseValue")
 * @param {string} demandLabel - one of the DEMAND keys, e.g. "Normal"
 * @param {string} scarcityLabel - one of the SCARCITY keys, e.g. "Standard"
 * @returns {number} computed trade value, rounded to nearest whole number
 */
export function computeTradeValue(baseValue, demandLabel, scarcityLabel) {
  const demandMult = DEMAND[demandLabel] ?? 1;
  const scarcityMult = SCARCITY[scarcityLabel] ?? 1;
  const base = Number(baseValue) || 0;
  return Math.round(base * demandMult * scarcityMult);
}

/** Returns the raw multiplier without applying to a base value (useful for display). */
export function getCombinedMultiplier(demandLabel, scarcityLabel) {
  const demandMult = DEMAND[demandLabel] ?? 1;
  const scarcityMult = SCARCITY[scarcityLabel] ?? 1;
  return demandMult * scarcityMult;
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
