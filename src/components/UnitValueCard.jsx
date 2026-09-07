import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  getRarityPalette,
  getRarityGlow,
  isShinyRarity,
  DEMAND_COLORS,
  DEMAND_PERCENT,
  SCARCITY_COLORS,
  SCARCITY_PERCENT,
} from '../data/taxonomy';
import UnitIcon from './UnitIcon';
import { fetchUnitHistory } from '../utils/apexClient';
import { formatRelativeTime, formatCompactNumber, formatFullNumber } from '../utils/formatNumber';
import './EntityGrid.css';
import { TermTip } from './StatMeta';
import './UnitValueCard.css';

const MotionLink = motion(Link);

// Status (from the admin Trend setting): graph icon + colored label.
const STATUS_META = {
  rising: { label: 'Rising', color: '#42d392' },
  stable: { label: 'Stable', color: '#ffffff' },
  falling: { label: 'Dropping', color: '#ff5c5c' },
  fluctuating: { label: 'Fluctuating', color: '#ffd24d' },
};

function TrendGlyph({ color }) {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true" style={{ display: 'block' }}>
      <path d="M1 12.5L5 8l3 2.5L15 4" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M11 4h4v4" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export const uvCardVariants = {
  initial: { opacity: 0, y: 18, scale: 0.94 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
  },
};

/**
 * Detailed unit value card — updated layout with icon on left,
 * name and rarity on right in header, value info below. Encases stats inside elevated panel box.
 */
