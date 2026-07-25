#!/usr/bin/env node
// ============================================================================
// STATIC PRE-RENDERER + SOCIAL CARD META
// ----------------------------------------------------------------------------
// Runs automatically after `vite build` (see package.json "build").
//
// What it does:
//   1. Emits a real `dist/<route>/index.html` for EVERY public route — every
//      unit, item, map, trait, skin and value page — so GitHub Pages serves
//      clean URLs (no hash, no client redirect) with correct per-page
//      <title>/description/Open Graph/Twitter Card meta, and link previews
//      show the page's social card image.
//   2. Injects a small semantic content summary into #root of unit pages so
//      crawlers see real content (React replaces it on boot).
//   3. Generates dist/sitemap.xml, dist/robots.txt, dist/404.html (SPA
//      fallback for client-only routes like /admin) and dist/.nojekyll.
//
// Config (both are set by the GitHub Actions deploy):
//   VITE_BASE_PATH   e.g. "/apex-td-project/"  (defaults to "/")
//   VITE_SITE_URL    e.g. "https://apexballvalueswiki.github.io" (default below)
import { mkdirSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ALL_UNITS, UNITS_BY_RARITY } from '../../src/data/units.js';
import { UNIT_RARITIES } from '../../src/data/taxonomy.js';
import { ITEM_GROUPS } from '../../src/data/items.js';
import { ALL_MAPS } from '../../src/data/maps.js';
import { ALL_TRAITS } from '../../src/data/traits.js';
import { SKINS_BY_CATEGORY, SHINY_SKINS_BY_CATEGORY } from '../../src/data/skins.js';

const ROOT = process.env.APEX_PROJECT_ROOT || dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const DIST = join(ROOT, 'dist');
const SITE_NAME = 'Apex Values & WIKI';
const BASE_PATH = (process.env.VITE_BASE_PATH || '/').replace(/\/+$/, '');
const SITE_URL = (process.env.VITE_SITE_URL || 'https://zenithvalues.github.io').replace(/\/+$/, '');
const DEFAULT_DESCRIPTION =
  'Apex Values & WIKI — the complete companion for Ball Tower Defense by Cash Grab Studios $$$$. Unit database, live trade values, and trade calculator.';

