import { useState, useEffect, useMemo } from 'react';
import { APEX_KV_URL } from '../../utils/apexClient';
import Dropdown from '../Dropdown';

// BUG REPORTS — upgraded admin view: category + status filters, search,
// duplicate-merge badges (worker folds identical reports), and bulk resolve.
const CATEGORY_COLORS = {
  'Wrong Data': '#ff5c5c',
  'Wiki Error': '#c04dff',
  'Site Bug': '#ffb63e',
  Suggestion: '#42d392',
  Other: '#7ff4ff',
};
const CATEGORY_FALLBACK = '#a7b0bd';

function timeAgo(iso) {
  try {
    const ms = Date.now() - new Date(iso).getTime();
    if (!Number.isFinite(ms)) return '';
    const mins = Math.floor(ms / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const h = Math.floor(mins / 60);
    if (h < 24) return `${h}h ago`;
    return new Date(iso).toLocaleDateString();
  } catch { return ''; }
}

export default function BugReportAdmin() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('open'); // all | open | resolved
  const [category, setCategory] = useState('all');
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);

  async function loadReports() {
    setLoading(true);
    try {
      const response = await fetch(`${APEX_KV_URL}/bug-reports`);
      if (response.ok) {
        const data = await response.json();
        data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        setReports(Array.isArray(data) ? data : []);
        setMessage('');
      } else {
        const err = await response.json().catch(() => ({ error: 'Unknown error' }));
        setMessage(`Error loading bug reports: ${err.error || 'Server error'}`);
      }
    } catch (e) {
      setMessage(`Failed to load: ${e.message}`);
    }
    setLoading(false);
  }

  useEffect(() => { loadReports(); }, []);

  const categories = useMemo(
    () => [...new Set(reports.map((r) => r.category).filter(Boolean))],
    [reports]
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return reports.filter((r) => {
      if (status === 'open' && r.resolved) return false;
      if (status === 'resolved' && !r.resolved) return false;
      if (category !== 'all' && (r.category || 'Other') !== category) return false;
      if (needle && !`${r.title || ''} ${r.description || ''} ${r.page_url || ''}`.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [reports, status, category, q]);

  const openCount = useMemo(() => filtered.filter((r) => !r.resolved).length, [filtered]);

  async function resolve(id) {
    setBusy(true);
    try {
      const response = await fetch(`${APEX_KV_URL}/bug-reports/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, resolved: true }),
      });
      if (response.ok) {
        setReports((prev) => prev.map((r) => (r.id === id ? { ...r, resolved: true } : r)));
        setMessage('Marked as resolved.');
      } else {
        const err = await response.json().catch(() => ({}));
        setMessage(`Failed to resolve: ${err.error || 'Server error'}`);
      }
    } catch (e) {
      setMessage(`Failed to resolve: ${e.message}`);
    }
    setBusy(false);
  }

  async function resolveAllOpen() {
    const targets = filtered.filter((r) => !r.resolved).map((r) => r.id);
    if (!targets.length) return;
    if (!window.confirm(`Resolve ${targets.length} open report${targets.length > 1 ? 's' : ''}?`)) return;
    setBusy(true);
    let done = 0;
    for (const id of targets) {
      try {
        const response = await fetch(`${APEX_KV_URL}/bug-reports/resolve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, resolved: true }),
        });
        if (response.ok) done += 1;
      } catch { /* keep going */ }
    }
    await loadReports();
    setMessage(`Resolved ${done}/${targets.length} reports.`);
    setBusy(false);
  }

  async function deleteReport(id) {
    if (!window.confirm('Permanently delete this report?')) return;
    setBusy(true);
    try {
      const response = await fetch(`${APEX_KV_URL}/bug-reports/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (response.ok) {
        setReports((prev) => prev.filter((r) => r.id !== id));
        setMessage('Report deleted.');
      } else {
        const err = await response.json().catch(() => ({}));
        setMessage(`Failed to delete: ${err.error || 'Server error'}`);
      }
    } catch (e) {
      setMessage(`Failed to delete: ${e.message}`);
    }
    setBusy(false);
  }

  return (
    <section className="card admin-bug-reports">
      <div className="bra-head">
        <h3>🐛 Bug Reports <span className="bra-count">{filtered.length}</span></h3>
        <div className="bra-filters">
          <Dropdown compact className="bra-select" value={status} onChange={setStatus}
            options={[{ value: 'open', label: 'Open' }, { value: 'resolved', label: 'Resolved' }, { value: 'all', label: 'All' }]}
            ariaLabel="Filter by status" />
          <Dropdown compact className="bra-select" value={category} onChange={setCategory}
            options={[{ value: 'all', label: 'All categories' }, ...categories.map((c) => ({ value: c, label: c }))]}
            ariaLabel="Filter by category" />
          <input className="admin-search bra-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search reports…" aria-label="Search reports" />
          <button type="button" onClick={loadReports} disabled={loading}>↻</button>
        </div>
      </div>

      {message && <div className="pending-flag bra-flag">{message}</div>}

      {loading ? (
        <p className="bra-muted">Loading reports…</p>
      ) : filtered.length === 0 ? (
        <p className="bra-muted">No reports match — inbox zero 🎉</p>
      ) : (
        <>
          {openCount > 1 && (
            <div className="bra-bulk">
              <span>{openCount} open in view</span>
              <button type="button" className="filled" onClick={resolveAllOpen} disabled={busy}>✓ Resolve all open in view</button>
            </div>
          )}
          <div className="bra-list" data-lenis-prevent>
            {filtered.map((report) => {
              const cat = report.category || 'Other';
              const color = CATEGORY_COLORS[cat] || CATEGORY_FALLBACK;
              return (
                <div key={report.id} className={`bra-row${report.resolved ? ' resolved' : ''}`}>
                  <div className="bra-row-head">
                    <span className="bra-cat" style={{ color, borderColor: `color-mix(in srgb, ${color} 45%, transparent)`, background: `color-mix(in srgb, ${color} 10%, transparent)` }}>{cat}</span>
                    <strong className="bra-title">{report.title || 'Untitled'}</strong>
                    {(report.count || 0) > 1 && <span className="bra-dupes" title="Identical reports merged automatically">⚡ ×{report.count} merged</span>}
                    <span className="bra-time">{timeAgo(report.created_at)}</span>
                  </div>
                  {report.description && <p className="bra-desc">{report.description}</p>}
                  <div className="bra-row-foot">
                    {report.page_url && <a className="bra-link" href={report.page_url} target="_blank" rel="noreferrer">{report.page_url.replace(/^https?:\/\/[^/]+/, '')}</a>}
                    {!report.resolved ? (
                      <button type="button" onClick={() => resolve(report.id)} disabled={busy}>✓ Resolve</button>
                    ) : (
                      <span className="bra-status">✓ Resolved</span>
                    )}
                    <button type="button" className="bra-delete" onClick={() => deleteReport(report.id)} disabled={busy}>🗑️</button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
