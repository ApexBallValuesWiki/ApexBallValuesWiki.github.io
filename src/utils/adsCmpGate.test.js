import { afterEach, describe, expect, it, vi } from 'vitest';

// Proves the fail-closed behaviour that protects the mixed-age audience:
// flipping VITE_ADS_ENABLED alone can NEVER serve ads without a certified CMP.
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
});

async function enabledBuild({ cmp = false } = {}) {
  vi.stubEnv('VITE_ADS_ENABLED', 'true');
  const dispatchEvent = vi.fn();
  const w = { location: { hostname: 'apexballvalueswiki.github.io' }, dispatchEvent };
  vi.stubGlobal('window', w);
  vi.stubGlobal('document', { querySelectorAll: () => [], head: { appendChild: vi.fn() }, createElement: () => ({}) });
  vi.stubGlobal('localStorage', {
    getItem: (k) => (k === 'apex-privacy-choice-v2' ? JSON.stringify({ version: 2, localStats: true, ads: true }) : null),
    setItem: vi.fn(), removeItem: vi.fn(),
  });
  const ads = await import('./ads');
  const cmpModule = await import('./cmp');
  if (cmp) {
    const E = {
      CONSENT_MODE_PURPOSE_STATUS_UNKNOWN: 0,
      CONSENT_MODE_PURPOSE_STATUS_GRANTED: 1,
      CONSENT_MODE_PURPOSE_STATUS_DENIED: 2,
      CONSENT_MODE_PURPOSE_STATUS_NOT_APPLICABLE: 3,
      CONSENT_MODE_PURPOSE_STATUS_NOT_CONFIGURED: 4,
    };
    window.googlefc = { ConsentModePurposeStatusEnum: E, getGoogleConsentModeValues: () => ({
      adStoragePurposeConsentStatus: 1,
      adUserDataPurposeConsentStatus: 1,
      adPersonalizationPurposeConsentStatus: 1,
      analyticsStoragePurposeConsentStatus: 4,
    }) };
    cmpModule.refreshCmpState();
  }
  return { ads, cmpModule, dispatchEvent };
}

describe('ads enabled build requires a certified CMP', () => {
  it('fails closed even when the first-party toggle says yes', async () => {
    const { ads, dispatchEvent } = await enabledBuild();
    expect(ads.ADS_LAUNCH_READY).toBe(true);
    ads.setAdsEnabled(true);
    ads.setAdsRoute('/');
    expect(ads.areAdsAllowed()).toBe(false);
    expect(ads.ensureAdSenseScript()).toBe(false);
    expect(dispatchEvent).toHaveBeenCalled();
  });

  it('allows ads once a Google-certified CMP grants consent', async () => {
    const { ads } = await enabledBuild({ cmp: true });
    ads.setAdsEnabled(true);
    ads.setAdsRoute('/');
    expect(ads.areAdsAllowed()).toBe(true);
  });

  it('never allows ads on legal or admin routes', async () => {
    const { ads } = await enabledBuild({ cmp: true });
    ads.setAdsEnabled(true);
    ads.setAdsRoute('/about');
    expect(ads.areAdsAllowed()).toBe(false);
    ads.setAdsRoute('/contact');
    expect(ads.areAdsAllowed()).toBe(false);
    ads.setAdsRoute('/privacy');
    expect(ads.areAdsAllowed()).toBe(false);
  });
});
