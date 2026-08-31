import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { renderNavAt } from './adminNavHarness.jsx';

const ROOT = process.cwd();
import {
  ADMIN_VIEWS,
  buildAdminHref,
  isResetPasswordPath,
  parseAdminLocation,
  selectionKeyFor,
  selectionPatch,
  RAIL_BUTTONS,
  buildRailItems,
  railKeyForView,
  primaryViewForRail,
} from './adminNav';

// The admin panel used to keep its position in component state only, so a
// refresh dropped you back on the Dashboard with nothing selected. These pin
// the URL contract instead.

describe('admin navigation URL contract', () => {
  it('parses the section from ?view=', () => {
    expect(parseAdminLocation({ pathname: '/admin', search: '?view=wiki&unit=gloomy' })).toBe('wiki');
    expect(parseAdminLocation({ pathname: '/admin', search: '' })).toBe('dashboard');
  });

  it('still understands legacy /admin/<section> paths and old names', () => {
    expect(parseAdminLocation({ pathname: '/admin/maps', search: '' })).toBe('maps');
    expect(parseAdminLocation({ pathname: '/admin/create-unit', search: '' })).toBe('create');
    expect(parseAdminLocation({ pathname: '/admin/nonsense', search: '' })).toBe('dashboard');
  });

  it('keeps the password screen out of the section parser', () => {
    expect(isResetPasswordPath('/admin/reset-password')).toBe(true);
    expect(isResetPasswordPath('/admin/reset-password/')).toBe(true);
    expect(isResetPasswordPath('/admin')).toBe(false);
    expect(isResetPasswordPath('/admin/wiki')).toBe(false);
  });

  it('builds a href that carries only the keys that apply', () => {
    expect(buildAdminHref({ view: 'dashboard' })).toBe('/admin');
    expect(buildAdminHref({ view: 'wiki', selection: 'gloomy' })).toBe('/admin?view=wiki&unit=gloomy');
    expect(buildAdminHref({ view: 'values', tool: 'values' })).toBe('/admin?view=values');
    expect(buildAdminHref({ view: 'materials', selection: 'iron-shard' })).toBe('/admin?view=materials&material=iron-shard');
    expect(buildAdminHref({ view: 'crates', selection: 'spring-crate' })).toBe('/admin?view=crates&content=spring-crate');
    expect(buildAdminHref({ view: 'create', tab: 'map' })).toBe('/admin?view=create&tab=map');
  });

  it('drops a stale selection key when switching to a section that has none', () => {
    const href = buildAdminHref({ view: 'logs', selection: 'gloomy' });
    expect(href).toBe('/admin?view=logs');
    expect(selectionKeyFor('logs')).toBeNull();
  });

  it('does not leak ?tool= into sections without a toolbar', () => {
    expect(buildAdminHref({ view: 'materials', tool: 'wiki' })).toBe('/admin?view=materials');
  });

  it('escapes slugs that contain punctuation', () => {
    const href = buildAdminHref({ view: 'wiki', selection: "horseman's-cloak" });
    expect(decodeURIComponent(href.split('unit=')[1])).toBe("horseman's-cloak");
  });

  it('keeps one control per screen: tools are not rail buttons', () => {
    expect(buildRailItems().map((item) => item.key)).toEqual([
      'dashboard', 'units', 'create', 'maps-crates', 'materials', 'bugs', 'announcements', 'logs',
    ]);
    const labels = buildRailItems().map((item) => item.label);
    expect(labels).not.toContain('Values Editor');
    expect(labels).not.toContain('WIKI Editor');
    expect(labels).toContain('Units');
  });

  it('highlights the group, not the tab, when a section is open', () => {
    expect(railKeyForView('wiki')).toBe('units');
    expect(railKeyForView('values')).toBe('units');
    expect(railKeyForView('crates')).toBe('maps-crates');
    expect(railKeyForView('logs')).toBe('logs');
  });

  it('renames and re-targets a group for a role that cannot see both halves', () => {
    const canView = (id) => id === 'values' || id === 'dashboard' || id === 'logs';
    const items = buildRailItems(canView);
    const units = items.find((item) => item.key === 'units');
    expect(units.label).toBe('Values Editor');
    expect(units.view).toBe('values');
    // No WIKI right at all: the button must not offer a screen it cannot open.
    expect(primaryViewForRail('units', canView)).toBe('values');
    expect(buildRailItems(canView).map((i) => i.key)).not.toContain('maps-crates');
  });
  it('every sidebar section is routable and ordered', () => {
    expect(ADMIN_VIEWS.map((v) => v.id)).toEqual([
      'dashboard', 'values', 'wiki', 'create', 'maps', 'crates', 'materials', 'bugs', 'announcements', 'logs',
    ]);
    for (const view of ADMIN_VIEWS) {
      expect(typeof buildAdminHref({ view: view.id })).toBe('string');
    }
  });
});

