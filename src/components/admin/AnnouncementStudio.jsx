import { useEffect, useState } from 'react';
import { APEX_KV_URL, fetchActiveAnnouncements, deleteAnnouncement, getAdminHeaders } from '../../utils/apexClient';

// ANNOUNCEMENT STUDIO — broadcast real global announcements via the KV
// worker. Multiple announcements can be live at once (up to 5); each has its
// own type and expiry and can be removed individually.
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
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [type, setType] = useState('info');
  const [duration, setDuration] = useState(60);
  const [customDuration, setCustomDuration] = useState(false);
  const [sending, setSending] = useState(false);
  const [current, setCurrent] = useState([]);
  const [loadingCurrent, setLoadingCurrent] = useState(true);

  const activeType = ANN_TYPES.find((t) => t.value === type) || ANN_TYPES[0];

  async function fetchCurrent() {
    setLoadingCurrent(true);
    try {
      const list = await fetchActiveAnnouncements();
      setCurrent(Array.isArray(list) ? list : []);
    } catch {
      setCurrent([]);
    }
    setLoadingCurrent(false);
  }

  useEffect(() => {
    fetchCurrent();
    const onUpdated = () => fetchCurrent();
    window.addEventListener('apex-announcements-updated', onUpdated);
    return () => window.removeEventListener('apex-announcements-updated', onUpdated);
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
        body: JSON.stringify({ title: title.trim(), message, type, durationMinutes: duration }),
      }).catch(() => null);
      if (res && res.ok) {
        // Instant refresh in THIS browser; everyone else gets it from the
        // worker poll within 30 seconds.
        window.dispatchEvent(new CustomEvent('apex-announcements-updated'));
        onStatus('📢 Announcement broadcast live to every visitor!');
        setTitle('');
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

  async function removeOne(id) {
    setSending(true);
    try {
      const ok = await deleteAnnouncement(id);
      if (ok) {
        window.dispatchEvent(new CustomEvent('apex-announcements-updated'));
        onStatus('📢 Announcement removed for everyone.');
        await fetchCurrent();
      } else {
        onStatus('⚠️ Remove failed — could not reach the database.');
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
        onStatus('📢 All announcements cleared for everyone.');
        await fetchCurrent();
      } else {
        onStatus('⚠️ Clear failed — could not reach the database.');
      }
    } finally {
      setSending(false);
    }
  }

  const expiresIn = (a) => Math.max(0, Math.round((new Date(a.expiresAt).getTime() - Date.now()) / 60000));

  return (
    <section className="ann-studio">
      <div className="admin-section-head">
        <h2>📢 Announcement Studio</h2>
        <span className="admin-count-badge">{current.length}/5 live</span>
      </div>
      <p className="admin-muted">Broadcasts appear as banners at the top of the site for <strong>every visitor</strong> — no deploy needed. Up to 5 can be live at once.</p>

      <div className="ann-grid">
        <div className="ann-composer">
          <label className="admin-field">
            <span>Title (optional, {title.length}/60)</span>
            <input
              className="admin-text-input"
              value={title}
              maxLength={60}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Example: Values Update"
            />
          </label>
          <label className="admin-field">
            <span>Message ({text.length}/200)</span>
            <textarea
              className="admin-textarea"
              value={text}
              maxLength={200}
              onChange={(e) => setText(e.target.value)}
              placeholder="Example: New units added to the Values list — check the WIKI!"
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
            <button type="button" onClick={clear} disabled={sending || !current.length}>🧹 Clear All</button>
          </div>
        </div>

        <div className="ann-side">
          <span className="ann-side-title">Live preview</span>
          <div className="ann-preview" style={{ borderColor: `color-mix(in srgb, ${activeType.color} 45%, transparent)` }}>
            <span className="ann-preview-tag" style={{ color: activeType.color }}>⚡ BROADCAST</span>
            <span className="ann-preview-text">{(title.trim() ? `${title.trim()}: ` : '') + (text.trim() || 'Your announcement will look like this…')}</span>
          </div>

          <span className="ann-side-title">Currently live ({current.length})</span>
          {loadingCurrent ? (
            <p className="admin-muted">Checking…</p>
          ) : current.length ? (
            <div className="ann-live-list">
              {current.map((a) => (
                <div key={a.id} className="ann-current">
                  <p className="ann-current-msg">
                    {ANN_TYPES.find((t) => t.value === a.type)?.icon || 'ℹ️'} {a.title ? <strong>{a.title}: </strong> : null}“{a.message}”
                  </p>
                  <button type="button" className="ann-trash" onClick={() => removeOne(a.id)} disabled={sending} title="Delete this announcement for everyone" aria-label="Delete live announcement">🗑️</button>
                  <span className="ann-current-meta">
                    {a.type || 'info'} · sent {a.sentAt ? new Date(a.sentAt).toLocaleString() : 'recently'} · expires in {expiresIn(a)} min{a.sentBy ? ` · by ${a.sentBy}` : ''}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="admin-muted">No announcements are live right now.</p>
          )}
        </div>
      </div>
    </section>
  );
}

export default AnnouncementStudio;
