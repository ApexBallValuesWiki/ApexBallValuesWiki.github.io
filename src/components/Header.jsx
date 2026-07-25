import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import apexLogo from '../assets/apex-values-wiki-logo.png';
import { TOP_NAV_LINKS } from '../config/navigation';
import { useAdminStatus } from '../hooks/useAdminStatus';
import './Header.css';

function navClass({ isActive }) {
  return isActive ? 'nav-item active' : 'nav-item';
}

export default function Header() {
  const { isAdmin } = useAdminStatus();
  const links = isAdmin ? [...TOP_NAV_LINKS, { to: '/admin', label: 'ADMIN' }] : TOP_NAV_LINKS;

  return (
    <header className="site-header">
      <div className="brand">
        <NavLink to="/" className="brand-link">
          <motion.span className="brand-mark" whileHover={{ rotate: 12, scale: 1.15 }} transition={{ duration: 0.25, ease: 'easeOut' }}>
            <img src={apexLogo} alt="" className="brand-logo" width={2000} height={2000} />
          </motion.span>
          <span className="brand-text">
            APEX <span className="brand-text-dim">— VALUES &amp; WIKI</span>
          </span>
        </NavLink>
      </div>

      <nav className="main-nav">
        {links.map((link) => (
          <NavLink key={link.to} to={link.to} className={navClass}>
            {link.label}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}
