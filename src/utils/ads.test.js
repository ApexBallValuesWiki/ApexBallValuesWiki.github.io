import { afterEach, describe, it, expect, vi } from 'vitest';
import { ADS_LAUNCH_READY, areAdsAllowed, ensureAdSenseScript, isAdsAllowedPath, setAdsEnabled, setAdsRoute } from './ads';

afterEach(() => vi.unstubAllGlobals());

describe('ad launch guard', () => {
  it('cannot inject or request ads on the production host in this build', () => {
    const appendChild = vi.fn();
    vi.stubGlobal('window', { location: { hostname: 'apexballvalueswiki.github.io' }, dispatchEvent: vi.fn() });
    vi.stubGlobal('document', { querySelectorAll: () => [], head: { appendChild } });
    setAdsEnabled(true);
    setAdsRoute('/');
    expect(ADS_LAUNCH_READY).toBe(false);
    expect(areAdsAllowed()).toBe(false);
    expect(ensureAdSenseScript()).toBe(false);
    expect(appendChild).not.toHaveBeenCalled();
  });

  it('excludes privacy, terms, admin and unknown routes from any future content allowlist', () => {
    expect(isAdsAllowedPath('/privacy')).toBe(false);
    expect(isAdsAllowedPath('/terms')).toBe(false);
    expect(isAdsAllowedPath('/admin')).toBe(false);
    expect(isAdsAllowedPath('/not-a-page')).toBe(false);
    expect(isAdsAllowedPath('/wiki')).toBe(true);
  });
});
