import { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { decodeRouteParam } from '../../utils/routeParams';
import { motion } from 'framer-motion';
import { getUnitValueBySlug } from '../../data/values';
import { getUnitBySlug } from '../../data/units';
import { useData } from '../../context/DataContext';
import {
  getRarityGlow,
  isShinyRarity,
  DEMAND_COLORS,
  DEMAND_PERCENT,
  SCARCITY_COLORS,
  SCARCITY_PERCENT,
} from '../../data/taxonomy';
import PageShell from '../../components/PageShell';
import { VALUES_NAV } from '../../config/navigation';
import PageIntro from '../../components/PageIntro';
import UnitIcon from '../../components/UnitIcon';
import ShinyToggle from '../../components/ShinyToggle';
import ThemeCutout, { getCutoutForRarity } from '../../components/ThemeCutout';
import { formatCompactNumber, formatFullNumber, formatRelativeTime } from '../../utils/formatNumber';
import '../wiki/UnitDetail.css';
import './UnitValueDetail.css';
import { TermTip } from '../../components/StatMeta';

const statGridVariants = {
  initial: {},
  animate: { transition: { staggerChildren: 0.06 } },
};

const statBoxVariants = {
  initial: { opacity: 0, y: 12, scale: 0.96 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.3, ease: [0.23, 1, 0.32, 1] },
  },
};

