import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import UnitIcon from './UnitIcon';
import CoolIcon from './CoolIcon';
import { evaluateTrade } from '../utils/calculator';
import { formatCompactNumber } from '../utils/formatNumber';
import { getRarityGlow, isShinyRarity } from '../data/taxonomy';
import './LandingCalculator.css';

const MAX_PER_SIDE = 3;

/**
 * A compact, real calculator preview for the landing page.
 * It deliberately uses the same layout language as /values/calculator (two
 * "sides", live totals, an outcome badge) but keeps a deliberately small
 * feature set: pick up to three real units per side. Currencies, history,
 * sharing and saved trades stay in the full calculator.
 */
export default function LandingCalculator({ unitValues = [], imageMap = {} }) {
  const priced = useMemo(() => (unitValues || [])
    .filter((u) => u.kind !== 'item' && u.hasValue && !u.shiny
      && !isShinyRarity(u.rarity) && Number.isFinite(u.tradeValue) && u.tradeValue > 0)
    .sort((a, b) => b.tradeValue - a.tradeValue), [unitValues]);

  const [sideA, setSideA] = useState([]);
  const [sideB, setSideB] = useState([]);
  const [initialized, setInitialized] = useState(false);
  const [picking, setPicking] = useState(null); // 'A' | 'B' | null

  useEffect(() => {
    if (initialized || priced.length < 2) return;
    setSideA([priced[0].slug]);
    setSideB(priced.slice(1, 3).map((unit) => unit.slug));
    setInitialized(true);
  }, [initialized, priced]);

  const bySlug = useMemo(() => new Map(priced.map((u) => [u.slug, u])), [priced]);
  const entries = (slugs) => slugs.map((s) => bySlug.get(s)).filter(Boolean).map((u) => ({ tradeValue: u.tradeValue }));
  const result = evaluateTrade(entries(sideA), entries(sideB));
  const maxTotal = Math.max(result.totalA, result.totalB, 1);

  function add(side, slug) {
    if (!slug || !bySlug.has(slug)) return;
    const set = side === 'A' ? setSideA : setSideB;
    set((current) => (current.length >= MAX_PER_SIDE || current.includes(slug) ? current : [...current, slug]));
    setPicking(null);
  }

  function remove(side, slug) {
    const set = side === 'A' ? setSideA : setSideB;
    set((current) => current.filter((s) => s !== slug));
  }

  function swap() {
    setSideA(sideB);
    setSideB(sideA);
  }

  const Side = ({ side, label, slugs }) => {
    const total = side === 'A' ? result.totalA : result.totalB;
    return (
      <div className={`landing-calc-side landing-calc-side-${side === 'A' ? 'you' : 'them'}`}>
        <div className="landing-calc-side-head">
          <span>{label}</span>
          <strong title="Total trade value">{formatCompactNumber(total)}</strong>
        </div>
        <div className="landing-calc-rows">
          {slugs.map((slug) => {
            const unit = bySlug.get(slug);
            if (!unit) return null;
            return (
              <div className="landing-calc-row" key={slug}>
                <UnitIcon
                  slug={unit.slug}
                  name={unit.name}
                  size={34}
                  glowColor={getRarityGlow(unit.rarity)}
                  imageUrl={imageMap[unit.slug] || unit.imageUrl}
                />
                <span className="landing-calc-row-name">{unit.name}</span>
                <span className="landing-calc-row-value">{formatCompactNumber(unit.tradeValue)}</span>
                <button type="button" onClick={() => remove(side, slug)} aria-label={`Remove ${unit.name}`}>✕</button>
              </div>
            );
          })}
          {slugs.length === 0 && <p className="landing-calc-empty">No units added yet.</p>}
        </div>
        {slugs.length < MAX_PER_SIDE && (
          picking === side ? (
            <select
              className="landing-calc-picker"
              autoFocus
              value=""
              onChange={(e) => add(side, e.target.value)}
              onBlur={() => setPicking(null)}
              aria-label={`Add a unit to ${label}`}
            >
              <option value="">Choose a unit…</option>
              {priced.slice(0, 40).filter((u) => !slugs.includes(u.slug)).map((u) => (
                <option key={u.slug} value={u.slug}>{u.name} — {formatCompactNumber(u.tradeValue)}</option>
              ))}
            </select>
          ) : (
            <button type="button" className="landing-calc-add" onClick={() => setPicking(side)}>+ Add unit</button>
          )
        )}
      </div>
    );
  };

  return (
    <div className="landing-calc" aria-label="Quick trade calculator preview">
      <div className="landing-calc-topbar">
        <span className="landing-calc-label">TRADE CALCULATOR</span>
        <span className="landing-calc-live"><i /> LIVE VALUES</span>
      </div>
      <div className="landing-calc-grid">
        <Side side="A" label="Your side" slugs={sideA} />
        <button type="button" className="landing-calc-swap" onClick={swap} aria-label="Swap both sides" title="Swap sides">⇄</button>
        <Side side="B" label="Their side" slugs={sideB} />
      </div>
      <div className="landing-calc-verdict">
        <div className="landing-calc-verdict-head">
          <span className={`landing-calc-badge ${result.outcome}`}>{result.verdict}</span>
          <span className="landing-calc-diff">
            {result.diff === 0 ? 'Even trade' : `${result.diff > 0 ? '+' : '−'}${formatCompactNumber(Math.abs(result.diff))} for you`}
          </span>
        </div>
        <div className="landing-calc-bars">
          <div className="landing-calc-bar-track"><div className="landing-calc-bar you" style={{ width: `${(result.totalA / maxTotal) * 100}%` }} /></div>
          <div className="landing-calc-bar-track"><div className="landing-calc-bar them" style={{ width: `${(result.totalB / maxTotal) * 100}%` }} /></div>
        </div>
      </div>
      <div className="landing-calc-foot">
        <span>Quick preview · up to 3 units each side</span>
        <Link to="/values/calculator" className="landing-calc-open">Open full calculator <CoolIcon name="arrow-up-right" size={16} /></Link>
      </div>
    </div>
  );
}
