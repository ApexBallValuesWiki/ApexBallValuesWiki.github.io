import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useData } from '../context/DataContext';
import { getUnitIcon } from '../data/unitIcons';
import { UNIT_RARITIES, getRarityGlow, isShinyRarity } from '../data/taxonomy';
import { formatCompactNumber, formatFullNumber } from '../utils/formatNumber';
import UnitIcon from './UnitIcon';
import './RotatingShortcutButton.css';

const CYCLE_INTERVAL = 3500;

const SELECTOR_CHIPS = [
  { id: 'all', label: 'All Rarities', rarity: null },
  { id: 'normie', label: 'Normies', rarity: 'Normie' },
  { id: 'rares', label: 'Rares', rarity: 'Rare' },
  { id: 'awesome', label: 'Awesome', rarity: 'Awesome' },
  { id: 'legendaries', label: 'Legendaries', rarity: 'Legendaries' },
  { id: 'mythics', label: 'Mythics', rarity: 'Mythic' },
  { id: 'omegas', label: 'Omegas', rarity: 'Omega' },
  { id: 'secret', label: '??? Secret', rarity: '???' },
];

function dedupeUnits(units) {
  const seen = new Set();
  return units.filter((unit) => {
    if (!unit?.slug || seen.has(unit.slug)) return false;
    seen.add(unit.slug);
    return true;
  });
}

/**
 * HoloExplorerHub — Reinvented & Redesigned WIKI / Values Explorer Terminal.
 * Replaces the plain rotating pill with a high-tech, interactive radar array,
 * instant division chips, tactile dice re-roller, and direct portals.
 */
