// ADSENSE POLICY GUARD — ads only serve on the production host, on content
// pages (AdSense forbids ads on login/maintenance/404/under-construction
// screens). The loader is injected here, production-only, and AdSlot renders
// nothing until this check passes. Placements: Home, WIKI, Values, Calculator.
const AD_CLIENT = 'ca-pub-2832011907708910';
const ALLOWED_HOSTS = ['apexballvalueswiki.github.io'];

let injected = false;

// Ads stay OFF until the app confirms maintenance mode is OFF (AdSense policy:
// "no ads on screens without publisher content" — the maintenance screen, the
// first paint before the check resolves, and empty states must never show ads).
let adsEnabled = false;

/** True only on the production host (never staging, localhost, or SSG). */
export function isAdsAllowedHost() {
  if (typeof window === 'undefined') return false; // prerender/SSG: no ads in static HTML
  return ALLOWED_HOSTS.includes(window.location.hostname);
}

/**
 * Called by App when the maintenance state resolves. Ads only ever run when
 * this is explicitly set to true (maintenance confirmed OFF). Default: off.
 */
export function setAdsEnabled(on) {
  if (typeof window === 'undefined') return;
  const next = !!on;
  if (next === adsEnabled) return;
  adsEnabled = next;
  // AdSense policy ("no ads on screens without publisher content"): when ads
  // are disabled — maintenance on, gate screens — strip the loader script and
  // any Google-injected ad units (incl. account-level Auto Ads) so nothing
  // keeps serving on a contentless screen for the rest of the session.
  if (!next) scrubAdCode();
  window.dispatchEvent(new CustomEvent('apex-ads-state'));
}

/** Best-effort removal of all Google ad artifacts from the document. */
function scrubAdCode() {
  try {
    document.querySelectorAll('script[src*="pagead2.googlesyndication.com"]')
      .forEach((s) => s.remove());
    // Remove ad units Google injected itself. Our own slots live inside
    // .apex-ad-slot-wrapper and are unmounted by React — never touch those.
    document.querySelectorAll('ins.adsbygoogle, iframe[src*="googlesyndication"], iframe[src*="google_ads"]')
      .forEach((el) => { if (!el.closest('.apex-ad-slot-wrapper')) el.remove(); });
    injected = false; // allow a clean re-inject if ads are re-enabled later
  } catch { /* best effort — never break the app over ad cleanup */ }
}

/** True only when: production host AND maintenance confirmed off. */
export function areAdsAllowed() {
  return isAdsAllowedHost() && adsEnabled;
}

/** Inject the AdSense loader once (production only). Safe to call often. */
export function ensureAdSenseScript() {
  if (typeof document === 'undefined' || injected) return;
  injected = true;
  window.adsbygoogle = window.adsbygoogle || [];
  const script = document.createElement('script');
  script.async = true;
  script.crossOrigin = 'anonymous';
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${AD_CLIENT}`;
  document.head.appendChild(script);
}
