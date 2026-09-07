import { describe, it, expect } from 'vitest';
import { hashString, mulberry32, rngFromSeed, randInt, getUserSeed } from './minigameRandom';
import { buildChain, correctCall, eligiblePool as bonoPool, buildShareText } from './ballonomics';
import { PIXEL_STAGES, stagePoints, pickAnswer, eligiblePool as ballPool, buildShareText as ballingShare, applyWrongGuess } from './balling';
import { endlessConfig, pickEndlessPuzzle } from './bkEndless';
import { endlessBand, nextEndlessPair } from './ballonomics';

const UNITS = [
  { slug: 'a', name: 'A', kind: 'unit', hasValue: true, specialValue: null, tradeValue: 100, image_url: null },
  { slug: 'b', name: 'B', kind: 'unit', hasValue: true, specialValue: null, tradeValue: 250, image_url: null },
  { slug: 'c', name: 'C', kind: 'unit', hasValue: true, specialValue: null, tradeValue: 999, image_url: null },
  { slug: 'd', name: 'D', kind: 'unit', hasValue: true, specialValue: null, tradeValue: 50, image_url: null },
  { slug: 'e', name: 'E', kind: 'unit', hasValue: true, specialValue: null, tradeValue: 5000, image_url: null },
  { slug: 'f', name: 'F', kind: 'unit', hasValue: true, specialValue: 'O/C', tradeValue: null, image_url: null },
  { slug: 'g', name: 'G', kind: 'item', hasValue: true, specialValue: null, tradeValue: 10, image_url: null },
  { slug: 'h', name: 'H', kind: 'unit', hasValue: false, specialValue: null, tradeValue: null, image_url: null },
];

