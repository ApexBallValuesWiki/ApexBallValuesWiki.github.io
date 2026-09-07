import { useEffect, useState, useCallback } from 'react';
import { canEditValue, canEditWiki } from '../utils/adminForms';
import { TEAM_MEMBERS } from '../utils/teamMembers';

const ADMIN_ROLES = new Set([
  'owner',
  'admin_plus',
  'admin',
  'lead_value_editor',
  'lead_wiki_editor',
  'value_editor',
  'wiki_editor',
  'editor',
]);

export function isAdminRole(role) {
  if (!role) return false;
  return ADMIN_ROLES.has(role.toLowerCase()) || canEditValue(role) || canEditWiki(role);
}

// Fire this from anywhere after login/logout to instantly update the Header
export function notifyAdminAuthChange() {
  window.dispatchEvent(new CustomEvent('apex-admin-auth-changed'));
}

const NOT_LOGGED_IN = { loading: false, isAdmin: false, role: null, email: null };

export function useAdminStatus() {
  const [state, setState] = useState({ loading: true, isAdmin: false, role: null, email: null });

  const checkLocal = useCallback(() => {
    const savedEmail = localStorage.getItem('apex-admin-email-v1');
    const savedPasscode = localStorage.getItem('apex-admin-passcode-v1');
    if (savedEmail && savedPasscode) {
      const cleanEmail = savedEmail.trim().toLowerCase();
      const member = TEAM_MEMBERS[cleanEmail];
      if (member) {
        setState({ loading: false, isAdmin: true, role: member.roleKey, email: cleanEmail });
        return true;
      }
    }
    setState(NOT_LOGGED_IN);
    return false;
  }, []);

  useEffect(() => {
    let mounted = true;

    // Initial check
    checkLocal();

    // Listen for auth changes from the SAME tab (custom event)
    const onAuthChanged = () => { if (mounted) checkLocal(); };

    // Listen for storage changes from OTHER tabs
    const onStorage = () => { if (mounted) checkLocal(); };

    window.addEventListener('apex-admin-auth-changed', onAuthChanged);
    window.addEventListener('storage', onStorage);

    return () => {
      mounted = false;
      window.removeEventListener('apex-admin-auth-changed', onAuthChanged);
      window.removeEventListener('storage', onStorage);
    };
  }, [checkLocal]);

  return state;
}
