import { NavLink, useLocation } from 'react-router-dom';
import { MOBILE_NAV_LINKS } from '../config/navigation';
import { useAdminStatus } from '../hooks/useAdminStatus';
import './MobileBottomNav.css';

// Vector icons avoid missing emoji glyphs and look consistent across mobile browsers.
const NAV_ICONS = {
  Wiki: <><path d="M3 5.5c3-1.2 6-.8 9 1.2v12c-3-2-6-2.4-9-1.2z" /><path d="M21 5.5c-3-1.2-6-.8-9 1.2v12c3-2 6-2.4 9-1.2z" /></>,
  Values: <><path d="M12 3 21 10 12 21 3 10z" /><path d="M3 10h18M8 4.5 12 10l4-5.5M12 10v11" /></>,
  Calc: <><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M8 7h8M8 11h1m3 0h1m3 0h.1M8 15h1m3 0h1m3 0h.1M8 18h1m3 0h1m3 0h.1" /></>,
  Games: <><path d="M7 8h10c2 0 3 1.5 3.7 4.5l.7 3c.4 2-1.4 3-2.8 1.8L16 15H8l-2.6 2.3c-1.4 1.2-3.2.2-2.8-1.8l.7-3C4 9.5 5 8 7 8z" /><path d="M7 10v4M5 12h4M16 11h.1M18 13h.1" /></>,
  Awards: <><path d="M8 4h8v4c0 4-1.5 6-4 6S8 12 8 8zM8 6H5v2c0 2 1 3 3 3M16 6h3v2c0 2-1 3-3 3M12 14v4M8 20h8" /></>,
  Theme: <><path d="M12 3a9 9 0 1 0 0 18h1.2c1.4 0 2-1.5 1.1-2.5-.8-.9-.2-2.2 1-2.2H17a4 4 0 0 0 4-4A9 9 0 0 0 12 3z" /><path d="M7.5 11h.1M10 7.5h.1M14 7.5h.1M17 10.5h.1" /></>,
  Admin: <path d="M12 3 20 6v5c0 5-3 8-8 10-5-2-8-5-8-10V6z" />,
};

export default function MobileBottomNav() {
  const { isAdmin } = useAdminStatus();
  const location = useLocation();
  const links = isAdmin ? [...MOBILE_NAV_LINKS, { to: '/admin', label: 'Admin', icon: '🛡️' }] : MOBILE_NAV_LINKS;
  const isCalcRoute = location.pathname.startsWith('/values/calculator');

  return (
    <nav className={isAdmin ? 'mobile-bottom-nav with-admin' : 'mobile-bottom-nav'} aria-label="Mobile quick navigation">
      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          className={({ isActive }) => {
            const effectiveActive = link.to === '/values' && isCalcRoute ? false : isActive;
            return effectiveActive ? 'mbn-item active' : 'mbn-item';
          }}
        >
          <svg className="mbn-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{NAV_ICONS[link.label]}</svg>
          <span className="mbn-label">{link.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
