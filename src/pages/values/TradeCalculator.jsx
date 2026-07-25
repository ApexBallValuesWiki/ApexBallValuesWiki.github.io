import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import PageShell from '../../components/PageShell';
import { VALUES_NAV } from '../../config/navigation';
import { DEMAND, SCARCITY, getRarityGlow, isShinyRarity } from '../../data/taxonomy';
import { useLiveValues } from '../../hooks/useLiveValues';
import { evaluateTrade } from '../../utils/calculator';
import { encodeState, decodeState, loadFromLocalStorage, saveToLocalStorage } from '../../utils/tradePersistence';
import UnitIcon from '../../components/UnitIcon';
import { getUnitIcon } from '../../data/unitIcons';
import ValueEntryPicker from '../../components/ValueEntryPicker';
import { formatCompactNumber, formatFullNumber } from '../../utils/formatNumber';
import AdSlot from '../../components/AdSlot';
import './TradeCalculator.css';

let idCounter = 0;
const nextId = () => ++idCounter;

const HISTORY_KEY = 'apex-trade-history-v1';
const RECENT_KEY = 'apex-trade-recent-v1';
const MAX_HISTORY = 12;
const MAX_RECENT = 10;

function clampQty(raw) {
  return Math.min(8000, Math.max(1, Math.floor(Number(raw) || 1)));
}

function loadStoredList(key) {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveStoredList(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore blocked storage
  }
}

// Every row is LINKED to a real unit/item by slug — its baseValue/demand/
// scarcity always come live from the shared values data (src/data/values.js).
// Custom manual entries have been removed entirely per current design.
function makeLinkedEntry(slug, quantity = 1) {
  return { id: nextId(), slug, quantity: clampQty(quantity) };
}

function resolveEntry(entry, valueEntries) {
  const source = valueEntries.find((valueEntry) => valueEntry.slug === entry.slug);
  if (!source) return { ...entry, missing: true, tradeValue: 0 };
  const unitValue = source.tradeValue ?? 0;
  return {
    ...entry,
    name: source.name,
    rarity: source.rarity,
    kind: source.kind,
    demand: source.demand,
    scarcity: source.scarcity,
    imageUrl: source.imageUrl ?? source.image_url ?? source.image ?? null,
    image_url: source.imageUrl ?? source.image_url ?? source.image ?? null,
    unitValue,
    tradeValue: unitValue * entry.quantity,
  };
}

function serializeSide(entries) {
  return entries.filter((e) => e.slug).map((e) => [e.slug, e.quantity]);
}

function deserializeSide(data) {
  if (!Array.isArray(data)) return [];
  return data
    .filter((row) => Array.isArray(row) && row[0])
    .map(([slug, quantity]) => makeLinkedEntry(slug, clampQty(quantity)));
}