export default function UnitValueDetail() {
  const params = useParams();
  const rarity = decodeRouteParam(params.rarity);
  const slug = decodeRouteParam(params.slug);
  const { getUnitValueBySlug: getLiveUnit, error } = useData();

  const staticUnit = useMemo(() => getUnitValueBySlug(slug), [slug]);
  const liveUnit = useMemo(() => (slug ? getLiveUnit(slug) : null), [getLiveUnit, slug]);
  const unit = liveUnit || staticUnit;

  const isShiny = Boolean(unit && (unit.shiny || isShinyRarity(unit.rarity)));
  const counterpartLink = useMemo(() => {
    if (!unit) return null;
    if (isShiny) {
      const baseSlug = unit.slug.replace(/^shiny-/, '');
      const bu = getUnitBySlug(baseSlug);
      if (bu) return `/values/units/${encodeURIComponent(bu.rarity)}/${bu.slug}`;
    } else {
      const shinySlug = `shiny-${unit.slug}`;
      const su = getUnitBySlug(shinySlug);
      if (su) return `/values/units/${encodeURIComponent(su.rarity)}/${su.slug}`;
    }
    return null;
  }, [unit, isShiny]);

  if (!unit) {
    return (
      <PageShell sidebarTitle="VALUES" navTree={VALUES_NAV}>
        <PageIntro eyebrow={rarity || 'Unit'} title="Not Found">
          <p>We couldn&apos;t find value data for &ldquo;{slug}&rdquo;.</p>
        </PageIntro>
      </PageShell>
    );
  }

  const glow = getRarityGlow(unit.rarity);

  return (
    <PageShell sidebarTitle="VALUES" navTree={VALUES_NAV}>
      <p className="crumb">
        <Link to="/values/units">Units</Link> / <Link to={`/values/units/${encodeURIComponent(unit.rarity)}`}>{unit.rarity}</Link> / {unit.name}
      </p>

      <motion.div
        className="unit-header"
        style={{ '--rarity-accent': glow }}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, ease: [0.23, 1, 0.32, 1] }}
      >
        <ThemeCutout
          variant={getCutoutForRarity(unit.rarity)}
          tintColor={glow}
          floating
          className="unit-header-cutout"
        />
        <div className="unit-title-row">
          <UnitIcon
            slug={unit.slug}
            name={unit.name}
            glowColor={glow}
            shiny={isShinyRarity(unit.rarity)}
            size={108}
            imageUrl={unit.imageUrl}
          />
          <div className="unit-title-copy">
            <h1>{unit.name}</h1>
            <div className="unit-badges">
              <span className="badge filled">{unit.rarity}</span>
              {unit.type && <span className="badge">{unit.type}</span>}
              {unit.category && <span className="badge dim">{unit.category}</span>}
            </div>
          </div>
          <div className="unit-header-actions">
            <ShinyToggle isShiny={isShiny} counterpartLink={counterpartLink} />
            <div className="unit-header-btn-group">
              <Link
                to="/values/calculator"
                className="unit-secondary-btn"
              >
                🧮 Calculator
              </Link>
              <Link
                to={`/wiki/units/${encodeURIComponent(unit.rarity)}/${unit.slug}`}
                className="unit-crosslink-btn"
              >
                View WIKI Page →
              </Link>
            </div>
          </div>
        </div>
      </motion.div>

      {error && <p className="pending-flag">Live values could not load; showing bundled fallback values.</p>}

      {!unit.hasValue ? (
        <div className="empty-state" style={{ marginTop: 24 }}>
          No market data yet for {unit.name}. Give me a base value, demand rating, and scarcity
          rating (from real trades) and I&apos;ll compute its trade value.
        </div>
      ) : (
        <>
          <motion.div
            className="stat-grid"
            style={{ marginTop: 24 }}
            variants={statGridVariants}
            initial="initial"
            animate="animate"
          >
            <StatBox
              term="value"
              label="Value"
              value={unit.specialValue || (unit.tradeValueMax ? `${formatCompactNumber(unit.tradeValue)}-${formatCompactNumber(unit.tradeValueMax)}` : formatCompactNumber(unit.tradeValue))}
              fullValue={unit.specialValue || (unit.tradeValueMax ? `${formatFullNumber(unit.tradeValue)} - ${formatFullNumber(unit.tradeValueMax)}` : formatFullNumber(unit.tradeValue))}
              color="var(--c-info)"
            />
            <StatBox
              term="gems"
              label="Gems"
              value={unit.specialGems || (unit.gemsMax ? `${formatCompactNumber(unit.gems)}-${formatCompactNumber(unit.gemsMax)}` : formatCompactNumber(unit.gems))}
              fullValue={unit.specialGems || (unit.gemsMax ? `${formatFullNumber(unit.gems)} - ${formatFullNumber(unit.gemsMax)}` : formatFullNumber(unit.gems))}
              color="var(--c-purple)"
            />
            <StatBox
              term="coins"
              label="Coins"
              value={unit.specialCoins || (unit.coinsMax ? `${formatCompactNumber(unit.coins)}-${formatCompactNumber(unit.coinsMax)}` : formatCompactNumber(unit.coins))}
              fullValue={unit.specialCoins || (unit.coinsMax ? `${formatFullNumber(unit.coins)} - ${formatFullNumber(unit.coinsMax)}` : formatFullNumber(unit.coins))}
              color="var(--c-warning)"
            />
            {unit.trend && (
              <StatBox
                term="status"
                label="Status"
                value={unit.trend === 'rising' ? 'Rising' : unit.trend === 'falling' ? 'Dropping' : unit.trend === 'fluctuating' ? 'Fluctuating' : 'Stable'}
                fullValue={`Trend: ${unit.trend}`}
                color={unit.trend === 'rising' ? 'var(--c-success)' : unit.trend === 'falling' ? 'var(--c-danger)' : unit.trend === 'fluctuating' ? 'var(--c-warning)' : '#ffffff'}
              />
            )}
          </motion.div>

          <div className="vud-bars">
            <BarRow term="demand" label="Demand" tier={unit.demand} color={DEMAND_COLORS[unit.demand]} percent={DEMAND_PERCENT[unit.demand]} delay={0.12} />
            <BarRow term="scarcity" label="Scarcity" tier={unit.scarcity} color={SCARCITY_COLORS[unit.scarcity]} percent={SCARCITY_PERCENT[unit.scarcity]} delay={0.2} />
          </div>

          {unit.updatedAt && (
            <p className="vud-updated" title={new Date(unit.updatedAt).toLocaleString()}>
              🕒 Value last updated {formatRelativeTime(unit.updatedAt)}
            </p>
          )}
        </>
      )}
    </PageShell>
  );
}

function StatBox({ label, value, fullValue, color, term }) {
  return (
    <motion.div className="stat-box" variants={statBoxVariants}>
      <div className="stat-value" title={fullValue ? `${fullValue} exact` : undefined} style={color ? { color } : undefined}>
        {value}
      </div>
      <div className="stat-label">
        {term ? <TermTip term={term}>{label}</TermTip> : label}
      </div>
    </motion.div>
  );
}

function BarRow({ label, tier, color, percent, delay = 0, term }) {
  return (
    <div className="vud-bar-row">
      <div className="vud-bar-header">
        <span className="vud-bar-label">{term ? <TermTip term={term}>{label}</TermTip> : label}</span>
        <span className="vud-bar-tier" style={{ color }}>{tier}</span>
      </div>
      <div className="vud-bar-track">
        <motion.div
          className="vud-bar-fill"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.55, ease: [0.23, 1, 0.32, 1], delay }}
        />
      </div>
    </div>
  );
}
