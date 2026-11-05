#!/usr/bin/env node
// SOCIAL CARD GENERATOR — MONOCHROME EDITION
//
// Generates 1200x630 Open Graph images into public/social/ (Vite copies
// public/ into dist/, so the deploy needs no native deps). Re-run with:
//
//   npm run cards
//
// Design system: pure black / white / grey. Every card is forced through a
// greyscale pass at write time, so no accent colour can leak into an embed.
// Unit art is converted to high-contrast black & white before embedding.
// Requires the devDependency `sharp`.
//
// ONE card per public route (the shared route manifest is the source of
// truth): default.png for /, trade-calculator.png for the calculator,
// unit-<slug>.png / unit-value-<slug>.png for unit pages, and a unique
// page-<hash>.png for every other WIKI, Values, minigame, item, rarity and
// legal page. Every card is pure black / white / grey Billboard.
//
// Set APEX_CARDS_PREVIEW_DIR to render a small sample instead of every card.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildRouteManifest, cardSpecFor } from './route-manifest.mjs';

const ROOT = process.env.APEX_PROJECT_ROOT || dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const OUT_DIR = join(ROOT, 'public', 'social');
const UNIT_ASSETS = join(ROOT, 'src', 'assets', 'units');
const PROVIDED_ASSETS = join(UNIT_ASSETS, 'provided');
const LOGO_PATH = join(ROOT, 'src', 'assets', 'apex-values-wiki-logo.png');
const OVERRIDES_PATH = join(ROOT, 'public', 'overrides', 'staticOverrides.json');
const SITE_URL = 'apexballvalueswiki.github.io';

let sharp;
try {
  sharp = (await import('sharp')).default;
} catch {
  console.error('[cards] This script needs the "sharp" devDependency. Run: npm install');
  process.exit(1);
}

const W = 1200;
const H = 630;
// DejaVu is present on Ubuntu/GitHub Actions and in this build sandbox, so the
// heavy wordmark renders identically in CI and locally; Arial is the fallback.
const SANS = 'DejaVu Sans, Liberation Sans, Arial, sans-serif';
const MONO = 'DejaVu Sans Mono, Liberation Mono, monospace';

function escXml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Cached high-contrast black & white conversion of an art asset. */
// The published WIKI bundle holds the REAL in-game unit icons (313 of the 321
// units) as WebP data URIs. The old generator ignored them and only looked at
// nine bundled PNGs, so almost every per-unit link image had no artwork at all.
const WIKI_IMAGES = (() => {
  try {
    const rows = JSON.parse(readFileSync(OVERRIDES_PATH, 'utf8'))?.wikiOverrides || {};
    const map = new Map();
    for (const [slug, row] of Object.entries(rows)) {
      const url = row?.image_url || row?.imageUrl || row?.image;
      // Most rows embed a WebP data URI; 17 rows point at a file in
      // public/images/units/. Both are real in-game icons.
      if (typeof url === 'string' && (url.startsWith('data:image/') || url.startsWith('/images/') || url.startsWith('http'))) {
        map.set(slug, url);
      }
    }
    return map;
  } catch {
    return new Map();
  }
})();

