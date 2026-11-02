// Editor credentials live in sessionStorage, never localStorage, and expire
// after one shift. When the deployed worker supports /session we keep only a
// short-lived HMAC token in memory; the plaintext passcode is dropped.
// Legacy workers fall back to passcode headers so an un-upgraded deployment
// still lets editors work.

const EMAIL_KEY = 'apex-admin-email-v1';
const PASSCODE_KEY = 'apex-admin-passcode-v1';
const TOKEN_KEY = 'apex-admin-session-v1';
const EXPIRES_KEY = 'apex-admin-expires-v1';
const FALLBACK_TTL_MS = 8 * 60 * 60 * 1000;

function store() {
  try { return typeof sessionStorage === 'undefined' ? null : sessionStorage; }
  catch { return null; }
}

function clearLegacyLocalStorage() {
  try {
    localStorage.removeItem(EMAIL_KEY);
    localStorage.removeItem(PASSCODE_KEY);
  } catch { /* storage may be blocked */ }
}

export function saveAdminCredentials(email, passcode) {
  const s = store();
  if (!s) return;
  s.setItem(EMAIL_KEY, String(email || '').trim().toLowerCase());
  s.setItem(PASSCODE_KEY, String(passcode || ''));
  s.setItem(EXPIRES_KEY, String(Date.now() + FALLBACK_TTL_MS));
  s.removeItem(TOKEN_KEY);
  clearLegacyLocalStorage();
}

export function getAdminCredentials() {
  const s = store();
  if (!s) return { email: '', passcode: '' };
  const expires = Number(s.getItem(EXPIRES_KEY) || 0);
  if (expires && Date.now() > expires) {
    clearAdminCredentials();
    return { email: '', passcode: '' };
  }
  return {
    email: (s.getItem(EMAIL_KEY) || '').trim().toLowerCase(),
    passcode: s.getItem(PASSCODE_KEY) || '',
  };
}

export function saveAdminSessionToken(token, expiresAt, email) {
  const s = store();
  if (!s) return;
  s.setItem(TOKEN_KEY, String(token || ''));
  s.setItem(EXPIRES_KEY, String(Number(expiresAt) || Date.now() + FALLBACK_TTL_MS));
  if (email) s.setItem(EMAIL_KEY, String(email).trim().toLowerCase());
  // The passcode is no longer needed on this device once a signed session
  // exists. Remove it so an XSS cannot read a long-lived shared secret.
  s.removeItem(PASSCODE_KEY);
  clearLegacyLocalStorage();
}

export function getAdminSessionToken() {
  const s = store();
  if (!s) return '';
  const expires = Number(s.getItem(EXPIRES_KEY) || 0);
  if (expires && Date.now() > expires) {
    clearAdminCredentials();
    return '';
  }
  return s.getItem(TOKEN_KEY) || '';
}

export function getAdminEmail() {
  const s = store();
  if (!s) return '';
  return (s.getItem(EMAIL_KEY) || '').trim().toLowerCase();
}

export function clearAdminCredentials() {
  const s = store();
  if (s) [EMAIL_KEY, PASSCODE_KEY, TOKEN_KEY, EXPIRES_KEY].forEach((key) => s.removeItem(key));
  clearLegacyLocalStorage();
}

export function hasAdminAuth() {
  return Boolean(getAdminSessionToken() || getAdminCredentials().passcode);
}
