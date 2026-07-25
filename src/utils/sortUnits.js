import { UNIT_RARITIES } from '../data/taxonomy';

// Position of each rarity in the canonical ladder (Normie → Shiny ???).
// "Shiny <Rarity>" intentionally sits right after its base rarity.
const RARITY_ORDER = new Map(UNIT_RARITIES.map((rarity, index) => [rarity, index]));

function rarityRank(rarity) {
  const rank = RARITY_ORDER.get(rarity);
  return rank == null ? UNIT_RARITIES.length : rank;
}

/**
 * Sort units by rarity first (following the official rarity ladder), then
 * alphabetically by name (case-insensitive, natural number ordering).
 *
 * This keeps things like KrampusBall (a Transcendent) grouped with the other
 * Transcendents instead of leaking into the middle of the Legendaries, which
 * happened when units were left in raw stat-sheet order.
 *
 * Returns a new array; the input is not mutated.
 */
export function sortUnitsByRarityThenName(units) {
  return [...units].sort((a, b) => {
    const byRarity = rarityRank(a.rarity) - rarityRank(b.rarity);
    if (byRarity !== 0) return byRarity;
    return (a.name || '').localeCompare(b.name || '', undefined, {
      sensitivity: 'base',
      numeric: true,
    });
  });
}

/**
 * Group + sort a list of units into rarity buckets. Each bucket keeps the
 * canonical rarity order and its units are A-Z within the bucket. Empty
 * buckets are dropped. Handy for building grouped dropdowns / menus.
 */
export function groupAndSortUnitsByRarity(units) {
  return UNIT_RARITIES
    .map((rarity) => ({
      rarity,
      units: sortUnitsByRarityThenName(units.filter((u) => u.rarity === rarity)),
    }))
    .filter((group) => group.units.length > 0);
}
