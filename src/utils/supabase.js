import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://apex-db.apexballtd-admin.workers.dev';

const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  'sb_publishable_mZoC_DE3z3BCJrxH_-wlVA_noBjhsKy';

const RECOVERY_KEYS = ['code', 'access_token', 'refresh_token', 'type', 'token_type', 'expires_in', 'expires_at'];

export const isSupabaseConfigured = false;

export const SUPABASE_ORIGIN_URL = 'https://atcdrypwompjzsxyaohu.supabase.co';
const activeUrl =
  typeof window !== 'undefined' && window.location?.pathname?.startsWith('/admin')
    ? SUPABASE_ORIGIN_URL
    : SUPABASE_URL;

export const supabase = createClient(activeUrl, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

function getWindowLocation() {
  return typeof window !== 'undefined' ? window.location : null;
}

function paramsFromHash(hash = '') {
  const rawHash = hash.startsWith('#') ? hash.slice(1) : hash;
  if (!rawHash) return new URLSearchParams();
  if (rawHash.startsWith('access_token=') || rawHash.startsWith('code=') || rawHash.startsWith('type=')) {
    return new URLSearchParams(rawHash);
  }
  const queryIndex = rawHash.indexOf('?');
  if (queryIndex >= 0) return new URLSearchParams(rawHash.slice(queryIndex + 1));
  return new URLSearchParams();
}

function allRecoveryParams(location = getWindowLocation()) {
  const searchParams = new URLSearchParams(location?.search || '');
  const hashParams = paramsFromHash(location?.hash || '');
  return { searchParams, hashParams };
}

function isRecoveryParams(params) {
  return params.get('type') === 'recovery' || params.has('code') || (params.has('access_token') && params.has('refresh_token'));
}

export function getAdminRedirectUrl() {
  // CRITICAL: return a URL with NO hash fragment and NO query string.
  //
  // Supabase's auth server appends recovery params as a QUERY STRING
  // (?type=recovery&code=...) or fragment (#access_token=...). If the
  // redirect URL already contains a "#" or "?", those params can land in the
  // wrong place and GoTrue rejects the link with HTTP 500.
  //
  // Instead we land the recovery link at the clean site root and detect the
  // recovery code on app load (see App.jsx) to route to the reset form.
  const url = new URL(window.location.href);
  url.hash = '';
  url.search = '';
  return url.origin + url.pathname;
}

export function hasRecoveryCallback(location = getWindowLocation()) {
  const { searchParams, hashParams } = allRecoveryParams(location);
  return isRecoveryParams(searchParams) || isRecoveryParams(hashParams);
}

/**
 * Supabase implicit-flow links can arrive as a raw hash:
 *   #access_token=...&refresh_token=...&type=recovery
 * Convert that into a HashRouter route that AdminHome can read.
 */
export function getRecoveryRedirectPath(location = getWindowLocation()) {
  const { searchParams, hashParams } = allRecoveryParams(location);
  if (hashParams.get('access_token') && hashParams.get('refresh_token')) {
    return `/admin/reset-password?${hashParams.toString()}`;
  }
  if (isRecoveryParams(searchParams) || isRecoveryParams(hashParams)) return '/admin/reset-password';
  return null;
}

/**
 * The password-recovery code Supabase appends to the redirect URL can land in
 * the query string OR (with a HashRouter) inside the hash fragment. Pull it
 * from wherever it is so we can exchange it for a recovery session.
 */
export function getRecoveryCodeFromUrl(location = getWindowLocation()) {
  const { searchParams, hashParams } = allRecoveryParams(location);
  return searchParams.get('code') || hashParams.get('code') || null;
}

export function getImplicitRecoveryTokensFromUrl(location = getWindowLocation()) {
  const { searchParams, hashParams } = allRecoveryParams(location);
  const params = hashParams.get('access_token') ? hashParams : searchParams;
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  if (!accessToken || !refreshToken) return null;
  return { access_token: accessToken, refresh_token: refreshToken, type: params.get('type') };
}

export function clearRecoveryCredentialsFromUrl() {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  RECOVERY_KEYS.forEach((key) => url.searchParams.delete(key));

  // Anything left in the fragment after normalizeUrlForCleanRouting() ran is
  // either a legacy hash route (already migrated) or leftover auth tokens —
  // either way it should not survive once credentials are cleared.
  const rawHash = url.hash.startsWith('#') ? url.hash.slice(1) : url.hash;
  if (rawHash && (isRecoveryParams(paramsFromHash(rawHash)) || rawHash.startsWith('/'))) {
    url.hash = '';
  }

  window.history.replaceState(window.history.state, document.title, url.toString());
}

const BASE_PATH = (import.meta.env.BASE_URL || '/').replace(/\/+$/, '');

function withBasePath(routePath) {
  const clean = routePath.startsWith('/') ? routePath : `/${routePath}`;
  return `${BASE_PATH}${clean}` || '/';
}

/**
 * One-time URL normalizer for clean (hash-free) routing. Runs before the
 * router boots and rewrites the address bar with history.replaceState:
 *
 *   1. Legacy HashRouter links (".../#/wiki/units/Rares?x=1") become clean
 *      paths (".../wiki/units/Rares?x=1") so old shared links/bookmarks keep
 *      working after the migration off HashRouter.
 *   2. Implicit-flow Supabase recovery fragments
 *      ("#access_token=...&refresh_token=...&type=recovery", optionally
 *      wrapped in a "#/admin/reset-password?..." hash route) are moved into
 *      the query string on /admin/reset-password, where AdminHome exchanges
 *      them for a recovery session.
 *   3. PKCE recovery callbacks ("?type=recovery&code=...") are already clean
 *      and pass through untouched; App.jsx routes them to the reset form.
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
    const hashParams = paramsFromHash(rawHash);
    let next = null;

    if (hashParams.get('access_token') && hashParams.get('refresh_token')) {
      // Implicit-flow recovery may arrive either as a raw token fragment or
      // inside a legacy "#/admin/reset-password?..." hash route — both become
      // a clean reset-password URL with the tokens in the query string.
      next = new URL(url.toString());
      next.hash = '';
      const carried = new URLSearchParams(next.search);
      hashParams.forEach((value, key) => carried.set(key, value));
      next.search = `?${carried.toString()}`;
      next.pathname = withBasePath('/admin/reset-password');
    } else if (rawHash.startsWith('#/')) {
      // Legacy HashRouter link: "#/path?query" -> "/path?query".
      const route = rawHash.slice(1);
      const queryIndex = route.indexOf('?');
      const routePath = queryIndex === -1 ? route : route.slice(0, queryIndex);
      const routeQuery = queryIndex === -1 ? '' : route.slice(queryIndex + 1);

      next = new URL(url.toString());
      next.hash = '';
      next.pathname = withBasePath(routePath || '/');
      if (routeQuery) next.search = `?${routeQuery}`;
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

/** @deprecated Clean URLs replaced HashRouter — kept as an alias for older imports. */
export function normalizeRecoveryCallbackUrlForHashRouter(input) {
  return normalizeUrlForCleanRouting(input);
}


export function isMissingTableError(error) {
  const message = `${error?.message || ''} ${error?.details || ''}`.toLowerCase();
  return error?.code === 'PGRST205' || message.includes('could not find the table') || message.includes('schema cache');
}
