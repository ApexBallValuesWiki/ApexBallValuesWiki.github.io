import { NavLink, useLocation } from 'react-router-dom';
import OfflineValuesControl from './OfflineValuesControl';
import { motion } from 'framer-motion';
import apexLogo from '../assets/apex-values-wiki-logo.png';
import { TOP_NAV_LINKS } from '../config/navigation';
import { useAdminStatus } from '../hooks/useAdminStatus';
import { prefetchRoute } from '../AppRoutes';
import './Header.css';

export default function Header() {
  const { isAdmin } = useAdminStatus();
  const location = useLocation();
  const links = isAdmin ? [...TOP_NAV_LINKS, { to: '/admin', label: 'ADMIN' }] : TOP_NAV_LINKS;

  return (
    <header className={`site-header${location.pathname === '/' ? ' site-header-home' : ''}`}>
      <div className="brand">
        <NavLink to="/" className="brand-link">
          <motion.span
            className="brand-mark"
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.95 }}
            transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
          >
            <img src={apexLogo} alt="" className="brand-logo" width={2000} height={2000} />
          </motion.span>
          <span className="brand-lockup">
            <span className="brand-text">APEX</span>
            <span className="brand-text-dim">WIKI &amp; VALUES</span>
          </span>
        </NavLink>
      </div>

      <nav className="main-nav" aria-label="Main navigation">
        {links.map((link) => {
          const isCalcRoute = location.pathname.startsWith('/values/calculator');
          return (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) => {
                const effectiveActive = link.to === '/values' && isCalcRoute ? false : isActive;
                return effectiveActive ? 'nav-item active' : 'nav-item';
              }}
              onMouseEnter={() => prefetchRoute(link.to)}
              onFocus={() => prefetchRoute(link.to)}
            >
              {link.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="header-utilities">
        <button
          type="button"
          className="header-search-trigger"
          onClick={() => window.dispatchEvent(new Event('apex:open-palette'))}
          title="Command palette (⌘K / Ctrl+K)"
          aria-label="Open command palette"
          data-apex-palette-open=""
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <span className="header-search-label">Search anything…</span>
          <kbd className="header-kbd">⌘K</kbd>
        </button>
        <OfflineValuesControl />
      </div>
    </header>
  );
}
