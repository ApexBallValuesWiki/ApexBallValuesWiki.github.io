import { describe, it, expect } from 'vitest';
import { DEMAND_PERCENT } from '../data/taxonomy';
import {
  RARITY_VALUE_DEFAULTS, defaultValuesFor, appliesDefaultValues, priceRange,
  shinyOCRank, relevancyRank, averageDemandPercent, demandVerdict,
} from './valueRules';

describe('rarity value floors', () => {
  it('sets Normie / Odds / Rares / Awesome / Legendaries tiers', () => {
    expect(RARITY_VALUE_DEFAULTS.Normie).toEqual({ baseValue: 1, gems: 1, coins: 100 });
    expect(RARITY_VALUE_DEFAULTS.Odds).toEqual({ baseValue: 1, gems: 1, coins: 100 });
    expect(RARITY_VALUE_DEFAULTS.Rares).toEqual({ baseValue: 5, gems: 5, coins: 500 });
    expect(RARITY_VALUE_DEFAULTS.Awesome).toEqual({ baseValue: 50, gems: 50, coins: 5000 });
    expect(RARITY_VALUE_DEFAULTS.Legendaries).toEqual({ baseValue: 500, gems: 500, coins: 50000 });
  });
  it('never overwrites a real value, a shiny or WormBall', () => {
    expect(defaultValuesFor({ slug: 'rareball', rarity: 'Rares' }, { baseValue: 900, gems: 10, coins: 10 })).toBeNull();
    expect(defaultValuesFor({ slug: 'shiny-ball', rarity: 'Shiny Normie' }, { baseValue: 0, gems: 0, coins: 0 })).toBeNull();
    expect(defaultValuesFor({ slug: 'wormball', rarity: 'Odds' }, { baseValue: 0, gems: 0, coins: 0 })).toBeNull();
    expect(appliesDefaultValues({ baseValue: 0, gems: 0, coins: 0 })).toBe(true);
    expect(appliesDefaultValues({ baseValue: 7, gems: 0, coins: 0 })).toBe(false);
  });
  it('fills a zero row and keeps Normie unconditional', () => {
    expect(defaultValuesFor({ slug: 'ball', rarity: 'Normie' }, { baseValue: 42, gems: 0, coins: 0 })?.baseValue).toBe(1);
    expect(defaultValuesFor({ slug: 'r', rarity: 'Rares' }, { baseValue: 0, gems: 0, coins: 0 })?.coins).toBe(500);
  });
});

describe('value ranges', () => {
  it('uses the top of the range as the conservative price', () => {
    expect(priceRange({ tradeValue: 100, tradeValueMax: 250 }, 'tradeValue')).toEqual({ min: 100, max: 250, hasRange: true });
    expect(priceRange({ gems: 10, gemsMax: null }, 'gems')).toEqual({ min: 10, max: 10, hasRange: false });
    expect(priceRange({ coins: 0 }, 'coins').min).toBe(0);
  });
});

describe('orders', () => {
  it('ranks the Shiny O/C list highest to lowest with the two ties', () => {
    expect(shinyOCRank({ name: 'Shiny Temple' })).toBeLessThan(shinyOCRank({ name: 'Shiny Frutiger' }));
    expect(shinyOCRank({ name: 'Shiny Forest' })).toBe(shinyOCRank({ name: 'Shiny GolemBall' }));
    expect(shinyOCRank({ name: 'Shiny OMK' })).toBe(shinyOCRank({ name: 'Shiny Wukong' }));
    expect(shinyOCRank({ name: 'Some Other Unit' })).toBe(Number.POSITIVE_INFINITY);
  });
  it('pins the relevancy units in the given order', () => {
    expect(relevancyRank({ name: 'Scrooge' })).toBe(0);
    expect(relevancyRank({ name: 'Shiny Partyman' })).toBe(1);
    expect(relevancyRank({ name: 'MechaBall' })).toBe(6);
    expect(relevancyRank({ name: 'ForestBall' })).toBeNull();
  });
});

describe('demand', () => {
  it('computes a quantity-weighted average and ignores currencies', () => {
    const key = Object.keys(DEMAND_PERCENT)[0];
    expect(averageDemandPercent([{ demand: key, quantity: 2 }, { kind: 'currency', demand: key, quantity: 99999 }])).toBeCloseTo(DEMAND_PERCENT[key], 5);
    expect(averageDemandPercent([])).toBeNull();
  });
  it('labels a demand W on either side', () => {
    expect(demandVerdict(20, 80)).toBe('Demand W for YOU');
    expect(demandVerdict(80, 20)).toBe('Demand W for THEM');
    expect(demandVerdict(50, 50)).toBe('Demand even');
    expect(demandVerdict(null, 50)).toBe('No demand data');
  });
});
