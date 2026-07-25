export const LOCAL_VALUE_OVERRIDES_KEY = 'apex-local-value-overrides-v1';
export const LOCAL_VALUE_CHANGE_LOG_KEY = 'apex-local-value-change-log-v1';
export const LOCAL_WIKI_OVERRIDES_KEY = 'apex-local-wiki-overrides-v1';

export function loadLocalValueOverrides() {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(LOCAL_VALUE_OVERRIDES_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function saveLocalValueOverrides(overrides) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_VALUE_OVERRIDES_KEY, JSON.stringify(overrides || {}));
  } catch {
    console.warn('[APEX Overrides] Local storage quota exceeded while saving value overrides.');
  }
}

export function setLocalValueOverride(slug, override) {
  if (!slug) return;
  const current = loadLocalValueOverrides();
  if (override === null) {
    delete current[slug];
  } else {
    current[slug] = override;
  }
  saveLocalValueOverrides(current);
  if (typeof window !== 'undefined') {
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('apex-values-updated'));
    }, 0);
  }
}

export function loadLocalWikiOverrides() {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(LOCAL_WIKI_OVERRIDES_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function saveLocalWikiOverrides(overrides) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_WIKI_OVERRIDES_KEY, JSON.stringify(overrides || {}));
  } catch {
    console.warn('[APEX Overrides] Local storage quota exceeded while saving WIKI overrides.');
  }
}

export function setLocalWikiOverride(slug, override) {
  if (!slug) return;
  const current = loadLocalWikiOverrides();
  if (override === null) {
    delete current[slug];
  } else {
    current[slug] = override;
  }
  saveLocalWikiOverrides(current);
  if (typeof window !== 'undefined') {
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('apex-wiki-updated'));
    }, 0);
  }
}

export function loadLocalValueChangeLog() {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_VALUE_CHANGE_LOG_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveLocalValueChangeLog(log) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_VALUE_CHANGE_LOG_KEY, JSON.stringify(Array.isArray(log) ? log : []));
  } catch {
    console.warn('[APEX Overrides] Local storage quota exceeded while saving value log.');
  }
}

export const LOCAL_MAP_OVERRIDES_KEY = 'apex-local-map-overrides-v1';
export const LOCAL_CRATE_OVERRIDES_KEY = 'apex-local-crate-overrides-v1';

export function loadLocalMapOverrides() {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(LOCAL_MAP_OVERRIDES_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function saveLocalMapOverrides(overrides) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_MAP_OVERRIDES_KEY, JSON.stringify(overrides || {}));
  } catch {
    console.warn('[APEX Overrides] Local storage quota exceeded while saving map overrides.');
  }
}

export function setLocalMapOverride(slug, override) {
  if (!slug) return;
  const current = loadLocalMapOverrides();
  if (override === null) {
    delete current[slug];
  } else {
    current[slug] = override;
  }
  saveLocalMapOverrides(current);
  if (typeof window !== 'undefined') {
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('apex-maps-updated'));
    }, 0);
  }
}

export function loadLocalCrateOverrides() {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(LOCAL_CRATE_OVERRIDES_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function saveLocalCrateOverrides(overrides) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_CRATE_OVERRIDES_KEY, JSON.stringify(overrides || {}));
  } catch {
    console.warn('[APEX Overrides] Local storage quota exceeded while saving crate overrides.');
  }
}

export function setLocalCrateOverride(slug, override) {
  if (!slug) return;
  const current = loadLocalCrateOverrides();
  if (override === null) {
    delete current[slug];
  } else {
    current[slug] = override;
  }
  saveLocalCrateOverrides(current);
  if (typeof window !== 'undefined') {
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('apex-crates-updated'));
    }, 0);
  }
}

// Override tombstones (reset/delete queue)
export const LOCAL_DELETED_OVERRIDES_KEY = 'apex-local-overrides-deleted-v1';

export function loadLocalDeletedOverrides() {
  const fallback = { value: [], wiki: [], map: [], crate: [] };
  if (typeof localStorage === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(LOCAL_DELETED_OVERRIDES_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return {
        value: Array.isArray(parsed.value) ? parsed.value : [],
        wiki: Array.isArray(parsed.wiki) ? parsed.wiki : [],
        map: Array.isArray(parsed.map) ? parsed.map : [],
        crate: Array.isArray(parsed.crate) ? parsed.crate : [],
      };
    }
    return fallback;
  } catch {
    return fallback;
  }
}

export function saveLocalDeletedOverrides(deleted) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(
      LOCAL_DELETED_OVERRIDES_KEY,
      JSON.stringify(deleted || { value: [], wiki: [], map: [], crate: [] })
    );
  } catch {
    console.warn('[APEX Overrides] Local storage quota exceeded while saving deleted overrides.');
  }
}

export function markLocalOverrideDeleted(kind, slug) {
  if (!slug || !kind) return;
  const current = loadLocalDeletedOverrides();
  if (current[kind]) {
    if (!current[kind].includes(slug)) {
      current[kind].push(slug);
    }
    saveLocalDeletedOverrides(current);
  }
}

export function clearLocalDeletedOverrides() {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(LOCAL_DELETED_OVERRIDES_KEY);
  } catch {
    // Ignore
  }
}
