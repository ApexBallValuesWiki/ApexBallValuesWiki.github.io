import { useEffect, useMemo, useState } from 'react';
import { fetchChangeLog } from '../../utils/apexClient';

// CHANGE FEED — the shared live database history: every publish, delete,
// announcement and maintenance switch recorded by the worker, with who did
// it and when. Lives in Logs & Info.

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'value', label: 'Values' },
  { id: 'wiki', label: 'WIKI' },
  { id: 'map', label: 'Maps' },
  { id: 'crate', label: 'Crates' },
  { id: 'materials', label: 'Materials' },
  { id: 'announcements', label: 'Announcements' },
  { id: 'maintenance', label: 'Maintenance' },
  { id: 'delete', label: 'Deletes' },
];

const KIND_ICONS = {
  edit: '✏️',
  delete: '🗑️',
  restore: '↩️',
  bundle: '🗄️',
};

function timeAgo(iso) {
  try {
    const ms = Date.now() - new Date(iso).getTime();
    if (!Number.isFinite(ms)) return '';
    const mins = Math.floor(ms / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins} min ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(iso).toLocaleDateString();
  } catch {
    return '';
  }
}

export default function ChangeFeed() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');

  async function load() {
    setLoading(true);
    setError('');
    const list = await fetchChangeLog();
    if (!list.length) setError('No live change history yet — or the worker endpoint is not deployed.');
    setEntries(list);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const visible = useMemo(() => {
    if (filter === 'all') return entries;
    if (filter === 'delete') return entries.filter((e) => e.kind === 'delete' || e.kind === 'restore');
    return entries.filter((e) => e.section === filter);
  }, [entries, filter]);

  return (
    <section className="card change-feed" style={{ marginBottom: '18px' }}>
      <div className="admin-section-head">
        <h2>🗂️ Live Change History</h2>
        <span className="admin-count-badge">{entries.length} recorded</span>
      </div>
      <p className="admin-muted">Every publish, delete, announcement and maintenance switch from the live database — newest first (last 200 events, recorded server-side).</p>

      <div className="ann-chips" style={{ marginBottom: '12px', flexWrap: 'wrap' }}>
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            className={filter === f.id ? 'ann-chip active' : 'ann-chip'}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
        <button type="button" className="ann-chip" onClick={load} disabled={loading}>
          {loading ? 'Loading…' : '🔄 Refresh'}
        </button>
      </div>

      {loading ? (
        <p className="admin-muted">Loading history…</p>
      ) : error && !visible.length ? (
        <p className="admin-muted">⚠️ {error}</p>
      ) : !visible.length ? (
        <p className="admin-muted">Nothing in this category yet.</p>
      ) : (
        <div className="change-feed-list" style={{ maxHeight: '380px', overflowY: 'auto' }}>
          {visible.slice(0, 60).map((e) => (
            <div key={e.id || `${e.at}-${e.detail}`} className="change-feed-row" style={{ display: 'flex', gap: '10px', alignItems: 'baseline', padding: '7px 4px', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: '13px' }}>
              <span title={e.at ? new Date(e.at).toLocaleString() : ''} style={{ whiteSpace: 'nowrap', color: 'rgba(255,255,255,0.45)', minWidth: '72px' }}>{timeAgo(e.at)}</span>
              <span>{KIND_ICONS[e.kind] || '•'}</span>
              <span style={{ flex: 1 }}>
                {e.detail || `${e.kind || 'change'}${e.section ? ` · ${e.section}` : ''}${e.slug ? ` · ${e.slug}` : ''}`}
              </span>
              {e.section && <span className="admin-count-badge" style={{ fontSize: '10px', padding: '1px 7px' }}>{e.section}</span>}
              {e.by && <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', whiteSpace: 'nowrap' }}>{e.by.split('@')[0]}</span>}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
