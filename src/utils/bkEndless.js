// BALL KNOWLEDGE ENDLESS — pure logic for the endless chain mode.
// Each level is a fresh puzzle; every few levels the game TRIMS details:
// fewer guesses, clues lock earlier, then DPS / cost-per-DPS / level label
// disappear, until only the upgrade name remains with a single guess.

import { hashString } from './minigameRandom';

const ENDLESS_SALT = 'apex-bk-endless-v1';

/** Difficulty configuration for an endless level (1-based). */
export function endlessConfig(level) {
  const L = Math.max(1, Math.floor(Number(level) || 1));
  const tier = Math.floor((L - 1) / 3);
  return {
    level: L,
    maxGuesses: Math.max(1, 6 - tier),
    // "trim details" schedule
    showDps: L < 7,
    showCostPerDps: L < 10,
    showLevel: L < 13,
    oneClueOnly: L >= 16,
    // clues unlock after this many wrong guesses (98 = effectively never)
    reveal: {
      damage: Math.min(3 + tier, 98),
      range: Math.min(5 + tier, 98),
      cooldown: Math.min(7 + tier, 98),
      rarity: Math.min(10 + tier * 2, 98),
    },
  };
}

/** Deterministic puzzle for an endless level, avoiding previously used units
 *  when possible. Same seed + level + history = same puzzle. */
export function pickEndlessPuzzle(candidates, seed, level, excludeSlugs = []) {
  if (!candidates || !candidates.length) return null;
  const excluded = new Set(excludeSlugs);
  const pool = candidates.filter((c) => !excluded.has(c.unit.slug));
  const source = pool.length ? pool : candidates;
  const index = hashString(`${ENDLESS_SALT}:${seed}:${level}`) % source.length;
  return source[index];
}

/** Best-level persistence (localStorage mirror of the achievement stat). */
const BEST_KEY = 'apex-bk-endless-best';

export function loadBestLevel() {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0;
  }
}

export function saveBestLevel(level) {
  try {
    localStorage.setItem(BEST_KEY, String(level));
  } catch {
    // ignore blocked storage
  }
}
