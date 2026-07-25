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
import { formatCompactNumber, formatFullNumber } from '../utils/formatNumber';
import './EntityGrid.css';
import './UnitValueCard.css';

const MotionLink = motion(Link);

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

  const isPrvw = Boolean(unit.isPrvw || unit.prvw || unit.livePrvwOverride);

  const targetUrl = `${linkBase}/${unit.slug}`;

  return (
    <MotionLink
      to={targetUrl}
      data-slug={unit.slug}
      className={highlighted ? 'unit-card uv-card unit-card-highlight' : 'unit-card uv-card'}
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
            {isPrvw && (
              <span className="badge prvw-badge" style={{ background: '#b679ff', color: '#fff', fontSize: '0.62rem', padding: '2px 8px', fontWeight: 800, borderRadius: '999px', boxShadow: '0 0 10px rgba(182,121,255,0.6)' }}>PRVW</span>
            )}
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
              <div className="uv-stat-row">
                <span className="uv-stat-label uv-label-value">Value</span>
                <span className="uv-stat-amount" title={unit.tradeValueMax ? `${formatFullNumber(unit.tradeValue)} - ${formatFullNumber(unit.tradeValueMax)} exact` : `${formatFullNumber(unit.tradeValue)} exact`}>
                  {unit.tradeValueMax ? `${formatCompactNumber(unit.tradeValue)}-${formatCompactNumber(unit.tradeValueMax)}` : formatCompactNumber(unit.tradeValue)}
                </span>
              </div>
              <div className="uv-stat-row">
                <span className="uv-stat-label uv-label-gems">Gems</span>
                <span className="uv-stat-amount" title={unit.gemsMax ? `${formatFullNumber(unit.gems)} - ${formatFullNumber(unit.gemsMax)} exact` : `${formatFullNumber(unit.gems)} exact`}>
                  {unit.gemsMax ? `${formatCompactNumber(unit.gems)}-${formatCompactNumber(unit.gemsMax)}` : formatCompactNumber(unit.gems)}
                </span>
              </div>
              <div className="uv-stat-row">
                <span className="uv-stat-label uv-label-coins">Coins</span>
                <span className="uv-stat-amount" title={unit.coinsMax ? `${formatFullNumber(unit.coins)} - ${formatFullNumber(unit.coinsMax)} exact` : `${formatFullNumber(unit.coins)} exact`}>
                  {unit.coinsMax ? `${formatCompactNumber(unit.coins)}-${formatCompactNumber(unit.coinsMax)}` : formatCompactNumber(unit.coins)}
                </span>
              </div>
            </div>

            <div className="uv-bars">
              <div className="uv-bar-block">
                <div className="uv-bar-head">
                  <span className="uv-gauge-title">Demand</span>
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
                  <span className="uv-gauge-title">Scarcity</span>
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