describe('minigameRandom', () => {
  it('hashString is deterministic and seed-sensitive', () => {
    expect(hashString('apex')).toBe(hashString('apex'));
    expect(hashString('apex')).not.toBe(hashString('apex2'));
  });

  it('mulberry32 repeats its sequence for the same seed', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const seqA = Array.from({ length: 6 }, () => a());
    const seqB = Array.from({ length: 6 }, () => b());
    expect(seqA).toEqual(seqB);
    expect(new Set(seqA).size).toBeGreaterThan(1);
  });

  it('rngFromSeed yields values in [0,1)', () => {
    const rng = rngFromSeed('ballonomics-daily');
    for (let i = 0; i < 100; i += 1) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('randInt stays in range', () => {
    const rng = rngFromSeed('x');
    for (let i = 0; i < 200; i += 1) {
      const v = randInt(rng, 5);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(5);
      expect(Number.isInteger(v)).toBe(true);
    }
  });

  it('getUserSeed returns a stable string (storage-backed)', () => {
    const s1 = getUserSeed('apex-test-seed');
    const s2 = getUserSeed('apex-test-seed');
    expect(s1).toBe(s2);
    expect(typeof s1).toBe('string');
    expect(s1.length).toBeGreaterThan(0);
  });
});

describe('ballonomics logic', () => {
  it('eligiblePool keeps only units with exact numeric values', () => {
    const pool = bonoPool(UNITS);
    expect(pool.map((e) => e.slug)).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  it('buildChain is deterministic, distinct-neighboured and tie-free', () => {
    for (const seed of ['s1', 's2', '2026-09-02:u1']) {
      const chain = buildChain(bonoPool(UNITS), seed, 4);
      expect(chain).toHaveLength(4);
      expect(chain).toEqual(buildChain(bonoPool(UNITS), seed, 4));
      for (let i = 1; i < chain.length; i += 1) {
        expect(chain[i].slug).not.toBe(chain[i - 1].slug);
        expect(Number(chain[i].tradeValue)).not.toBe(Number(chain[i - 1].tradeValue));
      }
    }
  });

  it('buildChain caps at pool size and handles tiny pools', () => {
    expect(buildChain([UNITS[0]], 's', 4)).toEqual([]);
    expect(buildChain(bonoPool(UNITS), 's', 99).length).toBeLessThanOrEqual(5);
  });

  it('correctCall reports higher/lower correctly', () => {
    expect(correctCall({ tradeValue: 100 }, { tradeValue: 200 })).toBe('higher');
    expect(correctCall({ tradeValue: 900 }, { tradeValue: 200 })).toBe('lower');
    expect(correctCall({ tradeValue: 5 }, { tradeValue: 5 })).toBe(null);
  });

  it('share text renders the score grid', () => {
    const text = buildShareText({ dayKey: '2026-09-02', correct: 2, total: 4, streak: 3 });
    expect(text).toContain('Ballonomics 2026-09-02');
    expect(text).toContain('2/4');
    expect(text).toContain('🟩🟩🟥⬛');
    expect(text).toContain('Streak: 3');
  });
});

describe('balling logic', () => {
  const IMAGED = UNITS.map((u, i) => (i < 3 ? { ...u, image_url: 'data:image/webp;base64,AAA' } : u));

  it('eligiblePool keeps only units with data-URI art', () => {
    expect(ballPool(IMAGED).map((e) => e.slug)).toEqual(['a', 'b', 'c']);
  });

  it('PIXEL_STAGES is ascending and ends at full resolution', () => {
    expect(PIXEL_STAGES[0]).toBe(6);
    expect(PIXEL_STAGES[PIXEL_STAGES.length - 1]).toBe(0);
    for (let i = 1; i < PIXEL_STAGES.length - 1; i += 1) {
      expect(PIXEL_STAGES[i]).toBeGreaterThan(PIXEL_STAGES[i - 1]);
    }
  });

  it('stagePoints rewards early solves and never hits zero', () => {
    expect(stagePoints(0)).toBeGreaterThan(stagePoints(3));
    expect(stagePoints(PIXEL_STAGES.length - 1)).toBe(100);
    expect(stagePoints(999)).toBe(100);
    expect(stagePoints(-5)).toBe(stagePoints(0));
  });

  it('pickAnswer is deterministic per seed', () => {
    const pool = ballPool(IMAGED);
    expect(pickAnswer(pool, 'd1')?.slug).toBe(pickAnswer(pool, 'd1')?.slug);
    expect(pickAnswer([], 'd1')).toBe(null);
  });

  it('applyWrongGuess sharpens once per miss and loses at full resolution', () => {
    expect(applyWrongGuess(0)).toEqual({ stageIndex: 1, lost: false });
    expect(applyWrongGuess(3)).toEqual({ stageIndex: 4, lost: false });
    const last = PIXEL_STAGES.length - 1;
    expect(applyWrongGuess(last - 1)).toEqual({ stageIndex: last, lost: false });
    expect(applyWrongGuess(last)).toEqual({ stageIndex: last, lost: true });
    expect(applyWrongGuess(-3)).toEqual({ stageIndex: 1, lost: false });
    expect(applyWrongGuess(999)).toEqual({ stageIndex: last, lost: true });
  });

  it('share text includes the pixel size', () => {
    const text = ballingShare({ dayKey: '2026-09-02', solved: true, stageIndex: 2, guesses: 1, streak: 2 });
    expect(text).toContain('Solved at 13px');
    expect(text).toContain('Streak: 2');
  });
});

describe('ball knowledge endless', () => {
  it('trims guesses every 3 levels down to 1', () => {
    expect(endlessConfig(1).maxGuesses).toBe(6);
    expect(endlessConfig(3).maxGuesses).toBe(6);
    expect(endlessConfig(4).maxGuesses).toBe(5);
    expect(endlessConfig(10).maxGuesses).toBe(3);
    expect(endlessConfig(16).maxGuesses).toBe(1);
    expect(endlessConfig(99).maxGuesses).toBe(1);
  });

  it('trims detail clues on schedule', () => {
    expect(endlessConfig(1).showDps).toBe(true);
    expect(endlessConfig(7).showDps).toBe(false);
    expect(endlessConfig(9).showCostPerDps).toBe(true);
    expect(endlessConfig(10).showCostPerDps).toBe(false);
    expect(endlessConfig(12).showLevel).toBe(true);
    expect(endlessConfig(13).showLevel).toBe(false);
    expect(endlessConfig(15).oneClueOnly).toBe(false);
    expect(endlessConfig(16).oneClueOnly).toBe(true);
  });

  it('locks clues earlier as levels rise', () => {
    expect(endlessConfig(1).reveal.damage).toBe(3);
    expect(endlessConfig(7).reveal.damage).toBeGreaterThanOrEqual(5);
    expect(endlessConfig(1).reveal.damage).toBeLessThan(endlessConfig(10).reveal.damage);
  });

  it('pickEndlessPuzzle is deterministic and honors exclusions', () => {
    const cands = UNITS.filter((u) => u.kind === 'unit').map((u) => ({ unit: u }));
    const a = pickEndlessPuzzle(cands, 'seed', 1);
    const b = pickEndlessPuzzle(cands, 'seed', 1);
    expect(a).toBe(b);
    for (let i = 0; i < 20; i += 1) {
      const pick = pickEndlessPuzzle(cands, 's', i, ['a', 'b']);
      expect(['a', 'b']).not.toContain(pick.unit.slug);
    }
    expect(pickEndlessPuzzle([], 's', 1)).toBe(null);
  });
});

describe('ballonomics endless ramp', () => {
  const POOL = UNITS.filter((u) => u.kind === 'unit' && u.tradeValue);

  it('band tightens monotonically to the 1.15 floor', () => {
    expect(endlessBand(0)).toBe(4);
    let prev = endlessBand(0);
    for (let s = 1; s <= 60; s += 1) {
      const v = endlessBand(s);
      expect(v).toBeLessThanOrEqual(prev + 1e-12);
      expect(v).toBeGreaterThanOrEqual(1.15);
      prev = v;
    }
    expect(endlessBand(500)).toBe(1.15);
  });

  it('nextEndlessPair is deterministic, distinct and tie-free', () => {
    const prev = POOL[0];
    const a = nextEndlessPair(POOL, 'seed', 0, prev);
    const b = nextEndlessPair(POOL, 'seed', 0, prev);
    expect(a).toBe(b);
    expect(a.slug).not.toBe(prev.slug);
    expect(Number(a.tradeValue)).not.toBe(Number(prev.tradeValue));
    expect(nextEndlessPair(POOL, 's', 0, null)).toBe(null);
  });

  it('nextEndlessPair respects the band when the pool allows', () => {
    const prev = { slug: 'x', tradeValue: 1000 };
    const pool = [
      prev,
      { slug: 'close1', tradeValue: 1050 },
      { slug: 'close2', tradeValue: 980 },
      { slug: 'far', tradeValue: 500000 },
    ];
    for (let s = 0; s < 30; s += 1) {
      const pick = nextEndlessPair(pool, 'seed', s, prev);
      expect(['close1', 'close2']).toContain(pick.slug);
    }
  });
});

describe('balling capped budget', () => {
  it('default cap keeps the classic 10-mistake behavior', () => {
    expect(applyWrongGuess(0)).toEqual({ stageIndex: 1, lost: false });
    const last = PIXEL_STAGES.length - 1;
    expect(applyWrongGuess(last)).toEqual({ stageIndex: last, lost: true });
  });

  it('a lower cap ends the run sooner', () => {
    expect(applyWrongGuess(0, 2)).toEqual({ stageIndex: 1, lost: false });
    expect(applyWrongGuess(1, 2)).toEqual({ stageIndex: 2, lost: false });
    expect(applyWrongGuess(2, 2)).toEqual({ stageIndex: 2, lost: true });
  });
});
