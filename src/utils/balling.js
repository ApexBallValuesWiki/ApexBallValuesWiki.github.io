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
/** Same normalization the guess box uses, kept here so pure logic and UI agree.
 *  A leading "Shiny" is dropped: data rows spell the same unit both ways, and
 *  players often type the shiny name when the render looks shiny. */
export function normalizeBallingName(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/^shiny[\s:_-]+/, '')
    .replace(/\s+/g, ' ');
}

/** Punctuation/spacing-insensitive comparison key for hand-typed guesses. */
export function ballingNameKey(value) {
  return normalizeBallingName(value).replace(/[^a-z0-9]/g, '');
}

/** Every spelling that should resolve to this unit when typed by hand. */
export function ballingNameAliases(entry) {
  const keys = new Set();
  const add = (v) => { if (v) keys.add(v); };
  const name = String(entry?.name ?? '');
  const slug = String(entry?.slug ?? '');
  add(normalizeBallingName(name));
  add(ballingNameKey(name));
  add(normalizeBallingName(slug.replace(/-/g, ' ')));
  add(ballingNameKey(slug));
  return [...keys];
}

function isShinyEntry(entry) {
  return /^shiny-/i.test(entry?.slug || '') || /\bshiny\b/i.test(entry?.rarity || '');
}

export function eligiblePool(allValueEntries) {
  const withArt = (allValueEntries || [])
    .filter(
      (entry) => entry.kind === 'unit'
        && typeof (entry.image_url || entry.imageUrl) === 'string'
        && (entry.image_url || entry.imageUrl).startsWith('data:')
    )
    .map((entry) => ({ ...entry, image_url: entry.image_url || entry.imageUrl }));

  // ONE answer per unique artwork. The WIKI data has shiny rows that reuse the
  // normal unit's render AND its name (a known data bug): both would show the
  // exact same picture and the exact same label. If the shiny one was picked,
  // no guess could ever match it because the name lookup resolves to the first
  // (normal) row. Prefer the non-shiny row whenever art is shared.
  const byImage = new Map();
  for (const entry of withArt) {
    const current = byImage.get(entry.image_url);
    if (!current || (isShinyEntry(current) && !isShinyEntry(entry))) {
      byImage.set(entry.image_url, entry);
    }
  }
  return [...byImage.values()];
}

/** Group entries by display name. Some normal/shiny pairs still have distinct
 *  art but the same name, so typing that name must match every variant. */
export function buildGuessGroups(pool) {
  const groups = new Map();
  for (const entry of pool || []) {
    const key = ballingNameKey(entry.name);
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, { name: entry.name, slugs: new Set(), entries: [] });
    const group = groups.get(key);
    group.slugs.add(entry.slug);
    group.entries.push(entry);
  }
  return groups;
}

/** A guess counts when it points at the answer, at a name-alias of the answer,
 *  or at any entry sharing the answer's exact artwork. */
export function isCorrectGuess(match, answer, groups) {
  if (!match || !answer) return false;
  if (match.slug === answer.slug) return true;
  if (match.image_url && match.image_url === answer.image_url) return true;
  const group = groups?.get(ballingNameKey(match.name));
  return Boolean(group?.slugs.has(answer.slug));
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
