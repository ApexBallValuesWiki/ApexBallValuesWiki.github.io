// Shared seeded-RNG helpers for the minigames (Ballonomics, Balling).
// Pure functions so puzzle generation is unit-testable and deterministic:
// the same seed always produces the same run.

/** CypherString-style 2-lane string hash (same algorithm as Ball Knowledge). */
export function hashString(value) {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < value.length; i += 1) {
    const ch = value.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334647);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

/** mulberry32 — small, fast, well-distributed seeded PRNG. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Seeded RNG from an arbitrary string seed. */
export function rngFromSeed(seed) {
  return mulberry32(hashString(String(seed)) % 4294967296);
}

/** Random integer in [0, max) from a rng function. */
export function randInt(rng, max) {
  return Math.floor(rng() * Math.max(1, max));
}

/** A per-browser random seed (created once, stored) so daily puzzles are
 *  personalized like Ball Knowledge's. */
export function getUserSeed(storageKey) {
  try {
    let seed = localStorage.getItem(storageKey);
    if (!seed) {
      seed = crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(storageKey, seed);
    }
    return seed;
  } catch {
    return 'no-storage-user';
  }
}
