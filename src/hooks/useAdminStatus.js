import { useEffect, useState } from 'react';
import { canEditValue, canEditWiki } from '../utils/adminForms';
import { TEAM_MEMBERS } from '../utils/teamMembers';
import { APEX_KV_URL, getAdminHeaders } from '../utils/apexClient';
import { getAdminCredentials, getAdminSessionToken } from '../utils/adminSession';

const ADMIN_ROLES = new Set(['owner', 'admin_plus', 'admin', 'lead_value_editor', 'lead_wiki_editor', 'value_editor', 'wiki_editor', 'editor']);
export function isAdminRole(role) {
  if (!role) return false;
  return ADMIN_ROLES.has(role.toLowerCase()) || canEditValue(role) || canEditWiki(role);
}

const NOT_LOGGED_IN = { loading: false, isAdmin: false, role: null, email: null };
const CHECK_INTERVAL_MS = 60000;
let verification = null;
let cached = null;

// Shared across all hook instances: Header, mobile nav, announcements and App
// must not each trigger a separate verification on every render. This is a UI
// gate only: public static files still need real server/edge access control.
async function verifySavedCredentials() {
  let email;
  let passcode;
  try {
    const credentials = getAdminCredentials();
    email = credentials.email;
    passcode = credentials.passcode;
  } catch { return NOT_LOGGED_IN; }
  const token = getAdminSessionToken();
  const member = TEAM_MEMBERS[email];
  if (!member || (!token && (!passcode || passcode === 'apex2026'))) return NOT_LOGGED_IN;
  const key = `${email}\0${token || passcode}`;
  if (cached?.key === key && Date.now() < cached.expires) return cached.result;
  if (verification?.key === key) return verification.promise;

  const promise = (async () => {
    // /changes is an existing authenticated endpoint on the currently deployed
    // worker. Check the server, never merely trust a locally stored password.
    const response = await fetch(`${APEX_KV_URL}/changes`, {
      headers: getAdminHeaders(),
      cache: 'no-store',
    }).catch(() => null);
    if (response?.body) response.body.cancel().catch(() => {});
    const result = response?.ok ? { loading: false, isAdmin: true, role: member.roleKey, email } : NOT_LOGGED_IN;
    cached = { key, result, expires: Date.now() + (response?.ok ? CHECK_INTERVAL_MS : 5000) };
    return result;
  })().finally(() => { if (verification?.key === key) verification = null; });
  verification = { key, promise };
  return promise;
}

export function notifyAdminAuthChange() {
  cached = null;
  window.dispatchEvent(new CustomEvent('apex-admin-auth-changed'));
}

export function useAdminStatus() {
  const [state, setState] = useState({ loading: true, isAdmin: false, role: null, email: null });
  useEffect(() => {
    let active = true;
    let generation = 0;
    const refresh = async () => {
      const check = ++generation;
      const result = await verifySavedCredentials();
      if (active && check === generation) setState(result);
    };
    const onStorage = (event) => {
      if (!event.key || event.key === 'apex-admin-email-v1' || event.key === 'apex-admin-passcode-v1' || event.key === 'apex-admin-session-v1') refresh();
    };
    refresh();
    const timer = window.setInterval(refresh, CHECK_INTERVAL_MS);
    window.addEventListener('apex-admin-auth-changed', refresh);
    window.addEventListener('storage', onStorage);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener('apex-admin-auth-changed', refresh);
      window.removeEventListener('storage', onStorage);
    };
  }, []);
  return state;
}
