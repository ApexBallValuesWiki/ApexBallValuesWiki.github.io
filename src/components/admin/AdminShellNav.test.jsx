import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { DataProvider } from '../../context/DataContext';
import { AdminNavRail, AdminShellNav, isAdminViewVisible } from './AdminShellNav';
import { buildRailItems, primaryViewForRail } from './adminNav';
import { WikiEditor, ContentEditor } from './AdminParts';

// The nav rewrite shipped a selection regression that no pure-function test
// caught, so the surfaces themselves get rendered here: what the admin can
// actually click is asserted, not just what the model says.

const noop = () => {};

// EditorTitle -> UnitIcon reads the data context, so editors cannot be
// rendered bare (this threw `useData must be used within a <DataProvider>`).
const inApp = (node) => (
  <MemoryRouter initialEntries={['/admin?view=wiki']}>
    <DataProvider>{node}</DataProvider>
  </MemoryRouter>
);

describe('admin nav surfaces', () => {
  it('renders one button per group — the editors are not duplicated', () => {
    const html = renderToString(
      <AdminShellNav items={buildRailItems()} active="units" onSelect={noop} />
    );
    expect(html).toContain('Units');
    expect(html).toContain('Dashboard');
    // The exact complaint: a "Values Editor" rail button next to a "Values" tab
    // for the same screen.
    expect(html).not.toContain('Values Editor');
    expect(html).not.toContain('WIKI Editor');
    expect(html).not.toContain('Maps &amp; Crates&lt;/span&gt;&lt;span');
    expect(html).toContain('Maps &amp; Crates');
    // both surfaces (rail + phone bar) must carry the same labels
    expect(html.split('admin-nav-item').length - 1).toBe(buildRailItems().length * 2);
  });

  it('never dead-ends a role that can open only half of a group', () => {
    // Real case: `editor` holds VALUES but not WIKI, so the group is entered
    // through the half they do have.
    const canView = (id) => isAdminViewVisible(id, { role: 'editor', valueAllowed: true, wikiAllowed: false });
    const units = buildRailItems(canView).find((i) => i.key === 'units');
    expect(units).toBeDefined();
    expect(units.view).toBe('values');
    // The gate treats Values as reachable for either capability (the two
    // editors share a screen), so a WIKI-only role still gets a working button
    // rather than a rail with no way into the editor at all.
    const wikiOnly = buildRailItems((id) => isAdminViewVisible(id, { role: 'custom', valueAllowed: false, wikiAllowed: true }));
    expect(wikiOnly.map((i) => i.key)).toContain('units');
  });
  it('marks the group active while a tab inside it is open', () => {
    const html = renderToString(
      <AdminNavRail items={buildRailItems()} active="units" onSelect={noop} orientation="vertical" />
    );
    expect(html).toContain('data-active="true"');
    expect(html.indexOf('data-active="true"')).toBeLessThan(html.indexOf('Create'));
  });

  it('keeps role gating on the group, not the tab', () => {
    const owner = buildRailItems((id) => isAdminViewVisible(id, { role: 'owner', valueAllowed: true, wikiAllowed: true }));
    const valuesOnly = buildRailItems((id) => isAdminViewVisible(id, { role: 'editor', valueAllowed: true, wikiAllowed: false }));
    expect(owner.map((i) => i.key)).toContain('announcements');
    expect(owner.map((i) => i.key)).toContain('maps-crates');
    expect(valuesOnly.map((i) => i.key)).not.toContain('announcements');
    expect(valuesOnly.map((i) => i.key)).not.toContain('create');
    expect(valuesOnly.map((i) => i.key)).toContain('units');
    // ...and the button it shows is the one half of the group they can use
    expect(valuesOnly.find((i) => i.key === 'units').view).toBe('values');
  });
});

describe('unit / content image editors', () => {
  it('shows the saved image and lets the admin override or drop it', () => {
    const html = renderToString(inApp(
      <WikiEditor
        unit={{ slug: 'gloomy', name: 'Gloomy', rarity: 'Normie', type: 'DPS' }}
        form={{ imageUrl: 'data:image/webp;base64,AAA', obtainText: '', upgradeForms: [] }}
        updateField={noop}
        setImageFile={noop}
        saveWiki={noop}
        resetWiki={noop}
        refresh={noop}
      />
    ));
    // The stored picture is on screen while you edit, not only after a reload.
    expect(html).toContain('class="admin-image-preview"');
    expect(html).toContain('src="data:image/webp;base64,AAA"');
    expect(html).toContain('Image URL (or paste a link instead of uploading)');
    // no pending pick -> nothing to discard
    expect(html).not.toContain('Discard picked image');
  });

  it('reveals the discard control only while a new pick is pending', () => {
    const html = renderToString(inApp(
      <WikiEditor
        unit={{ slug: 'gloomy', name: 'Gloomy', rarity: 'Normie', type: 'DPS' }}
        form={{ imageUrl: 'data:image/webp;base64,AAA', obtainText: '', upgradeForms: [] }}
        imageFile={{ name: 'render.png', type: 'image/png' }}
        setImageFile={noop}
        updateField={noop}
        saveWiki={noop}
        resetWiki={noop}
        refresh={noop}
      />
    ));
    expect(html).toContain('Discard picked image');
  });
  it('does the same for maps and crates', () => {
    const html = renderToString(inApp(
      <ContentEditor
        kind="maps"
        item={{ slug: 'farm', name: 'Farm' }}
        form={{ imageUrl: '', chancesText: '' }}
        setForm={() => {}}
        imageFile={{ name: 'x.png', type: 'image/png' }}
        setImageFile={noop}
        onSave={noop}
        onReset={noop}
      />
    ));
    expect(html).toContain('Discard picked image');
    expect(html).toContain('Image URL (or paste a link instead of uploading)');
  });
});
