import { Link } from 'react-router-dom';
import PageShell from '../../components/PageShell';
import PageIntro from '../../components/PageIntro';
import UnitExplorer from '../../components/UnitExplorer';
import ThemeCutout, { getCutoutForRarity } from '../../components/ThemeCutout';
import { getRarityGlow } from '../../data/taxonomy';
import { UNITS_BY_RARITY } from '../../data/units';
import { WIKI_NAV } from '../../config/navigation';
import './WikiHome.css';

const TIER_CARDS = [
  { rarity: 'Omegas', label: 'Omegas', desc: 'Endgame apex towers with full ability & upgrade breakdowns' },
  { rarity: 'Transcendents', label: 'Transcendents', desc: 'Ascended towers, passives & multi-stage upgrade paths' },
  { rarity: 'Mythics', label: 'Mythics', desc: 'High-DPS carries, AoE specialists & synergy units' },
  { rarity: 'Legendaries', label: 'Legendaries', desc: 'Core mid-to-late game towers & economy boosters' },
  { rarity: 'Awesome', label: 'Awesome', desc: 'Specialized elemental, slow & tactical towers' },
  { rarity: 'Rares', label: 'Rares', desc: 'Reliable early wave defense & support units' },
  { rarity: 'Odds', label: 'Odds', desc: 'Uncommon starter units & early progression stats' },
  { rarity: 'Normie', label: 'Normie', desc: 'Base towers, starter loadouts & classic units' },
  { rarity: '???', label: '???', desc: 'Hidden, event-exclusive & unobtainable units' },
];

export default function WikiHome() {
  return (
    <PageShell sidebarTitle="WIKI" navTree={WIKI_NAV}>
      <PageIntro
        title="WIKI"
        cutoutVariant="overlord"
        actions={
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Link to="/wiki/units/search" className="hero-btn primary">
              Search Units →
            </Link>
            <Link to="/wiki/compare" className="hero-btn secondary">
              Compare Units
            </Link>
            <Link to="/wiki/leaderboards" className="hero-btn secondary">
              Leaderboards
            </Link>
          </div>
        }
      >
        <p>
          Units database for Ball Tower Defense. Full stat sheets include cooldowns, range,
          damage, placement counts, passives, abilities, synergies, upgrade costs/DPS/cost-per-DPS,
          obtain methods, unit type, and category tagging.
        </p>
      </PageIntro>

      <UnitExplorer mode="wiki" />

      {/* Expanded Rarity Tier WIKI Directories */}
      <section className="hub-tier-section" aria-label="WIKI Unit Rarity Tiers">
        <div className="hub-tier-head">
          <h2>Browse WIKI by Rarity &amp; Category</h2>
          <div className="hub-tier-actions">
            <Link to="/wiki/maps" className="hub-quick-link">🗺️ Maps</Link>
            <Link to="/wiki/crates" className="hub-quick-link">📦 Crates</Link>
            <Link to="/wiki/items" className="hub-quick-link">🧪 Materials</Link>
            <Link to="/wiki/traits" className="hub-quick-link">⚡ Traits</Link>
            <Link to="/wiki/skins" className="hub-quick-link">🎨 Skins</Link>
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
                    to={`/wiki/units/${encodeURIComponent(t.rarity)}`}
                    className="hub-tier-btn primary"
                  >
                    Base ({count}) →
                  </Link>
                  {shinyCount > 0 && (
                    <Link
                      to={`/wiki/units/${encodeURIComponent(shinyRarity)}`}
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
