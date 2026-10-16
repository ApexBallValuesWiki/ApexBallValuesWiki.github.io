import { Link } from 'react-router-dom';
import PageShell from '../../components/PageShell';
import PageIntro from '../../components/PageIntro';
import UnitExplorer from '../../components/UnitExplorer';
import ThemeCutout, { getCutoutForRarity } from '../../components/ThemeCutout';
import { getRarityGlow } from '../../data/taxonomy';
import { UNITS_BY_RARITY } from '../../data/units';
import { VALUES_NAV } from '../../config/navigation';
import '../wiki/WikiHome.css';

const TIER_CARDS = [
  { rarity: 'Omegas', label: 'Omegas', desc: 'Top-tier endgame units & highest market valuations' },
  { rarity: 'Transcendents', label: 'Transcendents', desc: 'Ascended units with high trade demand' },
  { rarity: 'Mythics', label: 'Mythics', desc: 'Core meta DPS & support powerhouses' },
  { rarity: 'Legendaries', label: 'Legendaries', desc: 'Popular mid-to-late game staples' },
  { rarity: 'Awesome', label: 'Awesome', desc: 'Versatile tactical towers & event units' },
  { rarity: 'Rares', label: 'Rares', desc: 'Accessible early-to-mid game defenders' },
  { rarity: 'Odds', label: 'Odds', desc: 'Uncommon utility & starter progression units' },
  { rarity: 'Normie', label: 'Normie', desc: 'Foundational base towers & collector staples' },
  { rarity: '???', label: '???', desc: 'Secret, exclusive & unobtainable anomalies' },
];

export default function ValuesHome() {
  return (
    <PageShell sidebarTitle="VALUES" navTree={VALUES_NAV}>
      <PageIntro
        title="Values"
        cutoutVariant="poseidon"
        actions={
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Link to="/values/calculator" className="hero-btn primary">
              Open Trade Calculator →
            </Link>
            <Link to="/values/units/search" className="hero-btn secondary">
              Search Unit Values
            </Link>
          </div>
        }
      >
        <p>
          Base values, demand, and scarcity ratings sourced from real trades &amp; market data.
          Every value shown is derived from the live formula:{' '}
          <code>TradeValue = BaseValue × DemandMultiplier × ScarcityMultiplier</code>
        </p>
      </PageIntro>

      <UnitExplorer mode="values" />

      {/* Expanded Rarity Tier Value Directories */}
      <section className="hub-tier-section" aria-label="Unit Value Tiers">
        <div className="hub-tier-head">
          <h2>Browse Values by Rarity</h2>
          <div className="hub-tier-actions">
            <Link to="/values/crates" className="hub-quick-link">📦 Crates &amp; Gamepasses</Link>
            <Link to="/values/calculator" className="hub-quick-link">🧮 W/F/L Calculator</Link>
          </div>
        </div>

        <div className="hub-tier-grid">
          {TIER_CARDS.map((t) => {
            const glow = getRarityGlow(t.rarity);
            const count = (UNITS_BY_RARITY[t.rarity] || []).length;
            const shinyRarity = `Shiny ${t.rarity}`;
            const shinyCount = (UNITS_BY_RARITY[shinyRarity] || []).length;
            return (
              <div
                key={t.rarity}
                className="hub-tier-card"
                style={{ '--tier-glow': glow }}
              >
                <ThemeCutout
                  variant={getCutoutForRarity(t.rarity)}
                  tintColor={glow}
                  className="hub-tier-cutout"
                />
                <div className="hub-tier-body">
                  <div className="hub-tier-title-row">
                    <span className="hub-tier-dot" style={{ background: glow }} />
                    <h3>{t.label}</h3>
                    <span className="hub-tier-count">{count}</span>
                  </div>
                  <p>{t.desc}</p>
                </div>
                <div className="hub-tier-links">
                  <Link
                    to={`/values/units/${encodeURIComponent(t.rarity)}`}
                    className="hub-tier-btn primary"
                  >
                    Base ({count}) →
                  </Link>
                  {shinyCount > 0 && (
                    <Link
                      to={`/values/units/${encodeURIComponent(shinyRarity)}`}
                      className="hub-tier-btn shiny"
                    >
                      ✨ Shiny ({shinyCount})
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </PageShell>
  );
}
