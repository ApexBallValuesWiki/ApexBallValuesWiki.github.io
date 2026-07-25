import PageShell from '../../components/PageShell';
import EntityGrid from '../../components/EntityGrid';
import { WIKI_NAV } from '../../config/navigation';

// Editors can replace these starter records through the shared content store.
const REFORGES = [
  { slug: 'damage-reforge', name: 'Damage Reforge', description: 'Improves offensive stats.' },
  { slug: 'range-reforge', name: 'Range Reforge', description: 'Improves unit range.' },
  { slug: 'speed-reforge', name: 'Speed Reforge', description: 'Improves attack speed.' },
];
export default function ReforgesList() {
  return <PageShell sidebarTitle="WIKI" navTree={WIKI_NAV}><h1>Reforges</h1><p className="crumb">WIKI / Reforges</p><EntityGrid entities={REFORGES} linkBase="/wiki/reforges" emptyLabel="No reforges published yet." /></PageShell>;
}
