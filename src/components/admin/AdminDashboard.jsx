import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { fetchActiveAnnouncements, fetchWorkerVersion } from '../../utils/apexClient';
import { EXPECTED_WORKER_VERSION } from '../../config/workerVersion';
import ThemeCutout from '../ThemeCutout';

const EDIT_ICONS = { values: '💰', wiki: '📖', map: '🗺️', crate: '📦', material: '🧪', skin: '🎨', system: '⚙️' };

export default function AdminDashboard({
  stats, wikiCount, shinyCount, edits24h, role,
  wikiAllowed, valueAllowed, maintenance, onToggleMaintenance,
  deletedCount, recentEdits, onNavigate,
}) {
  const canManage = role === 'owner' || role === 'admin';
  const [announcementCount, setAnnouncementCount] = useState(null);
  const [worker, setWorker] = useState({ version: null, loading: true });

  useEffect(() => {
    let alive = true;
    fetchWorkerVersion()
      .then((v) => { if (alive) setWorker({ version: v, loading: false }); })
      .catch(() => { if (alive) setWorker({ version: null, loading: false }); });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    let alive = true;
    fetchActiveAnnouncements()
      .then((list) => { if (alive) setAnnouncementCount(Array.isArray(list) ? list.length : 0); })
      .catch(() => {});
    const onUpdated = () =>
      fetchActiveAnnouncements()
        .then((list) => { if (alive) setAnnouncementCount(Array.isArray(list) ? list.length : 0); })
        .catch(() => {});
    window.addEventListener('apex-announcements-updated', onUpdated);
    return () => {
      alive = false;
      window.removeEventListener('apex-announcements-updated', onUpdated);
    };
  }, []);

  return (
    <div className="admin-dashboard-shell">
      {/* Command Center Editorial Hero Banner */}
      <motion.section
        className="admin-hero-banner card"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28 }}
      >
        <ThemeCutout
          variant="overlord"
          floating
          className="admin-hero-cutout"
        />
        <div className="admin-hero-copy">
          <span className="admin-kicker">MISSION CONTROL · REAL-TIME KV SYNC</span>
          <h2>APEX DATABASE COMMAND CENTER</h2>
          <p className="admin-muted">
            Publish instant trade valuations, sync 1.5× Shiny unit variants, manage live site announcements, and audit team edits across Staging &amp; Production.
          </p>
        </div>
        <div className="admin-quick-actions">
          {wikiAllowed && (
            <button type="button" className="admin-quick-btn primary" onClick={() => onNavigate('create')}>
              ✨ Create Entity
            </button>
          )}
          {valueAllowed && (
            <button type="button" className="admin-quick-btn" onClick={() => onNavigate('values')}>
              💰 Values Editor
            </button>
          )}
          {wikiAllowed && (
            <button type="button" className="admin-quick-btn" onClick={() => onNavigate('wiki')}>
              📖 WIKI Editor
            </button>
          )}
          {wikiAllowed && (
            <button type="button" className="admin-quick-btn" onClick={() => onNavigate('maps')}>
              🗺️ Maps
            </button>
          )}
          {wikiAllowed && (
            <button type="button" className="admin-quick-btn" onClick={() => onNavigate('crates')}>
              📦 Crates
            </button>
          )}
          {wikiAllowed && (
            <button type="button" className="admin-quick-btn" onClick={() => onNavigate('materials')}>
              🧪 Materials
            </button>
          )}
          {canManage && (
            <button type="button" className="admin-quick-btn" onClick={() => onNavigate('announcements')}>
              📢 Announcements
            </button>
          )}
          <button type="button" className="admin-quick-btn" onClick={() => onNavigate('logs')}>
            📈 Blame &amp; Logs
          </button>
        </div>
      </motion.section>

      {/* Telemetry Stat Grid */}
      <motion.div
        className="admin-dashboard"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.06, duration: 0.26 }}
      >
        <div className="admin-stat-card">
          <div className="admin-stat-icon">⚔️</div>
          <div className="admin-stat-value">{stats.units}</div>
          <div className="admin-stat-label">Total Units</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon">💰</div>
          <div className="admin-stat-value">{stats.values}</div>
          <div className="admin-stat-label">Value Overrides</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon">📖</div>
          <div className="admin-stat-value">{wikiCount}</div>
          <div className="admin-stat-label">WIKI Overrides</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon">🌟</div>
          <div className="admin-stat-value">{shinyCount}</div>
          <div className="admin-stat-label">Shiny Units</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon">⚡</div>
          <div className="admin-stat-value">{edits24h}</div>
          <div className="admin-stat-label">Edits (24h)</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon">📢</div>
          <div className="admin-stat-value">{announcementCount === null ? '—' : `${announcementCount}/5`}</div>
          <div className="admin-stat-label">Announcements Live</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon">🗑️</div>
          <div className="admin-stat-value">{deletedCount}</div>
          <div className="admin-stat-label">Recycle Bin</div>
        </div>
      </motion.div>

      <div
        className="admin-dashboard-columns"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '16px',
          marginTop: '18px',
        }}
      >
        {/* System controls */}
        <section className="card" style={{ padding: '20px' }}>
          <div className="admin-section-head">
            <h2>🛠️ System Infrastructure</h2>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
              padding: '12px 0',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <div>
              <strong style={{ fontSize: '14px' }}>Maintenance Mode</strong>
              <p className="admin-muted" style={{ margin: '4px 0 0', fontSize: '12px' }}>
                {maintenance?.on
                  ? 'ON — visitors see the maintenance page. Team keeps access.'
                  : 'OFF — the site is open to everyone.'}
              </p>
            </div>
            {canManage ? (
              <button
                type="button"
                className={maintenance?.on ? 'filled' : ''}
                style={
                  maintenance?.on
                    ? { background: 'var(--c-danger, #e5484d)', borderColor: 'var(--c-danger, #e5484d)' }
                    : undefined
                }
                onClick={onToggleMaintenance}
                disabled={maintenance?.loading}
              >
                {maintenance?.loading ? '…' : maintenance?.on ? 'Turn OFF' : 'Turn ON'}
              </button>
            ) : (
              <span className="admin-count-badge">{maintenance?.on ? 'ON' : 'OFF'}</span>
            )}
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
              padding: '12px 0',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <div>
              <strong style={{ fontSize: '14px' }}>☁️ Worker (database server)</strong>
              <p className="admin-muted" style={{ margin: '4px 0 0', fontSize: '12px' }}>
                {worker.loading
                  ? 'Checking deploy status…'
                  : worker.version === null
                    ? 'Could not reach the worker — edits stay local until it is back.'
                    : worker.version === EXPECTED_WORKER_VERSION
                      ? `Up to date (${worker.version}) — all features live.`
                      : `Outdated (${worker.version || 'old'}) — deploy pending (${EXPECTED_WORKER_VERSION}). Some features wait on wrangler deploy.`}
              </p>
            </div>
            {!worker.loading && (
              <span
                className="admin-count-badge"
                style={{
                  fontSize: '11px',
                  padding: '4px 10px',
                  color: worker.version === EXPECTED_WORKER_VERSION ? '#42d392' : '#ffd24d',
                  border: `1px solid ${
                    worker.version === EXPECTED_WORKER_VERSION
                      ? 'rgba(66,211,146,0.45)'
                      : 'rgba(255,210,77,0.45)'
                  }`,
                }}
              >
                {worker.loading ? '…' : worker.version === EXPECTED_WORKER_VERSION ? '✓ Current' : '⚠ Deploy due'}
              </span>
            )}
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
              padding: '12px 0',
            }}
          >
            <div>
              <strong style={{ fontSize: '14px' }}>🔒 Test Realm Gate</strong>
              <p className="admin-muted" style={{ margin: '4px 0 0', fontSize: '12px' }}>
                Active — the Test Realm asks for an admin account before letting anyone in.
              </p>
            </div>
            <span className="admin-count-badge">ON</span>
          </div>
        </section>

        {/* Recent activity */}
        <section className="card" style={{ padding: '20px' }}>
          <div className="admin-section-head">
            <h2>🕒 Your Recent Activity</h2>
          </div>
          {recentEdits && recentEdits.length ? (
            <div>
              {recentEdits.slice(0, 8).map((e) => (
                <button
                  key={`${e.slug}-${e.kind}`}
                  type="button"
                  onClick={() => onNavigate(e.kind === 'values' ? 'values' : 'wiki')}
                  style={{
                    display: 'flex',
                    width: '100%',
                    gap: '10px',
                    alignItems: 'center',
                    padding: '9px 6px',
                    background: 'none',
                    border: 'none',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    color: 'inherit',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '13px',
                  }}
                >
                  <span>{EDIT_ICONS[e.kind] || '•'}</span>
                  <span style={{ flex: 1, fontWeight: 700 }}>{e.name || e.slug}</span>
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', textTransform: 'uppercase' }}>
                    {e.kind}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="admin-muted">
              No recent edits yet — open an editor and your last units will show up here.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
