import { useState, useEffect } from 'react';
import { fetchUnitHistory } from '../utils/apexClient';
import './ValueTrendGraph.css';

const TREND_KEY = 'apex-value-history-v2';
const LEGACY_KEY = 'apex-value-history-v1';
const MAX_ENTRIES = 1000;

const METRICS = [
  { id: 'value', label: 'Value', icon: '💎', color: '#4d9dff' },
  { id: 'gems', label: 'Gems', icon: '🔷', color: '#c04dff' },
  { id: 'coins', label: 'Coins', icon: '🟡', color: '#ffc94d' },
];

/**
 * Record a value change for a unit. `next` may be a number (legacy: value
 * only) or an object { value, gems, coins } so every metric is tracked.
 */
export function recordValueChange(slug, oldValue, next) {
  try {
    const raw = localStorage.getItem(TREND_KEY);
    const history = raw ? JSON.parse(raw) : {};
    if (!history[slug]) history[slug] = [];

    const entry = typeof next === 'number'
      ? { value: next, gems: null, coins: null }
      : {
          value: Number(next?.value) || 0,
          gems: next?.gems === null || next?.gems === undefined ? null : Number(next.gems) || 0,
          coins: next?.coins === null || next?.coins === undefined ? null : Number(next.coins) || 0,
        };
    entry.oldValue = Number(oldValue) || 0;
    entry.timestamp = Date.now();

    history[slug].push(entry);
    if (history[slug].length > 50) {
      history[slug] = history[slug].slice(-50);
    }
    const total = Object.values(history).reduce((sum, arr) => sum + arr.length, 0);
    if (total > MAX_ENTRIES) {
      const keys = Object.keys(history);
      while (Object.values(history).reduce((s, a) => s + a.length, 0) > MAX_ENTRIES * 0.8) {
        const oldest = keys.shift();
        if (oldest) delete history[oldest];
      }
    }
    localStorage.setItem(TREND_KEY, JSON.stringify(history));
  } catch { /* ignore */ }
}

export function getValueHistory(slug) {
  try {
    const raw = localStorage.getItem(TREND_KEY);
    const history = raw ? JSON.parse(raw) : {};
    let entries = history[slug] || [];
    // One-time migration from the v1 (value-only) storage.
    if (entries.length === 0) {
      const legacy = localStorage.getItem(LEGACY_KEY);
      if (legacy) {
        const legacyHistory = JSON.parse(legacy);
        entries = (legacyHistory[slug] || []).map((e) => ({ ...e, gems: null, coins: null }));
      }
    }
    return entries;
  } catch { return []; }
}

export function formatCompact(n) {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
}

export default function ValueTrendGraph({ slug, currentValue, currentGems, currentCoins }) {
  const [metric, setMetric] = useState('value');
  const meta = METRICS.find((m) => m.id === metric) || METRICS[0];

  const [history, setHistory] = useState([]);
  // REAL shared history: every editor's saves live in the KV database, so
  // trends reflect the actual market — not just this one browser.
  const [serverHistory, setServerHistory] = useState([]);

  useEffect(() => {
    let alive = true;
    fetchUnitHistory('value', slug)
      .then((entries) => { if (alive && Array.isArray(entries)) setServerHistory(entries); })
      .catch(() => {});
    return () => { alive = false; };
  }, [slug]);

  useEffect(() => {
    const data = getValueHistory(slug);
    const current = {
      value: Number(currentValue) || 0,
      gems: currentGems === null || currentGems === undefined ? null : Number(currentGems) || 0,
      coins: currentCoins === null || currentCoins === undefined ? null : Number(currentCoins) || 0,
      timestamp: Date.now(),
    };
    setHistory([...data, current]);
  }, [slug, currentValue, currentGems, currentCoins]);

  const serverPoints = serverHistory.map((h) => ({
    value: Number(h?.after?.baseValue ?? h?.after?.base_value ?? h?.after?.value) || 0,
    gems: h?.after?.gems === null || h?.after?.gems === undefined ? null : Number(h.after.gems) || 0,
    coins: h?.after?.coins === null || h?.after?.coins === undefined ? null : Number(h.after.coins) || 0,
    timestamp: new Date(h?.at || 0).getTime() || 0,
    shared: true,
  }));

  const combined = [...serverPoints, ...history]
    .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))
    .slice(-50);

  const points = combined
    .map((h) => ({ ...h, v: Number(h[metric]) || 0 }))
    .filter((h) => h[metric] !== null && h[metric] !== undefined);

  if (points.length < 2) {
    return (
      <div className="vtg-empty">
        <span>📈</span>
        <p>Not enough data yet. Every save records Value, Gems and Coins — switch metrics above once history builds up.</p>
      </div>
    );
  }

  const values = points.map((h) => h.v);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const width = 100;
  const height = 60;

  const coords = points.map((h, i) => ({
    x: (i / (points.length - 1)) * width,
    y: height - ((h.v - min) / range) * (height - 8) - 4,
  }));

  const trend = values[values.length - 1] > values[0] ? 'rising' : values[values.length - 1] < values[0] ? 'falling' : 'stable';
  const trendColor = trend === 'rising' ? '#00ff91' : trend === 'falling' ? '#ff4d4d' : '#ffc94d';
  const trendLabel = trend === 'rising' ? '📈 Rising' : trend === 'falling' ? '📉 Falling' : '➡️ Stable';

  return (
    <div className="vtg-container">
      <div className="vtg-header">
        <div className="vtg-metrics">
          {serverHistory.length > 0 && (
            <span className="vtg-shared" title="Trend history is shared across all editors via the live database">
              🌐 {serverHistory.length} shared records
            </span>
          )}
          {METRICS.map((m) => (
            <button
              key={m.id}
              type="button"
              className={metric === m.id ? 'vtg-metric active' : 'vtg-metric'}
              style={metric === m.id ? { borderColor: m.color, color: m.color } : undefined}
              onClick={() => setMetric(m.id)}
            >
              {m.icon} {m.label}
            </button>
          ))}
        </div>
        <span className="vtg-trend" style={{ color: trendColor }}>{trendLabel}</span>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="vtg-chart" preserveAspectRatio="none">
        <defs>
          <linearGradient id={`vtg-fill-${metric}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={meta.color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={meta.color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((pct) => (
          <line key={pct} x1="0" y1={height * pct} x2={width} y2={height * pct}
            stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
        ))}
        <polygon
          points={`0,${height} ${coords.map((c) => `${c.x},${c.y}`).join(' ')} ${width},${height}`}
          fill={`url(#vtg-fill-${metric})`}
        />
        <polyline
          points={coords.map((c) => `${c.x},${c.y}`).join(' ')}
          fill="none"
          stroke={meta.color}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx={coords[coords.length - 1].x} cy={coords[coords.length - 1].y} r="2.5" fill={meta.color} />
      </svg>

      <div className="vtg-labels">
        <span>low {formatCompact(min)}</span>
        <span>avg {formatCompact(avg)}</span>
        <span>high {formatCompact(max)}</span>
      </div>
    </div>
  );
}
