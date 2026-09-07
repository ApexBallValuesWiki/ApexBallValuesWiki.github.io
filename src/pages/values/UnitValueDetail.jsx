import { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { decodeRouteParam } from '../../utils/routeParams';
import { motion } from 'framer-motion';
import { getUnitValueBySlug } from '../../data/values';
import { getUnitBySlug } from '../../data/units';
import { slugify } from '../../utils/slug';
import { useData } from '../../context/DataContext';
import {
  getRarityPalette,
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
import { formatCompactNumber, formatFullNumber, formatRelativeTime } from '../../utils/formatNumber';
import './UnitValueDetail.css';
import { TermTip } from '../../components/StatMeta';

const statGridVariants = {
  initial: {},
  animate: { transition: { staggerChildren: 0.08 } },
};

const statBoxVariants = {
  initial: { opacity: 0, y: 14, scale: 0.94 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
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

  const counterpartLink = useMemo(() => {
    if (!unit) return null;
    const isShiny = unit.shiny || isShinyRarity(unit.rarity);
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
  }, [unit]);

  if (!unit) {
    return (
      <PageShell sidebarTitle="VALUES" navTree={VALUES_NAV}>
        <PageIntro eyebrow={rarity || 'Unit'} title="Not Found">
          <p>We couldn&apos;t find value data for &ldquo;{slug}&rdquo;.</p>
        </PageIntro>
      </PageShell>
    );
  }

  const palette = getRarityPalette(unit.rarity);
  const glow = getRarityGlow(unit.rarity);

  return (
    <PageShell sidebarTitle="VALUES" navTree={VALUES_NAV}>
      <motion.div
        className="rarity-top-bar"
        style={{ background: `linear-gradient(90deg, ${palette.join(', ')})`, height: 3, borderRadius: 2 }}
        initial={{ scaleX: 0, originX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      />

      <PageIntro
        eyebrow={unit.rarity}
        title={
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
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
                  color: (unit.shiny || isShinyRarity(unit.rarity)) ? '#ffaa00' : 'rgba(255,255,255,0.4)',
                  boxShadow: (unit.shiny || isShinyRarity(unit.rarity)) ? '0 0 10px rgba(255, 170, 0, 0.25)' : 'none',
                  transition: 'all 0.25s ease',
                  verticalAlign: 'middle'
                }}
                title={(unit.shiny || isShinyRarity(unit.rarity)) ? "Switch to Base Variant" : "Switch to Shiny Variant"}
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
          </span>
        }
        actions={(
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-end' }}>
            <UnitIcon
              slug={unit.slug}
              name={unit.name}
              glowColor={glow}
              shiny={isShinyRarity(unit.rarity)}
              size={92}
              imageUrl={unit.imageUrl}
            />
            <Link
              to={`/wiki/units/${encodeURIComponent(unit.rarity)}/${unit.slug}`}
              className="badge filled"
              style={{ textDecoration: 'none', padding: '6px 14px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              View WIKI Page →
            </Link>
          </div>
        )}
      >
        <p style={{ color: glow, textShadow: `0 0 14px ${glow}66` }}>
          {unit.type || 'Unit'} · {unit.category || 'Standard'}
        </p>
      </PageIntro>

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
            {unit.trend && (
            <StatBox 
              term="status"
              label="Status" 
              value={unit.trend === 'rising' ? 'Rising' : unit.trend === 'falling' ? 'Dropping' : unit.trend === 'fluctuating' ? 'Fluctuating' : 'Stable'} 
              fullValue={`Trend: ${unit.trend}`} 
              color={unit.trend === 'rising' ? '#42d392' : unit.trend === 'falling' ? '#ff5c5c' : unit.trend === 'fluctuating' ? '#ffd24d' : '#ffffff'} 
            /> 
            )}
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
            {unit.trend && <StatBox label="Trend" value={unit.trend} />}
          </motion.div>
          {unit.updatedAt && (
            <p className="vud-updated" title={new Date(unit.updatedAt).toLocaleString()}>
              🕒 Value last updated {formatRelativeTime(unit.updatedAt)}
            </p>
          )}

            {unit.liveValue && unit.updatedAt && (
              <p className="pending-flag" style={{ marginTop: 12 }}>
                Live value updated {new Date(unit.updatedAt).toLocaleString()}.
              </p>
            )}

            <div className="vud-bars">
              <BarRow term="demand" label="Demand" tier={unit.demand} color={DEMAND_COLORS[unit.demand]} percent={DEMAND_PERCENT[unit.demand]} delay={0.2} />
              <BarRow term="scarcity" label="Scarcity" tier={unit.scarcity} color={SCARCITY_COLORS[unit.scarcity]} percent={SCARCITY_PERCENT[unit.scarcity]} delay={0.3} />
            </div>
          </>
        )}
    </PageShell>
  );
}

function StatBox({ label, value, fullValue, color, term }) {
  return (
    <motion.div className="stat-box" variants={statBoxVariants}>
      <div className="stat-value" title={fullValue ? `${fullValue} exact` : undefined} style={color ? { color, textShadow: `0 0 10px ${color}80` } : undefined}>
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
          style={{ background: color, boxShadow: `0 0 12px ${color}88` }}
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1], delay }}
        />
      </div>
    </div>
  );
}
