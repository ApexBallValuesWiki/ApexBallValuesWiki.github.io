import PageShell from '../../components/PageShell';
import PageIntro from '../../components/PageIntro';
import UnitSearchPanel from '../../components/UnitSearchPanel';
import { WIKI_NAV } from '../../config/navigation';

export default function WikiUnitSearch() {
  return (
    <PageShell sidebarTitle="WIKI" navTree={WIKI_NAV}>
      <PageIntro eyebrow="WIKI / Units" title="Search Units">
        <p>Jump to any unit rarity page and highlight the matching card.</p>
      </PageIntro>
      <div style={{ marginTop: 28 }}>
        <UnitSearchPanel basePath="/wiki/units" />
      </div>
    </PageShell>
  );
}
