// Admin account API — the single front-end surface for the panel's auth
// backend (invites-v3). Everything credential-related goes through here so
// the UI never hand-rolls fetch headers or stores a secret by accident.
import { APEX_KV_URL, getAdminHeaders } from './apexClient';

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = auth
    ? getAdminHeaders()
    : { 'Content-Type': 'application/json' };
  const response = await fetch(`${APEX_KV_URL}${path}`, {
    method,
    headers,
    ...(body ? { body: JSON.stringify(body) } : {}),
    cache: 'no-store',
  }).catch(() => null);
  let data = {};
  try { data = response ? await response.json() : {}; } catch { /* keep empty */ }
  return {
    ok: Boolean(response?.ok),
    status: response?.status ?? 0,
    ...data,
    error: data.error || (response ? '' : 'Could not reach the APEX server. Check your connection.'),
  };
}

/** Owner/admin only. Lists roster members and whether they have a passcode. */
export function listAdminAccounts() {
  return request('/admin/accounts');
}

/**
 * Owner/admin only. Creates a single-use invite link for a roster member.
 * Returns { token, claimPath, expiresAt } — share the link, never the token
 * in a public channel.
 */
export function createAdminInvite(email, ttlMinutes = 60) {
  return request('/admin/invite', { method: 'POST', body: { email, ttlMinutes } });
}

/** Public. Redeems a one-time invite and returns the passcode exactly once. */
export function claimAdminInvite(token) {
  return request('/admin/claim', { method: 'POST', body: { token }, auth: false });
}

/** Owner/admin only. Rotates a member's passcode and revokes old sessions. */
export function resetAdminPasscode(email) {
  return request('/admin/reset-passcode', { method: 'POST', body: { email } });
}

/** One-time first-deploy bootstrap, only if the operator configured it. */
export function bootstrapAdminAccount(secret) {
  return request('/admin/bootstrap', { method: 'POST', body: { secret }, auth: false });
}

/** Sign-in probe used by the gate: parses the worker's actionable error code. */
export async function probeAdminLogin(email, passcode) {
  const response = await fetch(`${APEX_KV_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: passcode }),
    cache: 'no-store',
  }).catch(() => null);
  let data = {};
  try { data = response ? await response.json() : {}; } catch { /* ignore */ }
  let error = data.error || (response ? '' : 'Could not reach the APEX server. Check your connection.');
  // Workers older than 2026-11-02.5 return no code. Translate their generic
  // 404 into the same actionable guidance so a new editor is never stuck.
  if (!data.code && response?.status === 404 && /not found|roster/i.test(error)) {
    error = 'This account has no passcode yet, or the server still needs its 2026-11-02.5 update. Ask an owner for an invite link.';
  }
  return {
    ok: Boolean(response?.ok),
    status: response?.status ?? 0,
    code: data.code || '',
    error,
  };
}