export default function TradeCalculator() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [sideA, setSideA] = useState([]);
  const [sideB, setSideB] = useState([]);
  const [copied, setCopied] = useState(false);
  const [imageCopied, setImageCopied] = useState(false);
  const [history, setHistory] = useState(() => loadStoredList(HISTORY_KEY));
  const [recentSlugs, setRecentSlugs] = useState(() => loadStoredList(RECENT_KEY));
  const { allValueEntries, error: liveValuesError } = useLiveValues();
  const hydrated = useRef(false);
  const persistTimer = useRef(null);
  const lastEncoded = useRef(null);

  // Hydrate once on mount: prefer the ?trade= URL param (shareable link),
  // fall back to the last session saved in localStorage.
  useEffect(() => {
    const fromUrl = searchParams.get('trade');
    const decoded = fromUrl ? decodeState(fromUrl) : null;
    const initial = decoded || loadFromLocalStorage();
    if (initial) {
      setSideA(deserializeSide(initial.a));
      setSideB(deserializeSide(initial.b));
    }
    hydrated.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist after initial hydration. URL/localStorage writes are debounced
  // so quantity button spam stays responsive instead of forcing a router URL
  // update on every single click.
  useEffect(() => {
    if (!hydrated.current) return undefined;

    const state = { a: serializeSide(sideA), b: serializeSide(sideB) };
    clearTimeout(persistTimer.current);
    persistTimer.current = setTimeout(() => {
      saveToLocalStorage(state);
      const encoded = encodeState(state);

      if (encoded && encoded !== lastEncoded.current) {
        lastEncoded.current = encoded;
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev);
          next.set('trade', encoded);
          return next;
        }, { replace: true });
      }
    }, 180);

    return () => clearTimeout(persistTimer.current);
  }, [sideA, sideB, setSearchParams]);

  const computedA = useMemo(() => sideA.map((entry) => resolveEntry(entry, allValueEntries)), [sideA, allValueEntries]);
  const computedB = useMemo(() => sideB.map((entry) => resolveEntry(entry, allValueEntries)), [sideB, allValueEntries]);
  const result = useMemo(() => evaluateTrade(computedA, computedB), [computedA, computedB]);
  const recentEntries = useMemo(
    () => recentSlugs.map((slug) => allValueEntries.find((entry) => entry.slug === slug)).filter(Boolean),
    [recentSlugs, allValueEntries]
  );

  function swapSides() {
    setSideA(sideB);
    setSideB(sideA);
  }

  function rememberRecent(valueEntry) {
    if (!valueEntry?.slug) return;
    setRecentSlugs((prev) => {
      const next = [valueEntry.slug, ...prev.filter((slug) => slug !== valueEntry.slug)].slice(0, MAX_RECENT);
      saveStoredList(RECENT_KEY, next);
      return next;
    });
  }

  function saveCurrentTrade() {
    const state = { a: serializeSide(sideA), b: serializeSide(sideB) };
    const entry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      savedAt: new Date().toISOString(),
      state,
      result,
      sideA: computedA.map((e) => ({ name: e.name, quantity: e.quantity, tradeValue: e.tradeValue })),
      sideB: computedB.map((e) => ({ name: e.name, quantity: e.quantity, tradeValue: e.tradeValue })),
    };
    setHistory((prev) => {
      const next = [entry, ...prev].slice(0, MAX_HISTORY);
      saveStoredList(HISTORY_KEY, next);
      return next;
    });
  }

  function saveCompareSnapshot() {
    saveCurrentTrade();
    requestAnimationFrame(() => {
      document.querySelector('.calc-history')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  function loadHistoryTrade(entry) {
    setSideA(deserializeSide(entry.state?.a));
    setSideB(deserializeSide(entry.state?.b));
  }

  function deleteHistoryTrade(id) {
    setHistory((prev) => {
      const next = prev.filter((entry) => entry.id !== id);
      saveStoredList(HISTORY_KEY, next);
      return next;
    });
  }

  async function exportTradeCard() {
    const rootStyles = getComputedStyle(document.documentElement);
    const theme = {
      bg: rootStyles.getPropertyValue('--bg').trim() || '#000000',
      card: rootStyles.getPropertyValue('--bg-card').trim() || '#050505',
      elevated: rootStyles.getPropertyValue('--bg-elevated').trim() || '#080808',
      text: rootStyles.getPropertyValue('--text').trim() || '#ffffff',
      dim: rootStyles.getPropertyValue('--text-dim').trim() || '#bfbfbf',
      faint: rootStyles.getPropertyValue('--text-faint').trim() || '#7a7a7a',
      border: rootStyles.getPropertyValue('--border-strong').trim() || '#ffffff',
      accent: rootStyles.getPropertyValue('--accent').trim() || '#ffffff',
      success: rootStyles.getPropertyValue('--success').trim() || '#4dff88',
      danger: rootStyles.getPropertyValue('--danger').trim() || '#ff4d4d',
      you: rootStyles.getPropertyValue('--you-color-theme').trim() || '#4d9dff',
      them: rootStyles.getPropertyValue('--them-color-theme').trim() || '#ff4d5e',
    };

    const allRows = [...computedA, ...computedB];
    const iconMap = new Map();
    await Promise.all(allRows.map(async (entry) => {
      const src = entry.kind === 'unit' 
        ? (entry.imageUrl || getUnitIcon(entry.slug, isShinyRarity(entry.rarity))) 
        : (entry.imageUrl || entry.image_url || entry.image || null);
      if (!src || iconMap.has(entry.slug)) return;
      try {
        let cleanSrc = src;
        const sameOrig = isSameOrigin(src);
        if (!sameOrig) {
          cleanSrc = (src.startsWith('data:') || src.startsWith('blob:')) ? src : `${src}${src.includes('?') ? '&' : '?'}cors-bypass=1`;
        }
        iconMap.set(entry.slug, await loadCanvasImage(cleanSrc, sameOrig));
      } catch (err) {
        console.warn(`Failed to load canvas image for ${entry.slug}:`, err);
        iconMap.set(entry.slug, null);
      }
    }));

    const canvas = document.createElement('canvas');
    canvas.width = 1800;
    canvas.height = 1120;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingQuality = 'high';

    drawTradeCardBackground(ctx, canvas, theme);
    drawTradeCardHeader(ctx, theme, result);

    drawTradeSidePanel(ctx, {
      label: 'YOU GIVE',
      entries: computedA,
      total: result.totalA,
      x: 88,
      y: 252,
      w: 760,
      h: 640,
      color: theme.you,
      theme,
      iconMap,
    });

    drawTradeSidePanel(ctx, {
      label: 'THEY GIVE',
      entries: computedB,
      total: result.totalB,
      x: 952,
      y: 252,
      w: 760,
      h: 640,
      color: theme.them,
      theme,
      iconMap,
    });

    drawTradeVerdict(ctx, canvas, theme, result);
    drawTradeFooter(ctx, canvas, theme);

    const blob = await canvasToBlob(canvas);
    try {
      if (!navigator.clipboard?.write || !window.ClipboardItem) throw new Error('Clipboard image write unavailable');
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      setImageCopied(true);
      setTimeout(() => setImageCopied(false), 1800);
    } catch {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `apex-trade-${new Date().toISOString().slice(0, 10)}.png`;
      link.click();
      URL.revokeObjectURL(link.href);
    }
  }

  async function copyShareLink() {
    try {
      const state = { a: serializeSide(sideA), b: serializeSide(sideB) };
      const encoded = encodeState(state);
      const shareUrl = new URL(window.location.href);

      if (encoded) {
        // Clean URLs keep the route query in ?search. Build the copied URL
        // directly from the current address so Share is always current, even
        // while normal persistence is debounced for speed.
        const cleanParams = new URLSearchParams(shareUrl.search);
        cleanParams.set('trade', encoded);
        shareUrl.search = `?${cleanParams.toString()}`;
        shareUrl.hash = '';

        lastEncoded.current = encoded;
        saveToLocalStorage(state);
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev);
          next.set('trade', encoded);
          return next;
        }, { replace: true });
      }

      await navigator.clipboard.writeText(shareUrl.toString());
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard unavailable — silently ignore
    }
  }

  return (
    <PageShell sidebarTitle="VALUES" navTree={VALUES_NAV}>
      <div className="calc-page-head">
        <div>
          <h1>Trade Calculator</h1>
          <p className="crumb">Values / Trade Calculator</p>
          {liveValuesError && <p className="pending-flag">Live values could not load; using bundled fallback values.</p>}
        </div>
        <div className="calc-page-actions">
          <button type="button" className="calc-swap" onClick={swapSides}>
            ⇄ Swap
          </button>
          <button type="button" className="calc-share" onClick={saveCompareSnapshot}>
            ⚖ Compare
          </button>
          <button type="button" className="calc-share" onClick={saveCurrentTrade}>
            💾 Save
          </button>
          <button type="button" className="calc-share" onClick={exportTradeCard}>
            {imageCopied ? '✓ Copied Image!' : '🖼️ Export Image'}
          </button>
          <button type="button" className="calc-share" onClick={copyShareLink}>
            {copied ? '✓ Copied!' : '🔗 Share Trade'}
          </button>
        </div>
      </div>

      <div className="calc-arena">
        <TradeSide
          side="A"
          label="YOU"
          entries={sideA}
          setEntries={setSideA}
          computed={computedA}
          valueEntries={allValueEntries}
          recentEntries={recentEntries}
          rememberRecent={rememberRecent}
        />

        <VerdictColumn result={result} />

        <TradeSide
          side="B"
          label="THEM"
          entries={sideB}
          setEntries={setSideB}
          computed={computedB}
          valueEntries={allValueEntries}
          recentEntries={recentEntries}
          rememberRecent={rememberRecent}
        />
      </div>

      <TradeHistory history={history} onLoad={loadHistoryTrade} onDelete={deleteHistoryTrade} />
      <AdSlot slotId="2911497117" />
    </PageShell>
  );
}

