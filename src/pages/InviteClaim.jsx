import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { claimAdminInvite } from '../utils/adminAccounts';
import './InviteClaim.css';

/**
 * Public one-time invite redemption. A new editor opens the link an owner sent
 * them and receives a freshly generated strong passcode. The passcode is shown
 * exactly once and is never logged or persisted by the page.
 */
export default function InviteClaim() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [state, setState] = useState({ phase: token ? 'idle' : 'missing', email: '', passcode: '', error: '' });
  const [copied, setCopied] = useState(false);

  async function redeem(value) {
    setState({ phase: 'busy', email: '', passcode: '', error: '' });
    const result = await claimAdminInvite(value);
    if (!result.ok) {
      setState({ phase: 'error', email: '', passcode: '', error: result.error || 'This invite could not be used.' });
      return;
    }
    setState({ phase: 'done', email: result.email, passcode: result.passcode, error: '' });
  }

  useEffect(() => {
    // Redeem immediately on link open: the token is single-use and the user
    // should not have to press anything twice.
    if (token) redeem(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(state.passcode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch { /* clipboard blocked — the text is selectable below */ }
  }

  return (
    <main className="invite-page">
      <div className="invite-card">
        <div className="invite-badge">APEX TEAM ACCESS</div>

        {state.phase === 'idle' || state.phase === 'busy' ? (
          <>
            <h1>Setting up your account…</h1>
            <p className="invite-muted">Generating a unique passcode for you. This takes a moment.</p>
          </>
        ) : null}

        {state.phase === 'missing' ? (
          <>
            <h1>Invite link incomplete</h1>
            <p className="invite-muted">This link is missing its invite token. Ask an owner or admin to send you the full link again.</p>
          </>
        ) : null}

        {state.phase === 'error' ? (
          <>
            <h1>We couldn&apos;t use this link</h1>
            <p className="invite-error" role="alert">{state.error}</p>
            <p className="invite-muted">Invite links work once and expire. Ask an owner for a fresh one.</p>
          </>
        ) : null}

        {state.phase === 'done' ? (
          <>
            <h1>You&apos;re on the team 🎉</h1>
            <p className="invite-muted">
              Signed in as <strong>{state.email}</strong>. Save this passcode now — it will not be shown again.
            </p>
            <div className="invite-passcode-block">
              <span className="invite-passcode-label">YOUR PASSCODE</span>
              <code className="invite-passcode" data-testid="invite-passcode">{state.passcode}</code>
              <button type="button" className="invite-copy" onClick={copy}>{copied ? '✓ Copied' : 'Copy passcode'}</button>
            </div>
            <ol className="invite-steps">
              <li>Copy the passcode above and store it in a password manager.</li>
              <li>Open the admin panel and sign in with your email + passcode.</li>
              <li>If you lose it, ask an owner for a reset — nobody can read it back.</li>
            </ol>
            <Link to="/admin" className="invite-cta">Go to the admin panel →</Link>
          </>
        ) : null}

        {(state.phase === 'error' || state.phase === 'missing') && (
          <Link to="/" className="invite-secondary">Back to the site</Link>
        )}
      </div>
    </main>
  );
}
