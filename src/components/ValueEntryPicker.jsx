import { useMemo, useRef, useState } from 'react';
import { UNIT_RARITIES, getRarityGlow, isShinyRarity } from '../data/taxonomy';
import { searchValueEntries } from '../data/values';
import UnitIcon from './UnitIcon';
import { formatCompactNumber, formatFullNumber } from '../utils/formatNumber';
import './ValueEntryPicker.css';

function buildPool(entries) {
  return entries.filter((entry) => entry.hasValue);
}

function matches(entry, q) {
  return entry.name.toLowerCase().includes(q) || entry.slug.includes(q.replace(/\s+/g, '-'));
}

// Add-picker for the trade calculator. Opened with no typing, it shows the
// FULL catalog — currencies pinned on top, then every unit grouped by rarity
// (official order), then items/materials — all scrollable, so anything can be
// found without searching. Typing filters to matching entries instead.
export default function ValueEntryPicker({
  onPick,
  onPickCurrency = null,
  currencies = [],
  placeholder = 'Search units & items…',
  entries = null,
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const inputRef = useRef(null);

  const q = query.trim().toLowerCase();

  // Search results (typed). Null while browsing the full list.
  const results = useMemo(() => {
    if (!q) return null;
    if (entries) return buildPool(entries).filter((entry) => matches(entry, q));
    return searchValueEntries(query, { onlyWithValue: true });
  }, [entries, q, query]);

  // Full browsable catalog, grouped for the no-search view.
  const groups = useMemo(() => {
    if (q || !entries) return null;
    const byKey = new Map();
    for (const entry of buildPool(entries)) {
      const key = entry.kind === 'unit'
        ? (UNIT_RARITIES.includes(entry.rarity) ? entry.rarity : 'Other')
        : 'Items & Materials';
      if (!byKey.has(key)) byKey.set(key, []);
      byKey.get(key).push(entry);
    }
    const tail = ['Items & Materials', 'Other'].filter((k) => byKey.has(k));
    return [...UNIT_RARITIES.filter((r) => byKey.has(r)), ...tail]
      .map((key) => ({ key, rows: byKey.get(key) }));
  }, [entries, q]);

  const currencyRows = q ? currencies.filter((c) => c.name.toLowerCase().includes(q)) : currencies;
  const entryCount = groups
    ? groups.reduce((n, g) => n + g.rows.length, 0)
    : (results?.length || 0);
  const nothing = currencyRows.length === 0 && entryCount === 0;

  function close() {
    setQuery('');
    setOpen(false);
    inputRef.current?.blur();
  }

  function pick(entry) {
    onPick(entry);
    close();
  }

  function pickCurrency(currency) {
    if (onPickCurrency) onPickCurrency(currency);
    close();
  }

  const renderRow = (entry) => {
    const glow = getRarityGlow(entry.rarity);
    return (
      <button
        type="button"
        key={`${entry.kind}-${entry.slug}`}
        className="vep-option"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => pick(entry)}
      >
        {entry.kind === 'unit' ? (
          <UnitIcon
            slug={entry.slug}
            name={entry.name}
            glowColor={glow}
            shiny={isShinyRarity(entry.rarity)}
            size={28}
            imageUrl={entry.imageUrl}
          />
        ) : (
          <div className="vep-item-icon">{entry.name[0]}</div>
        )}
        <div className="vep-option-text">
          <span className="vep-option-name">{entry.name}</span>
          <span className="vep-option-meta" style={{ color: glow }}>
            {entry.rarity || entry.group}
          </span>
        </div>
        <span className="vep-option-value" title={`${formatFullNumber(entry.tradeValue)} exact`}>
          {formatCompactNumber(entry.tradeValue)}
        </span>
      </button>
    );
  };

  return (
    <div className="vep-wrap">
      <input
        ref={inputRef}
        type="text"
        className="calc-input vep-input"
        placeholder={placeholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
      />
      {open && (
        <div className="vep-dropdown" data-lenis-prevent>
          {nothing ? (
            <div className="vep-empty">No units/items with market data match &quot;{query}&quot;.</div>
          ) : (
            <>
              {currencyRows.length > 0 && (
                <div className="vep-group">
                  <div className="vep-group-label vep-group-label-currency">Currency</div>
                  {currencyRows.map((currency) => (
                    <button
                      type="button"
                      key={currency.slug}
                      className="vep-option vep-currency-option"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => pickCurrency(currency)}
                    >
                      <img className="vep-currency-icon" src={currency.icon} alt="" />
                      <div className="vep-option-text">
                        <span className="vep-option-name">{currency.name}</span>
                        <span className="vep-option-meta">Click to enter an amount</span>
                      </div>
                      <span className="vep-option-value vep-option-hint">amount</span>
                    </button>
                  ))}
                </div>
              )}
              {groups
                ? groups.map((group) => (
                    <div className="vep-group" key={group.key}>
                      <div className="vep-group-label" style={{ color: getRarityGlow(group.key) || undefined }}>
                        {group.key}
                      </div>
                      {group.rows.map(renderRow)}
                    </div>
                  ))
                : results.map(renderRow)}
            </>
          )}
        </div>
      )}
    </div>
  );
}
