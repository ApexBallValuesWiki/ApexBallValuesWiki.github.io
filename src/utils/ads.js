// ADSENSE POLICY GUARD — ads only serve on the production host, on content
// pages (AdSense forbids ads on login/maintenance/404/under-construction
// screens). The loader is injected here, production-only, and AdSlot renders
// nothing until this check passes. Placements: Home, WIKI, Values, Calculator.
const AD_CLIENT = 'ca-pub-2832011907708910';
const ALLOWED_HOSTS = ['apexballvalueswiki.github.io'];

let injected = false;

/** True only on the production host (never staging, localhost, or SSG). */
export function isAdsAllowedHost() {
  if (typeof window === 'undefined') return false; // prerender/SSG: no ads in static HTML
  return ALLOWED_HOSTS.includes(window.location.hostname);
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
