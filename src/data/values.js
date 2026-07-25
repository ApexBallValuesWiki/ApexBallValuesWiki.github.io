import { computeTradeValue } from '../utils/calculator';
import { ALL_UNITS } from './units';
import { CONSUMABLES, ALL_ITEMS } from './items';
import { GENERATED_VALUE_OVERRIDES } from './generated/units.generated';
import { loadLocalValueOverrides } from '../utils/localOverrides';
import staticOverridesJson from './overrides/staticOverrides.json';

// ============================================================================
// VALUES DATABASE
// ----------------------------------------------------------------------------
// Holds market data used by both the Values pages and the Trade Calculator:
//   baseValue     - community-set base value (from real trades/market data)
//   demand        - one of DEMAND labels (taxonomy.js)
//   scarcity      - one of SCARCITY labels (taxonomy.js)
//   trend         - 'rising' | 'falling' | 'stable' (optional, for UI arrows)
//
// tradeValue is DERIVED, never hand-entered: it always comes from
// computeTradeValue(baseValue, demand, scarcity) so the formula stays the
// single source of truth site-wide.
//
// NOTE: Per current instruction, every unit's baseValue is set to 1 as a
// placeholder (see GENERATED_VALUE_OVERRIDES, built from the stat sheet).
// Replace individual entries in VALUE_OVERRIDES below once real trade/market
// data is available for a unit — it takes priority over the generated 1s.
// ============================================================================

export const VALUE_OVERRIDES = {
  // 'example-unit': { baseValue: 5000, demand: 'High', scarcity: 'Limited', trend: 'rising' },
};

// Temporary open /admin editor support: browser-local overrides are loaded at
// startup. They let anyone test value changes without code access, but they are
// local to that browser until we add a real backend/admin database.
const LOCAL_VALUE_OVERRIDES = loadLocalValueOverrides();

function withComputedValue(entry) {
  const staticOver = staticOverridesJson?.valueOverrides?.[entry.slug];
  const data = LOCAL_VALUE_OVERRIDES[entry.slug] || staticOver || VALUE_OVERRIDES[entry.slug] || GENERATED_VALUE_OVERRIDES[entry.slug];
  if (!data) {
    return {
      ...entry,
      baseValue: null,
      gems: null,
      coins: null,
      demand: null,
      scarcity: null,
      tradeValue: null,
      hasValue: false,
    };
  }
  const tradeValue = computeTradeValue(data.baseValue, data.demand, data.scarcity);
  // Gems/Coins aren't in the source stat sheet yet (all N/A) — default to the
  // same placeholder of 1 unless a real value has been set via overrides.
  const rawGems = data.gems ?? 1;
  const rawCoins = data.coins ?? 1;
  const gems = computeTradeValue(rawGems, data.demand, data.scarcity);
  const coins = computeTradeValue(rawCoins, data.demand, data.scarcity);
  return { ...entry, ...data, gems, coins, tradeValue, hasValue: true };
}

export const UNIT_VALUES = ALL_UNITS.map(withComputedValue);
export const CONSUMABLE_VALUES = ALL_ITEMS.map(withComputedValue);

export function getUnitValueBySlug(slug) {
  return UNIT_VALUES.find((u) => u.slug === slug);
}

// ============================================================================
// SHARED VALUE INDEX — single source of truth for anything that has (or will
// have) a market value: units + items today, more categories later. This is
// what the Trade Calculator (and anything else that needs to "pick an item
// with a value") should read from, so a value/demand/scarcity update here
// automatically shows up everywhere, including the calculator.
// ============================================================================
export const ALL_VALUE_ENTRIES = [
  ...UNIT_VALUES.map((u) => ({ ...u, kind: 'unit' })),
  ...CONSUMABLE_VALUES.map((c) => ({ ...c, kind: 'item' })),
];

export function getValueEntryBySlug(slug) {
  return ALL_VALUE_ENTRIES.find((e) => e.slug === slug);
}

export function searchValueEntries(query, { onlyWithValue = true } = {}) {
  const q = query.trim().toLowerCase();
  const pool = onlyWithValue ? ALL_VALUE_ENTRIES.filter((e) => e.hasValue) : ALL_VALUE_ENTRIES;
  if (!q) return pool;
  return pool.filter((e) => e.name.toLowerCase().includes(q));
}