import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PageShell from '../../components/PageShell';
import PageIntro from '../../components/PageIntro';
import UnitIcon from '../../components/UnitIcon';
import Dropdown from '../../components/Dropdown';
import { TermTip } from '../../components/StatMeta';
import { useData } from '../../context/DataContext';
import { VALUES_NAV } from '../../config/navigation';
import { UNIT_RARITIES, getRarityGlow, isShinyRarity } from '../../data/taxonomy';
import { parseCompactValue, formatSiteNumber } from '../../utils/formatNumber';
import './Afford.css';

const QUICK_BUDGETS = [100_000, 1_000_000, 10_000_000, 100_000_000, 300_000_000, 1_000_000_000];
const MODES = [
  { id: 'tradeValue', label: 'Trade value', icon: '💎' },
  { id: 'gems', label: 'Gems', icon: '🔷' },
  { id: 'coins', label: 'Coins', icon: '🪙' },
];
const SORTS = [
  { id: 'best', label: 'Best value (closest to budget)' },
  { id: 'high', label: 'Highest first' },
  { id: 'low', label: 'Lowest first' },
  { id: 'name', label: 'Name A–Z' },
];

// Shiny Omega and O/C units have no numeric price. From a 300M budget they are
// treated as affordable at an estimated 300M so they appear in the results.
// "???" (Secret) units stay excluded — they have no usable value at all.
const SPECIAL_PRICE = 300_000_000;

function isSecretRarity(rarity) {
  return String(rarity || '').includes('???');
}

function isShinyOmega(unit) {
  return /shiny\s*omega/i.test(String(unit?.rarity || ''));
}

function isOC(unit) {
  const fields = [unit?.specialValue, unit?.specialGems, unit?.specialCoins,
    unit?.baseValue, unit?.gems, unit?.coins];
  return fields.some((value) => /^O\/C$/i.test(String(value ?? '').trim()));
}

function isSpecialEligible(unit) {
  return !isSecretRarity(unit?.rarity) && (isShinyOmega(unit) || isOC(unit));
}

function priceOf(unit, mode) {
  const numeric = Number(unit?.[mode]);
  if (Number.isFinite(numeric) && numeric > 0) {
    return { price: numeric, label: formatSiteNumber(numeric), special: false, note: '' };
  }
  if (isSpecialEligible(unit)) {
    return {
      price: SPECIAL_PRICE,
      label: formatSiteNumber(SPECIAL_PRICE),
      special: true,
      note: isOC(unit) ? 'O/C' : 'SHINY OMEGA',
    };
  }
  return null;
}

/**
 * Reverse research page: enter a budget, see which units you could actually
 * afford. Deliberately a standalone research page (not a calculator feature) —
 * it reads the same live values but works in the opposite direction.
 */
