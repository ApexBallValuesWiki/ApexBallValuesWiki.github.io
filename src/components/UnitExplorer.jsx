import { useState, useMemo, useEffect, useRef } from 'react';
import useMotionPreference from '../hooks/useMotionPreference';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useData } from '../context/DataContext';
import { getRarityGlow, isShinyRarity } from '../data/taxonomy';
import { formatCompactNumber } from '../utils/formatNumber';
import UnitIcon from './UnitIcon';
import './UnitExplorer.css';

const EASE_OUT = [0.16, 1, 0.3, 1];
const tradeLabel = (unit) => unit.specialValue || (unit.hasValue && unit.tradeValue != null ? formatCompactNumber(unit.tradeValue) : 'Unpriced');

export default function UnitExplorer({ section = 'wiki', mode }) {
  const scope = (mode || section) === 'values' ? 'values' : 'wiki';
  const { unitValues, wikiRows } = useData();
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState(() => Math.floor(Math.random() * 40) + 10);
  const [paused, setPaused] = useState(false);
  const [playOverride, setPlayOverride] = useState(false);
  const [inView, setInView] = useState(true);
  const [tabVisible, setTabVisible] = useState(() => typeof document === 'undefined' || !document.hidden);
  const rootRef = useRef(null);
  const motionAllowed = useMotionPreference();
  const playing = !paused && (motionAllowed || playOverride);

  useEffect(() => setPlayOverride(false), [motionAllowed]);
  useEffect(() => {
    const visible = () => setTabVisible(!document.hidden);
    document.addEventListener('visibilitychange', visible);
    if (!rootRef.current || !('IntersectionObserver' in window)) {
      return () => document.removeEventListener('visibilitychange', visible);
    }
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting));
    observer.observe(rootRef.current);
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', visible); };
  }, []);

  const wikiImages = useMemo(() => {
    const map = {};
    wikiRows.forEach((r) => {
      if (r.slug && r.image_url) map[r.slug] = r.image_url;
    });
    return map;
  }, [wikiRows]);

  const pool = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return unitValues;
    return unitValues.filter(
      (u) =>
        u.name?.toLowerCase().includes(q) ||
        u.rarity?.toLowerCase().includes(q) ||
        u.type?.toLowerCase().includes(q)
    );
  }, [unitValues, query]);

  const safeIndex = pool.length > 0 ? ((index % pool.length) + pool.length) % pool.length : 0;
  const featured = pool.length > 0 ? pool[safeIndex] : null;
  const prevUnit = pool.length > 1 ? pool[(safeIndex - 1 + pool.length) % pool.length] : null;
  const nextUnit = pool.length > 1 ? pool[(safeIndex + 1) % pool.length] : null;

  useEffect(() => {
    if (!playing || !inView || !tabVisible || query.trim() || pool.length <= 1) return undefined;
    const interval = window.setInterval(() => {
      // Every roll is different from the currently displayed unit.
      setIndex((prev) => {
        const current = ((prev % pool.length) + pool.length) % pool.length;
        const pick = Math.floor(Math.random() * (pool.length - 1));
        return pick >= current ? pick + 1 : pick;
      });
    }, 6800);
    return () => window.clearInterval(interval);
  }, [playing, inView, tabVisible, query, pool.length]);

  function toggleRotation() {
    if (playing) setPaused(true);
    else {
      if (!motionAllowed) setPlayOverride(true);
      setPaused(false);
    }
  }

  function rerollRandom() {
    if (pool.length <= 1) return;
    let next = Math.floor(Math.random() * pool.length);
    if (next === safeIndex) next = (safeIndex + 1) % pool.length;
    setIndex(next);
  }

  const glow = featured ? getRarityGlow(featured.rarity) : 'var(--accent)';
  const imageUrl = featured ? wikiImages[featured.slug] || featured.imageUrl : null;
  const prevImageUrl = prevUnit ? wikiImages[prevUnit.slug] || prevUnit.imageUrl : null;
  const nextImageUrl = nextUnit ? wikiImages[nextUnit.slug] || nextUnit.imageUrl : null;

  return (
    <section
      ref={rootRef}
      className="unit-explorer"
      style={{ '--matrix-accent': glow }}
      aria-label={`${scope.toUpperCase()} Unit Discovery Deck`}
    >
      {/* Top Brushed-Chrome Command Bar */}
      <div className="ue-header">
        <div className="ue-status">
          <span className="ue-dot" />
          <div className="ue-status-text">
            <span className="ue-kicker">RNG DISCOVERY VAULT</span>
            <span className="ue-title">
              {scope.toUpperCase()} INDEX · {pool.length} UNITS
            </span>
          </div>
        </div>

        <div className="ue-search-box">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.3"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIndex(0);
            }}
            placeholder="Instant filter by unit name, rarity, or role…"
            className="ue-search-input"
            aria-label="Filter units"
          />
          {query && (
            <button
              type="button"
              className="ue-search-clear"
              onClick={() => setQuery('')}
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        <div className="ue-header-controls">
          <button
            type="button"
            className={`ue-auto-btn ${playing ? 'is-active' : ''}`}
            aria-pressed={playing}
            onClick={toggleRotation}
            title={playing ? 'Pause auto-cycle' : !motionAllowed ? 'Play this deck despite the reduced-motion setting' : 'Resume auto-cycle'}
          >
            <span className="ue-auto-indicator" />
            {playing ? 'AUTO CYCLE' : 'PAUSED'}
          </button>
          <button
            type="button"
            className="ue-reroll-top"
            onClick={rerollRandom}
            title="Roll random unit"
          >
            <span aria-hidden="true">↻</span>
            <span>Roll RNG</span>
          </button>
        </div>
      </div>

      {/* 3-Card Architectural Discovery Stage */}
      <div className="ue-stage">
        {featured ? (
          <div className="ue-deck-grid">
            {/* Left Wing Card (Previous Unit) */}
            {prevUnit ? (
              <button
                type="button"
                className="ue-wing-card prev"
                onClick={() => setIndex((safeIndex - 1 + pool.length) % pool.length)}
                title={`Previous: ${prevUnit.name}`}
              >
                <span className="ue-wing-dir">← PREV</span>
                <div className="ue-wing-body">
                  <UnitIcon
                    slug={prevUnit.slug}
                    name={prevUnit.name}
                    glowColor={getRarityGlow(prevUnit.rarity)}
                    shiny={isShinyRarity(prevUnit.rarity)}
                    size={54}
                    imageUrl={prevImageUrl}
                  />
                  <div className="ue-wing-meta">
                    <small style={{ color: getRarityGlow(prevUnit.rarity) }}>
                      {prevUnit.rarity}
                    </small>
                    <strong>{prevUnit.name}</strong>
                    <span>
                      {scope === 'values'
                        ? tradeLabel(prevUnit)
                        : prevUnit.type || 'Tower'}
                    </span>
                  </div>
                </div>
              </button>
            ) : (
              <div className="ue-wing-spacer" />
            )}

            {/* Center Spotlight Vault Card */}
            <div className="ue-center-slot">
            <AnimatePresence initial={false} mode="popLayout">
              <motion.div
                key={`${featured.slug}-${safeIndex}`}
                className="ue-center-vault"
                initial={{ opacity: 0, y: motionAllowed ? 8 : 0 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: motionAllowed ? -5 : 0 }}
                transition={{ duration: motionAllowed ? 0.42 : 0, ease: EASE_OUT }}
              >
                <div className="ue-vault-pedestal">
                  <div className="ue-vault-ring outer" aria-hidden="true" />
                  <div className="ue-vault-ring inner" aria-hidden="true" />
                  <div className="ue-featured-icon">
                    <UnitIcon
                      slug={featured.slug}
                      name={featured.name}
                      glowColor={glow}
                      shiny={isShinyRarity(featured.rarity)}
                      size={112}
                      imageUrl={imageUrl}
                    />
                  </div>
                </div>

                <div className="ue-vault-content">
                  <div className="ue-vault-top-row">
                    <span className="ue-rarity-pill" style={{ '--pill-glow': glow }}>
                      <i className="ue-rarity-dot" style={{ background: glow }} />
                      {featured.rarity}
                    </span>
                    <span className="ue-role-pill">{featured.type || 'Combat Unit'}</span>
                  </div>

                  <h3 className="ue-featured-name">{featured.name}</h3>

                  <div className="ue-telemetry-strip">
                    {scope === 'values' ? (
                      <>
                        <div className="ue-telemetry-cell primary">
                          <small>TRADE VALUE</small>
                          <strong>
                            {tradeLabel(featured)}
                          </strong>
                        </div>
                        <div className="ue-telemetry-cell">
                          <small>DEMAND</small>
                          <strong>{featured.demand || 'Average'}</strong>
                        </div>
                        <div className="ue-telemetry-cell">
                          <small>SCARCITY</small>
                          <strong>{featured.scarcity || 'Standard'}</strong>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="ue-telemetry-cell primary">
                          <small>TOTAL COST</small>
                          <strong>
                            {featured.totalCost
                              ? `$${formatCompactNumber(featured.totalCost)}`
                              : 'Variable'}
                          </strong>
                        </div>
                        <div className="ue-telemetry-cell">
                          <small>ROLE</small>
                          <strong>{featured.type || 'DPS / Support'}</strong>
                        </div>
                        <div className="ue-telemetry-cell">
                          <small>OBTAIN</small>
                          <strong>{featured.category || 'Standard'}</strong>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="ue-vault-actions">
                    <Link
                      to={`/${scope}/units/${encodeURIComponent(featured.rarity)}/${featured.slug}`}
                      className="ue-launch-btn"
                    >
                      <span>Inspect {scope === 'values' ? 'Value' : 'Stat'} Sheet</span>
                      <span aria-hidden="true">→</span>
                    </Link>
                    <button
                      type="button"
                      className="ue-dice-btn"
                      onClick={rerollRandom}
                      title="Roll another random unit"
                    >
                      ↻ Reroll
                    </button>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
            </div>

            {/* Right Wing Card (Next Unit) */}
            {nextUnit ? (
              <button
                type="button"
                className="ue-wing-card next"
                onClick={() => setIndex((safeIndex + 1) % pool.length)}
                title={`Next: ${nextUnit.name}`}
              >
                <span className="ue-wing-dir">NEXT →</span>
                <div className="ue-wing-body">
                  <UnitIcon
                    slug={nextUnit.slug}
                    name={nextUnit.name}
                    glowColor={getRarityGlow(nextUnit.rarity)}
                    shiny={isShinyRarity(nextUnit.rarity)}
                    size={54}
                    imageUrl={nextImageUrl}
                  />
                  <div className="ue-wing-meta">
                    <small style={{ color: getRarityGlow(nextUnit.rarity) }}>
                      {nextUnit.rarity}
                    </small>
                    <strong>{nextUnit.name}</strong>
                    <span>
                      {scope === 'values'
                        ? tradeLabel(nextUnit)
                        : nextUnit.type || 'Tower'}
                    </span>
                  </div>
                </div>
              </button>
            ) : (
              <div className="ue-wing-spacer" />
            )}
          </div>
        ) : (
          <div className="ue-empty-matrix">
            No units matched &ldquo;{query}&rdquo;.
          </div>
        )}
      </div>
    </section>
  );
}
