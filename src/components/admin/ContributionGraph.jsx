import { useState, useMemo } from 'react';
import { TEAM_MEMBERS, getTeamMember } from '../../utils/teamMembers';
import './ContributionGraph.css';

const HISTORICAL_EDIT_COUNTS = {
  'gustavo.rb1410@gmail.com': { value: 90, wiki: 83 },      // 173 edits total
  'destroyha3@gmail.com': { value: 117, wiki: 0 },         // 117 edits total (Nose)
  'treymurphy3rd@gmail.com': { value: 84, wiki: 0 },       // 84 edits total (DancyBalls)
  'bananatempest25@gmail.com': { value: 30, wiki: 44 },    // 74 edits total (Nemuiito)
  'gloomy302010@gmail.com': { value: 0, wiki: 74 },        // 74 edits total (Gloomy)
  'alieldaw6@gmail.com': { value: 0, wiki: 52 },           // 52 edits total (Kron3d)
  'johnmustard129@gmail.com': { value: 0, wiki: 33 },      // 33 edits total (Silly Goober)
  'luquitas290414@gmail.com': { value: 0, wiki: 5 },       // 5 edits total (Nooberto)
};

const SLICE_COLORS = [
  '#5e2eff', '#ff00a2', '#4d9dff', '#00ff91', '#ffc94d',
  '#b679ff', '#ff4d4d', '#7ff4ff', '#ff5d9e', '#36ff8a',
  '#ffd35c', '#c04dff', '#ff9ee0', '#58ff42',
];

function getCoordinatesForPercent(percent) {
  const x = Math.cos(2 * Math.PI * percent);
  const y = Math.sin(2 * Math.PI * percent);
  return [x, y];
}

