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
  const fallback = { value: [], wiki: [], map: [], crate: [], materials: [] };
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
        materials: Array.isArray(parsed.materials) ? parsed.materials : [],
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
      // Every publishable section needs a key: a falsy write used to drop the
      // materials tombstones, which resurrected deleted materials on next load.
      JSON.stringify(deleted || { value: [], wiki: [], map: [], crate: [], materials: [] })
    );
  } catch {
    console.warn('[APEX Overrides] Local storage quota exceeded while saving deleted overrides.');
  }
}

export function unmarkLocalOverrideDeleted(kind, slug) {
  try {
    const deleted = loadLocalDeletedOverrides() || { value: [], wiki: [], map: [], crate: [], materials: [] };
    if (Array.isArray(deleted[kind]) && deleted[kind].includes(slug)) {
      deleted[kind] = deleted[kind].filter((s) => s !== slug);
      saveLocalDeletedOverrides(deleted);
      const eventName = { value: 'values', wiki: 'wiki', map: 'maps', crate: 'crates', materials: 'materials' }[kind] || kind;
      window.dispatchEvent(new CustomEvent(`apex-${eventName}-updated`));
    }
  } catch { /* ignore */ }
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

/**
 * Bring a slug back to life in this browser: clear BOTH tombstone registries.
 *
 * The old system kept two independent lists (a per-brain 'deleted overrides'
 * registry and a site-wide 'deleted units' mark) and each surface only cleared
 * its own half. That is what made an accidentally deleted unit impossible to
 * recover: the Recycle bin cleared the unit mark, the publish bundle still saw
 * the wiki/value tombstone, and the Create hub kept refusing the slug.
 */
export function clearUnitTombstones(slug) {
  if (!slug) return;
  const deleted = loadLocalDeletedOverrides();
  let changed = false;
  for (const kind of ['wiki', 'value', 'materials', 'map', 'crate']) {
    const list = Array.isArray(deleted[kind]) ? deleted[kind] : [];
    if (list.includes(slug)) {
      deleted[kind] = list.filter((s) => s !== slug);
      changed = true;
    }
  }
  if (changed) {
    saveLocalDeletedOverrides(deleted);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('apex-overrides-deleted-updated'));
    }
  }
  if (loadLocalDeletedUnits().includes(slug)) unmarkLocalUnitDeleted(slug);
  try {
    // A deleted unit also drops its shiny twin.
    if (loadLocalDeletedUnits().includes(`shiny-${slug}`)) unmarkLocalUnitDeleted(`shiny-${slug}`);
  } catch { /* ignore */ }
}

/** true when this browser has hidden the slug (either registry). */
export function isLocalUnitTombstoned(slug) {
  if (!slug) return false;
  if (loadLocalDeletedUnits().includes(slug)) return true;
  const deleted = loadLocalDeletedOverrides();
  return ['wiki', 'value'].some((kind) => (deleted[kind] || []).includes(slug));
}

export function clearLocalDeletedOverrides() {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(LOCAL_DELETED_OVERRIDES_KEY);
  } catch {
    // Ignore
  }
}


// ---- Site-wide deleted units (any unit, incl. built-ins) --------------------
// A deleted unit disappears from Values, WIKI, search, counts — everywhere —
// until restored. Local copy = instant effect + offline; the KV registry
// (bundle.deletedUnits) makes it global.
const DELETED_UNITS_KEY = 'apex-deleted-units-v1';

export function loadLocalDeletedUnits() {
  try {
    const raw = localStorage.getItem(DELETED_UNITS_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function markLocalUnitDeleted(slug) {
  if (!slug) return;
  try {
    const list = loadLocalDeletedUnits();
    if (!list.includes(slug)) {
      list.push(slug);
      localStorage.setItem(DELETED_UNITS_KEY, JSON.stringify(list));
    }
    window.dispatchEvent(new CustomEvent('apex-deleted-units-updated'));
  } catch { /* ignore */ }
}

export function unmarkLocalUnitDeleted(slug) {
  if (!slug) return;
  try {
    const list = loadLocalDeletedUnits().filter((s) => s !== slug);
    localStorage.setItem(DELETED_UNITS_KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent('apex-deleted-units-updated'));
  } catch { /* ignore */ }
}

// ============================================================================
// MATERIALS — a completely separate system. Materials are NOT units: no shiny
// variants, no unit pipeline, no wiki overrides. They have their own local
// lane here and their own KV section ('materials') on the worker.
// ============================================================================
export const LOCAL_MATERIAL_OVERRIDES_KEY = 'apex-local-material-overrides-v1';

export function loadLocalMaterialOverrides() {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(LOCAL_MATERIAL_OVERRIDES_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function saveLocalMaterialOverrides(overrides) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_MATERIAL_OVERRIDES_KEY, JSON.stringify(overrides || {}));
  } catch {
    console.warn('[APEX Overrides] Local storage quota exceeded while saving material overrides.');
  }
}

export function setLocalMaterialOverride(slug, override) {
  if (!slug) return;
  const current = loadLocalMaterialOverrides();
  if (override === null) {
    delete current[slug];
  } else {
    current[slug] = override;
  }
  saveLocalMaterialOverrides(current);
  if (typeof window !== 'undefined') {
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('apex-materials-updated'));
    }, 0);
  }
}
