/**
 * Small helpers to pull a quick "at a glance" stat summary out of a unit's
 * parsed upgrade data (cooldown, range, first damage/income/health-like stat,
 * placement count) for compact cards where showing every upgrade level isn't
 * practical.
 */

import { normalizeAttacks } from './attacks';

function pickImportantStat(stats) {
  if (!stats) return null;
  const key = Object.keys(stats).find((k) => /damage|income|health|cash|amount/i.test(k));
  return key ? stats[key] : null;
}

export function getBaseStats(unit) {
  const first = unit?.upgrades?.[0];
  if (!first) return null;

  let damage = null;
  const attackBlocks = normalizeAttacks(first.attacks);
  if (attackBlocks.length > 0) {
    damage = pickImportantStat(attackBlocks[0].stats);
  }

  if (damage == null) {
    damage = pickImportantStat(first.stats);
  }

  return {
    cooldown: first.cooldown,
    range: first.range,
    damage,
    placementLimit: unit.placementLimit,
  };
}
