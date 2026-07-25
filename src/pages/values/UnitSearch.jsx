import PageShell from '../../components/PageShell';
import PageIntro from '../../components/PageIntro';
import UnitSearchPanel from '../../components/UnitSearchPanel';
import { VALUES_NAV } from '../../config/navigation';

export default function ValuesUnitSearch() {
  return (
    <PageShell sidebarTitle="VALUES" navTree={VALUES_NAV}>
      <PageIntro eyebrow="Values / Units" title="Search Units">
        <p>Find any unit value page by rarity and highlight the matching card.</p>
      </PageIntro>

      <div style={{ marginTop: 28, paddingBottom: 32 }}>
        <UnitSearchPanel basePath="/values/units" />
      </div>
    </PageShell>
  );
}
