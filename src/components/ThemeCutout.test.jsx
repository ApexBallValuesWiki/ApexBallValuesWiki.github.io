import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { HERO_ARTWORK } from '../data/heroArtwork';
import ThemeCutout, { CUTOUT_MAP, RARITY_CUTOUT_MAP, getCutoutForRarity } from './ThemeCutout';

describe('theme-aware decorative artwork', () => {
  it('uses only supplied art for decorative aliases and rarity ornaments', () => {
    const suppliedSources = new Set(HERO_ARTWORK.map((artwork) => artwork.image));
    Object.values(CUTOUT_MAP).forEach((entry) => expect(suppliedSources.has(entry.src)).toBe(true));
    Object.values(RARITY_CUTOUT_MAP).forEach((variant) => expect(suppliedSources.has(CUTOUT_MAP[variant].src)).toBe(true));
    expect(getCutoutForRarity('Shiny Omegas')).toBe(getCutoutForRarity('Omegas'));
  });

  it('renders a decorative theme mask rather than changing unit image records', () => {
    const html = renderToStaticMarkup(<ThemeCutout variant="poseidon" as="span" />);
    expect(html).toContain('data-theme-art="true"');
    expect(html).toContain('kingball.png');
    expect(html).toContain('theme-cutout-tint');
    expect(html).toContain('aria-hidden="true"');
    expect(html).not.toContain('--cutout-tint:');
  });
});