export default function RotatingShortcutButton({ section = 'wiki' }) {
  const scope = section === 'values' ? 'values' : 'wiki';
  const { unitValues, wikiRows } = useData();

  const [selectedChip, setSelectedChip] = useState('all');
  const [unitRoll, setUnitRoll] = useState(() => Math.random());
  const [isHovered, setIsHovered] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  const progressFillRef = useRef(null);
  const pausedRef = useRef(false);

  const contentUnits = useMemo(
    () => dedupeUnits(unitValues),
    [unitValues]
  );

  const wikiImageBySlug = useMemo(
    () => Object.fromEntries(wikiRows.filter((row) => row.slug && row.image_url).map((row) => [row.slug, row.image_url])),
    [wikiRows]
  );

  const currentChipObj = SELECTOR_CHIPS.find((c) => c.id === selectedChip) || SELECTOR_CHIPS[0];

  const candidatePool = useMemo(() => {
    if (!currentChipObj.rarity) return contentUnits;
    return contentUnits.filter((unit) => {
      const alias = unit.rarity?.replace(/^Shiny\s+/i, '').replace(/s$/i, '');
      const targetAlias = currentChipObj.rarity?.replace(/^Shiny\s+/i, '').replace(/s$/i, '');
      return alias === targetAlias || unit.rarity === currentChipObj.rarity;
    });
  }, [contentUnits, currentChipObj.rarity]);

  const featuredUnit = useMemo(() => {
    const pool = candidatePool.length > 0 ? candidatePool : contentUnits;
    if (pool.length === 0) return null;

    const unitsWithImages = pool.filter((unit) => {
      const shiny = isShinyRarity(unit.rarity);
      return unit.imageUrl || wikiImageBySlug[unit.slug] || getUnitIcon(unit.slug, shiny);
    });
    const finalPool = unitsWithImages.length > 0 ? unitsWithImages : pool;
    return finalPool[Math.floor(unitRoll * finalPool.length) % finalPool.length] || finalPool[0];
  }, [candidatePool, contentUnits, unitRoll, wikiImageBySlug]);

  useEffect(() => {
    pausedRef.current = isHovered || showInfo;
  }, [isHovered, showInfo]);

  useEffect(() => {
    let animationFrame = 0;
    let elapsed = 0;
    let previousTime = performance.now();

    function renderProgress(value) {
      if (progressFillRef.current) {
        progressFillRef.current.style.transform = `scaleX(${Math.min(Math.max(value, 0), 1)})`;
      }
    }

    function tick(now) {
      const delta = Math.min(Math.max(now - previousTime, 0), 100);
      previousTime = now;

      if (!pausedRef.current && !document.hidden) {
        elapsed += delta;
        if (elapsed >= CYCLE_INTERVAL) {
          elapsed %= CYCLE_INTERVAL;
          setUnitRoll(Math.random());
        }
        renderProgress(elapsed / CYCLE_INTERVAL);
      }

      animationFrame = requestAnimationFrame(tick);
    }

    animationFrame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrame);
  }, []);

  function handleReroll() {
    setUnitRoll(Math.random());
    if (progressFillRef.current) {
      progressFillRef.current.style.transform = 'scaleX(0)';
    }
  }

  const featuredImageUrl = featuredUnit
    ? wikiImageBySlug[featuredUnit.slug] || featuredUnit.imageUrl || null
    : null;

  const glowColor = featuredUnit ? getRarityGlow(featuredUnit.rarity) : 'var(--c-info)';
  const targetPath = featuredUnit
    ? `/${scope}/units/${encodeURIComponent(featuredUnit.rarity)}/${featuredUnit.slug}`
    : `/${scope}/units`;

  return (
    <div
      className="holo-explorer-hub"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="region"
      aria-label={`${scope === 'wiki' ? 'WIKI' : 'Values'} Interactive Command Terminal`}
    >
      <div className="holo-explorer-stripe" />

      {/* TOP RADAR BAR */}
      <div className="heh-top-bar">
        <div className="heh-radar-status">
          <span className="heh-pulse-dot" />
          <span>⚡ TESTING {scope.toUpperCase()} MATRIX · {contentUnits.length} UNITS INDEXED</span>
        </div>

        <div className="heh-timer-wrap">
          <span>{isHovered ? 'PAUSED' : 'AUTO-SHUFFLE'}</span>
          <div className="heh-progress-track">
            <div ref={progressFillRef} className="heh-progress-fill" style={{ background: glowColor }} />
          </div>
          <button
            type="button"
            className="heh-info-btn"
            onClick={() => setShowInfo(!showInfo)}
            aria-label="Explorer Hub information"
          >
            ?
          </button>
        </div>
      </div>

      {/* INSTANT RARITY CHIPS */}
      <div className="heh-chips-row" role="group" aria-label="Filter units by rarity">
        {SELECTOR_CHIPS.map((chip) => {
          const active = selectedChip === chip.id;
          return (
            <button
              type="button"
              key={chip.id}
              className={`heh-chip ${active ? 'active' : ''}`}
              onClick={() => {
                setSelectedChip(chip.id);
                handleReroll();
              }}
            >
              <span
                className="heh-chip-dot"
                style={{ background: chip.rarity ? getRarityGlow(chip.rarity) : 'var(--c-info)' }}
              />
              <span>{chip.label}</span>
            </button>
          );
        })}
      </div>

      {/* FEATURED TARGET SUB-PANEL */}
      {featuredUnit && (
        <div
          className="heh-target-panel"
          style={{ '--rarity-glow': glowColor, borderColor: `${glowColor}66` }}
        >
          <div className="heh-target-left">
            <UnitIcon
              slug={featuredUnit.slug}
              name={featuredUnit.name}
              glowColor={glowColor}
              shiny={isShinyRarity(featuredUnit.rarity)}
              size={64}
              imageUrl={featuredImageUrl}
            />

            <div className="heh-target-info">
              <div className="heh-target-label" style={{ color: glowColor }}>
                <span>🎯 CURRENT TARGET · {featuredUnit.rarity}</span>
              </div>
              <h3 className="heh-target-title">{featuredUnit.name}</h3>
              <div className="heh-target-meta">
                <span>{featuredUnit.type || 'Unit'} · {featuredUnit.category || 'Standard'}</span>
                {scope === 'values' && featuredUnit.hasValue && (
                  <span style={{ color: 'var(--c-info)', fontWeight: 800 }}>
                    · {formatCompactNumber(featuredUnit.tradeValue)} Value
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="heh-target-actions">
            <button
              type="button"
              className="heh-reroll-btn"
              onClick={handleReroll}
              title="Spin the radar for another destination"
            >
              🎲 Reroll
            </button>
            <Link to={targetPath} className="heh-launch-btn">
              <span>🚀 Launch into {featuredUnit.name} →</span>
            </Link>
          </div>
        </div>
      )}

      {/* QUICK PORTALS BAR */}
      <div className="heh-portals-bar">
        <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase', marginRight: 4 }}>
          QUICK PORTALS:
        </span>
        {scope === 'wiki' ? (
          <>
            <Link to="/wiki/units/search" className="heh-portal-link">🔍 Search All Units</Link>
            <Link to="/wiki/compare" className="heh-portal-link">⚖️ Unit Compare</Link>
            <Link to="/wiki/leaderboards" className="heh-portal-link">🏆 DPS Leaderboards</Link>
            <Link to="/wiki/maps" className="heh-portal-link">🗺️ Maps Index</Link>
          </>
        ) : (
          <>
            <Link to="/values/units/search" className="heh-portal-link">🔍 Search Unit Values</Link>
            <Link to="/values/calculator" className="heh-portal-link">⚖️ Trade Calculator</Link>
            <Link to="/minigames" className="heh-portal-link">🧠 Ball Knowledge Game</Link>
          </>
        )}
      </div>

      {/* DIAGNOSTIC POPOVER */}
      <AnimatePresence>
        {showInfo && (
          <motion.div
            className="heh-popup"
            role="dialog"
            aria-label="Explorer Hub information"
            initial={{ opacity: 0, y: -10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.96 }}
            transition={{ duration: 0.2 }}
          >
            <h3>⚡ HoloExplorer Hub</h3>
            <p>
              This interactive command terminal continuously indexes all {contentUnits.length} {scope.toUpperCase()} units in real-time.
            </p>
            <p>
              <strong>Instant Filtering:</strong> Click any rarity chip above to lock the radar matrix to that division, or click <strong>🎲 Reroll</strong> to instantly spin for another target.
            </p>
            <button type="button" className="heh-popup-close" onClick={() => setShowInfo(false)}>
              ✕ Close Briefing
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
