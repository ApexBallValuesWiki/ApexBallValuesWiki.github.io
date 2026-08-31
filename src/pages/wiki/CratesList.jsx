import PageShell from '../../components/PageShell';
import EntityGrid from '../../components/EntityGrid';
import { WIKI_NAV } from '../../config/navigation';
import { useData } from '../../context/DataContext';
export default function CratesList() {
  const { crates } = useData();
  return <PageShell sidebarTitle="WIKI" navTree={WIKI_NAV}><h1>Crates</h1><p className="crumb">WIKI / Crates</p><EntityGrid entities={crates} linkBase="/wiki/items/Crates" emptyLabel="No crates published yet." /></PageShell>;
}
