import { useEffect, useMemo, useState } from 'react';
import { APEX_KV_URL, fetchChangeLog, fetchArchivedChanges, getAdminHeaders } from '../../utils/apexClient';
import { EXPECTED_WORKER_VERSION } from '../../config/workerVersion';
import { isWorkerAtLeast } from '../../utils/workerCompatibility';
import { TEAM_MEMBERS } from '../../utils/teamMembers';
import { displayAuditValue, historyChanges, matchHistoryRecord } from '../../utils/auditLog';
import Dropdown from '../Dropdown';
import './ActivityLog.css';

const SECTION_LABELS = { value: 'Values', wiki: 'Wiki', map: 'Maps', crate: 'Crates', materials: 'Materials', announcement: 'Announcements', announcements: 'Announcements', maintenance: 'Maintenance', bundle: 'Database' };
const HISTORY_SECTIONS = new Set(['value', 'wiki', 'map', 'crate', 'materials']);

function editorName(by) {
  if (!by) return 'Editor not recorded';
  return TEAM_MEMBERS[String(by).trim().toLowerCase()]?.name || String(by);
}

function formatTime(value) {
  const date = new Date(value || '');
  if (!Number.isFinite(date.getTime())) return 'Time not recorded';
  return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function EventDetail({ entry, onRevert }) {
  const [state, setState] = useState({ status: 'loading', record: null });
  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const idQuery = entry.id == null ? '?private=1' : `?private=1&id=${encodeURIComponent(String(entry.id))}`;
        const [response, version] = await Promise.all([
          fetch(`${APEX_KV_URL}/history/${entry.section}/${encodeURIComponent(entry.slug)}${idQuery}`, { signal: controller.signal, cache: 'no-store', headers: getAdminHeaders() }),
          fetch(`${APEX_KV_URL}/version`, { signal: controller.signal, cache: 'no-store' }).then((r) => r.ok ? r.json() : null).catch(() => null),
        ]);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        if (!Array.isArray(data)) throw new Error('Invalid history');
        setState({ status: 'ready', record: matchHistoryRecord(entry, data), canRestore: isWorkerAtLeast(version?.version, EXPECTED_WORKER_VERSION) });
      } catch (error) {
        if (error.name !== 'AbortError') setState({ status: 'error', record: null });
      }
    })();
    return () => controller.abort();
  }, [entry]);

  if (state.status === 'loading') return <p className="activity-detail-note">Loading this entry’s recorded history…</p>;
  if (state.status === 'error') return <p className="activity-detail-note">Could not load the unit history. Please try again.</p>;
  if (!state.record) return <p className="activity-detail-note">A matching field-level record is not available for this entry. The history may be older than the retained records or was not captured.</p>;
  const fields = historyChanges(state.record);
  if (!fields) return <p className="activity-detail-note">This record does not contain both field snapshots.</p>;
  if (!fields.length) return <p className="activity-detail-note">No field differences were recorded in this snapshot.</p>;
  return (
    <div className="activity-diff" aria-label="Recorded field changes">
      <div className="activity-diff-head"><span>Field</span><span>Before</span><span>After</span></div>
      {fields.map(({ key, before, after }) => (
        <div className="activity-diff-row" key={key}>
          <strong>{key.replaceAll('_', ' ')}</strong>
          <span><small>Before</small>{displayAuditValue(before)}</span>
          <span><small>After</small>{displayAuditValue(after)}</span>
        </div>
      ))}
      {state.canRestore && state.record.before && typeof state.record.before === 'object' && typeof onRevert === 'function' && <button type="button" className="activity-refresh activity-restore" onClick={() => {
        if (window.confirm('Apply the previous field values for this record? Fields added later will not be removed. This publishes a new change.')) onRevert({ ...entry, before: state.record.before });
      }}>Apply previous field values</button>}
    </div>
  );
}

