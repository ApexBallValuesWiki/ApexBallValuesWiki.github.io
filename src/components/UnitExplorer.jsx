import { useState, useMemo, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useData } from '../context/DataContext';
import { getRarityGlow, isShinyRarity, UNIT_RARITIES } from '../data/taxonomy';
import { formatCompactNumber } from '../utils/formatNumber';
import UnitIcon from './UnitIcon';
import './UnitExplorer.css';

const RARITY_FILTERS = [
  { id: 'all', label: 'All', color: 'var(--c-info)' },
  { id: 'Normie', label: 'Normie', color: '#C0C0C0' },
  { id: 'Odds', label: 'Odds', color: '#33A033' },
  { id: 'Rares', label: 'Rare', color: '#0CEDE8' },
  { id: 'Awesome', label: 'Awesome', color: 'var(--c-purple)' },
  { id: 'Legendaries', label: 'Legendary', color: '#FFB84D' },
  { id: 'Mythics', label: 'Mythic', color: '#FF6B6B' },
  { id: 'Transcendents', label: 'Transcendent', color: '#5FE8A8' },
  { id: 'Omegas', label: 'Omega', color: '#3020B0' },
  { id: '???', label: '???', color: '#9aa7c7' },
];

export default function UnitExplorer({ section = 'wiki' }) {
  const scope = section === 'values' ? 'values' : 'wiki';
  const { unitValues, wikiRows } = useData();
  const [filter, setFilter] = useState('all');
  const [roll, setRoll] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef(null);

  const wikiImages = useMemo(() => {
    const map = {};
    wikiRows.forEach(r => { if (r.slug && r.image_url) map[r.slug] = r.image_url; });
    return map;
  }, [wikiRows]);

  const pool = useMemo(() => {
    let units = unitValues;
    if (filter !== 'all') {
      units = units.filter(u => {
        const base = u.rarity?.replace(/^Shiny\s+/i, '');
        return base === filter || u.rarity === filter;
      });
    }
    return units;
  }, [unitValues, filter]);

  const featured = useMemo(() => {
    if (pool.length === 0) return null;
    return pool[Math.floor(roll * pool.length) % pool.length];
  }, [pool, roll]);

  // Auto-cycle
  useEffect(() => {
    if (paused) return;
    const interval = setInterval(() => setRoll(Math.random()), 4000);
    return () => clearInterval(interval);
  }, [paused]);

  const glow = featured ? getRarityGlow(featured.rarity) : 'var(--c-info)';
  const imageUrl = featured ? (wikiImages[featured.slug] || featured.imageUrl) : null;

  return (
    <div className="unit-explorer" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      {/* Header */}
      <div className="ue-header">
        <div className="ue-status">
          <span className="ue-dot" />
          <span className="ue-title">TESTING {scope.toUpperCase()} · {pool.length} UNITS</span>
        </div>
        <span className="ue-auto">{paused ? '⏸ PAUSED' : '🔄 AUTO'}</span>
      </div>

      {/* Rarity Filters */}
      <div className="ue-filters">
        {RARITY_FILTERS.map(f => (
          <button
            key={f.id}
            className={`ue-filter ${filter === f.id ? 'active' : ''}`}
            style={{ '--filter-color': f.color }}
            onClick={() => { setFilter(f.id); setRoll(Math.random()); }}
          >
            <span className="ue-filter-dot" style={{ background: f.color }} />
            {f.label}
          </button>
        ))}
      </div>

      {/* Featured Unit */}
      <AnimatePresence mode="wait">
        {featured && (
          <motion.div
            key={featured.slug + roll}
            className="ue-featured"
            style={{ borderColor: glow }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
          >
            <div className="ue-featured-icon">
              <UnitIcon
                slug={featured.slug}
                name={featured.name}
                glowColor={glow}
                shiny={isShinyRarity(featured.rarity)}
                size={72}
                imageUrl={imageUrl}
              />
            </div>
            <div className="ue-featured-info">
              <span className="ue-featured-label" style={{ color: glow }}>
                🎯 {featured.rarity} · {featured.type || 'Unit'}
              </span>
              <h3 className="ue-featured-name">{featured.name}</h3>
              {scope === 'values' && featured.hasValue && (
                <span className="ue-featured-value">
                  💎 {formatCompactNumber(featured.tradeValue)}
                </span>
              )}
            </div>
            <div className="ue-featured-actions">
              <button className="ue-reroll" onClick={() => setRoll(Math.random())}>🎲</button>
              <Link to={`/${scope}/units/${encodeURIComponent(featured.rarity)}/${featured.slug}`} className="ue-launch">
                View →
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Links */}
      <div className="ue-links">
        {scope === 'wiki' ? (
          <>
            <Link to="/wiki/units/search" className="ue-link">🔍 Search</Link>
            <Link to="/wiki/compare" className="ue-link">⚖️ Compare</Link>
            <Link to="/wiki/leaderboards" className="ue-link">🏆 Leaderboards</Link>
            <Link to="/wiki/maps" className="ue-link">🗺️ Maps</Link>
          </>
        ) : (
          <>
            <Link to="/values/units/search" className="ue-link">🔍 Search</Link>
            <Link to="/values/calculator" className="ue-link">🧮 Calculator</Link>
            <Link to="/minigames" className="ue-link">🧠 Knowledge</Link>
          </>
        )}
      </div>
    </div>
  );
}