const monoCache = new Map();
async function monoUri(key, input) {
  if (monoCache.has(key)) return monoCache.get(key);
  const buffer = await sharp(input)
    .greyscale()
    .normalize()
    .linear(1.22, -14)
    .png()
    .toBuffer();
  const uri = `data:image/png;base64,${buffer.toString('base64')}`;
  monoCache.set(key, uri);
  return uri;
}
function monoFileUri(filePath) {
  if (!filePath || !existsSync(filePath)) return null;
  return monoUri(`file:${filePath}`, filePath);
}
async function monoWikiUri(slug) {
  const url = WIKI_IMAGES.get(slug);
  if (!url) return null;
  try {
    if (url.startsWith('data:image/')) {
      const comma = url.indexOf(',');
      if (comma < 0) return null;
      const buffer = Buffer.from(url.slice(comma + 1), 'base64');
      // Hash dedupes the distinct icons shared across normal/shiny rows.
      return await monoUri(`wiki:${createHash('sha1').update(buffer).digest('hex')}`, buffer);
    }
    let rel;
    if (url.startsWith('/')) {
      rel = url.replace(/^\/+/, '');
    } else {
      // bake-data.mjs rewrites remote Supabase image URLs to local file
      // names. If CI ever serves one, resolve the same local name here so
      // the card still shows that unit's real icon (never an external fetch).
      const tail = url.split('?')[0].split('/').pop() || '';
      rel = `images/units/${tail.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(-160)}`;
    }
    if (rel.includes('..')) return null;
    const file = join(ROOT, 'public', rel);
    return existsSync(file) ? await monoFileUri(file) : null;
  } catch {
    return null;
  }
}
function unitArtPath(slug) {
  const plain = join(UNIT_ASSETS, `${slug}.png`);
  if (existsSync(plain)) return plain;
  const provided = join(PROVIDED_ASSETS, `${slug}.png`);
  return existsSync(provided) ? provided : null;
}
/** Every unit's own in-game icon, greyscaled; falls back to bundled PNGs. */
async function unitArtUri(slug) {
  const own = (await monoWikiUri(slug)) || (await monoFileUri(unitArtPath(slug)));
  if (own) return own;
  // Shiny variants often reuse their base unit's icon in the WIKI data.
  const base = slug.startsWith('shiny-') ? slug.slice(6) : null;
  if (base) return (await monoWikiUri(base)) || (await monoFileUri(unitArtPath(base)));
  return null;
}

const LOGO_URI = await monoFileUri(LOGO_PATH);

/** Naive word-wrap (SVG has no auto wrapping). */
function wrapName(name, maxChars = 16) {
  const words = String(name || '').split(/\s+/);
  const lines = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxChars && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 2);
}

/* ------------------------------------------------------------------ */
/* Shared monochrome chrome                                            */
/* ------------------------------------------------------------------ */
function defs(extra = '') {
  return `<defs>
    <radialGradient id="halo" cx="0.76" cy="0.48" r="0.56">
      <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.13"/>
      <stop offset="0.55" stop-color="#FFFFFF" stop-opacity="0.045"/>
      <stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#000000" stop-opacity="0"/>
      <stop offset="1" stop-color="#000000" stop-opacity="0.42"/>
    </linearGradient>
    <pattern id="grain" width="5" height="5" patternUnits="userSpaceOnUse">
      <circle cx="1" cy="1" r="0.5" fill="#FFFFFF" fill-opacity="0.055"/>
    </pattern>
    <clipPath id="heroClip"><circle cx="905" cy="305" r="212"/></clipPath>
    <clipPath id="unitClip"><circle cx="285" cy="315" r="186"/></clipPath>
    ${extra}
  </defs>`;
}

function background() {
  return `  <rect width="${W}" height="${H}" fill="#080808"/>
  <rect width="${W}" height="${H}" fill="url(#halo)"/>
  <rect width="${W}" height="${H}" fill="url(#grain)"/>
  <rect x="30" y="30" width="1140" height="570" fill="none" stroke="#FFFFFF" stroke-opacity="0.22" stroke-width="1.5"/>
  <path d="M 30 78 L 30 30 L 78 30 M 1122 30 L 1170 30 L 1170 78 M 1170 552 L 1170 600 L 1122 600 M 78 600 L 30 600 L 30 552"
        fill="none" stroke="#FFFFFF" stroke-width="3"/>`;
}

function masthead(rightLabel) {
  return `  <rect x="68" y="60" width="34" height="34" rx="4" fill="#FFFFFF" fill-opacity="0.10"/>
  ${LOGO_URI ? `<image href="${LOGO_URI}" x="72" y="64" width="26" height="26" preserveAspectRatio="xMidYMid meet"/>` : ''}
  <text x="116" y="84" font-family="${SANS}" font-size="20" font-weight="700" fill="#FFFFFF" letter-spacing="4">APEX  /  WIKI &amp; VALUES</text>
  <text x="1132" y="84" font-family="${MONO}" font-size="15" fill="#8A8A8A" text-anchor="end" letter-spacing="2">${escXml(rightLabel)}</text>`;
}

