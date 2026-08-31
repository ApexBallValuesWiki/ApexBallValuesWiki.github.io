import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { AuthPanel, AdminMessage, UnitPicker } from '../components/admin/AdminParts';
import ShortcutHelp from '../components/ShortcutHelp';
import { DataProvider } from '../context/DataContext';

// Admin smoke render: the purely presentational admin pieces must render
// without a runtime crash. Born from a real regression (v0e0c8d9): a banner
// component referenced a prop that didn't exist in AuthPanel's scope and
// crashed the whole admin panel at load — invisible to public-route tests.
// Every future admin UI addition should get a line here.
describe('admin parts smoke render', () => {
  it('AuthPanel renders with a message and children', () => {
    const html = renderToString(
      <AuthPanel title="Testing Admin" message="⚠️ Something happened">
        <button type="button">Login</button>
      </AuthPanel>
    );
    expect(html).toContain('Something happened');
    expect(html).toContain('Testing Admin');
  });

  it('AdminMessage renders with and without a retry action', () => {
    expect(renderToString(<AdminMessage message="plain" />)).toContain('plain');
    const withAction = renderToString(
      <AdminMessage message="failed" action={{ label: '🔄 Try again', run: () => {} }} />
    );
    expect(withAction).toContain('Try again');
    expect(renderToString(<AdminMessage message={null} />)).toBe('');
  });

  it('UnitPicker renders empty, with results, and with recent edits', () => {
    const units = [
      { slug: 'shade-demon', name: 'Shade Demon', rarity: 'Mythic' },
      { slug: 'frost-sentinel', name: 'Frost Sentinel', rarity: 'Legendary' },
    ];
    const base = { query: '', setQuery: () => {}, filter: 'all', setFilter: () => {}, selectUnit: () => {} };
    expect(renderToString(<MemoryRouter><DataProvider><UnitPicker {...base} units={[]} total={0} /></DataProvider></MemoryRouter>)).toContain('Units');
    const html = renderToString(
      <MemoryRouter>
        <DataProvider>
          <UnitPicker
            {...base}
            units={units}
            total={2}
            selectedUnit={units[0]}
            recentEdits={[{ slug: 'shade-demon', name: 'Shade Demon', kind: 'values' }]}
            onSelectRecent={() => {}}
          />
        </DataProvider>
      </MemoryRouter>
    );
    expect(html).toContain('Shade Demon');
    expect(html).toContain('Recently edited');
  });

  it('ShortcutHelp renders for visitors and admins', () => {
    const visitor = renderToString(<ShortcutHelp open onClose={() => {}} />);
    expect(visitor).toContain('Keyboard Shortcuts');
    expect(visitor).not.toContain('Admin panel');
    const admin = renderToString(<ShortcutHelp open onClose={() => {}} isAdmin />);
    expect(admin).toContain('Admin panel');
    expect(admin).toContain('Ctrl+S');
  });
});
