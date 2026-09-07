// BALL KNOWLEDGE CANDIDATES — which (unit, upgrade) pairs may appear as
// puzzles. Extracted from the page so the eligibility rules are testable.
//
// The core rule the game promises players: an upgrade may never REVEAL its
// unit's name in its text. That includes PARTS of compound names —
// "SnowmanBuilder" must not keep any upgrade that says "Snowman" — and it
// applies to the daily puzzle AND Endless (both draw from this pool).

import { BASE_UNITS } from '../data/units';
import { labelAttacks } from './attacks';

// camelCase-split name parts that are too generic to identify a unit on
// their own ("Ball", "Shiny") — they never trigger a filter by themselves.
const GENERIC_PARTS = new Set(['ball', 'shiny']);

function hasEntries(obj) {
  return obj && Object.keys(obj).length > 0;
}

function getDamageRows(upgrade) {
  const rows = [];
  Object.entries(upgrade.stats || {}).forEach(([key, value]) => {
    if (/damage/i.test(key)) rows.push({ label: key, value });
  });
  labelAttacks(upgrade.attacks).forEach((attack) => {
    Object.entries(attack.stats).forEach(([key, value]) => {
      if (/damage/i.test(key)) rows.push({ label: attack.name === 'Stats' ? key : `${attack.label} ${key}`, value });
    });
  });
  return rows;
}

function isUsefulCostPerDps(value) {
  return value && !/^n\/?a\$?$/i.test(String(value).trim());
}

function isPlacementUpgrade(upgrade) {
  if (!upgrade) return false;
  if (upgrade.level === 0 || upgrade.level === 1) {
    if (/placement/i.test(String(upgrade.label || '')) || /placement/i.test(String(upgrade.description || ''))) return true;
  }
  return /^\s*placement\s*$/i.test(String(upgrade.label || ''));
}

/** All substrings of the unit name that could give it away inside upgrade
 *  text: the full name, each word (>= 3 chars), and each camelCase part of
 *  compound words (>= 3 chars, minus generic parts like "ball"). */
export function unitNameStems(unitName) {
  const trimmed = String(unitName || '').trim();
  if (!trimmed) return [];
  const rawWords = trimmed.split(/\s+/).map((w) => w.replace(/[^a-zA-Z0-9]/g, '')).filter(Boolean);
  const stems = new Set();
  const lower = trimmed.toLowerCase();
  stems.add(lower);
  stems.add(lower.replace(/\s+/g, ''));
  for (const word of rawWords) {
    if (word.length >= 3) stems.add(word.toLowerCase());
    // "SnowmanBuilder" -> snowman / builder — the whole-word rule above
    // cannot see these, and upgrades that say just "Snowman" give the
    // unit away just as much.
    for (const part of word.split(/(?<=[a-z])(?=[A-Z])/)) {
      const p = part.toLowerCase();
      if (p.length >= 3 && !GENERIC_PARTS.has(p)) stems.add(p);
    }
  }
  stems.delete('');
  return [...stems];
}

/** True when the upgrade's text contains any stem of the unit's name —
 *  such upgrades are cleared from the candidate pool. */
export function upgradeContainsUnitName(unit, upgrade) {
  if (!unit || !upgrade) return false;
  const stems = unitNameStems(unit.name);
  if (!stems.length) return false;
  const testText = `${upgrade.label || ''} ${upgrade.description || ''}`.toLowerCase();
  return stems.some((stem) => testText.includes(stem));
}

export function buildCandidates() {
  return BASE_UNITS.flatMap((unit) =>
    (unit.upgrades || []).map((upgrade) => ({ unit, upgrade, damageRows: getDamageRows(upgrade) }))
  ).filter(({ unit, upgrade, damageRows }) =>
    unit.documented &&
    !unit.unavailableData &&
    !isPlacementUpgrade(upgrade) &&
    !upgradeContainsUnitName(unit, upgrade) &&
    hasEntries(upgrade.dps) &&
    isUsefulCostPerDps(upgrade.costPerDps) &&
    damageRows.length > 0 &&
    upgrade.range &&
    upgrade.cooldown
  );
}
