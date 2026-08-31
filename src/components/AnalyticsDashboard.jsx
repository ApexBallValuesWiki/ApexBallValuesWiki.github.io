import { useMemo } from 'react';
import { getAnalyticsStats } from '../utils/analytics';
import './AnalyticsDashboard.css';

export default function AnalyticsDashboard() {
  const stats = useMemo(() => getAnalyticsStats(), []);

  return (
    <div className="analytics-dash">
      <h3>📊 Site Analytics</h3>

      <div className="analytics-summary">
        <div className="analytics-stat">
          <span className="analytics-stat-value">{stats.totalViews}</span>
          <span className="analytics-stat-label">Total Page Views</span>
        </div>
        <div className="analytics-stat">
          <span className="analytics-stat-value">{stats.weekViews}</span>
          <span className="analytics-stat-label">This Week</span>
        </div>
        <div className="analytics-stat">
          <span className="analytics-stat-value">{stats.dayViews}</span>
          <span className="analytics-stat-label">Today</span>
        </div>
        <div className="analytics-stat">
          <span className="analytics-stat-value">{stats.totalSearches}</span>
          <span className="analytics-stat-label">Searches</span>
        </div>
      </div>

      {stats.topPages.length > 0 && (
        <div className="analytics-section">
          <h4>Top Pages</h4>
          {stats.topPages.map(([path, count], i) => (
            <div key={path} className="analytics-row">
              <span className="analytics-rank">#{i + 1}</span>
              <span className="analytics-name">{path}</span>
              <span className="analytics-count">{count}</span>
            </div>
          ))}
        </div>
      )}

      {stats.topSearches.length > 0 && (
        <div className="analytics-section">
          <h4>Top Searches</h4>
          {stats.topSearches.map(([query, count], i) => (
            <div key={query} className="analytics-row">
              <span className="analytics-rank">#{i + 1}</span>
              <span className="analytics-name">{query}</span>
              <span className="analytics-count">{count}</span>
            </div>
          ))}
        </div>
      )}

      {stats.topFeatures.length > 0 && (
        <div className="analytics-section">
          <h4>Most Used Features</h4>
          {stats.topFeatures.map(([feature, count], i) => (
            <div key={feature} className="analytics-row">
              <span className="analytics-rank">#{i + 1}</span>
              <span className="analytics-name">{feature}</span>
              <span className="analytics-count">{count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
