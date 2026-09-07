import { VALUE_OVERRIDES } from '../data/values';
import { GENERATED_VALUE_OVERRIDES } from '../data/generated/units.generated';
import { attacksToLines, linesToAttacks } from './attacks';

export { attacksToLines, linesToAttacks };

export function ensureArray(val) {
  if (Array.isArray(val)) return val;
  if (val && typeof val === 'object') {
    return Object.values(val).filter((item) => item !== null && item !== undefined);
  }
  return [];
}

export function ensureObject(val) {
  if (val && typeof val === 'object' && !Array.isArray(val)) return val;
  return {};
}

export const VALUE_ROLES = ['owner', 'admin_plus', 'admin', 'lead_value_editor', 'value_editor', 'editor'];
export const WIKI_ROLES = ['owner', 'admin_plus', 'admin', 'lead_wiki_editor', 'wiki_editor', 'editor'];
export const FANART_ROLES = ['owner', 'admin_plus', 'admin', 'fanart_editor', 'editor'];

export function canEditValue(role) {
  if (!role) return false;
  return VALUE_ROLES.includes(role.toLowerCase());
}

export function canEditWiki(role) {
  if (!role) return false;
  return WIKI_ROLES.includes(role.toLowerCase());
}

export function canEditFanart(role) {
  if (!role) return false;
  return FANART_ROLES.includes(role.toLowerCase());
}

export function errorMessage(error, fallback = 'Something went wrong. Please try again.') {
  if (!error) return fallback;
  if (typeof error === 'string') return error;
  if (error.message && error.message !== '{}') return error.message;
  if (error.error_description) return error.error_description;
  if (error.error && error.error !== '{}') return error.error;
  if (error.status) return `Request failed (status ${error.status}).`;
  return fallback;
}

export function getFallbackValueData(slug) {
  return VALUE_OVERRIDES[slug] || GENERATED_VALUE_OVERRIDES[slug] || {
    baseValue: 1,
    baseValueMax: null,
    gems: 0,
    coins: 0,
    demand: 'Normal',
    scarcity: 'Standard',
    trend: 'stable',
    notes: '',
  };
}

export function valueRowToForm(row, slug) {
  const fallback = getFallbackValueData(slug);
  return {
    baseValue: row?.base_value ?? fallback.baseValue ?? 1,
    baseValueMax: row?.base_value_max ?? row?.baseValueMax ?? fallback.baseValueMax ?? '',
    gems: row?.gems ?? fallback.gems ?? 0,
    gemsMax: row?.gems_max ?? row?.gemsMax ?? fallback.gemsMax ?? '',
    coins: row?.coins ?? fallback.coins ?? 0,
    coinsMax: row?.coins_max ?? row?.coinsMax ?? fallback.coinsMax ?? '',
    demand: row?.demand ?? fallback.demand ?? 'Normal',
    scarcity: row?.scarcity ?? fallback.scarcity ?? 'Standard',
    trend: row?.trend ?? fallback.trend ?? 'stable',
    notes: row?.notes ?? fallback.notes ?? '',
  };
}

// Special non-numeric base values: 'O/C' (one-of-one / overcomp — nobody
// active can offer for it) and 'N/A' (not assignable). Stored as strings.
export const SPECIAL_BASE_VALUES = ['O/C', 'N/A'];

export function isSpecialBaseValue(raw) {
  const cleaned = String(raw ?? '').trim().toUpperCase().replace(/\s+/g, '');
  return SPECIAL_BASE_VALUES.includes(cleaned) ? cleaned : null;
}

export function normalizeValueForm(data) {
  const gems = data?.gems;
  const coins = data?.coins;
  const gemsMax = data?.gemsMax;
  const coinsMax = data?.coinsMax;
  const special = isSpecialBaseValue(data?.baseValue);
  const specialGems = isSpecialBaseValue(gems);
  const specialCoins = isSpecialBaseValue(coins);
  return {
    baseValue: special || (Number(data?.baseValue) || 0),
    baseValueMax: (data?.baseValueMax !== '' && data?.baseValueMax != null) ? Number(data.baseValueMax) : null,
    gems: specialGems || ((gems !== '' && gems != null) ? Number(gems) : 0),
    gemsMax: specialGems ? null : ((gemsMax !== '' && gemsMax != null) ? Number(gemsMax) : null),
    coins: specialCoins || ((coins !== '' && coins != null) ? Number(coins) : 0),
    coinsMax: specialCoins ? null : ((coinsMax !== '' && coinsMax != null) ? Number(coinsMax) : null),
    demand: data?.demand || 'Normal',
    scarcity: data?.scarcity || 'Standard',
    trend: data?.trend || 'stable',
    notes: data?.notes || '',
  };
}

