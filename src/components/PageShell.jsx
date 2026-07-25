import { useCallback, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Sidebar from './Sidebar';
import { VALUES_NAV, WIKI_NAV } from '../config/navigation';
import './PageShell.css';

export default function PageShell({ sidebarTitle, navTree, sidebar, children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const openMobileNav = useCallback(() => setMobileOpen(true), []);
  const closeMobileNav = useCallback(() => setMobileOpen(false), []);

  const resolvedTree = Array.isArray(navTree) ? navTree : (sidebar === 'values' ? VALUES_NAV : sidebar === 'wiki' ? WIKI_NAV : []);
  const resolvedTitle = sidebarTitle || (sidebar === 'values' ? 'VALUES' : sidebar === 'wiki' ? 'WIKI' : '');

  return (
    <div className="page-shell">
      <button
        type="button"
        className="mobile-nav-toggle"
        onClick={openMobileNav}
        aria-label="Open navigation"
        aria-expanded={mobileOpen}
      >
        ☰ {resolvedTitle}
      </button>

      <div className="sidebar-desktop">
        <Sidebar title={resolvedTitle} tree={resolvedTree} />
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              className="mobile-nav-scrim"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={closeMobileNav}
            />
            <motion.div
              className="mobile-nav-drawer"
              data-lenis-prevent
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
              onClick={closeMobileNav}
            >
              <Sidebar title={resolvedTitle} tree={resolvedTree} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <main className="page-content">{children}</main>
    </div>
  );
}
