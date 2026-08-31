/**
 * Advanced Search — filters by rarity, value range, demand, scarcity, type
 */

export function advancedFilter(units, filters) {
  const { query, rarity, demand, scarcity, type, minValue, maxValue, sortBy } = filters;
  const q = (query || '').toLowerCase().trim();

  let filtered = units.filter(unit => {
    // Text search
    if (q) {
      const name = (unit.name || '').toLowerCase();
      const slug = (unit.slug || '').toLowerCase();
      const unitRarity = (unit.rarity || '').toLowerCase();
      if (!name.includes(q) && !slug.includes(q) && !unitRarity.includes(q)) return false;
    }

    // Rarity filter
    if (rarity && rarity !== 'all') {
      if (unit.rarity !== rarity) return false;
    }

    // Demand filter
    if (demand && demand !== 'all') {
      if (unit.demand !== demand) return false;
    }

    // Scarcity filter
    if (scarcity && scarcity !== 'all') {
      if (unit.scarcity !== scarcity) return false;
    }

    // Type filter
    if (type && type !== 'all') {
      if (unit.type !== type) return false;
    }

    // Value range filter
    const val = Number(unit.tradeValue) || 0;
    if (minValue && val < Number(minValue)) return false;
    if (maxValue && val > Number(maxValue)) return false;

    return true;
  });

  // Sort
  if (sortBy === 'value-desc') {
    filtered.sort((a, b) => (Number(b.tradeValue) || 0) - (Number(a.tradeValue) || 0));
  } else if (sortBy === 'value-asc') {
    filtered.sort((a, b) => (Number(a.tradeValue) || 0) - (Number(b.tradeValue) || 0));
  } else if (sortBy === 'name') {
    filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  } else if (sortBy === 'rarity') {
    const rarityOrder = ['Normie', 'Odds', 'Rares', 'Awesome', 'Legendaries', 'Mythics', 'Transcendents', 'Omegas'];
    filtered.sort((a, b) => rarityOrder.indexOf(a.rarity) - rarityOrder.indexOf(b.rarity));
  }

  return filtered;
}

export const FILTER_OPTIONS = {
  rarities: ['all', 'Normie', 'Shiny Normie', 'Odds', 'Shiny Odds', 'Rares', 'Shiny Rares', 'Awesome', 'Shiny Awesome', 'Legendaries', 'Shiny Legendaries', 'Mythics', 'Shiny Mythics', 'Transcendents', 'Shiny Transcendents', 'Omegas', 'Shiny Omegas'],
  demands: ['all', 'Abysmal', 'Extremely Low', 'Very Low', 'Low', 'Below Average', 'Slightly Below Average', 'Normal', 'Slightly Above Average', 'Above Average', 'High', 'Very High', 'Extremely High', 'Godly'],
  scarcities: ['all', 'Flooded', 'Common', 'Standard', 'Limited', 'Rare'],
  types: ['all', 'DPS', 'Economy', 'Support', 'Summoner'],
  sortOptions: [
    { value: 'value-desc', label: 'Value (High → Low)' },
    { value: 'value-asc', label: 'Value (Low → High)' },
    { value: 'name', label: 'Name (A-Z)' },
    { value: 'rarity', label: 'Rarity' },
  ],
};
