import { useEffect, useState } from 'react';
import { APEX_KV_URL, getAdminHeaders } from '../../utils/apexClient';

// ============================================================================
// ANNOUNCEMENT STUDIO — broadcast real global announcements via the KV worker
// (the old composer only wrote localStorage, so nobody else ever saw them).
// ============================================================================
const ANN_TYPES = [
  { value: 'info', label: 'Info', color: 'var(--c-info)', icon: 'ℹ️' },
  { value: 'warning', label: 'Warning', color: 'var(--c-warning)', icon: '⚠️' },
  { value: 'success', label: 'Success', color: 'var(--c-success)', icon: '✅' },
  { value: 'error', label: 'Urgent', color: 'var(--c-danger)', icon: '🚨' },
];

const ANN_DURATIONS = [
  { mins: 15, label: '15 min' },
  { mins: 60, label: '1 hour' },
  { mins: 360, label: '6 hours' },
  { mins: 1440, label: '24 hours' },
];

function AnnouncementStudio({ onStatus }) {
  const [text, setText] = useState('');
  const [type, setType] = useState('info');
  const [duration, setDuration] = useState(60);
  const [customDuration, setCustomDuration] = useState(false);
  const [sending, setSending] = useState(false);
  const [current, setCurrent] = useState(null);
  const [loadingCurrent, setLoadingCurrent] = useState(true);

  const activeType = ANN_TYPES.find((t) => t.value === type) || ANN_TYPES[0];

  async function fetchCurrent() {
    setLoadingCurrent(true);
    try {
      const res = await fetch(`${APEX_KV_URL}/announcements`).catch(() => null);
      if (res && res.ok) {
        const data = await res.json();
        setCurrent(data && data.message ? data : null);
      } else {
        setCurrent(null);
      }
    } catch {
      setCurrent(null);
    }
    setLoadingCurrent(false);
  }

  useEffect(() => {
    fetchCurrent();
  }, []);

  async function send() {
    const message = text.trim();
    if (!message) {
      onStatus('⚠️ Type an announcement message first.');
      return;
    }
    setSending(true);
    try {
      const res = await fetch(`${APEX_KV_URL}/announcements`, {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify({ message, type, durationMinutes: duration }),
      }).catch(() => null);
      if (res && res.ok) {
        // Instant refresh in THIS browser; everyone else gets it from the
        // worker poll within 30 seconds.
        window.dispatchEvent(new CustomEvent('apex-announcements-updated'));
        onStatus('📢 Announcement broadcast live to every visitor!');
        setText('');
        await fetchCurrent();
      } else {
        const err = res ? await res.json().catch(() => ({})) : {};
        onStatus(`⚠️ Broadcast failed: ${err.error || 'could not reach the database'}`);
      }
    } finally {
      setSending(false);
    }
  }

  async function clear() {
    setSending(true);
    try {
      const res = await fetch(`${APEX_KV_URL}/announcements/clear`, {
        method: 'POST',
        headers: getAdminHeaders(),
      }).catch(() => null);
      if (res && res.ok) {
        window.dispatchEvent(new CustomEvent('apex-announcements-updated'));
        onStatus('📢 Announcement cleared for everyone.');
        await fetchCurrent();
      } else {
        onStatus('⚠️ Clear failed — could not reach the database.');
      }
    } finally {
      setSending(false);
    }
  }

  const expiresIn = current?.expiresAt
    ? Math.max(0, Math.round((new Date(current.expiresAt).getTime() - Date.now()) / 60000))
    : null;

  return (
    <section className="ann-studio">
      <div className="admin-section-head">
        <h2>📢 Announcement Studio</h2>
        <span className="admin-count-badge">{current ? 'LIVE' : 'Idle'}</span>
      </div>
      <p className="admin-muted">Broadcasts appear as the banner at the top of the site for <strong>every visitor</strong> — no deploy needed.</p>

      <div className="ann-grid">
        <div className="ann-composer">
          <label className="admin-field">
            <span>Message ({text.length}/200)</span>
            <textarea
              className="admin-textarea"
              value={text}
              maxLength={200}
              onChange={(e) => setText(e.target.value)}
              placeholder="Example: New units added to the Values list — check the WIKI! 🎉"
              rows={3}
            />
          </label>

          <div className="ann-row">
            <span className="ann-row-label">Type</span>
            <div className="ann-chips">
              {ANN_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  className={type === t.value ? 'ann-chip active' : 'ann-chip'}
                  style={type === t.value ? { borderColor: t.color, color: t.color, background: `color-mix(in srgb, ${t.color} 12%, transparent)` } : undefined}
                  onClick={() => setType(t.value)}
                >
                  {t.icon} {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="ann-row">
            <span className="ann-row-label">Duration</span>
            <div className="ann-chips">
              {ANN_DURATIONS.map((d) => (
                <button
                  key={d.mins}
                  type="button"
                  className={!customDuration && duration === d.mins ? 'ann-chip active' : 'ann-chip'}
                  onClick={() => { setCustomDuration(false); setDuration(d.mins); }}
                >
                  {d.label}
                </button>
              ))}
              <button
                type="button"
                className={customDuration ? 'ann-chip active' : 'ann-chip'}
                onClick={() => setCustomDuration(true)}
              >
                Custom
              </button>
              {customDuration && (
                <input
                  className="admin-text-input ann-custom-mins"
                  type="number"
                  min={1}
                  max={10080}
                  value={duration}
                  onChange={(e) => setDuration(Math.max(1, Number(e.target.value) || 1))}
                />
              )}
            </div>
          </div>

          <div className="admin-actions">
            <button type="button" className="filled" onClick={send} disabled={sending || !text.trim()}>
              {sending ? 'Broadcasting…' : '🚀 Broadcast Now'}
            </button>
            <button type="button" onClick={clear} disabled={sending}>🧹 Clear Live Announcement</button>
          </div>
        </div>

        <div className="ann-side">
          <span className="ann-side-title">Live preview</span>
          <div className="ann-preview" style={{ borderColor: `color-mix(in srgb, ${activeType.color} 45%, transparent)` }}>
            <span className="ann-preview-tag" style={{ color: activeType.color }}>⚡ BROADCAST</span>
            <span className="ann-preview-text">{text.trim() || 'Your announcement will look like this…'}</span>
          </div>

          <span className="ann-side-title">Currently live</span>
          {loadingCurrent ? (
            <p className="admin-muted">Checking…</p>
          ) : current ? (
            <div className="ann-current">
              <p className="ann-current-msg">“{current.message}”</p>
              <button type="button" className="ann-trash" onClick={clear} disabled={sending} title="Delete this announcement for everyone" aria-label="Delete live announcement">🗑️</button>
              <span className="ann-current-meta">
                {ANN_TYPES.find((t) => t.value === current.type)?.icon || 'ℹ️'} {current.type || 'info'} · sent {current.sentAt ? new Date(current.sentAt).toLocaleString() : 'recently'} · expires in {expiresIn} min{current.sentBy ? ` · by ${current.sentBy}` : ''}
              </span>
            </div>
          ) : (
            <p className="admin-muted">No announcement is live right now.</p>
          )}
        </div>
      </div>
    </section>
  );
}

export default AnnouncementStudio;