export function objectToLines(obj) {
  const safe = ensureObject(obj);
  return Object.entries(safe).map(([key, value]) => {
    if (value && typeof value === 'object') return `${key}: ${JSON.stringify(value)}`;
    return `${key}: ${value ?? ''}`;
  }).join('\n');
}

export function linesToObject(text) {
  return String(text || '').split('\n').reduce((acc, line) => {
    const trimmed = line.trim();
    if (!trimmed) return acc;
    const idx = trimmed.indexOf(':');
    if (idx === -1) return acc;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    if (key) acc[key] = value;
    return acc;
  }, {});
}

export function parseCost(raw) {
  const text = String(raw || '').replace(/[$,]/g, '').trim();
  if (!text) return null;
  const mult = text.toUpperCase().endsWith('B') ? 1_000_000_000 : text.toUpperCase().endsWith('M') ? 1_000_000 : text.toUpperCase().endsWith('K') ? 1_000 : 1;
  const numeric = Number(mult === 1 ? text : text.slice(0, -1));
  return Number.isFinite(numeric) ? numeric * mult : null;
}

export function upgradeToForm(upgrade = {}, index = 0) {
  const safeUpgrade = upgrade || {};
  return {
    label: safeUpgrade.label || (index === 0 ? 'Placement' : `Upgrade ${index}`),
    costRaw: safeUpgrade.costRaw || '',
    description: safeUpgrade.description || '',
    cooldown: safeUpgrade.cooldown || '',
    range: safeUpgrade.range || '',
    dpsText: objectToLines(safeUpgrade.dps),
    costPerDps: safeUpgrade.costPerDps || '',
    statsText: objectToLines(safeUpgrade.stats),
    attacksText: attacksToLines(safeUpgrade.attacks),
  };
}

export function formToUpgrade(form = {}, index = 0) {
  return {
    level: index + 1,
    label: form.label || (index === 0 ? 'Placement' : `Upgrade ${index}`),
    isMax: /max/i.test(form.label || ''),
    cost: parseCost(form.costRaw),
    costRaw: form.costRaw || null,
    description: form.description || null,
    cooldown: form.cooldown || null,
    range: form.range || null,
    stats: linesToObject(form.statsText),
    attacks: linesToAttacks(form.attacksText),
    dps: linesToObject(form.dpsText),
    costPerDps: form.costPerDps || null,
  };
}

export function formatObtainText(obtain) {
  if (!obtain) return '';
  if (Array.isArray(obtain)) return obtain.join('\n');
  if (typeof obtain === 'string') return obtain;
  if (typeof obtain === 'object') {
    if (obtain.method && obtain.source) return `${obtain.method} — ${obtain.source}`;
    return Object.entries(obtain).map(([k, v]) => `${k}: ${v}`).join('\n');
  }
  return String(obtain);
}

export function wikiRowToForm(row, unit) {
  const rawObtain = row?.obtain ?? unit?.obtain;
  const rawUpgrades = row?.upgrades || unit?.upgrades;

  return {
    imageUrl: row?.image_url || '',
    description: row?.description ?? unit?.description ?? '',
    type: row?.type ?? unit?.type ?? '',
    rawType: row?.raw_type ?? unit?.rawType ?? '',
    category: row?.category ?? unit?.category ?? '',
    placementLimit: row?.placement_limit ?? unit?.placementLimit ?? '',
    totalCost: row?.total_cost ?? unit?.totalCost ?? '',
    earlyGameRank: row?.early_game_rank ?? unit?.earlyGameRank ?? '',
    lateGameRank: row?.late_game_rank ?? unit?.lateGameRank ?? '',
    passive: row?.passive ?? unit?.passive ?? '',
    ability: row?.ability ?? unit?.ability ?? '',
    synergy: row?.synergy ?? unit?.synergy ?? '',
    obtainText: formatObtainText(rawObtain),
    minMaxStatsText: objectToLines(row?.min_max_stats ?? unit?.minMaxStats ?? {}),
    upgradeForms: ensureArray(rawUpgrades).map(upgradeToForm),
  };
}
