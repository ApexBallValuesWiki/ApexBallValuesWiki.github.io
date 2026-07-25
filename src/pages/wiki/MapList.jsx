import PageShell from '../../components/PageShell';
import EntityGrid from '../../components/EntityGrid';
import { WIKI_NAV } from '../../config/navigation';
import { useData } from '../../context/DataContext';

export default function MapsList() {
  const { maps } = useData();
  return (
    <PageShell sidebarTitle="WIKI" navTree={WIKI_NAV}>
      <h1>Maps</h1>
      <p className="crumb">WIKI / Maps</p>
      <EntityGrid entities={maps} linkBase="/wiki/maps" />
    </PageShell>
  );
}
