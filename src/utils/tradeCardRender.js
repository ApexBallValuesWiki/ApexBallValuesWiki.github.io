// TRADE CALCULATOR — shareable PNG renderer.
//
// Produces the "Export Image" / "Save PNG" card. Everything is drawn with the
// Canvas 2D API from the live trade state, so the exported image always
// matches what the visitor sees. No third-party library, no network request,
// no external font/CDN: only system font families are requested.
import { getRarityGlow, isShinyRarity } from '../data/taxonomy';
import { getUnitIcon } from '../data/unitIcons';
import { formatCompactNumber } from './formatNumber';
import tradeLogo from '../assets/apex-values-wiki-logo.png';

// The WIKI ships a handful of full unit renders in assets/units/provided/.
// getUnitIcon() only knows about 9 legacy icons, so without this the exported
// card showed a letter for almost every row. These are URL imports (lazy
// assets), so nothing is inlined into the JS bundle.
const PROVIDED_ART = import.meta.glob('../assets/units/provided/*.png', {
  eager: true, query: '?url', import: 'default',
});
function providedArtFor(slug) {
  if (!slug) return null;
  const key = Object.keys(PROVIDED_ART).find((path) => path.endsWith(`/${slug}.png`));
  return key ? PROVIDED_ART[key] : null;
}

const W = 1800;
const H = 1120;
const FONT = 'Montserrat, Arial, sans-serif';
const SITE_URL = 'apexballvalueswiki.github.io/values/calculator';

/* ------------------------------------------------------------------ */
/* Colour helpers. CSS custom properties can be `var(...)`, `color-mix()`  */
/* or `oklch()`; Canvas silently ignores those, which used to make the     */
/* danger/you/them accents fall back to whatever colour was last set.      */
/* ------------------------------------------------------------------ */
let colourProbe = null;

export function safeColor(value, fallback) {
  const v = String(value || '').trim();
  if (!v || v.includes('var(') || v.includes('color-mix')) return fallback;
  try {
    if (!colourProbe) colourProbe = document.createElement('canvas').getContext('2d');
    colourProbe.fillStyle = '#010203';
    colourProbe.fillStyle = v;
    if (colourProbe.fillStyle === '#010203') return fallback; // assignment was ignored
    return v;
  } catch { return fallback; }
}

function withAlpha(color, alpha) {
  const c = String(color || '').trim();
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(c);
  if (hex) {
    let h = hex[1];
    if (h.length === 3) h = h.split('').map((ch) => ch + ch).join('');
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }
  const rgb = /^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/i.exec(c);
  if (rgb) return `rgba(${rgb[1]},${rgb[2]},${rgb[3]},${alpha})`;
  return `rgba(138,92,255,${alpha})`;
}

export function readCanvasTheme() {
  const css = getComputedStyle(document.documentElement);
  const get = (name, fallback) => safeColor(css.getPropertyValue(name), fallback);
  return {
    bg: get('--bg', '#080810'),
    card: get('--bg-card', '#121224'),
    elevated: get('--bg-elevated', '#1b1b30'),
    text: get('--text', '#ffffff'),
    dim: get('--text-dim', '#b9b9d9'),
    faint: get('--text-faint', '#8c8caa'),
    border: get('--border-strong', '#3a3a58'),
    accent: get('--accent', '#8a5cff'),
    success: get('--success', '#4ade80'),
    danger: get('--danger', '#ff5f7a'),
    you: get('--you-color-theme', '#4cc9f0'),
    them: get('--them-color-theme', '#ff6ba8'),
  };
}

/* ------------------------------------------------------------------ */
/* Drawing primitives                                                  */
/* ------------------------------------------------------------------ */
function roundedRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function fillRounded(ctx, x, y, w, h, r, fill, alpha = 1) {
  ctx.save(); ctx.globalAlpha = alpha; roundedRect(ctx, x, y, w, h, r);
  ctx.fillStyle = fill; ctx.fill(); ctx.restore();
}

function strokeRounded(ctx, x, y, w, h, r, stroke, lineWidth = 2, alpha = 1) {
  ctx.save(); ctx.globalAlpha = alpha; roundedRect(ctx, x, y, w, h, r);
  ctx.strokeStyle = stroke; ctx.lineWidth = lineWidth; ctx.stroke(); ctx.restore();
}