function isSameOrigin(url) {
  if (!url) return true;
  if (url.startsWith('/') || url.startsWith('.') || url.startsWith('data:') || url.startsWith('blob:')) {
    return true;
  }
  try {
    const parsed = new URL(url);
    return parsed.hostname === window.location.hostname;
  } catch {
    return true;
  }
}

function loadCanvasImage(src, sameOrigin = true) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    if (!sameOrigin) {
      image.crossOrigin = 'anonymous';
    }
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function canvasToBlob(canvas) {
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), 'image/png'));
}

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

function fillRounded(ctx, x, y, w, h, r, fillStyle, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  roundedRect(ctx, x, y, w, h, r);
  ctx.fillStyle = fillStyle;
  ctx.fill();
  ctx.restore();
}

function strokeRounded(ctx, x, y, w, h, r, strokeStyle, lineWidth = 2, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  roundedRect(ctx, x, y, w, h, r);
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
  ctx.restore();
}

function drawTradeCardBackground(ctx, canvas, theme) {
  ctx.fillStyle = theme.bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const diagonal = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  diagonal.addColorStop(0, theme.you);
  diagonal.addColorStop(0.5, theme.accent);
  diagonal.addColorStop(1, theme.them);
  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = diagonal;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.12;
  ctx.strokeStyle = theme.border;
  ctx.lineWidth = 1;
  for (let x = 0; x <= canvas.width; x += 60) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y <= canvas.height; y += 60) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = '#ffffff';
  for (let y = 0; y < canvas.height; y += 8) {
    ctx.fillRect(0, y, canvas.width, 1);
  }
  ctx.restore();

  strokeRounded(ctx, 38, 38, canvas.width - 76, canvas.height - 76, 34, theme.border, 4, 0.85);
  strokeRounded(ctx, 56, 56, canvas.width - 112, canvas.height - 112, 26, theme.accent, 1.5, 0.28);
}

