import { afterEach, describe, expect, it, vi } from 'vitest';
import { normalizeUrlForCleanRouting } from './cleanUrls';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('normalizeUrlForCleanRouting', () => {
  // This site is served from the domain root (apexballvalueswiki.github.io), so
  // BASE_URL is '/' and legacy links carry no repo subfolder.
  it('converts legacy hash-routed links into clean paths keeping the query', () => {
    const result = normalizeUrlForCleanRouting('https://apexballvalueswiki.github.io/#/wiki/units/Rares?x=1');
    expect(result).toBe('https://apexballvalueswiki.github.io/wiki/units/Rares?x=1');
  });

  it('converts a bare legacy hash root to the site root', () => {
    const result = normalizeUrlForCleanRouting('https://apexballvalueswiki.github.io/#/');
    expect(result).toBe('https://apexballvalueswiki.github.io/');
  });

  it('leaves clean URLs untouched', () => {
    const clean = 'https://apexballvalueswiki.github.io/wiki/units/Normie/ball';
    expect(normalizeUrlForCleanRouting(clean)).toBe(clean);
  });

  it('ignores non-route fragments (anchor jumps etc.)', () => {
    const anchored = 'https://apexballvalueswiki.github.io/values#top';
    expect(normalizeUrlForCleanRouting(anchored)).toBe(anchored);
  });

  it('accepts location-like objects', () => {
    const result = normalizeUrlForCleanRouting({
      origin: 'https://apexballvalueswiki.github.io',
      pathname: '/index.html',
      search: '',
      hash: '#/values/calculator',
    });
    expect(result).toBe('https://apexballvalueswiki.github.io/values/calculator');
  });

  it('returns the original string for unparseable input', () => {
    expect(normalizeUrlForCleanRouting('not a url')).toBe('not a url');
  });
});
