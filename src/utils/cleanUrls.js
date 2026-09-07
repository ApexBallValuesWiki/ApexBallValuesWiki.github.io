// CLEAN-URL NORMALIZER
// The app migrated from HashRouter to BrowserRouter (clean URLs). This runs
// once before the router boots and rewrites any legacy "…/#/route" bookmark
// or Discord post into its clean path equivalent, so old links keep working.

const BASE_PATH = (import.meta.env.BASE_URL || '/').replace(/\/+$/, '');

function withBasePath(routePath) {
  const clean = routePath.startsWith('/') ? routePath : `/${routePath}`;
  return `${BASE_PATH}${clean}` || '/';
}

/**
 * One-time URL normalizer for clean (hash-free) routing. Runs before the
 * router boots and rewrites the address bar with history.replaceState.
 *
 * Legacy HashRouter links (".../#/wiki/units/Rares?x=1") become clean paths
 * (".../wiki/units/Rares?x=1").
 *
 * Called with no argument it normalizes window.location in place; with a
 * string/URL/location-like input it is pure and returns the normalized URL.
 */
export function normalizeUrlForCleanRouting(input) {
  try {
    let url;
    let isProvided = false;

    if (typeof input === 'string') {
      url = new URL(input);
      isProvided = true;
    } else if (input instanceof URL) {
      url = new URL(input.toString());
      isProvided = true;
    } else if (input && typeof input.href === 'string') {
      url = new URL(input.href);
      isProvided = true;
    } else if (input && (typeof input.search === 'string' || typeof input.hash === 'string')) {
      const baseOrigin =
        (typeof window !== 'undefined' && window.location?.origin) || 'https://zenithvalues.github.io';
      const basePathname =
        input.pathname || (typeof window !== 'undefined' && window.location?.pathname) || '/';
      const origin = input.origin || baseOrigin;
      url = new URL(origin + basePathname);
      url.search = input.search || '';
      url.hash = input.hash || '';
      isProvided = true;
    } else {
      if (typeof window === 'undefined') return;
      url = new URL(window.location.href);
    }

    const rawHash = url.hash || '';
    let next = null;

    if (rawHash.startsWith('#/')) {
      // Legacy HashRouter link: "#/path?query" -> "/path?query".
      const route = rawHash.slice(1);
      const queryIndex = route.indexOf('?');
      const routePath = queryIndex === -1 ? route : route.slice(0, queryIndex);
      const routeQuery = queryIndex === -1 ? '' : route.slice(queryIndex);

      next = new URL(url.toString());
      next.hash = '';
      next.pathname = withBasePath(routePath || '/');
      if (routeQuery) next.search = routeQuery;
    }

    if (!next) return isProvided ? url.toString() : undefined;

    if (!isProvided && typeof window !== 'undefined' && window.history?.replaceState) {
      try {
        window.history.replaceState(window.history.state, document.title, next.toString());
      } catch {
        // ignore — the app still boots on the un-normalized URL
      }
    }
    return next.toString();
  } catch {
    // Best effort: on error, return original input when provided.
    if (typeof input === 'string') return input;
    if (input instanceof URL) return input.toString();
    return undefined;
  }
}
