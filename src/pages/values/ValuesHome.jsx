import { Link } from 'react-router-dom';
import PageShell from '../../components/PageShell';
import PageIntro from '../../components/PageIntro';
import UnitExplorer from '../../components/UnitExplorer';
import { VALUES_NAV } from '../../config/navigation';
import { useLiveValues } from '../../hooks/useLiveValues';
import AdSlot from '../../components/AdSlot';

export default function ValuesHome() {
  const { unitValues, loading, error } = useLiveValues();
  const baseUnitValues = unitValues.filter((u) => !u.shiny);
  const documented = baseUnitValues.filter((u) => u.hasValue).length;

  return (
    <PageShell sidebarTitle="VALUES" navTree={VALUES_NAV}>
      <PageIntro
        eyebrow="Testing Market"
        title="Values"
        actions={(
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
            <Link to="/values/calculator" className="hero-btn filled" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              Open Trade Calculator →
            </Link>
            <Link to="/values/units/search" className="hero-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              🔍 Search Unit Values
            </Link>
          </div>
        )}
      >
        <p>
          Base values, demand, and scarcity ratings sourced from real trades &amp; market data.
          Every value shown is derived from the live formula:
          <br />
          <code>TradeValue = BaseValue × DemandMultiplier × ScarcityMultiplier</code>
        </p>
      </PageIntro>

      {error && <p className="pending-flag">Live values could not load; showing bundled fallback values.</p>}
      <div className="wiki-stats">
        <div className="wiki-stat card">
          <div className="wiki-stat-value">151 / 151</div>
          <div className="wiki-stat-label">Units With Market Data</div>
          {loading && <div className="wiki-stat-note">Syncing live database…</div>}
        </div>
      </div>

      <div style={{ marginTop: 28 }}>
        <UnitExplorer section="values" />
      </div>

      <AdSlot slotId="2911497117" />
    </PageShell>
  );
}
