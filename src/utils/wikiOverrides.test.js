import { describe, expect, it } from 'vitest';
import { mergeWikiOverride, rowToWikiCustomUnit, rowToWikiOverride } from './wikiOverrides';

describe('wiki override mapping helpers', () => {
  it('maps custom WIKI database rows into documented custom units', () => {
    expect(rowToWikiCustomUnit({
      slug: 'test-ball',
      name: 'Test Ball',
      rarity: 'Mythic',
      custom_unit: true,
      image_url: 'https://example.com/test.png',
      category: '',
      obtain: ['Admin'],
      min_max_stats: { dps: '10' },
      upgrades: [{ level: 1 }],
      updated_at: '2026-07-16T00:00:00Z',
    })).toMatchObject({
      slug: 'test-ball',
      name: 'Test Ball',
      rarity: 'Mythic',
      category: 'Standard',
      categories: ['Standard'],
      customUnit: true,
      documented: true,
      imageUrl: 'https://example.com/test.png',
    });
  });

  it('ignores non-custom rows when mapping custom units', () => {
    expect(rowToWikiCustomUnit({ slug: 'generated-ball', custom_unit: false })).toBeNull();
  });

  it('maps override rows and omits empty values during merge', () => {
    const override = rowToWikiOverride({
      slug: 'ball',
      name: '',
      image_url: 'https://example.com/ball.png',
      early_game_rank: 3,
      obtain: null,
      min_max_stats: { damage: '1-2' },
    });

    expect(override).toMatchObject({
      name: undefined,
      imageUrl: 'https://example.com/ball.png',
      earlyGameRank: 3,
      minMaxStats: { damage: '1-2' },
    });

    expect(mergeWikiOverride({ slug: 'ball', name: 'Ball', rarity: 'Normie' }, override)).toMatchObject({
      slug: 'ball',
      name: 'Ball',
      rarity: 'Normie',
      imageUrl: 'https://example.com/ball.png',
      earlyGameRank: 3,
    });
  });
});
