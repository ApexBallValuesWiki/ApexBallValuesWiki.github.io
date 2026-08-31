import { useParams, Link, Navigate } from 'react-router-dom';
import PageShell from '../../components/PageShell';
import { WIKI_NAV } from '../../config/navigation';
import { getMapBySlug } from '../../data/maps';
import { useData } from '../../context/DataContext';

export default function MapDetail() {
  const { slug } = useParams();
  const { maps } = useData();
  const map = maps.find((entry) => entry.slug === slug) || getMapBySlug(slug);
  if (!map) return <Navigate to="/wiki/maps" replace />;

  return (
    <PageShell sidebarTitle="WIKI" navTree={WIKI_NAV}>
      <p className="crumb"><Link to="/wiki/maps">Maps</Link> / {map.name}</p>
      <h1>{map.name}</h1>
      {!map.documented ? (
        <div className="empty-state" style={{ marginTop: 24 }}>
          No data yet for {map.name}. Send me difficulty, unlock requirement, and description.
        </div>
      ) : (
        <div className="unit-body">
          {(map.image || map.image_url || map.imageUrl) && (
            <div className="map-detail-image" style={{ width: '100%', height: '240px', borderRadius: '14px', overflow: 'hidden', marginBottom: '20px', border: '1px solid var(--border, rgba(255,255,255,0.12))', background: '#0c0c12' }}>
              <img src={map.image || map.image_url || map.imageUrl} alt={map.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          )}
          {map.description && <p className="unit-desc">{map.description}</p>}
          <table className="kv-table">
            <tbody>
              {map.difficulty && <tr><th>Difficulty</th><td>{map.difficulty}</td></tr>}
              {map.unlockRequirement && <tr><th>Unlock</th><td>{map.unlockRequirement}</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </PageShell>
  );
}
