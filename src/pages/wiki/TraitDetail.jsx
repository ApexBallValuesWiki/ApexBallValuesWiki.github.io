import { useParams, Link, Navigate } from 'react-router-dom';
import PageShell from '../../components/PageShell';
import { WIKI_NAV } from '../../config/navigation';
import { getTraitBySlug } from '../../data/traits';

export default function TraitDetail() {
  const { slug } = useParams();
  const trait = getTraitBySlug(slug);
  if (!trait) return <Navigate to="/wiki/traits" replace />;

  return (
    <PageShell sidebarTitle="WIKI" navTree={WIKI_NAV}>
      <p className="crumb"><Link to="/wiki/traits">Traits</Link> / {trait.name}</p>
      <h1>{trait.name}</h1>
      {!trait.documented ? (
        <div className="empty-state" style={{ marginTop: 24 }}>
          No data yet for {trait.name}. Send me its effect / description.
        </div>
      ) : (
        <p className="unit-desc">{trait.description}</p>
      )}
    </PageShell>
  );
}
