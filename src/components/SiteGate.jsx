import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { APEX_KV_URL } from '../utils/apexClient';
import { notifyAdminAuthChange } from '../hooks/useAdminStatus';

// SITE GATES
// - AccessGate: the Test Realm (staging host) asks for an admin account
//   before anything loads. Logging in here is the same admin login as /admin.
// - MaintenancePage: shown to every non-team visitor while maintenance mode
//   is on. Team members bypass it and see the site (plus a banner).

const PAGE_STYLE = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'radial-gradient(1200px 600px at 50% -10%, rgba(90, 120, 255, 0.14), transparent 60%), #08080d',
  color: '#fff',
  fontFamily: 'inherit',
  padding: '24px',
};

const CARD_STYLE = {
  width: '100%',
  maxWidth: '440px',
  background: 'rgba(16, 16, 24, 0.85)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: '18px',
  padding: '34px 30px',
  boxShadow: '0 30px 80px rgba(0, 0, 0, 0.5)',
  textAlign: 'center',
};

const INPUT_STYLE = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '12px 14px',
  borderRadius: '10px',
  border: '1px solid rgba(255, 255, 255, 0.14)',
  background: 'rgba(255, 255, 255, 0.05)',
  color: '#fff',
  fontSize: '14px',
  marginBottom: '12px',
  outline: 'none',
};

// Shared team sign-in form (used by both gates). A successful login saves
// the credentials, tells the app about them, and optionally jumps straight
// to the admin panel.
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
        return; // the gate lifts by itself
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
      {error && <p role="alert" style={{ color: '#ff9b9b', fontSize: '13px', margin: '0 0 10px' }}>{error}</p>}
      <button
        type="submit"
        disabled={busy}
        style={{
          width: '100%', padding: '12px', borderRadius: '10px', border: 'none', cursor: 'pointer',
          background: busy ? 'rgba(255,255,255,0.15)' : 'linear-gradient(135deg, #5a78ff, #7a5aff)',
          color: '#fff', fontSize: '15px', fontWeight: 600,
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
        <div style={{ fontSize: '40px', marginBottom: '6px' }}>🔒</div>
        <h1 style={{ margin: '0 0 4px', fontSize: '24px' }}>APEX Test Realm</h1>
        <p style={{ margin: '0 0 22px', color: 'rgba(255,255,255,0.6)', fontSize: '14px' }}>
          This is the testing build of APEX Values &amp; WIKI.<br />Sign in with an admin account to enter.
        </p>
        <TeamSignInForm buttonLabel="Enter Test Realm" />
        <p style={{ margin: '18px 0 0', color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>
          No account? The Test Realm is limited to the APEX team.<br />
          Looking for the live site? <a href="https://apexballvalueswiki.github.io/" style={{ color: 'rgba(140,160,255,0.9)' }}>apexballvalueswiki.github.io</a>
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
        <div style={{ fontSize: '40px', marginBottom: '6px' }}>🛠️</div>
        <h1 style={{ margin: '0 0 8px', fontSize: '24px' }}>We&apos;re under maintenance</h1>
        <p style={{ margin: '0 0 8px', color: 'rgba(255,255,255,0.65)', fontSize: '14px' }}>
          APEX Values &amp; WIKI is being worked on right now. Please check back in a bit — everything will be right where you left it.
        </p>
        {message ? <p style={{ margin: '10px 0 0', color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>“{message}”</p> : null}
        {showSignIn ? (
          <div style={{ marginTop: '18px', textAlign: 'left' }}>
            <p style={{ margin: '0 0 8px', color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>Team sign-in — logging in takes you straight to the admin panel, where you can turn maintenance off.</p>
            <TeamSignInForm buttonLabel="Sign in & open Admin" autoNavigateToAdmin />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowSignIn(true)}
            style={{
              marginTop: '18px', background: 'none', border: 'none', cursor: 'pointer',
              color: 'rgba(255,255,255,0.35)', fontSize: '12px', textDecoration: 'underline',
            }}
          >
            Team member? Sign in
          </button>
        )}
        <p style={{ margin: showSignIn ? '14px 0 0' : '6px 0 0', color: 'rgba(255,255,255,0.35)', fontSize: '12px' }}>— the APEX team</p>
      </div>
    </div>
  );
}

export default AccessGate;
