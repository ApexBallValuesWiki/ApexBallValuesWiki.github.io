import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PageShell from '../../components/PageShell';
import UnitIcon from '../../components/UnitIcon';
import UnitTags from '../../components/UnitTags';
import { WIKI_NAV } from '../../config/navigation';
import { useData } from '../../context/DataContext';
import { getRarityGlow, isShinyRarity } from '../../data/taxonomy';
import { formatCompactNumber, formatFullNumber, getRankingValue, getUnitBestCostEfficiency, getUnitMaxDps } from '../../utils/leaderboardStats';
import './UnitLeaderboards.css';

const BOARDS = [
  { id: 'dps', label: 'DPS', title: 'Highest DPS', description: 'Units ranked by their best parsed DPS value.' },
  { id: 'efficiency', label: 'Cost Efficiency', title: 'Best Cost Efficiency', description: 'Lower Cost/DPS is better.' },
];

export default function UnitLeaderboards() {
  const [active, setActive] = useState('dps');
  const { wikiRows, wikiError, unitValues } = useData();
  const board = BOARDS.find((entry) => entry.id === active) || BOARDS[0];

  const rows = useMemo(() => {
    const documentedUnits = unitValues.filter((unit) => unit.documented && !unit.unavailableData);
    if (active === 'dps') {
      return documentedUnits
        .map((unit) => ({ unit, metric: getUnitMaxDps(unit) }))
        .filter((row) => row.metric.value != null)
        .sort((a, b) => b.metric.value - a.metric.value)
        .slice(0, 50);
    }
    if (active === 'efficiency') {
      return documentedUnits
        .map((unit) => ({ unit, metric: getUnitBestCostEfficiency(unit) }))
        .filter((row) => row.metric.value != null)
        .sort((a, b) => a.metric.value - b.metric.value)
        .slice(0, 50);
    }

    const key = active === 'late' ? 'late_game_rank' : 'early_game_rank';
    return documentedUnits
      .map((unit) => ({ unit, rank: getRankingValue(unit, wikiRows, key) }))
      .filter((row) => row.rank != null)
      .sort((a, b) => a.rank - b.rank)
      .slice(0, 50)
      .map((row) => ({ unit: row.unit, metric: { value: row.rank, label: `Staff Rank #${row.rank}` } }));
  }, [active, wikiRows]);

  return (
    <PageShell sidebarTitle="WIKI" navTree={WIKI_NAV}>
      <h1>Unit Leaderboards</h1>
      <p className="crumb">WIKI / Unit Leaderboards</p>

      <div className="leaderboard-tabs">
        {BOARDS.map((entry) => (
          <button key={entry.id} type="button" className={active === entry.id ? 'active' : ''} onClick={() => setActive(entry.id)}>
            {entry.label}
          </button>
        ))}
      </div>

      <section className="leaderboard-head card">
        <h2>{board.title}</h2>
        <p>{board.description}</p>
        {wikiError && <p className="pending-flag">Ranking data could not load: {wikiError.message}</p>}
        {(active === 'early' || active === 'late') && rows.length === 0 && (
          <p className="pending-flag">No staff rankings yet. Add Early/Late Game rank in /admin WIKI Editor.</p>
        )}
      </section>

      <div className="leaderboard-list">
        {rows.map((row, index) => (
          <LeaderboardRow key={row.unit.slug} index={index} active={active} {...row} />
        ))}
      </div>
    </PageShell>
  );
}

function LeaderboardRow({ unit, metric, index, active }) {
  const glow = getRarityGlow(unit.rarity);
  const isRank = active === 'early' || active === 'late';
  const value = isRank ? `#${metric.value}` : formatCompactNumber(metric.value);
  const full = isRank ? `#${metric.value}` : formatFullNumber(metric.value);
  return (
    <Link to={`/wiki/units/${encodeURIComponent(unit.rarity)}/${unit.slug}`} className="leaderboard-row card">
      <div className="leaderboard-rank">#{index + 1}</div>
      <UnitIcon slug={unit.slug} name={unit.name} glowColor={glow} shiny={isShinyRarity(unit.rarity)} size={56} />
      <div className="leaderboard-main">
        <strong>{unit.name}</strong>
        <span style={{ color: glow }}>{unit.rarity}</span>
        <UnitTags unit={unit} limit={4} />
      </div>
      <div className="leaderboard-metric">
        <b title={`${full} exact`}>{value}</b>
        <small>{metric.label || '—'}</small>
      </div>
    </Link>
  );
}