function drawImageCover(ctx, image, x, y, w, h) {
  const iw = image.naturalWidth || image.width || 1;
  const ih = image.naturalHeight || image.height || 1;
  const scale = Math.max(w / iw, h / ih);
  const sw = w / scale;
  const sh = h / scale;
  ctx.drawImage(image, (iw - sw) / 2, (ih - sh) / 2, sw, sh, x, y, w, h);
}

function verdictColor(result, theme) {
  if (result.outcome === 'win') return theme.success;
  if (result.outcome === 'loss') return theme.danger;
  return theme.accent;
}

/* ------------------------------------------------------------------ */
/* Background / chrome                                                 */
/* ------------------------------------------------------------------ */
function drawBackground(ctx, theme) {
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#07070f');
  bg.addColorStop(0.5, theme.bg);
  bg.addColorStop(1, '#160e2c');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const left = ctx.createRadialGradient(160, 300, 20, 160, 300, 920);
  left.addColorStop(0, withAlpha(theme.you, 0.20));
  left.addColorStop(1, withAlpha(theme.you, 0));
  ctx.fillStyle = left; ctx.fillRect(0, 0, W, H);

  const right = ctx.createRadialGradient(W - 160, 720, 20, W - 160, 720, 920);
  right.addColorStop(0, withAlpha(theme.them, 0.20));
  right.addColorStop(1, withAlpha(theme.them, 0));
  ctx.fillStyle = right; ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  for (let x = 40; x < W; x += 40) {
    for (let y = 40; y < H; y += 40) {
      ctx.beginPath(); ctx.arc(x, y, 1.5, 0, Math.PI * 2); ctx.fill();
    }
  }

  strokeRounded(ctx, 30, 30, W - 60, H - 60, 36, 'rgba(255,255,255,0.11)', 2);
  strokeRounded(ctx, 46, 46, W - 92, H - 92, 28, withAlpha(theme.accent, 0.22), 1.5);

  const line = ctx.createLinearGradient(60, 0, W - 60, 0);
  line.addColorStop(0, theme.you);
  line.addColorStop(0.5, theme.accent);
  line.addColorStop(1, theme.them);
  ctx.fillStyle = line;
  ctx.fillRect(62, 46, W - 124, 6);
}

function drawHeader(ctx, theme, result, logo) {
  fillRounded(ctx, 88, 76, 84, 84, 22, 'rgba(255,255,255,0.06)');
  strokeRounded(ctx, 88, 76, 84, 84, 22, 'rgba(255,255,255,0.18)', 2);
  if (logo) {
    ctx.save(); roundedRect(ctx, 94, 82, 72, 72, 18); ctx.clip();
    ctx.drawImage(logo, 94, 82, 72, 72); ctx.restore();
  }

  ctx.fillStyle = theme.text;
  ctx.font = `900 46px ${FONT}`;
  ctx.fillText('APEX WIKI & VALUES', 192, 118);
  ctx.fillStyle = theme.dim;
  ctx.font = `800 21px ${FONT}`;
  ctx.fillText('TRADE REPORT  ·  COMMUNITY ESTIMATES, NOT OFFICIAL PRICES', 194, 152);

  const color = verdictColor(result, theme);
  fillRounded(ctx, 1236, 74, 476, 94, 26, 'rgba(255,255,255,0.055)');
  strokeRounded(ctx, 1236, 74, 476, 94, 26, color, 3, 0.85);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = color;
  ctx.font = `900 42px ${FONT}`;
  ctx.fillText(String(result.verdict || 'FAIR').toUpperCase(), 1474, 122);
  ctx.fillStyle = theme.dim;
  ctx.font = `800 20px ${FONT}`;
  const pct = Number.isFinite(result.percentDiff) ? result.percentDiff.toFixed(1) : '0.0';
  ctx.fillText(`${formatCompactNumber(Math.abs(result.diff || 0))} diff  ·  ${pct}%`, 1474, 152);
  ctx.restore();
}