function drawTradeCardHeader(ctx, theme, result) {
  ctx.save();
  ctx.shadowColor = theme.accent;
  ctx.shadowBlur = 34;
  ctx.fillStyle = theme.text;
  ctx.font = '900 72px Montserrat, Arial';
  ctx.fillText('APEX', 88, 122);
  ctx.shadowBlur = 0;
  ctx.fillStyle = theme.dim;
  ctx.font = '900 30px Montserrat, Arial';
  ctx.fillText('VALUES // TRADE REPORT', 92, 164);
  ctx.restore();

  const pillColor = result.outcome === 'win' ? theme.success : result.outcome === 'loss' ? theme.danger : theme.accent;
  fillRounded(ctx, 1200, 82, 512, 96, 28, theme.card, 0.88);
  strokeRounded(ctx, 1200, 82, 512, 96, 28, pillColor, 3, 0.85);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = pillColor;
  ctx.shadowColor = pillColor;
  ctx.shadowBlur = 24;
  ctx.font = '900 44px Montserrat, Arial';
  ctx.fillText(result.verdict.toUpperCase(), 1456, 126);
  ctx.shadowBlur = 0;
  ctx.fillStyle = theme.dim;
  ctx.font = '800 22px Montserrat, Arial';
  ctx.fillText(`${formatCompactNumber(Math.abs(result.diff))} diff • ${result.percentDiff.toFixed(1)}%`, 1456, 158);
  ctx.restore();
}

