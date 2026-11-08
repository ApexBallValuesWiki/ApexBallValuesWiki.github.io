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
import { priceRange, shinyOCRank, relevancyRank } from '../../utils/valueRules';
import './Afford.css';

const QUICK_BUDGETS = [100_000, 1_000_000, 10_000_000, 100_000_000, 300_000_000, 1_000_000_000];
const MODES = [
  { id: 'tradeValue', label: 'Trade value', icon: '💎' },
  { id: 'gems', label: 'Gems', icon: '🔷' },
  { id: 'coins', label: 'Coins', icon: '🪙' },
];
const SORTS = [
  { id: 'relevancy', label: 'Sort by relevancy' },
  { id: 'best', label: 'Best value (closest to budget)' },
  { id: 'high', label: 'Highest first' },
  { id: 'low', label: 'Lowest first' },
  { id: 'name', label: 'Name A–Z' },
];

// O/C and Shiny Omega units have no numeric price. They are still listed from
// a 300M budget, but O/C shows "O/C" (never a made-up 300M) and "N/A%" instead
// of a percentage, because O/C values vary wildly from one copy to another.
const SPECIAL_PRICE = 300_000_000;

function isSecretRarity(rarity) {
  return String(rarity || '').includes('???');
}

function isShinyOmega(unit) {
  return /shiny\s*omega/i.test(String(unit?.rarity || ''));
}

// O/C and N/A are both "no fixed price" markers. O/C wins if a row carries
// both (e.g. value O/C, gems N/A). Neither is ever shown as 300M or a percent.
function specialMarker(unit) {
  const fields = [unit?.specialValue, unit?.specialGems, unit?.specialCoins,
    unit?.baseValue, unit?.gems, unit?.coins];
  const tags = fields.map((value) => String(value ?? '').trim());
  if (tags.some((value) => /^O\/C$/i.test(value))) return 'O/C';
  if (tags.some((value) => /^N\/A$/i.test(value))) return 'N/A';
  return null;
}

function isOC(unit) {
  return specialMarker(unit) === 'O/C';
}

function isSpecialEligible(unit) {
  return !isSecretRarity(unit?.rarity) && (isShinyOmega(unit) || isOC(unit));
}

function priceOf(unit, mode) {
  const { min, max, hasRange } = priceRange(unit, mode);
  if (min > 0) {
    return {
      // The TOP of the range is the conservative "can I actually afford it"
      // number; the full range is shown on the card.
      price: max,
      min,
      max,
      hasRange,
      label: hasRange ? `${formatSiteNumber(min)}–${formatSiteNumber(max)}` : formatSiteNumber(min),
      special: false,
      oc: false,
      note: '',
    };
  }
  if (isSpecialEligible(unit)) {
    const marker = specialMarker(unit);
    return {
      price: SPECIAL_PRICE,
      min: SPECIAL_PRICE,
      max: SPECIAL_PRICE,
      hasRange: false,
      label: marker || formatSiteNumber(SPECIAL_PRICE),
      special: true,
      noPrice: Boolean(marker),
      note: marker || 'SHINY OMEGA',
    };
  }
  return null;
}

