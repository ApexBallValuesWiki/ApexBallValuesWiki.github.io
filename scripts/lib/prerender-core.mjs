#!/usr/bin/env node
// STATIC PRE-RENDERER + SOCIAL CARD META — runs after `vite build`.
// Emits dist/<route>/index.html for every public route (clean URLs with
// per-page title/OG/Twitter meta and social card images), a semantic content
// summary for crawlers, plus sitemap.xml, robots.txt, 404.html and .nojekyll.
//
// Config (both are set by the GitHub Actions deploy):
//   VITE_BASE_PATH   e.g. "/apex-td-project/"  (defaults to "/")
//   VITE_SITE_URL    e.g. "https://apexballvalueswiki.github.io" (default below)
import { mkdirSync, readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { UNIT_RARITIES } from '../../src/data/taxonomy.js';
import { ITEM_GROUPS } from '../../src/data/items.js';
import { buildStaticBody } from './static-content.mjs';
import { buildRouteManifest, SITE_NAME, esc } from './route-manifest.mjs';

const ROOT = process.env.APEX_PROJECT_ROOT || dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const DIST = join(ROOT, 'dist');
const BASE_PATH = (process.env.VITE_BASE_PATH || '/').replace(/\/+$/, '');
const SITE_URL_RAW = (process.env.VITE_SITE_URL || 'https://apexballvalueswiki.github.io').replace(/\/+$/, '');
// SITE_URL must be the ORIGIN only. If a deploy script passes the full
// project-site URL, strip the base path so canonical/OG/sitemap URLs are not
// doubled (/Apex-Ball-TD-WIKI/Apex-Ball-TD-WIKI/...).
const SITE_URL = BASE_PATH && SITE_URL_RAW.endsWith(BASE_PATH)
  ? SITE_URL_RAW.slice(0, -BASE_PATH.length)
  : SITE_URL_RAW;
// User/org pages sites have BASE_PATH="" (public production); project sites
// have a non-empty subfolder (the restricted Test Realm).
const IS_TEST_REALM = Boolean(BASE_PATH);
function absoluteUrl(routePath) {
  return `${SITE_URL}${BASE_PATH}${routePath === '/' ? '/' : routePath}`;
}

// Discord / X / WhatsApp cache embeds by URL. A card whose filename never
// changes keeps showing the OLD cached image even after a redeploy. Hashing
// the generated card set gives every deploy a fresh, stable URL, so all
// per-page previews refresh as soon as the new build goes live.
function cardSetVersion() {
  try {
    const dir = join(DIST, 'social');
    const hash = createHash('sha1');
    for (const name of readdirSync(dir).sort()) {
      hash.update(name).update(':').update(String(statSync(join(dir, name)).size)).update(';');
    }
    return hash.digest('hex').slice(0, 10);
  } catch {
    return '1';
  }
}
const CARD_VERSION = cardSetVersion();
function cardUrl(fileName) {
  return `${SITE_URL}${BASE_PATH}/social/${fileName}?v=${CARD_VERSION}`;
}

// Route manifest (shared with the social-card generator so EVERY
// prerendered page points at its own generated OG image).
const routes = buildRouteManifest();

// HTML template rewriting

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
    // The Test Realm is a private staging area, not a public mirror. Without
    // this, Google indexes duplicate content from the staging project site.
    ...(IS_TEST_REALM ? ['    <meta name="robots" content="noindex,nofollow" />'] : []),
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
  // EVERY page gets a genuine, readable HTML snapshot inside #root. React's
  // createRoot() replaces it on boot, so a crawler that never runs JavaScript
  // still sees the real page content instead of an empty div.
  const staticCtx = {
    esc,
    basePath: BASE_PATH,
    rarities: UNIT_RARITIES,
    itemGroups: Object.keys(ITEM_GROUPS),
  };
  html = html.replace(
    '<div id="root"></div>',
    `<div id="root">\n      ${buildStaticBody(route, staticCtx)}\n    </div>`
  );
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
// 404.html = the SPA shell (not a copy of Home): GitHub Pages serves it at
// the unknown URL, the router boots there, and the wildcard route renders
// the real NotFound page with the visitor's original path shown.
const notFoundRoute = {
  path: '/404',
  title: 'Page not found',
  description: 'This page does not exist. Use the links below to get back to the Apex WIKI & Values home page, WIKI or trade values.',
};
const shellHtml = template
  .replace(/<title>[^<]*<\/title>/, '<title>Page not found | ' + SITE_NAME + '</title>')
  .replace('</head>', IS_TEST_REALM ? '  <meta name="robots" content="noindex,nofollow" />\n  </head>' : '</head>')
  .replace('<div id="root"></div>', `<div id="root">\n      ${buildStaticBody(notFoundRoute, { esc, basePath: BASE_PATH, rarities: UNIT_RARITIES, itemGroups: Object.keys(ITEM_GROUPS) })}\n    </div>`);
writeFileSync(join(DIST, '404.html'), shellHtml);
writeFileSync(join(DIST, '.nojekyll'), '');
writeFileSync(
  join(DIST, 'robots.txt'),
  IS_TEST_REALM
    ? 'User-agent: *\nDisallow: /\n'
    : `User-agent: *\nAllow: /\nDisallow: /admin\n\nSitemap: ${absoluteUrl('/sitemap.xml')}\n`
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