function drawTradeSidePanel(ctx, { label, entries, total, x, y, w, h, color, theme, iconMap }) {
  fillRounded(ctx, x, y, w, h, 30, theme.card, 0.9);
  strokeRounded(ctx, x, y, w, h, 30, color, 3, 0.72);

  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = 20;
  ctx.fillStyle = color;
  ctx.font = '900 34px Montserrat, Arial';
  ctx.fillText(label, x + 34, y + 58);
  ctx.restore();

  ctx.save();
  ctx.textAlign = 'right';
  ctx.fillStyle = theme.text;
  ctx.font = '900 38px Montserrat, Arial';
  ctx.fillText(formatCompactNumber(total), x + w - 34, y + 58);
  ctx.fillStyle = theme.faint;
  ctx.font = '800 17px Montserrat, Arial';
  ctx.fillText('TOTAL VALUE', x + w - 34, y + 84);
  ctx.restore();

  const rows = entries.length ? entries.slice(0, 7) : [];
  const rowYStart = y + 118;
  rows.forEach((entry, index) => {
    drawTradeRow(ctx, entry, {
      x: x + 28,
      y: rowYStart + index * 72,
      w: w - 56,
      h: 58,
      accent: color,
      theme,
      image: iconMap.get(entry.slug),
    });
  });

  if (entries.length === 0) {
    ctx.fillStyle = theme.faint;
    ctx.font = '800 27px Montserrat, Arial';
    ctx.fillText('No entries added', x + 42, rowYStart + 42);
  }

  if (entries.length > 7) {
    fillRounded(ctx, x + 28, rowYStart + 7 * 72, w - 56, 52, 16, theme.elevated, 0.8);
    ctx.fillStyle = theme.dim;
    ctx.font = '800 23px Montserrat, Arial';
    ctx.fillText(`+${entries.length - 7} more entries`, x + 52, rowYStart + 7 * 72 + 34);
  }
}

function drawTradeRow(ctx, entry, { x, y, w, h, accent, theme, image }) {
  fillRounded(ctx, x, y, w, h, 18, theme.elevated, 0.86);
  strokeRounded(ctx, x, y, w, h, 18, accent, 1.5, 0.28);

  const iconSize = 42;
  const iconX = x + 14;
  const iconY = y + 8;
  fillRounded(ctx, iconX, iconY, iconSize, iconSize, 12, accent, 0.18);
  strokeRounded(ctx, iconX, iconY, iconSize, iconSize, 12, accent, 1.2, 0.7);

  if (image) {
    ctx.save();
    roundedRect(ctx, iconX, iconY, iconSize, iconSize, 12);
    ctx.clip();
    ctx.drawImage(image, iconX, iconY, iconSize, iconSize);
    ctx.restore();
  } else {
    ctx.fillStyle = theme.text;
    ctx.font = '900 22px Montserrat, Arial';
    ctx.textAlign = 'center';
    ctx.fillText(entry.name?.[0] || '?', iconX + iconSize / 2, iconY + 28);
    ctx.textAlign = 'left';
  }

  ctx.fillStyle = theme.text;
  ctx.font = '900 24px Montserrat, Arial';
  const displayName = entry.name || entry.slug || 'Custom Item';
  const name = `${entry.quantity}× ${displayName}`;
  ctx.fillText(name.length > 26 ? `${name.slice(0, 25)}…` : name, x + 70, y + 29);
  const displayRarity = entry.rarity || (entry.kind === 'item' ? 'Item' : entry.kind || 'Custom');
  ctx.fillStyle = getRarityGlow(entry.rarity || 'Normie') || theme.dim;
  ctx.font = '800 15px Montserrat, Arial';
  ctx.fillText(displayRarity, x + 70, y + 48);

  ctx.textAlign = 'right';
  ctx.fillStyle = theme.text;
  ctx.font = '900 24px Montserrat, Arial';
  ctx.fillText(formatCompactNumber(entry.tradeValue || 0), x + w - 18, y + 28);
  ctx.fillStyle = theme.faint;
  ctx.font = '800 14px Montserrat, Arial';
  ctx.fillText(`${formatCompactNumber(entry.unitValue || 0)} each`, x + w - 18, y + 48);
  ctx.textAlign = 'left';
}

function drawTradeVerdict(ctx, canvas, theme, result) {
  const color = result.outcome === 'win' ? theme.success : result.outcome === 'loss' ? theme.danger : theme.accent;
  const x = 470;
  const y = 922;
  const w = 860;
  const h = 112;
  fillRounded(ctx, x, y, w, h, 30, theme.card, 0.92);
  strokeRounded(ctx, x, y, w, h, 30, color, 4, 0.9);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 30;
  ctx.font = '900 54px Montserrat, Arial';
  ctx.fillText(result.verdict.toUpperCase(), canvas.width / 2, y + 64);
  ctx.shadowBlur = 0;
  ctx.fillStyle = theme.dim;
  ctx.font = '800 21px Montserrat, Arial';
  const favor = result.favors ? `Favors ${result.favors === 'you' ? 'YOU' : 'THEM'}` : 'Perfectly balanced';
  ctx.fillText(`${favor} • ${formatCompactNumber(Math.abs(result.diff))} value difference`, canvas.width / 2, y + 92);
  ctx.restore();
}

