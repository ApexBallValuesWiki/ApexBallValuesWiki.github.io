import { describe, it, expect } from 'vitest';
import {
  eligiblePool,
  buildGuessGroups,
  isCorrectGuess,
  normalizeBallingName,
  ballingNameKey,
  ballingNameAliases,
  pickAnswer,
} from './balling';

const ART_NORMAL = 'data:image/webp;base64,NORMAL';
const ART_SHINY = 'data:image/webp;base64,SHINY';

const entry = (slug, name, image_url, rarity = 'Omegas') => ({
  slug, name, image_url, imageUrl: image_url, rarity, kind: 'unit',
});

describe('balling — duplicate shiny artwork / duplicate names', () => {
  // Reproduces the reported data bug: a shiny row reusing the normal unit's
  // name AND render. Before the fix both were valid answers, so a correct
  // guess resolved to the normal slug and was always marked wrong.
  const broken = [
    entry('crusherball', 'CrusherBall', ART_NORMAL, 'Legendaries'),
    entry('shiny-crusherball', 'CrusherBall', ART_NORMAL, 'Shiny Legendaries'),
    entry('laser', 'LaserMiniGunner (LMG)', ART_SHINY, 'Transcendents'),
  ];

  it('keeps exactly one answer per artwork and prefers the non-shiny row', () => {
    const pool = eligiblePool(broken);
    expect(pool).toHaveLength(2);
    expect(pool.map((e) => e.slug)).toEqual(['crusherball', 'laser']);
    expect(pool[0].name).toBe('CrusherBall');
  });

  it('never picks a shiny answer whose art is shared with a normal unit', () => {
    for (let i = 0; i < 40; i += 1) {
      const answer = pickAnswer(eligiblePool(broken), `seed-${i}`);
      expect(answer.slug).not.toBe('shiny-crusherball');
    }
  });

  it('keeps shiny units that do have their own distinct art', () => {
    const pool = eligiblePool([
      entry('a', 'A', ART_NORMAL),
      entry('shiny-a', 'Shiny A', ART_SHINY, 'Shiny Omegas'),
    ]);
    expect(pool.map((e) => e.slug)).toEqual(['a', 'shiny-a']);
  });

  it('accepts a typed name when the answer is a same-name variant', () => {
    const groups = buildGuessGroups(broken);
    expect(normalizeBallingName('  CRUSHERBALL  ')).toBe('crusherball');
    expect(isCorrectGuess(broken[0], broken[1], groups)).toBe(true);
    expect(isCorrectGuess(broken[1], broken[0], groups)).toBe(true);
    expect(isCorrectGuess(broken[0], broken[2], groups)).toBe(false);
  });

  it('accepts the exact slug and rejects an unrelated unit', () => {
    const groups = buildGuessGroups(broken);
    expect(isCorrectGuess(broken[0], broken[0], groups)).toBe(true);
    expect(isCorrectGuess(broken[2], broken[0], groups)).toBe(false);
  });

  it('ignores entries without data-URI art and non-unit entries', () => {
    const pool = eligiblePool([
      entry('a', 'A', ART_NORMAL),
      { slug: 'b', name: 'B', kind: 'unit', image_url: '/images/b.png' },
      { slug: 'c', name: 'C', kind: 'item', image_url: ART_SHINY },
    ]);
    expect(pool.map((e) => e.slug)).toEqual(['a']);
  });
});

describe('balling — forgiving typed names', () => {
  const normal = entry('crusherball', 'CrusherBall', ART_NORMAL, 'Legendaries');
  const shiny = entry('shiny-crusherball', 'CrusherBall', ART_SHINY, 'Shiny Legendaries');
  const groups = buildGuessGroups([normal, shiny]);

  it('normalizes a typed "Shiny" prefix and punctuation', () => {
    expect(normalizeBallingName('  Shiny  CrusherBall  ')).toBe('crusherball');
    expect(ballingNameKey('Crusher Ball (CB)')).toBe('crusherballcb');
    expect(ballingNameAliases(normal)).toContain('crusherball');
  });

  it('groups names that differ only by spacing or punctuation', () => {
    const g = buildGuessGroups([
      entry('a', 'Crusher Ball', ART_NORMAL),
      entry('b', 'CrusherBall', ART_SHINY),
    ]);
    expect(isCorrectGuess(entry('a', 'Crusher Ball', ART_NORMAL), { slug: 'b' }, g)).toBe(true);
  });

  it('still treats a same-name pair as aliases', () => {
    expect(isCorrectGuess(normal, shiny, groups)).toBe(true);
  });
});
