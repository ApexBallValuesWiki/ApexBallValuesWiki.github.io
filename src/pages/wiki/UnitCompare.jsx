import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PageShell from '../../components/PageShell';
import UnitTags from '../../components/UnitTags';
import Dropdown from '../../components/Dropdown';
import { WIKI_NAV } from '../../config/navigation';
import { getRarityGlow } from '../../data/taxonomy';
import { groupAndSortUnitsByRarity } from '../../utils/sortUnits';
import { labelAttacks } from '../../utils/attacks';
import { useData } from '../../context/DataContext';
import './UnitCompare.css';

function statValue(unit, key) {
  return unit?.minMaxStats?.[key] || '—';
}

function collectStatKeys(a, b) {
  return [...new Set([...Object.keys(a?.minMaxStats || {}), ...Object.keys(b?.minMaxStats || {})])];
}

export default function UnitCompare() {
  const { unitValues } = useData();
  const options = useMemo(() => unitValues.filter((u) => u.documented && !u.unavailableData), [unitValues]);

  function getUnit(slug) {
    return unitValues.find((unit) => unit.slug === slug) || unitValues[0];
  }

  // Grouped + sorted (rarity ladder first, then A–Z within each rarity) so a
  // unit like KrampusBall (Transcendent) sits with the other Transcendents
  // instead of appearing in the middle of the Legendaries.
  const groupedOptions = useMemo(
    () => groupAndSortUnitsByRarity(options).map((group) => ({
      label: group.rarity,
      options: group.units.map((unit) => ({
        value: unit.slug,
        label: unit.name,
        accent: getRarityGlow(unit.rarity),
      })),
    })),
    [options]
  );
  const [leftSlug, setLeftSlug] = useState(options[0]?.slug || '');
  const [rightSlug, setRightSlug] = useState(options[1]?.slug || options[0]?.slug || '');

  const left = getUnit(leftSlug);
  const right = getUnit(rightSlug);
  const statKeys = collectStatKeys(left, right);
  const maxRows = Math.max(left?.upgrades?.length || 0, right?.upgrades?.length || 0);

  return (
    <PageShell sidebarTitle="WIKI" navTree={WIKI_NAV}>
      <h1>Unit Compare</h1>
      <p className="crumb">WIKI / Unit Compare</p>

      <div className="compare-selectors">
        <UnitSelect label="Left Unit" value={leftSlug} onChange={setLeftSlug} groups={groupedOptions} />
        <UnitSelect label="Right Unit" value={rightSlug} onChange={setRightSlug} groups={groupedOptions} />
      </div>

      <div className="compare-grid">
        <CompareCard unit={left} />
        <CompareCard unit={right} />
      </div>

      <section className="compare-section">
        <h2>Min → Max Stats</h2>
        <table className="compare-table">
          <thead>
            <tr>
              <th>Stat</th>
              <th>{left.name}</th>
              <th>{right.name}</th>
            </tr>
          </thead>
          <tbody>
            {statKeys.map((key) => (
              <tr key={key}>
                <th>{key}</th>
                <td>{statValue(left, key)}</td>
                <td>{statValue(right, key)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="compare-section">
        <h2>Upgrade Path</h2>
        <div className="compare-upgrades">
          {Array.from({ length: maxRows }).map((_, index) => (
            <div key={index} className="compare-upgrade-row">
              <UpgradeSummary unit={left} upgrade={left.upgrades?.[index]} />
              <UpgradeSummary unit={right} upgrade={right.upgrades?.[index]} />
            </div>
          ))}
        </div>
      </section>
    </PageShell>
  );
}

function UnitSelect({ label, value, onChange, groups }) {
  const selectedUnit = groups
    .flatMap((group) => group.options)
    .find((option) => option.value === value);
  const accent = selectedUnit?.accent;
  return (
    <label className="compare-select">
      <span>{label}</span>
      <Dropdown
        value={value}
        onChange={onChange}
        groups={groups}
        searchable
        searchPlaceholder="Search units…"
        placeholder="Pick a unit…"
        accent={accent}
      />
    </label>
  );
}

function CompareCard({ unit }) {
  if (!unit) return null;
  return (
    <div className="compare-card card">
      <h2>{unit.name}</h2>
      <p className="compare-rarity">{unit.rarity}</p>
      <UnitTags unit={unit} />
      <div className="compare-kv">
        <span>Type</span><b>{unit.type}</b>
        <span>Raw Type</span><b>{unit.rawType}</b>
        <span>Category</span><b>{unit.category}</b>
        <span>Placement</span><b>{unit.placementLimit || '—'}</b>
        <span>Total Cost</span><b>{unit.totalCost || '—'}</b>
      </div>
      <Link to={`/wiki/units/${encodeURIComponent(unit.rarity)}/${unit.slug}`} className="compare-link">Open page →</Link>
    </div>
  );
}

function UpgradeSummary({ unit, upgrade }) {
  if (!upgrade) {
    return <div className="compare-upgrade-card empty">No matching upgrade</div>;
  }

  const damageRows = [];
  labelAttacks(upgrade.attacks).forEach((attack) => {
    Object.entries(attack.stats).forEach(([key, value]) => {
      if (/damage/i.test(key)) damageRows.push(`${attack.label} ${key}: ${value}`);
    });
  });

  return (
    <div className="compare-upgrade-card">
      <div className="compare-upgrade-head">
        <strong>{unit.name}</strong>
        <span>{upgrade.label} · {upgrade.costRaw || '—'}</span>
      </div>
      <div className="compare-mini-stats">
        <span>Cooldown: {upgrade.cooldown || '—'}</span>
        <span>Range: {upgrade.range || '—'}</span>
        <span>DPS: {Object.values(upgrade.dps || {}).join(' / ') || '—'}</span>
        <span>Cost/DPS: {upgrade.costPerDps || '—'}</span>
      </div>
      {damageRows.length > 0 && <p>{damageRows.join(' / ')}</p>}
    </div>
  );
}
