#!/usr/bin/env node
// SOCIAL CARD GENERATOR
// Generates 1200x630 Open Graph images into public/social/ (committed to the
// repo — Vite copies public/ into dist/ on every build, so the deploy needs
// no native deps). Re-run manually whenever units change:
//
//   npm run cards
//
// Requires the devDependency `sharp` (SVG -> PNG rasterization). Unit art is
// pulled from src/assets/units/<slug>.png or src/assets/units/provided/.
//
// Three kinds of card:
//   default.png           — the main LINK IMAGE (Discord / X / WhatsApp preview)
//   trade-calculator.png  — dedicated preview for shared trade links
//   unit-<slug>.png       — per-unit link previews

import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ALL_UNITS } from '../../src/data/units.js';
import { getRarityPalette } from '../../src/data/taxonomy.js';

const ROOT = process.env.APEX_PROJECT_ROOT || dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const OUT_DIR = join(ROOT, 'public', 'social');
const UNIT_ASSETS = join(ROOT, 'src', 'assets', 'units');
const PROVIDED_ASSETS = join(UNIT_ASSETS, 'provided');
const LOGO_PATH = join(ROOT, 'src', 'assets', 'apex-values-wiki-logo.png');
const SITE_LABEL = 'Apex WIKI & Values';
const SITE_URL = 'apexballvalueswiki.github.io';

let sharp;
try {
  sharp = (await import('sharp')).default;
} catch {
  console.error('[cards] This script needs the "sharp" devDependency. Run: npm install');
  process.exit(1);
}

const WIDTH = 1200;
const HEIGHT = 630;
const FONT_STACK = "Montserrat, 'Segoe UI', Arial, sans-serif";

function escXml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function dataUri(filePath) {
  if (!filePath || !existsSync(filePath)) return null;
  return `data:image/png;base64,${readFileSync(filePath).toString('base64')}`;
}

const LOGO_URI = dataUri(LOGO_PATH);

/** Art lookup covers both the root asset folder and the provided/ subfolder. */
function unitArtUri(slug) {
  return dataUri(join(UNIT_ASSETS, `${slug}.png`)) || dataUri(join(PROVIDED_ASSETS, `${slug}.png`));
}