export default function BlameLog({ onRevert }) {
  const [entries, setEntries] = useState([]);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [archive, setArchive] = useState([]);
  const [archiveCursor, setArchiveCursor] = useState(null);
  const [archiveDone, setArchiveDone] = useState(false);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [archiveError, setArchiveError] = useState('');
  const [editor, setEditor] = useState('all');
  const [section, setSection] = useState('all');
  const [query, setQuery] = useState('');
  const [openKey, setOpenKey] = useState(null);

  async function load() {
    setStatus('loading');
    setError('');
    try {
      const rows = await fetchChangeLog({ strict: true });
      setEntries([...rows].sort((a, b) => {
        const x = Date.parse(a.at || '') || 0;
        const y = Date.parse(b.at || '') || 0;
        return y - x;
      }));
      setArchive([]); setArchiveCursor(null); setArchiveDone(false); setArchiveError('');
      setStatus('ready');
    } catch (e) {
      setError(e?.message || 'Could not load the shared change feed.');
      setStatus('error');
    }
  }
  useEffect(() => { load(); }, []);

  async function loadArchive() {
    setArchiveLoading(true); setArchiveError('');
    try {
      const page = await fetchArchivedChanges(archiveCursor);
      setArchive((prev) => [...prev, ...page.entries]);
      setArchiveCursor(page.cursor || null);
      setArchiveDone(page.complete);
    } catch (e) { setArchiveError(e?.message || 'Could not load the archive.'); }
    finally { setArchiveLoading(false); }
  }
  const allEntries = useMemo(() => {
    const seen = new Set();
    return [...entries, ...archive].filter((entry) => {
      // A failed final write can leave an archived copy in the recent feed.
      // Only deduplicate stable IDs; never merge unrelated legacy entries.
      if (entry.id == null) return true;
      const id = String(entry.id);
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }, [entries, archive]);
  const editors = useMemo(() => [...new Set(allEntries.map((e) => e.by).filter(Boolean))], [allEntries]);
  const sections = useMemo(() => [...new Set(allEntries.map((e) => e.section).filter(Boolean))], [allEntries]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allEntries.filter((e) => (editor === 'all' || e.by === editor) && (section === 'all' || e.section === section) &&
      (!q || `${e.slug || ''} ${e.detail || ''} ${e.kind || ''} ${editorName(e.by)}`.toLowerCase().includes(q)));
  }, [allEntries, editor, section, query]);

  return (
    <section className="activity card" aria-labelledby="activity-title">
      <div className="activity-head">
        <div><span className="activity-kicker">SERVER RECORDS</span><h2 id="activity-title">Shared activity</h2></div>
        <button type="button" className="activity-refresh" onClick={load} disabled={status === 'loading'}>{status === 'loading' ? 'Refreshing…' : 'Refresh'}</button>
      </div>
      <p className="activity-intro">Server-recorded changes only. The recent feed shows up to 200 entries; older entries saved by the updated worker can be loaded from the archive. History from before archiving, or a failed audit write, may be unavailable.</p>
      <div className="activity-toolbar">
        <input className="admin-search activity-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search changes…" aria-label="Search shared activity" />
        <Dropdown compact value={section} onChange={setSection} ariaLabel="Filter activity by section" options={[{ value: 'all', label: 'All sections' }, ...sections.map((sec) => ({ value: sec, label: SECTION_LABELS[sec] || sec }))]} />
        <Dropdown compact value={editor} onChange={setEditor} ariaLabel="Filter activity by editor" options={[{ value: 'all', label: 'All editors' }, ...editors.map((by) => ({ value: by, label: editorName(by) }))]} />
      </div>
      <div className="activity-summary"><span>{status === 'ready' ? `${filtered.length} shown · ${allEntries.length} loaded` : status === 'loading' ? 'Loading records…' : 'Records unavailable'}</span><span>Newest recorded first</span></div>
      {error && <p className="activity-alert" role="alert">{error} Check the admin login and worker connection, then refresh.</p>}
      {status === 'ready' && !filtered.length && <p className="activity-empty">{allEntries.length ? 'No records match these filters.' : 'The server returned no recent recorded changes.'}</p>}
      {status === 'ready' && filtered.length > 0 && (
        <div className="activity-list" data-lenis-prevent>
          {filtered.map((entry, index) => {
            const key = `${entry.id ?? 'legacy'}-${entry.section ?? ''}-${entry.slug ?? ''}-${entry.at ?? index}`;
            const expandable = Boolean(entry.slug && HISTORY_SECTIONS.has(entry.section));
            const open = openKey === key;
            const title = entry.detail || [entry.kind, entry.section, entry.slug].filter(Boolean).join(' · ') || 'Change (details not recorded)';
            return (
              <article className={`activity-row${open ? ' is-open' : ''}`} key={key}>
                <div className="activity-row-main">
                  <span className="activity-marker" aria-hidden="true" />
                  <div className="activity-row-copy"><strong>{title}</strong><span>{entry.slug || 'No unit recorded'} · {SECTION_LABELS[entry.section] || entry.section || 'Section not recorded'}</span></div>
                  <div className="activity-row-meta"><strong>{editorName(entry.by)}</strong><time dateTime={entry.at || undefined}>{formatTime(entry.at)}</time></div>
                  {expandable && <button type="button" className="activity-details-button" aria-expanded={open} onClick={() => setOpenKey(open ? null : key)}>{open ? 'Close' : 'Details'}</button>}
                </div>
                {open && <EventDetail entry={entry} onRevert={onRevert} />}
              </article>
            );
          })}
        </div>
      )}
      {status === 'ready' && <div className="activity-archive">
        {!archiveDone && <button type="button" className="activity-refresh" onClick={loadArchive} disabled={archiveLoading}>{archiveLoading ? 'Loading archive…' : 'Load older archived changes'}</button>}
        {archiveDone && <span>All available archived entries loaded.</span>}
        {archiveError && <span role="alert">{archiveError} Check that the updated shared worker is deployed.</span>}
      </div>}
    </section>
  );
}
