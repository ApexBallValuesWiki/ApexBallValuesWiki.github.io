import { describe, it, expect } from 'vitest';
import { sortUnitsByRarityThenName, groupAndSortUnitsByRarity } from './sortUnits';

describe('sortUnitsByRarityThenName', () => {
  it('sorts by rarity ladder first, then A-Z', () => {
    // KrampusBall is a Transcendent wrongly sitting between Legendaries in
    // raw stat-sheet order — the exact bug this function fixes.
    const units = [
      { slug: 'a', name: 'Aurora', rarity: 'Legendaries' },
      { slug: 'krampusball', name: 'KrampusBall', rarity: 'Transcendents' },
      { slug: 'b', name: 'Bahamut', rarity: 'Legendaries' },
      { slug: 'c', name: 'Cthulhu', rarity: 'Legendaries' },
      { slug: 'd', name: 'Drakon', rarity: 'Transcendents' },
      { slug: 'e', name: 'Apex', rarity: 'Transcendents' },
      { slug: 'f', name: 'Zeus', rarity: 'Mythics' },
    ];
    const sorted = sortUnitsByRarityThenName(units);
    expect(sorted.map((u) => u.slug)).toEqual(['a', 'b', 'c', 'f', 'e', 'd', 'krampusball']);
  });

  it('places Shiny variants right after their base rarity', () => {
    const units = [
      { slug: '1', name: 'Zeta', rarity: 'Normie' },
      { slug: '2', name: 'Alpha', rarity: 'Shiny Normie' },
      { slug: '3', name: 'Beta', rarity: 'Odds' },
    ];
    const sorted = sortUnitsByRarityThenName(units);
    expect(sorted.map((u) => u.rarity)).toEqual(['Normie', 'Shiny Normie', 'Odds']);
  });

  it('does not mutate the input array', () => {
    const units = [{ slug: 'b', name: 'B', rarity: 'Normie' }, { slug: 'a', name: 'A', rarity: 'Normie' }];
    const snapshot = [...units];
    sortUnitsByRarityThenName(units);
    expect(units).toEqual(snapshot);
  });

  it('handles unknown rarities by pushing them last', () => {
    const units = [
      { slug: '1', name: 'A', rarity: 'WeirdUnknown' },
      { slug: '2', name: 'B', rarity: 'Normie' },
    ];
    const sorted = sortUnitsByRarityThenName(units);
    expect(sorted.map((u) => u.rarity)).toEqual(['Normie', 'WeirdUnknown']);
  });
});

describe('groupAndSortUnitsByRarity', () => {
  it('groups into ordered rarity buckets, A-Z within each, dropping empties', () => {
    const units = [
      { slug: 'a', name: 'Zebra', rarity: 'Normie' },
      { slug: 'b', name: 'Ant', rarity: 'Normie' },
      { slug: 'c', name: 'Yak', rarity: 'Mythics' },
    ];
    const groups = groupAndSortUnitsByRarity(units);
    expect(groups.map((g) => g.rarity)).toEqual(['Normie', 'Mythics']);
    expect(groups[0].units.map((u) => u.name)).toEqual(['Ant', 'Zebra']);
  });
});
