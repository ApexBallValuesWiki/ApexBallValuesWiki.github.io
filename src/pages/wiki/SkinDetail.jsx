import { useParams, Link, Navigate } from 'react-router-dom';
import { decodeRouteParam } from '../../utils/routeParams';
import PageShell from '../../components/PageShell';
import { WIKI_NAV } from '../../config/navigation';
import { getSkinBySlug } from '../../data/skins';

export default function SkinDetail({ shiny = false }) {
  const params = useParams();
  const category = decodeRouteParam(params.category);
  const slug = decodeRouteParam(params.slug);
  const skin = getSkinBySlug(slug, shiny);
  const base = shiny ? '/wiki/shiny-skins' : '/wiki/skins';
  if (!skin) return <Navigate to={`${base}/${category}`} replace />;

  return (
    <PageShell sidebarTitle="WIKI" navTree={WIKI_NAV}>
      <p className="crumb">
        <Link to={base}>{shiny ? 'Shiny Skins' : 'Skins'}</Link> / <Link to={`${base}/${category}`}>{category}</Link> / {skin.name}
      </p>
      <h1>{shiny ? `Shiny ${skin.name}` : skin.name}</h1>
      {!skin.documented ? (
        <div className="empty-state" style={{ marginTop: 24 }}>
          No data yet for this skin. Send me its description and how to obtain it.
        </div>
      ) : (
        <div className="unit-body">
          {skin.description && <p className="unit-desc">{skin.description}</p>}
          {skin.obtain && (
            <table className="kv-table">
              <tbody>
                <tr><th>Method</th><td>{skin.obtain.method}</td></tr>
                <tr><th>Source</th><td>{skin.obtain.source}</td></tr>
              </tbody>
            </table>
          )}
        </div>
      )}
    </PageShell>
  );
}
