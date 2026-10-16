// ============================================================================
// Shiny sync engine — shared by the per-save auto-sync (AdminHome) and the
// bulk Shiny Sync panel. Extracted from AdminHome so both paths compute the
// shiny variant EXACTLY the same way (single source of truth).
// ============================================================================
import { isShinyRarity } from '../data/taxonomy';

export const SHINY_DAMAGE_MULTIPLIER = 1.5;

export function findShinyUnit(normalUnit, allUnits) {
  if (!normalUnit || isShinyRarity(normalUnit.rarity)) return null;
  const shinyRarity = `Shiny ${normalUnit.rarity}`;
  return allUnits.find((u) => u.name === normalUnit.name && u.rarity === shinyRarity) || null;
}

export function makeShinySlug(normalSlug) {
  return `shiny-${normalSlug}`;
}

export function scaleDamageStats(stats, multiplier) {
  if (!stats || typeof stats !== 'object') return stats;
  const scaled = {};
  for (const [key, value] of Object.entries(stats)) {
    const keyLower = key.toLowerCase();
    const isDamage = keyLower.includes('damage') || keyLower.includes('dps') || keyLower.includes('atk') || keyLower.includes('attack');
    if (isDamage && typeof value === 'string') {
      const parts = value.split('→').map((s) => s.trim());
      if (parts.length === 2) {
        const lo = parseFloat(parts[0]);
        const hi = parseFloat(parts[1]);
        if (!Number.isNaN(lo) && !Number.isNaN(hi)) {
          scaled[key] = `${Math.round(lo * multiplier)} → ${Math.round(hi * multiplier)}`;
          continue;
        }
      }
      const num = parseFloat(value);
      if (!Number.isNaN(num)) {
        scaled[key] = `${Math.round(num * multiplier)}`;
        continue;
      }
    }
    scaled[key] = value;
  }
  return scaled;
}

export function scaleUpgrades(upgrades, multiplier) {
  if (!Array.isArray(upgrades)) return upgrades;
  return upgrades.map((upgrade) => {
    if (!upgrade) return upgrade;
    const scaled = { ...upgrade };
    if (scaled.dpsText && typeof scaled.dpsText === 'string') {
      scaled.dpsText = scaled.dpsText.replace(/(\d+(?:\.\d+)?)/g, (match) => {
        const num = parseFloat(match);
        return Number.isNaN(num) ? match : String(Math.round(num * multiplier));
      });
    }
    if (scaled.attacksText && typeof scaled.attacksText === 'string') {
      scaled.attacksText = scaled.attacksText.replace(/Damage:\s*(\d+(?:\.\d+)?)/gi, (match, num) => `Damage: ${Math.round(parseFloat(num) * multiplier)}`);
    }
    if (scaled.statsText && typeof scaled.statsText === 'string') {
      scaled.statsText = scaled.statsText.replace(/Damage:\s*(\d+(?:\.\d+)?)/gi, (match, num) => `Damage: ${Math.round(parseFloat(num) * multiplier)}`);
    }
    return scaled;
  });
}

/**
 * Build the canonical shiny payload from a normal unit's published wiki
 * payload. Pure function — no React, no state, no network.
 */
export function buildShinyPayload(normalPayload, normalUnit, allUnits) {
  if (!normalUnit || isShinyRarity(normalUnit.rarity)) return null;
  const shinyUnit = findShinyUnit(normalUnit, allUnits);
  const shinySlug = shinyUnit ? shinyUnit.slug : makeShinySlug(normalUnit.slug);
  return {
    ...normalPayload,
    slug: shinySlug,
    name: shinyUnit ? shinyUnit.name : normalUnit.name,
    rarity: `Shiny ${normalUnit.rarity}`,
    min_max_stats: scaleDamageStats(normalPayload.min_max_stats, SHINY_DAMAGE_MULTIPLIER),
    upgrades: scaleUpgrades(normalPayload.upgrades, SHINY_DAMAGE_MULTIPLIER),
    updated_at: new Date().toISOString(),
    updated_by: 'shiny-autosync',
    custom_unit: normalPayload.custom_unit || false,
  };
}

/**
 * Compare a published shiny row against what buildShinyPayload would produce
 * from the base row. Returns a list of mismatched field names (empty = in
 * sync). Powers the bulk Shiny Sync scanner.
 */
export function shinyDiff(basePayload, shinyRow, normalUnit, allUnits) {
  const expected = buildShinyPayload(basePayload, normalUnit, allUnits);
  if (!expected) return null; // base is itself shiny / not syncable
  if (!shinyRow) return ['missing']; // no shiny row yet
  const fields = ['name', 'rarity', 'min_max_stats', 'upgrades'];
  return fields.filter((f) => JSON.stringify(expected[f] ?? null) !== JSON.stringify(shinyRow[f] ?? null));
}
