// Advertising is OFF by default in BOTH realms. The Test Realm can never
// serve ads; production can only serve them when the operator explicitly sets
// VITE_ADS_ENABLED=true in the production repo's GitHub Actions variables
// (after AdSense approval), maintenance is off, the route is a content page,
// and the visitor (or guardian) has opted into advertising consent.
//
// Slot IDs must be unique per placement on a page. The old build reused one
// ID three times, which produced AdSense "TagError: X/Y" on every page.
// See ENABLE-ADS.md for the exact enablement + CMP checklist.
import { adsConsentAllowed } from './privacyChoices';
import { cmpAuthorizesAds } from './cmp';

export const AD_CLIENT = 'ca-pub-2832011907708910';
export const ADS_LAUNCH_READY = import.meta.env.VITE_ADS_ENABLED === 'true';

const PRODUCTION_HOSTS = new Set(['apexballvalueswiki.github.io']);
const TEST_REALM_HOSTS = new Set(['zenithvalues.github.io']);
const CONTENT_PATHS = new Set(['/', '/wiki', '/values', '/values/calculator']);

// One real slot ID per placement, overridable without a code edit. The
// operator can set VITE_ADS_SLOT_HOME / VITE_ADS_SLOT_CALCULATOR in the
// production repo's GitHub Actions variables after creating more ad units.
// Never reuse one ID twice on the SAME page (the old TagError cause).
export const AD_SLOTS = {
  home: import.meta.env.VITE_ADS_SLOT_HOME || '2911497117',
  calculator: import.meta.env.VITE_ADS_SLOT_CALCULATOR || '2911497117',
};

let maintenanceClear = false;
let currentPath = '';
let injected = false;
let loaded = false;

export function isTestRealmHost() {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return TEST_REALM_HOSTS.has(host) || host.includes('zenithvalues');
}

export function isAdsAllowedHost() {
  if (typeof window === 'undefined' || isTestRealmHost()) return false;
  return PRODUCTION_HOSTS.has(window.location.hostname);
}

export function isAdsAllowedPath(path) {
  const clean = String(path || '/').split(/[?#]/)[0].replace(/\/+$/, '') || '/';
  return CONTENT_PATHS.has(clean);
}

function notifyChange() {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('apex-ads-state'));
}

/** Best-effort cleanup; blocking the request before consent is the real guard. */
function scrubAdCode() {
  if (typeof document === 'undefined') return;
  document.querySelectorAll('script[src*="pagead2.googlesyndication.com"]')
    .forEach((script) => script.remove());
  document.querySelectorAll('ins.adsbygoogle, iframe[src*="googlesyndication"], iframe[src*="google_ads"]')
    .forEach((element) => { if (!element.closest('.apex-ad-slot-wrapper')) element.remove(); });
  injected = false;
  loaded = false;
}

export function setAdsEnabled(on) {
  maintenanceClear = Boolean(on);
  if (!areAdsAllowed()) scrubAdCode();
  notifyChange();
}

export function setAdsRoute(path) {
  currentPath = String(path || '');
  if (!areAdsAllowed()) scrubAdCode();
  notifyChange();
}

/**
 * Consent gate. While ads are OFF (every shipped build) the existing
 * first-party toggle is enough. Once ads are actually enabled, consent is
 * delegated to the Google-certified CMP, which FAILS CLOSED: no CMP present,
 * or a refused/unknown decision, means no ad script and no ad request.
 * This also avoids showing two conflicting consent banners.
 */
function consentGate() {
  return ADS_LAUNCH_READY ? cmpAuthorizesAds() : adsConsentAllowed();
}

export function areAdsAllowed() {
  return ADS_LAUNCH_READY
    && isAdsAllowedHost()
    && consentGate()
    && maintenanceClear
    && isAdsAllowedPath(currentPath);
}

/** Inject the AdSense library at most once, only when every gate passes. */
export function ensureAdSenseScript() {
  if (!areAdsAllowed() || typeof document === 'undefined') return false;
  if (injected) return true;
  injected = true;
  window.adsbygoogle = window.adsbygoogle || [];
  const script = document.createElement('script');
  script.async = true;
  script.crossOrigin = 'anonymous';
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${AD_CLIENT}`;
  script.addEventListener('load', () => {
    loaded = true;
    window.dispatchEvent(new CustomEvent('apex-ads-script-loaded'));
  });
  script.addEventListener('error', () => {
    injected = false;
    loaded = false;
  });
  document.head.appendChild(script);
  return true;
}

export function adSenseScriptLoaded() { return loaded; }
