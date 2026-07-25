#!/usr/bin/env node
// ============================================================================
// SOCIAL CARD GENERATOR
// ----------------------------------------------------------------------------
// Generates 1200x630 Open Graph images into public/social/ (committed to the
// repo — Vite copies public/ into dist/ on every build, so the deploy needs
// no native deps). Re-run manually whenever units change:
//
//   npm run cards
//
// Requires the devDependency `sharp` (SVG -> PNG rasterization). Unit art is
// pulled from src/assets/units/<slug>.png when it exists; other units get a
// branded rarity-gradient token with their initial.
// ============================================================================

import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ALL_UNITS } from '../../src/data/units.js';
import { getRarityPalette } from '../../src/data/taxonomy.js';

const ROOT = process.env.APEX_PROJECT_ROOT || dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const OUT_DIR = join(ROOT, 'public', 'social');
const UNIT_ASSETS = join(ROOT, 'src', 'assets', 'units');
const LOGO_PATH = join(ROOT, 'src', 'assets', 'apex-values-wiki-logo.png');
const SITE_LABEL = 'Apex Values & WIKI';

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
  if (!existsSync(filePath)) return null;
  return `data:image/png;base64,${readFileSync(filePath).toString('base64')}`;
}

const LOGO_URI = dataUri(LOGO_PATH);

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

function cardSvg({ name, rarity, type, imageUri }) {
  const palette = getRarityPalette(rarity);
  const primary = palette[1] || palette[0];
  const deep = palette[5] || palette[0];
  const nameLines = wrapName(name);
  const nameFontSize = nameLines.some((line) => line.length > 16) ? 64 : 76;

  const art = imageUri
    ? `<clipPath id="artClip"><rect x="90" y="195" width="240" height="240" rx="30" ry="30"/></clipPath>
       <g clip-path="url(#artClip)"><image href="${imageUri}" x="90" y="195" width="240" height="240" preserveAspectRatio="xMidYMid meet"/></g>
       <rect x="90" y="195" width="240" height="240" rx="30" ry="30" fill="none" stroke="#ffffff" stroke-opacity="0.25" stroke-width="2"/>`
    : `<circle cx="210" cy="315" r="118" fill="url(#tokenGrad)"/>
       <text x="210" y="345" font-family="${FONT_STACK}" font-size="120" font-weight="800" fill="#ffffff" text-anchor="middle">${escXml((name || '?').trim()[0] || '?')}</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0b0b14"/>
      <stop offset="1" stop-color="#14142a"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.22" cy="0.5" r="0.55">
      <stop offset="0" stop-color="${primary}" stop-opacity="0.55"/>
      <stop offset="1" stop-color="${primary}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="tokenGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${primary}"/>
      <stop offset="1" stop-color="${deep}"/>
    </linearGradient>
    <linearGradient id="badgeGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${primary}"/>
      <stop offset="1" stop-color="${deep}"/>
    </linearGradient>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg)"/>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#glow)"/>
  <rect x="0" y="${HEIGHT - 8}" width="${WIDTH}" height="8" fill="url(#badgeGrad)"/>

  <circle cx="210" cy="315" r="150" fill="none" stroke="${primary}" stroke-opacity="0.6" stroke-width="3"/>
  ${art}

  <rect x="430" y="120" rx="18" ry="18" width="${rarity.length * 17 + 44}" height="52" fill="url(#badgeGrad)"/>
  <text x="452" y="155" font-family="${FONT_STACK}" font-size="30" font-weight="700" fill="#ffffff" letter-spacing="1">${escXml(rarity.toUpperCase())}</text>

  ${nameLines
    .map(
      (line, i) =>
        `<text x="430" y="${255 + i * (nameFontSize + 8)}" font-family="${FONT_STACK}" font-size="${nameFontSize}" font-weight="800" fill="#ffffff">${escXml(line)}</text>`
    )
    .join('\n  ')}

  ${type ? `<text x="430" y="${285 + nameLines.length * (nameFontSize + 8)}" font-family="${FONT_STACK}" font-size="34" font-weight="600" fill="${primary}">${escXml(type)}</text>` : ''}

  ${LOGO_URI ? `<image href="${LOGO_URI}" x="430" y="500" width="56" height="56" preserveAspectRatio="xMidYMid meet"/>` : ''}
  <text x="504" y="540" font-family="${FONT_STACK}" font-size="32" font-weight="700" fill="#e8e8f5">${escXml(SITE_LABEL)}</text>
  <text x="504" y="575" font-family="${FONT_STACK}" font-size="22" font-weight="500" fill="#9c9cb8">Ball Tower Defense · Stats · Values · Trades</text>
</svg>`;
}

function defaultCardSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0b0b14"/>
      <stop offset="1" stop-color="#1a1030"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.35" r="0.7">
      <stop offset="0" stop-color="#8a5cff" stop-opacity="0.45"/>
      <stop offset="1" stop-color="#8a5cff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg)"/>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#glow)"/>
  ${LOGO_URI ? `<image href="${LOGO_URI}" x="480" y="80" width="240" height="240" preserveAspectRatio="xMidYMid meet"/>` : ''}
  <text x="600" y="430" font-family="${FONT_STACK}" font-size="82" font-weight="800" fill="#ffffff" text-anchor="middle">${escXml(SITE_LABEL)}</text>
  <text x="600" y="495" font-family="${FONT_STACK}" font-size="28" font-weight="600" fill="#b9b9d9" text-anchor="middle">Ball Tower Defense — Unit WIKI, Live Trade Values &amp; Calculator</text>
  <rect x="0" y="${HEIGHT - 8}" width="${WIDTH}" height="8" fill="#8a5cff"/>
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

  // Default card keeps full colour (palette quantization bands on big smooth
  // gradients); unit cards use palette PNGs to stay small.
  await writeCard('default.png', defaultCardSvg(), { palette: false });
  count += 1;

  for (const unit of ALL_UNITS) {
    const artPath = join(UNIT_ASSETS, `${unit.slug}.png`);
    const svg = cardSvg({
      name: unit.name,
      rarity: unit.rarity,
      type: unit.type,
      imageUri: dataUri(artPath),
    });
    total += await writeCard(`unit-${unit.slug}.png`, svg);
    count += 1;
  }

  console.log(`[cards] wrote ${count} social cards to public/social/ (~${(total / 1024 / 1024).toFixed(1)} MB of unit cards)`);
}

main().catch((error) => {
  console.error('[cards] failed:', error);
  process.exit(1);
});
