import gemsIcon from '../assets/currency/gems.png';
import coinsIcon from '../assets/currency/coins.png';
import { parseCompactValue } from '../utils/formatNumber';

// Trade-calculator currencies (Gems / Coins). They behave like units inside
// the calculator's add-picker: pinned at the top of the dropdown, picked by
// click, amount entered in a dedicated prompt with quick-size buttons.
export const CURRENCIES = [
  {
    slug: 'currency:gems',
    kind: 'gems',
    name: 'Gems',
    icon: gemsIcon,
    quickAmounts: [100, 500, 1000, 5000, 10000, 100000],
  },
  {
    slug: 'currency:coins',
    kind: 'coins',
    name: 'Coins',
    icon: coinsIcon,
    quickAmounts: [1000, 10000, 100000, 1000000, 10000000, 100000000],
  },
];

export const CURRENCY_BY_SLUG = Object.fromEntries(CURRENCIES.map((c) => [c.slug, c]));

export function isCurrencySlug(slug) {
  return slug === 'currency:gems' || slug === 'currency:coins';
}

// Units are capped at 9,999 per row; currencies have NO cap (beyond what a
// JS number can safely hold).
export const UNIT_QTY_CAP = 9999;
export const MAX_CURRENCY_AMOUNT = Number.MAX_SAFE_INTEGER;

export function clampQuantity(slug, raw) {
  if (isCurrencySlug(slug)) {
    // Gems and coins accept K / M / B / T shortcuts, e.g. "20M".
    const parsed = parseCompactValue(raw);
    const n = Math.floor(parsed ?? 0);
    return Math.min(MAX_CURRENCY_AMOUNT, Math.max(0, n));
  }
  const n = Math.floor(Number(raw) || 0);
  return Math.min(UNIT_QTY_CAP, Math.max(1, n));
}
