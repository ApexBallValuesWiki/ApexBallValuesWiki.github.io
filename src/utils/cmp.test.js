import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  __resetCmpForTests,
  applyAdSensePrivacySignals,
  cmpAuthorizesAds,
  cmpPersonalizationAllowed,
  getCmpState,
  initCmpBridge,
  refreshCmpState,
} from './cmp';

afterEach(() => {
  vi.unstubAllGlobals();
  __resetCmpForTests();
});

describe('certified-CMP consent adapter', () => {
  it('fails closed when no CMP exists on the page', () => {
    expect(cmpAuthorizesAds()).toBe(false);
    expect(cmpPersonalizationAllowed()).toBe(false);
    expect(getCmpState().present).toBe(false);
    const ads = [];
    vi.stubGlobal('window', { adsbygoogle: ads, dispatchEvent: vi.fn() });
    applyAdSensePrivacySignals();
    expect(ads.pauseAdRequests).toBe(1);
    expect(ads.requestNonPersonalizedAds).toBe(1);
  });

  it('detects Google Funding Choices consent mode and blocks denied storage', () => {
    const E = {
      CONSENT_MODE_PURPOSE_STATUS_UNKNOWN: 0,
      CONSENT_MODE_PURPOSE_STATUS_GRANTED: 1,
      CONSENT_MODE_PURPOSE_STATUS_DENIED: 2,
      CONSENT_MODE_PURPOSE_STATUS_NOT_APPLICABLE: 3,
      CONSENT_MODE_PURPOSE_STATUS_NOT_CONFIGURED: 4,
    };
    vi.stubGlobal('window', {
      googlefc: { ConsentModePurposeStatusEnum: E, getGoogleConsentModeValues: () => ({
        adStoragePurposeConsentStatus: 2,
        adUserDataPurposeConsentStatus: 2,
        adPersonalizationPurposeConsentStatus: 2,
        analyticsStoragePurposeConsentStatus: 2,
      }) },
      dispatchEvent: vi.fn(),
    });
    refreshCmpState();
    expect(getCmpState().source).toBe('googlefc-consent-mode');
    expect(cmpAuthorizesAds()).toBe(false);
    expect(cmpPersonalizationAllowed()).toBe(false);
  });

  it('allows ads but keeps them non-personalised for children when personalization is not granted', () => {
    const E = {
      CONSENT_MODE_PURPOSE_STATUS_UNKNOWN: 0,
      CONSENT_MODE_PURPOSE_STATUS_GRANTED: 1,
      CONSENT_MODE_PURPOSE_STATUS_DENIED: 2,
      CONSENT_MODE_PURPOSE_STATUS_NOT_APPLICABLE: 3,
      CONSENT_MODE_PURPOSE_STATUS_NOT_CONFIGURED: 4,
    };
    vi.stubGlobal('window', {
      googlefc: { ConsentModePurposeStatusEnum: E, getGoogleConsentModeValues: () => ({
        adStoragePurposeConsentStatus: 1,
        adUserDataPurposeConsentStatus: 1,
        adPersonalizationPurposeConsentStatus: 2,
        analyticsStoragePurposeConsentStatus: 4,
      }) },
      dispatchEvent: vi.fn(),
    });
    refreshCmpState();
    expect(cmpAuthorizesAds()).toBe(true);
    expect(cmpPersonalizationAllowed()).toBe(false);
    const ads = [];
    vi.stubGlobal('window', { ...window, adsbygoogle: ads, dispatchEvent: vi.fn() });
    applyAdSensePrivacySignals();
    expect(ads.pauseAdRequests).toBe(0);
    expect(ads.requestNonPersonalizedAds).toBe(1);
  });

  it('only permits personalised ads when the CMP explicitly grants it', () => {
    const E = {
      CONSENT_MODE_PURPOSE_STATUS_UNKNOWN: 0,
      CONSENT_MODE_PURPOSE_STATUS_GRANTED: 1,
      CONSENT_MODE_PURPOSE_STATUS_DENIED: 2,
    };
    vi.stubGlobal('window', {
      googlefc: { ConsentModePurposeStatusEnum: E, getGoogleConsentModeValues: () => ({
        adStoragePurposeConsentStatus: 1,
        adUserDataPurposeConsentStatus: 1,
        adPersonalizationPurposeConsentStatus: 1,
        analyticsStoragePurposeConsentStatus: 4,
      }) },
      dispatchEvent: vi.fn(),
    });
    refreshCmpState();
    expect(cmpPersonalizationAllowed()).toBe(true);
  });

  it('reads IAB TCF v2 and refuses ads when Google (vendor 755) is rejected', () => {
    vi.stubGlobal('window', {
      __tcfapi: (_cmd, _version, cb) => cb({
        cmpStatus: 'loaded',
        gdprApplies: true,
        purposeConsents: { 1: true, 3: true, 4: true },
        vendorConsents: { 755: false },
      }, true),
      dispatchEvent: vi.fn(),
    });
    refreshCmpState();
    expect(getCmpState().source).toBe('tcf');
    expect(cmpAuthorizesAds()).toBe(false);
  });

  it('never personalises when GDPR does not apply (child-safety default)', () => {
    vi.stubGlobal('window', {
      __tcfapi: (_cmd, _version, cb) => cb({ gdprApplies: false, cmpStatus: 'loaded' }, true),
      dispatchEvent: vi.fn(),
    });
    refreshCmpState();
    expect(cmpAuthorizesAds()).toBe(true);
    expect(cmpPersonalizationAllowed()).toBe(false);
  });

  it('registers Google CMP callbacks and injects no script by default', () => {
    const appendChild = vi.fn();
    vi.stubGlobal('window', { dispatchEvent: vi.fn() });
    vi.stubGlobal('document', { head: { appendChild }, createElement: () => ({}) });
    initCmpBridge();
    expect(window.googlefc.callbackQueue.length).toBeGreaterThanOrEqual(2);
    expect(appendChild).not.toHaveBeenCalled();
  });
});
