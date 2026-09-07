// BALLONOMICS — pure game logic (higher-or-lower value chain).
// The component owns rendering; everything deterministic lives here so it is
// unit-testable. Values always come from the live values database — nothing
// is invented.

import { rngFromSeed, randInt } from './minigameRandom';

/** Entries eligible for comparisons: real units with an exact numeric value
 *  (O/C and N/A specials have no number to compare). */
export function eligiblePool(allValueEntries) {
  return (allValueEntries || []).filter(
    (entry) => entry.kind === 'unit' && entry.hasValue && !entry.specialValue && Number(entry.tradeValue) > 0
  );
}

/** Build a seeded chain of `count` distinct units with no equal-value
 *  neighbours (ties would make the answer undefined). Deterministic per seed. */
export function buildChain(pool, seed, count = 10) {
  if (!pool || pool.length < 2) return [];
  const rng = rngFromSeed(seed);
  const chain = [];
  let guard = 0;
  while (chain.length < Math.min(count, pool.length) && guard < count * 40) {
    guard += 1;
    const candidate = pool[randInt(rng, pool.length)];
    const previous = chain[chain.length - 1];
    if (previous && (candidate.slug === previous.slug || Number(candidate.tradeValue) === Number(previous.tradeValue))) {
      continue;
    }
    chain.push(candidate);
  }
  return chain;
}

/** The correct call for a round: is the right card higher or lower? */
export function correctCall(left, right) {
  const l = Number(left.tradeValue);
  const r = Number(right.tradeValue);
  if (l === r) return null; // excluded by buildChain, kept for safety
  return r > l ? 'higher' : 'lower';
}

/** Persistent stats shape + merge helper. */
export function defaultStats() {
  return { played: 0, dailyBest: 0, endlessBest: 0, currentStreak: 0, maxStreak: 0, lastSolvedDay: null };
}

export function loadStats(storageKey) {
  try {
    const raw = localStorage.getItem(storageKey);
    return raw ? { ...defaultStats(), ...JSON.parse(raw) } : defaultStats();
  } catch {
    return defaultStats();
  }
}

export function saveStats(storageKey, stats) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(stats));
  } catch {
    // storage may be blocked — the run still works, just not persisted
  }
}

/** Daily run progress stored per day key. */
export function defaultProgress() {
  return { calls: [], done: false, lost: false };
}

export function loadProgress(storageKey) {
  try {
    const raw = localStorage.getItem(storageKey);
    return raw ? { ...defaultProgress(), ...JSON.parse(raw) } : defaultProgress();
  } catch {
    return defaultProgress();
  }
}

export function saveProgress(storageKey, progress) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(progress));
  } catch {
    // ignore blocked storage
  }
}

// Endless difficulty ramp
// As the chain grows, the next unit is drawn from a shrinking value band
// around the current one, so calls get progressively harder.

/** Value-ratio band for a given streak (starts at 4x, floors at 1.15x). */
export function endlessBand(streak) {
  return Math.max(1.15, 4 * Math.pow(0.96, Math.max(0, streak)));
}

/** Pick the next endless unit: deterministic, never the previous unit, never
 *  an exact value tie, and within the streak's band when the pool allows. */
export function nextEndlessPair(pool, seed, streak, previous) {
  if (!pool || pool.length < 2 || !previous) return null;
  const band = endlessBand(streak);
  const prevVal = Number(previous.tradeValue) || 1;
  const rng = rngFromSeed(`${seed}:${streak}:${previous.slug}`);
  const distinct = pool.filter((e) => e.slug !== previous.slug && Number(e.tradeValue) !== prevVal);
  const near = distinct.filter((e) => {
    const r = Number(e.tradeValue) / prevVal;
    return r > 1 / band && r < band;
  });
  const source = near.length >= 2 ? near : distinct;
  if (!source.length) return null;
  return source[randInt(rng, source.length)];
}

/** Share text, Ball Knowledge style. */
export function buildShareText({ dayKey, correct, total, streak }) {
  const blocks = Array.from({ length: total }, (_, i) => (i < correct ? '🟩' : i === correct ? '🟥' : '⬛')).join('');
  return [
    `Ballonomics ${dayKey} — higher or lower`,
    `${correct}/${total}`,
    blocks,
    `Streak: ${streak}`,
    'apex-values.github.io',
  ].join('\n');
}
