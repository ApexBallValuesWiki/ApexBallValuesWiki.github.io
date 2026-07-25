const WIKI_IMAGE_CACHE_KEY = 'apex-wiki-image-overrides-v1';
const WIKI_IMAGE_EVENT = 'apex-wiki-image-cache-change';

function emitCacheChange(slug, imageUrl) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(WIKI_IMAGE_EVENT, { detail: { slug, imageUrl } }));
}

export function onWikiImageCacheChange(listener) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(WIKI_IMAGE_EVENT, listener);
  return () => window.removeEventListener(WIKI_IMAGE_EVENT, listener);
}

export function loadCachedWikiImages() {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(WIKI_IMAGE_CACHE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function getCachedWikiImage(slug) {
  return loadCachedWikiImages()[slug] || null;
}

export function saveCachedWikiImage(slug, imageUrl) {
  if (!slug || !imageUrl || typeof localStorage === 'undefined') return;
  try {
    const next = { ...loadCachedWikiImages(), [slug]: imageUrl };
    localStorage.setItem(WIKI_IMAGE_CACHE_KEY, JSON.stringify(next));
  } catch (error) {
    if (error?.name === 'QuotaExceededError' || error?.message?.includes('quota')) {
      try {
        // Prune older cached images or data URLs to make room for the fresh image
        const current = loadCachedWikiImages();
        const pruned = {};
        Object.entries(current).forEach(([k, v]) => {
          if (typeof v === 'string' && !v.startsWith('data:')) pruned[k] = v;
        });
        pruned[slug] = imageUrl;
        localStorage.setItem(WIKI_IMAGE_CACHE_KEY, JSON.stringify(pruned));
      } catch {
        try {
          // If still full, keep strictly only the latest image override
          localStorage.setItem(WIKI_IMAGE_CACHE_KEY, JSON.stringify({ [slug]: imageUrl }));
        } catch {
          console.warn('[APEX Cache] localStorage quota exceeded; keeping WIKI image active in memory for this session.');
        }
      }
    }
  }
  emitCacheChange(slug, imageUrl);
}

export function removeCachedWikiImage(slug) {
  if (!slug || typeof localStorage === 'undefined') return;
  try {
    const next = { ...loadCachedWikiImages() };
    delete next[slug];
    localStorage.setItem(WIKI_IMAGE_CACHE_KEY, JSON.stringify(next));
  } catch {
    console.warn('[APEX Cache] localStorage quota error while removing cached WIKI image.');
  }
  emitCacheChange(slug, null);
}
