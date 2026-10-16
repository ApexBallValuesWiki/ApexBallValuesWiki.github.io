import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getRarityPalette, getRarityGlow, isShinyRarity } from '../data/taxonomy';
import { getBaseStats } from '../utils/unitStats';
import { useScrollToHighlight } from '../utils/useScrollToHighlight';
import { TermTip } from './StatMeta';
import { originTag } from '../utils/originTag';
import UnitIcon from './UnitIcon';
import './EntityGrid.css';

const EASE_OUT = [0.23, 1, 0.32, 1];

const gridVariants = {
  animate: {
    transition: { staggerChildren: 0.035, delayChildren: 0.04 },
  },
};

const cardVariants = {
  initial: { opacity: 0, y: 16, scale: 0.96 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.36, ease: EASE_OUT },
  },
};

const MotionLink = motion(Link);

export default function EntityGrid({ entities, linkBase, renderMeta, emptyLabel, rarityAccent }) {
  const highlighted = useScrollToHighlight();

  if (!entities || entities.length === 0) {
    return <div className="empty-state">{emptyLabel || 'No entries yet.'}</div>;
  }

  if (rarityAccent) {
    return (
      <motion.div className="unit-card-grid" variants={gridVariants} initial="initial" animate="animate">
        {entities.map((e) => {
          const palette = getRarityPalette(e.rarity);
          const glow = getRarityGlow(e.rarity);
          const stats = getBaseStats(e);
          const isHighlighted = highlighted === e.slug;
          const targetUrl = `${linkBase}/${e.slug}`;
          const tag = originTag(e);

          return (
            <MotionLink
              key={e.slug}
              to={targetUrl}
              data-slug={e.slug}
              className={isHighlighted ? 'unit-card unit-card-highlight' : 'unit-card'}
              style={{
                '--rarity-border': `linear-gradient(90deg, ${palette.join(', ')})`,
                '--rarity-glow': glow,
              }}
              variants={cardVariants}
              whileHover={{ y: -4, transition: { duration: 0.18, ease: EASE_OUT } }}
              whileTap={{ scale: 0.975, transition: { duration: 0.1 } }}
            >
              <div className="unit-card-stripe" />
              <div className="unit-card-header">
                <div className="unit-card-icon-wrap">
                  <UnitIcon slug={e.slug} name={e.name} glowColor={glow} shiny={isShinyRarity(e.rarity)} size={72} imageUrl={e.imageUrl} />
                </div>
                <div className="unit-card-header-text">
                  <div className="unit-card-name">{e.name}</div>
                  <div className="unit-card-badges-inline">
                    <div className="unit-card-rarity" style={{ color: glow }}>
                      {e.rarity}
                    </div>
                    <span
                      className="origin-tag"
                      style={{
                        color: tag.color,
                        borderColor: `color-mix(in srgb, ${tag.color} 38%, transparent)`,
                        background: `color-mix(in srgb, ${tag.color} 10%, transparent)`,
                      }}
                      title={`${tag.label} unit`}
                    >
                      {tag.label}
                    </span>
                  </div>
                </div>
              </div>

              <div className="unit-card-body">
                {stats && (
                  <div className="unit-card-stats">
                    {stats.damage != null && (
                      <div className="unit-card-stat">
                        <TermTip term="damage" className="unit-card-stat-label">Damage</TermTip>
                        <span className="unit-card-stat-value">{stats.damage}</span>
                      </div>
                    )}
                    {stats.cooldown != null && (
                      <div className="unit-card-stat">
                        <TermTip term="cooldown" className="unit-card-stat-label">Cooldown</TermTip>
                        <span className="unit-card-stat-value">{stats.cooldown}s</span>
                      </div>
                    )}
                    {stats.range != null && (
                      <div className="unit-card-stat">
                        <TermTip term="range" className="unit-card-stat-label">Range</TermTip>
                        <span className="unit-card-stat-value">{stats.range}</span>
                      </div>
                    )}
                    {stats.placementLimit != null && (
                      <div className="unit-card-stat">
                        <TermTip term="placement" className="unit-card-stat-label">Placement</TermTip>
                        <span className="unit-card-stat-value">{stats.placementLimit}</span>
                      </div>
                    )}
                  </div>
                )}

                {!e.documented && <span className="badge dim" style={{ marginTop: 6, alignSelf: 'flex-start' }}>Pending</span>}
                {renderMeta && <div className="unit-card-meta" style={{ marginTop: 6 }}>{renderMeta(e)}</div>}
              </div>
            </MotionLink>
          );
        })}
      </motion.div>
    );
  }

  return (
    <motion.div className="entity-grid" variants={gridVariants} initial="initial" animate="animate">
      {entities.map((e) => {
        const isMap = linkBase.includes('maps');
        const isCrate = linkBase.includes('crates') || linkBase.includes('Crates');
        const imageUrl = e.image || e.imageUrl || e.image_url || null;
        const initials = String(e.name || '?').slice(0, 2).toUpperCase();

        return (
          <MotionLink
            key={e.slug}
            to={`${linkBase}/${e.slug}`}
            className="entity-card card entity-card-accented"
            variants={cardVariants}
            whileHover={{ y: -3, transition: { duration: 0.18, ease: EASE_OUT } }}
            whileTap={{ scale: 0.975, transition: { duration: 0.1 } }}
          >
            <div className="entity-card-image-wrap">
              {imageUrl ? (
                <img src={imageUrl} alt={e.name} className="entity-card-img" />
              ) : (
                <div className="entity-card-placeholder" aria-hidden="true">
                  <span className="entity-card-monogram">{initials}</span>
                </div>
              )}
            </div>

            <div className="entity-card-inner">
              <div className="entity-card-top">
                <span className="entity-name">{e.name}</span>
                {!e.documented && <span className="badge dim entity-pending">Pending</span>}
              </div>

              <div className="entity-card-meta">
                {isMap && e.difficulty && (
                  <span className="badge entity-difficulty-badge">
                    {e.difficulty}
                  </span>
                )}
                {isCrate && e.obtain && (
                  <span className="entity-obtain-note">
                    Obtain: <strong>{typeof e.obtain === 'object' ? (e.obtain.method || e.obtain.source || '') : e.obtain}</strong>
                  </span>
                )}
                {renderMeta && renderMeta(e)}
              </div>
            </div>
          </MotionLink>
        );
      })}
    </motion.div>
  );
}