function drawTradeFooter(ctx, canvas, theme) {
  ctx.fillStyle = theme.faint;
  ctx.font = '800 19px Montserrat, Arial';
  ctx.fillText('Generated by APEX Values & Wiki', 88, canvas.height - 64);
  ctx.textAlign = 'right';
  ctx.fillText(new Date().toLocaleString(), canvas.width - 88, canvas.height - 64);
  ctx.textAlign = 'left';
}

function overpayLabel(result) {
  if (result.diff > 0) {
    return `THEM overpays by ${formatCompactNumber(Math.abs(result.diff))} (${result.percentDiff.toFixed(1)}%)`;
  }
  if (result.diff < 0) {
    return `YOU overpay by ${formatCompactNumber(Math.abs(result.diff))} (${result.percentDiff.toFixed(1)}%)`;
  }
  return 'No overpay — perfectly even';
}

function VerdictColumn({ result }) {
  return (
    <div className="calc-verdict-col">
      <div className="calc-vs-mark">VS</div>
      <motion.div
        key={result.verdict}
        className={`calc-verdict-badge ${verdictClass(result)}`}
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      >
        {result.verdict}
      </motion.div>
      {result.diff !== 0 && (
        <div className="calc-verdict-diff">
          {overpayLabel(result)}
        </div>
      )}
      <div className="calc-verdict-bars">
        <TotalBar label="YOU" total={result.totalA} max={Math.max(result.totalA, result.totalB, 1)} colorVar="--you-color" />
        <TotalBar label="THEM" total={result.totalB} max={Math.max(result.totalA, result.totalB, 1)} colorVar="--them-color" />
      </div>
    </div>
  );
}

function TotalBar({ label, total, max, colorVar }) {
  const percent = Math.max(4, (total / max) * 100);
  return (
    <div className="calc-total-bar-block">
      <div className="calc-total-bar-label">
        <span>{label}</span>
        <span title={`${formatFullNumber(total)} exact`}>{formatCompactNumber(total)}</span>
      </div>
      <div className="calc-total-bar-track">
        <motion.div
          className="calc-total-bar-fill"
          style={{ background: `var(${colorVar})`, boxShadow: `0 0 12px var(${colorVar})` }}
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </div>
  );
}

function verdictClass(result) {
  if (result.outcome === 'win') return 'win';
  if (result.outcome === 'loss') return 'loss';
  return 'fair';
}

function multiplierLabel(table, label) {
  const mult = table[label];
  if (mult == null) return label;
  return `${label} (${mult}×)`;
}

