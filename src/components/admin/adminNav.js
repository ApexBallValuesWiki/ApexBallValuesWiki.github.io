// ============================================================================
// ADMIN NAVIGATION — the single owner of "where am I in the panel"
// ----------------------------------------------------------------------------
// Everything the admin is looking at lives in the URL, so a refresh, a back
// button press or a link pasted into Discord lands you exactly where you were:
//
//   /admin                        dashboard
//   /admin?view=values&unit=slug  Value Editor, that unit
//   /admin?view=wiki&unit=slug    WIKI Editor, that unit
//   /admin?view=maps&content=slug Maps editor (crates: view=crates)
//   /admin?view=materials&material=slug
//   /admin?view=create&tab=map    Create hub, on the Maps tab
//   /admin?view=logs              Logs & Info (the recycle bin lives there)
//
// The section lives in the QUERY, not the path, on purpose: AppRoutes keys the
// page element on location.pathname, so a path change would remount AdminHome
// and throw away every in-progress form the moment you switched tabs.
//
// Unknown/legacy view names fall back to the dashboard instead of rendering a
// blank page, which is what happened when a stale bookmark pointed at a view
// that had been renamed.
// ============================================================================
import { useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

/** Every sub-page the shell knows about, in sidebar order. */
export const ADMIN_VIEWS = [
  { id: 'dashboard', icon: '📊', label: 'Dashboard' },
  // rail: false = reachable only as a tab inside its section. These four used
  // to be listed in the sidebar AS WELL, which gave the panel two controls for
  // one screen (and two names for it: `Values Editor` vs `Values`).
  { id: 'values', icon: '💰', label: 'Values Editor', tool: 'values', rail: false },
  { id: 'wiki', icon: '📖', label: 'WIKI Editor', tool: 'wiki', rail: false },
  { id: 'create', icon: '✨', label: 'Create' },
  { id: 'maps', icon: '🗺️', label: 'Maps', tool: 'maps', rail: false },
  { id: 'crates', icon: '📦', label: 'Crates', tool: 'crates', rail: false },
  { id: 'materials', icon: '🧪', label: 'Materials' },
  { id: 'bugs', icon: '🐛', label: 'Bug Reports', adminOnly: true },
  { id: 'announcements', icon: '📢', label: 'Announcements', ownerOnly: true },
  { id: 'logs', icon: '📈', label: 'Logs & Info' },
];

/** Views that never appear in the rail; they are the section tab bars. */
export const RAIL_HIDDEN_VIEWS = new Set(ADMIN_VIEWS.filter((v) => v.rail === false).map((v) => v.id));

/** One rail button per editor group, so the highlight survives a tab switch. */
export const RAIL_GROUPS = {
  units: { primary: 'values', views: ['values', 'wiki'] },
  'maps-crates': { primary: 'maps', views: ['maps', 'crates'] },
};

export const RAIL_BUTTONS = [
  { key: 'dashboard', icon: '📊', label: 'Dashboard', views: ['dashboard'] },
  { key: 'units', icon: '💰', label: 'Units', views: RAIL_GROUPS.units.views },
  { key: 'create', icon: '✨', label: 'Create', views: ['create'] },
  { key: 'maps-crates', icon: '🗺️', label: 'Maps & Crates', views: RAIL_GROUPS['maps-crates'].views },
  { key: 'materials', icon: '🧪', label: 'Materials', views: ['materials'] },
  { key: 'bugs', icon: '🐛', label: 'Bug Reports', views: ['bugs'] },
  { key: 'announcements', icon: '📢', label: 'Announcements', views: ['announcements'] },
  { key: 'logs', icon: '📈', label: 'Logs & Info', views: ['logs'] },
];

/** Which rail button a section belongs to (drives the active highlight). */
export function railKeyForView(view) {
  for (const button of RAIL_BUTTONS) {
    if (button.views.includes(view)) return button.key;
  }
  return 'dashboard';
}

/** Where a rail button navigates: its first view this role may open. */
export function primaryViewForRail(key, canView) {
  const button = RAIL_BUTTONS.find((b) => b.key === key);
  if (!button) return key;
  if (canView) {
    const allowed = button.views.filter(canView);
    if (allowed.length) return allowed[0];
  }
  return button.primary || button.views[0];
}

/**
 * The nav list both surfaces render. A group button shows when the role can
 * open at least one of its views, and is renamed to that single view when the
 * other one is locked, so a values-only editor reads `Values` instead of a
 * `Units` button that opens a screen half of which it cannot use.
 */
export function buildRailItems(canView) {
  const out = [];
  for (const button of RAIL_BUTTONS) {
    const allowed = canView ? button.views.filter(canView) : button.views;
    if (!allowed.length) continue;
    const only = allowed.length === 1 ? ADMIN_VIEWS.find((v) => v.id === allowed[0]) : null;
    out.push({
      key: button.key,
      icon: button.icon,
      label: only ? only.label : button.label,
      view: allowed[0],
    });
  }
  return out;
}

const VIEW_IDS = new Set(ADMIN_VIEWS.map((v) => v.id));
/** View names used before the URL rewrite — still accepted, so old bookmarks work. */
const LEGACY_VIEWS = { 'create-unit': 'create', editor: 'values', units: 'values' };
/** The editor toolbar: values/wiki share one screen, maps/crates share another. */
export const EDITOR_TOOLS = [
  { id: 'values', label: '💰 Values' },
  { id: 'wiki', label: '📖 WIKI' },
];
export const CONTENT_TOOLS = [
  { id: 'maps', label: '🗺️ Maps' },
  { id: 'crates', label: '📦 Crates' },
];
export const CREATE_TABS = [
  { id: 'unit', icon: '⚔️', label: 'Create Unit' },
  { id: 'map', icon: '🗺️', label: 'Create Map' },
  { id: 'skin', icon: '🎨', label: 'Create Skin' },
  { id: 'material', icon: '🧪', label: 'Create Material' },
];

const QUERY_FOR_VIEW = {
  values: 'unit',
  wiki: 'unit',
  maps: 'content',
  crates: 'content',
  materials: 'material',
};

/** Which query key holds the selected entry for a view (null = none). */
export function selectionKeyFor(view) {
  return QUERY_FOR_VIEW[view] || null;
}

/** 'unit' tab of the create hub, or null when the view is not the hub. */
function normalizeView(raw) {
  const id = String(raw || '').replace(/^\//, '').split('?')[0];
  if (!id) return 'dashboard';
  if (VIEW_IDS.has(id)) return id;
  return LEGACY_VIEWS[id] || 'dashboard';
}

/** Read the section from `?view=` (or a legacy `/admin/<view>` path). */
export function parseAdminLocation({ pathname, search } = {}) {
  const params = new URLSearchParams(search || '');
  const fromQuery = params.get('view');
  if (fromQuery) return normalizeView(fromQuery);
  const seg = String(pathname || '').replace(/^\/admin\/?/, '');
  return normalizeView(seg);
}

/** True when the browser is on the standalone password screen. */
export function isResetPasswordPath(pathname) {
  return String(pathname || '').replace(/\/+$/, '').endsWith('/admin/reset-password');
}

/**
 * Build the href for a navigation intent. Only the keys that apply to the
 * target view survive — that is what stops `?unit=` from following you into
 * the Materials editor and resurrecting a stale selection.
 */
export function buildAdminHref({ view, tool, tab, selection } = {}) {
  const nextView = normalizeView(view);
  const params = new URLSearchParams();
  if (nextView !== 'dashboard') params.set('view', nextView);
  const key = selectionKeyFor(nextView);
  if (selection && key) params.set(key, selection);
  // `tool` only matters where two sections share a screen.
  if (tool && (nextView === 'values' || nextView === 'wiki') && tool !== nextView) params.set('tool', tool);
  if (tab && nextView === 'create') params.set('tab', tab);
  const qs = params.toString();
  return qs ? `/admin?${qs}` : '/admin';
}

/**
 * The navigation intent for picking an entry inside a section.
 *
 * Selecting must NEVER change the section: hard-coding the Values editor here
 * is what bounced people out of the WIKI editor on every click (and made a
 * created unit impossible to edit). The only default is on the Dashboard,
 * where clicking a unit obviously means "open it in the Values editor".
 */
export function selectionPatch(view, selection) {
  const target = view === 'dashboard' ? 'values' : view;
  return { view: target, selection, tool: undefined };
}

/**
 * @param {object}   [options]
 * @param {string}   [options.pathname]  window.location.pathname (injected for tests)
 * @param {Function} [options.canView]   gate: (viewId) => boolean; blocked views
 *                                       resolve to the dashboard
 * @param {Function} [options.onNavigate] href => void; overrides router nav
 */
export function useAdminNav(options = {}) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { pathname, canView = () => true, onNavigate } = options;
  const search = searchParams.toString();

  const view = useMemo(() => {
    const next = parseAdminLocation({ pathname, search });
    return canView(next) ? next : 'dashboard';
  }, [pathname, search, canView]);

  const tool = useMemo(() => {
    if (view === 'values' || view === 'wiki') {
      const requested = searchParams.get('tool');
      if (requested === 'values' || requested === 'wiki') return requested;
      return view;
    }
    if (view === 'maps' || view === 'crates') return view;
    return null;
  }, [view, searchParams]);

  const selectionKey = selectionKeyFor(view);
  // `unit` is shared by the Values and WIKI editors (same slug space), so a
  // selection written from either one survives the flip between them.
  const selection = selectionKey
    ? searchParams.get(selectionKey) || (selectionKey === 'unit' ? searchParams.get('wiki-unit') : null) || null
    : null;

  const createTab = useMemo(() => {
    const requested = searchParams.get('tab');
    return CREATE_TABS.some((tab) => tab.id === requested) ? requested : 'unit';
  }, [searchParams]);

  const go = useCallback(
    (patch = {}) => {
      const href = buildAdminHref(patch);
      if (onNavigate) { onNavigate(href); return; }
      navigate(href, { replace: !!patch.replace });
    },
    [navigate, onNavigate]
  );

  const items = useMemo(() => ADMIN_VIEWS.filter((item) => canView(item.id)), [canView]);
  const railItems = useMemo(() => buildRailItems(canView), [canView]);

  return {
    view,
    tool,
    selection,
    createTab,
    items,
    railItems,
    railActive: railKeyForView(view),
    canView,
    go,
    selectView: useCallback(
      (id) => go({ view: RAIL_GROUPS[id] ? primaryViewForRail(id, canView) : id }),
      [go, canView]
    ),
    selectTool: useCallback((nextTool) => go({ view: nextTool, tool: nextTool }), [go]),
    selectEntry: useCallback((slug, atView) => go({ view: atView || view, selection: slug }), [go, view]),
    selectCreateTab: useCallback((tab) => go({ view: 'create', tab }), [go]),
    /** The toolbar for the current section, or null when there is none. */
    tools: view === 'values' || view === 'wiki' ? EDITOR_TOOLS : view === 'maps' || view === 'crates' ? CONTENT_TOOLS : null,
  };
}

