import { useMemo, useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { UNIT_RARITIES, getRarityGlow, isShinyRarity, DEMAND_COLORS, SCARCITY_COLORS } from '../data/taxonomy';
import { sortUnitsByRarityThenName } from '../utils/sortUnits';
import { formatCompactNumber } from '../utils/formatNumber';
import UnitIcon from './UnitIcon';
import { useData } from '../context/DataContext';
import { fuzzySuggest } from '../utils/fuzzySearch';
import './UnitSearchPanel.css';

export default function UnitSearchPanel({ basePath, autoFocus = true, units: propUnits = null }) {
  const { unitValues } = useData();
  const units = propUnits || unitValues;
  const [query, setQuery] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [viewMode, setViewMode] = useState('grid'); // grid | list
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const [suggestIdx, setSuggestIdx] = useState(-1);

  useEffect(() => {
    if (autoFocus) setTimeout(() => inputRef.current?.focus(), 100);
  }, [autoFocus]);

  // Flat filtered results for keyboard nav
  const flatResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool = q
      ? units.filter(u => (u.name || '').toLowerCase().includes(q) || (u.slug || '').includes(q) || (u.rarity || '').toLowerCase().includes(q))
      : units;
    return sortUnitsByRarityThenName(pool);
  }, [query, units]);

  // Typo-tolerant quick suggestions (top 8) — "krampuss" still finds KrampusBall
  const suggestions = useMemo(() => fuzzySuggest(query, units, 8), [query, units]);
  const showSuggest = query.trim().length > 0 && suggestions.length > 0;

  // Grouped by rarity for display
  const groups = useMemo(() => {
    const map = {};
    flatResults.forEach(u => {
      if (!map[u.rarity]) map[u.rarity] = [];
      map[u.rarity].push(u);
    });
    return Object.entries(map).map(([rarity, units]) => ({ rarity, units }));
  }, [flatResults]);

  function goTo(unit) {
    navigate(`${basePath}/${encodeURIComponent(unit.rarity)}/${unit.slug}`);
  }

  useEffect(() => {
    setSelectedIdx(0);
    setSuggestIdx(-1);
  }, [query]);

  return (
    <div className="usp-panel">
      {/* Search Header */}
      <div className="usp-header">
        <div className="usp-search-wrap">
          <span className="usp-search-icon">🔍</span>
          <input
            ref={inputRef}
            type="text"
            className="usp-input"
            placeholder="Search units, rarities, types…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (showSuggest) {
                if (e.key === 'ArrowDown') { e.preventDefault(); setSuggestIdx((i) => Math.min(i + 1, suggestions.length - 1)); return; }
                if (e.key === 'ArrowUp') { e.preventDefault(); setSuggestIdx((i) => Math.max(i - 1, 0)); return; }
                if (e.key === 'Enter' && suggestions[suggestIdx]) { e.preventDefault(); goTo(suggestions[suggestIdx]); return; }
                if (e.key === 'Escape') { setSuggestIdx(-1); return; }
              }
              if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, flatResults.length - 1)); }
              if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)); }
              if (e.key === 'Enter' && flatResults[selectedIdx]) goTo(flatResults[selectedIdx]);
            }}
          />
          {query && (
            <button className="usp-clear" onClick={() => setQuery('')}>✕</button>
          )}
          {showSuggest && (
            <div className="usp-suggest" role="listbox" aria-label="Search suggestions">
              {suggestions.map((u, i) => (
                <button
                  key={u.slug}
                  type="button"
                  role="option"
                  aria-selected={i === suggestIdx}
                  className={`usp-suggest-item${i === suggestIdx ? ' hl' : ''}`}
                  onMouseEnter={() => setSuggestIdx(i)}
                  onClick={() => goTo(u)}
                >
                  <span className="usp-suggest-name">{u.name}</span>
                  {u._matchedByTypo && <span className="usp-suggest-typo">did you mean</span>}
                  <span className="usp-suggest-rarity" style={{ color: getRarityGlow(u.rarity) }}>{u.rarity}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="usp-view-toggle">
          <button className={`usp-view-btn ${viewMode === 'grid' ? 'active' : ''}`} onClick={() => setViewMode('grid')}>▦</button>
          <button className={`usp-view-btn ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')}>☰</button>
        </div>
        <span className="usp-count">{flatResults.length} units</span>
      </div>

      {/* Results */}
      <div className="usp-results" data-lenis-prevent>
        {flatResults.length === 0 ? (
          <div className="usp-empty">
            <span className="usp-empty-icon">🔍</span>
            <p>No units match "{query}"</p>
          </div>
        ) : viewMode === 'grid' ? (
          // Grid View — grouped by rarity
          groups.map(({ rarity, units }) => {
            const glow = getRarityGlow(rarity);
            return (
              <div key={rarity} className="usp-group">
                <div className="usp-group-head" style={{ '--glow': glow }}>
                  <span className="usp-group-dot" style={{ background: glow }} />
                  <span className="usp-group-name">{rarity}</span>
                  <span className="usp-group-count">{units.length}</span>
                </div>
                <div className="usp-grid">
                  {units.map((unit) => {
                    const unitGlow = getRarityGlow(unit.rarity);
                    return (
                      <motion.button
                        key={unit.slug}
                        className="usp-card"
                        onClick={() => goTo(unit)}
                        whileHover={{ y: -3, scale: 1.02 }}
                        whileTap={{ scale: 0.97 }}
                        style={{ borderColor: `${unitGlow}33` }}
                      >
                        <UnitIcon slug={unit.slug} name={unit.name} glowColor={unitGlow} shiny={isShinyRarity(unit.rarity)} size={48} />
                        <span className="usp-card-name">{unit.name}</span>
                        <span className="usp-card-rarity" style={{ color: unitGlow }}>{unit.rarity}</span>
                        {unit.hasValue && (
                          <span className="usp-card-value">{formatCompactNumber(unit.tradeValue)}</span>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            );
          })
        ) : (
          // List View — flat list
          <div className="usp-list">
            {flatResults.map((unit, i) => {
              const unitGlow = getRarityGlow(unit.rarity);
              const isSelected = i === selectedIdx;
              return (
                <motion.button
                  key={unit.slug}
                  className={`usp-row ${isSelected ? 'selected' : ''}`}
                  onClick={() => goTo(unit)}
                  onMouseEnter={() => setSelectedIdx(i)}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(i * 0.02, 0.5) }}
                >
                  <UnitIcon slug={unit.slug} name={unit.name} glowColor={unitGlow} shiny={isShinyRarity(unit.rarity)} size={36} />
                  <div className="usp-row-info">
                    <span className="usp-row-name">{unit.name}</span>
                    <span className="usp-row-meta" style={{ color: unitGlow }}>{unit.rarity} · {unit.type || 'Unit'}</span>
                  </div>
                  {unit.hasValue && (
                    <span className="usp-row-value">{formatCompactNumber(unit.tradeValue)}</span>
                  )}
                  <span className="usp-row-arrow">→</span>
                </motion.button>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="usp-footer">
        <span>↑↓ Navigate</span>
        <span>↵ Open</span>
        <span>{flatResults.length} results</span>
      </div>
    </div>
  );
}