/* ------------------------------------------------------------------ */
/* Side panels                                                         */
/* ------------------------------------------------------------------ */
function drawRow(ctx, entry, { x, y, w, h, accent, theme, image }) {
  fillRounded(ctx, x, y, w, h, 16, theme.elevated, 0.72);
  strokeRounded(ctx, x, y, w, h, 16, accent, 1.5, 0.26);

  const size = 48;
  const ix = x + 14;
  const iy = y + (h - size) / 2;
  fillRounded(ctx, ix, iy, size, size, 13, accent, 0.16);
  if (image) {
    ctx.save(); roundedRect(ctx, ix, iy, size, size, 13); ctx.clip();
    drawImageCover(ctx, image, ix, iy, size, size); ctx.restore();
  } else {
    ctx.fillStyle = theme.text;
    ctx.font = `900 24px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(String(entry.name || '?').trim()[0] || '?', ix + size / 2, iy + 32);
    ctx.textAlign = 'left';
  }

  const name = `${entry.quantity || 1}× ${entry.name || entry.slug || 'Custom item'}`;
  ctx.fillStyle = theme.text;
  ctx.font = `900 23px ${FONT}`;
  ctx.fillText(name.length > 30 ? `${name.slice(0, 29)}…` : name, x + 76, y + 27);

  const rarity = entry.rarity || (entry.kind === 'currency' ? 'Currency' : entry.kind || 'Custom');
  ctx.fillStyle = entry.rarity ? safeColor(getRarityGlow(entry.rarity), theme.dim) : theme.faint;
  ctx.font = `800 15px ${FONT}`;
  ctx.fillText(String(rarity), x + 76, y + 49);

  ctx.textAlign = 'right';
  ctx.fillStyle = theme.text;
  ctx.font = `900 23px ${FONT}`;
  ctx.fillText(formatCompactNumber(entry.tradeValue || 0), x + w - 18, y + 27);
  ctx.fillStyle = theme.faint;
  ctx.font = `800 14px ${FONT}`;
  ctx.fillText(`${formatCompactNumber(entry.unitValue || 0)} each`, x + w - 18, y + 49);
  ctx.textAlign = 'left';
}

function drawSidePanel(ctx, { label, entries, total, x, y, w, h, color, theme, iconMap }) {
  fillRounded(ctx, x, y, w, h, 30, 'rgba(11,11,24,0.78)');
  strokeRounded(ctx, x, y, w, h, 30, color, 3, 0.72);

  ctx.save();
  roundedRect(ctx, x, y, w, h, 30); ctx.clip();
  const bar = ctx.createLinearGradient(x, y, x + w, y);
  bar.addColorStop(0, color);
  bar.addColorStop(1, withAlpha(color, 0));
  ctx.fillStyle = bar; ctx.fillRect(x, y, w, 7);
  ctx.restore();

  ctx.fillStyle = color;
  ctx.font = `900 32px ${FONT}`;
  ctx.fillText(label, x + 34, y + 60);

  ctx.textAlign = 'right';
  ctx.fillStyle = theme.text;
  ctx.font = `900 46px ${FONT}`;
  ctx.fillText(formatCompactNumber(total || 0), x + w - 34, y + 60);
  ctx.fillStyle = theme.faint;
  ctx.font = `800 16px ${FONT}`;
  ctx.fillText('TOTAL VALUE', x + w - 34, y + 86);
  ctx.textAlign = 'left';

  const rows = (entries || []).slice(0, 7);
  rows.forEach((entry, i) => drawRow(ctx, entry, {
    x: x + 26, y: y + 112 + i * 72, w: w - 52, h: 64,
    accent: color, theme, image: iconMap.get(entry.slug),
  }));

  if (!rows.length) {
    ctx.fillStyle = theme.faint;
    ctx.font = `800 26px ${FONT}`;
    ctx.fillText('No entries added', x + 40, y + 160);
  }
  if ((entries || []).length > rows.length) {
    ctx.fillStyle = theme.dim;
    ctx.font = `800 19px ${FONT}`;
    ctx.fillText(`+${entries.length - rows.length} more entries not shown`, x + 40, y + h - 22);
  }
}

function drawVsBadge(ctx, theme) {
  const cx = 900;
  const cy = 570;
  ctx.save();
  ctx.shadowColor = withAlpha(theme.accent, 0.7);
  ctx.shadowBlur = 26;
  ctx.beginPath(); ctx.arc(cx, cy, 46, 0, Math.PI * 2);
  ctx.fillStyle = '#111124'; ctx.fill();
  ctx.lineWidth = 4;
  const ring = ctx.createLinearGradient(cx - 46, cy - 46, cx + 46, cy + 46);
  ring.addColorStop(0, theme.you); ring.addColorStop(1, theme.them);
  ctx.strokeStyle = ring; ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ffffff';
  ctx.font = `900 30px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText('VS', cx, cy + 11);
  ctx.restore();
}

function drawVerdict(ctx, theme, result) {
  const color = verdictColor(result, theme);
  const x = 430; const y = 920; const w = 940; const h = 104;
  fillRounded(ctx, x, y, w, h, 28, 'rgba(11,11,24,0.88)');
  strokeRounded(ctx, x, y, w, h, 28, color, 4, 0.85);

  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = color;
  ctx.font = `900 50px ${FONT}`;
  ctx.fillText(String(result.verdict || 'FAIR').toUpperCase(), W / 2, y + 50);
  ctx.fillStyle = theme.dim;
  ctx.font = `800 21px ${FONT}`;
  const favor = result.favors ? `Favors ${result.favors === 'you' ? 'YOU' : 'THEM'}` : 'Perfectly balanced';
  ctx.fillText(`${favor}  ·  ${formatCompactNumber(Math.abs(result.diff || 0))} value difference`, W / 2, y + 78);
  ctx.restore();

  // Split bar: visual proportion of the two totals.
  const a = Math.max(0, Number(result.totalA) || 0);
  const b = Math.max(0, Number(result.totalB) || 0);
  const sum = a + b;
  const bx = x + 40; const by = y + h - 12; const bw = w - 80;
  fillRounded(ctx, bx, by, bw, 7, 4, 'rgba(255,255,255,0.10)');
  if (sum > 0) {
    const aw = Math.max(8, (a / sum) * bw);
    fillRounded(ctx, bx, by, aw, 7, 4, theme.you, 0.9);
    fillRounded(ctx, bx + aw, by, Math.max(0, bw - aw), 7, 4, theme.them, 0.9);
  }
}

function drawFooter(ctx, theme) {
  ctx.fillStyle = theme.faint;
  ctx.font = `800 19px ${FONT}`;
  ctx.fillText(SITE_URL, 88, H - 46);
  ctx.textAlign = 'center';
  ctx.fillText('Values are community estimates · verify before trading', W / 2, H - 46);
  ctx.textAlign = 'right';
  ctx.fillText(new Date().toLocaleString(), W - 88, H - 46);
  ctx.textAlign = 'left';
}

/* ------------------------------------------------------------------ */
/* Asset loading + public render entry point                           */
/* ------------------------------------------------------------------ */
function isSameOrigin(url) {
  if (!url) return true;
  if (url.startsWith('/') || url.startsWith('.') || url.startsWith('data:') || url.startsWith('blob:')) return true;
  try { return new URL(url).hostname === window.location.hostname; } catch { return true; }
}

function loadImage(src, sameOrigin = true) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    if (!sameOrigin) image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

/**
 * Render the trade as a 1800x1120 canvas.
 * @returns {Promise<HTMLCanvasElement>}
 */
export async function renderTradeCard({ computedA = [], computedB = [], result = {} }) {
  const theme = readCanvasTheme();
  const rows = [...computedA, ...computedB];
  const iconMap = new Map();

  await Promise.all(rows.map(async (entry) => {
    const src = entry.kind === 'unit'
      ? (entry.imageUrl || getUnitIcon(entry.slug, isShinyRarity(entry.rarity)) || providedArtFor(entry.slug))
      : (entry.imageUrl || entry.image_url || entry.image || providedArtFor(entry.slug));
    if (!src || iconMap.has(entry.slug)) return;
    try {
      // Cross-origin art must opt in with CORS headers; if it does not, we
      // simply fall back to the letter tile instead of tainting the canvas
      // (a tainted canvas cannot be exported as a PNG).
      const sameOrigin = isSameOrigin(src);
      iconMap.set(entry.slug, await loadImage(src, sameOrigin));
    } catch {
      iconMap.set(entry.slug, null);
    }
  }));

  let logo = null;
  try { logo = await loadImage(tradeLogo, true); } catch { logo = null; }

  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  drawBackground(ctx, theme);
  drawHeader(ctx, theme, result, logo);
  drawSidePanel(ctx, {
    label: 'YOU GIVE', entries: computedA, total: result.totalA,
    x: 88, y: 240, w: 760, h: 660, color: theme.you, theme, iconMap,
  });
  drawSidePanel(ctx, {
    label: 'THEY GIVE', entries: computedB, total: result.totalB,
    x: 952, y: 240, w: 760, h: 660, color: theme.them, theme, iconMap,
  });
  drawVsBadge(ctx, theme);
  drawVerdict(ctx, theme, result);
  drawFooter(ctx, theme);

  return canvas;
}

export function canvasToBlob(canvas) {
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), 'image/png'));
}

export function downloadCanvas(canvas) {
  const link = document.createElement('a');
  link.href = canvas.toDataURL('image/png');
  link.download = `apex-trade-${new Date().toISOString().slice(0, 10)}.png`;
  document.body.appendChild(link);
  link.click();
  link.remove();
}
