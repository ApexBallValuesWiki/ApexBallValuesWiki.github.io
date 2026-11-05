// Adapter for Google's FREE certified CMP ("Privacy & messaging" / Funding
// Choices). It never buys, bundles or loads a third-party CMP. It READS the
// consent decision from whichever Google-certified platform is on the page
// and FAILS CLOSED: if no CMP is detected, or the visitor refused/unknown,
// no ad script is injected and no ad request is made.
//
// Official APIs used (Google Funding Choices JS API + IAB TCF v2):
//   googlefc.callbackQueue / CONSENT_MODE_DATA_READY
//   googlefc.getGoogleConsentModeValues()
//   googlefc.getConsentStatus()  (simplified framework)
//   __tcfapi('getTCData', 2, cb)
//
// AdSense privacy signals (official, see AdSense Help "Ads personalisation
// settings in Google's publisher ad tags"):
//   adsbygoogle.pauseAdRequests = 1
//   adsbygoogle.requestNonPersonalizedAds = 1   -> &npa=1
//
// Because this site's audience includes children and teenagers, personalised
// ads are only ever allowed when the CMP explicitly grants ad_personalization.
// Everything else defaults to non-personalised / no ads.
export const CMP_STATE_EVENT = 'apex-cmp-state';

const state = {
  present: false,   // a Google-certified CMP exists on the page
  ready: false,     // consent data has actually been resolved
  ads: false,       // ad_storage / ad_user_data allow an ad request
  personalized: false, // ad_personalization was explicitly granted
  source: null,     // 'googlefc-consent-mode' | 'googlefc' | 'tcf' | null
};

let initialized = false;
let loaderInjected = false;

export function getCmpState() { return { ...state }; }
export function cmpAuthorizesAds() { return state.present && state.ready && state.ads; }
export function cmpPersonalizationAllowed() { return state.present && state.ready && state.personalized; }

function publish(next) {
  Object.assign(state, next);
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    try { window.dispatchEvent(new CustomEvent(CMP_STATE_EVENT, { detail: getCmpState() })); } catch { /* no DOM */ }
  }
}

function googleFcConsentMode(fc) {
  if (typeof fc.getGoogleConsentModeValues !== 'function') return null;
  const values = fc.getGoogleConsentModeValues();
  if (!values) return null;
  const E = fc.ConsentModePurposeStatusEnum || {};
  const K = {
    unknown: E.CONSENT_MODE_PURPOSE_STATUS_UNKNOWN ?? 0,
    granted: E.CONSENT_MODE_PURPOSE_STATUS_GRANTED ?? 1,
    denied: E.CONSENT_MODE_PURPOSE_STATUS_DENIED ?? 2,
    na: E.CONSENT_MODE_PURPOSE_STATUS_NOT_APPLICABLE ?? 3,
    nc: E.CONSENT_MODE_PURPOSE_STATUS_NOT_CONFIGURED ?? 4,
  };
  const flexible = (v) => v === K.granted || v === K.na || v === K.nc;
  const strictlyGranted = (v) => v === K.granted;
  const adStorage = values.adStoragePurposeConsentStatus;
  const adUserData = values.adUserDataPurposeConsentStatus;
  const adPersonalization = values.adPersonalizationPurposeConsentStatus;
  if (adStorage === undefined || adStorage === K.unknown) return { present: true, ready: false, ads: false, personalized: false, source: 'googlefc-consent-mode' };
  return {
    present: true,
    ready: true,
    // Analytics is irrelevant here (we ship no analytics); do not let an
    // unconfigured analytics purpose block ads, but never allow ads when a
    // storage/data purpose was denied.
    ads: flexible(adStorage) && flexible(adUserData ?? K.nc),
    personalized: strictlyGranted(adPersonalization),
    source: 'googlefc-consent-mode',
  };
}

function googleFcSimplified(fc) {
  if (typeof fc.getConsentStatus !== 'function') return null;
  const E = fc.ConsentStatusEnum || {};
  const status = fc.getConsentStatus();
  if (status === undefined || status === null) return null;
  if (status === E.CONSENTED_TO_PERSONALIZED_ADS) return { present: true, ready: true, ads: true, personalized: true, source: 'googlefc' };
  if (status === E.CONSENT_NOT_REQUIRED) return { present: true, ready: true, ads: true, personalized: false, source: 'googlefc' };
  if (status === E.CONSENTED_TO_NON_PERSONALIZED_ADS) return { present: true, ready: true, ads: true, personalized: false, source: 'googlefc' };
  return { present: true, ready: true, ads: false, personalized: false, source: 'googlefc' };
}

