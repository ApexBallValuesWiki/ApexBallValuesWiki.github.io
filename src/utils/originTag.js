// ============================================================================
// Origin tags — small badges showing where a unit comes from (Seasonal,
// Exclusive, Unobtainable, Limited). "Normal" is the default tag for every
// unit. The admin Tag dropdown writes `category`; wikiOverrides can override
// it per unit. The scalar `category` wins over the static `categories` array
// so admin edits always display on the cards.
// ============================================================================

export const UNIT_TAGS = ['Normal', 'Seasonal', 'Exclusive', 'Unobtainable', 'Limited'];

const TAG_STYLE = {
  Normal: { color: '#a7b0bd' },
  Seasonal: { color: '#7cd4ff' },
  Exclusive: { color: '#c04dff' },
  Unobtainable: { color: '#ff5c5c' },
  Limited: { color: '#ff9d3b' },
};

/**
 * Resolve the origin tag for a unit/entity object. Always returns
 * { label, color } — units without a special category get "Normal".
 *   originTag({ category: 'Seasonal' })  ->  { label: 'Seasonal', ... }
 *   originTag({})                        ->  { label: 'Normal', ... }
 */
export function originTag(entity) {
  if (!entity) return { label: 'Normal', color: TAG_STYLE.Normal.color };
  const cats = typeof entity.category === 'string' && entity.category.trim()
    ? [entity.category.trim()]
    : Array.isArray(entity.categories) && entity.categories.length
      ? entity.categories
      : [];
  const hit = cats.find((c) => c && c !== 'Standard' && TAG_STYLE[c]);
  const label = hit || 'Normal';
  return { label, color: TAG_STYLE[label].color };
}

/**
 * Map any stored category value onto the current tag list. Legacy values
 * ('Standard', removed tags like 'Event') and blanks become 'Normal'.
 */
export function normalizeUnitTag(value) {
  const clean = typeof value === 'string' ? value.trim() : '';
  return TAG_STYLE[clean] && clean !== 'Standard' ? clean : 'Normal';
}
