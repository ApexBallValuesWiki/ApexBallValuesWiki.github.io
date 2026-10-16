import { useMemo } from 'react';
import { useParams, Navigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import PageShell from '../../components/PageShell';
import UnitValueCard from '../../components/UnitValueCard';
import ThemeCutout, { getCutoutForRarity } from '../../components/ThemeCutout';
import { VALUES_NAV } from '../../config/navigation';
import { UNIT_RARITIES, getRarityGlow, isShinyRarity } from '../../data/taxonomy';
import { useScrollToHighlight } from '../../utils/useScrollToHighlight';
import { useLiveValues } from '../../hooks/useLiveValues';
import { decodeRouteParam, encodeRouteParam } from '../../utils/routeParams';
import '../../components/EntityGrid.css';
import './ValueUnitsList.css';

const gridVariants = {
  animate: { transition: { staggerChildren: 0.035, delayChildren: 0.02 } },
};

export default function ValueUnitsList() {
  const params = useParams();
  const rarity = decodeRouteParam(params.rarity);
  const highlighted = useScrollToHighlight();
  const { unitValues, error } = useLiveValues();
  const isValidRarity = UNIT_RARITIES.includes(rarity);

  const units = useMemo(
    () => (isValidRarity ? unitValues.filter((u) => u.rarity === rarity) : []),
    [unitValues, rarity, isValidRarity]
  );

  if (!isValidRarity) return <Navigate to="/values/units/Normie" replace />;

  const encodedRarity = encodeRouteParam(rarity);
  const linkBase = `/values/units/${encodedRarity}`;
  const rarityGlow = getRarityGlow(rarity);
  const isShiny = isShinyRarity(rarity);
  const counterpartRarity = isShiny ? rarity.replace(/^Shiny\s+/i, '') : `Shiny ${rarity}`;
  const hasCounterpart = UNIT_RARITIES.includes(counterpartRarity);

  return (
    <PageShell sidebarTitle="VALUES" navTree={VALUES_NAV}>
      <div className="rarity-list-header" style={{ '--rarity-accent': rarityGlow }}>
        <ThemeCutout
          variant={getCutoutForRarity(rarity)}
          tintColor={rarityGlow}
          floating
          className="rarity-list-cutout"
        />
        <div className="rarity-list-title-group">
          <p className="crumb">Values / Units / {rarity}</p>
          <div className="rarity-list-title-row">
            <span className="rarity-list-dot" aria-hidden="true" />
            <h1>{rarity}</h1>
          </div>
          <p className="rarity-list-sub">{units.length} units indexed in this tier</p>
        </div>
        <div className="rarity-list-actions">
          {hasCounterpart && (
            <Link
              to={`/values/units/${encodeRouteParam(counterpartRarity)}`}
              className="rarity-list-btn"
            >
              {isShiny ? `Base ${counterpartRarity}` : `✨ ${counterpartRarity}`}
            </Link>
          )}
          <Link to="/values/units/search" className="rarity-list-btn">
            Search Values
          </Link>
          <Link to={`/wiki/units/${encodedRarity}`} className="rarity-list-btn primary">
            {rarity} WIKI →
          </Link>
        </div>
      </div>

      {error && <p className="pending-flag">Live values could not load; showing bundled fallback values.</p>}

      {units.length === 0 ? (
        <div className="empty-state">No {rarity} units yet.</div>
      ) : (
        <motion.div
          key={`values-${rarity}`}
          className="uv-grid"
          variants={gridVariants}
          initial="initial"
          animate="animate"
        >
          {units.map((u) => (
            <UnitValueCard
              key={u.slug}
              unit={u}
              linkBase={linkBase}
              highlighted={highlighted === u.slug}
            />
          ))}
        </motion.div>
      )}
    </PageShell>
  );
}