/** Reverse research page: enter a budget, see which units you could afford. */
export default function Afford() {
  const { unitValues } = useData();
  const [rawBudget, setRawBudget] = useState('20M');
  const [mode, setMode] = useState('tradeValue');
  const [rarity, setRarity] = useState('all');
  const [sort, setSort] = useState('relevancy');
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
    if (isSecretRarity(unit.rarity)) return list;
    const special = isSpecialEligible(unit);
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
      .map((unit) => ({
        ...unit,
        share: unit.noPrice ? null : unit.max / budget,
        shareMin: unit.noPrice ? null : unit.min / budget,
        ocRank: unit.noPrice ? shinyOCRank(unit) : Number.POSITIVE_INFINITY,
        pin: relevancyRank(unit),
      }));
    within.sort((a, b) => {
      if (sort === 'relevancy') {
        // Pinned units first (in the order given), then the Shiny O/C ranking,
        // then everything else by price, highest first.
        const aPinned = a.pin !== null;
        const bPinned = b.pin !== null;
        if (aPinned !== bPinned) return aPinned ? -1 : 1;
        if (aPinned && bPinned && a.pin !== b.pin) return a.pin - b.pin;
        if (a.ocRank !== b.ocRank) return a.ocRank - b.ocRank;
        return b.price - a.price;
      }
      if (sort === 'high') return b.price - a.price;
      if (sort === 'low') return a.price - b.price;
      if (sort === 'name') return String(a.name).localeCompare(String(b.name));
      return (b.share ?? 0) - (a.share ?? 0) || b.price - a.price;
    });
    return within;
  }, [units, budget, valid, sort]);

  const total = matches.reduce((sum, unit) => sum + (unit.noPrice ? 0 : unit.price), 0);
  const nearest = matches[0];
  const ocCount = matches.filter((unit) => unit.note === 'O/C').length;
  const naCount = matches.filter((unit) => unit.note === 'N/A').length;
  const otherSpecialCount = matches.filter((unit) => unit.special && !unit.oc).length;

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
          <Dropdown compact className="afford-dd" value={rarity} onChange={setRarity} options={rarityOptions} ariaLabel="Rarity filter" />
          <Dropdown compact className="afford-dd" value={sort} onChange={setSort} options={sortOptions} ariaLabel="Sort results" />
          <button
            type="button"
            className={`afford-shiny-toggle${includeShiny ? ' on' : ''}`}
            aria-pressed={includeShiny}
            onClick={() => setIncludeShiny((value) => !value)}
            title="Show shiny units in the results (Shiny Omega / O/C are always included)"
          >
            <span className="afford-shiny-icon" aria-hidden="true">✦</span>
            <span className="afford-shiny-label">Include Shiny</span>
            <span className="afford-shiny-state">{includeShiny ? 'ON' : 'OFF'}</span>
          </button>
        </div>
      </section>

      {!valid ? (
        <div className="afford-empty">Enter a budget above to see what you can afford.</div>
      ) : (
        <>
          <div className="afford-summary">
            <div><strong>{matches.length}</strong><span>units within {formatSiteNumber(budget)}</span></div>
            <div><strong>{nearest?.label || '—'}</strong><span>top pick{nearest ? ` · ${nearest.name}` : ''}</span></div>
            <div><strong>{formatSiteNumber(total)}</strong><span>combined value of results</span></div>
            {ocCount > 0 && <div><strong>{ocCount}</strong><span>O/C units · no fixed price</span></div>}
            {naCount > 0 && <div><strong>{naCount}</strong><span>N/A units · no fixed price</span></div>}
            {otherSpecialCount > 0 && <div><strong>{otherSpecialCount}</strong><span>Shiny Omega included at {formatSiteNumber(SPECIAL_PRICE)}</span></div>}
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
                  className={`afford-card${unit.special ? ' afford-card-special-unit' : ''}${(unit.pin !== null && unit.pin !== undefined) ? ' afford-card-pinned' : ''}`}
                  style={{ '--afford-glow': getRarityGlow(unit.rarity) }}
                >
                  <div className="afford-card-head">
                    <UnitIcon slug={unit.slug} name={unit.name} glowColor={getRarityGlow(unit.rarity)} shiny={isShinyRarity(unit.rarity)} size={46} imageUrl={unit.imageUrl} />
                    <div><strong>{unit.name}</strong><small style={{ color: getRarityGlow(unit.rarity) }}>{unit.rarity}</small></div>
                    <span className="afford-card-price">{unit.label}</span>
                  </div>
                  <div className="afford-bar"><div style={{ width: `${unit.noPrice ? 0 : Math.min(100, (unit.share || 0) * 100)}%` }} /></div>
                  <small className="afford-share">
                    {unit.noPrice
                      ? 'N/A% of your budget'
                      : (unit.hasRange
                        ? `${Math.round((unit.shareMin || 0) * 100)}–${Math.round(unit.share * 100)}% of your budget`
                        : `${Math.round(unit.share * 100)}% of your budget`)}
                    {unit.special && <span className="afford-card-note" data-afford-note={unit.note}>{unit.note}</span>}
                    {unit.pin !== null && unit.pin !== undefined && <span className="afford-card-pin">TOP PICK</span>}
                  </small>
                </Link>
              ))}
            </div>
          )}
          {matches.length > 120 && <p className="afford-more">Showing the first 120 of {matches.length} results. Narrow the filters to see more.</p>}
        </>
      )}

      <p className="afford-foot">
        Values are community estimates, not official prices. Value ranges are shown as min–max;
        the top of the range decides affordability. O/C units have no fixed price, so they show
        <strong>O/C</strong> and <strong>N/A</strong> units show their marker plus
        <strong> N/A%</strong> instead of an estimated number or percentage.
        Shiny Omega units are listed from a {formatSiteNumber(SPECIAL_PRICE)} budget.
      </p>
    </PageShell>
  );
}
