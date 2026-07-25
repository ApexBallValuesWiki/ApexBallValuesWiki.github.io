import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { UNIT_VALUES as STATIC_UNIT_VALUES, CONSUMABLE_VALUES as STATIC_CONSUMABLE_VALUES } from '../data/values';
import { computeTradeValue } from '../utils/calculator';
import { isMissingTableError, isSupabaseConfigured, supabase, SUPABASE_URL } from '../utils/supabase';
import { rowToWikiCustomUnit, rowToWikiOverride } from '../utils/wikiOverrides';
import { loadLocalValueOverrides, loadLocalWikiOverrides, loadLocalMapOverrides, loadLocalCrateOverrides, loadLocalDeletedOverrides } from '../utils/localOverrides';
import { PUBLIC_SUPABASE_ENABLED } from '../config/egressControl';
import staticOverridesJson from '../data/overrides/staticOverrides.json';
import { ALL_MAPS } from '../data/maps';
import { CRATES } from '../data/items';

const DataContext = createContext(null);

function rowToValueData(row) {
  if (!row) return null;
  return {
    baseValue: Number(row.base_value ?? row.baseValue ?? 0),
    baseValueMax: row.base_value_max ?? row.baseValueMax ?? null,
    gems: Number(row.gems ?? 1),
    coins: Number(row.coins ?? 1),
    demand: row.demand || 'Normal',
    scarcity: row.scarcity || 'Standard',
    trend: row.trend || 'stable',
    notes: row.notes || '',
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
  
  let isPrvw = false;
  if (localOver) {
    if (!dbRow) {
      isPrvw = true;
    } else {
      isPrvw = Number(localOver.baseValue ?? localOver.base_value ?? 0) !== Number(dbRow.base_value) ||
               Number(localOver.baseValueMax ?? localOver.base_value_max ?? 0) !== Number(dbRow.base_value_max ?? 0) ||
               localOver.demand !== dbRow.demand ||
               localOver.scarcity !== dbRow.scarcity ||
               localOver.trend !== dbRow.trend ||
               localOver.notes !== dbRow.notes;
    }
  }

  let tradeValueMax = null;
  let gemsMax = null;
  let coinsMax = null;
  if (live.baseValueMax && Number(live.baseValueMax) > Number(live.baseValue)) {
    const scale = Number(live.baseValueMax) / Number(live.baseValue);
    tradeValueMax = computeTradeValue(Number(live.baseValueMax), live.demand, live.scarcity);
    gemsMax = computeTradeValue(Math.round(Number(live.gems) * scale), live.demand, live.scarcity);
    coinsMax = computeTradeValue(Math.round(Number(live.coins) * scale), live.demand, live.scarcity);
  }

  return { 
    ...entry, ...live, gems, coins, tradeValue, 
    gemsMax, coinsMax, tradeValueMax,
    hasValue: true, isPrvw, prvw: isPrvw, livePrvwOverride: isPrvw 
  };
}

function applyRealtimeRow(rows, payload) {
  const nextRow = payload.new;
  const oldRow = payload.old;
  const slug = nextRow?.slug || oldRow?.slug;
  if (!slug) return rows;

  if (payload.eventType === 'DELETE') {
    return rows.filter((row) => row.slug !== slug);
  }

  if (!nextRow) return rows;
  const exists = rows.some((row) => row.slug === slug);
  const nextRows = exists
    ? rows.map((row) => (row.slug === slug ? nextRow : row))
    : [nextRow, ...rows];

  return nextRows.sort((a, b) => String(b.updated_at || '').localeCompare(String(a.updated_at || '')));
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

function getLatestTimestamp(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return null;
  let maxTs = '';
  for (const row of rows) {
    const ts = String(row?.updated_at || row?.updatedAt || '');
    if (ts > maxTs) maxTs = ts;
  }
  return maxTs || null;
}

function mergeDeltaRows(currentRows, incomingRows) {
  if (!Array.isArray(incomingRows) || incomingRows.length === 0) return currentRows;
  const map = new Map(currentRows.map((r) => [r.slug, r]));
  for (const inc of incomingRows) {
    if (inc?.slug) map.set(inc.slug, inc);
  }
  return Array.from(map.values()).sort((a, b) =>
    String(b.updated_at || '').localeCompare(String(a.updated_at || ''))
  );
}

function applyRealtimeAndCache(currentRows, payload, cacheKey) {
  const nextRows = applyRealtimeRow(currentRows, payload);
  saveCachedTable(cacheKey, nextRows);
  return nextRows;
}

/**
 * Single source of live Values + WIKI data for the whole app.
 *
 * It loads value_entries and unit_wiki_overrides once, then keeps both stores
 * current with ONE Supabase Realtime channel. Realtime payloads are applied
 * directly to local state instead of refetching whole tables on every change.
 */
export function DataProvider({ children }) {
  const [rows, setRows] = useState(() => {
    const cached = loadCachedTable('apex-cache-value-entries-v1');
    if (cached && cached.length > 0) return cached;
    const staticRows = Object.entries(staticOverridesJson?.valueOverrides || {}).map(([slug, val]) => ({
      slug,
      base_value: val.baseValue,
      base_value_max: val.baseValueMax ?? val.base_value_max ?? null,
      demand: val.demand,
      scarcity: val.scarcity,
      trend: val.trend,
      gems: val.gems,
      coins: val.coins,
      updated_at: val.updated_at || new Date().toISOString(),
    }));
    return staticRows;
  });

  const [wikiRows, setWikiRows] = useState(() => {
    const cached = loadCachedTable('apex-cache-wiki-overrides-v1');
    if (cached && cached.length > 0) return cached;
    const staticRows = Object.entries(staticOverridesJson?.wikiOverrides || {}).map(([slug, wiki]) => ({
      slug,
      name: wiki.name,
      rarity: wiki.rarity,
      image_url: wiki.image_url,
      description: wiki.description,
      type: wiki.type,
      raw_type: wiki.raw_type,
      category: wiki.category,
      placement_limit: wiki.placement_limit,
      total_cost: wiki.total_cost,
      custom_unit: wiki.custom_unit,
      early_game_rank: wiki.early_game_rank,
      late_game_rank: wiki.late_game_rank,
      obtain: wiki.obtain,
      passive: wiki.passive,
      ability: wiki.ability,
      synergy: wiki.synergy,
      min_max_stats: wiki.min_max_stats,
      upgrades: wiki.upgrades,
      updated_at: wiki.updated_at || new Date().toISOString(),
    }));
    return staticRows;
  });
  const [mapRows, setMapRows] = useState(() => {
    const cached = loadCachedTable('apex-cache-map-overrides-v1');
    if (cached && cached.length > 0) return cached;
    const local = loadLocalMapOverrides();
    if (local && Object.keys(local).length > 0) {
      return Object.values(local);
    }
    return [];
  });
  const [crateRows, setCrateRows] = useState(() => {
    const cached = loadCachedTable('apex-cache-crate-overrides-v1');
    if (cached && cached.length > 0) return cached;
    const local = loadLocalCrateOverrides();
    if (local && Object.keys(local).length > 0) {
      return Object.values(local);
    }
    return [];
  });
  const [loading, setLoading] = useState(() => (loadCachedTable('apex-cache-value-entries-v1').length === 0 && isSupabaseConfigured));
  const [wikiLoading, setWikiLoading] = useState(() => (loadCachedTable('apex-cache-wiki-overrides-v1').length === 0 && isSupabaseConfigured));
  const [error, setError] = useState(null);
  const [wikiError, setWikiError] = useState(null);
  const [localValueOverrides, setLocalValueOverrides] = useState(() => loadLocalValueOverrides());
  const [localWikiOverrides, setLocalWikiOverrides] = useState(() => loadLocalWikiOverrides());
  const [localMapOverrides, setLocalMapOverrides] = useState(() => loadLocalMapOverrides());
  const [localCrateOverrides, setLocalCrateOverrides] = useState(() => loadLocalCrateOverrides());
  const [localDeleted, setLocalDeleted] = useState(() => loadLocalDeletedOverrides() || { value: [], wiki: [], map: [], crate: [] });

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
    const onCrates = () => {
      setLocalCrateOverrides(loadLocalCrateOverrides());
      setLocalDeleted(loadLocalDeletedOverrides() || { value: [], wiki: [], map: [], crate: [] });
    };
    window.addEventListener('apex-values-updated', onValues);
    window.addEventListener('apex-wiki-updated', onWiki);
    window.addEventListener('apex-maps-updated', onMaps);
    window.addEventListener('apex-crates-updated', onCrates);
    return () => {
      window.removeEventListener('apex-values-updated', onValues);
      window.removeEventListener('apex-wiki-updated', onWiki);
      window.removeEventListener('apex-maps-updated', onMaps);
      window.removeEventListener('apex-crates-updated', onCrates);
    };
  }, []);

  const lastFetchRef = useRef({ values: 0, wiki: 0, content: 0 });
  const inFlightRef = useRef({ values: false, wiki: false, content: false });
  const channelJoinedRef = useRef(false);

  const canConnectSupabase = useCallback(() => {
    return isSupabaseConfigured && (PUBLIC_SUPABASE_ENABLED || (typeof window !== 'undefined' && window.location?.pathname?.startsWith('/admin')));
  }, []);

  const refresh = useCallback(async ({ force = false } = {}) => {
    if (!canConnectSupabase()) return;
    const now = Date.now();
    if (!force && (inFlightRef.current.values || now - lastFetchRef.current.values < 30000)) return;
    inFlightRef.current.values = true;
    lastFetchRef.current.values = now;
    if (loadCachedTable('apex-cache-value-entries-v1').length === 0) setLoading(true);
    setError(null);

    const currentCached = loadCachedTable('apex-cache-value-entries-v1');
    const latestTs = !force ? getLatestTimestamp(currentCached) : null;
    let query = supabase.from('value_entries').select('*').order('updated_at', { ascending: false });
    if (latestTs) {
      query = query.gt('updated_at', latestTs);
    }
    const { data, error: fetchError } = await query;
    inFlightRef.current.values = false;
    if (fetchError) {
      if (currentCached.length === 0) setRows([]);
      setError(isMissingTableError(fetchError) ? null : fetchError);
    } else if (Array.isArray(data)) {
      const nextRows = latestTs ? mergeDeltaRows(currentCached, data) : data;
      saveCachedTable('apex-cache-value-entries-v1', nextRows);
      setRows(nextRows);
    }
    setLoading(false);
  }, [canConnectSupabase]);

  const refreshWiki = useCallback(async ({ force = false } = {}) => {
    if (!canConnectSupabase()) return;
    const now = Date.now();
    if (!force && (inFlightRef.current.wiki || now - lastFetchRef.current.wiki < 30000)) return;
    inFlightRef.current.wiki = true;
    lastFetchRef.current.wiki = now;
    if (loadCachedTable('apex-cache-wiki-overrides-v1').length === 0) setWikiLoading(true);
    setWikiError(null);

    const currentCached = loadCachedTable('apex-cache-wiki-overrides-v1');
    const latestTs = !force ? getLatestTimestamp(currentCached) : null;
    let query = supabase.from('unit_wiki_overrides').select('*').order('updated_at', { ascending: false });
    if (latestTs) {
      query = query.gt('updated_at', latestTs);
    }
    const { data, error: fetchError } = await query;
    inFlightRef.current.wiki = false;
    if (fetchError) {
      if (currentCached.length === 0) setWikiRows([]);
      setWikiError(isMissingTableError(fetchError) ? null : fetchError);
    } else if (Array.isArray(data)) {
      const nextRows = latestTs ? mergeDeltaRows(currentCached, data) : data;
      saveCachedTable('apex-cache-wiki-overrides-v1', nextRows);
      setWikiRows(nextRows);
    }
    setWikiLoading(false);
  }, [canConnectSupabase]);

  const refreshContent = useCallback(async ({ force = false } = {}) => {
    if (!canConnectSupabase()) return;
    const now = Date.now();
    if (!force && (inFlightRef.current.content || now - lastFetchRef.current.content < 30000)) return;
    inFlightRef.current.content = true;
    lastFetchRef.current.content = now;

    const currentMapCached = loadCachedTable('apex-cache-map-overrides-v1');
    const currentCrateCached = loadCachedTable('apex-cache-crate-overrides-v1');
    const mapTs = !force ? getLatestTimestamp(currentMapCached) : null;
    const crateTs = !force ? getLatestTimestamp(currentCrateCached) : null;

    let mapQuery = supabase.from('map_wiki_overrides').select('*').order('updated_at', { ascending: false });
    if (mapTs) mapQuery = mapQuery.gt('updated_at', mapTs);
    let crateQuery = supabase.from('crate_wiki_overrides').select('*').order('updated_at', { ascending: false });
    if (crateTs) crateQuery = crateQuery.gt('updated_at', crateTs);

    const [maps, crates] = await Promise.all([mapQuery, crateQuery]);
    inFlightRef.current.content = false;
    if (!maps.error && Array.isArray(maps.data)) {
      const nextMaps = mapTs ? mergeDeltaRows(currentMapCached, maps.data) : maps.data;
      saveCachedTable('apex-cache-map-overrides-v1', nextMaps);
      setMapRows(nextMaps);
    }
    if (!crates.error && Array.isArray(crates.data)) {
      const nextCrates = crateTs ? mergeDeltaRows(currentCrateCached, crates.data) : crates.data;
      saveCachedTable('apex-cache-crate-overrides-v1', nextCrates);
      setCrateRows(nextCrates);
    }
  }, [canConnectSupabase]);

  useEffect(() => {
    async function bootstrapStaticData() {
      // =====================================================================
      // SERVERLESS CLOUDFLARE KV MODE (Supabase fully deprecated):
      // When `isSupabaseConfigured` is false we MUST always pull the live KV
      // bundle on every mount — even if an old Supabase table cache
      // (`apex-cache-value-entries-v1`, `apex-cache-wiki-overrides-v1`, …)
      // still exists in localStorage. Otherwise players/admins stay stuck on
      // stale rows forever and never see new edits.
      // =====================================================================
      const forceCloudflareKV = !isSupabaseConfigured;
      const hasCachedValues = loadCachedTable('apex-cache-value-entries-v1').length > 0;
      const hasCachedWiki = loadCachedTable('apex-cache-wiki-overrides-v1').length > 0;

      if (forceCloudflareKV || !hasCachedValues || !hasCachedWiki || !PUBLIC_SUPABASE_ENABLED) {
        try {
          let response = await fetch(`${SUPABASE_URL}/overrides?_=${Date.now()}`).catch(() => null);
          if (!response || !response.ok) {
            const baseUrl = import.meta.env.BASE_URL || '/';
            const cleanBase = baseUrl.replace(/\/$/, '');
            response = await fetch(`${cleanBase}/overrides/staticOverrides.json`).catch(() => null);
          }
          if (response && response.ok) {
            const data = await response.json();

            // In Supabase mode an existing (delta-synced) cache is fresher —
            // keep it. In KV mode the KV/static bundle ALWAYS wins over any
            // stale table cache left behind by the old backend.
            const keepCurrent = (current) =>
              !forceCloudflareKV && PUBLIC_SUPABASE_ENABLED && Array.isArray(current) && current.length > 0;

            setRows((current) => {
              if (keepCurrent(current)) return current;
              const next = Object.entries(data?.valueOverrides || {}).map(([slug, val]) => ({
                slug,
                base_value: val.baseValue ?? val.base_value,
                base_value_max: val.baseValueMax ?? val.base_value_max ?? null,
                demand: val.demand,
                scarcity: val.scarcity,
                trend: val.trend,
                notes: val.notes,
                gems: val.gems,
                coins: val.coins,
                updated_at: val.updated_at || new Date().toISOString(),
              }));
              // Overwrite the stale table cache so the NEXT mount's initial
              // paint is also the fresh KV snapshot, not old Supabase rows.
              if (forceCloudflareKV) saveCachedTable('apex-cache-value-entries-v1', next);
              return next;
            });

            setWikiRows((current) => {
              if (keepCurrent(current)) return current;
              const next = Object.entries(data?.wikiOverrides || {}).map(([slug, wiki]) => ({
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
                custom_unit: wiki.custom_unit ?? wiki.customUnit,
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
              if (forceCloudflareKV) saveCachedTable('apex-cache-wiki-overrides-v1', next);
              return next;
            });

            setMapRows((current) => {
              if (keepCurrent(current)) return current;
              const next = Object.entries(data?.mapOverrides || {}).map(([slug, map]) => ({
                slug,
                name: map.name,
                description: map.description,
                difficulty: map.difficulty,
                unlock_requirement: map.unlock_requirement ?? map.unlockRequirement,
                image_url: map.image_url ?? map.imageUrl,
                updated_at: map.updated_at || new Date().toISOString(),
              }));
              if (forceCloudflareKV) saveCachedTable('apex-cache-map-overrides-v1', next);
              return next;
            });

            setCrateRows((current) => {
              if (keepCurrent(current)) return current;
              const next = Object.entries(data?.crateOverrides || {}).map(([slug, crate]) => ({
                slug,
                name: crate.name,
                description: crate.description,
                image_url: crate.image_url ?? crate.imageUrl,
                chances: crate.chances,
                obtain: crate.obtain,
                effect: crate.effect,
                updated_at: crate.updated_at || new Date().toISOString(),
              }));
              if (forceCloudflareKV) saveCachedTable('apex-cache-crate-overrides-v1', next);
              return next;
            });

            setLoading(false);
            setWikiLoading(false);
          }
        } catch (e) {
          console.warn('Failed to load static fallbacks dynamically', e);
        }
      }
    }
    bootstrapStaticData();
  }, []);

  useEffect(() => {
    refresh();
    refreshWiki();
    refreshContent();
  }, [refresh, refreshWiki, refreshContent]);

  useEffect(() => {
    const isAdminPath = typeof window !== 'undefined' && window.location?.pathname?.startsWith('/admin');
    if (!canConnectSupabase() || !isAdminPath) return undefined;
    const channel = supabase
      .channel('apex_live_data_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'value_entries' }, (payload) => {
        setRows((current) => applyRealtimeAndCache(current, payload, 'apex-cache-value-entries-v1'));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'unit_wiki_overrides' }, (payload) => {
        setWikiRows((current) => applyRealtimeAndCache(current, payload, 'apex-cache-wiki-overrides-v1'));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'map_wiki_overrides' }, (payload) => setMapRows((current) => applyRealtimeAndCache(current, payload, 'apex-cache-map-overrides-v1')))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crate_wiki_overrides' }, (payload) => setCrateRows((current) => applyRealtimeAndCache(current, payload, 'apex-cache-crate-overrides-v1')))
      .subscribe((status) => {
        channelJoinedRef.current = status === 'SUBSCRIBED';
      });
    return () => {
      supabase.removeChannel(channel);
    };
  }, [canConnectSupabase]);

  // Resilience & Egress Debloat: only revalidate on window focus if we have NOT
  // fetched in the last 15 minutes OR if our websocket channel is disconnected!
  useEffect(() => {
    if (!canConnectSupabase()) return undefined;
    const onWake = () => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') {
        const now = Date.now();
        if (!channelJoinedRef.current || now - lastFetchRef.current.values > 15 * 60 * 1000) {
          refresh({ force: true });
          refreshWiki({ force: true });
          refreshContent({ force: true });
        }
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
  }, [canConnectSupabase, refresh, refreshWiki, refreshContent]);

  const rowsBySlug = useMemo(() => new Map(rows.map((row) => [row.slug, row])), [rows]);
  const wikiRowsBySlug = useMemo(() => new Map(wikiRows.map((row) => [row.slug, row])), [wikiRows]);
  const customUnits = useMemo(() => {
    const list = wikiRows.map((row) => {
      if (localDeleted?.wiki?.includes(row.slug)) return null;
      const localOver = localWikiOverrides?.[row.slug];
      const item = rowToWikiCustomUnit(localOver ? { ...row, ...localOver } : row);
      if (item && localOver) {
        item.isPrvw = true;
        item.prvw = true;
        item.livePrvwOverride = true;
      }
      return item;
    }).filter(Boolean);
    Object.entries(localWikiOverrides || {}).forEach(([slug, over]) => {
      if (localDeleted?.wiki?.includes(slug)) return;
      if ((over.customUnit || over.custom_unit) && !list.some((u) => u.slug === slug)) {
        const item = rowToWikiCustomUnit({ slug, ...over, custom_unit: true });
        if (item) {
          item.isPrvw = true;
          item.prvw = true;
          item.livePrvwOverride = true;
          list.push(item);
        }
      }
    });
    return list;
  }, [wikiRows, localWikiOverrides, localDeleted]);

  const customUnitValueEntries = useMemo(
    () =>
      customUnits.map((unit) => ({
        ...unit,
        baseValue: null,
        gems: null,
        coins: null,
        demand: null,
        scarcity: null,
        trend: null,
        tradeValue: null,
        hasValue: false,
      })),
    [customUnits]
  );

  const getWikiOverride = useCallback(
    (slug) => {
      const dbRow = wikiRowsBySlug.get(slug);
      const dbOver = rowToWikiOverride(dbRow, slug);
      const localOver = localWikiOverrides?.[slug];
      if (!localOver) return dbOver;

      let isPrvw = false;
      if (!dbRow) {
        isPrvw = true;
      } else {
        const str = (v) => (v === null || v === undefined ? '' : String(v));
        isPrvw = str(localOver.name) !== str(dbRow.name) ||
                 str(localOver.rarity) !== str(dbRow.rarity) ||
                 str(localOver.description) !== str(dbRow.description) ||
                 str(localOver.type) !== str(dbRow.type) ||
                 str(localOver.rawType) !== str(dbRow.raw_type) ||
                 str(localOver.category) !== str(dbRow.category) ||
                 str(localOver.placementLimit) !== str(dbRow.placement_limit) ||
                 str(localOver.totalCost) !== str(dbRow.total_cost) ||
                 str(localOver.passive) !== str(dbRow.passive) ||
                 str(localOver.ability) !== str(dbRow.ability) ||
                 str(localOver.synergy) !== str(dbRow.synergy) ||
                 JSON.stringify(localOver.obtain || []) !== JSON.stringify(dbRow.obtain || []) ||
                 JSON.stringify(localOver.minMaxStats || {}) !== JSON.stringify(dbRow.min_max_stats || {}) ||
                 JSON.stringify(localOver.upgrades || []) !== JSON.stringify(dbRow.upgrades || []);
      }

      return { ...dbOver, ...localOver, isPrvw, prvw: isPrvw, livePrvwOverride: isPrvw };
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
    const list = [
      ...STATIC_UNIT_VALUES.map(mergeWiki),
      ...customUnitValueEntries.map(mergeWiki),
    ];
    return list.filter((u) => !localDeleted?.wiki?.includes(u.slug) && !localDeleted?.value?.includes(u.slug));
  }, [rowsBySlug, customUnitValueEntries, localValueOverrides, getWikiOverride, localDeleted]);

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

  const maps = useMemo(() => ALL_MAPS.map((item) => {
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
  }), [mapRows, localMapOverrides]);
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
      consumableValues,
      allValueEntries,
      customUnits,
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
      consumableValues,
      allValueEntries,
      customUnits,
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
