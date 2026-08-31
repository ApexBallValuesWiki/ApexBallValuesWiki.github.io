import { NavLink } from 'react-router-dom';
import { MOBILE_NAV_LINKS } from '../config/navigation';
import { useAdminStatus } from '../hooks/useAdminStatus';
import './MobileBottomNav.css';

function itemClass({ isActive }) {
  return isActive ? 'mbn-item active' : 'mbn-item';
}

export default function MobileBottomNav() {
  const { isAdmin } = useAdminStatus();
  const links = isAdmin ? [...MOBILE_NAV_LINKS, { to: '/admin', label: 'Admin' }] : MOBILE_NAV_LINKS;

  return (
    <nav className={isAdmin ? 'mobile-bottom-nav with-admin' : 'mobile-bottom-nav'} aria-label="Mobile quick navigation">
      {links.map((link) => (
        <NavLink key={link.to} to={link.to} className={itemClass}>
          <span>{link.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
