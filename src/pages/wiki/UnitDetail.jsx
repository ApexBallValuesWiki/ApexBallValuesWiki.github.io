import { useMemo, useState } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import PageShell from '../../components/PageShell';
import { WIKI_NAV } from '../../config/navigation';
import { getUnitBySlug } from '../../data/units';
import { useData } from '../../context/DataContext';
import { getRarityGlow, isShinyRarity } from '../../data/taxonomy';
import UnitIcon from '../../components/UnitIcon';
import UnitTags from '../../components/UnitTags';
import { mergeWikiOverride, useWikiUnitOverride } from '../../hooks/useWikiUnitOverride';
import { decodeRouteParam } from '../../utils/routeParams';
import { attackKey, hasAttacks, labelAttacks } from '../../utils/attacks';
import { slugify } from '../../utils/slug';
import './UnitDetail.css';

const listVariants = {
  animate: { transition: { staggerChildren: 0.065, delayChildren: 0.03 } },
};

const itemVariants = {
  initial: { opacity: 0, y: 18, scale: 0.985 },
  animate: (i = 0) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.36, ease: [0.22, 1, 0.36, 1], delay: i * 0.015 },
  }),
};

function hasEntries(obj) {
  return obj && Object.keys(obj).length > 0;
}

function CollapsibleUpgrades({ upgrades }) {
  const [expanded, setExpanded] = useState(false);
  const INITIAL_VISIBLE = 3;
  const hasMore = upgrades.length > INITIAL_VISIBLE;
  const visibleUpgrades = expanded ? upgrades : upgrades.slice(0, INITIAL_VISIBLE);

  const toggleLabel = expanded
    ? 'Hide upgrades'
    : `Show all ${upgrades.length} upgrades`;

  return (
    <section className="unit-section">
      <div className="upgrade-section-head">
        <h2>Upgrades &amp; Costs</h2>
        {hasMore && (
          <button
            type="button"
            className={`collapsible-toggle filled ${expanded ? 'is-expanded' : ''}`}
            onClick={() => setExpanded(!expanded)}
            aria-expanded={expanded}
            aria-controls="upgrade-list"
          >
            {toggleLabel}
          </button>
        )}
      </div>
      <motion.div
        id="upgrade-list"
        className="upgrade-list"
        variants={listVariants}
        initial="initial"
        animate="animate"
        style={{ overflow: 'hidden' }}
      >
        {visibleUpgrades.map((u, idx) => (
          <motion.div
            key={`${u.level}-${u.label}`}
            className="upgrade-card"
            variants={itemVariants}
            custom={idx}
          >
            <div className="upgrade-card-head">
              <span className="upgrade-label">{u.label}</span>
              {u.costRaw && <span className="badge filled">{u.costRaw}</span>}
            </div>
            {u.description && <p className="upgrade-desc">{u.description}</p>}
            {(hasEntries(u.dps) || u.costPerDps) && (
              <div className="upgrade-stats-row upgrade-dps-row">
                {hasEntries(u.dps) && Object.entries(u.dps).map(([k, v]) => <span key={k} className="mini-stat">{k}: {v}</span>)}
                {u.costPerDps && <span className="mini-stat">Cost/DPS: {u.costPerDps}</span>}
              </div>
            )}
            {hasEntries(u.stats) && <div className="attack-blocks"><UpgradeStatBlock name="Stats" stats={u.stats} cooldown={u.cooldown} range={u.range} /></div>}
            {hasAttacks(u.attacks) && (
              <div className="attack-blocks">
                {labelAttacks(u.attacks).map((atk, atkIndex) => (
                  <UpgradeStatBlock
                    key={attackKey(atk, atkIndex)}
                    name={atk.label}
                    stats={atk.stats}
                    cooldown={u.cooldown}
                    range={u.range}
                  />
                ))}
              </div>
            )}
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}

export default function UnitDetail() {
  const params = useParams();
  const rarity = decodeRouteParam(params.rarity);
  const slug = decodeRouteParam(params.slug);
  const { createdUnits, wikiLoading, isUnitDeleted } = useData();
  // Created units (editor-made) live in the database, not the static roster.
  const createdUnit = useMemo(() => createdUnits?.find((entry) => entry.slug === slug), [createdUnits, slug]);
  // Deleted units (site-wide) behave as if they never existed.
  const baseUnit = !isUnitDeleted(slug) ? (getUnitBySlug(slug) || createdUnit) : null;
  const { override, error: wikiOverrideError } = useWikiUnitOverride(baseUnit?.slug);
  const unit = mergeWikiOverride(baseUnit, override);

  const counterpartLink = useMemo(() => {
    if (!unit) return null;
    const isShiny = unit.shiny || isShinyRarity(unit.rarity);
    if (isShiny) {
      const baseSlug = unit.slug.replace(/^shiny-/, '');
      const bu = getUnitBySlug(baseSlug);
      if (bu) return `/wiki/units/${encodeURIComponent(bu.rarity)}/${bu.slug}`;
    } else {
      const shinySlug = `shiny-${unit.slug}`;
      const su = getUnitBySlug(shinySlug);
      if (su) return `/wiki/units/${encodeURIComponent(su.rarity)}/${su.slug}`;
    }
    return null;
  }, [unit]);

  if (!unit && wikiLoading) {
    return (
      <PageShell sidebarTitle="WIKI" navTree={WIKI_NAV}>
        <div className="unit-skeleton">
          <div className="skeleton" style={{ height: '108px', width: '108px', borderRadius: '999px' }} />
          <div style={{ flex: 1, minWidth: 220 }}>
            <div className="skeleton" style={{ height: '32px', width: '60%', marginBottom: 10 }} />
            <div className="skeleton" style={{ height: '18px', width: '40%' }} />
          </div>
        </div>
      </PageShell>
    );
  }

  if (!unit) return <Navigate to={`/wiki/units/${encodeURIComponent(rarity)}`} replace />;

  return (
    <PageShell sidebarTitle="WIKI" navTree={WIKI_NAV}>
      <p className="crumb">
        <Link to="/wiki/units">Units</Link> / <Link to={`/wiki/units/${encodeURIComponent(rarity)}`}>{rarity}</Link> / {unit.name}
      </p>
      <motion.div
        className="unit-header"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <div className="unit-title-row">
          <UnitIcon
            slug={unit.slug}
            name={unit.name}
            glowColor={getRarityGlow(unit.rarity)}
            shiny={isShinyRarity(unit.rarity)}
            size={108}
            imageUrl={unit.imageUrl}
          />
          <div className="unit-title-copy">
            <h1 style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              {unit.name}
              {counterpartLink && (
                <Link 
                  to={counterpartLink} 
                  className="shiny-toggle-star"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '50% !important',
                    width: '32px',
                    height: '32px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontSize: '15px',
                    color: unit.shiny ? '#ffaa00' : 'rgba(255,255,255,0.4)',
                    boxShadow: unit.shiny ? '0 0 10px rgba(255, 170, 0, 0.25)' : 'none',
                    transition: 'all 0.25s ease',
                    verticalAlign: 'middle'
                  }}
                  title={unit.shiny ? "Switch to Base Variant" : "Switch to Shiny Variant"}
                >
                  <style>{`
                    .shiny-toggle-star:hover {
                      background: rgba(255, 170, 0, 0.1) !important;
                      border-color: #ffaa00 !important;
                      color: #ffaa00 !important;
                      transform: scale(1.1);
                    }
                  `}</style>
                  ⭐
                </Link>
              )}
            </h1>
            <motion.div className="unit-badges" variants={listVariants} initial="initial" animate="animate">
              <motion.span className="badge filled" variants={itemVariants}>{unit.rarity}</motion.span>
              {unit.type && <motion.span className="badge" variants={itemVariants}>{unit.type}</motion.span>}
              {unit.category && <motion.span className="badge dim" variants={itemVariants}>{unit.category}</motion.span>}
              {unit.rawType && <motion.span className="badge dim" variants={itemVariants}>{unit.rawType}</motion.span>}
              {unit.unavailableData && <motion.span className="badge dim" variants={itemVariants}>No Upgrade Data</motion.span>}
            </motion.div>
            <div style={{ marginTop: 12 }}>
              <UnitTags unit={unit} />
            </div>
            {unit.liveWikiOverride && <p className="pending-flag" style={{ marginTop: 10 }}>Live WIKI override applied.</p>}
            {wikiOverrideError && <p className="pending-flag" style={{ marginTop: 10 }}>Live WIKI override could not load.</p>}
          </div>
          <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Link
              to={`/values/units/${encodeURIComponent(unit.rarity)}/${unit.slug}`}
              className="badge filled"
              style={{ textDecoration: 'none', padding: '6px 14px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              View Value Page →
            </Link>
          </div>
        </div>
      </motion.div>

      <div className="unit-body">
        {unit.description && <p className="unit-desc">{unit.description}</p>}

        <section className="unit-section">
          <h2>Overview</h2>
          <div className="stat-grid">
            <Stat label="Placement Limit" value={unit.placementLimit} />
            <Stat label="Total Cost" value={unit.totalCost} />
            <Stat label="Type" value={unit.type} />
            <Stat label="Category" value={unit.category} />
          </div>
        </section>

        {unit.minMaxStats && Object.keys(unit.minMaxStats).length > 0 && (
          <section className="unit-section">
            <h2>Minimum → Maximum Stats</h2>
            <table className="kv-table">
              <tbody>
                {Object.entries(unit.minMaxStats).map(([k, v]) => (
                  <tr key={k}>
                    <th>{k}</th>
                    <td>{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {unit.obtain?.length > 0 && (
          <section className="unit-section">
            <h2>Crates</h2>
            <div className="obtain-pills" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px' }}>
              {unit.obtain.map((o, i) => {
                const itemCrates = [
                  'Frozen Crate', 'Royal Crate', 'Mausoleum Crate', 'Rock Crate',
                  'Forest Crate', 'Greek Crate', 'Quest Crate', 'Abstract Crate',
                  'Holo Crate', 'Lucky Crate', 'Museum Crate', 'Faberge Crate',
                  'Circus Crate', 'Baller Crate', 'Super Present Crate', 'Naughty Crate',
                  'Christmas Crate', 'Lovely Skin Crate', 'Creepy Costume Crate',
                  'Banner Crate', 'Starter Crate', 'Monkey Crate', 'UltraBanner',
                  'MapBanner', 'Illegal Crate', 'Super Illegal Crate', 'Turkey Crate',
                  'Valentines Crate'
                ];
                
                const isCrate = itemCrates.some(c => c.toLowerCase() === o.toLowerCase() || c.toLowerCase().includes(o.toLowerCase()));
                const matchedCrate = isCrate ? itemCrates.find(c => c.toLowerCase() === o.toLowerCase() || c.toLowerCase().includes(o.toLowerCase())) : null;
                const matchedUnit = getUnitBySlug(o) || getUnitBySlug(slugify(o));

                let linkPath = null;
                if (matchedCrate) {
                  linkPath = `/wiki/items/Crates/${slugify(matchedCrate)}`;
                } else if (matchedUnit) {
                  linkPath = `/wiki/units/${encodeURIComponent(matchedUnit.rarity)}/${matchedUnit.slug}`;
                }

                const pillContent = (
                  <span className="badge filled" style={{ borderRadius: '999px !important', padding: '6px 14px', fontSize: '13px', fontWeight: 600, display: 'inline-block', transition: 'all 0.2s' }}>
                    {o}
                  </span>
                );

                return linkPath ? (
                  <Link to={linkPath} key={i} style={{ textDecoration: 'none' }} className="obtain-pill-link">
                    <style>{`
                      .obtain-pill-link {
                        display: inline-block;
                      }
                      .obtain-pill-link:hover span {
                        background: var(--accent, var(--c-info)) !important;
                        color: #ffffff !important;
                        transform: translateY(-1px);
                      }
                    `}</style>
                    {pillContent}
                  </Link>
                ) : (
                  <span key={i}>{pillContent}</span>
                );
              })}
            </div>
          </section>
        )}

        {unit.unavailableData ? (
          <section className="unit-section">
            <div className="empty-state">⚠️ Upgrade/cost data for this unit is unavailable.</div>
          </section>
        ) : (
          unit.upgrades?.length > 0 && (
            <CollapsibleUpgrades upgrades={unit.upgrades} />
          )
        )}

        {unit.passive && <section className="unit-section"><h2>Passive</h2><p>{unit.passive}</p></section>}
        {unit.ability && <section className="unit-section"><h2>Ability</h2><p>{unit.ability}</p></section>}
        {unit.synergy && <section className="unit-section"><h2>Synergy</h2><p>{unit.synergy}</p></section>}
      </div>
    </PageShell>
  );
}

function UpgradeStatBlock({ name, stats, cooldown, range }) {
  const rows = [
    ...(cooldown ? [['Cooldown', cooldown]] : []),
    ...Object.entries(stats),
    ...(range ? [['Range', range]] : []),
  ];

  return (
    <div className="attack-block">
      <div className="attack-block-name">{name}</div>
      {rows.map(([k, v], index) => (
        <div key={`${k}-${index}`} className="attack-stat-line">
          <span className="attack-stat-key">{k}</span>
          <span className="attack-stat-val">{v}</span>
        </div>
      ))}
    </div>
  );
}

function Stat({ label, value, suffix = '' }) {
  return (
    <div className="stat-box">
      <div className="stat-value">{value !== undefined && value !== null ? `${value}${suffix}` : '—'}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}
