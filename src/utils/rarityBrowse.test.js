import { describe, expect, it } from 'vitest';
import { buildRarityBrowse, DEFAULT_RARITY_ORDER, liveRarities } from './rarityBrowse';

const u = (slug, rarity) => ({ slug, rarity });

describe('live Browse-by-Rarity counts', () => {
  it('counts from the supplied live roster, not a static snapshot', () => {
    const cards = buildRarityBrowse([
      u('a', 'Normie'), u('b', 'Normie'), u('c', 'Omegas'),
    ]);
    const normie = cards.find((c) => c.rarity === 'Normie');
    const omegas = cards.find((c) => c.rarity === 'Omegas');
    const mythics = cards.find((c) => c.rarity === 'Mythics');
    expect(normie.count).toBe(2);
    expect(omegas.count).toBe(1);
    expect(mythics.count).toBe(0);
  });

  it('updates when a unit is ADDED (the reported bug)', () => {
    const before = buildRarityBrowse([u('a', 'Normie')]);
    const after = buildRarityBrowse([u('a', 'Normie'), u('new-unit', 'Normie')]);
    const get = (cards) => cards.find((c) => c.rarity === 'Normie').count;
    expect(get(before)).toBe(1);
    expect(get(after)).toBe(2);
  });

  it('updates when a unit is DELETED (the reported bug)', () => {
    const before = buildRarityBrowse([u('a', 'Normie'), u('b', 'Normie')]);
    const after = buildRarityBrowse([u('a', 'Normie')]);
    const get = (cards) => cards.find((c) => c.rarity === 'Normie').count;
    expect(get(before)).toBe(2);
    expect(get(after)).toBe(1);
  });

  it('follows a unit whose rarity was edited', () => {
    const before = buildRarityBrowse([u('a', 'Normie')]);
    const after = buildRarityBrowse([u('a', 'Omegas')]);
    expect(before.find((c) => c.rarity === 'Normie').count).toBe(1);
    expect(after.find((c) => c.rarity === 'Normie').count).toBe(0);
    expect(after.find((c) => c.rarity === 'Omegas').count).toBe(1);
  });

  it('keeps shiny counts separate but live', () => {
    const cards = buildRarityBrowse([
      u('a', 'Normie'), u('shiny-a', 'Shiny Normie'), u('shiny-b', 'Shiny Normie'),
    ]);
    const normie = cards.find((c) => c.rarity === 'Normie');
    expect(normie.count).toBe(1);
    expect(normie.shinyRarity).toBe('Shiny Normie');
    expect(normie.shinyCount).toBe(2);
  });

  it('discovers a brand-new editor-created rarity and marks it custom', () => {
    const cards = buildRarityBrowse([u('a', 'Seasonal'), u('shiny-a', 'Shiny Seasonal')]);
    const seasonal = cards.find((c) => c.rarity === 'Seasonal');
    expect(seasonal).toMatchObject({ count: 1, shinyCount: 1, isCustom: true });
    expect(cards.find((c) => c.rarity === 'Seasonal')).toBeTruthy();
    expect(cards.filter((c) => c.isCustom)).toHaveLength(1);
  });

  it('always keeps the canonical tier order', () => {
    expect(buildRarityBrowse([]).map((c) => c.rarity)).toEqual(DEFAULT_RARITY_ORDER);
  });

  it('makes custom rarities valid routes', () => {
    const rarities = liveRarities([u('a', 'Seasonal')], ['Normie', 'Shiny Normie']);
    expect(rarities).toContain('Seasonal');
    expect(rarities).toContain('Normie');
  });

  it('handles an empty or missing live roster without crashing', () => {
    expect(buildRarityBrowse([]).length).toBe(DEFAULT_RARITY_ORDER.length);
    expect(buildRarityBrowse(null).every((c) => c.count === 0)).toBe(true);
  });
});
