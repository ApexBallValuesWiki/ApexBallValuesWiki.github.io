import { memo, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { getUnitIcon } from '../data/unitIcons';
import { getCachedWikiImage, onWikiImageCacheChange } from '../utils/wikiImageCache';
import { useData } from '../context/DataContext';
import './UnitIcon.css';

function UnitIcon({ slug, name, glowColor, shiny = false, size = 64, imageUrl = null }) {
  const { getWikiOverride } = useData();
  const [cachedImageUrl, setCachedImageUrl] = useState(() => getCachedWikiImage(slug));

  useEffect(() => {
    setCachedImageUrl(getCachedWikiImage(slug));
    return onWikiImageCacheChange((event) => {
      if (event.detail?.slug === slug) setCachedImageUrl(event.detail.imageUrl || null);
    });
  }, [slug]);

  const liveImageUrl = useMemo(() => {
    const override = getWikiOverride?.(slug);
    return override?.imageUrl || null;
  }, [getWikiOverride, slug]);

  const icon = useMemo(
    () => imageUrl || liveImageUrl || cachedImageUrl || getUnitIcon(slug, shiny),
    [imageUrl, liveImageUrl, cachedImageUrl, slug, shiny]
  );

  return (
    <motion.div
      className="unit-icon"
      style={{
        width: size,
        height: size,
        '--icon-glow': glowColor || 'rgba(255,255,255,0.35)',
      }}
      whileHover={{ scale: 1.05 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      <div className="unit-icon-glow" />
      <div className="unit-icon-squircle">
        {icon ? (
          <img src={icon} alt={name} className="unit-icon-img" loading="lazy" decoding="async" />
        ) : (
          <div className="unit-icon-fallback">{name?.[0] ?? '?'}</div>
        )}
      </div>
    </motion.div>
  );
}

export default memo(UnitIcon);
