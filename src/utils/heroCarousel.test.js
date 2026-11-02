import { describe, expect, it } from 'vitest';
import { HERO_ARTWORK } from '../data/heroArtwork';
import {
  HERO_ROTATION_MS, nextHeroSlug, requestHeroSlide, readyHeroSlide, finishHeroTransition,
} from './heroCarousel';

const expectedSlugs = [
  'wukong', 'brainball', 'fancyball', 'hephaestus', 'autumn', 'baller',
  'showman', 'omega-knight', 'golem', 'dictator', 'plasma', 'mummy',
  'frutiger', 'king-ball', 'laser-minigunner', 'party-man', 'elf-commander',
  'overclocked-overlord', 'hacker-ball', 'forest-ball',
];

describe('supplied artwork rotation', () => {
  it('contains only the twenty supplied images, in their provided order', () => {
    expect(HERO_ARTWORK.map((item) => item.slug)).toEqual(expectedSlugs);
    expect(new Set(HERO_ARTWORK.map((item) => item.image)).size).toBe(20);
    expect(HERO_ARTWORK.every((item) => item.image.includes('/provided/') && item.name)).toBe(true);
    expect(new Set(HERO_ARTWORK.map((item) => item.desktopImage)).size).toBe(20);
    expect(HERO_ARTWORK.every((item) => item.desktopImage.includes('/hero-desktop/')
      && item.desktopImage.split('/').at(-1).replace(/\.webp$/, '') === item.image.split('/').at(-1).replace(/\.png$/, ''))).toBe(true);
    expect(HERO_ROTATION_MS).toBe(5000);
  });

  it('visits each supplied image exactly once before wrapping', () => {
    const seen = [];
    let current = HERO_ARTWORK[0].slug;
    for (let i = 0; i < HERO_ARTWORK.length; i += 1) {
      seen.push(current);
      current = nextHeroSlug(HERO_ARTWORK, current);
    }
    expect(seen).toEqual(expectedSlugs);
    expect(current).toBe(expectedSlugs[0]);
    expect(nextHeroSlug(HERO_ARTWORK, current, -1)).toBe(expectedSlugs.at(-1));
    expect(nextHeroSlug(HERO_ARTWORK, 'not-provided')).toBe(expectedSlugs[0]);
    expect(nextHeroSlug([], current)).toBeNull();
  });
});

describe('decoded hero transition queue', () => {
  const initial = () => ({ current: { artwork: HERO_ARTWORK[0], id: 0 }, previous: null, pending: null });

  it('keeps the current image visible and ignores stale decodes', () => {
    let slides = requestHeroSlide(initial(), HERO_ARTWORK, 1, 1);
    slides = requestHeroSlide(slides, HERO_ARTWORK, 2, 1);
    expect(slides.current.artwork.slug).toBe('wukong');
    expect(slides.pending.artwork.slug).toBe('fancyball');
    expect(readyHeroSlide(slides, 1, 2)).toBe(slides);
    slides = readyHeroSlide(slides, 2, 2);
    expect(slides.previous.artwork.slug).toBe('wukong');
    expect(slides.current.artwork.slug).toBe('fancyball');
    expect(slides.pending).toBeNull();
  });

  it('queues only the latest decoded request until the outgoing layer completes', () => {
    let slides = requestHeroSlide(initial(), HERO_ARTWORK, 1, 1);
    slides = readyHeroSlide(slides, 1, 1);
    slides = requestHeroSlide(slides, HERO_ARTWORK, 2, 1);
    slides = readyHeroSlide(slides, 2, 2);
    expect(slides.pending.ready).toBe(true);
    slides = requestHeroSlide(slides, HERO_ARTWORK, 3, 1);
    expect(readyHeroSlide(slides, 2, 3)).toBe(slides);
    slides = readyHeroSlide(slides, 3, 3);
    expect(slides.current.artwork.slug).toBe('brainball');
    expect(slides.previous.artwork.slug).toBe('wukong');
    expect(slides.pending.artwork.slug).toBe('hephaestus');
    expect(finishHeroTransition(slides, 999, 3)).toBe(slides);
    slides = finishHeroTransition(slides, 0, 3);
    expect(slides.previous.artwork.slug).toBe('brainball');
    expect(slides.current.artwork.slug).toBe('hephaestus');
    expect(slides.pending).toBeNull();
    slides = finishHeroTransition(slides, 1, 3);
    expect(slides.previous).toBeNull();
  });

  it('waits for a slow decode after the previous transition finishes', () => {
    let slides = requestHeroSlide(initial(), HERO_ARTWORK, 1, 1);
    slides = readyHeroSlide(slides, 1, 1);
    slides = requestHeroSlide(slides, HERO_ARTWORK, 2, 1);
    slides = finishHeroTransition(slides, 0, 2);
    expect(slides.current.artwork.slug).toBe('brainball');
    expect(slides.previous).toBeNull();
    expect(slides.pending.artwork.slug).toBe('fancyball');
    slides = readyHeroSlide(slides, 2, 2);
    expect(slides.previous.artwork.slug).toBe('brainball');
    expect(slides.current.artwork.slug).toBe('fancyball');
  });

  it('cancels a request that returns to the current image', () => {
    let slides = requestHeroSlide(initial(), HERO_ARTWORK, 1, 1);
    slides = requestHeroSlide(slides, HERO_ARTWORK, 2, -1);
    expect(slides.current.artwork.slug).toBe('wukong');
    expect(slides.pending).toBeNull();
    expect(readyHeroSlide(slides, 1, 2)).toBe(slides);
  });
});
