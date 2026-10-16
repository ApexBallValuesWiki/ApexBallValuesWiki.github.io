import { useEffect, useMemo, useState } from 'react';
import { APEX_KV_URL, fetchChangeLog } from '../../utils/apexClient';
import { getTeamMember } from '../../utils/teamMembers';
import Dropdown from '../Dropdown';

// BLAME VIEW — the reimagined Logs: every publish with who/when, and for any
// unit edit a field-level DIFF (before → after) pulled from the per-unit
// history the worker already records. Filters by editor, section and kind.

const SECTION_LABELS = {
  value: 'Values', wiki: 'WIKI', map: 'Maps', crate: 'Crates',
  materials: 'Materials', announcement: 'Announcements', maintenance: 'Maintenance', bundle: 'Database',
};
const KIND_ICONS = { edit: '✏️', delete: '🗑️', create: '✨', restore: '↩️', bundle: '🗄️' };

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
  } catch { return ''; }
}

const who = (email) => getTeamMember(email);

function DiffRow({ section, slug }) {
  const [state, setState] = useState('loading'); // loading | ready | error
  const [records, setRecords] = useState([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch(`${APEX_KV_URL}/history/${section}/${encodeURIComponent(slug)}`);
        if (!r.ok) throw new Error(String(r.status));
        const data = await r.json();
        const rows = Array.isArray(data) ? data : data.history || [];
        if (alive) { setRecords(rows.slice(-6).reverse()); setState('ready'); }
      } catch {
        if (alive) setState('error');
      }
    })();
    return () => { alive = false; };
  }, [section, slug]);

  if (state === 'loading') return <div className="blame-diff-note">Loading history…</div>;
  if (state === 'error') return <div className="blame-diff-note">No history available for this unit.</div>;
  if (!records.length) return <div className="blame-diff-note">No recorded edits.</div>;

  return (
    <div className="blame-diff-list">
      {records.map((rec, i) => {
        const before = rec.before || {};
        const after = rec.after || {};
        const changed = [...new Set([...Object.keys(before), ...Object.keys(after)])]
          .filter((k) => k !== 'updated_at' && k !== 'updated_by' && JSON.stringify(before[k] ?? null) !== JSON.stringify(after[k] ?? null));
        return (
          <div key={rec.id || i} className="blame-diff-record">
            <div className="blame-diff-meta">
              {who(rec.by).icon} <strong>{who(rec.by).name}</strong>
              <span className="blame-diff-time">{timeAgo(rec.at)} · {rec.kind || 'edit'}</span>
            </div>
            {changed.length === 0 ? (
              <div className="blame-diff-note">No field changes recorded (publish only).</div>
            ) : changed.map((field) => (
              <div key={field} className="blame-diff-field">
                <span className="blame-diff-key">{field}</span>
                <span className="blame-diff-val old">{String(before[field] ?? '—').slice(0, 60)}</span>
                <span className="blame-diff-arrow">→</span>
                <span className="blame-diff-val new">{String(after[field] ?? '—').slice(0, 60)}</span>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

export default function BlameLog() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editor, setEditor] = useState('all');
  const [section, setSection] = useState('all');
  const [q, setQ] = useState('');
  const [openDiff, setOpenDiff] = useState(null); // `${section}/${slug}`

  async function load() {
    setLoading(true);
    setError('');
    try {
      const rows = await fetchChangeLog();
      setEntries(rows);
      if (!rows.length) setError('No changes recorded yet.');
    } catch (e) {
      setError(`Failed to load: ${e.message}`);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const editors = useMemo(() => [...new Set(entries.map((e) => e.by).filter(Boolean))], [entries]);
  const sections = useMemo(() => [...new Set(entries.map((e) => e.section).filter(Boolean))], [entries]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return entries.filter((e) => {
      if (editor !== 'all' && e.by !== editor) return false;
      if (section !== 'all' && e.section !== section) return false;
      if (needle && !(`${e.slug || ''} ${e.detail || ''}`.toLowerCase().includes(needle))) return false;
      return true;
    });
  }, [entries, editor, section, q]);

  return (
    <section className="blame-wrap card">
      <div className="blame-head">
        <h2>🕵️ Activity &amp; Blame</h2>
        <button type="button" onClick={load} disabled={loading}>{loading ? 'Refreshing…' : '↻ Refresh'}</button>
      </div>
      <p className="blame-sub">Every publish, who made it, and exactly which fields changed. Expand a row to see the diff.</p>

      <div className="blame-filters">
        <Dropdown compact className="blame-select" value={editor} onChange={setEditor}
          options={[{ value: 'all', label: 'All editors' }, ...editors.map((em) => ({ value: em, label: who(em).name }))]}
          ariaLabel="Filter by editor" />
        <Dropdown compact className="blame-select" value={section} onChange={setSection}
          options={[{ value: 'all', label: 'All sections' }, ...sections.map((sec) => ({ value: sec, label: SECTION_LABELS[sec] || sec }))]}
          ariaLabel="Filter by section" />
        <input className="admin-search blame-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search slug or detail…" aria-label="Search changes" />
      </div>

      {error && <div className="blame-note">{error}</div>}

      <div className="blame-list" data-lenis-prevent>
        {filtered.slice(0, 150).map((e, i) => {
          const key = `${e.section}/${e.slug}`;
          const canDiff = e.slug && ['value', 'wiki', 'map', 'crate', 'materials'].includes(e.section);
          const open = openDiff === key;
          return (
            <div key={e.id || i} className={`blame-row${open ? ' open' : ''}`}>
              <button type="button" className="blame-row-head" onClick={() => setOpenDiff(open ? null : key)} disabled={!canDiff}>
                <span className="blame-icon">{KIND_ICONS[e.kind] || '•'}</span>
                <span className="blame-detail">{e.detail || `${e.kind} ${e.section}`}</span>
                <span className="blame-section-tag">{SECTION_LABELS[e.section] || e.section}</span>
                <span className="blame-who">{who(e.by).icon} {who(e.by).name}</span>
                <span className="blame-time">{timeAgo(e.at)}</span>
                {canDiff && <span className="blame-chev">{open ? '▾' : '▸'}</span>}
              </button>
              {open && <DiffRow section={e.section} slug={e.slug} />}
            </div>
          );
        })}
        {!loading && filtered.length === 0 && !error && <div className="blame-note">Nothing matches those filters.</div>}
      </div>
    </section>
  );
}
