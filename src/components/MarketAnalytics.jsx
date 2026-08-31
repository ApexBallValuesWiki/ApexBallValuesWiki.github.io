import { useMemo } from 'react';
import { DEMAND_COLORS, DEMAND_PERCENT, SCARCITY_COLORS, SCARCITY_PERCENT } from '../data/taxonomy';
import { formatCompactNumber } from '../utils/formatNumber';
import './MarketAnalytics.css';

export default function MarketAnalytics({ valueRows = [], units = [] }) {
  const stats = useMemo(() => {
    const rows = Array.isArray(valueRows) ? valueRows : [];
    const totalUnits = rows.length;
    const totalValue = rows.reduce((sum, r) => sum + (Number(r.base_value) || 0), 0);
    const avgValue = totalUnits > 0 ? totalValue / totalUnits : 0;

    // Demand distribution
    const demandDist = {};
    rows.forEach(r => {
      const d = r.demand || 'Unknown';
      demandDist[d] = (demandDist[d] || 0) + 1;
    });

    // Scarcity distribution
    const scarcityDist = {};
    rows.forEach(r => {
      const s = r.scarcity || 'Unknown';
      scarcityDist[s] = (scarcityDist[s] || 0) + 1;
    });

    // Rarity breakdown
    const rarityDist = {};
    (Array.isArray(units) ? units : []).forEach(u => {
      const r = u.rarity || 'Unknown';
      if (!rarityDist[r]) rarityDist[r] = { count: 0, totalValue: 0 };
      rarityDist[r].count++;
      const val = rows.find(row => row.slug === u.slug);
      if (val) rarityDist[r].totalValue += Number(val.base_value) || 0;
    });

    // Top valued units
    const topUnits = [...rows]
      .sort((a, b) => (Number(b.base_value) || 0) - (Number(a.base_value) || 0))
      .slice(0, 10);

    return { totalUnits, totalValue, avgValue, demandDist, scarcityDist, rarityDist, topUnits };
  }, [valueRows, units]);

  return (
    <div className="ma-dashboard">
      <h3 className="ma-title">📊 Market Analytics</h3>

      <div className="ma-summary">
        <div className="ma-stat">
          <span className="ma-stat-label">Total Units</span>
          <span className="ma-stat-value">{stats.totalUnits}</span>
        </div>
        <div className="ma-stat">
          <span className="ma-stat-label">Total Market Value</span>
          <span className="ma-stat-value">{formatCompactNumber(stats.totalValue)}</span>
        </div>
        <div className="ma-stat">
          <span className="ma-stat-label">Average Value</span>
          <span className="ma-stat-value">{formatCompactNumber(stats.avgValue)}</span>
        </div>
      </div>

      <div className="ma-section">
        <h4>Demand Distribution</h4>
        <div className="ma-bars">
          {Object.entries(stats.demandDist)
            .sort((a, b) => b[1] - a[1])
            .map(([label, count]) => (
              <div key={label} className="ma-bar-row">
                <span className="ma-bar-label">{label}</span>
                <div className="ma-bar-track">
                  <div
                    className="ma-bar-fill"
                    style={{
                      width: `${Math.max(4, (count / stats.totalUnits) * 100)}%`,
                      background: DEMAND_COLORS[label] || 'var(--accent)',
                    }}
                  />
                </div>
                <span className="ma-bar-count">{count}</span>
              </div>
            ))}
        </div>
      </div>

      <div className="ma-section">
        <h4>Scarcity Distribution</h4>
        <div className="ma-bars">
          {Object.entries(stats.scarcityDist)
            .sort((a, b) => b[1] - a[1])
            .map(([label, count]) => (
              <div key={label} className="ma-bar-row">
                <span className="ma-bar-label">{label}</span>
                <div className="ma-bar-track">
                  <div
                    className="ma-bar-fill"
                    style={{
                      width: `${Math.max(4, (count / stats.totalUnits) * 100)}%`,
                      background: SCARCITY_COLORS[label] || 'var(--accent)',
                    }}
                  />
                </div>
                <span className="ma-bar-count">{count}</span>
              </div>
            ))}
        </div>
      </div>

      <div className="ma-section">
        <h4>Top Valued Units</h4>
        <div className="ma-top-list">
          {stats.topUnits.map((unit, i) => {
            const unitData = units.find(u => u.slug === unit.slug);
            return (
              <div key={unit.slug} className="ma-top-item">
                <span className="ma-top-rank">#{i + 1}</span>
                <span className="ma-top-name">{unitData?.name || unit.slug}</span>
                <span className="ma-top-value">{formatCompactNumber(Number(unit.base_value) || 0)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
