import { useEffect, useMemo, useState } from 'react';
import { fetchChangeLog } from '../../utils/apexClient';
import { getTeamMember } from '../../utils/teamMembers';

// EDITOR LEADERBOARD — reimagined contribution board computed from the LIVE
// change feed (real edits, real timestamps) instead of hardcoded counts.
// Podium + per-editor breakdown + 14-day activity sparkline + period filter.

const RANGES = [
  { id: '7d', label: '7 days', ms: 7 * 86400000 },
  { id: '30d', label: '30 days', ms: 30 * 86400000 },
  { id: 'all', label: 'All time', ms: Infinity },
];

const SECTION_COLORS = {
  value: '#4d9dff', wiki: '#c04dff', map: '#00ff91', crate: '#ffc94d',
  materials: '#ff9d3b', announcement: '#ff5d9e', maintenance: '#7ff4ff', bundle: '#a7b0bd',
};
const PODIUM_MEDALS = ['🥇', '🥈', '🥉'];

function dayKey(iso) {
  try { return new Date(iso).toISOString().slice(0, 10); } catch { return null; }
}

export default function EditorLeaderboard() {
  const [entries, setEntries] = useState([]);
  const [range, setRange] = useState('30d');

  useEffect(() => {
    let alive = true;
    (async () => {
      const rows = await fetchChangeLog();
      if (alive) setEntries(rows);
    })();
    return () => { alive = false; };
  }, []);

  const stats = useMemo(() => {
    const cutoff = Date.now() - (RANGES.find((r) => r.id === range)?.ms ?? Infinity);
    const byEditor = new Map();
    // 14-day histogram regardless of the selected range
    const days = [];
    for (let i = 13; i >= 0; i -= 1) days.push(dayKey(new Date(Date.now() - i * 86400000)));

    for (const e of entries) {
      const t = new Date(e.at || 0).getTime();
      if (!Number.isFinite(t) || t < cutoff) continue;
      const email = e.by || 'unknown';
      if (!byEditor.has(email)) byEditor.set(email, { email, total: 0, sections: {}, last: 0, days: {} });
      const s = byEditor.get(email);
      s.total += 1;
      s.sections[e.section] = (s.sections[e.section] || 0) + 1;
      if (t > s.last) s.last = t;
      const dk = dayKey(e.at);
      if (dk && days.includes(dk)) s.days[dk] = (s.days[dk] || 0) + 1;
    }
    const list = [...byEditor.values()].sort((a, b) => b.total - a.total);
    return { list, days };
  }, [entries, range]);

  return (
    <div className="elb-wrap card">
      <div className="elb-head">
        <h2>🏅 Editor Leaderboard</h2>
        <div className="elb-ranges">
          {RANGES.map((r) => (
            <button key={r.id} type="button" className={`elb-range-btn${range === r.id ? ' active' : ''}`} onClick={() => setRange(r.id)}>{r.label}</button>
          ))}
        </div>
      </div>
      <p className="elb-sub">Computed live from the shared change feed — every publish counts.</p>

      {stats.list.length === 0 ? (
        <div className="elb-empty">No edits recorded in this period yet. Get publishing! ✏️</div>
      ) : (
        <>
          <div className="elb-podium">
            {stats.list.slice(0, 3).map((s, i) => {
              const m = getTeamMember(s.email);
              return (
                <div key={s.email} className={`elb-pod${i === 0 ? ' first' : ''}`}>
                  <span className="elb-medal">{PODIUM_MEDALS[i]}</span>
                  <span className="elb-pod-icon">{m.icon}</span>
                  <strong className="elb-pod-name">{m.name}</strong>
                  <span className="elb-pod-count">{s.total} edits</span>
                </div>
              );
            })}
          </div>

          <div className="elb-rows">
            {stats.list.map((s, i) => {
              const m = getTeamMember(s.email);
              const max = stats.days.reduce((acc, d) => Math.max(acc, s.days[d] || 0), 1);
              return (
                <div key={s.email} className="elb-row">
                  <span className="elb-rank">{i < 3 ? PODIUM_MEDALS[i] : `#${i + 1}`}</span>
                  <span className="elb-id">{m.icon} <strong>{m.name}</strong><small> {m.roleLabel}</small></span>
                  <span className="elb-bars">
                    {stats.days.map((d) => (
                      <span key={d} className="elb-bar" title={`${d}: ${s.days[d] || 0} edits`} style={{ height: `${Math.max(8, ((s.days[d] || 0) / max) * 100)}%`, opacity: s.days[d] ? 1 : 0.25 }} />
                    ))}
                  </span>
                  <span className="elb-sect">
                    {Object.entries(s.sections).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([sec, n]) => (
                      <span key={sec} className="elb-tag" style={{ color: SECTION_COLORS[sec] || '#fff', borderColor: `color-mix(in srgb, ${SECTION_COLORS[sec] || '#fff'} 45%, transparent)` }}>{sec} ×{n}</span>
                    ))}
                  </span>
                  <span className="elb-total"><strong>{s.total}</strong> edits</span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
