import { useMemo } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import PageShell from '../../components/PageShell';
import UnitValueCard from '../../components/UnitValueCard';
import { VALUES_NAV } from '../../config/navigation';
import { UNIT_RARITIES } from '../../data/taxonomy';
import { useScrollToHighlight } from '../../utils/useScrollToHighlight';
import { useLiveValues } from '../../hooks/useLiveValues';
import { decodeRouteParam, encodeRouteParam } from '../../utils/routeParams';
import '../../components/EntityGrid.css';
import './ValueUnitsList.css';

const gridVariants = {
  animate: { transition: { staggerChildren: 0.045, delayChildren: 0.05 } },
};

export default function ValueUnitsList() {
  const params = useParams();
  const rarity = decodeRouteParam(params.rarity);
  const highlighted = useScrollToHighlight();
  const { unitValues, error } = useLiveValues();
  const isValidRarity = UNIT_RARITIES.includes(rarity);

  const units = useMemo(() => (isValidRarity ? unitValues.filter((u) => u.rarity === rarity) : []), [unitValues, rarity, isValidRarity]);

  if (!isValidRarity) return <Navigate to="/values/units/Normie" replace />;

  const linkBase = `/values/units/${encodeRouteParam(rarity)}`;

  return (
    <PageShell sidebarTitle="VALUES" navTree={VALUES_NAV}>
      <h1>{rarity} — Values</h1>
      <p className="crumb">Values / Units / {rarity}</p>
      {error && <p className="pending-flag">Live values could not load; showing bundled fallback values.</p>}

      {units.length === 0 ? (
        <div className="empty-state">No {rarity} units yet.</div>
      ) : (
        <motion.div key={`values-${rarity}`} className="uv-grid" variants={gridVariants} initial="initial" animate="animate">
          {units.map((u) => (
            <UnitValueCard key={u.slug} unit={u} linkBase={linkBase} highlighted={highlighted === u.slug} />
          ))}
        </motion.div>
      )}
    </PageShell>
  );
}
