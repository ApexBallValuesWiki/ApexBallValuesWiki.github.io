import { TRAITS } from './taxonomy';
import { buildStub, mergeOverrides } from './placeholders';
import { slugify } from '../utils/slug';

// TRAIT SCHEMA: slug, name, description, effect, obtain
export const TRAIT_OVERRIDES = {
  // 'shiny': { description: '...', effect: '+X% stat bonus.' },
};

export const ALL_TRAITS = mergeOverrides(TRAITS.map((name) => buildStub(name)), TRAIT_OVERRIDES);

export function getTraitBySlug(slug) {
  return ALL_TRAITS.find((t) => t.slug === slugify(slug));
}