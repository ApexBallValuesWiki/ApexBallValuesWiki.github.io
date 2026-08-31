import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { UNIT_VALUES as STATIC_UNIT_VALUES, CONSUMABLE_VALUES as STATIC_CONSUMABLE_VALUES } from '../data/values';
import { ALL_UNITS, createShinyUnit } from '../data/units';
import { computeTradeValue } from '../utils/calculator';
import { APEX_KV_URL, fetchKvBundle } from '../utils/apexClient';
import { rowToWikiOverride } from '../utils/wikiOverrides';
import { loadLocalValueOverrides, loadLocalWikiOverrides, loadLocalMapOverrides, loadLocalCrateOverrides, loadLocalMaterialOverrides, loadLocalDeletedOverrides, loadLocalDeletedUnits, markLocalUnitDeleted, unmarkLocalUnitDeleted } from '../utils/localOverrides';
import { PUBLIC_LIVE_SYNC_ENABLED } from '../config/egressControl';
import staticOverridesJson from '../data/overrides/staticOverrides.json';
import { ALL_MAPS } from '../data/maps';
import { CRATES, MATERIALS } from '../data/items';

const DataContext = createContext(null);

function rowToValueData(row) {
  if (!row) return null;
  const max = row.base_value_max ?? row.baseValueMax ?? null;
  return {
    baseValue: Number(row.base_value ?? row.baseValue ?? 0),
    baseValueMax: (max !== "" && max != null) ? Number(max) : null,
    gems: Number(row.gems ?? 0),
    coins: Number(row.coins ?? 0),
    gemsMax: row.gems_max ?? row.gemsMax ?? null,
    coinsMax: row.coins_max ?? row.coinsMax ?? null,
    demand: row.demand || "Normal",
    scarcity: row.scarcity || "Standard",
    trend: row.trend || "stable",
    notes: row.notes || "",
    updatedAt: row.updated_at || row.updatedAt || new Date().toISOString(),
    updatedBy: row.updated_by || row.updatedBy,
    liveValue: true,
  };
}

function withLiveValue(entry, rowsBySlug, localValueOverrides = {}) {
  const dbRow = rowsBySlug.get(entry.slug);
  const localOver = localValueOverrides?.[entry.slug];
  if (!dbRow && !localOver) return entry;

  const live = rowToValueData(localOver ? { ...(dbRow || {}), ...localOver } : dbRow);
  if (!live) return entry;
  const tradeValue = computeTradeValue(live.baseValue, live.demand, live.scarcity);
  const gems = computeTradeValue(live.gems, live.demand, live.scarcity);
  const coins = computeTradeValue(live.coins, live.demand, live.scarcity);

  let tradeValueMax = null;
  let gemsMax = null;
  let coinsMax = null;
  if (live.baseValueMax && Number(live.baseValueMax) > Number(live.baseValue)) {
    tradeValueMax = computeTradeValue(Number(live.baseValueMax), live.demand, live.scarcity);
    // Use stored max values if available, otherwise scale proportionally
    const gemsMaxVal = live.gemsMax != null ? Number(live.gemsMax) : Math.round(Number(live.gems) * (Number(live.baseValueMax) / Number(live.baseValue)));
    const coinsMaxVal = live.coinsMax != null ? Number(live.coinsMax) : Math.round(Number(live.coins) * (Number(live.baseValueMax) / Number(live.baseValue)));
    gemsMax = computeTradeValue(gemsMaxVal, live.demand, live.scarcity);
    coinsMax = computeTradeValue(coinsMaxVal, live.demand, live.scarcity);
  }

  return {
    ...entry, ...live, gems, coins, tradeValue,
    gemsMax, coinsMax, tradeValueMax,
    hasValue: true
  };
}

