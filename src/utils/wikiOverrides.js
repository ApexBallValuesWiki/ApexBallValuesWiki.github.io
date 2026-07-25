import staticOverridesJson from '../data/overrides/staticOverrides.json';

function cleanEmpty(value) {
  return value === '' || value === null ? undefined : value;
}

export function rowToWikiCustomUnit(row) {
  if (!row?.slug || !row?.custom_unit) return null;
  const category = cleanEmpty(row.category) || 'Standard';
  return {
    slug: row.slug,
    name: cleanEmpty(row.name) || row.slug,
    rarity: cleanEmpty(row.rarity) || 'Normie',
    type: cleanEmpty(row.type) || 'DPS',
    rawType: cleanEmpty(row.raw_type) || cleanEmpty(row.type) || 'Unit',
    category,
    categories: [category],
    placementLimit: cleanEmpty(row.placement_limit),
    totalCost: cleanEmpty(row.total_cost),
    obtain: Array.isArray(row.obtain) ? row.obtain : [],
    passive: cleanEmpty(row.passive),
    ability: cleanEmpty(row.ability),
    synergy: cleanEmpty(row.synergy),
    minMaxStats: row.min_max_stats && typeof row.min_max_stats === 'object' ? row.min_max_stats : {},
    upgrades: Array.isArray(row.upgrades) ? row.upgrades : [],
    imageUrl: cleanEmpty(row.image_url),
    documented: true,
    unavailableData: false,
    customUnit: true,
    liveWikiOverride: true,
    wikiUpdatedAt: row.updated_at,
  };
}

export function rowToWikiOverride(row, slug) {
  const targetRow = row || (slug ? staticOverridesJson?.wikiOverrides?.[slug] : null);
  if (!targetRow) return null;
  return {
    name: cleanEmpty(targetRow.name),
    rarity: cleanEmpty(targetRow.rarity),
    imageUrl: cleanEmpty(targetRow.image_url),
    description: cleanEmpty(targetRow.description),
    type: cleanEmpty(targetRow.type),
    rawType: cleanEmpty(targetRow.raw_type),
    category: cleanEmpty(targetRow.category),
    placementLimit: cleanEmpty(targetRow.placement_limit),
    totalCost: cleanEmpty(targetRow.total_cost),
    customUnit: targetRow.custom_unit || undefined,
    earlyGameRank: targetRow.early_game_rank ?? undefined,
    lateGameRank: targetRow.late_game_rank ?? undefined,
    obtain: Array.isArray(targetRow.obtain) ? targetRow.obtain : undefined,
    passive: cleanEmpty(targetRow.passive),
    ability: cleanEmpty(targetRow.ability),
    synergy: cleanEmpty(targetRow.synergy),
    minMaxStats: targetRow.min_max_stats && typeof targetRow.min_max_stats === 'object' ? targetRow.min_max_stats : undefined,
    upgrades: Array.isArray(targetRow.upgrades) ? targetRow.upgrades : undefined,
    liveWikiOverride: true,
    wikiUpdatedAt: targetRow.updated_at,
  };
}

export function mergeWikiOverride(unit, override) {
  if (!unit || !override) return unit;
  const cleanOverride = Object.fromEntries(
    Object.entries(override).filter(([, value]) => value !== undefined)
  );
  return { ...unit, ...cleanOverride };
}
