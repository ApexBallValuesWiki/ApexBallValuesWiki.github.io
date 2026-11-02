import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import HeroShowcase from './HeroShowcase';

describe('supplied artwork hero', () => {
  it('uses only the supplied collection, with minimal navigation and accessible controls', () => {
    // Supplying arbitrary live unit data must not alter the fixed hero deck.
    const units = [{ slug: 'unsupplied-live-unit', name: 'Unsupplied Live Unit', imageUrl: '/not-supplied.png' }];
    const html = renderToStaticMarkup(<MemoryRouter><HeroShowcase units={units} /></MemoryRouter>);
    expect(html).toContain('data-unit-count="20"');
    expect(html).toContain('/provided/wukongball.png');
    expect(html).toContain('/hero-desktop/wukongball.webp');
    expect(html).toContain('media="(min-width: 761px)"');
    expect(html).toContain('Wukong artwork');
    expect(html).not.toContain('/not-supplied.png');
    expect(html).not.toContain('Unsupplied Live Unit');
    expect(html).toContain('aria-label="Next unit"');
    expect(html).toContain('aria-label="Previous unit"');
    expect(html).toContain('aria-label="Pause unit rotation"');
    expect(html).toContain('href="/values"');
    expect(html).toContain('href="/wiki"');
    for (const oldCopy of ['Featured unit', 'A guide to Ball Tower Defense', 'Discover the index', 'Made for the game']) expect(html).not.toContain(oldCopy);
    expect(html).not.toMatch(/<(canvas|video)\b/);
  });
});
