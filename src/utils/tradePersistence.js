/**
 * Persists Trade Calculator state (Side A / Side B entries) so a trade can
 * be shared via URL or survives a refresh. Encoded compactly for use as a
 * `?trade=` query param (pair with useSearchParams in the component, not
 * window.location.search) and mirrored to localStorage as a
 * fallback/last-session restore.
 */
const STORAGE_KEY = 'apex-trade-calculator-state';

export function encodeState(state) {
  try {
    const json = JSON.stringify(state);
    return btoa(encodeURIComponent(json));
  } catch {
    return null;
  }
}

export function decodeState(encoded) {
  try {
    const json = decodeURIComponent(atob(encoded));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function loadFromLocalStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return null;
}

export function saveToLocalStorage(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore (e.g. storage disabled)
  }
}
