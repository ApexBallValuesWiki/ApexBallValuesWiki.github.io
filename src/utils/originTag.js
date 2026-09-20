// ============================================================================
// Origin tags — small badges showing where a unit comes from (Seasonal,
// Exclusive, Unobtainable, Event). Derived from the unit's category data;
// wikiOverrides can set/override `category` per unit.
// ============================================================================

const TAG_STYLE = {
  Seasonal: { icon: '❄️', color: '#7cd4ff' },
  Exclusive: { icon: '💎', color: '#c04dff' },
  Unobtainable: { icon: '🚫', color: '#ff5c5c' },
  Event: { icon: '🎉', color: '#ffd24d' },
  Limited: { icon: '⏳', color: '#ff9d3b' },
};

/**
 * Resolve the origin tag for a unit/entity object.
 * Returns { label, icon, color } or null for Standard units.
 *   originTag({ categories: ['Seasonal'] })  ->  { label: 'Seasonal', ... }
 */
export function originTag(entity) {
  if (!entity) return null;
  const cats = Array.isArray(entity.categories) && entity.categories.length
    ? entity.categories
    : entity.category
      ? [entity.category]
      : [];
  const hit = cats.find((c) => c && c !== 'Standard' && TAG_STYLE[c]);
  if (!hit) return null;
  return { label: hit, ...TAG_STYLE[hit] };
}
