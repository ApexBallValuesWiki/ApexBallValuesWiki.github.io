// LIVE "Browse by Rarity" counts.
//
// The two hub pages used to read UNITS_BY_RARITY, a build-time snapshot of
// src/data/units.js. Editor-added and editor-deleted units (and rarity edits)
// therefore never changed the numbers on those cards. This module derives
// both the tier list and its counts from the live DataContext roster instead,
// so adding, deleting or re-rarifying a unit updates the counts immediately.

export const DEFAULT_RARITY_ORDER = [
  'Omegas',
  'Transcendents',
  'Mythics',
  'Legendaries',
  'Awesome',
  'Rares',
  'Odds',
  'Normie',
  '???',
];

/**
 * Pure, testable builder.
 * @param {Array<{slug?:string, rarity?:string}>} units live unit list
 * @param {string[]} preferredOrder canonical tier order
 * @returns {Array<{rarity:string,count:number,shinyRarity:string,shinyCount:number,isCustom:boolean}>}
 */
export function buildRarityBrowse(units = [], preferredOrder = DEFAULT_RARITY_ORDER) {
  const counts = new Map();
  for (const unit of units || []) {
    if (!unit || !unit.slug) continue;
    const rarity = String(unit.rarity || 'Normie');
    counts.set(rarity, (counts.get(rarity) || 0) + 1);
  }

  // Always show the canonical tiers (even when emptied by deletions), and
  // append any NEW rarity an editor created so its units are reachable.
  const extras = new Set();
  for (const rarity of counts.keys()) {
    if (rarity.startsWith('Shiny ')) continue;
    if (preferredOrder.includes(rarity)) continue;
    extras.add(rarity);
  }
  const ordered = [...preferredOrder, ...[...extras].sort((a, b) => a.localeCompare(b))];

  return ordered.map((rarity) => {
    const shinyRarity = `Shiny ${rarity}`;
    return {
      rarity,
      count: counts.get(rarity) || 0,
      shinyRarity,
      shinyCount: counts.get(shinyRarity) || 0,
      isCustom: !preferredOrder.includes(rarity),
    };
  });
}

/** Rarities that should be valid routes, including editor-created ones. */
export function liveRarities(units = [], baseRarities = []) {
  const set = new Set(baseRarities);
  for (const unit of units || []) {
    const rarity = unit?.rarity;
    if (rarity) set.add(String(rarity));
  }
  return [...set];
}
