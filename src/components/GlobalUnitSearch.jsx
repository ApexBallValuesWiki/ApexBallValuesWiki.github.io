import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getRarityGlow, isShinyRarity, DEMAND_COLORS, SCARCITY_COLORS } from '../data/taxonomy';
import { sortUnitsByRarityThenName } from '../utils/sortUnits';
import { formatCompactNumber } from '../utils/formatNumber';
import UnitIcon from './UnitIcon';
import { useData } from '../context/DataContext';
import { saveRecentSearch, loadRecentSearches, getSuggestions } from '../utils/searchHistory';
import { trackSearch } from '../utils/analytics';
import './GlobalUnitSearch.css';

export default function GlobalUnitSearch({ open, onClose, basePath }) {
  const { unitValues } = useData();
  const [query, setQuery] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const recentSearches = loadRecentSearches();

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIdx(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, results.length - 1)); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)); }
      if (e.key === 'Enter' && results[selectedIdx]) { goTo(results[selectedIdx]); }
    }
    if (open) window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose, selectedIdx]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      // Show recent searches when no query
      if (recentSearches.length > 0) {
        return recentSearches.slice(0, 5).map(s => ({ slug: s, name: s, rarity: 'Recent', isRecent: true }));
      }
      return sortUnitsByRarityThenName(unitValues).slice(0, 12);
    }
    const pool = unitValues.filter((u) => {
      const name = (u.name || '').toLowerCase();
      const slug = (u.slug || '').toLowerCase();
      const rarity = (u.rarity || '').toLowerCase();
      return name.includes(q) || slug.includes(q) || rarity.includes(q);
    });
    return sortUnitsByRarityThenName(pool).slice(0, 15);
  }, [query, unitValues, recentSearches]);

  function goTo(unit) {
    if (unit.isRecent) {
      setQuery(unit.name);
      return;
    }
    saveRecentSearch(unit.name);
    trackSearch(unit.name);
    // Go directly to the unit's detail page
    navigate(`${basePath}/${encodeURIComponent(unit.rarity)}/${unit.slug}`);
    onClose();
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="gus-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onClose}
        >
          <motion.div
            className="gus-panel"
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -6 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="gus-input-wrap">
              <span className="gus-icon">🔍</span>
              <input
                ref={inputRef}
                type="text"
                className="gus-input"
                placeholder="Search units, rarities, types…"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setSelectedIdx(0); }}
              />
              {query && (
                <button className="gus-clear" onClick={() => { setQuery(''); setSelectedIdx(0); }}>✕</button>
              )}
            </div>

            {!query && recentSearches.length > 0 && (
              <div className="gus-section-label">Recent Searches</div>
            )}

            <div className="gus-results">
              {results.length === 0 ? (
                <div className="gus-empty">No units match "{query}"</div>
              ) : (
                results.map((unit, i) => {
                  const glow = getRarityGlow(unit.rarity);
                  const isSelected = i === selectedIdx;

                  if (unit.isRecent) {
                    return (
                      <button type="button" key={unit.slug} className="gus-option gus-recent" onClick={() => goTo(unit)}>
                        <span className="gus-recent-icon">🕐</span>
                        <span className="gus-option-name">{unit.name}</span>
                      </button>
                    );
                  }

                  return (
                    <button
                      type="button"
                      key={unit.slug}
                      className={`gus-option ${isSelected ? 'selected' : ''}`}
                      onClick={() => goTo(unit)}
                      onMouseEnter={() => setSelectedIdx(i)}
                    >
                      <UnitIcon slug={unit.slug} name={unit.name} glowColor={glow} shiny={isShinyRarity(unit.rarity)} size={36} />
                      <div className="gus-option-text">
                        <span className="gus-option-name">{unit.name}</span>
                        <span className="gus-option-meta" style={{ color: glow }}>{unit.rarity}</span>
                      </div>
                      {unit.hasValue && (
                        <span className="gus-option-value">{formatCompactNumber(unit.tradeValue)}</span>
                      )}
                    </button>
                  );
                })
              )}
            </div>

            <div className="gus-footer">
              <span>↑↓ Navigate</span>
              <span>↵ Select</span>
              <span>Esc Close</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
