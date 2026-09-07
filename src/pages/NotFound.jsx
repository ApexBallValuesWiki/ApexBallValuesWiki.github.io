import { Link } from 'react-router-dom';
import PageShell from '../components/PageShell';
import UnitSearchPanel from '../components/UnitSearchPanel';
import { WIKI_NAV } from '../config/navigation';

// 404 — a real "not found" page instead of silently landing on Home. Shows
// where the visitor is, offers search and the main destinations.
export default function NotFound() {
  const typedPath = typeof window !== 'undefined' ? window.location.pathname : '';
  return (
    <PageShell sidebarTitle="WIKI" navTree={WIKI_NAV}>
      <div style={{ textAlign: 'center', padding: '46px 18px 30px' }}>
        <div style={{ fontSize: '64px', lineHeight: 1, marginBottom: '10px' }}>🧭</div>
        <h1 style={{ margin: '0 0 8px', fontSize: 'clamp(26px, 5vw, 38px)' }}>Page not found</h1>
        <p style={{ margin: '0 auto 6px', maxWidth: '480px', color: 'var(--text-dim, rgba(255,255,255,0.6))', fontSize: '15px' }}>
          The page <code style={{ color: 'var(--accent, #4d9dff)', wordBreak: 'break-all' }}>{typedPath}</code> doesn&apos;t exist — it may have been renamed or removed.
        </p>
      </div>

      <div style={{ maxWidth: '560px', margin: '0 auto 26px' }}>
        <UnitSearchPanel basePath="/wiki/units" />
      </div>

      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '40px' }}>
        <Link to="/" className="badge filled" style={{ padding: '10px 18px', fontSize: '0.85rem' }}>🏠 Home</Link>
        <Link to="/wiki" className="badge" style={{ padding: '10px 18px', fontSize: '0.85rem' }}>📖 WIKI</Link>
        <Link to="/values" className="badge" style={{ padding: '10px 18px', fontSize: '0.85rem' }}>💰 Values</Link>
        <Link to="/values/calculator" className="badge" style={{ padding: '10px 18px', fontSize: '0.85rem' }}>🧮 Trade Calculator</Link>
      </div>
    </PageShell>
  );
}
