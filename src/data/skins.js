import { SKIN_CATEGORIES, SKINS } from './taxonomy';
import { buildStub, mergeOverrides } from './placeholders';
import { slugify } from '../utils/slug';

// SKIN SCHEMA: slug, name, category, shiny (bool), description, obtain, image
export const SKIN_OVERRIDES = {
  // 'alaballster': { description: '...', obtain: { method: 'Crate', source: 'Rock Crate' } },
};

function buildSkinCategory(category, shiny) {
  const names = SKINS[category] || [];
  const prefix = shiny ? 'shiny-' : '';
  const stubs = names.map((name) =>
    buildStub(name, { category, shiny, slugOverride: `${prefix}${slugify(name)}` })
  );
  // apply slugOverride so shiny/non-shiny variants of the same name don't collide
  const withSlugs = stubs.map((s) => ({ ...s, slug: s.slugOverride }));
  return mergeOverrides(withSlugs, SKIN_OVERRIDES);
}

export const SKINS_BY_CATEGORY = Object.fromEntries(
  SKIN_CATEGORIES.map((cat) => [cat, buildSkinCategory(cat, false)])
);

export const SHINY_SKINS_BY_CATEGORY = Object.fromEntries(
  SKIN_CATEGORIES.map((cat) => [cat, buildSkinCategory(cat, true)])
);

export const ALL_SKINS = Object.values(SKINS_BY_CATEGORY).flat();
export const ALL_SHINY_SKINS = Object.values(SHINY_SKINS_BY_CATEGORY).flat();

export function getSkinBySlug(slug, shiny = false) {
  const list = shiny ? ALL_SHINY_SKINS : ALL_SKINS;
  return list.find((s) => s.slug === slug);
}