function footer(left = SITE_URL, right = 'STATS · VALUES · TRADES') {
  return `  <line x1="68" y1="556" x2="1132" y2="556" stroke="#FFFFFF" stroke-opacity="0.16" stroke-width="1.5"/>
  <text x="68" y="586" font-family="${MONO}" font-size="16" fill="#7E7E7E" letter-spacing="1">${escXml(left)}</text>
  <text x="1132" y="586" font-family="${MONO}" font-size="15" fill="#7E7E7E" text-anchor="end" letter-spacing="2">${escXml(right)}</text>`;
}

/** Slim hairline index strip — replaces the old giant "321+" number. */
function indexStrip(items, y = 486, x0 = 68, width = 544) {
  const colW = width / items.length;
  const cells = items.map((label, i) => {
    const sep = i
      ? `<line x1="${x0 + i * colW}" y1="${y + 12}" x2="${x0 + i * colW}" y2="${y + 40}" stroke="#FFFFFF" stroke-opacity="0.28" stroke-width="1.5"/>`
      : '';
    const x = x0 + i * colW + (i ? 20 : 0);
    return `${sep}<text x="${x}" y="${y + 36}" font-family="${MONO}" font-size="17" fill="#FFFFFF" letter-spacing="1.5">${escXml(label)}</text>`;
  });
  return `  <line x1="${x0}" y1="${y}" x2="${x0 + width}" y2="${y}" stroke="#FFFFFF" stroke-opacity="0.30" stroke-width="1.5"/>
  ${cells.join('\n  ')}`;
}

function heroPortrait(uri) {
  return `  <circle cx="905" cy="305" r="248" fill="none" stroke="#FFFFFF" stroke-opacity="0.18" stroke-width="1.5"/>
  <circle cx="905" cy="305" r="225" fill="#101010" stroke="#FFFFFF" stroke-opacity="0.85" stroke-width="3"/>
  <g clip-path="url(#heroClip)">
    <rect x="693" y="93" width="424" height="424" fill="#101010"/>
    ${uri ? `<image href="${uri}" x="693" y="93" width="424" height="424" preserveAspectRatio="xMidYMid slice"/>` : ''}
    <rect x="693" y="305" width="424" height="212" fill="url(#fade)"/>
  </g>
  <circle cx="905" cy="305" r="225" fill="none" stroke="#FFFFFF" stroke-opacity="0.9" stroke-width="3"/>
  <circle cx="905" cy="57" r="5" fill="#FFFFFF"/>`;
}

