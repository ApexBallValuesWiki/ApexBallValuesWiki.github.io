import { describe, expect, it } from 'vitest';
import { mergeWikiOverride, rowToWikiOverride } from './wikiOverrides';

describe('wiki override mapping helpers', () => {
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
