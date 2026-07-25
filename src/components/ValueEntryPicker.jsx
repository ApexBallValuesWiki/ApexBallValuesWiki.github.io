import { useMemo, useRef, useState } from 'react';
import { getRarityGlow, isShinyRarity } from '../data/taxonomy';
import { searchValueEntries } from '../data/values';
import UnitIcon from './UnitIcon';
import { formatCompactNumber, formatFullNumber } from '../utils/formatNumber';
import './ValueEntryPicker.css';

function searchEntries(entries, query, { onlyWithValue = true } = {}) {
  if (!entries) return searchValueEntries(query, { onlyWithValue });
  const q = query.trim().toLowerCase();
  const pool = onlyWithValue ? entries.filter((entry) => entry.hasValue) : entries;
  if (!q) return pool;
  return pool.filter((entry) => entry.name.toLowerCase().includes(q) || entry.slug.includes(q.replace(/\s+/g, '-')));
}

export default function ValueEntryPicker({ onPick, placeholder = 'Search units & items…', entries = null }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const inputRef = useRef(null);

  const results = useMemo(() => {
    if (!open) return [];
    return searchEntries(entries, query).slice(0, 30);
  }, [entries, query, open]);

  function pick(entry) {
    onPick(entry);
    setQuery('');
    setOpen(false);
    inputRef.current?.blur();
  }

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
          {results.length === 0 ? (
            <div className="vep-empty">No units/items with market data match &quot;{query}&quot;.</div>
          ) : (
            results.map((entry) => {
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
            })
          )}
        </div>
      )}
    </div>
  );
}
