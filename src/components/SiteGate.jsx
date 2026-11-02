import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { requestAdminSession } from '../utils/apexClient';
import { probeAdminLogin } from '../utils/adminAccounts';
import { saveAdminCredentials } from '../utils/adminSession';
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
      // Prefer the short-lived signed session: on success the browser keeps
      // only an 8-hour HMAC token in sessionStorage and immediately discards
      // the plaintext passcode. No GET carries the secret.
      const signedIn = await requestAdminSession(cleanEmail, passcode.trim());
      if (signedIn) {
        notifyAdminAuthChange();
        if (autoNavigateToAdmin) navigate('/admin');
        return;
      }
      // Legacy worker (no /session endpoint yet): verify through /login,
      // which now returns an actionable error code instead of a generic 401.
      const result = await probeAdminLogin(cleanEmail, passcode.trim());
      if (result.ok) {
        saveAdminCredentials(cleanEmail, passcode.trim());
        notifyAdminAuthChange();
        if (autoNavigateToAdmin) navigate('/admin');
        return;
      }
      setError(result.error || 'Wrong email or passcode. Check your login and try again.');
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
      <p style={{ margin: '14px 0 0', color: '#72727e', fontSize: '11.5px', lineHeight: 1.5 }}>
        First time here? An owner or admin can send you a one-time invite link that creates your passcode. You don&apos;t need to set anything up yourself.
      </p>
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
          No account? Ask an owner for an invite link — it creates your passcode automatically.<br />
          Looking for the live site? <a href="https://apexballvalueswiki.github.io/" style={{ color: '#ffffff', textDecoration: 'underline', textUnderlineOffset: '3px' }}>apexballvalueswiki.github.io</a>
        </p>
      </div>
    </div>
  );
}

export function MaintenancePage({ message }) {
  return (
    <div style={PAGE_STYLE}>
      {/* A static, theme-aware field avoids the old full-screen silk shader
          and stays quiet even when motion is disabled or the device is busy. */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse at 50% 20%, color-mix(in srgb, var(--accent, #ffffff) 8%, transparent), transparent 60%)',
        }}
      />
      <div style={{ ...CARD_STYLE, position: 'relative', zIndex: 2 }}>
        <div style={{
          display: 'inline-block',
          padding: '4px 12px',
          borderRadius: '999px',
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.16)',
          color: '#ffffff',
          fontSize: '11px',
          fontWeight: 800,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          marginBottom: '14px',
        }}>
          Scheduled Maintenance
        </div>
        <h1 style={{ margin: '0 0 8px', fontSize: '24px', fontWeight: 900, letterSpacing: '-0.03em' }}>
          APEX WIKI &amp; Values
        </h1>
        <p style={{ margin: '0 0 22px', color: '#b8b8c2', fontSize: '14px', lineHeight: 1.55 }}>
          {message || 'We are rolling out a live update to the database and values index. Check back shortly.'}
        </p>
        <TeamSignInForm buttonLabel="Sign in & open Admin" autoNavigateToAdmin />
      </div>
    </div>
  );
}

export default AccessGate;