function TradeHistory({ history, onLoad, onDelete }) {
  if (!history?.length) return null;

  return (
    <section className="calc-history">
      <h2>Recent Trades</h2>
      <div className="calc-history-grid">
        {history.map((entry) => (
          <div key={entry.id} className="calc-history-card">
            <div className="calc-history-head">
              <span>{new Date(entry.savedAt).toLocaleString()}</span>
              <b>{entry.result?.verdict || 'Trade'}</b>
            </div>
            <div className="calc-history-sides">
              <HistorySide label="YOU" rows={entry.sideA} />
              <HistorySide label="THEM" rows={entry.sideB} />
            </div>
            <div className="calc-history-actions">
              <button type="button" onClick={() => onLoad(entry)}>Load</button>
              <button type="button" onClick={() => onDelete(entry.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function HistorySide({ label, rows }) {
  return (
    <div>
      <strong>{label}</strong>
      {(rows || []).slice(0, 3).map((row, index) => (
        <span key={`${row.name}-${index}`}>{row.quantity}× {row.name}</span>
      ))}
      {(rows || []).length > 3 && <em>+{rows.length - 3} more</em>}
    </div>
  );
}

function TradeSide({ side, label, entries, setEntries, computed, valueEntries, recentEntries, rememberRecent }) {
  const total = computed.reduce((sum, e) => sum + (e.tradeValue || 0), 0);
  const sideClass = side === 'A' ? 'calc-side-you' : 'calc-side-them';

  const updateQuantity = (id, quantity) => {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, quantity: clampQty(quantity) } : e)));
  };

  const addLinked = (valueEntry) => {
    rememberRecent?.(valueEntry);
    setEntries((prev) => {
      const existing = prev.find((e) => e.slug === valueEntry.slug);
      if (existing) {
        return prev.map((e) => (e.slug === valueEntry.slug ? { ...e, quantity: clampQty(e.quantity + 1) } : e));
      }
      return [...prev, makeLinkedEntry(valueEntry.slug, 1)];
    });
  };

  const removeEntry = (id) => setEntries((prev) => prev.filter((e) => e.id !== id));
  const clearSide = () => setEntries([]);

  return (
    <div className={`calc-side ${sideClass}`}>
      <div className="calc-side-header">
        <h2 className="calc-side-title">{label}</h2>
        <div className="calc-side-header-right">
          <span className="calc-side-total" title={`${formatFullNumber(total)} exact`}>{formatCompactNumber(total)}</span>
          {entries.length > 0 && (
            <button type="button" className="calc-clear" onClick={clearSide}>
              Clear
            </button>
          )}
        </div>
      </div>

      <ValueEntryPicker onPick={addLinked} placeholder={`Add to ${label}'s side…`} entries={valueEntries} />

      {recentEntries?.length > 0 && (
        <div className="calc-quick-adds">
          <span>Recent</span>
          {recentEntries.slice(0, 5).map((entry) => (
            <button type="button" key={entry.slug} onClick={() => addLinked(entry)}>
              + {entry.name}
            </button>
          ))}
        </div>
      )}

      <div className="calc-entries">
        <AnimatePresence initial={false}>
          {entries.map((entry, idx) => {
            const resolved = computed[idx];
            if (!resolved) return null;
            const glow = getRarityGlow(resolved.rarity);

            return (
              <motion.div
                key={entry.id}
                className="calc-entry"
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: 'auto', marginBottom: 10 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.18}
                onDragEnd={(_, info) => {
                  if (Math.abs(info.offset.x) > 120) removeEntry(entry.id);
                }}
                title="Drag sideways to remove"
              >
                <UnitIcon
                  slug={entry.slug}
                  name={resolved.name}
                  glowColor={glow}
                  shiny={isShinyRarity(resolved.rarity)}
                  size={44}
                  imageUrl={resolved.imageUrl}
                />
                <div className="calc-entry-text">
                  <span className="calc-entry-name">{resolved.name}</span>
                  <span className="calc-entry-meta" style={{ color: glow }}>
                    {resolved.rarity}
                  </span>
                  <span className="calc-entry-tiers">
                    {multiplierLabel(DEMAND, resolved.demand)} · {multiplierLabel(SCARCITY, resolved.scarcity)}
                  </span>
                </div>

                <div className="calc-qty-control">
                  <button
                    type="button"
                    className="calc-qty-btn"
                    onClick={() => updateQuantity(entry.id, entry.quantity - 1)}
                    disabled={entry.quantity <= 1}
                  >
                    −
                  </button>
                  <input
                    className="calc-qty-input"
                    type="number"
                    min="1"
                    max="8000"
                    value={entry.quantity}
                    onChange={(e) => updateQuantity(entry.id, e.target.value)}
                    aria-label={`Quantity for ${resolved.name}`}
                  />
                  <button
                    type="button"
                    className="calc-qty-btn"
                    onClick={() => updateQuantity(entry.id, entry.quantity + 1)}
                    disabled={entry.quantity >= 8000}
                  >
                    +
                  </button>
                </div>

                <div className="calc-entry-value" title={`${formatFullNumber(resolved.tradeValue || 0)} exact`}>
                  {formatCompactNumber(resolved.tradeValue || 0)}
                </div>

                <button
                  type="button"
                  className="calc-remove"
                  onClick={() => removeEntry(entry.id)}
                  aria-label="Remove entry"
                >
                  ✕
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {entries.length === 0 && (
          <div className="calc-empty-side">Search above to add units or items to {label}'s side.</div>
        )}
      </div>
    </div>
  );
}