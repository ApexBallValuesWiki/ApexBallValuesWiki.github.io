import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getRarityGlow, isShinyRarity } from '../data/taxonomy';
import UnitIcon from './UnitIcon';
import './CardZoomOverlay.css';

/**
 * CardZoomOverlay — shows a zoomed unit card with 5% watermark on hover/click
 */
export default function CardZoomOverlay({ unit, children }) {
  const [show, setShow] = useState(false);

  if (!unit) return children;

  const glow = getRarityGlow(unit.rarity);

  return (
    <div
      className="card-zoom-trigger"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}

      <AnimatePresence>
        {show && (
          <motion.div
            className="card-zoom-overlay"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
          >
            <div className="card-zoom-content" style={{ borderColor: glow }}>
              <div className="card-zoom-watermark">APEX</div>
              <UnitIcon
                slug={unit.slug}
                name={unit.name}
                glowColor={glow}
                shiny={isShinyRarity(unit.rarity)}
                size={200}
                imageUrl={unit.imageUrl}
              />
              <h3 className="card-zoom-name" style={{ color: glow }}>{unit.name}</h3>
              <span className="card-zoom-rarity" style={{ color: glow }}>{unit.rarity}</span>
              {unit.tradeValue && (
                <span className="card-zoom-value">{unit.tradeValue}</span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
