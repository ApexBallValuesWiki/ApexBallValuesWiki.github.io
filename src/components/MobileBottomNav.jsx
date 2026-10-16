import { NavLink, useLocation } from 'react-router-dom';
import { MOBILE_NAV_LINKS } from '../config/navigation';
import { useAdminStatus } from '../hooks/useAdminStatus';
import './MobileBottomNav.css';

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
          <span className="mbn-icon" aria-hidden="true">{link.icon || '•'}</span>
          <span className="mbn-label">{link.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
