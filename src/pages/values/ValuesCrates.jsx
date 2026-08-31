import PageShell from '../../components/PageShell';
import EntityGrid from '../../components/EntityGrid';
import { VALUES_NAV } from '../../config/navigation';
import { useData } from '../../context/DataContext';

// ============================================================================
// VALUES / CRATES — every crate with its live data (drop rates, obtain) and
// value when the team has set one. Mirrors the WIKI crates page, values-side.
// ============================================================================
export default function ValuesCrates() {
  const { crates } = useData();

  return (
    <PageShell sidebarTitle="VALUES" navTree={VALUES_NAV}>
      <h1>Crates</h1>
      <p className="crumb">VALUES / Crates</p>
      <EntityGrid entities={crates} linkBase="/wiki/items/Crates" emptyLabel="No crates published yet." />
    </PageShell>
  );
}