function loadCachedTable(key) {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCachedTable(key, rows) {
  if (typeof localStorage === 'undefined' || !Array.isArray(rows)) return;
  try {
    localStorage.setItem(key, JSON.stringify(rows));
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// KV bundle -> row mappers. The bundle may contain BOTH snake_case DB-row
// payloads (base_value, image_url) and camelCase entries (baseValue,
// imageUrl) depending on which editor wrote them — normalize both.
// ---------------------------------------------------------------------------
function bundleToValueRows(data = {}) {
  return Object.entries(data?.valueOverrides || {}).map(([slug, val]) => ({
    slug,
    base_value: val.baseValue ?? val.base_value,
    base_value_max: val.baseValueMax ?? val.base_value_max ?? null,
    gems_max: val.gemsMax ?? val.gems_max ?? null,
    coins_max: val.coinsMax ?? val.coins_max ?? null,
    demand: val.demand,
    scarcity: val.scarcity,
    trend: val.trend,
    notes: val.notes,
    gems: val.gems,
    coins: val.coins,
    updated_at: val.updated_at || new Date().toISOString(),
  }));
}

function bundleToWikiRows(data = {}) {
  return Object.entries(data?.wikiOverrides || {}).map(([slug, wiki]) => ({
    slug,
    name: wiki.name,
    rarity: wiki.rarity,
    image_url: wiki.image_url ?? wiki.imageUrl,
    description: wiki.description,
    type: wiki.type,
    raw_type: wiki.raw_type ?? wiki.rawType,
    category: wiki.category,
    placement_limit: wiki.placement_limit ?? wiki.placementLimit,
    total_cost: wiki.total_cost ?? wiki.totalCost,
    early_game_rank: wiki.early_game_rank ?? wiki.earlyGameRank,
    late_game_rank: wiki.late_game_rank ?? wiki.lateGameRank,
    obtain: wiki.obtain,
    passive: wiki.passive,
    ability: wiki.ability,
    synergy: wiki.synergy,
    min_max_stats: wiki.min_max_stats ?? wiki.minMaxStats,
    upgrades: wiki.upgrades,
    updated_at: wiki.updated_at || new Date().toISOString(),
  }));
}

function bundleToMaterialRows(data = {}) {
  // MATERIALS ARE NOT UNITS — their own section, their own shape. Nothing
  // here ever flows through the unit/wiki pipeline, so no shiny variants can
  // exist for materials, ever.
  return Object.entries(data?.materialOverrides || {}).map(([slug, row]) => ({
    slug,
    name: row?.name || slug,
    kind: 'material',
    description: row?.description || '',
    effect: row?.effect || '',
    obtain: Array.isArray(row?.obtain) ? row.obtain : [],
    image_url: row?.image_url ?? row?.imageUrl ?? null,
    updated_at: row?.updated_at || null,
  }));
}

function bundleToMapRows(data = {}) {
  return Object.entries(data?.mapOverrides || {}).map(([slug, map]) => ({
    slug,
    name: map.name,
    description: map.description,
    difficulty: map.difficulty,
    unlock_requirement: map.unlock_requirement ?? map.unlockRequirement,
    image_url: map.image_url ?? map.imageUrl,
    updated_at: map.updated_at || new Date().toISOString(),
  }));
}

function bundleToCrateRows(data = {}) {
  return Object.entries(data?.crateOverrides || {}).map(([slug, crate]) => ({
    slug,
    name: crate.name,
    description: crate.description,
    image_url: crate.image_url ?? crate.imageUrl,
    chances: crate.chances,
    obtain: crate.obtain,
    effect: crate.effect,
    updated_at: crate.updated_at || new Date().toISOString(),
  }));
}

/** Fallback: read the baked snapshot shipped with the static bundle. */
async function fetchBakedBundle() {
  const baseUrl = import.meta.env.BASE_URL || '/';
  const cleanBase = baseUrl.replace(/\/$/, '');
  const response = await fetch(`${cleanBase}/overrides/staticOverrides.json`).catch(() => null);
  if (!response || !response.ok) return null;
  try {
    return await response.json();
  } catch {
    return null;
  }
}

const VALUE_CACHE_KEY = 'apex-cache-value-entries-v1';
const WIKI_CACHE_KEY = 'apex-cache-wiki-overrides-v1';
const MAP_CACHE_KEY = 'apex-cache-map-overrides-v1';
const CRATE_CACHE_KEY = 'apex-cache-crate-overrides-v1';

/**
 * Single source of live Values + WIKI data for the whole app.
 *
 * Cloudflare KV mode: the app boots instantly from the baked static snapshot
 * (or the localStorage cache of the last bundle), then pulls the LIVE bundle
 * from the KV worker. Edits published by admins appear for everyone on the
 * next sync — on mount, on tab focus, on reconnect, or via the lightweight
 * polling interval below. No realtime socket required.
 */
export function DataProvider({ children }) {
  const [rows, setRows] = useState(() => {
    const cached = loadCachedTable(VALUE_CACHE_KEY);
    if (cached && cached.length > 0) return cached;
    return bundleToValueRows(staticOverridesJson);
  });

  const [wikiRows, setWikiRows] = useState(() => {
    const cached = loadCachedTable(WIKI_CACHE_KEY);
    if (cached && cached.length > 0) return cached;
    return bundleToWikiRows(staticOverridesJson);
  });
  const [mapRows, setMapRows] = useState(() => {
    const cached = loadCachedTable(MAP_CACHE_KEY);
    if (cached && cached.length > 0) return cached;
    const local = loadLocalMapOverrides();
    if (local && Object.keys(local).length > 0) {
      return Object.values(local);
    }
    return [];
  });
  const [materialRows, setMaterialRows] = useState([]);
  const [crateRows, setCrateRows] = useState(() => {
    const cached = loadCachedTable(CRATE_CACHE_KEY);
    if (cached && cached.length > 0) return cached;
    const local = loadLocalCrateOverrides();
    if (local && Object.keys(local).length > 0) {
      return Object.values(local);
    }
    return [];
  });
  const [loading, setLoading] = useState(false);
  const [wikiLoading, setWikiLoading] = useState(false);
  const [error, setError] = useState(null);
  const [wikiError, setWikiError] = useState(null);
  const [localValueOverrides, setLocalValueOverrides] = useState(() => loadLocalValueOverrides());
  const [localWikiOverrides, setLocalWikiOverrides] = useState(() => loadLocalWikiOverrides());
  const [localMapOverrides, setLocalMapOverrides] = useState(() => loadLocalMapOverrides());
  const [localMaterialOverrides, setLocalMaterialOverrides] = useState(() => loadLocalMaterialOverrides());
  const [localCrateOverrides, setLocalCrateOverrides] = useState(() => loadLocalCrateOverrides());
  const [localDeleted, setLocalDeleted] = useState(() => loadLocalDeletedOverrides() || { value: [], wiki: [], map: [], crate: [] });
  const [localDeletedUnits, setLocalDeletedUnits] = useState(() => loadLocalDeletedUnits());
  const [kvDeletedUnits, setKvDeletedUnits] = useState([]);
  useEffect(() => {
    const reread = () => setLocalDeletedUnits(loadLocalDeletedUnits());
    window.addEventListener('apex-deleted-units-updated', reread);
    return () => window.removeEventListener('apex-deleted-units-updated', reread);
  }, []);

  useEffect(() => {
    const onValues = () => {
      setLocalValueOverrides(loadLocalValueOverrides());
      setLocalDeleted(loadLocalDeletedOverrides() || { value: [], wiki: [], map: [], crate: [] });
    };
    const onWiki = () => {
      setLocalWikiOverrides(loadLocalWikiOverrides());
      setLocalDeleted(loadLocalDeletedOverrides() || { value: [], wiki: [], map: [], crate: [] });
    };
    const onMaps = () => {
      setLocalMapOverrides(loadLocalMapOverrides());
      setLocalDeleted(loadLocalDeletedOverrides() || { value: [], wiki: [], map: [], crate: [] });
    };
    const onMaterials = () => {
      setLocalMaterialOverrides(loadLocalMaterialOverrides());
    };
    const onCrates = () => {
      setLocalCrateOverrides(loadLocalCrateOverrides());
      setLocalDeleted(loadLocalDeletedOverrides() || { value: [], wiki: [], map: [], crate: [] });
    };
    window.addEventListener('apex-values-updated', onValues);
    window.addEventListener('apex-wiki-updated', onWiki);
    window.addEventListener('apex-maps-updated', onMaps);
    window.addEventListener('apex-materials-updated', onMaterials);
    window.addEventListener('apex-crates-updated', onCrates);
    return () => {
      window.removeEventListener('apex-values-updated', onValues);
      window.removeEventListener('apex-wiki-updated', onWiki);
      window.removeEventListener('apex-maps-updated', onMaps);
    window.removeEventListener('apex-materials-updated', onMaterials);
      window.removeEventListener('apex-crates-updated', onCrates);
    };
  }, []);

  const lastFetchRef = useRef(0);
  const inFlightRef = useRef(false);

  // Public visitors sync from the KV worker unless the egress kill switch is
  // on; the admin dashboard always syncs so editors see live data.
  const canSync = useCallback(() => {
    return PUBLIC_LIVE_SYNC_ENABLED || (typeof window !== 'undefined' && window.location?.pathname?.startsWith('/admin'));
  }, []);

  const applyBundle = useCallback((data) => {
    if (!data) return;

    const nextValues = bundleToValueRows(data);
    const nextWiki = bundleToWikiRows(data);
    const nextMaps = bundleToMapRows(data);
    const nextCrates = bundleToCrateRows(data);
    const nextMaterials = bundleToMaterialRows(data);

    // The KV/static bundle ALWAYS wins over any stale localStorage cache so
    // every visitor converges on the newest published snapshot.
    if (Array.isArray(data.deletedUnits)) setKvDeletedUnits(data.deletedUnits);
    setRows(nextValues);
    setWikiRows(nextWiki);
    setMapRows(nextMaps);
    setCrateRows(nextCrates);
    setMaterialRows(nextMaterials);
    saveCachedTable(VALUE_CACHE_KEY, nextValues);
    saveCachedTable(WIKI_CACHE_KEY, nextWiki);
    saveCachedTable(MAP_CACHE_KEY, nextMaps);
    saveCachedTable(CRATE_CACHE_KEY, nextCrates);
    setLoading(false);
    setWikiLoading(false);
  }, []);

  const syncFromKV = useCallback(async ({ force = false } = {}) => {
    if (!canSync()) return;
    const now = Date.now();
    if (!force && (inFlightRef.current || now - lastFetchRef.current < 15000)) return;
    inFlightRef.current = true;
    lastFetchRef.current = now;
    try {
      let data = await fetchKvBundle();
      if (!data) data = await fetchBakedBundle();
      if (data) {
        applyBundle(data);
        setError(null);
        setWikiError(null);
      } else if (!force) {
        // Keep serving whatever we already have — no need to alarm anyone.
        setError(null);
      }
    } catch (e) {
      console.warn('[APEX] KV sync failed:', e?.message);
    } finally {
      inFlightRef.current = false;
    }
  }, [applyBundle, canSync]);

  // Stable public API — AdminHome calls these after publishing edits.
  const refresh = useCallback(async () => syncFromKV({ force: true }), [syncFromKV]);
  const refreshWiki = refresh;
  const refreshContent = refresh;

  // Initial sync on mount: pull the live KV bundle (or baked fallback).
  useEffect(() => {
    syncFromKV({ force: true });
  }, [syncFromKV]);

  // Revalidate when the visitor returns to the tab or comes back online,
  // throttled to one request per minute.
  useEffect(() => {
    if (!canSync()) return undefined;
    const onWake = () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      if (Date.now() - lastFetchRef.current > 60000) {
        syncFromKV({ force: true });
      }
    };
    window.addEventListener('focus', onWake);
    document.addEventListener('visibilitychange', onWake);
    window.addEventListener('online', onWake);
    return () => {
      window.removeEventListener('focus', onWake);
      document.removeEventListener('visibilitychange', onWake);
      window.removeEventListener('online', onWake);
    };
  }, [canSync, syncFromKV]);

  // Lightweight polling while the tab is visible: published edits appear for
  // every visitor within ~2 minutes without any realtime infrastructure.
  useEffect(() => {
    if (!canSync()) return undefined;
    const id = window.setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        syncFromKV({ force: true });
      }
    }, 120000);
    return () => window.clearInterval(id);
  }, [canSync, syncFromKV]);

  // Static roster: slugs shipped in the data files. Any WIKI database row
  // whose slug is NOT here is a unit an editor created at runtime — it is
  // treated as a real unit everywhere (no separate concept).
  const staticSlugs = useMemo(() => new Set(ALL_UNITS.map((u) => u.slug)), []);

  const rowsBySlug = useMemo(() => new Map(rows.map((row) => [row.slug, row])), [rows]);
  const wikiRowsBySlug = useMemo(() => new Map(wikiRows.map((row) => [row.slug, row])), [wikiRows]);

  // Site-wide deleted units: union of the KV registry and this browser's
  // local marks. Deleting a base unit hides its shiny variant too.
  const deletedUnitSlugs = useMemo(() => {
    const set = new Set([...kvDeletedUnits, ...localDeletedUnits]);
    return set;
  }, [kvDeletedUnits, localDeletedUnits]);

  const isUnitDeleted = useCallback(
    (slug) => {
      if (!slug) return false;
      if (deletedUnitSlugs.has(slug)) return true;
      const base = slug.replace(/^shiny-/, '');
      return base !== slug && deletedUnitSlugs.has(base);
    },
    [deletedUnitSlugs]
  );

  // Units created by editors (WIKI rows for slugs outside the static
  // roster). Each gets an auto-generated shiny variant, exactly like the
  // built-in units. Local drafts are included so a just-created unit is
  // visible instantly in this browser.
  const createdUnits = useMemo(() => {
    const clean = (v) => (v === null || v === undefined || v === '' ? null : v);
    const mapRow = (slug, row) => {
      const rarity = clean(row.rarity) || 'Normie';
      const category = clean(row.category) || 'Standard';
      return {
        slug,
        name: clean(row.name) || slug,
        rarity,
        type: clean(row.type) || 'DPS',
        rawType: clean(row.raw_type) || clean(row.type) || '',
        category,
        categories: [category],
        documented: true,
        placementLimit: clean(row.placement_limit),
        totalCost: clean(row.total_cost),
        obtain: Array.isArray(row.obtain) ? row.obtain : [],
        passive: clean(row.passive),
        ability: clean(row.ability),
        synergy: clean(row.synergy),
        upgrades: Array.isArray(row.upgrades) ? row.upgrades : [],
        minMaxStats: row.min_max_stats || {},
        description: clean(row.description) || '',
        imageUrl: clean(row.image_url) || clean(row.imageUrl),
        updatedAt: clean(row.updated_at),
        shiny: false,
      };
    };
    const fromSource = (source) => Object.entries(source || {})
      .filter(([slug, row]) => row && !row.kind && !staticSlugs.has(slug) && !slug.startsWith('shiny-'))
      .map(([slug, row]) => mapRow(slug, row));
    const seen = new Set();
    const bases = [];
    const rowMap = Object.fromEntries(wikiRows.map((r) => [r.slug, r]));
    for (const unit of [...fromSource(localWikiOverrides), ...fromSource(rowMap)]) {
      if (!seen.has(unit.slug)) { seen.add(unit.slug); bases.push(unit); }
    }
    const visible = bases.filter((unit) => !isUnitDeleted(unit.slug));
    return [...visible, ...visible.map(createShinyUnit)];
  }, [wikiRows, localWikiOverrides, staticSlugs, isUnitDeleted]);

  // Editor-created maps: map rows whose slug is outside the static map list.
  const createdMaps = useMemo(() => {
    const staticMapSlugs = new Set(ALL_MAPS.map((m) => m.slug));
    const fromRows = (rows) => (Array.isArray(rows) ? rows : []).filter((r) => r && r.slug && !staticMapSlugs.has(r.slug));
    const seen = new Set();
    const list = [];
    const localList = Object.values(localMapOverrides || {});
    for (const row of [...fromRows(localList), ...fromRows(mapRows)]) {
      if (seen.has(row.slug)) continue;
      seen.add(row.slug);
      list.push({
        slug: row.slug,
        name: row.name || row.slug,
        description: row.description || '',
        difficulty: row.difficulty || '',
        unlockRequirement: row.unlock_requirement ?? row.unlockRequirement ?? '',
        image: row.image_url ?? row.imageUrl ?? row.image ?? null,
        documented: true,
      });
    }
    // Entries this site deleted (KV registry or this browser's pending marks)
    // must disappear from the editor list too, or they look alive here and
    // dead everywhere else.
    return list.filter((m) => !isUnitDeleted(m.slug));
  }, [mapRows, localMapOverrides, isUnitDeleted]);

  // Skins created/edited by editors live as WIKI rows with a `kind` marker
  // so they never pollute unit lists. (Materials used to live here too —
  // they now have their own dedicated system, see materialRowMap.)
  const kindRows = useMemo(() => {
    const rows = {};
    const collect = (source) => Object.entries(source || {}).forEach(([slug, row]) => {
      // Skins live as wiki rows. Materials DO NOT — they have their own
      // dedicated system (see materialRowMap below) and never appear here.
      if (row && row.kind === 'skin') rows[slug] = row;
    });
    collect(localWikiOverrides);
    collect(Object.fromEntries(wikiRows.map((r) => [r.slug, r])));
    return rows;
  }, [wikiRows, localWikiOverrides]);

  const staticMaterialSlugs = useMemo(() => new Set(MATERIALS.map((m) => m.slug)), []);

  // The materials system: EVERY row in the materials lane (local first, then
  // the KV 'materials' section). This is the ONLY source of material data —
  // nothing is derived from wiki/unit rows, so no shiny variants can ever be
  // generated for materials.
  const materialRowMap = useMemo(() => {
    const map = {};
    for (const row of materialRows) if (row && row.slug) map[row.slug] = row;
    for (const row of Object.values(localMaterialOverrides || {})) if (row && row.slug) map[row.slug] = row; // local beats KV
    return map;
  }, [materialRows, localMaterialOverrides]);

  const createdMaterials = useMemo(
    () => Object.values(materialRowMap)
      .filter((row) => row.slug && !staticMaterialSlugs.has(row.slug) && !row.slug.startsWith('shiny-') && !isUnitDeleted(row.slug))
      .map((row) => ({ slug: row.slug, name: row.name || row.slug, kind: 'material', description: row.description || '', effect: row.effect || '', obtain: Array.isArray(row.obtain) ? row.obtain : [], imageUrl: row.image_url ?? row.imageUrl ?? null, documented: true })),
    [materialRowMap, staticMaterialSlugs, isUnitDeleted]
  );

  const createdSkins = useMemo(
    () => Object.entries(kindRows).filter(([, row]) => row.kind === 'skin' && !isUnitDeleted(row.slug || ''))
      .map(([slug, row]) => ({ slug, name: row.name || slug, category: row.category || 'Exclusive', shiny: !!row.shiny, description: row.description || '', imageUrl: row.image_url ?? row.imageUrl ?? null, documented: true })),
    [kindRows, isUnitDeleted]
  );
  const getWikiOverride = useCallback(
    (slug) => {
      const dbRow = wikiRowsBySlug.get(slug);
      const dbOver = rowToWikiOverride(dbRow, slug);
      const localOver = localWikiOverrides?.[slug];
      if (!localOver) return dbOver;

      return { ...dbOver, ...localOver };
    },
    [wikiRowsBySlug, localWikiOverrides]
  );

  const unitValues = useMemo(() => {
    const mergeWiki = (entry) => {
      const withVal = withLiveValue(entry, rowsBySlug, localValueOverrides);
      const wikiOver = getWikiOverride(entry.slug);
      if (wikiOver) {
        const cleanOver = Object.fromEntries(
          Object.entries(wikiOver).filter(([, v]) => v !== undefined)
        );
        return { ...withVal, ...cleanOver };
      }
      return withVal;
    };
    const createdValueEntries = createdUnits.map((unit) => ({
      ...unit,
      baseValue: null, gems: null, coins: null,
      demand: null, scarcity: null, trend: null, tradeValue: null, hasValue: false,
    }));
    const list = [...STATIC_UNIT_VALUES.map(mergeWiki), ...createdValueEntries.map(mergeWiki)];
    // Visibility has ONE source: the site-wide deleted-units registry (KV)
    // unioned with this browser's pending marks (isUnitDeleted). The per-brain
    // wiki/value tombstones are a publish-time mechanism only — reading them
    // here as well is what made a deleted unit look different in every place.
    return list.filter((u) => !isUnitDeleted(u.slug));
  }, [rowsBySlug, createdUnits, localValueOverrides, getWikiOverride, isUnitDeleted]);

  const consumableValues = useMemo(
    () => STATIC_CONSUMABLE_VALUES.map((entry) => withLiveValue(entry, rowsBySlug, localValueOverrides)),
    [rowsBySlug, localValueOverrides]
  );

  const allValueEntries = useMemo(
    () => [
      ...unitValues.map((entry) => ({ ...entry, kind: 'unit' })),
      ...consumableValues.map((entry) => ({ ...entry, kind: 'item' })),
    ],
    [unitValues, consumableValues]
  );

  const getUnitValueBySlug = useCallback(
    (slug) => unitValues.find((entry) => entry.slug === slug),
    [unitValues]
  );

  const getValueEntryBySlug = useCallback(
    (slug) => allValueEntries.find((entry) => entry.slug === slug),
    [allValueEntries]
  );

  const maps = useMemo(() => [...ALL_MAPS, ...createdMaps].map((item) => {
    const row = mapRows.find((entry) => entry.slug === item.slug);
    const localOver = localMapOverrides?.[item.slug];
    if (!row && !localOver) return item;
    const merged = { ...(row || {}), ...(localOver || {}) };
    return {
      ...item,
      ...merged,
      unlockRequirement: merged.unlock_requirement ?? merged.unlockRequirement ?? item.unlockRequirement,
      image: merged.image_url ?? merged.imageUrl ?? item.image,
      documented: true,
    };
  }), [mapRows, localMapOverrides, createdMaps]);
  const crates = useMemo(() => CRATES.map((item) => {
    const row = crateRows.find((entry) => entry.slug === item.slug);
    const localOver = localCrateOverrides?.[item.slug];
    if (!row && !localOver) return item;
    const merged = { ...(row || {}), ...(localOver || {}) };
    return {
      ...item,
      ...merged,
      imageUrl: merged.image_url ?? merged.imageUrl ?? item.imageUrl,
      documented: true,
    };
  }), [crateRows, localCrateOverrides]);

  const value = useMemo(
    () => ({
      rows,
      wikiRows,
      mapRows,
      crateRows,
      maps,
      crates,
      unitValues,
      createdUnits,
      createdMaps,
      createdSkins,
      createdMaterials,
      materialRowMap,
      kindRows,
      deletedUnitSlugs,
      isUnitDeleted,
      consumableValues,
      allValueEntries,
      getUnitValueBySlug,
      getValueEntryBySlug,
      getWikiOverride,
      loading,
      wikiLoading,
      error,
      wikiError,
      refresh,
      refreshWiki,
      refreshContent,
    }),
    [
      rows,
      wikiRows,
      mapRows,
      crateRows,
      maps,
      crates,
      unitValues,
      createdUnits,
      createdMaps,
      createdSkins,
      createdMaterials,
      materialRowMap,
      kindRows,
      deletedUnitSlugs,
      isUnitDeleted,
      consumableValues,
      allValueEntries,
      getUnitValueBySlug,
      getValueEntryBySlug,
      getWikiOverride,
      loading,
      wikiLoading,
      error,
      wikiError,
      refresh,
    ]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) {
    throw new Error('useData must be used within a <DataProvider>');
  }
  return ctx;
}

/** Back-compat shim so existing useLiveValues() callers get the shared data. */
export function useLiveValues() {
  return useData();
}
