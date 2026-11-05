#!/usr/bin/env node
// ROUTE MANIFEST — one source of truth for BOTH the prerendered HTML pages
// and their Open Graph link images.
//
// Every public route gets its OWN monochrome card file. Previously only the
// home page, the calculator and unit detail pages had a dedicated image;
// /wiki, /values, legal pages, minigames, rarity lists and item pages all
// reused default.png, so their embeds looked identical when shared.
//
// prerender-core.mjs uses this list to write <meta property="og:image">.
// social-cards-core.mjs uses the SAME list to render the PNGs, so a route can
// never point at a card that does not exist.
import { createHash } from 'node:crypto';

import { ALL_UNITS } from '../../src/data/units.js';
import { UNIT_RARITIES } from '../../src/data/taxonomy.js';
import { ITEM_GROUPS } from '../../src/data/items.js';

export const SITE_NAME = 'Apex WIKI & Values';
export const DEFAULT_DESCRIPTION =
  'Apex WIKI & Values — the complete companion for Ball Tower Defense by Cash Grab Studios $$$$. Unit database, live trade values, and trade calculator.';

const WINDOWS_ILLEGAL = /[<>:"\\|?*]/;
export const enc = encodeURIComponent;

export function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Stable, filesystem-safe card name derived from the route path. */
export function cardNameForPath(path) {
  if (path === '/') return 'default.png';
  if (path === '/values/calculator') return 'trade-calculator.png';
  return `page-${createHash('sha1').update(path).digest('hex').slice(0, 12)}.png`;
}

/* ------------------------------------------------------------------ */
/* Route list                                                          */
/* ------------------------------------------------------------------ */
export function buildRouteManifest() {
  const routes = [];
  const seen = new Set();

  function addRoute(path, meta) {
    if (seen.has(path)) return;
    seen.add(path);
    routes.push({
      path,
      title: meta.title,
      description: meta.description || DEFAULT_DESCRIPTION,
      image: meta.image || cardNameForPath(path),
      type: meta.type || 'website',
      priority: meta.priority || '0.6',
      prerenderBody: meta.prerenderBody || null,
      fsPathOk: !WINDOWS_ILLEGAL.test(path),
    });
  }

  // Core pages
  addRoute('/', { title: `${SITE_NAME} — Ball Tower Defense`, description: DEFAULT_DESCRIPTION, priority: '1.0' });
  addRoute('/minigames', { title: 'Minigames — Ball TD arcade', priority: '0.7' });
  addRoute('/minigames/ball-knowledge', { title: 'Ball Knowledge — daily reset tracker', priority: '0.5' });
  addRoute('/minigames/ballonomics', { title: 'Ballonomics — higher or lower values game', priority: '0.5' });
  addRoute('/minigames/balling', { title: 'Balling — pixel reveal guessing game', priority: '0.5' });
  addRoute('/about', { title: 'About — Apex WIKI & Values', description: 'Who runs Apex WIKI & Values, what the site contains, how it handles data, and how to contact the operator.', priority: '0.5' });
  addRoute('/contact', { title: 'Contact — Apex WIKI & Values', description: 'Contact the operator of Apex WIKI & Values for privacy, parental, copyright, removal and correction requests.', priority: '0.5' });
  addRoute('/credits', { title: 'Credits', priority: '0.3' });
  addRoute('/privacy', { title: 'Privacy & Storage', priority: '0.3' });
  addRoute('/terms', { title: 'Terms of Use', priority: '0.3' });
  addRoute('/cookies', { title: 'Cookie & Storage Notice', priority: '0.3' });
  addRoute('/disclaimer', { title: 'Fan-Content & IP Disclaimer', priority: '0.3' });
  addRoute('/changelog', { title: "What's new — Changelog", priority: '0.4' });
  addRoute('/invite', { title: 'Team invite — APEX WIKI & Values', priority: '0.1' });
  addRoute('/values/afford', { title: 'What can I afford? — APEX Values', priority: '0.6' });
  addRoute('/wiki', { title: 'WIKI — Ball Tower Defense database', priority: '0.9' });
  addRoute('/wiki/compare', { title: 'Compare Units', priority: '0.5' });
  addRoute('/wiki/units', { title: 'Units', priority: '0.7' });
  addRoute('/wiki/units/search', { title: 'Search Units', priority: '0.4' });
  addRoute('/wiki/items', { title: 'Items', priority: '0.6' });
  addRoute('/bug-report', { title: 'Report a Bug', priority: '0.3' });
  addRoute('/values', { title: 'Trade Values — live Ball TD values', priority: '0.9' });
  addRoute('/values/units', { title: 'Unit Values', priority: '0.7' });
  addRoute('/values/units/search', { title: 'Search Values', priority: '0.4' });
  addRoute('/values/calculator', {
    title: 'Trade Calculator',
    description: 'Value totals, overpay check and shareable trade links for Ball Tower Defense trades.',
    priority: '0.7',
  });

  // Unit rarity + detail pages (both WIKI and Values sides)
  for (const rarity of UNIT_RARITIES) {
    addRoute(`/wiki/units/${enc(rarity)}`, { title: `${rarity} Units — WIKI`, priority: '0.6' });
    addRoute(`/values/units/${enc(rarity)}`, { title: `${rarity} Unit Values`, priority: '0.6' });
  }

  for (const unit of ALL_UNITS) {
    const description =
      `${unit.name} is a ${unit.rarity}${unit.type ? ` ${unit.type}` : ''} unit in Ball Tower Defense. ` +
      `Full stats, upgrade costs, and how to obtain — on ${SITE_NAME}.`;
    const body = [
      `<h1>${esc(unit.name)}</h1>`,
      `<p>${esc(description)}</p>`,
      unit.placementLimit ? `<p>Placement limit: ${esc(unit.placementLimit)}.</p>` : '',
      unit.totalCost ? `<p>Total cost: ${esc(unit.totalCost)}.</p>` : '',
    ].filter(Boolean).join('\n      ');
    addRoute(`/wiki/units/${enc(unit.rarity)}/${enc(unit.slug)}`, {
      title: `${unit.name} (${unit.rarity}) — Ball TD WIKI`,
      description,
      image: `unit-${unit.slug}.png`,
      type: 'article',
      priority: '0.8',
      prerenderBody: body,
    });
    const valueBody = [
      `<h1>${esc(unit.name)} — trade value</h1>`,
      `<p>Live trade value, demand, trend and gem/coin ratio for ${esc(unit.name)} (${esc(unit.rarity)}) on ${esc(SITE_NAME)}.</p>`,
      `<p>Values on this site are community-observed opinions, not official prices. They change over time, are not financial advice, and we do not buy, sell, broker or guarantee any in-game item.</p>`,
    ].join('\n      ');
    addRoute(`/values/units/${enc(unit.rarity)}/${enc(unit.slug)}`, {
      title: `${unit.name} Value — live trade value`,
      description: `Live trade value, demand, trend and gem/coin ratio for ${unit.name} (${unit.rarity}) on ${SITE_NAME}.`,
      image: `unit-value-${unit.slug}.png`,
      type: 'article',
      priority: '0.8',
      prerenderBody: valueBody,
    });
  }

  // Items
  for (const [group, items] of Object.entries(ITEM_GROUPS)) {
    addRoute(`/wiki/items/${enc(group)}`, { title: `${group} — Items`, priority: '0.6' });
    for (const item of items) {
      addRoute(`/wiki/items/${enc(group)}/${enc(item.slug)}`, {
        title: `${item.name} — ${group}`,
        description: `${item.name} (${group}) in Ball Tower Defense — details on ${SITE_NAME}.`,
        type: 'article',
        priority: '0.7',
      });
    }
  }

  return routes;
}

/* ------------------------------------------------------------------ */
/* Card copy: plain, human, section-specific                          */
/* ------------------------------------------------------------------ */
const SECTIONS = {
  wiki: {
    label: 'WIKI', subtitle: 'Unit stats, upgrades and how to get them.',
    strip: ['STATS', 'UPGRADES', 'HOW TO GET'], emblem: 'kingball.png',
  },
  values: {
    label: 'VALUES', subtitle: 'Live trade values, demand and scarcity.',
    strip: ['VALUE', 'DEMAND', 'RARITY'], emblem: 'hephaestusball.png',
  },
  minigames: {
    label: 'MINIGAMES', subtitle: 'Small games for Ball Tower Defense.',
    strip: ['PLAY', 'SCORES', 'DAILY'], emblem: 'partyman.png',
  },
  info: {
    label: 'SITE INFO', subtitle: 'Plain-language site information.',
    strip: ['ABOUT', 'CONTACT', 'LEGAL'], emblem: 'brainball.png',
  },
};

function shortTitle(route) {
  const raw = String(route.title || '');
  const head = raw.split(/\s+[—–]\s+/)[0].trim();
  return head || raw;
}

/** Everything the SVG renderer needs to make THIS page's own card. */
export function cardSpecFor(route, index = 0) {
  const path = route.path;
  const parts = path.split('/').filter(Boolean).map((p) => {
    try { return decodeURIComponent(p); } catch { return p; }
  });
  const root = parts[0] || '';
  const wikiUnit = /^\/wiki\/units\/[^/]+\/[^/]+$/.test(path);
  const valueUnit = /^\/values\/units\/[^/]+\/[^/]+$/.test(path);
  const slug = wikiUnit || valueUnit ? parts[parts.length - 1] : null;
  const unit = slug ? ALL_UNITS.find((u) => u.slug === slug) || null : null;

  let section = SECTIONS.info;
  if (root === 'wiki') section = parts[1] === 'items'
    ? { ...SECTIONS.wiki, emblem: 'mummyball.png' }
    : SECTIONS.wiki;
  else if (root === 'values') section = SECTIONS.values;
  else if (root === 'minigames') section = SECTIONS.minigames;

  let eyebrow = section.label;
  if (parts.length >= 2) {
    if (wikiUnit || valueUnit) eyebrow = valueUnit ? 'VALUES / UNIT FILE' : 'WIKI / UNIT FILE';
    else if (root === 'wiki' && parts[1] === 'units' && parts.length === 3) eyebrow = 'WIKI / RARITY';
    else if (root === 'values' && parts[1] === 'units' && parts.length === 3) eyebrow = 'VALUES / RARITY';
    else if (root === 'wiki' && parts[1] === 'items' && parts.length === 3) eyebrow = 'WIKI / ITEM FILE';
    else if (parts[1] === 'search') eyebrow = `${root.toUpperCase()} / SEARCH`;
    else eyebrow = `${section.label} / ${parts[parts.length - 1].toUpperCase()}`;
  }

  const kind = path === '/' ? 'home'
    : path === '/values/calculator' ? 'calculator'
      : (wikiUnit || valueUnit) ? 'unit' : 'page';

  return {
    kind,
    index: index + 1,
    fileName: route.image,
    title: unit ? unit.name : shortTitle(route),
    subtitle: section.subtitle,
    strip: section.strip,
    eyebrow,
    emblem: section.emblem,
    pathLabel: `apexballvalueswiki.github.io${path === '/' ? '' : path}`,
    side: valueUnit ? 'VALUES' : 'WIKI',
    unit,
  };
}
