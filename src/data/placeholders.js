import { slugify } from '../utils/slug';

/**
 * Builds a placeholder ("stub") entry for any named thing (unit, item, map,
 * trait, skin) that hasn't been fully documented yet. This lets every nav
 * link and list page work immediately, while curated real data can override
 * any field later by matching on `slug`.
 */
export function buildStub(name, extra = {}) {
  return {
    slug: slugify(name),
    name,
    documented: false,
    ...extra,
  };
}

/** Turns a flat array of names into an array of stub entries. */
export function buildStubList(names, extraPerItem = {}) {
  return names.map((name) => buildStub(name, extraPerItem));
}

/**
 * Merges curated "override" data (real, researched/provided info) on top of
 * auto-generated stubs, matched by slug. Anything not overridden stays a
 * stub with documented:false so the UI can clearly flag it as pending.
 */
export function mergeOverrides(stubs, overridesBySlug) {
  return stubs.map((stub) => {
    const override = overridesBySlug[stub.slug];
    if (!override) return stub;
    return { ...stub, ...override, documented: true };
  });
}