/* ------------------------------------------------------------------ */
/* MAIN LINK IMAGE                                                     */
/* ------------------------------------------------------------------ */
async function defaultCardSvg() {
  // The home card uses a clean transparent render as a decorative
  // portrait; per-unit cards always use that unit's own in-game icon.
  const hero = await monoFileUri(join(PROVIDED_ASSETS, 'overclockedoverlord.png'));
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
${defs()}
${background()}
${masthead('INDEX 01  ·  2026')}
  <line x1="650" y1="130" x2="650" y2="500" stroke="#FFFFFF" stroke-opacity="0.14" stroke-width="1.5"/>
${heroPortrait(hero)}
  <text x="62" y="308" font-family="${SANS}" font-size="182" font-weight="900" fill="#FFFFFF" letter-spacing="-12">APEX</text>
  <rect x="68" y="342" width="132" height="3" fill="#FFFFFF"/>
  <text x="68" y="392" font-family="${SANS}" font-size="28" font-weight="700" fill="#C9C9C9" letter-spacing="10">VALUES &amp; WIKI</text>
  <text x="68" y="440" font-family="${SANS}" font-size="23" font-weight="400" fill="#8C8C8C" letter-spacing="1">Unit values, stats and trades.</text>
${indexStrip(['UNIT WIKI', 'LIVE VALUES', 'TRADE CALC'])}
${footer()}
</svg>`;
}

/* ------------------------------------------------------------------ */
/* TRADE CALCULATOR LINK IMAGE                                         */
/* ------------------------------------------------------------------ */
async function tradeCardSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
${defs()}
${background()}
${masthead('TRADE TOOL  ·  02')}
  <line x1="650" y1="130" x2="650" y2="500" stroke="#FFFFFF" stroke-opacity="0.14" stroke-width="1.5"/>

  <circle cx="905" cy="305" r="248" fill="none" stroke="#FFFFFF" stroke-opacity="0.13" stroke-width="1.5"/>
  <rect x="690" y="150" width="190" height="158" rx="12" fill="#FFFFFF" fill-opacity="0.045" stroke="#FFFFFF" stroke-opacity="0.62" stroke-width="2"/>
  <text x="785" y="196" font-family="${MONO}" font-size="16" fill="#C9C9C9" text-anchor="middle" letter-spacing="2">YOU GIVE</text>
  <text x="785" y="272" font-family="${SANS}" font-size="72" font-weight="700" fill="#FFFFFF" text-anchor="middle">?</text>
  <circle cx="935" cy="229" r="40" fill="#080808" stroke="#FFFFFF" stroke-opacity="0.8" stroke-width="2"/>
  <text x="935" y="243" font-family="${SANS}" font-size="34" font-weight="700" fill="#FFFFFF" text-anchor="middle">⇄</text>
  <rect x="990" y="150" width="142" height="158" rx="12" fill="#FFFFFF" fill-opacity="0.045" stroke="#FFFFFF" stroke-opacity="0.62" stroke-width="2"/>
  <text x="1061" y="196" font-family="${MONO}" font-size="15" fill="#C9C9C9" text-anchor="middle" letter-spacing="1">THEY GIVE</text>
  <text x="1061" y="272" font-family="${SANS}" font-size="72" font-weight="700" fill="#FFFFFF" text-anchor="middle">?</text>
  <rect x="690" y="338" width="442" height="104" rx="12" fill="#FFFFFF" fill-opacity="0.045" stroke="#FFFFFF" stroke-opacity="0.5" stroke-width="2"/>
  <text x="911" y="378" font-family="${MONO}" font-size="16" fill="#9A9A9A" text-anchor="middle" letter-spacing="2">VERDICT</text>
  <text x="911" y="420" font-family="${SANS}" font-size="28" font-weight="700" fill="#FFFFFF" text-anchor="middle">WIN · FAIR · LOSS</text>

  <text x="62" y="272" font-family="${SANS}" font-size="112" font-weight="900" fill="#FFFFFF" letter-spacing="-7">TRADE</text>
  <text x="66" y="350" font-family="${SANS}" font-size="58" font-weight="800" fill="#FFFFFF" letter-spacing="2">CALCULATOR</text>
  <rect x="68" y="378" width="132" height="3" fill="#FFFFFF"/>
  <text x="68" y="424" font-family="${SANS}" font-size="22" font-weight="400" fill="#8C8C8C" letter-spacing="1">Compare any trade.</text>
${indexStrip(['VALUE TOTALS', 'OVERPAY CHECK', 'SHARE LINKS'])}
${footer(`${SITE_URL}/values/calculator`, 'STATS · VALUES · TRADES')}
</svg>`;
}