/** Naive word-wrap for the unit name (SVG has no auto text wrapping). */
function wrapName(name, maxChars = 22) {
  const words = String(name).split(/\s+/);
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

/** Shared chrome: background, grids, glows, brand bar. */
function sharedDefs(extra = '') {
  return `<defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#07070f"/>
      <stop offset="0.55" stop-color="#101027"/>
      <stop offset="1" stop-color="#1a1038"/>
    </linearGradient>
    <radialGradient id="glowA" cx="0.18" cy="0.28" r="0.62">
      <stop offset="0" stop-color="#4cc9f0" stop-opacity="0.30"/>
      <stop offset="1" stop-color="#4cc9f0" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glowB" cx="0.86" cy="0.78" r="0.62">
      <stop offset="0" stop-color="#b26bff" stop-opacity="0.38"/>
      <stop offset="1" stop-color="#b26bff" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="brand" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#4cc9f0"/>
      <stop offset="0.5" stop-color="#8a5cff"/>
      <stop offset="1" stop-color="#ff6ba8"/>
    </linearGradient>
    <linearGradient id="headline" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="1" stop-color="#c6b6ff"/>
    </linearGradient>
    <linearGradient id="tileFade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#0b0b18" stop-opacity="0"/>
      <stop offset="1" stop-color="#0b0b18" stop-opacity="0.85"/>
    </linearGradient>
    <pattern id="dots" width="26" height="26" patternUnits="userSpaceOnUse">
      <circle cx="2" cy="2" r="1.4" fill="#ffffff" fill-opacity="0.10"/>
    </pattern>
    ${extra}
  </defs>`;
}

function sharedBackground() {
  return `  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg)"/>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#glowA)"/>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#glowB)"/>
  <rect x="640" y="0" width="560" height="${HEIGHT}" fill="url(#dots)" opacity="0.55"/>
  <rect x="${WIDTH - 8}" y="0" width="8" height="${HEIGHT}" fill="url(#brand)" opacity="0.65"/>
  <rect x="0" y="${HEIGHT - 9}" width="${WIDTH}" height="9" fill="url(#brand)"/>`;
}

function brandHeader() {
  return `  ${LOGO_URI ? `<rect x="64" y="54" width="58" height="58" rx="16" fill="#0b0b18" stroke="#ffffff" stroke-opacity="0.18" stroke-width="2"/>
  <image href="${LOGO_URI}" x="70" y="60" width="46" height="46" preserveAspectRatio="xMidYMid meet"/>` : ''}
  <text x="138" y="80" font-family="${FONT_STACK}" font-size="21" font-weight="800" fill="#ffffff" letter-spacing="2.5">APEX WIKI &amp; VALUES</text>
  <text x="138" y="105" font-family="${FONT_STACK}" font-size="16" font-weight="600" fill="#8f8fb5" letter-spacing="1.2">UNOFFICIAL FAN COMPANION · BALL TOWER DEFENSE</text>`;
}

function chip(x, y, label, w, fill = '#ffffff', opacity = 0.08) {
  return `<rect x="${x}" y="${y}" width="${w}" height="42" rx="21" fill="${fill}" fill-opacity="${opacity}" stroke="#ffffff" stroke-opacity="0.16" stroke-width="1.5"/>
  <text x="${x + w / 2}" y="${y + 28}" font-family="${FONT_STACK}" font-size="18" font-weight="800" fill="#e9e9f8" text-anchor="middle" letter-spacing="0.8">${escXml(label)}</text>`;
}

/** A rotated, framed unit-art tile used in the main link image collage. */
function artTile(slug, x, y, w, h, rot, color, id) {
  const uri = unitArtUri(slug);
  const cx = x + w / 2;
  const cy = y + h / 2;
  const art = uri
    ? `<image href="${uri}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice"/>`
    : `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${color}" fill-opacity="0.25"/>`;
  return `<g transform="rotate(${rot} ${cx} ${cy})">
    <rect x="${x - 8}" y="${y + 10}" width="${w}" height="${h}" rx="26" fill="#000000" fill-opacity="0.55"/>
    <g clip-path="url(#clip${id})">
      <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#12122a"/>
      ${art}
      <rect x="${x}" y="${y + h * 0.55}" width="${w}" height="${h * 0.45}" fill="url(#tileFade)"/>
    </g>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="26" fill="none" stroke="${color}" stroke-opacity="0.85" stroke-width="4"/>
    <rect x="${x + 18}" y="${y + h - 52}" width="10" height="10" rx="5" fill="${color}"/>
  </g>`;
}

/** MAIN LINK IMAGE — the picture shown when any site link is pasted anywhere. */
function defaultCardSvg() {
  const tiles = [
    { slug: 'omegaknight-omk', x: 730, y: 100, w: 250, h: 205, rot: -6, color: '#ffd36b' },
    { slug: 'forestball', x: 918, y: 245, w: 230, h: 200, rot: 6, color: '#4cff9d' },
    { slug: 'showmanball', x: 705, y: 350, w: 245, h: 195, rot: -4, color: '#ff6ba8' },
  ];
  const clips = tiles
    .map((t, i) => `<clipPath id="clip${i}"><rect x="${t.x}" y="${t.y}" width="${t.w}" height="${t.h}" rx="26" ry="26"/></clipPath>`)
    .join('\n    ');
  const count = ALL_UNITS.length;

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
${sharedDefs(clips)}
${sharedBackground()}
${brandHeader()}

  <!-- headline -->
  <rect x="64" y="168" width="46" height="6" rx="3" fill="url(#brand)"/>
  <text x="64" y="270" font-family="${FONT_STACK}" font-size="86" font-weight="800" fill="#ffffff" letter-spacing="-3">Apex WIKI</text>
  <text x="64" y="360" font-family="${FONT_STACK}" font-size="86" font-weight="800" fill="url(#headline)" letter-spacing="-3">&amp; Values</text>
  <text x="68" y="410" font-family="${FONT_STACK}" font-size="27" font-weight="600" fill="#b9b9d9">Unit stats, live trade values &amp; a trade calculator.</text>

  <!-- feature chips -->
  ${chip(64, 452, `${count}+ UNITS`, 184)}
  ${chip(258, 452, 'LIVE VALUES', 190)}
  ${chip(458, 452, 'TRADE CALCULATOR', 218)}

  <!-- url -->
  <circle cx="76" cy="553" r="6" fill="#4cc9f0"/>
  <text x="94" y="560" font-family="${FONT_STACK}" font-size="21" font-weight="700" fill="#9a9ac2" letter-spacing="0.5">${SITE_URL}</text>

  <!-- unit art collage -->
  ${tiles.map((t, i) => artTile(t.slug, t.x, t.y, t.w, t.h, t.rot, t.color, i)).join('\n  ')}
  <circle cx="945" cy="120" r="58" fill="none" stroke="#ffffff" stroke-opacity="0.12" stroke-width="2"/>
  <circle cx="945" cy="120" r="38" fill="none" stroke="#ffffff" stroke-opacity="0.08" stroke-width="2"/>
</svg>`;
}

/** Dedicated LINK IMAGE for /values/calculator (used by "Share Trade" links). */
function tradeCardSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
${sharedDefs()}
${sharedBackground()}
${brandHeader()}

  <rect x="64" y="166" width="46" height="6" rx="3" fill="url(#brand)"/>
  <text x="64" y="266" font-family="${FONT_STACK}" font-size="76" font-weight="800" fill="#ffffff" letter-spacing="-2.5">Trade Calculator</text>
  <text x="68" y="316" font-family="${FONT_STACK}" font-size="27" font-weight="600" fill="#b9b9d9">Compare any offer before you accept it.</text>

  ${chip(64, 350, 'VALUE TOTALS', 190)}
  ${chip(264, 350, 'OVERPAY CHECK', 200)}
  ${chip(474, 350, 'SHAREABLE LINKS', 210)}

  <!-- opposing offer panels -->
  <rect x="720" y="150" width="200" height="150" rx="24" fill="#4cc9f0" fill-opacity="0.10" stroke="#4cc9f0" stroke-opacity="0.7" stroke-width="3"/>
  <text x="820" y="202" font-family="${FONT_STACK}" font-size="20" font-weight="800" fill="#4cc9f0" text-anchor="middle" letter-spacing="1.5">YOU GIVE</text>
  <text x="820" y="262" font-family="${FONT_STACK}" font-size="52" font-weight="800" fill="#ffffff" text-anchor="middle">?</text>

  <circle cx="960" cy="225" r="46" fill="#15152c" stroke="url(#brand)" stroke-width="4"/>
  <text x="960" y="240" font-family="${FONT_STACK}" font-size="40" font-weight="800" fill="#ffffff" text-anchor="middle">⇄</text>

  <rect x="1000" y="150" width="160" height="150" rx="24" fill="#ff6ba8" fill-opacity="0.10" stroke="#ff6ba8" stroke-opacity="0.7" stroke-width="3"/>
  <text x="1080" y="202" font-family="${FONT_STACK}" font-size="20" font-weight="800" fill="#ff6ba8" text-anchor="middle" letter-spacing="1.5">THEY GIVE</text>
  <text x="1080" y="262" font-family="${FONT_STACK}" font-size="52" font-weight="800" fill="#ffffff" text-anchor="middle">?</text>

  <rect x="720" y="340" width="440" height="96" rx="22" fill="#ffffff" fill-opacity="0.06" stroke="#ffffff" stroke-opacity="0.14" stroke-width="2"/>
  <text x="940" y="380" font-family="${FONT_STACK}" font-size="19" font-weight="700" fill="#9a9ac2" text-anchor="middle" letter-spacing="1.5">INSTANT VERDICT</text>
  <text x="940" y="416" font-family="${FONT_STACK}" font-size="30" font-weight="800" fill="url(#headline)" text-anchor="middle">WIN · FAIR · LOSS</text>

  <circle cx="76" cy="553" r="6" fill="#4cc9f0"/>
  <text x="94" y="560" font-family="${FONT_STACK}" font-size="21" font-weight="700" fill="#9a9ac2" letter-spacing="0.5">${SITE_URL}/values/calculator</text>
</svg>`;
}

/** Per-unit link preview. */
function cardSvg({ name, rarity, type, imageUri }) {
  const palette = getRarityPalette(rarity);
  const primary = palette[1] || palette[0];
  const deep = palette[5] || palette[0];
  const nameLines = wrapName(name);
  const nameFontSize = nameLines.some((line) => line.length > 16) ? 64 : 76;

  const art = imageUri
    ? `<clipPath id="artClip"><rect x="90" y="188" width="250" height="250" rx="30" ry="30"/></clipPath>
       <g clip-path="url(#artClip)"><rect x="90" y="188" width="250" height="250" fill="#12122a"/><image href="${imageUri}" x="90" y="188" width="250" height="250" preserveAspectRatio="xMidYMid meet"/></g>
       <rect x="90" y="188" width="250" height="250" rx="30" ry="30" fill="none" stroke="#ffffff" stroke-opacity="0.28" stroke-width="3"/>`
    : `<circle cx="215" cy="313" r="125" fill="url(#tokenGrad)"/>
       <text x="215" y="350" font-family="${FONT_STACK}" font-size="130" font-weight="800" fill="#ffffff" text-anchor="middle">${escXml((name || '?').trim()[0] || '?')}</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <defs>
    <linearGradient id="bg2" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#08080f"/><stop offset="1" stop-color="#16162c"/>
    </linearGradient>
    <radialGradient id="glow2" cx="0.22" cy="0.5" r="0.6">
      <stop offset="0" stop-color="${primary}" stop-opacity="0.42"/>
      <stop offset="1" stop-color="${primary}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="tokenGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${primary}"/><stop offset="1" stop-color="${deep}"/>
    </linearGradient>
    <linearGradient id="badgeGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${primary}"/><stop offset="1" stop-color="${deep}"/>
    </linearGradient>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg2)"/>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#glow2)"/>
  <rect x="0" y="${HEIGHT - 8}" width="${WIDTH}" height="8" fill="url(#badgeGrad)"/>

  <circle cx="215" cy="313" r="158" fill="none" stroke="${primary}" stroke-opacity="0.55" stroke-width="3"/>
  ${art}

  <rect x="420" y="112" rx="18" ry="18" width="${rarity.length * 17 + 44}" height="52" fill="url(#badgeGrad)"/>
  <text x="442" y="147" font-family="${FONT_STACK}" font-size="29" font-weight="700" fill="#ffffff" letter-spacing="1">${escXml(rarity.toUpperCase())}</text>

  ${nameLines
    .map(
      (line, i) =>
        `<text x="420" y="${248 + i * (nameFontSize + 8)}" font-family="${FONT_STACK}" font-size="${nameFontSize}" font-weight="800" fill="#ffffff">${escXml(line)}</text>`
    )
    .join('\n  ')}

  ${type ? `<text x="422" y="${278 + nameLines.length * (nameFontSize + 8)}" font-family="${FONT_STACK}" font-size="32" font-weight="600" fill="${primary}">${escXml(type)}</text>` : ''}

  <text x="422" y="474" font-family="${FONT_STACK}" font-size="20" font-weight="700" fill="#8f8fb5" letter-spacing="1.5">${escXml(SITE_LABEL.toUpperCase())}</text>
  <text x="422" y="508" font-family="${FONT_STACK}" font-size="22" font-weight="600" fill="#cfcfe6">WIKI · VALUES · TRADES</text>
  <circle cx="432" cy="556" r="5" fill="${primary}"/>
  <text x="450" y="563" font-family="${FONT_STACK}" font-size="19" font-weight="600" fill="#8f8fb5">${SITE_URL}</text>
</svg>`;
}

async function writeCard(fileName, svg, { palette = true } = {}) {
  const png = await sharp(Buffer.from(svg), { density: 144 })
    .resize(WIDTH, HEIGHT)
    .png(palette ? { compressionLevel: 9, palette: true, quality: 90, colors: 256 } : { compressionLevel: 9 })
    .toBuffer();
  const target = join(OUT_DIR, fileName);
  await sharp(png).toFile(target); // write via sharp to keep one code path
  return png.length;
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  let total = 0;
  let count = 0;

  // Hero cards keep full colour (palette quantization bands on big smooth
  // gradients); unit cards use palette PNGs to stay small.
  total += await writeCard('default.png', defaultCardSvg(), { palette: false });
  count += 1;
  total += await writeCard('trade-calculator.png', tradeCardSvg(), { palette: false });
  count += 1;

  for (const unit of ALL_UNITS) {
    const svg = cardSvg({
      name: unit.name,
      rarity: unit.rarity,
      type: unit.type,
      imageUri: unitArtUri(unit.slug),
    });
    total += await writeCard(`unit-${unit.slug}.png`, svg);
    count += 1;
  }

  console.log(`[cards] wrote ${count} social cards to public/social/ (~${(total / 1024 / 1024).toFixed(1)} MB total)`);
}

main().catch((error) => {
  console.error('[cards] failed:', error);
  process.exit(1);
});