const WINDOWS_ILLEGAL = /[<>:"\\|?*]/;
const enc = encodeURIComponent;

function absoluteUrl(routePath) {
  return `${SITE_URL}${BASE_PATH}${routePath === '/' ? '/' : routePath}`;
}

function cardUrl(fileName) {
  return `${SITE_URL}${BASE_PATH}/social/${fileName}`;
}

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ---------------------------------------------------------------------------
// Route manifest
// ---------------------------------------------------------------------------

const routes = [];
const seen = new Set();

function addRoute(path, meta) {
  if (seen.has(path)) return;
  seen.add(path);
  routes.push({
    path,
    title: meta.title,
    description: meta.description || DEFAULT_DESCRIPTION,
    image: meta.image || 'default.png',
    type: meta.type || 'website',
    priority: meta.priority || '0.6',
    prerenderBody: meta.prerenderBody || null,
    fsPathOk: !WINDOWS_ILLEGAL.test(path),
  });
}

// Core pages
addRoute('/', { title: `${SITE_NAME} — Ball Tower Defense`, description: DEFAULT_DESCRIPTION, priority: '1.0' });
addRoute('/ball-knowledge', { title: 'Ball Knowledge — daily reset tracker', priority: '0.5' });
addRoute('/credits', { title: 'Credits', priority: '0.3' });
addRoute('/wiki', { title: 'WIKI — Ball Tower Defense database', priority: '0.9' });
addRoute('/wiki/compare', { title: 'Compare Units', priority: '0.5' });
addRoute('/wiki/leaderboards', { title: 'Unit Leaderboards', priority: '0.5' });
addRoute('/wiki/units', { title: 'Units', priority: '0.7' });
addRoute('/wiki/units/search', { title: 'Search Units', priority: '0.4' });
addRoute('/wiki/items', { title: 'Items', priority: '0.6' });
addRoute('/wiki/maps', { title: 'Maps', priority: '0.6' });
addRoute('/wiki/traits', { title: 'Traits', priority: '0.6' });
addRoute('/wiki/skins', { title: 'Skins', priority: '0.6' });
addRoute('/wiki/shiny-skins', { title: 'Shiny Skins', priority: '0.6' });
addRoute('/bug-report', { title: 'Report a Bug', priority: '0.3' });
addRoute('/values', { title: 'Trade Values — live Ball TD values', priority: '0.9' });
addRoute('/values/units', { title: 'Unit Values', priority: '0.7' });
addRoute('/values/units/search', { title: 'Search Values', priority: '0.4' });
addRoute('/values/calculator', { title: 'Trade Calculator', priority: '0.7' });

// Unit rarity + detail pages (both WIKI and Values sides)
for (const rarity of UNIT_RARITIES) {
  const _units = UNITS_BY_RARITY[rarity] || [];
  if (rarity === '???' || rarity === 'Shiny ???') continue; // client-only (see header note)
  addRoute(`/wiki/units/${enc(rarity)}`, { title: `${rarity} Units — WIKI`, priority: '0.6' });
  addRoute(`/values/units/${enc(rarity)}`, { title: `${rarity} Unit Values`, priority: '0.6' });
}

for (const unit of ALL_UNITS) {
  if (unit.rarity.includes('???')) continue;
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
  addRoute(`/values/units/${enc(unit.rarity)}/${enc(unit.slug)}`, {
    title: `${unit.name} Value — live trade value`,
    description: `Live trade value, demand, trend and gem/coin ratio for ${unit.name} (${unit.rarity}) on ${SITE_NAME}.`,
    image: `unit-${unit.slug}.png`,
    type: 'article',
    priority: '0.8',
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

// Maps / Traits
for (const map of ALL_MAPS) {
  addRoute(`/wiki/maps/${enc(map.slug)}`, {
    title: `${map.name} — Map`,
    description: `${map.name} map guide for Ball Tower Defense on ${SITE_NAME}.`,
    type: 'article',
    priority: '0.7',
  });
}
for (const trait of ALL_TRAITS) {
  addRoute(`/wiki/traits/${enc(trait.slug)}`, {
    title: `${trait.name} — Trait`,
    description: `${trait.name} trait guide for Ball Tower Defense on ${SITE_NAME}.`,
    type: 'article',
    priority: '0.7',
  });
}

// Skins + shiny skins
for (const [category, skins] of Object.entries(SKINS_BY_CATEGORY)) {
  addRoute(`/wiki/skins/${enc(category)}`, { title: `${category} Skins`, priority: '0.6' });
  for (const skin of skins) {
    addRoute(`/wiki/skins/${enc(category)}/${enc(skin.slug)}`, {
      title: `${skin.name} — Skin`,
      description: `${skin.name} skin for Ball Tower Defense on ${SITE_NAME}.`,
      type: 'article',
      priority: '0.7',
    });
  }
}
for (const [category, skins] of Object.entries(SHINY_SKINS_BY_CATEGORY)) {
  addRoute(`/wiki/shiny-skins/${enc(category)}`, { title: `${category} Shiny Skins`, priority: '0.6' });
  for (const skin of skins) {
    addRoute(`/wiki/shiny-skins/${enc(category)}/${enc(skin.slug)}`, {
      title: `Shiny ${skin.name} — Skin`,
      description: `Shiny ${skin.name} skin for Ball Tower Defense on ${SITE_NAME}.`,
      type: 'article',
      priority: '0.7',
    });
  }
}

// ---------------------------------------------------------------------------
// HTML template rewriting
// ---------------------------------------------------------------------------

const template = readFileSync(join(DIST, 'index.html'), 'utf8');

function buildHeadBlock(route) {
  const url = absoluteUrl(route.path);
  const image = cardUrl(route.image);
  return [
    `    <link rel="canonical" href="${esc(url)}" />`,
    `    <meta property="og:site_name" content="${esc(SITE_NAME)}" />`,
    `    <meta property="og:type" content="${route.type}" />`,
    `    <meta property="og:url" content="${esc(url)}" />`,
    `    <meta property="og:title" content="${esc(route.title)}" />`,
    `    <meta property="og:description" content="${esc(route.description)}" />`,
    `    <meta property="og:image" content="${esc(image)}" />`,
    `    <meta property="og:image:width" content="1200" />`,
    `    <meta property="og:image:height" content="630" />`,
    `    <meta name="twitter:card" content="summary_large_image" />`,
    `    <meta name="twitter:title" content="${esc(route.title)}" />`,
    `    <meta name="twitter:description" content="${esc(route.description)}" />`,
    `    <meta name="twitter:image" content="${esc(image)}" />`,
  ].join('\n');
}

function renderRoute(route) {
  let html = template;
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${esc(route.title)}</title>`);
  html = html.replace(
    /<meta name="description" content="[^"]*" ?\/>/,
    `<meta name="description" content="${esc(route.description)}" />`
  );
  html = html.replace('</head>', `${buildHeadBlock(route)}\n  </head>`);
  if (route.prerenderBody) {
    html = html.replace(
      '<div id="root"></div>',
      `<div id="root">\n      ${route.prerenderBody}\n    </div>`
    );
  }
  return html;
}

function toFsPath(routePath) {
  // URL-encoded route -> decoded filesystem path so GitHub Pages' decoded
  // file lookup hits a real file (e.g. "Shiny%20Normie" -> "Shiny Normie").
  const decoded = decodeURIComponent(routePath);
  return join(DIST, decoded, 'index.html');
}

let written = 0;
let fallbackOnly = 0;
for (const route of routes) {
  const html = renderRoute(route);
  if (!route.fsPathOk) {
    fallbackOnly += 1;
    continue;
  }
  const target = route.path === '/' ? join(DIST, 'index.html') : toFsPath(route.path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, html);
  written += 1;
}

// SPA fallback + SEO housekeeping
const homeHtml = renderRoute(routes[0]);
writeFileSync(join(DIST, '404.html'), homeHtml);
writeFileSync(join(DIST, '.nojekyll'), '');
writeFileSync(
  join(DIST, 'robots.txt'),
  `User-agent: *\nAllow: /\nDisallow: /admin\n\nSitemap: ${absoluteUrl('/sitemap.xml')}\n`
);
writeFileSync(
  join(DIST, 'sitemap.xml'),
  [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...routes.map(
      (route) =>
        `  <url><loc>${esc(absoluteUrl(route.path))}</loc><changefreq>weekly</changefreq><priority>${route.priority}</priority></url>`
    ),
    '</urlset>',
    '',
  ].join('\n')
);

// Sanity: every card file referenced should exist in dist/social (cards are
// committed under public/, which Vite copies into dist/).
let missingCards = 0;
try {
  const socialFiles = new Set(readdirSync(join(DIST, 'social')));
  for (const route of routes) {
    if (!socialFiles.has(route.image)) missingCards += 1;
  }
} catch {
  missingCards = -1;
}

console.log(`[prerender] wrote ${written} pre-rendered pages (${routes.length} routes${fallbackOnly ? `, ${fallbackOnly} served via 404.html fallback` : ''})`);
if (missingCards > 0) {
  console.warn(`[prerender] WARNING: ${missingCards} routes reference social cards missing from dist/social — run "npm run cards" first.`);
} else if (missingCards === -1) {
  console.warn('[prerender] WARNING: dist/social not found — run "npm run cards" to generate social cards.');
} else {
  console.log('[prerender] all social cards present ✓');
}
