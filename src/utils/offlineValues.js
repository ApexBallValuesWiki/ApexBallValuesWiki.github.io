/**
 * OFFLINE Values mode.
 *
 * A visitor-switchable, persistent preference that makes the Values/WIKI data
 * layer serve the bundled snapshot and the browser's last cached bundle only —
 * no live KV bundle requests and no status polling. Useful on flaky networks,
 * metered connections, or when you want a reproducible set of numbers while
 * researching a trade. Editing/admin publishing is unaffected once the mode
 * is switched back off.
 */
const STORAGE_KEY = 'apex-offline-values-mode-v1';
export const OFFLINE_VALUES_EVENT = 'apex-offline-values-change';

export function isOfflineValuesMode() {
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setOfflineValuesMode(enabled) {
  try {
    if (typeof localStorage !== 'undefined') {
      if (enabled) localStorage.setItem(STORAGE_KEY, 'true');
      else localStorage.removeItem(STORAGE_KEY);
    }
  } catch { /* storage may be blocked — in-memory state still works */ }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(OFFLINE_VALUES_EVENT, { detail: { enabled: !!enabled } }));
  }
  return !!enabled;
}

export function toggleOfflineValuesMode() {
  return setOfflineValuesMode(!isOfflineValuesMode());
}

export function isBrowserOnline() {
  return typeof navigator === 'undefined' || navigator.onLine !== false;
}
