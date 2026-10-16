import { useMemo } from 'react';
import { useParams, Navigate, Link } from 'react-router-dom';
import PageShell from '../../components/PageShell';
import EntityGrid from '../../components/EntityGrid';
import UnitTags from '../../components/UnitTags';
import ThemeCutout, { getCutoutForRarity } from '../../components/ThemeCutout';
import { WIKI_NAV } from '../../config/navigation';
import { ALL_UNITS } from '../../data/units';
import { UNIT_RARITIES, getRarityGlow, isShinyRarity } from '../../data/taxonomy';
import { useData } from '../../context/DataContext';
import { decodeRouteParam, encodeRouteParam } from '../../utils/routeParams';
import '../values/ValueUnitsList.css';

export default function UnitsList() {
  const params = useParams();
  const rarity = decodeRouteParam(params.rarity);
  const isValidRarity = UNIT_RARITIES.includes(rarity);
  const { getWikiOverride, createdUnits, isUnitDeleted } = useData();

  const units = useMemo(() => {
    if (!isValidRarity) return [];

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

  const encodedRarity = encodeRouteParam(rarity);
  const rarityGlow = getRarityGlow(rarity);
  const isShiny = isShinyRarity(rarity);
  const counterpartRarity = isShiny ? rarity.replace(/^Shiny\s+/i, '') : `Shiny ${rarity}`;
  const hasCounterpart = UNIT_RARITIES.includes(counterpartRarity);

  return (
    <PageShell sidebarTitle="WIKI" navTree={WIKI_NAV}>
      <div className="rarity-list-header" style={{ '--rarity-accent': rarityGlow }}>
        <ThemeCutout
          variant={getCutoutForRarity(rarity)}
          tintColor={rarityGlow}
          floating
          className="rarity-list-cutout"
        />
        <div className="rarity-list-title-group">
          <p className="crumb">WIKI / Units / {rarity}</p>
          <div className="rarity-list-title-row">
            <span className="rarity-list-dot" aria-hidden="true" />
            <h1>{rarity}</h1>
          </div>
          <p className="rarity-list-sub">{units.length} units documented in this tier</p>
        </div>
        <div className="rarity-list-actions">
          {hasCounterpart && (
            <Link
              to={`/wiki/units/${encodeRouteParam(counterpartRarity)}`}
              className="rarity-list-btn"
            >
              {isShiny ? `Base ${counterpartRarity}` : `✨ ${counterpartRarity}`}
            </Link>
          )}
          <Link to="/wiki/units/search" className="rarity-list-btn">
            Search WIKI
          </Link>
          <Link to={`/values/units/${encodedRarity}`} className="rarity-list-btn primary">
            {rarity} Values →
          </Link>
        </div>
      </div>

      <EntityGrid
        key={`wiki-${rarity}`}
        entities={units}
        linkBase={`/wiki/units/${encodedRarity}`}
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