export default function UnitValueCard({ unit, linkBase, highlighted }) {
  const palette = getRarityPalette(unit.rarity);
  const glow = getRarityGlow(unit.rarity);
  const gradientBorder = `linear-gradient(90deg, ${palette.join(', ')})`;

  const demandColor = unit.demand ? DEMAND_COLORS[unit.demand] : null;
  const demandPercent = unit.demand ? DEMAND_PERCENT[unit.demand] : 0;
  const scarcityColor = unit.scarcity ? SCARCITY_COLORS[unit.scarcity] : null;
  const scarcityPercent = unit.scarcity ? SCARCITY_PERCENT[unit.scarcity] : 0;

  const targetUrl = `${linkBase}/${unit.slug}`;

  return (
    <MotionLink
      to={targetUrl}
      data-slug={unit.slug}
      className={highlighted ? 'unit-card uv-card unit-card-highlight' : 'unit-card uv-card'}
      onMouseEnter={() => warmUnitHistory(unit.slug)}
      whileHover={{ y: -4, scale: 1.015 }}
      whileTap={{ scale: 0.985 }}
      transition={{ type: 'spring', stiffness: 400, damping: 22 }}
      style={{
        '--rarity-border': gradientBorder,
        '--rarity-glow': glow,
      }}
      variants={uvCardVariants}
      whileHover={{ y: -6, transition: { duration: 0.25, ease: 'easeOut' } }}
      whileTap={{ scale: 0.975, transition: { duration: 0.12 } }}
    >
      <div className="unit-card-stripe" />
      <div className="unit-card-header">
        <div className="unit-card-icon-wrap">
          <UnitIcon slug={unit.slug} name={unit.name} glowColor={glow} shiny={isShinyRarity(unit.rarity)} size={74} imageUrl={unit.imageUrl} />
        </div>
        <div className="unit-card-header-text">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <div className="unit-card-name">{unit.name}</div>
          </div>
          <div className="unit-card-rarity" style={{ color: glow }}>
            {unit.rarity}
          </div>
        </div>
      </div>

      <div className="unit-card-body">
        {unit.hasValue ? (
          <div className="uv-inner-panel-card">
            <div className="uv-stat-rows">
              {unit.specialValue ? (
                <div className="uv-stat-row">
                  <TermTip term="value" className="uv-stat-label uv-label-value">Value</TermTip>
                  <span className="uv-stat-amount uv-special-value" title="Set by the APEX team — no numeric value applies">{unit.specialValue}</span>
                </div>
              ) : (
              <div className="uv-stat-row">
                <TermTip term="value" className="uv-stat-label uv-label-value">Value</TermTip>
                <span className="uv-stat-amount" title={unit.tradeValueMax ? `${formatFullNumber(unit.tradeValue)} - ${formatFullNumber(unit.tradeValueMax)} exact` : `${formatFullNumber(unit.tradeValue)} exact`}>
                  {unit.tradeValueMax ? `${formatCompactNumber(unit.tradeValue)}-${formatCompactNumber(unit.tradeValueMax)}` : formatCompactNumber(unit.tradeValue)}
                </span>
              </div>
              )}

              <div className="uv-stat-row">
                <TermTip term="gems" className="uv-stat-label uv-label-gems">Gems</TermTip>
                <span className="uv-stat-amount" title={unit.specialGems ? 'Set by the APEX team' : (unit.gemsMax ? `${formatFullNumber(unit.gems)} - ${formatFullNumber(unit.gemsMax)} exact` : `${formatFullNumber(unit.gems)} exact`)}>
                  {unit.specialGems || (unit.gemsMax ? `${formatCompactNumber(unit.gems)}-${formatCompactNumber(unit.gemsMax)}` : formatCompactNumber(unit.gems))}
                </span>
              </div>
              <div className="uv-stat-row">
                <TermTip term="coins" className="uv-stat-label uv-label-coins">Coins</TermTip>
                <span className="uv-stat-amount" title={unit.specialCoins ? 'Set by the APEX team' : (unit.coinsMax ? `${formatFullNumber(unit.coins)} - ${formatFullNumber(unit.coinsMax)} exact` : `${formatFullNumber(unit.coins)} exact`)}>
                  {unit.specialCoins || (unit.coinsMax ? `${formatCompactNumber(unit.coins)}-${formatCompactNumber(unit.coinsMax)}` : formatCompactNumber(unit.coins))}
                </span>
              </div>
            </div>
            {STATUS_META[unit.trend] && (
              <div className="uv-status-strip" style={{ borderColor: `color-mix(in srgb, ${STATUS_META[unit.trend].color} 45%, transparent)` }}>
                <TrendGlyph color={STATUS_META[unit.trend].color} />
                <TermTip term="status" className="uv-status-word">Status</TermTip>
                <strong style={{ color: STATUS_META[unit.trend].color }}>{STATUS_META[unit.trend].label}</strong>
              </div>
            )}
            {unit.updatedAt && (
              <div className="uv-updated" title={new Date(unit.updatedAt).toLocaleString()}>
                Updated {formatRelativeTime(unit.updatedAt)} by the APEX team
              </div>
            )}

            <div className="uv-bars">
              <div className="uv-bar-block">
                <div className="uv-bar-head">
                  <TermTip term="demand" className="uv-gauge-title">Demand</TermTip>
                  <span className="uv-bar-tier" style={{ color: demandColor }}>{unit.demand}</span>
                </div>
                <div className="uv-bar-track">
                  <motion.div
                    className="uv-bar-fill"
                    style={{ background: demandColor }}
                    initial={{ width: 0 }}
                    animate={{ width: `${demandPercent}%` }}
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>
              </div>

              <div className="uv-bar-block">
                <div className="uv-bar-head">
                  <TermTip term="scarcity" className="uv-gauge-title">Scarcity</TermTip>
                  <span className="uv-bar-tier" style={{ color: scarcityColor }}>{unit.scarcity}</span>
                </div>
                <div className="uv-bar-track">
                  <motion.div
                    className="uv-bar-fill"
                    style={{ background: scarcityColor }}
                    initial={{ width: 0 }}
                    animate={{ width: `${scarcityPercent}%` }}
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="uv-no-data">No market data yet</div>
        )}
      </div>
    </MotionLink>
  );
}

// Hover prefetch: warm the unit's shared history so the detail page trend
// graph loads instantly. Each slug is fetched at most once per session.
const warmedSlugs = new Set();
function warmUnitHistory(slug) {
  if (!slug || warmedSlugs.has(slug)) return;
  warmedSlugs.add(slug);
  fetchUnitHistory('value', slug).catch(() => {});
}
