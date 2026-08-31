import { useEffect, useRef } from 'react';
import { ADMIN_VIEWS, RAIL_GROUPS } from './adminNav';

// ============================================================================
// ADMIN SHELL — navigation that works on every screen size
// ----------------------------------------------------------------------------
// Desktop keeps the sidebar; phones and tablets get an always-visible bar. The
// old panel hid its only navigation under 768px (`display: none` with no
// replacement), which is exactly why no sub-page could be opened on a phone.
//
// Both surfaces render from the same list, so they cannot drift apart again.
// ============================================================================

const GATED = ADMIN_VIEWS.reduce((acc, item) => {
  acc[item.id] = item;
  return acc;
}, {});

// Some rail buttons are GROUPS ("Units" = values + wiki), so one button can
// highlight/resolve for either tab. Only the keys that are not themselves views:
// building this from every rail button made `dashboard` recurse into itself.
const GROUPS = Object.entries(RAIL_GROUPS).reduce((acc, [key, group]) => {
  acc[key] = { views: group.views };
  return acc;
}, {});

const WIKI_VIEWS = new Set(['wiki', 'create', 'maps', 'crates', 'materials']);

/**
 * The one place that decides whether a section is reachable. Returning false
 * here hides the button AND makes the router fall back to the dashboard, so a
 * role can never land on a screen it cannot use.
 */
export function isAdminViewVisible(id, { role, valueAllowed = false, wikiAllowed = false } = {}) {
  const group = GROUPS[id];
  if (group) return group.views.some((view) => isAdminViewVisible(view, { role, valueAllowed, wikiAllowed }));
  const item = GATED[id];
  if (!item) return false;
  if (item.ownerOnly) return role === 'owner';
  if (item.adminOnly) return role === 'owner' || role === 'admin';
  if (WIKI_VIEWS.has(id)) return !!wikiAllowed;
  if (id === 'values') return !!valueAllowed || !!wikiAllowed;
  return true;
}

/** Scroll the active tab into view — deep links open with it visible. */
function useActiveIntoView(ref, active) {
  useEffect(() => {
    const node = ref.current;
    const el = node?.querySelector('[data-active="true"]');
    if (!el || typeof el.scrollIntoView !== 'function') return undefined;
    const id = requestAnimationFrame(() => {
      try { el.scrollIntoView({ block: 'nearest', inline: 'center' }); } catch { /* not scrollable */ }
    });
    return () => cancelAnimationFrame(id);
  }, [active]);
}

export function AdminNavRail({ items = [], active, onSelect, orientation = 'vertical' }) {
  const ref = useRef(null);
  useActiveIntoView(ref, active);
  return (
    <nav className={`admin-nav admin-nav--${orientation}`} aria-label="Admin sections" ref={ref}>
      {items.map((item) => (
        <button
          type="button"
          key={item.key}
          data-active={active === item.key}
          className={`admin-nav-item ${active === item.key ? 'active' : ''}`}
          onClick={() => onSelect(item.key)}
          aria-current={active === item.key ? 'page' : undefined}
          title={item.label}
        >
          <span className="admin-nav-icon" aria-hidden="true">{item.icon}</span>
          <span className="admin-nav-label">{item.label}</span>
        </button>
      ))}
    </nav>
  );
}

/**
 * Both nav surfaces in one element, so mobile and desktop render from the same
 * list and can never drift apart again.
 */
export function AdminShellNav({ items, active, onSelect }) {
  return (
    <>
      <div className="admin-nav-desktop">
        <AdminNavRail items={items} active={active} onSelect={onSelect} orientation="vertical" />
      </div>
      {/* aria-hidden on the wrapper keeps screen readers on one nav landmark. */}
      <div className="admin-nav-mobile">
        <AdminNavRail items={items} active={active} onSelect={onSelect} orientation="horizontal" />
      </div>
    </>
  );
}

/** Sub-tabs inside one section (Values/WIKI, Maps/Crates, Create hub tabs). */
export function AdminSubTabs({ tabs = [], active, onSelect, label }) {
  if (!tabs.length) return null;
  return (
    <div className="admin-subtabs" role="tablist" aria-label={label}>
      {tabs.map((tab) => (
        <button
          type="button"
          key={tab.id}
          role="tab"
          aria-selected={active === tab.id}
          className={`admin-subtab ${active === tab.id ? 'active' : ''}`}
          onClick={() => onSelect(tab.id)}
        >
          {tab.icon ? <span aria-hidden="true">{tab.icon} </span> : null}
          {tab.label}
        </button>
      ))}
    </div>
  );
}