/* ------------------------------------------------------------------ */
/* PER-UNIT LINK IMAGE                                                 */
/* ------------------------------------------------------------------ */
async function cardSvg({ name, rarity = 'Normie', type, slug, side = 'WIKI', pathLabel = SITE_URL }) {
  const art = await unitArtUri(slug);
  const nameLines = wrapName(name);
  const size = nameLines.some((line) => line.length > 12) ? 58 : 72;
  const rarityLabel = String(rarity).toUpperCase();
  const pillW = rarityLabel.length * 13 + 44;
  const typeY = 268 + nameLines.length * (size + 10);

  const portrait = `  <circle cx="285" cy="315" r="212" fill="none" stroke="#FFFFFF" stroke-opacity="0.18" stroke-width="1.5"/>
  <circle cx="285" cy="315" r="190" fill="#101010" stroke="#FFFFFF" stroke-opacity="0.85" stroke-width="3"/>
  <g clip-path="url(#unitClip)">
    <rect x="99" y="129" width="372" height="372" fill="#101010"/>
    ${art ? `<image href="${art}" x="99" y="129" width="372" height="372" preserveAspectRatio="xMidYMid slice"/>` : ''}
    <rect x="99" y="315" width="372" height="186" fill="url(#fade)"/>
  </g>
  <circle cx="285" cy="315" r="190" fill="none" stroke="#FFFFFF" stroke-opacity="0.9" stroke-width="3"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
${defs()}
${background()}
${masthead(`${side === 'VALUES' ? 'UNIT VALUE' : 'UNIT FILE'}  ·  ${rarityLabel}`)}
${portrait}
  <line x1="530" y1="130" x2="530" y2="500" stroke="#FFFFFF" stroke-opacity="0.14" stroke-width="1.5"/>

  <rect x="560" y="140" width="${pillW}" height="44" rx="22" fill="#FFFFFF" fill-opacity="0.07" stroke="#FFFFFF" stroke-opacity="0.62" stroke-width="2"/>
  <text x="${560 + pillW / 2}" y="169" font-family="${MONO}" font-size="17" font-weight="700" fill="#FFFFFF" text-anchor="middle" letter-spacing="2">${escXml(rarityLabel)}</text>

  ${nameLines
    .map((line, i) => `<text x="558" y="${268 + i * (size + 10)}" font-family="${SANS}" font-size="${size}" font-weight="900" fill="#FFFFFF" letter-spacing="-2">${escXml(line)}</text>`)
    .join('\n  ')}
  ${type ? `<text x="560" y="${typeY}" font-family="${SANS}" font-size="24" font-weight="400" fill="#9A9A9A">${escXml(type)}</text>` : ''}

  <line x1="560" y1="470" x2="1120" y2="470" stroke="#FFFFFF" stroke-opacity="0.28" stroke-width="1.5"/>
  <text x="560" y="506" font-family="${MONO}" font-size="17" fill="#C9C9C9" letter-spacing="2">${escXml(side === 'VALUES' ? 'VALUE · DEMAND · TREND' : 'STATS · UPGRADES · HOW TO GET')}</text>
${footer(pathLabel, side === 'VALUES' ? 'APEX VALUE INDEX' : 'APEX UNIT INDEX')}
</svg>`;
}

/* ------------------------------------------------------------------ */
/* PER-PAGE LINK IMAGE — every non-unit route gets its own card        */
/* ------------------------------------------------------------------ */
function fitTitle(text, maxWidth = 545) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  for (const size of [84, 76, 68, 60, 52, 46]) {
    const lines = [];
    let line = '';
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (next.length * size * 0.6 > maxWidth && line) { lines.push(line); line = word; }
      else line = next;
    }
    if (line) lines.push(line);
    if (lines.length <= 2 && lines.every((l) => l.length * size * 0.6 <= maxWidth)) {
      return { lines, size };
    }
  }
  return { lines: [String(text || '').slice(0, 26)], size: 46 };
}

