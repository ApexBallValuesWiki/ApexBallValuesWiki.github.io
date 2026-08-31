// Test-only render harness: mounts useAdminNav inside a real Router so the
// hook's URL <-> state contract is exercised exactly as the browser runs it.
// (React escapes SSR text, so results are collected by mutation instead of
// parsed back out of the markup.)
import { renderToString } from 'react-dom/server';
import { createElement as h } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { useAdminNav } from './adminNav';

function Harness({ pathname, canView, out, onNavigate }) {
  const nav = useAdminNav({ pathname, canView, onNavigate });
  nav.selectView('wiki');
  nav.selectTool('values');
  nav.selectEntry('gloomy');
  nav.selectCreateTab('map');
  out.view = nav.view;
  out.tool = nav.tool;
  out.selection = nav.selection;
  out.createTab = nav.createTab;
  out.tools = nav.tools?.map((t) => t.id) ?? null;
  out.items = nav.items.map((i) => i.id);
  return h('div', null, 'ok');
}

export function renderNavAt(href, { canView } = {}) {
  const out = {};
  const hrefs = [];
  renderToString(
    h(MemoryRouter, { initialEntries: [href] }, h(Harness, { pathname: href, canView, out, onNavigate: (next) => hrefs.push(next) }))
  );
  return { state: out, hrefs };
}
