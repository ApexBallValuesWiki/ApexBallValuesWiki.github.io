import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getRarityGlow, isShinyRarity } from '../data/taxonomy';
import { sortUnitsByRarityThenName } from '../utils/sortUnits';
import UnitIcon from './UnitIcon';
import { useData } from '../context/DataContext';
import './GlobalUnitSearch.css';

/**
 * Centered search overlay for jumping straight to a unit. Opened from the
 * Header's "Units" nav links (WIKI or VALUES) — searches every unit by
 * name and navigates to `${basePath}/${rarity}/${slug}?highlight=${slug}`,
 * where EntityGrid picks up the `highlight` param to scroll to and pulse
 * the matching card. Basically the same page you'd land on browsing
 * normally, just deep-linked straight to the unit.
 */
export default function GlobalUnitSearch({ open, onClose, basePath }) {
  const { unitValues } = useData();
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }
    if (open) window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool = q ? unitValues.filter((u) => u.name.toLowerCase().includes(q)) : unitValues;
    // Rarity ladder first, then A–Z, so results read in a predictable order
    // instead of raw stat-sheet order.
    return sortUnitsByRarityThenName(pool).slice(0, 24);
  }, [query, unitValues]);

  function goTo(unit) {
    navigate(`${basePath}/${encodeURIComponent(unit.rarity)}?highlight=${unit.slug}`);
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
          transition={{ duration: 0.2 }}
          onClick={onClose}
        >
          <motion.div
            className="gus-panel"
            initial={{ opacity: 0, scale: 0.92, y: -12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -8 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <input
              ref={inputRef}
              type="text"
              className="gus-input"
              placeholder="Search for any unit…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className="gus-results">
              {results.length === 0 ? (
                <div className="gus-empty">No units match "{query}".</div>
              ) : (
                results.map((unit) => {
                  const glow = getRarityGlow(unit.rarity);
                  return (
                    <button type="button" key={unit.slug} className="gus-option" onClick={() => goTo(unit)}>
                      <UnitIcon
                        slug={unit.slug}
                        name={unit.name}
                        glowColor={glow}
                        shiny={isShinyRarity(unit.rarity)}
                        size={38}
                      />
                      <div className="gus-option-text">
                        <span className="gus-option-name">{unit.name}</span>
                        <span className="gus-option-meta" style={{ color: glow }}>
                          {unit.rarity}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}