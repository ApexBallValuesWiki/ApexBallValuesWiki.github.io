import { useEffect, useState, useCallback } from 'react';
import { TEAM_MEMBERS, getTeamRole } from '../utils/teamMembers';

// Fire from anywhere after login/logout to instantly update the Header
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
      const role = getTeamRole(cleanEmail);
      if (role) {
        setState({ loading: false, isAdmin: true, role, email: cleanEmail });
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
