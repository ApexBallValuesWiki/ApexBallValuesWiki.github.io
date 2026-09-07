import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.dirname(__dirname);

// Read generated units data to fill in missing name/rarity
function loadGeneratedUnits() {
  try {
    const filePath = path.join(ROOT, 'src', 'data', 'generated', 'units.generated.js');
    const content = fs.readFileSync(filePath, 'utf-8');
    // Extract the ALL_UNITS array using eval (safe - this is our own generated file)
    const match = content.match(/export const GENERATED_UNITS\s*=\s*(\[[\s\S]*?\]);/);
    if (match) {
      return eval(match[1]);
    }
  } catch (e) {
    console.warn('Could not load generated units:', e.message);
  }
  return [];
}
const ALL_UNITS = loadGeneratedUnits();

// APEX BUILD-TIME DATA BAKE (SUPABASE FULLY DEPRECATED)
// Pulls the ENTIRE live database (values, WIKI, maps & crates overrides) from
// our serverless Cloudflare Worker + KV store and bakes it into
// `public/overrides/staticOverrides.json`. The runtime app fetches the Worker
// first and gracefully falls back to this baked file if the Worker is ever
// offline — so the site always boots with a known-good snapshot and database
// egress stays at $0.00/month.
const KV_WORKER_URL =
  process.env.APEX_KV_URL ||
  process.env.VITE_APEX_KV_URL ||
  'https://apex-db.apexballtd-admin.workers.dev';

async function fetchKVBundle() {
  const response = await fetch(`${KV_WORKER_URL}/overrides`, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${KV_WORKER_URL}/overrides: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

// The KV bundle may contain BOTH snake_case DB-row payloads (base_value,
// image_url, unlock_requirement) and camelCase bundle entries (baseValue,
// imageUrl, unlockRequirement) depending on which editor wrote them.
// Normalize everything back to the canonical baked shape.
function normalizeValueOverrides(raw = {}) {
  const out = {};
  Object.entries(raw).forEach(([slug, val]) => {
    if (!val || typeof val !== 'object') return;
    out[slug] = {
      baseValue: val.baseValue ?? val.base_value,
      baseValueMax: val.baseValueMax ?? val.base_value_max ?? null,
      gemsMax: val.gemsMax ?? val.gems_max ?? null,
      coinsMax: val.coinsMax ?? val.coins_max ?? null,
      demand: val.demand,
      scarcity: val.scarcity,
      trend: val.trend,
      gems: val.gems,
      coins: val.coins,
      updated_at: val.updated_at,
    };
  });
  return out;
}

function normalizeWikiOverrides(raw = {}) {
  const out = {};
  Object.entries(raw).forEach(([slug, wiki]) => {
    if (!wiki || typeof wiki !== 'object') return;
    out[slug] = {
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
      updated_at: wiki.updated_at,
    };
  });
  return out;
}

function normalizeMapOverrides(raw = {}) {
  const out = {};
  Object.entries(raw).forEach(([slug, map]) => {
    if (!map || typeof map !== 'object') return;
    out[slug] = {
      name: map.name,
      description: map.description,
      difficulty: map.difficulty,
      unlock_requirement: map.unlock_requirement ?? map.unlockRequirement,
      image_url: map.image_url ?? map.imageUrl,
      updated_at: map.updated_at,
    };
  });
  return out;
}

function normalizeCrateOverrides(raw = {}) {
  const out = {};
  Object.entries(raw).forEach(([slug, crate]) => {
    if (!crate || typeof crate !== 'object') return;
    out[slug] = {
      name: crate.name,
      description: crate.description,
      image_url: crate.image_url ?? crate.imageUrl,
      chances: crate.chances,
      obtain: crate.obtain,
      effect: crate.effect,
      updated_at: crate.updated_at,
    };
  });
  return out;
}

async function main() {
  console.log('⏳ Baking live Cloudflare KV data into public/overrides/staticOverrides.json...');
  try {
    const bundle = await fetchKVBundle();

    const valueOverrides = normalizeValueOverrides(bundle?.valueOverrides);
    const wikiOverrides = normalizeWikiOverrides(bundle?.wikiOverrides);
    const mapOverrides = normalizeMapOverrides(bundle?.mapOverrides);
    const crateOverrides = normalizeCrateOverrides(bundle?.crateOverrides);
    const materialOverrides = {};
    for (const [slug, row] of Object.entries(bundle?.materialOverrides || {})) {
      if (row && typeof row === 'object') materialOverrides[slug] = row;
    }

    // Build a units lookup from generated data (has name, rarity, type for ALL units)
    const unitsLookup = {};
    for (const unit of ALL_UNITS) {
      if (unit && unit.slug) {
        unitsLookup[unit.slug] = {
          name: unit.name,
          rarity: unit.rarity,
          type: unit.type,
          category: unit.category,
          raw_type: unit.rawType,
        };
      }
    }

    // Fill in missing name/rarity in wiki overrides from generated units
    for (const [slug, wiki] of Object.entries(wikiOverrides)) {
      if (!wiki.name && unitsLookup[slug]) wiki.name = unitsLookup[slug].name;
      if (!wiki.rarity && unitsLookup[slug]) wiki.rarity = unitsLookup[slug].rarity;
      if (!wiki.type && unitsLookup[slug]) wiki.type = unitsLookup[slug].type;
    }

    const out = {
      timestamp: new Date().toISOString(),
      valueOverrides,
      wikiOverrides,
      mapOverrides,
      crateOverrides,
      materialOverrides,
      unitsLookup,
    };

    const targetPath = path.join(ROOT, 'public', 'overrides', 'staticOverrides.json');
    
    // Safety Threshold Guard:
    // If the fetched bundle has fewer than 10 overrides, but our current backup file has more,
    // do NOT overwrite it! This prevents empty/fresh KV databases from wiping our git backup!
    if (fs.existsSync(targetPath)) {
      try {
        const currentData = JSON.parse(fs.readFileSync(targetPath, 'utf-8'));
        const currentWikiCount = Object.keys(currentData?.wikiOverrides || {}).length;
        const newWikiCount = Object.keys(wikiOverrides || {}).length;
        
        if (newWikiCount < currentWikiCount && newWikiCount < 10) {
          console.warn(`\x1b[33m⚠️ [Bake Safety Guard] Fetched bundle has only ${newWikiCount} WIKI overrides, but current backup has ${currentWikiCount}. Bypassing overwrite to protect your backup data!\x1b[0m`);
          return;
        }
      } catch (err) {
        console.warn('Failed to parse existing overrides file, skipping safety check', err);
      }
    }

    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.writeFileSync(targetPath, JSON.stringify(out, null, 2), 'utf-8');
    console.log(`\x1b[32m✅ Successfully baked data from Cloudflare KV! Wrote ${Object.keys(valueOverrides).length} value, ${Object.keys(wikiOverrides).length} WIKI, ${Object.keys(mapOverrides).length} map and ${Object.keys(crateOverrides).length} crate overrides to ${targetPath}\x1b[0m`);
  } catch (error) {
    console.error('\x1b[31m⚠️ Error baking data from Cloudflare KV, using existing fallback staticOverrides.json\x1b[0m');
    console.error(error.message);
  }
}

main();
