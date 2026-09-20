// ============================================================================
// HINTS — a shared wallet across all minigames. Earn hints by winning dailies,
// perfect runs and streak milestones; spend them on in-game hints.
// Storage: 'apex-hints-v1' { balance, earnedTotal, spentTotal }.
// ============================================================================

const HINTS_KEY = 'apex-hints-v1';
export const HINTS_EVENT = 'apex-hints-changed';

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(HINTS_KEY) || '');
    return {
      balance: Number.isFinite(raw.balance) ? raw.balance : 0,
      earnedTotal: Number.isFinite(raw.earnedTotal) ? raw.earnedTotal : 0,
      spentTotal: Number.isFinite(raw.spentTotal) ? raw.spentTotal : 0,
    };
  } catch {
    return { balance: 0, earnedTotal: 0, spentTotal: 0 };
  }
}

function save(wallet) {
  try {
    localStorage.setItem(HINTS_KEY, JSON.stringify(wallet));
  } catch { /* storage blocked */ }
  try {
    window.dispatchEvent(new CustomEvent(HINTS_EVENT, { detail: wallet }));
  } catch { /* ignore */ }
}

/** Current balance (cheap — reads storage each call, storage is fast). */
export function hintBalance() {
  return load().balance;
}

/** Grant hints (e.g. on a daily win). Returns the new balance. */
export function grantHint(amount = 1) {
  if (typeof window === 'undefined' || !(amount > 0)) return load().balance;
  const w = load();
  w.balance += Math.round(amount);
  w.earnedTotal += Math.round(amount);
  save(w);
  return w.balance;
}

/** Spend one hint. Returns true when the wallet had one to spend. */
export function spendHint(amount = 1) {
  if (typeof window === 'undefined') return false;
  const w = load();
  if (w.balance < amount) return false;
  w.balance -= Math.round(amount);
  w.spentTotal += Math.round(amount);
  save(w);
  return true;
}
