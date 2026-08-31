import { useParams, Navigate } from 'react-router-dom';
import { decodeRouteParam } from '../../utils/routeParams';
import PageShell from '../../components/PageShell';
import EntityGrid from '../../components/EntityGrid';
import { WIKI_NAV } from '../../config/navigation';
import { SKINS_BY_CATEGORY, SHINY_SKINS_BY_CATEGORY } from '../../data/skins';

export default function SkinsList({ shiny = false }) {
  const params = useParams();
  const category = decodeRouteParam(params.category);
  const source = shiny ? SHINY_SKINS_BY_CATEGORY : SKINS_BY_CATEGORY;
  if (!source[category]) return <Navigate to={shiny ? '/wiki/shiny-skins/Normie' : '/wiki/skins/Normie'} replace />;

  const skins = source[category];
  const base = shiny ? '/wiki/shiny-skins' : '/wiki/skins';
  const title = shiny ? `Shiny ${category}` : category;

  return (
    <PageShell sidebarTitle="WIKI" navTree={WIKI_NAV}>
      <h1>{title}</h1>
      <p className="crumb">WIKI / {shiny ? 'Shiny Skins' : 'Skins'} / {category}</p>
      <EntityGrid entities={skins} linkBase={`${base}/${category}`} />
    </PageShell>
  );
}
