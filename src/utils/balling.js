// BALLING — pure game logic (pixel-reveal unit identification). The picture
// sharpens per WRONG GUESS (no timer); art is real unit imagery (data URIs).

import { rngFromSeed, randInt } from './minigameRandom';

/** Canvas pixel sizes over time; 0 = full resolution. Lower index = harder. */
export const PIXEL_STAGES = [6, 9, 13, 19, 27, 39, 56, 80, 120, 0];

/** A wrong guess advances the pixel stage; this maps a wrong guess at
 *  `stageIndex` to the next state. A wrong guess at the cap stage loses the
 *  run — pixels are your lives. `capIndex` shrinks the budget: Quick Play
 *  lowers it as the solve streak grows, so runs get progressively harder. */
export function applyWrongGuess(stageIndex, capIndex = PIXEL_STAGES.length - 1) {
  const last = PIXEL_STAGES.length - 1;
  const i = Math.max(0, Math.min(stageIndex, last));
  const cap = Math.max(0, Math.min(capIndex, last));
  if (i >= cap) return { stageIndex: i, lost: true };
  return { stageIndex: Math.min(i + 1, cap), lost: false };
}

/** Entries eligible as answers: units that have real art as a data URI
 *  (data URIs never taint the pixelation canvas). The pipeline exposes the
 *  art as either image_url or imageUrl depending on the override source —
 *  normalized here so the component only ever reads image_url. */
export function eligiblePool(allValueEntries) {
  return (allValueEntries || [])
    .filter(
      (entry) => entry.kind === 'unit'
        && typeof (entry.image_url || entry.imageUrl) === 'string'
        && (entry.image_url || entry.imageUrl).startsWith('data:')
    )
    .map((entry) => ({ ...entry, image_url: entry.image_url || entry.imageUrl }));
}

/** Daily answer, deterministic per seed. */
export function pickAnswer(pool, seed) {
  if (!pool || pool.length === 0) return null;
  return pool[randInt(rngFromSeed(seed), pool.length)];
}

/** Points for a solve: earlier = more (full-reveal solve still scores 100). */
export function stagePoints(stageIndex) {
  const i = Math.max(0, Math.min(stageIndex, PIXEL_STAGES.length - 1));
  return (PIXEL_STAGES.length - i) * 100;
}

export function defaultStats() {
  return { played: 0, solved: 0, currentStreak: 0, maxStreak: 0, bestPoints: 0, lastSolvedDay: null };
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
    // ignore blocked storage
  }
}

export function defaultProgress() {
  return { solved: false, lost: false, guesses: [], stageIndex: null, startTime: Date.now() };
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

/** Share text, Ball Knowledge style. */
export function buildShareText({ dayKey, solved, stageIndex, guesses, streak }) {
  const px = PIXEL_STAGES[stageIndex] || 'full';
  return [
    `Balling ${dayKey} — pixel reveal`,
    solved ? `Solved at ${px}px after ${guesses} ${guesses === 1 ? 'guess' : 'guesses'}` : 'Failed to spot it',
    solved ? '🎯'.repeat(Math.max(1, PIXEL_STAGES.length - stageIndex)) : '🟥',
    `Streak: ${streak}`,
    'apex-values.github.io',
  ].join('\n');
}
