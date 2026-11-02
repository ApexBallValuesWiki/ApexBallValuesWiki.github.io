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

/** Parse "14.28k", "$2.75k", "25k → 50k", "1.75" into a number. */
function parseNumericish(value) {
  if (value === null || value === undefined) return null;
  const head = String(value).split('→')[0].split('/')[0].split('-')[0].trim().replace(/[$,\s]/g, '');
  const match = head.match(/^([+-]?\d*\.?\d+)([kmbt])?$/i);
  if (!match) return null;
  const multipliers = { k: 1e3, m: 1e6, b: 1e9, t: 1e12 };
  const factor = match[2] ? multipliers[match[2].toLowerCase()] : 1;
  const parsed = Number(match[1]) * factor;
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * DPS and DPS-per-cost for compact WIKI cards. Reads the parsed upgrade data
 * shipped with each unit; falls back to damage / cooldown and cost / dps when
 * a field is missing so older unit records still get a widget.
 */
export function getUnitDps(unit) {
  const first = unit?.upgrades?.[0];
  if (!first) return null;

  let dps = null;
  if (first.dps && typeof first.dps === 'object') {
    const key = Object.keys(first.dps).find((k) => /dps/i.test(k)) || Object.keys(first.dps)[0];
    dps = parseNumericish(first.dps[key]);
  }

  const base = getBaseStats(unit);
  const damage = parseNumericish(base?.damage ?? unit?.damage);
  const cooldown = parseNumericish(first.cooldown);
  if (dps === null && damage !== null && cooldown > 0) dps = damage / cooldown;

  const cost = Number.isFinite(Number(first.cost)) && Number(first.cost) > 0
    ? Number(first.cost)
    : parseNumericish(first.costRaw);
  let costPerDps = parseNumericish(first.costPerDps);
  if (costPerDps === null && cost !== null && dps > 0) costPerDps = cost / dps;

  if (dps === null) return null;
  return { dps, costPerDps, cost, cooldown, damage };
}
