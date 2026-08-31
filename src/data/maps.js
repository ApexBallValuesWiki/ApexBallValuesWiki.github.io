import { MAPS } from './taxonomy';
import { buildStub, mergeOverrides } from './placeholders';
import { slugify } from '../utils/slug';

// MAP SCHEMA: slug, name, description, difficulty, image, unlockRequirement
export const MAP_OVERRIDES = {
  // 'doodlemap': { description: '...', difficulty: 'Easy', unlockRequirement: 'Default' },
};

export const ALL_MAPS = mergeOverrides(MAPS.map((name) => buildStub(name)), MAP_OVERRIDES);

export function getMapBySlug(slug) {
  return ALL_MAPS.find((m) => m.slug === slugify(slug));
}