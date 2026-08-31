import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getRarityPalette, getRarityGlow, isShinyRarity } from '../data/taxonomy';
import { getBaseStats } from '../utils/unitStats';
import { useScrollToHighlight } from '../utils/useScrollToHighlight';
import UnitIcon from './UnitIcon';
import './EntityGrid.css';

const gridVariants = {
  animate: {
    transition: { staggerChildren: 0.045, delayChildren: 0.05 },
  },
};

const cardVariants = {
  initial: { opacity: 0, y: 18, scale: 0.94 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
  },
};

const MotionLink = motion(Link);

/**
 * Generic card grid for lists of units/items/maps/traits/skins.
 * `entities` items need at minimum: { slug, name, documented }.
 * `linkBase` e.g. "/wiki/units/Normie" -> links become `${linkBase}/${slug}`
 * `renderMeta(entity)` optional — return JSX for extra info (e.g. type badge, value).
 * `rarityAccent` optional — when true, entities are expected to have a
 * `.rarity` field and render as a bigger unit card: icon, name, glowing
 * rarity label, a quick stat readout (cooldown/range/damage/placement),
 * then meta badges — matching the Values cards.
 */
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
              whileHover={{ y: -6, transition: { duration: 0.25, ease: 'easeOut' } }}
              whileTap={{ scale: 0.975, transition: { duration: 0.12 } }}
            >
              <div className="unit-card-stripe" />
              <div className="unit-card-header">
                <div className="unit-card-icon-wrap">
                  <UnitIcon slug={e.slug} name={e.name} glowColor={glow} shiny={isShinyRarity(e.rarity)} size={74} imageUrl={e.imageUrl} />
                </div>
                <div className="unit-card-header-text">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <div className="unit-card-name">{e.name}</div>

                  </div>
                  <div className="unit-card-rarity" style={{ color: glow }}>
                    {e.rarity}
                  </div>
                </div>
              </div>

              <div className="unit-card-body">
                {stats && (
                  <div className="unit-card-stats">
                    {stats.damage != null && (
                      <div className="unit-card-stat">
                        <span className="unit-card-stat-label">Damage</span>
                        <span className="unit-card-stat-value">{stats.damage}</span>
                      </div>
                    )}
                    {stats.cooldown != null && (
                      <div className="unit-card-stat">
                        <span className="unit-card-stat-label">Cooldown</span>
                        <span className="unit-card-stat-value">{stats.cooldown}s</span>
                      </div>
                    )}
                    {stats.range != null && (
                      <div className="unit-card-stat">
                        <span className="unit-card-stat-label">Range</span>
                        <span className="unit-card-stat-value">{stats.range}</span>
                      </div>
                    )}
                    {stats.placementLimit != null && (
                      <div className="unit-card-stat">
                        <span className="unit-card-stat-label">Placement</span>
                        <span className="unit-card-stat-value">{stats.placementLimit}</span>
                      </div>
                    )}
                  </div>
                )}

                {!e.documented && <span className="badge dim" style={{ marginTop: 8 }}>Pending</span>}
                {renderMeta && <div className="unit-card-meta" style={{ marginTop: 8 }}>{renderMeta(e)}</div>}
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
        
        return (
          <MotionLink
            key={e.slug}
            to={`${linkBase}/${e.slug}`}
            className="entity-card card entity-card-accented"
            style={{ padding: 0, overflow: 'hidden' }}
            variants={cardVariants}
            whileHover={{ y: -4, transition: { duration: 0.25, ease: 'easeOut' } }}
            whileTap={{ scale: 0.97, transition: { duration: 0.12 } }}
          >
            <div className="entity-card-image-wrap" style={{ height: 130, background: '#12121c', position: 'relative', overflow: 'hidden', borderBottom: '1px solid var(--border, rgba(255,255,255,0.12))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {imageUrl ? (
                <img src={imageUrl} alt={e.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ color: 'var(--text-faint, #666)', fontSize: '0.82rem', fontFamily: 'var(--font)' }}>🏞️ [Map Image Here]</span>
              )}

            </div>

            <div className="entity-card-inner" style={{ padding: '12px 14px' }}>
              <div className="entity-card-top" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="entity-name" style={{ fontWeight: 800, fontSize: '1rem', fontFamily: 'var(--font)' }}>{e.name}</span>
                {!e.documented && <span className="badge dim entity-pending" style={{ fontSize: '0.68rem', padding: '1px 6px' }}>Pending</span>}
              </div>
              
              <div className="entity-card-meta" style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 6, fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                {isMap && e.difficulty && (
                  <span className="badge" style={{ background: 'rgba(255,170,0,0.15)', color: '#ffaa00', border: '1px solid rgba(255,170,0,0.3)', padding: '2px 8px', borderRadius: '4px', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.68rem' }}>
                    {e.difficulty}
                  </span>
                )}
                {isCrate && e.obtain && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim, #bfbfbf)' }}>
                    Obtain: <strong>{typeof e.obtain === 'object' ? (e.obtain.method || e.obtain.source || '') : e.obtain}</strong>
                  </span>
                )}
              </div>
            </div>
          </MotionLink>
        );
      })}
    </motion.div>
  );
}