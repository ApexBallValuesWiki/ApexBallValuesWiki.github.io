export function formatCompactNumber(val, decimals = 2) {
  if (val === null || val === undefined || val === '') return '0';
  const num = Number(val);
  if (isNaN(num)) return '0';
  const abs = Math.abs(num);
  const sign = num < 0 ? '-' : '';

  const cleanDecimals = (n) => n.toFixed(decimals).replace(/\.?0+$/, '');

  if (abs >= 1e12) {
    return `${sign}${cleanDecimals(abs / 1e12)}T`;
  }
  if (abs >= 1e9) {
    return `${sign}${cleanDecimals(abs / 1e9)}B`;
  }
  if (abs >= 1e6) {
    return `${sign}${cleanDecimals(abs / 1e6)}M`;
  }
  if (abs >= 1e3) {
    return `${sign}${cleanDecimals(abs / 1e3)}K`;
  }
  return `${sign}${num.toLocaleString()}`;
}

export function formatFullNumber(val) {
  if (val === null || val === undefined || val === '') return '0';
  const num = Number(val);
  if (isNaN(num)) return '0';
  return num.toLocaleString();
}

export function formatRelativeTime(input) {
  const ts = input ? new Date(input).getTime() : NaN;
  if (!Number.isFinite(ts)) return '';
  const diff = Math.max(0, Date.now() - ts);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

// ---- Special non-numeric market markers -------------------------------------
// 'O/C' (one-of-one / overcomp — nobody active can offer for it) and 'N/A'
// (not assignable) are legitimate values for Value, Gems AND Coins. They are
// stored as strings, never coerced to 0. Kept here so the input parsers, the
// form normalizer, the spreadsheet and the display layer all agree.
export const SPECIAL_BASE_VALUES = ['O/C', 'N/A'];

export function isSpecialBaseValue(raw) {
  if (raw === null || raw === undefined) return null;
  const text = String(raw).trim().toUpperCase();
  if (!text) return null;
  const compact = text.replace(/\s+/g, '');
  if (SPECIAL_BASE_VALUES.includes(compact)) return compact;
  const letters = compact.replace(/[^A-Z0-9]/g, '');
  if (letters === 'OC') return 'O/C';
  if (letters === 'NA') return 'N/A';
  return null;
}

// ---- Compact K / M / B / T number entry & site-wide display ----------------
// Editors type "20M" instead of 20000000; visitors see the same suffixes on
// every large number across the site. Both directions live here so the admin
// panel and the public pages can never disagree about what "1.5B" means.
const COMPACT_MULTIPLIERS = { k: 1e3, m: 1e6, b: 1e9, t: 1e12 };

/** Parse `20M`, `1.5B`, `1,000`, `20 000 000`, `$3K` into a number. */
export function parseCompactValue(input) {
  if (input === null || input === undefined) return null;
  const cleaned = String(input).trim().replace(/[$,\s_]/g, '');
  if (!cleaned) return null;
  const suffixed = cleaned.match(/^([+-]?\d*\.?\d+)([kmbt])$/i);
  if (suffixed) {
    const value = Number(suffixed[1]) * COMPACT_MULTIPLIERS[suffixed[2].toLowerCase()];
    return Number.isFinite(value) ? Math.round(value) : null;
  }
  if (/^[+-]?\d*\.?\d+$/.test(cleaned)) {
    const value = Number(cleaned);
    return Number.isFinite(value) ? value : null;
  }
  return null;
}

export function hasCompactSuffix(input) {
  return /^([+-]?\d*\.?\d+)\s*[kmbt]$/i.test(String(input ?? '').trim());
}

/** Parse an admin range such as `1M-2M` or `90-100`. */
export function parseCompactRange(input, { allowSpecial = false } = {}) {
  const raw = String(input ?? '').trim();
  if (!raw) return { min: '', max: '', valid: false };
  // O/C and N/A are whole-field markers: no range applies, so the max is
  // always cleared. Only value editors opt in — other callers stay numeric.
  if (allowSpecial) {
    const special = isSpecialBaseValue(raw);
    if (special) return { min: special, max: '', valid: true, special: true };
  }
  const dash = raw.indexOf('-', 1); // skip a leading minus sign
  if (dash === -1) {
    const value = parseCompactValue(raw);
    return { min: value ?? raw, max: '', valid: value !== null };
  }
  const min = parseCompactValue(raw.slice(0, dash));
  const max = parseCompactValue(raw.slice(dash + 1));
  return {
    min: min ?? raw.slice(0, dash).trim(),
    max: max ?? raw.slice(dash + 1).trim(),
    valid: min !== null && max !== null,
  };
}

/** Render a numeric form value as a compact, editable string. */
export function formatRangeForInput(min, max) {
  const special = isSpecialBaseValue(min);
  if (special) return special; // a marker has no range — ignore any stale max
  const low = parseCompactValue(min);
  const high = parseCompactValue(max);
  const lowText = low === null ? (min ?? '') : formatCompactNumber(low);
  if (high === null || high === '' || high === undefined) return String(lowText);
  const highText = formatCompactNumber(high);
  return `${lowText}-${highText}`;
}

/**
 * One formatter for every numeric surface on the site. Large values collapse
 * to K/M/B/T; small values keep locale grouping. `full` is opt-in for exact
 * numbers (tooltips, copy-to-clipboard, exports).
 */
export function formatSiteNumber(value, { full = false, decimals = 2 } = {}) {
  if (value === null || value === undefined || value === '') return '0';
  const num = Number(value);
  if (!Number.isFinite(num)) return String(value);
  if (full) return num.toLocaleString();
  if (Math.abs(num) >= 1000) return formatCompactNumber(num, decimals);
  return num.toLocaleString();
}
