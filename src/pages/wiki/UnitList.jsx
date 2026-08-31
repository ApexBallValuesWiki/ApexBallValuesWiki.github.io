import { useMemo } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import PageShell from '../../components/PageShell';
import EntityGrid from '../../components/EntityGrid';
import UnitTags from '../../components/UnitTags';
import { WIKI_NAV } from '../../config/navigation';
import { ALL_UNITS } from '../../data/units';
import { UNIT_RARITIES } from '../../data/taxonomy';
import { useData } from '../../context/DataContext';
import { decodeRouteParam, encodeRouteParam } from '../../utils/routeParams';

export default function UnitsList() {
  const params = useParams();
  const rarity = decodeRouteParam(params.rarity);
  const isValidRarity = UNIT_RARITIES.includes(rarity);
  const { getWikiOverride, createdUnits, isUnitDeleted } = useData();

  const units = useMemo(() => {
    if (!isValidRarity) return [];
    
    // Apply live WIKI overrides to ALL_UNITS so that overridden rarity/name are correctly filtered
    const liveUnits = ALL_UNITS.filter((unit) => !isUnitDeleted(unit.slug)).map((unit) => {
      const override = getWikiOverride?.(unit.slug);
      if (!override) return unit;
      const cleanOverride = Object.fromEntries(
        Object.entries(override).filter(([, value]) => value !== undefined)
      );
      return { ...unit, ...cleanOverride };
    });

    const generated = liveUnits.filter((unit) => unit.rarity === rarity);
    const created = (createdUnits || []).filter((unit) => unit.rarity === rarity);
    return [...generated, ...created];
  }, [getWikiOverride, createdUnits, isUnitDeleted, rarity, isValidRarity]);

  if (!isValidRarity) return <Navigate to="/wiki/units/Normie" replace />;

  return (
    <PageShell sidebarTitle="WIKI" navTree={WIKI_NAV}>
      <h1>{rarity}</h1>
      <p className="crumb">WIKI / Units / {rarity}</p>
      <EntityGrid
        key={`wiki-${rarity}`}
        entities={units}
        linkBase={`/wiki/units/${encodeRouteParam(rarity)}`}
        emptyLabel={`No ${rarity} units added yet.`}
        rarityAccent
        renderMeta={(u) => (
          <>
            {u.type && <span className="badge">{u.type}</span>}
            {u.category && <span className="badge dim">{u.category}</span>}
            <UnitTags unit={u} limit={4} />
          </>
        )}
      />
    </PageShell>
  );
}
