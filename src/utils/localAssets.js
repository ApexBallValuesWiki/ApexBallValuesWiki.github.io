// Public unit artwork used to be served from a third-party Supabase bucket.
// Self-hosting removes an unnecessary cross-origin request (and the visitor IP
// disclosure that comes with it) without changing any editor-facing URL: old
// URLs stored in KV/localStorage are rewritten at render time.

const SUPABASE_PREFIX = 'https://rfeoicbcprziqlcmbjgi.supabase.co/storage/v1/object/public/';

export function localImageName(url) {
  const rest = String(url).slice(SUPABASE_PREFIX.length).split('?')[0];
  const safe = rest.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  return safe.slice(-160);
}

export function resolveImageUrl(url) {
  if (!url || typeof url !== 'string') return url;
  if (!url.startsWith(SUPABASE_PREFIX)) return url;
  const base = import.meta.env?.BASE_URL || '/';
  return `${base.endsWith('/') ? base : `${base}/`}images/units/${localImageName(url)}`;
}
