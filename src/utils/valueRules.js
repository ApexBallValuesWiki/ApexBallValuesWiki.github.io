// Shared value rules for "What can I afford?" and the Trade Calculator.
// Kept in one pure module so the admin data, both pages and the tests all use
// exactly the same numbers — no drift between display and calculation.
import { DEMAND_PERCENT } from '../data/taxonomy';

// Zero-valued units get a sensible floor per rarity. Anything that already has
// a real value is left alone (see appliesDefaultValues()).
export const RARITY_VALUE_DEFAULTS = {
  Normie: { baseValue: 1, gems: 1, coins: 100 },
  Odds: { baseValue: 1, gems: 1, coins: 100 },
  Rares: { baseValue: 5, gems: 5, coins: 500 },
  Awesome: { baseValue: 50, gems: 50, coins: 5000 },
  // The brief listed "Awesome" twice (50 then 500). The rarity ladder after
  // Awesome is Legendary, so 500/500/50K is applied to Legendary.
  Legendaries: { baseValue: 500, gems: 500, coins: 50000 },
};

// WormBall keeps whatever value it already has.
export const VALUE_DEFAULTS_EXCLUDED_SLUGS = new Set(['wormball', 'shiny-wormball']);

const RARITY_ALIASES = {
  odd: 'Odds', odds: 'Odds',
  rare: 'Rares', rares: 'Rares',
  awesome: 'Awesome', awesomes: 'Awesome',
  legendary: 'Legendaries', legendaries: 'Legendaries', legendarys: 'Legendaries',
  normie: 'Normie', normies: 'Normie',
};

export function normalizeRarity(rarity) {
  const key = String(rarity || '').trim().toLowerCase();
  return RARITY_ALIASES[key] || (key.charAt(0).toUpperCase() + key.slice(1));
}

/** Only fill in rows whose value/gems/coins are all zero or missing. */
export function appliesDefaultValues(row) {
  if (!row) return false;
  const nums = [row.baseValue ?? row.base_value, row.gems, row.coins];
  return nums.every((value) => value === null || value === undefined || value === '' || Number(value) === 0);
}

export function defaultValuesFor(unit, row) {
  const slug = String(unit?.slug || '').toLowerCase();
  if (VALUE_DEFAULTS_EXCLUDED_SLUGS.has(slug)) return null;
  if (String(unit?.rarity || '').startsWith('Shiny')) return null; // shiny has its own market
  const tier = RARITY_VALUE_DEFAULTS[normalizeRarity(unit?.rarity)];
  if (!tier) return null;
  // Normie / Odds are set unconditionally (the brief asked for EVERY one).
  // Rares and above only when the row is still zero.
  const always = tier.baseValue <= 1;
  if (!always && !appliesDefaultValues(row)) return null;
  return { ...tier };
}

// ---- Price ranges -----------------------------------------------------------
const RANGE_FIELDS = {
  tradeValue: { min: 'tradeValue', max: 'tradeValueMax' },
  gems: { min: 'gems', max: 'gemsMax' },
  coins: { min: 'coins', max: 'coinsMax' },
};

/** Always returns {min,max,hasRange}; max is the conservative affordability number. */
export function priceRange(unit, mode = 'tradeValue') {
  const keys = RANGE_FIELDS[mode] || RANGE_FIELDS.tradeValue;
  const minRaw = Number(unit?.[keys.min]);
  const maxRaw = Number(unit?.[keys.max]);
  const min = Number.isFinite(minRaw) && minRaw > 0 ? minRaw : 0;
  const max = Number.isFinite(maxRaw) && maxRaw > min ? maxRaw : min;
  return { min, max, hasRange: max > min };
}

// ---- Shiny O/C ranking (highest -> lowest) ----------------------------------
// ">=" in the brief means a tie, so those units share a rank.
const norm = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');

const SHINY_OC_ORDER = [
  { rank: 1, names: ['Shiny Temple', 'shinytempleball'] },
  { rank: 2, names: ['Shiny CorruptMalware'] },
  { rank: 3, names: ['Shiny Zeus', 'shinyzeusball'] },
  { rank: 4, names: ['Shiny ShadowBall'] },
  { rank: 5, names: ['Shiny ShadowPrince'] },
  { rank: 6, names: ['Shiny Forest', 'Shiny FabledSurfer', 'Shiny GolemBall', 'shinyforestball'] },
  { rank: 7, names: ['Shiny OCO'] },
  { rank: 8, names: ['Shiny OMK', 'Shiny Wukong'] },
  { rank: 9, names: ['Shiny Mecha', 'shinymechaball'] },
  { rank: 10, names: ['Shiny TFO', 'Shiny TheFrozenOne'] },
  { rank: 11, names: ['Shiny Void', 'shinyvoidball'] },
  { rank: 12, names: ['Shiny Nightmare'] },
  { rank: 13, names: ['Shiny Puppet'] },
  { rank: 14, names: ['Shiny Showman'] },
  { rank: 15, names: ['Shiny Frutiger'] },
];

export function shinyOCRank(unit) {
  const haystack = `${norm(unit?.name)}|${norm(unit?.slug)}`;
  for (const entry of SHINY_OC_ORDER) {
    for (const alias of entry.names) {
      const key = norm(alias);
      if (key && haystack.includes(key)) return entry.rank;
    }
  }
  return Number.POSITIVE_INFINITY;
}

// ---- Relevancy sort ---------------------------------------------------------
export const RELEVANCY_PINNED = [
  { rank: 0, names: ['Scrooge', 'scroogeball'] },
  { rank: 1, names: ['Shiny Party Man', 'Shiny Partyman', 'shinypartyman'] },
  { rank: 2, names: ['Void', 'voidball'] },
  { rank: 3, names: ['Nightmare', 'nightmareball'] },
  { rank: 4, names: ['OCO', 'OverclockedOverlord', 'overclockedoverlord'] },
  { rank: 5, names: ['Reindeer', 'reindeerball'] },
  { rank: 6, names: ['Mecha', 'mechaball'] },
];

export function relevancyRank(unit) {
  const name = norm(unit?.name);
  const slug = norm(unit?.slug);
  for (const entry of RELEVANCY_PINNED) {
    for (const alias of entry.names) {
      const key = norm(alias);
      if (!key) continue;
      if (name === key || slug === key || name.startsWith(key) || slug.startsWith(key)) return entry.rank;
    }
  }
  return null;
}

// ---- Demand -----------------------------------------------------------------
/** Quantity-weighted average demand (0-100), or null when no demand data. */
export function averageDemandPercent(entries) {
  let sum = 0;
  let weight = 0;
  for (const entry of entries || []) {
    if (!entry || entry.kind === 'currency' || entry.missing) continue;
    const percent = DEMAND_PERCENT[entry.demand];
    if (!Number.isFinite(percent)) continue;
    const quantity = Math.max(1, Number(entry.quantity) || 1);
    sum += percent * quantity;
    weight += quantity;
  }
  return weight ? sum / weight : null;
}

export function demandVerdict(avgYou, avgThey) {
  if (avgYou === null || avgThey === null) return 'No demand data';
  const gap = avgThey - avgYou;
  if (Math.abs(gap) < 5) return 'Demand even';
  return gap > 0 ? 'Demand W for YOU' : 'Demand W for THEM';
}
