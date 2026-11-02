// APEX KV PUBLISH LAYER — full-bundle publish with concurrency protection.
// Extracted from AdminHome so the publish flow is testable and reusable.
import { APEX_KV_URL, getAdminHeaders } from '../../utils/apexClient';
import {
  loadLocalValueOverrides,
  loadLocalWikiOverrides,
  loadLocalMapOverrides,
  loadLocalCrateOverrides,
  loadLocalDeletedOverrides,
} from '../../utils/localOverrides';

let bakedCache = null;
let kvCache = null;
let kvCacheAt = 0;
const KV_CACHE_TTL = 20000;

export async function fetchBakedBackupBundle() {
  if (bakedCache) return bakedCache;
  try {
    const baseUrl = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
    const response = await fetch(`${baseUrl}/overrides/staticOverrides.json`);
    if (response.ok) {
      bakedCache = await response.json();
      return bakedCache;
    }
  } catch (e) {
    console.error('[APEX] Failed to fetch baked backup bundle:', e);
  }
  return null;
}

/** Merge baked + live KV + local drafts (+ local deletions) into one bundle. */
export async function buildFullPublishBundle({ freshKV = false } = {}) {
  let kvData = null;
  const cacheOK = !freshKV && kvCache && Date.now() - kvCacheAt < KV_CACHE_TTL;
  if (cacheOK) {
    kvData = kvCache;
  } else {
    try {
      const res = await fetch(`${APEX_KV_URL}/overrides?_=${Date.now()}`, { headers: getAdminHeaders(), cache: 'no-store' }).catch(() => null);
      if (res && res.ok) {
        kvData = await res.json();
        kvCache = kvData;
        kvCacheAt = Date.now();
      }
    } catch (e) {
      console.warn('[APEX] Failed to fetch current KV bundle:', e);
    }
  }

  // Never publish a partial fallback over the live shared database.
  if (!kvData || typeof kvData.__v !== 'number') throw new Error('A verified, current database snapshot is required to publish. Please reconnect and retry.');

  const bakedData = await fetchBakedBackupBundle() || {};
  const localValues = loadLocalValueOverrides() || {};
  const localWiki = loadLocalWikiOverrides() || {};
  const localMaps = loadLocalMapOverrides() || {};
  const localCrates = loadLocalCrateOverrides() || {};

  const deleted = loadLocalDeletedOverrides() || { value: [], wiki: [], map: [], crate: [] };

  const sections = [
    { key: 'valueOverrides', baked: bakedData.valueOverrides, kv: kvData?.valueOverrides, local: localValues, deletedKey: 'value' },
    { key: 'wikiOverrides', baked: bakedData.wikiOverrides, kv: kvData?.wikiOverrides, local: localWiki, deletedKey: 'wiki' },
    { key: 'mapOverrides', baked: bakedData.mapOverrides, kv: kvData?.mapOverrides, local: localMaps, deletedKey: 'map' },
    { key: 'crateOverrides', baked: bakedData.crateOverrides, kv: kvData?.crateOverrides, local: localCrates, deletedKey: 'crate' },
  ];

  const result = {
    ...kvData, // Preserve sections such as materials and the deletion registry.
    timestamp: new Date().toISOString(),
    __baseVersion: typeof kvData?.__v === 'number' ? kvData.__v : undefined,
  };

  for (const { key, baked, kv, local, deletedKey } of sections) {
    const merged = {
      ...(baked || {}),
      ...(kv || {}),
      ...(local || {}),
    };
    const deletedSlugs = deleted[deletedKey] || [];
    for (const slug of deletedSlugs) {
      if (!local || !(slug in local)) {
        delete merged[slug];
      }
    }
    result[key] = merged;
  }

  return result;
}

/**
 * Publish the full bundle. Pass `baseVersion` for the concurrency guard: the
 * worker rejects with 409 if the database changed underneath us. Pass
 * `forceRestore: true` for intentional full overwrites (restores).
 * Returns { ok, version, conflict }.
 */
export async function pushBundleToCloudflareKV(bundle, { isRestore = false, onStatus } = {}) {
  try {
    const body = { ...bundle };
    if (isRestore) body.__forceRestore = true;

    const response = await fetch(`${APEX_KV_URL}/overrides`, {
      method: 'POST',
      headers: getAdminHeaders(),
      body: JSON.stringify(body),
    });

    if (response.status === 401) {
      onStatus?.('⚠️ Saved locally, but cloud publish failed: Your saved login/passcode is invalid.');
      return { ok: false, conflict: false };
    }

    if (response.status === 409) {
      return { ok: false, conflict: true };
    }

    if (response.ok) {
      const data = await response.json().catch(() => ({}));
      onStatus?.(!data.audit
        ? '⚠️ Database published, but this worker did not report audit status.'
        : data.audit.changeLog === false ? '⚠️ Database published, but the shared audit entry could not be saved. Contact the owner.'
        : isRestore ? '✅ Full database restored.' : '✓ Published to the shared database.');
      return { ok: true, version: data.version, conflict: false, audit: data.audit };
    }

    const errData = await response.json().catch(() => ({}));
    onStatus?.(`⚠️ Saved locally, but cloud publish failed: ${errData.error || `Server error (HTTP ${response.status})`}`);
    return { ok: false, conflict: false };
  } catch (e) {
    onStatus?.(`⚠️ Saved locally, but could not connect to Cloudflare KV database: ${e.message}`);
    return { ok: false, conflict: false };
  }
}