export default function ContributionGraph({ valueLogs = [], wikiLogs = [] }) {
  const [hoveredEmail, setHoveredEmail] = useState(null);

  const { activeSlices, legendSlices, leadValue, leadWiki } = useMemo(() => {
    const counts = new Map();
    const valueCounts = new Map();
    const wikiCounts = new Map();

    // Baseline counts strictly restore all 612+ historical edits from logged image
    Object.keys(TEAM_MEMBERS).forEach((email) => {
      const hist = HISTORICAL_EDIT_COUNTS[email] || { value: 0, wiki: 0 };
      counts.set(email, hist.value + hist.wiki);
      valueCounts.set(email, hist.value);
      wikiCounts.set(email, hist.wiki);
    });

    // Tally actual value logs
    valueLogs.forEach((log) => {
      const email = log.changed_by_email || 'gustavo.rb1410@gmail.com';
      const clean = email.toLowerCase();
      counts.set(clean, (counts.get(clean) || 0) + 1);
      valueCounts.set(clean, (valueCounts.get(clean) || 0) + 1);
    });

    // Tally actual wiki logs
    wikiLogs.forEach((log) => {
      const email = log.changed_by_email || 'gustavo.rb1410@gmail.com';
      const clean = email.toLowerCase();
      counts.set(clean, (counts.get(clean) || 0) + 1);
      wikiCounts.set(clean, (wikiCounts.get(clean) || 0) + 1);
    });

    let total = 0;
    counts.forEach((v) => { total += v; });

    let leadValEmail = null;
    let maxVal = -1;
    valueCounts.forEach((count, email) => {
      if (count > maxVal) {
        maxVal = count;
        leadValEmail = email;
      }
    });

    let leadWikiEmail = null;
    let maxWiki = -1;
    wikiCounts.forEach((count, email) => {
      if (count > maxWiki) {
        maxWiki = count;
        leadWikiEmail = email;
      }
    });

    let cumulativePercent = 0;
    const computedActiveSlices = [];
    const allMembersList = [];
    let colorIdx = 0;

    // First collect all team members and compute exact percentage share
    Object.keys(TEAM_MEMBERS).forEach((email) => {
      const count = counts.get(email) || 0;
      const member = getTeamMember(email);
      const percent = total > 0 ? count / total : 0;
      const color = SLICE_COLORS[colorIdx % SLICE_COLORS.length];
      colorIdx += 1;

      const item = {
        email,
        name: member.name,
        icon: member.icon,
        roleLabel: member.roleLabel,
        count,
        percentRaw: percent,
        percent: Number((percent * 100).toFixed(1)),
        color,
        pathData: '',
      };
      allMembersList.push(item);
    });

    // Sort all members descending by exact count / percentage
    allMembersList.sort((a, b) => b.count - a.count);

    // Build SVG slices specifically for members with count > 0
    const activeMembers = allMembersList.filter((m) => m.count > 0);
    activeMembers.forEach((item) => {
      const percent = item.percentRaw;
      const startPercent = cumulativePercent;
      cumulativePercent += percent;
      const endPercent = cumulativePercent;

      const [startX, startY] = getCoordinatesForPercent(startPercent - 0.25);
      const [endX, endY] = getCoordinatesForPercent(endPercent - 0.25);
      const largeArcFlag = percent > 0.5 ? 1 : 0;

      const pathData = percent >= 0.9999
        ? 'M 0 -100 A 100 100 0 1 1 0 100 A 100 100 0 1 1 0 -100 Z'
        : `M ${startX * 100} ${startY * 100} A 100 100 0 ${largeArcFlag} 1 ${endX * 100} ${endY * 100} L ${endX * 55} ${endY * 55} A 55 55 0 ${largeArcFlag} 0 ${startX * 55} ${startY * 55} Z`;

      item.pathData = pathData;
      computedActiveSlices.push(item);
    });

    // Exact mathematical remainder balancing onto the top active slice so sum is strictly 100.0%
    if (computedActiveSlices.length > 0 && total > 0) {
      const currentSum = computedActiveSlices.reduce((acc, s) => acc + s.percent, 0);
      const diff = Number((100 - currentSum).toFixed(1));
      if (diff !== 0) {
        computedActiveSlices[0].percent = Number((computedActiveSlices[0].percent + diff).toFixed(1));
      }
    }

    return {
      activeSlices: computedActiveSlices,
      legendSlices: allMembersList,
      leadValue: getTeamMember(leadValEmail),
      leadWiki: getTeamMember(leadWikiEmail),
    };
  }, [valueLogs, wikiLogs]);

  const activeSlice = useMemo(() => {
    return activeSlices.find((s) => s.email === hoveredEmail) || activeSlices[0] || legendSlices[0] || null;
  }, [hoveredEmail, activeSlices, legendSlices]);

  return (
    <div className="contribution-graph-card">
      <div className="cg-header">
        <h3 className="cg-title">
          <span>🍕 Team Activity Donut Chart (Owner Exclusive)</span>
        </h3>
        <div className="cg-crowns-bar">
          <div className="cg-crown-badge" title="Team member with the highest value contributions">
            <span>Lead Value Editor 👑:</span>
            <strong>{leadValue?.name} {leadValue?.icon}</strong>
          </div>
          <div className="cg-crown-badge" title="Team member with the highest wiki contributions">
            <span>Lead WIKI Editor 👑:</span>
            <strong>{leadWiki?.name} {leadWiki?.icon}</strong>
          </div>
        </div>
      </div>

      <div className="cg-body">
        <div className="cg-chart-wrap">
          <svg className="cg-chart-svg" viewBox="-110 -110 220 220">
            {activeSlices.map((slice) => {
              const isActive = activeSlice?.email === slice.email;
              return (
                <path
                  key={slice.email}
                  d={slice.pathData}
                  fill={slice.color}
                  className={isActive ? 'cg-slice active' : 'cg-slice'}
                  onMouseEnter={() => setHoveredEmail(slice.email)}
                  onClick={() => setHoveredEmail(slice.email)}
                >
                  <title>{`${slice.name} (${slice.roleLabel}) — ${slice.percent}% (${slice.count} edits)`}</title>
                </path>
              );
            })}
          </svg>

          {activeSlice && (
            <div className="cg-center-info">
              <span className="cg-center-name">{activeSlice.name} {activeSlice.icon}</span>
              <span className="cg-center-percent" style={{ color: activeSlice.color }}>{activeSlice.percent}%</span>
              <span className="cg-center-edits">{activeSlice.roleLabel}</span>
            </div>
          )}
        </div>

        <div className="cg-legend">
          {legendSlices.map((slice) => {
            const isActive = activeSlice?.email === slice.email;
            return (
              <div
                key={slice.email}
                className={isActive ? 'cg-legend-item active' : 'cg-legend-item'}
                onMouseEnter={() => setHoveredEmail(slice.email)}
                onClick={() => setHoveredEmail(slice.email)}
              >
                <div className="cg-legend-left">
                  <span className="cg-legend-dot" style={{ background: slice.color }} />
                  <span className="cg-legend-name">{slice.name} {slice.icon}</span>
                </div>
                <div className="cg-legend-right">
                  <span className="cg-legend-percent" style={{ color: slice.color }}>{slice.percent}% ({slice.count} edits)</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