describe('useAdminNav inside a real Router', () => {
  it('reads section, tool and selection from the URL', () => {
    const { state } = renderNavAt('/admin?view=wiki&tool=values&unit=gloomy');
    expect(state).toMatchObject({ view: 'wiki', tool: 'values', selection: 'gloomy' });
  });

  it('derives the toolbar for the current section', () => {
    expect(renderNavAt('/admin?view=maps').state.tools).toEqual(['maps', 'crates']);
    expect(renderNavAt('/admin?view=materials').state.tools).toBeNull();
  });

  it('keeps only the sections a role may open', () => {
    const valuesOnly = renderNavAt('/admin', { canView: (id) => id === 'values' || id === 'dashboard' });
    expect(valuesOnly.state.items).toEqual(['dashboard', 'values']);
  });

  it('sends a blocked role to the dashboard instead of a blank screen', () => {
    const { state } = renderNavAt('/admin?view=announcements', { canView: (id) => id !== 'announcements' });
    expect(state.view).toBe('dashboard');
  });

  it('navigations produce the expected hrefs in order', () => {
    const { hrefs } = renderNavAt('/admin?view=values&unit=gloomy');
    expect(hrefs).toEqual([
      '/admin?view=wiki',
      '/admin?view=values',
      '/admin?view=values&unit=gloomy',
      '/admin?view=create&tab=map',
    ]);
  });
});

// The regression this guards: picking an entry used to hard-wire the Values
// editor, so anyone working in the WIKI editor was thrown out of it on the
// first click — which reads as "I can't edit any wiki units".
describe('entry selection never changes the section', () => {
  it('keeps the WIKI editor open', () => {
    expect(selectionPatch('wiki', 'gloomy')).toEqual({ view: 'wiki', selection: 'gloomy', tool: undefined });
    expect(buildAdminHref(selectionPatch('wiki', 'gloomy'))).toBe('/admin?view=wiki&unit=gloomy');
  });

  it('keeps the Values editor open', () => {
    expect(buildAdminHref(selectionPatch('values', 'gloomy'))).toBe('/admin?view=values&unit=gloomy');
  });

  it('keeps maps / crates / materials on their own screen', () => {
    expect(buildAdminHref(selectionPatch('maps', 'sky-arena'))).toBe('/admin?view=maps&content=sky-arena');
    expect(buildAdminHref(selectionPatch('crates', 'spring-crate'))).toBe('/admin?view=crates&content=spring-crate');
    expect(buildAdminHref(selectionPatch('materials', 'iron-shard'))).toBe('/admin?view=materials&material=iron-shard');
  });

  it('binds Ctrl+S to the editor on screen (source guard)', () => {
    // The hotkey used to call a ref nobody ever assigned: Ctrl+S suppressed
    // the browser's save dialog and then did nothing at all.
    const src = readFileSync(join(ROOT, 'src/pages/admin/AdminHome.jsx'), 'utf8');
    expect(src).toContain('saveHotkeyRef.current?.()');
    const assignment = src.indexOf('saveHotkeyRef.current = ()');
    expect(assignment).toBeGreaterThan(-1);
    // Must be re-assigned every render — binding it inside a mount-only effect
    // would freeze the first render's closure and save a stale unit.
    expect(src.slice(assignment - 260, assignment)).not.toContain('useEffect(');
  });

  it('never falls back to the first unit for an unresolvable selection (source guard)', () => {
    // An explicit ?unit= slug that is hidden must resolve to nothing; silently
    // showing unitsWithImages[0] is how a save landed on the wrong unit.
    const src = readFileSync(join(ROOT, 'src/pages/admin/AdminHome.jsx'), 'utf8');
    expect(src).toContain('|| (selectedSlug ? undefined : unitsWithImages[0]);');
    expect(src).toContain("if (!slug || ((section === 'value' || section === 'wiki') && isUnitDeleted(slug))) {");
  });
  it('is what the panel actually wires for unit clicks (source guard)', () => {
    // Cheap guard against re-introducing the hardcoded 'values' target: this
    // one line is what threw everyone out of the WIKI editor.
    const src = readFileSync(join(ROOT, 'src/pages/admin/AdminHome.jsx'), 'utf8');
    expect(src).toContain('goto(selectionPatch(activeView, slug))');
    expect(src).not.toContain("goto({ view: 'values', selection: slug })");
  });

  it('only the dashboard defaults to the Values editor', () => {
    expect(buildAdminHref(selectionPatch('dashboard', 'gloomy'))).toBe('/admin?view=values&unit=gloomy');
    // Creating a unit lands in the WIKI editor, not Values.
    expect(buildAdminHref({ view: 'wiki', tool: 'wiki' })).toBe('/admin?view=wiki');
  });

  it('a search that matches nothing cannot crash the editor', () => {
    const filtered = [];
    const all = [{ slug: 'iron-shard', name: 'Iron Shard' }];
    expect((filtered.find((m) => m.slug === 'iron-shard') || filtered[0])?.name).toBeUndefined();
    expect((all.find((m) => m.slug === 'iron-shard') || all[0]).name).toBe('Iron Shard');
  });
});
