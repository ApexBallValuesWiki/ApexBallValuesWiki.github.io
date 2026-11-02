import { Link } from 'react-router-dom';

// A genuinely light 404. The old version mounted the full unit search panel
// (3,000+ DOM nodes / ~1 MB) just to tell someone a page does not exist.
export default function NotFound() {
  const typedPath = typeof window !== 'undefined' ? window.location.pathname : '';
  return (
    <main className="page-shell" style={{ textAlign: 'center', padding: 'clamp(46px, 9vw, 110px) 18px' }}>
      <div style={{ fontSize: 64, lineHeight: 1, marginBottom: 10 }} aria-hidden="true">🧭</div>
      <h1 style={{ margin: '0 0 8px' }}>Page not found</h1>
      <p style={{ margin: '0 auto 22px', maxWidth: 480, color: 'var(--text-dim, rgba(255,255,255,0.6))' }}>
        The page <code style={{ color: 'var(--accent, #4d9dff)', wordBreak: 'break-all' }}>{typedPath}</code> doesn&apos;t exist — it may have been renamed or removed.
      </p>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        <Link to="/" className="badge filled" style={{ padding: '10px 18px' }}>🏠 Home</Link>
        <Link to="/wiki" className="badge" style={{ padding: '10px 18px' }}>📖 WIKI</Link>
        <Link to="/values" className="badge" style={{ padding: '10px 18px' }}>💰 Values</Link>
        <Link to="/wiki/units/search" className="badge" style={{ padding: '10px 18px' }}>🔍 Search units</Link>
      </div>
    </main>
  );
}
