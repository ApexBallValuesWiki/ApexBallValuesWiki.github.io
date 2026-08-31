import { motion } from 'framer-motion';

export default function AdminDashboard({
  stats, wikiCount, shinyCount, edits24h, role,
  wikiAllowed, onCreateUnit, onAnnounce, onLogs,
}) {
  return (
    <>
      <motion.div className="admin-dashboard" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
        <div className="admin-stat-card"><div className="admin-stat-icon">⚔️</div><div className="admin-stat-value">{stats.units}</div><div className="admin-stat-label">Total Units</div></div>
        <div className="admin-stat-card"><div className="admin-stat-icon">💰</div><div className="admin-stat-value">{stats.values}</div><div className="admin-stat-label">Value Overrides</div></div>
        <div className="admin-stat-card"><div className="admin-stat-icon">📖</div><div className="admin-stat-value">{wikiCount}</div><div className="admin-stat-label">WIKI Overrides</div></div>
        <div className="admin-stat-card"><div className="admin-stat-icon">🌟</div><div className="admin-stat-value">{shinyCount}</div><div className="admin-stat-label">Shiny Units</div></div>
        <div className="admin-stat-card"><div className="admin-stat-icon">⚡</div><div className="admin-stat-value">{edits24h}</div><div className="admin-stat-label">Edits (24h)</div></div>
      </motion.div>
      <motion.div className="admin-quick-actions" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2, duration: 0.3 }}>
        {wikiAllowed && <button className="admin-quick-btn primary" onClick={onCreateUnit}>✨ Create Unit</button>}
        {role === 'owner' && <button className="admin-quick-btn" onClick={onAnnounce}>📢 Send Announcement</button>}
        <button className="admin-quick-btn" onClick={onLogs}>📈 View Logs</button>
      </motion.div>
    </>
  );
}
