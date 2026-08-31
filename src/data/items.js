import { ITEM_CONSUMABLES, ITEM_MATERIALS, ITEM_CURRENCIES, ITEM_CRATES } from './taxonomy';
import { buildStub, mergeOverrides } from './placeholders';
import { slugify } from '../utils/slug';

// ============================================================================
// ITEMS DATABASE — Consumables, Materials, Currencies, Crates
// Same override pattern as units.js: fill ITEM_OVERRIDES keyed by slug(name).
// ITEM SCHEMA: slug, name, group, description, obtain, effect, baseValue
// ============================================================================

export const ITEM_OVERRIDES = {
  // 'frost-key': {
  //   description: 'Unlocks the Frozen Crate.',
  //   obtain: { method: 'Purchase', source: 'Shop', dropRate: null, notes: '' },
  //   effect: 'Opens 1 Frozen Crate.',
  //   baseValue: 0,
  // },
};

function buildGroup(names, group) {
  const stubs = names.map((name) => buildStub(name, { group }));
  return mergeOverrides(stubs, ITEM_OVERRIDES);
}

export const CONSUMABLES = buildGroup(ITEM_CONSUMABLES, 'Consumables');
export const MATERIALS = buildGroup(ITEM_MATERIALS, 'Materials');
export const CURRENCIES = buildGroup(ITEM_CURRENCIES, 'Currencies');
export const CRATES = buildGroup(ITEM_CRATES, 'Crates');

export const ITEM_GROUPS = {
  Consumables: CONSUMABLES,
  Materials: MATERIALS,
  Currencies: CURRENCIES,
  Crates: CRATES,
};

export const ALL_ITEMS = Object.values(ITEM_GROUPS).flat();

export function getItemBySlug(slug) {
  return ALL_ITEMS.find((i) => i.slug === slugify(slug));
}