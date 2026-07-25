import PageShell from '../../components/PageShell';
import EntityGrid from '../../components/EntityGrid';
import { WIKI_NAV } from '../../config/navigation';
import { ALL_TRAITS } from '../../data/traits';

export default function TraitsList() {
  return (
    <PageShell sidebarTitle="WIKI" navTree={WIKI_NAV}>
      <h1>Traits</h1>
      <p className="crumb">WIKI / Traits</p>
      <EntityGrid entities={ALL_TRAITS} linkBase="/wiki/traits" />
    </PageShell>
  );
}