async function pageCardSvg(spec) {
  const emblem = await monoFileUri(join(PROVIDED_ASSETS, spec.emblem));
  const { lines, size } = fitTitle(spec.title);
  const topY = 246;
  const lineH = size * 1.08;
  const subY = topY + lines.length * lineH + 18;
  const pillW = spec.eyebrow.length * 12 + 44;
  const pageNo = String(spec.index).padStart(3, '0');
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
${defs()}
${background()}
${masthead(`PAGE ${pageNo}  ·  2026`)}
  <line x1="650" y1="130" x2="650" y2="500" stroke="#FFFFFF" stroke-opacity="0.14" stroke-width="1.5"/>
${heroPortrait(emblem)}

  <rect x="68" y="142" width="${pillW}" height="44" rx="22" fill="#FFFFFF" fill-opacity="0.07" stroke="#FFFFFF" stroke-opacity="0.62" stroke-width="2"/>
  <text x="${68 + pillW / 2}" y="171" font-family="${MONO}" font-size="16" font-weight="700" fill="#FFFFFF" text-anchor="middle" letter-spacing="2">${escXml(spec.eyebrow)}</text>

  ${lines
    .map((line, i) => `<text x="64" y="${topY + i * lineH}" font-family="${SANS}" font-size="${size}" font-weight="900" fill="#FFFFFF" letter-spacing="-3">${escXml(line)}</text>`)
    .join('\n  ')}
  <text x="68" y="${subY}" font-family="${SANS}" font-size="22" font-weight="400" fill="#8C8C8C" letter-spacing="1">${escXml(spec.subtitle)}</text>
${indexStrip(spec.strip)}
${footer(spec.pathLabel, 'STATS · VALUES · TRADES')}
</svg>`;
}

/* ------------------------------------------------------------------ */
async function writeCard(fileName, svg, { targetDir = OUT_DIR } = {}) {
  // The final greyscale pass is the "monochrome filter on the whole embed":
  // even if a colour sneaks into a gradient or a future asset, it cannot ship.
  const png = await sharp(Buffer.from(svg), { density: 144 })
    .resize(W, H)
    .greyscale()
    .png({ compressionLevel: 9, palette: true, colours: 64, effort: 10 })
    .toBuffer();
  mkdirSync(targetDir, { recursive: true });
  writeFileSync(join(targetDir, fileName), png);
  return png.length;
}

async function main() {
  const routes = buildRouteManifest();
  const previewDir = process.env.APEX_CARDS_PREVIEW_DIR;
  const previewPaths = new Set([
    '/', '/values/calculator', '/wiki', '/values', '/minigames', '/about',
    '/privacy', '/values/afford', '/wiki/items', '/wiki/units/Omegas',
  ]);
  const previewUnitSlugs = new Set(['showmanball', 'forestball', 'ball']);

  let total = 0;
  let count = 0;
  for (const [i, route] of routes.entries()) {
    const spec = cardSpecFor(route, i);
    if (previewDir) {
      const isUnitSample = spec.kind === 'unit' && previewUnitSlugs.has(spec.unit?.slug);
      const isWantedPage = previewPaths.has(route.path);
      if (spec.kind !== 'home' && spec.kind !== 'calculator' && !isUnitSample && !isWantedPage) continue;
      // Skip the Values twin in preview mode; two unit samples are enough.
      if (spec.kind === 'unit' && spec.side === 'VALUES') continue;
    }
    let svg;
    if (spec.kind === 'home') svg = await defaultCardSvg();
    else if (spec.kind === 'calculator') svg = await tradeCardSvg();
    else if (spec.kind === 'unit') svg = await cardSvg({
      name: spec.unit.name, rarity: spec.unit.rarity, type: spec.unit.type,
      slug: spec.unit.slug, side: spec.side, pathLabel: spec.pathLabel,
    });
    else svg = await pageCardSvg(spec);
    total += await writeCard(spec.fileName, svg, previewDir ? { targetDir: previewDir } : {});
    count += 1;
  }
  if (previewDir) {
    console.log(`[cards] wrote ${count} preview cards to ${previewDir} (${(total / 1024).toFixed(0)} KB)`);
    return;
  }
  console.log(`[cards] wrote ${count} monochrome social cards (one per route) to public/social/ (~${(total / 1024 / 1024).toFixed(1)} MB total)`);
}

main().catch((error) => {
  console.error('[cards] failed:', error);
  process.exit(1);
});
