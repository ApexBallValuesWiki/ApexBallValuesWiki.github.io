/**
 * Site-wide display-name corrections.
 *
 * Slugs, ids and database keys are intentionally untouched — only the human
 * readable `name` changes. Keep this in the data layer so WIKI cards, value
 * cards, search, the palette, the calculator, pre-rendered titles and the
 * "What can I afford?" page all agree.
 *
 * The rarity badge already says "SHINY …", so shiny variants drop the
 * redundant "Shiny " prefix.
 */
const NAME_OVERRIDES = {
  ShadowPrince: 'ShadowPrince (SP)',
  NightmareBall: 'NightmareBall (NM)',
  'Shiny NightmareBall': 'NightmareBall',
  'Shiny CorruptMalware': 'CorruptMalware',
  'Shiny ShadowPrince': 'ShadowPrince (SP)',
};

// Fallbacks for entries whose live/wiki name differs but whose slug is known.
const SLUG_OVERRIDES = {
  shadowprince: 'ShadowPrince (SP)',
  nightmareball: 'NightmareBall (NM)',
  'shiny-nightmareball': 'NightmareBall',
  corruptmalware: 'CorruptMalware',
  'shiny-corruptmalware': 'CorruptMalware',
};

export function unitDisplayName(unit) {
  if (!unit) return '';
  return SLUG_OVERRIDES[unit.slug] || NAME_OVERRIDES[unit.name] || unit.name || '';
}

/** Return a copy with the corrected name, or the same object if unchanged. */
export function withUnitDisplayName(unit) {
  if (!unit) return unit;
  const name = unitDisplayName(unit);
  if (!name || name === unit.name) return unit;
  return { ...unit, name };
}
