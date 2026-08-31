/**
 * Offline Mode — cache wiki/values data for offline browsing
 */

const CACHE_KEY = 'apex-offline-cache-v1';
const CACHE_TIMESTAMP = 'apex-offline-timestamp-v1';

export function cacheForOffline(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    localStorage.setItem(CACHE_TIMESTAMP, Date.now().toString());
  } catch { /* ignore */ }
}

export function loadOfflineCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function getCacheTimestamp() {
  try {
    return Number(localStorage.getItem(CACHE_TIMESTAMP)) || 0;
  } catch { return 0; }
}

export function isOffline() {
  return typeof navigator !== 'undefined' && !navigator.onLine;
}

export function clearOfflineCache() {
  try {
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(CACHE_TIMESTAMP);
  } catch { /* ignore */ }
}

// Auto-cache data when online
export function setupOfflineSync(dataProvider) {
  if (typeof window === 'undefined') return;

  window.addEventListener('online', () => {
    console.log('[APEX] Back online — syncing data');
    if (dataProvider) {
      cacheForOffline(dataProvider());
    }
  });

  window.addEventListener('offline', () => {
    console.log('[APEX] Gone offline — using cached data');
  });
}
