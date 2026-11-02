import { useCallback, useEffect, useState } from 'react';
import { listAdminAccounts, createAdminInvite, resetAdminPasscode } from '../../utils/adminAccounts';
import './AdminTeamPanel.css';

/**
 * Beginner-friendly account management: replaces editing Cloudflare KV by
 * hand. An owner/admin sends a one-time link; the worker generates a strong
 * passcode and shows it to the new editor exactly once.
 */
export default function AdminTeamPanel({ role }) {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    const res = await listAdminAccounts();
    if (res.ok && Array.isArray(res.accounts)) {
      setAccounts(res.accounts);
      setError('');
    } else {
      setError(res.status === 404
        ? 'The database server still needs its 2026-11-02.5 update. Deploy scripts/cloudflare-proxy-worker.js to enable invite links and resets here.'
        : (res.error || 'Could not load team accounts.'));
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function invite(email) {
    setBusy(email); setResult(null); setError('');
    const res = await createAdminInvite(email, 60);
    if (!res.ok) setError(res.error || 'Could not create an invite.');
    else {
      const link = `${window.location.origin}${res.claimPath}`;
      setResult({
        kind: 'invite', email,
        title: 'Invite link ready — send it privately',
        body: link,
        note: 'Works once, expires in 60 minutes. Opening the link generates the editor\'s passcode. Never post this link publicly.',
      });
    }
    setBusy('');
  }

  async function reset(email) {
    if (!window.confirm(`Reset the passcode for ${email}? Their old passcode and all active sessions will stop working immediately.`)) return;
    setBusy(email); setResult(null); setError('');
    const res = await resetAdminPasscode(email);
    if (!res.ok) setError(res.error || 'Could not reset the passcode.');
    else {
      setResult({
        kind: 'reset', email,
        title: 'New passcode — shown once',
        body: res.passcode,
        note: 'Copy this and give it to the editor privately. It cannot be read back later.',
      });
      await load();
    }
    setBusy('');
  }

  async function copy() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.body);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch { /* the text is selectable */ }
  }

  if (role !== 'owner' && role !== 'admin') return null;

  return (
    <section className="admin-team" aria-label="Team accounts and access">
      <div className="admin-team-head">
        <div>
          <h2>👥 Team &amp; access</h2>
          <p>Give a teammate their login without touching the database. Passcodes are generated randomly and never shared as a default.</p>
        </div>
        <button type="button" className="admin-team-refresh" onClick={load} aria-label="Refresh account list">↻ Refresh</button>
      </div>

      {error && <p className="admin-team-error" role="alert">{error}</p>}

      <div className="admin-team-list">
        {loading && <p className="admin-team-empty">Loading accounts…</p>}
        {!loading && accounts.map((account) => (
          <div className="admin-team-row" key={account.email}>
            <div className="admin-team-person">
              <span className={`admin-team-dot ${account.provisioned ? 'ready' : 'pending'}`} aria-hidden="true" />
              <div>
                <strong>{account.email}</strong>
                <small>{account.role} · {account.provisioned ? 'Ready — has a passcode' : 'Needs setup — no passcode yet'}</small>
              </div>
            </div>
            <div className="admin-team-actions">
              <button type="button" disabled={busy === account.email} onClick={() => invite(account.email)}>
                {busy === account.email ? 'Working…' : '🔗 Invite link'}
              </button>
              <button type="button" disabled={busy === account.email} onClick={() => reset(account.email)}>
                🔄 Reset passcode
              </button>
            </div>
          </div>
        ))}
      </div>

      {result && (
        <div className="admin-team-result">
          <div className="admin-team-result-head">
            <strong>{result.title}</strong>
            <button type="button" onClick={() => { setResult(null); setCopied(false); }} aria-label="Dismiss">✕</button>
          </div>
          <p>{result.email}</p>
          <code>{result.body}</code>
          <div className="admin-team-result-actions">
            <button type="button" onClick={copy}>{copied ? '✓ Copied' : 'Copy'}</button>
            <span>{result.note}</span>
          </div>
        </div>
      )}
      <p className="admin-team-foot">Only the owner can invite or reset admins. Every credential change is written to the admin audit log.</p>
    </section>
  );
}
