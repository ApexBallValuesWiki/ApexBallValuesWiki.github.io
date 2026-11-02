import { isSpecialBaseValue, valueRowToForm } from './adminForms';

// The spreadsheet uses the same raw (not derived trade) values as the form.
export function makeSpreadsheetRow(unit, row) {
  const form = valueRowToForm(row, unit.slug);
  return {
    slug: unit.slug,
    name: unit.name,
    rarity: unit.rarity,
    imageUrl: unit.imageUrl || unit.image_url || null,
    base_value: form.baseValue,
    base_value_max: form.baseValueMax,
    gems: form.gems,
    gems_max: form.gemsMax,
    coins: form.coins,
    coins_max: form.coinsMax,
    demand: form.demand,
    scarcity: form.scarcity,
    trend: form.trend,
    notes: form.notes,
  };
}

const NUMERIC_FIELDS = new Set(['base_value', 'base_value_max', 'gems', 'gems_max', 'coins', 'coins_max']);
const SPECIAL_FIELDS = new Set(['base_value', 'gems', 'coins']);
const ALIASES = { base_value: 'baseValue', base_value_max: 'baseValueMax', gems_max: 'gemsMax', coins_max: 'coinsMax' };
const TEXT_FIELDS = new Set(['demand', 'scarcity', 'trend', 'notes']);

function parseSheetNumber(raw, field) {
  if (raw === '' || raw == null) return null;
  const special = isSpecialBaseValue(raw);
  if (special && SPECIAL_FIELDS.has(field)) return special;
  const text = String(raw).trim();
  // Commas are allowed only as thousands separators; malformed input must
  // never silently turn into a different number.
  const match = text.match(/^((?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?)([kmb])?$/i);
  if (!match) throw new Error(`Invalid ${field.replaceAll('_', ' ')}: ${String(raw)}. Enter a non-negative number${SPECIAL_FIELDS.has(field) ? ', O/C or N/A' : ''}.`);
  const scale = { k: 1e3, m: 1e6, b: 1e9 }[match[2]?.toLowerCase()] || 1;
  const result = Number(match[1].replace(/,/g, '')) * scale;
  if (!Number.isFinite(result)) throw new Error(`The ${field.replaceAll('_', ' ')} is too large.`);
  return result;
}

// Serialize ONLY specified columns. Server-side merge preserves all other
// fields (including notes and legacy fields), so bulk editing never resets them.
export function makeSpreadsheetPatch(changes) {
  const patch = {};
  for (const [key, value] of Object.entries(changes || {})) {
    if (NUMERIC_FIELDS.has(key)) {
      const parsed = parseSheetNumber(value, key);
      patch[key] = parsed;
      if (ALIASES[key]) patch[ALIASES[key]] = parsed;
    } else if (TEXT_FIELDS.has(key)) {
      patch[key] = String(value ?? '');
    }
  }
  return patch;
}

// Used only when the shared database has no row: seed all fields so the
// existing form defaults are not replaced by a sparse, misleading live row.
export function makeSpreadsheetInitialRow(form) {
  return makeSpreadsheetPatch(Object.fromEntries(
    [...NUMERIC_FIELDS, ...TEXT_FIELDS].map((key) => [key, form[key]])
  ));
}