function readTcf(tcf, done) {
  try {
    tcf('getTCData', 2, (data, success) => {
      if (!success || !data) { done({ present: true, ready: false, ads: false, personalized: false, source: 'tcf' }); return; }
      if (data.gdprApplies === false) {
        // Consent is not legally required here, but CHILD SAFETY still applies:
        // serve non-personalised ads only.
        done({ present: true, ready: true, ads: true, personalized: false, source: 'tcf' });
        return;
      }
      const purposes = data.purposeConsents || {};
      const vendors = data.vendorConsents || {};
      const googleAllowed = vendors['755'] !== false; // Google Advertising Products
      const storage = purposes['1'] === true;
      const personalization = purposes['3'] === true && purposes['4'] === true;
      done({
        present: true,
        ready: Boolean(data.cmpStatus === 'loaded' || Object.keys(purposes).length),
        ads: Boolean(storage && googleAllowed),
        personalized: Boolean(personalization && googleAllowed),
        source: 'tcf',
      });
    });
  } catch { done({ present: true, ready: false, ads: false, personalized: false, source: 'tcf' }); }
}

/** Re-read the CMP decision. Called on init and on every CMP callback. */
export function refreshCmpState() {
  if (typeof window === 'undefined') return getCmpState();
  const fc = window.googlefc;
  const tcf = typeof window.__tcfapi === 'function' ? window.__tcfapi : null;
  if (!fc && !tcf) {
    publish({ present: false, ready: false, ads: false, personalized: false, source: null });
    return getCmpState();
  }
  if (fc) {
    const result = googleFcConsentMode(fc) || googleFcSimplified(fc);
    if (result) { publish(result); return getCmpState(); }
  }
  if (tcf) { readTcf(tcf, (result) => publish(result)); return getCmpState(); }
  publish({ present: true, ready: false, ads: false, personalized: false, source: 'googlefc' });
  return getCmpState();
}

/**
 * Install the queue callbacks Google's CMP fires when consent resolves.
 * Optionally injects the operator-supplied CMP script URL (VITE_ADS_CMP_URL)
 * — Google's own free "Privacy & messaging" tag from the AdSense dashboard.
 * Nothing is loaded unless ads are enabled AND a URL was explicitly provided.
 */
export function initCmpBridge() {
  if (initialized || typeof window === 'undefined') return getCmpState();
  initialized = true;
  const adsEnabled = import.meta.env.VITE_ADS_ENABLED === 'true';
  const cmpUrl = import.meta.env.VITE_ADS_CMP_URL;
  window.googlefc = window.googlefc || {};
  window.googlefc.callbackQueue = window.googlefc.callbackQueue || [];
  window.googlefc.callbackQueue.push({ CONSENT_MODE_DATA_READY: refreshCmpState });
  window.googlefc.callbackQueue.push({ CONSENT_DATA_READY: refreshCmpState });
  if (adsEnabled && cmpUrl && !loaderInjected) {
    loaderInjected = true;
    try {
      const script = document.createElement('script');
      script.async = true;
      script.src = String(cmpUrl);
      document.head.appendChild(script);
    } catch { /* blocked by CSP or browser settings — stay fail-closed */ }
  }
  refreshCmpState();
  return getCmpState();
}

/** Apply the official AdSense privacy signals immediately before a push. */
export function applyAdSensePrivacySignals() {
  if (typeof window === 'undefined') return;
  const ads = (window.adsbygoogle = window.adsbygoogle || []);
  ads.pauseAdRequests = cmpAuthorizesAds() ? 0 : 1;
  ads.requestNonPersonalizedAds = cmpPersonalizationAllowed() ? 0 : 1;
}

/** Test-only: reset module state between cases. */
export function __resetCmpForTests() {
  initialized = false;
  loaderInjected = false;
  publish({ present: false, ready: false, ads: false, personalized: false, source: null });
}
