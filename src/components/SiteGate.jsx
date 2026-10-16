import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { APEX_KV_URL } from '../utils/apexClient';
import { notifyAdminAuthChange } from '../hooks/useAdminStatus';

const PAGE_STYLE = {
  minHeight: '100dvh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'radial-gradient(900px 460px at 50% -10%, rgba(255, 255, 255, 0.05), transparent 65%), #000000',
  color: '#ffffff',
  fontFamily: 'var(--font)',
  padding: '24px',
};

const CARD_STYLE = {
  width: '100%',
  maxWidth: '430px',
  background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.03), transparent 100%), #060609',
  border: '1px solid rgba(255, 255, 255, 0.14)',
  borderRadius: '20px',
  padding: '36px 32px',
  boxShadow: '0 28px 72px rgba(0, 0, 0, 0.78), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
  textAlign: 'center',
};

const INPUT_STYLE = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '12px 14px',
  borderRadius: '10px',
  border: '1px solid rgba(255, 255, 255, 0.14)',
  background: '#000000',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: 600,
  marginBottom: '12px',
  outline: 'none',
};

export function TeamSignInForm({ buttonLabel = 'Sign in', autoNavigateToAdmin = false }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !passcode) return setError('Enter your admin email and passcode.');
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`${APEX_KV_URL}/changes`, {
        headers: { 'x-admin-email': cleanEmail, 'x-admin-passcode': passcode.trim() },
      }).catch(() => null);
      if (res && res.ok) {
        localStorage.setItem('apex-admin-email-v1', cleanEmail);
        localStorage.setItem('apex-admin-passcode-v1', passcode.trim());
        notifyAdminAuthChange();
        if (autoNavigateToAdmin) navigate('/admin');
        return;
      }
      if (res && res.status === 401) setError('Wrong email or passcode. Check your login and try again.');
      else if (res && res.status === 403) setError('This account is not on the APEX team roster.');
      else setError('Could not reach the login server. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <input
        style={INPUT_STYLE}
        type="email"
        placeholder="Admin email"
        value={email}
        autoComplete="username"
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        style={INPUT_STYLE}
        type="password"
        placeholder="Passcode"
        value={passcode}
        autoComplete="current-password"
        onChange={(e) => setPasscode(e.target.value)}
      />
      {error && <p role="alert" style={{ color: '#f87171', fontSize: '13px', fontWeight: 600, margin: '0 0 12px' }}>{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="filled"
        style={{
          width: '100%',
          padding: '12px 18px',
          borderRadius: '10px',
          border: '1px solid #ffffff',
          cursor: 'pointer',
          background: busy ? 'rgba(255,255,255,0.2)' : '#ffffff',
          color: '#000000',
          fontSize: '14px',
          fontWeight: 800,
          letterSpacing: '0.02em',
        }}
      >
        {busy ? 'Checking…' : buttonLabel}
      </button>
    </form>
  );
}

export function AccessGate() {
  return (
    <div style={PAGE_STYLE}>
      <div style={CARD_STYLE}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 12px',
          borderRadius: '999px',
          border: '1px solid rgba(255,255,255,0.14)',
          background: 'rgba(255,255,255,0.04)',
          fontSize: '11px',
          fontWeight: 800,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: '#b8b8c2',
          marginBottom: '14px',
        }}>
          Restricted Environment
        </div>
        <h1 style={{ margin: '0 0 8px', fontSize: '24px', fontWeight: 900, letterSpacing: '-0.03em' }}>APEX Test Realm</h1>
        <p style={{ margin: '0 0 24px', color: '#b8b8c2', fontSize: '14px', lineHeight: 1.55 }}>
          This is the staging build of APEX Values &amp; WIKI.<br />Sign in with an authorized team account to continue.
        </p>
        <TeamSignInForm buttonLabel="Enter Test Realm" />
        <p style={{ margin: '20px 0 0', color: '#72727e', fontSize: '12px', lineHeight: 1.5 }}>
          No account? The Test Realm is limited to the APEX team.<br />
          Looking for the live site? <a href="https://apexballvalueswiki.github.io/" style={{ color: '#ffffff', textDecoration: 'underline', textUnderlineOffset: '3px' }}>apexballvalueswiki.github.io</a>
        </p>
      </div>
    </div>
  );
}

export function MaintenancePage({ message }) {
  const [showSignIn, setShowSignIn] = useState(false);
  return (
    <div style={PAGE_STYLE}>
      <div style={CARD_STYLE}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 12px',
          borderRadius: '999px',
          border: '1px solid rgba(255,255,255,0.14)',
          background: 'rgba(255,255,255,0.04)',
          fontSize: '11px',
          fontWeight: 800,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: '#b8b8c2',
          marginBottom: '14px',
        }}>
          Scheduled Maintenance
        </div>
        <h1 style={{ margin: '0 0 8px', fontSize: '24px', fontWeight: 900, letterSpacing: '-0.03em' }}>We&apos;re under maintenance</h1>
        <p style={{ margin: '0 0 8px', color: '#b8b8c2', fontSize: '14px', lineHeight: 1.55 }}>
          APEX Values &amp; WIKI is being updated right now. Please check back shortly — everything will be right where you left it.
        </p>
        {message ? <p style={{ margin: '12px 0 0', color: '#ffffff', fontSize: '13px', padding: '10px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>“{message}”</p> : null}
        {showSignIn ? (
          <div style={{ marginTop: '20px', textAlign: 'left' }}>
            <p style={{ margin: '0 0 10px', color: '#b8b8c2', fontSize: '13px' }}>Team sign-in — logging in takes you straight to the admin panel, where you can turn maintenance off.</p>
            <TeamSignInForm buttonLabel="Sign in & open Admin" autoNavigateToAdmin />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowSignIn(true)}
            style={{
              marginTop: '18px', background: 'none', border: 'none', cursor: 'pointer',
              color: '#72727e', fontSize: '12px', textDecoration: 'underline', boxShadow: 'none',
            }}
          >
            Team member? Sign in
          </button>
        )}
        <p style={{ margin: showSignIn ? '14px 0 0' : '6px 0 0', color: '#72727e', fontSize: '12px' }}>— the APEX team</p>
      </div>
    </div>
  );
}

export default AccessGate;