export default function Afford() {
  const { unitValues } = useData();
  const [rawBudget, setRawBudget] = useState('20M');
  const [mode, setMode] = useState('tradeValue');
  const [rarity, setRarity] = useState('all');
  const [sort, setSort] = useState('best');
  const [query, setQuery] = useState('');
  const [includeShiny, setIncludeShiny] = useState(false);

  const budget = parseCompactValue(rawBudget);
  const valid = budget !== null && budget > 0;

  const rarityOptions = useMemo(() => [
    { value: 'all', label: 'All rarities' },
    ...UNIT_RARITIES.filter((item) => !isSecretRarity(item)).map((item) => ({ value: item, label: item })),
  ], []);
  const sortOptions = useMemo(() => SORTS.map((item) => ({ value: item.id, label: item.label })), []);

  const units = useMemo(() => (unitValues || []).reduce((list, unit) => {
    if (!unit || unit.kind === 'item') return list;
    if (isSecretRarity(unit.rarity)) return list; // no "???" units
    const special = isSpecialEligible(unit);
    // Eligible Shiny Omega / O-C units appear even with "Include Shiny" off.
    if (!includeShiny && !special && isShinyRarity(unit.rarity)) return list;
    if (rarity !== 'all' && unit.rarity !== rarity) return list;
    if (query.trim() && !String(unit.name || '').toLowerCase().includes(query.trim().toLowerCase())) return list;
    const priced = priceOf(unit, mode);
    if (priced) list.push({ ...unit, ...priced });
    return list;
  }, []), [unitValues, rarity, query, includeShiny, mode]);

  const matches = useMemo(() => {
    if (!valid) return [];
    const within = units
      .filter((unit) => unit.price <= budget)
      .map((unit) => ({ ...unit, share: unit.price / budget }));
    within.sort((a, b) => {
      if (sort === 'high') return b.price - a.price;
      if (sort === 'low') return a.price - b.price;
      if (sort === 'name') return String(a.name).localeCompare(String(b.name));
      return b.share - a.share || b.price - a.price;
    });
    return within;
  }, [units, budget, valid, sort]);

  const total = matches.reduce((sum, unit) => sum + unit.price, 0);
  const nearest = matches[0];
  const specialCount = matches.filter((unit) => unit.special).length;

  return (
    <PageShell sidebarTitle="VALUES" navTree={VALUES_NAV}>
      <PageIntro
        eyebrow="REVERSE RESEARCH"
        title="What can I afford?"
        description="Set a budget and see every unit within reach, ranked by how much of your budget it uses. The opposite of the trade calculator — research first, trade second."
      />

      <section className="afford-controls">
        <div className="afford-budget-row">
          <label className="afford-budget-field">
            <span><TermTip term="budget">Your budget</TermTip></span>
            <input
              className="afford-input"
              value={rawBudget}
              onChange={(event) => setRawBudget(event.target.value)}
              placeholder="e.g. 20M"
              aria-invalid={!valid || undefined}
              aria-label="Budget"
            />
            <small>
              {valid
                ? `= ${formatSiteNumber(budget, { full: true })} · K / M / B / T accepted`
                : 'Enter a number, e.g. 20M'}
            </small>
          </label>
          <div className="afford-mode" role="group" aria-label="Price basis">
            {MODES.map((item) => (
              <button
                key={item.id}
                type="button"
                className={mode === item.id ? 'active' : ''}
                onClick={() => setMode(item.id)}
              >{item.icon} {item.label}</button>
            ))}
          </div>
        </div>

        <div className="afford-quick">
          <span>Quick budgets</span>
          {QUICK_BUDGETS.map((value) => (
            <button key={value} type="button" onClick={() => setRawBudget(formatSiteNumber(value))}>
              {formatSiteNumber(value)}
            </button>
          ))}
        </div>

        <div className="afford-filters">
          <input
            className="afford-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter by unit name…"
            aria-label="Filter by unit name"
          />
          <Dropdown
            compact
            className="afford-dd"
            value={rarity}
            onChange={setRarity}
            options={rarityOptions}
            ariaLabel="Rarity filter"
          />
          <Dropdown
            compact
            className="afford-dd"
            value={sort}
            onChange={setSort}
            options={sortOptions}
            ariaLabel="Sort results"
          />
          <label className="afford-check">
            <input type="checkbox" checked={includeShiny} onChange={(event) => setIncludeShiny(event.target.checked)} />
            Include Shiny
          </label>
        </div>
      </section>

      {!valid ? (
        <div className="afford-empty">Enter a budget above to see what you can afford.</div>
      ) : (
        <>
          <div className="afford-summary">
            <div><strong>{matches.length}</strong><span>units within {formatSiteNumber(budget)}</span></div>
            <div><strong>{formatSiteNumber(nearest?.price || 0)}</strong><span>best-value pick{nearest ? ` · ${nearest.name}` : ''}</span></div>
            <div><strong>{formatSiteNumber(total)}</strong><span>combined value of results</span></div>
            {specialCount > 0 && <div><strong>{specialCount}</strong><span>Shiny Omega / O/C included at {formatSiteNumber(SPECIAL_PRICE)}</span></div>}
            <Link to={`/values/calculator?budget=${encodeURIComponent(String(budget))}`} className="afford-cta">Open trade calculator →</Link>
          </div>

          {matches.length === 0 ? (
            <div className="afford-empty">No units match this budget and filter. Try a larger budget or a different rarity.</div>
          ) : (
            <div className="afford-grid">
              {matches.slice(0, 120).map((unit) => (
                <Link
                  key={`${unit.rarity}-${unit.slug}`}
                  to={`/values/units/${encodeURIComponent(unit.rarity)}/${encodeURIComponent(unit.slug)}`}
                  className={`afford-card${unit.special ? ' afford-card-special-unit' : ''}`}
                  style={{ '--afford-glow': getRarityGlow(unit.rarity) }}
                >
                  <div className="afford-card-head">
                    <UnitIcon slug={unit.slug} name={unit.name} glowColor={getRarityGlow(unit.rarity)} shiny={isShinyRarity(unit.rarity)} size={46} imageUrl={unit.imageUrl} />
                    <div><strong>{unit.name}</strong><small style={{ color: getRarityGlow(unit.rarity) }}>{unit.rarity}</small></div>
                    <span className="afford-card-price">{unit.label}</span>
                  </div>
                  <div className="afford-bar"><div style={{ width: `${Math.min(100, unit.share * 100)}%` }} /></div>
                  <small className="afford-share">
                    {Math.round(unit.share * 100)}% of your budget
                    {unit.special && <span className="afford-card-note" data-afford-note={unit.note}>{unit.note}</span>}
                  </small>
                </Link>
              ))}
            </div>
          )}
          {matches.length > 120 && <p className="afford-more">Showing the first 120 of {matches.length} results. Narrow the filters to see more.</p>}
        </>
      )}

      <p className="afford-foot">
        Values are community estimates, not official prices. From a {formatSiteNumber(SPECIAL_PRICE)} budget, Shiny Omega and O/C units are included at an estimated {formatSiteNumber(SPECIAL_PRICE)}.
      </p>
    </PageShell>
  );
}
