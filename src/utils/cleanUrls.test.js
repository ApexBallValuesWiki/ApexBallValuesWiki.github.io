import { afterEach, describe, expect, it, vi } from 'vitest';
import { normalizeUrlForCleanRouting } from './cleanUrls';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('normalizeUrlForCleanRouting', () => {
  // In the test environment import.meta.env.BASE_URL is '/', so the rebuilt
  // path has no repo subfolder — exactly like a custom-domain deployment.
  it('converts legacy hash-routed links into clean paths keeping the query', () => {
    const result = normalizeUrlForCleanRouting('https://zenithvalues.github.io/Apex-Ball-TD-WIKI/#/wiki/units/Rares?x=1');
    expect(result).toBe('https://zenithvalues.github.io/wiki/units/Rares?x=1');
  });

  it('converts a bare legacy hash root to the site root', () => {
    const result = normalizeUrlForCleanRouting('https://zenithvalues.github.io/Apex-Ball-TD-WIKI/#/');
    expect(result).toBe('https://zenithvalues.github.io/');
  });

  it('leaves clean URLs untouched', () => {
    const clean = 'https://zenithvalues.github.io/Apex-Ball-TD-WIKI/wiki/units/Normie/ball';
    expect(normalizeUrlForCleanRouting(clean)).toBe(clean);
  });

  it('ignores non-route fragments (anchor jumps etc.)', () => {
    const anchored = 'https://zenithvalues.github.io/Apex-Ball-TD-WIKI/values#top';
    expect(normalizeUrlForCleanRouting(anchored)).toBe(anchored);
  });

  it('accepts location-like objects', () => {
    const result = normalizeUrlForCleanRouting({
      origin: 'https://zenithvalues.github.io',
      pathname: '/Apex-Ball-TD-WIKI/index.html',
      search: '',
      hash: '#/values/calculator',
    });
    expect(result).toBe('https://zenithvalues.github.io/values/calculator');
  });

  it('returns the original string for unparseable input', () => {
    expect(normalizeUrlForCleanRouting('not a url')).toBe('not a url');
  });
});
