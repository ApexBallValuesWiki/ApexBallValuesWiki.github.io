import { useMemo } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { decodeRouteParam } from '../../utils/routeParams';
import PageShell from '../../components/PageShell';
import { WIKI_NAV } from '../../config/navigation';
import { getItemBySlug, ALL_ITEMS } from '../../data/items';
import { useData } from '../../context/DataContext';
import { ALL_UNITS } from '../../data/units';
import { useWikiImageOverrides } from '../../hooks/useWikiImageOverrides';
import { slugify } from '../../utils/slug';

export default function ItemDetail() {
  const params = useParams();
  const group = decodeRouteParam(params.group);
  const slug = decodeRouteParam(params.slug);
  const { crates, createdUnits } = useData();
  const item = group === 'Crates' ? (crates.find((entry) => entry.slug === slug) || getItemBySlug(slug)) : getItemBySlug(slug);
  // Live unit images for the crate's Units section (falls back to the local
  // image cache while the database loads).
  const dropNames = Object.entries(item?.chances || {}).map(([name]) => slugify(name));
  // Units = static roster + editor-created units. Materials/items are NOT
  // units and never appear in this section.
  const unitNames = useMemo(() => new Set([...ALL_UNITS, ...(createdUnits || [])].map((u) => (u.name || '').toLowerCase())), [createdUnits]);
  const wikiImages = useWikiImageOverrides(dropNames);
  if (!item) return <Navigate to={`/wiki/items/${group}`} replace />;

  return (
    <PageShell sidebarTitle="WIKI" navTree={WIKI_NAV}>
      <p className="crumb">
        <Link to="/wiki/items/Consumables">Items</Link> / <Link to={`/wiki/items/${group}`}>{group}</Link> / {item.name}
      </p>
      <h1>{item.name}</h1>
      {!item.documented ? (
        <div className="empty-state" style={{ marginTop: 24 }}>
          No data yet for {item.name}. Send me its description, how to obtain it, effect, and base
          value and I'll fill this page in.
        </div>
      ) : (
        <div className="unit-body">
          {(item.imageUrl || item.image_url || item.image) && (
            <div className="item-detail-image" style={{ width: '120px', height: '120px', borderRadius: '14px', overflow: 'hidden', marginBottom: '20px', border: '1px solid var(--border, rgba(255,255,255,0.12))', background: '#0c0c12', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src={item.imageUrl || item.image_url || item.image} alt={item.name} style={{ width: '80%', height: '80%', objectFit: 'contain' }} />
            </div>
          )}
          {item.description && (
            <p className="unit-desc" style={group === 'Crates' ? { whiteSpace: 'pre-line' } : undefined}>
              {item.description}
            </p>
          )}
          {item.effect && group !== 'Crates' && (
            <section className="unit-section">
              <h2>Effect</h2>
              <p>{item.effect}</p>
            </section>
          )}
          {item.obtain && (
            <section className="unit-section">
              <h2>How to Obtain</h2>
              {typeof item.obtain === 'string' ? (
                <p>{item.obtain}</p>
              ) : (
                <table className="kv-table">
                  <tbody>
                    <tr><th>Method</th><td>{item.obtain.method}</td></tr>
                    <tr><th>Source</th><td>{item.obtain.source}</td></tr>
                    {item.obtain.dropRate && <tr><th>Drop Rate</th><td>{item.obtain.dropRate}</td></tr>}
                  </tbody>
                </table>
              )}
            </section>
          )}
          {item.chances && Object.keys(item.chances).length > 0 && (
            <section className="unit-section" style={{ marginTop: '30px' }}>
              <h2>Units</h2>
              <style>{`
                .crate-drops-grid {
                  display: grid;
                  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
                  gap: 16px;
                  margin-top: 16px;
                }
                .crate-drop-card {
                  background: #111218;
                  border: 1px solid rgba(255, 255, 255, 0.08);
                  border-radius: 16px;
                  padding: 16px;
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  text-align: center;
                  transition: transform 0.2s ease, border-color 0.2s ease;
                }
                .crate-drop-card:hover {
                  transform: translateY(-2px);
                  border-color: rgba(255, 255, 255, 0.15);
                }
                .crate-drop-image {
                  width: 72px;
                  height: 72px;
                  background: #0a0a0e;
                  border: 1px solid rgba(255, 255, 255, 0.05);
                  border-radius: 12px;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  margin-bottom: 12px;
                  overflow: hidden;
                }
                .crate-drop-image img {
                  width: 75%;
                  height: 75%;
                  object-fit: contain;
                }
                .crate-drop-fallback {
                  font-size: 28px;
                }
                .crate-drop-name {
                  font-family: 'Montserrat', sans-serif;
                  font-size: 14px;
                  font-weight: 600;
                  color: #ffffff;
                  margin-bottom: 4px;
                  line-height: 1.3;
                }
                .crate-drop-rate {
                  font-family: 'Montserrat', sans-serif;
                  font-size: 12px;
                  font-weight: 500;
                  color: var(--accent, var(--c-info));
                  background: rgba(77, 157, 255, 0.08);
                  padding: 4px 10px;
                  border-radius: 999px !important;
                  display: inline-block;
                }
              `}</style>
              <div className="crate-drops-grid">
                {Object.entries(item.chances).filter(([name]) => unitNames.has(name.toLowerCase())).map(([name, rate]) => {
                  const isUnit = true; // materials/items are not units — hidden from this section
                  const isItem = false;
                  const itemSlug = slugify(name);
                  
                  const matchedUnit = ALL_UNITS.find((u) => u.slug === itemSlug || u.name.toLowerCase() === name.toLowerCase());
                  const matchedItem = ALL_ITEMS.find((i) => i.slug === itemSlug || i.name.toLowerCase() === name.toLowerCase());
                  
                  const imgUrl = (matchedUnit && wikiImages[matchedUnit.slug]) || matchedUnit?.imageUrl || matchedUnit?.image_url || null;
                  
                  const linkPath = isUnit 
                    ? `/wiki/units/${encodeURIComponent(matchedUnit.rarity)}/${encodeURIComponent(matchedUnit.slug)}`
                    : isItem
                    ? `/wiki/items/${encodeURIComponent(matchedItem?.group || 'Consumables')}/${encodeURIComponent(matchedItem?.slug || itemSlug)}`
                    : null;

                  const cardContent = (
                    <>
                      <div className="crate-drop-image">
                        {imgUrl ? (
                          <img src={imgUrl} alt={name} />
                        ) : (
                          <span className="crate-drop-fallback" aria-hidden="true">⚔️</span>
                        )}
                      </div>
                      <div className="crate-drop-name">{name}</div>
                      <div className="crate-drop-rate">{rate}</div>
                    </>
                  );

                  return linkPath ? (
                    <Link to={linkPath} key={name} className="crate-drop-card" style={{ textDecoration: 'none' }}>
                      {cardContent}
                    </Link>
                  ) : (
                    <div key={name} className="crate-drop-card">
                      {cardContent}
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}
    </PageShell>
  );
}
