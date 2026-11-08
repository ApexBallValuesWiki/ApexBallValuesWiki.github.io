import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import PageShell from '../../components/PageShell';
import { VALUES_NAV } from '../../config/navigation';
import { getRarityGlow, isShinyRarity } from '../../data/taxonomy';
import { useLiveValues } from '../../hooks/useLiveValues';
import { evaluateTrade, valueFromGems, valueFromCoins, gemsFromValue, coinsFromValue } from '../../utils/calculator';
import { averageDemandPercent, demandVerdict } from '../../utils/valueRules';
import { encodeState, decodeState, loadFromLocalStorage, saveToLocalStorage } from '../../utils/tradePersistence';
import UnitIcon from '../../components/UnitIcon';
import ThemeCutout from '../../components/ThemeCutout';
import ValueEntryPicker from '../../components/ValueEntryPicker';
import { CURRENCIES, CURRENCY_BY_SLUG, clampQuantity, isCurrencySlug } from '../../data/currency';
import { formatCompactNumber, formatFullNumber, parseCompactValue } from '../../utils/formatNumber';
import AdSlot from '../../components/AdSlot';
import { incrementStat } from '../../utils/achievements';
import { renderTradeCard, canvasToBlob, downloadCanvas } from '../../utils/tradeCardRender';
import calculatorDecoration from '../../assets/units/provided/hephaestusball.png';
import './TradeCalculator.css';

let idCounter = 0;
const nextId = () => ++idCounter;

const HISTORY_KEY = 'apex-trade-history-v1';
const RECENT_KEY = 'apex-trade-recent-v1';
const MAX_HISTORY = 12;
const MAX_RECENT = 10;

// Every row is LINKED to a real unit/item by slug — its baseValue/demand/
// scarcity always come live from the shared values data (src/data/values.js).
// Custom manual entries have been removed entirely per current design.
// Quantity caps live in src/data/currency.js: units 9,999, currencies none.
function makeLinkedEntry(slug, quantity = 1) {
  return { id: nextId(), slug, quantity: clampQuantity(slug, quantity) };
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

function resolveEntry(entry, valueEntries) {
  // Currency rows (gems / coins): picked from the top of the add-picker like
  // any unit, amount entered via the quick-amount prompt. Converted with the
  // market ratio curve, which scales by tier — cheap trades sit near 100
  // coins per gem, omega trades near 50.
  if (isCurrencySlug(entry.slug)) {
    const meta = CURRENCY_BY_SLUG[entry.slug];
    const isGems = meta.kind === 'gems';
    const amount = Math.max(0, Number(entry.quantity) || 0);
    return {
      ...entry,
      name: meta.name,
      rarity: null,
      kind: 'currency',
      currencyIcon: meta.icon,
      imageUrl: meta.icon,
      image_url: meta.icon,
      amount,
      unitValue: amount ? (isGems ? valueFromGems(amount) : valueFromCoins(amount)) : 0,
      tradeValue: amount ? (isGems ? valueFromGems(amount) : valueFromCoins(amount)) : 0,
      unitValueMax: amount ? (isGems ? valueFromGems(amount) : valueFromCoins(amount)) : 0,
      tradeValueMax: amount ? (isGems ? valueFromGems(amount) : valueFromCoins(amount)) : 0,
    };
  }
  const source = valueEntries.find((valueEntry) => valueEntry.slug === entry.slug);
  if (!source) return { ...entry, missing: true, tradeValue: 0 };
  if (source.specialValue) {
    return { ...entry, name: source.name, rarity: source.rarity, kind: source.kind, imageUrl: source.imageUrl ?? null, image_url: source.imageUrl ?? null, unitValue: 0, tradeValue: 0, tradeValueMax: 0, specialValue: source.specialValue };
  }
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
    unitValueMax: Math.max(unitValue, Number(source.tradeValueMax) || 0),
    tradeValue: unitValue * entry.quantity,
    tradeValueMax: Math.max(unitValue, Number(source.tradeValueMax) || 0) * entry.quantity,
  };
}

function serializeSide(entries) {
  return entries.filter((e) => e.slug).map((e) => [e.slug, e.quantity]);
}

function deserializeSide(data) {
  if (!Array.isArray(data)) return [];
  return data
    .filter((row) => Array.isArray(row) && row[0])
    .map(([slug, quantity]) => makeLinkedEntry(slug, quantity));
}

export default function TradeCalculator() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [sideA, setSideA] = useState([]);
  const [sideB, setSideB] = useState([]);
  const [copied, setCopied] = useState(false);
  const [imageCopied, setImageCopied] = useState(false);
  const [pngSaved, setPngSaved] = useState(false);
  const [history, setHistory] = useState(() => loadStoredList(HISTORY_KEY));
  const [recentSlugs, setRecentSlugs] = useState(() => loadStoredList(RECENT_KEY));
  // { side: 'A' | 'B', currency } while the gems/coins amount prompt is open
  const [currencyModal, setCurrencyModal] = useState(null);
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
  // Value ranges: each row keeps a min (current value) and max (top of the
  // published range). Totals for both ends are shown under the value meter.
  const rangeTotals = useMemo(() => {
    const sum = (list, key) => list.reduce((total, entry) => total + (Number(entry[key]) || 0), 0);
    return {
      aMin: sum(computedA, 'tradeValue'), aMax: sum(computedA, 'tradeValueMax'),
      bMin: sum(computedB, 'tradeValue'), bMax: sum(computedB, 'tradeValueMax'),
    };
  }, [computedA, computedB]);
  const demandYou = useMemo(() => averageDemandPercent(computedA), [computedA]);
  const demandThem = useMemo(() => averageDemandPercent(computedB), [computedB]);
  const recentEntries = useMemo(
    () => recentSlugs.map((slug) => allValueEntries.find((entry) => entry.slug === slug)).filter(Boolean),
    [recentSlugs, allValueEntries]
  );

  function swapSides() {
    setSideA(sideB);
    setSideB(sideA);
  }

  function addCurrencyAmount(side, currency, amount) {
    const setter = side === 'A' ? setSideA : setSideB;
    setter((prev) => {
      const existing = prev.find((e) => e.slug === currency.slug);
      if (existing) {
        // A second pick of the same currency adds to the existing row.
        return prev.map((e) => (e.slug === currency.slug
          ? { ...e, quantity: clampQuantity(currency.slug, (Number(e.quantity) || 0) + amount) }
          : e));
      }
      return [...prev, { id: nextId(), slug: currency.slug, quantity: clampQuantity(currency.slug, amount) }];
    });
  }

  // "Close the gap": exact gems/coins that top up the lighter side, computed
  // backwards through the market-ratio curve (see gemsFromValue/coinsFromValue).
  const balanceAmounts = useMemo(() => {
    const gap = Math.abs(result.diff);
    if (!gap) return null;
    return { gems: gemsFromValue(gap), coins: coinsFromValue(gap) };
  }, [result.diff]);

  function balanceWithCurrency(kind) {
    const gap = Math.abs(result.diff);
    if (!gap || !balanceAmounts) return;
    const side = result.diff > 0 ? 'A' : 'B'; // diff>0: THEY side heavier -> top up YOU
    const currency = CURRENCIES.find((c) => c.kind === kind);
    const amount = kind === 'gems' ? balanceAmounts.gems : balanceAmounts.coins;
    if (!currency || !amount) return;
    addCurrencyAmount(side, currency, amount);
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

  // One render, two ways out: copy the PNG to the clipboard (falls back to a
  // file download when the browser blocks clipboard image writes), or save it
  // directly with the dedicated button.
  async function exportTradeCard() {
    let canvas;
    try {
      canvas = await renderTradeCard({ computedA, computedB, result });
    } catch (err) {
      console.error('Trade image render failed:', err);
      return;
    }
    const blob = await canvasToBlob(canvas);
    try {
      if (!blob || !navigator.clipboard?.write || !window.ClipboardItem) throw new Error('Clipboard image write unavailable');
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      setImageCopied(true);
    } catch {
      downloadCanvas(canvas);
      setPngSaved(true);
    }
    setTimeout(() => { setImageCopied(false); setPngSaved(false); }, 1800);
  }

  async function downloadTradeCard() {
    try {
      const canvas = await renderTradeCard({ computedA, computedB, result });
      downloadCanvas(canvas);
      setPngSaved(true);
      setTimeout(() => setPngSaved(false), 1800);
    } catch (err) {
      console.error('Trade image download failed:', err);
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
      incrementStat('trades_shared', 1);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard unavailable — silently ignore
    }
  }

  return (
    <PageShell sidebarTitle="VALUES" navTree={VALUES_NAV}>
      <div className="calc-page-head">
        <ThemeCutout
          variant="king"
          floating
          className="calc-head-cutout"
        />
        <div>
          <h1><ThemeCutout as="span" className="calc-heading-art" src={calculatorDecoration} /><span>Trade Calculator</span></h1>
          <p className="crumb">Values / Trade Calculator</p>
          {liveValuesError && <p className="pending-flag">Live values could not load; using bundled fallback values.</p>}
        </div>
        <div className="calc-page-actions">
          <button type="button" className="calc-swap" onClick={swapSides}>
            ⇄ Swap
          </button>
          <button type="button" className="calc-share" onClick={saveCurrentTrade}>
            💾 Save
          </button>
          <button type="button" className="calc-share" onClick={exportTradeCard}>
            {imageCopied ? '✓ Copied Image!' : '🖼️ Export Image'}
          </button>
          <button type="button" className="calc-share" onClick={downloadTradeCard}>
            {pngSaved ? '✓ Saved!' : '⬇️ Save PNG'}
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
          onPickCurrency={(currency) => setCurrencyModal({ side: 'A', currency })}
        />

        <VerdictColumn result={result} balanceAmounts={balanceAmounts} onBalance={balanceWithCurrency} ranges={rangeTotals} demandYou={demandYou} demandThem={demandThem} />

        <TradeSide
          side="B"
          label="THEY"
          entries={sideB}
          setEntries={setSideB}
          computed={computedB}
          valueEntries={allValueEntries}
          recentEntries={recentEntries}
          rememberRecent={rememberRecent}
          onPickCurrency={(currency) => setCurrencyModal({ side: 'B', currency })}
        />
      </div>

      <TradeHistory history={history} onLoad={loadHistoryTrade} onDelete={deleteHistoryTrade} />
      <AdSlot placement="calculator" />

      {currencyModal && (
        <CurrencyAmountModal
          sideLabel={currencyModal.side === 'A' ? 'YOU' : 'THEY'}
          currency={currencyModal.currency}
          existingAmount={(currencyModal.side === 'A' ? sideA : sideB).find((e) => e.slug === currencyModal.currency.slug)?.quantity || 0}
          onClose={() => setCurrencyModal(null)}
          onConfirm={(amount) => {
            addCurrencyAmount(currencyModal.side, currencyModal.currency, amount);
            setCurrencyModal(null);
          }}
        />
      )}
    </PageShell>
  );
}

function rangeLabel(min, max) {
  const lo = Number(min) || 0;
  const hi = Number(max) || 0;
  if (!lo && !hi) return '—';
  return hi > lo ? `${formatCompactNumber(lo)}–${formatCompactNumber(hi)}` : formatCompactNumber(lo);
}

function formatDemand(value) {
  return value === null || value === undefined ? 'N/A' : `${Math.round(value)}%`;
}

function MeterRow({ label, value, display, max, colorVar, rangeMax }) {
  const safeMax = Math.max(1, Number(max) || 1);
  const current = Number(value) || 0;
  const percent = Math.max(3, Math.min(100, (current / safeMax) * 100));
  const top = Number(rangeMax) || current;
  const rangePercent = Math.max(percent, Math.min(100, (top / safeMax) * 100));
  return (
    <div className="calc-meter-row" style={{ '--meter-color': `var(${colorVar})` }}>
      <div className="calc-meter-head">
        <span className="calc-meter-label">{label}</span>
        <span className="calc-meter-number">{display}</span>
      </div>
      <div className="calc-meter-track">
        <div className="calc-meter-range" style={{ width: `${rangePercent}%` }} />
        <div className="calc-meter-fill" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function overpayLabel(result) {
  if (result.diff > 0) {
    return `THEY overpay by ${formatCompactNumber(Math.abs(result.diff))} (${result.percentDiff.toFixed(1)}%)`;
  }
  if (result.diff < 0) {
    return `YOU overpay by ${formatCompactNumber(Math.abs(result.diff))} (${result.percentDiff.toFixed(1)}%)`;
  }
  return 'No overpay — perfectly even';
}

function VerdictColumn({ result, balanceAmounts, onBalance, ranges, demandYou, demandThem }) {
  const gemsMeta = CURRENCY_BY_SLUG['currency:gems'];
  const coinsMeta = CURRENCY_BY_SLUG['currency:coins'];
  // The top-up lands on the LIGHTER side (diff>0 means THEY give more).
  const topUpSide = result.diff > 0 ? 'YOUR' : 'THEIR';
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
      {/* Four directly comparable bars: YOU value, YOU demand, THEY value,
          THEY demand. Value ranges are drawn on the value bar itself (a
          lighter min->max segment) instead of a separate text block. */}
      <div className="calc-verdict-bars" data-calc-range data-calc-demand>
        <MeterRow label="VALUE" colorVar="--you-color"
          value={result.totalA} rangeMax={ranges?.aMax ?? result.totalA}
          max={Math.max(result.totalA, result.totalB, ranges?.aMax || 0, ranges?.bMax || 0, 1)}
          display={rangeLabel(ranges?.aMin ?? result.totalA, ranges?.aMax ?? result.totalA)} />
        <MeterRow label="DEMAND" colorVar="--you-color" value={demandYou || 0} max={100} display={formatDemand(demandYou)} />
        <MeterRow label="VALUE" colorVar="--them-color"
          value={result.totalB} rangeMax={ranges?.bMax ?? result.totalB}
          max={Math.max(result.totalA, result.totalB, ranges?.aMax || 0, ranges?.bMax || 0, 1)}
          display={rangeLabel(ranges?.bMin ?? result.totalB, ranges?.bMax ?? result.totalB)} />
        <MeterRow label="DEMAND" colorVar="--them-color" value={demandThem || 0} max={100} display={formatDemand(demandThem)} />
      </div>
      <div className="calc-w-summary">
        Avg offer demand: YOU {formatDemand(demandYou)} · THEY {formatDemand(demandThem)}
        <br />
        {result.favors === 'you' ? 'Value W for YOU' : result.favors === 'them' ? 'Value W for THEM' : 'Value even'}
        {' · '}{demandVerdict(demandYou, demandThem)}
      </div>
      {result.diff !== 0 && balanceAmounts && (
        <div className="calc-balance-block">
          <span className="calc-balance-label">Close the gap</span>
          <div className="calc-balance-buttons">
            {balanceAmounts.gems > 0 && (
              <button
                type="button"
                className="calc-balance-btn"
                onClick={() => onBalance('gems')}
                title={`Adds ${formatFullNumber(balanceAmounts.gems)} gems to ${topUpSide} side`}
              >
                <img src={gemsMeta.icon} alt="" />
                <span className="calc-balance-amount">+{formatCompactNumber(balanceAmounts.gems)}</span>
                <span className="calc-balance-name">Gems</span>
              </button>
            )}
            {balanceAmounts.coins > 0 && (
              <button
                type="button"
                className="calc-balance-btn"
                onClick={() => onBalance('coins')}
                title={`Adds ${formatFullNumber(balanceAmounts.coins)} coins to ${topUpSide} side`}
              >
                <img src={coinsMeta.icon} alt="" />
                <span className="calc-balance-amount">+{formatCompactNumber(balanceAmounts.coins)}</span>
                <span className="calc-balance-name">Coins</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function verdictClass(result) {
  if (result.outcome === 'win') return 'win';
  if (result.outcome === 'loss') return 'loss';
  return 'fair';
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

function TradeSide({ side, label, entries, setEntries, computed, valueEntries, recentEntries, rememberRecent, onPickCurrency }) {
  const total = computed.reduce((sum, e) => sum + (e.tradeValue || 0), 0);
  const sideClass = side === 'A' ? 'calc-side-you' : 'calc-side-them';

  // Currency amounts are typed as free text (K/M/B/T), so partial input like
  // "6." or "6.2" must NOT be collapsed to 0/6 mid-keystroke. Keep a local
  // draft for the input and only publish a number once the text parses.
  const [quantityDrafts, setQuantityDrafts] = useState({});
  const clearQuantityDraft = (id) => setQuantityDrafts((prev) => {
    if (!(id in prev)) return prev;
    const next = { ...prev };
    delete next[id];
    return next;
  });

  const updateQuantity = (id, raw) => {
    const target = entries.find((e) => e.id === id);
    if (!target) return;
    if (isCurrencySlug(target.slug)) {
      setQuantityDrafts((prev) => ({ ...prev, [id]: raw }));
      if (parseCompactValue(raw) === null) return; // still typing a decimal/suffix
    }
    setEntries((prev) => prev.map((e) => (e.id !== id ? e : { ...e, quantity: clampQuantity(e.slug, raw) })));
  };

  const stepQuantity = (id, delta) => {
    clearQuantityDraft(id);
    setEntries((prev) => prev.map((e) => (e.id !== id ? e : {
      ...e,
      quantity: clampQuantity(e.slug, (Number(e.quantity) || 0) + delta),
    })));
  };

  const addLinked = (valueEntry) => {
    rememberRecent?.(valueEntry);
    setEntries((prev) => {
      const existing = prev.find((e) => e.slug === valueEntry.slug);
      if (existing) {
        return prev.map((e) => (e.slug === valueEntry.slug ? { ...e, quantity: clampQuantity(valueEntry.slug, e.quantity + 1) } : e));
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

      <ValueEntryPicker
        onPick={addLinked}
        onPickCurrency={onPickCurrency}
        currencies={CURRENCIES}
        placeholder={`Add units, gems or coins to ${label}'s side…`}
        entries={valueEntries}
      />

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
            const isCurrency = resolved.kind === 'currency';
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
                {isCurrency ? (
                  <img className="calc-currency-badge" src={resolved.currencyIcon} alt="" aria-hidden="true" />
                ) : (
                  <UnitIcon
                    slug={entry.slug}
                    name={resolved.name}
                    glowColor={glow}
                    shiny={isShinyRarity(resolved.rarity)}
                    size={44}
                    imageUrl={resolved.imageUrl}
                  />
                )}
                <div className="calc-entry-text">
                  <span className="calc-entry-name">{resolved.name}</span>
                  {isCurrency ? (
                    <span className="calc-entry-meta">
                      {formatFullNumber(resolved.amount)} — converted at market ratio
                    </span>
                  ) : (
                    <>
                  <span className="calc-entry-meta" style={{ color: glow }}>
                    {resolved.specialValue || resolved.rarity}
                  </span>
                  <span className="calc-entry-tiers">
                    Demand: {resolved.demand || '—'} · Scarcity: {resolved.scarcity || '—'}
                  </span>
                    </>
                  )}
                </div>

                <div className="calc-qty-control">
                  <button
                    type="button"
                    className="calc-qty-btn"
                    onClick={() => stepQuantity(entry.id, -(isCurrency ? 1000 : 1))}
                    disabled={isCurrency ? entry.quantity <= 0 : entry.quantity <= 1}
                  >
                    −
                  </button>
                  <input
                    className={isCurrency ? 'calc-qty-input calc-qty-input-wide' : 'calc-qty-input'}
                    type={isCurrency ? 'text' : 'number'}
                    inputMode={isCurrency ? 'text' : undefined}
                    min={isCurrency ? undefined : 1}
                    max={isCurrency ? undefined : 9999}
                    step={isCurrency ? undefined : 1}
                    value={isCurrency ? (quantityDrafts[entry.id] ?? entry.quantity) : entry.quantity}
                    onChange={(e) => updateQuantity(entry.id, e.target.value)}
                    onBlur={() => clearQuantityDraft(entry.id)}
                    aria-label={isCurrency ? `Amount for ${resolved.name}` : `Quantity for ${resolved.name}`}
                  />
                  <button
                    type="button"
                    className="calc-qty-btn"
                    onClick={() => stepQuantity(entry.id, isCurrency ? 1000 : 1)}
                    disabled={!isCurrency && entry.quantity >= 9999}
                  >
                    +
                  </button>
                </div>

                <div className="calc-entry-value" title={`${formatFullNumber(resolved.tradeValue || 0)} exact`}>
                  {formatCompactNumber(resolved.tradeValue || 0)}
                  {resolved.tradeValueMax > resolved.tradeValue && (
                    <small className="calc-entry-range">–{formatCompactNumber(resolved.tradeValueMax)}</small>
                  )}
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
          <div className="calc-empty-side">Use the search above to add units, items, gems or coins to {label}&apos;s side.</div>
        )}
      </div>
    </div>
  );
}

// Amount prompt for Gems / Coins — opens when a currency is picked from the
// top of the add-picker. Free-typed amount plus quick-size buttons; live
// market-ratio preview; Enter adds, Escape closes.
function CurrencyAmountModal({ sideLabel, currency, existingAmount = 0, onClose, onConfirm }) {
  const [raw, setRaw] = useState('');
  const parsed = parseCompactValue(raw);
  const amount = Math.floor(parsed ?? 0);
  const preview = amount > 0
    ? (currency.kind === 'gems' ? valueFromGems(amount) : valueFromCoins(amount))
    : 0;
  const inputRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 30);
    return () => clearTimeout(t);
  }, []);

  function submit() {
    if (amount > 0) onConfirm(amount);
  }

  return (
    <div
      className="cam-overlay"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label={`Add ${currency.name} amount`}
    >
      <div className="cam-card">
        <div className="cam-head">
          <img className="cam-icon" src={currency.icon} alt="" />
          <div className="cam-head-text">
            <h3>Add {currency.name}</h3>
            <p>to {sideLabel}&apos;s side</p>
          </div>
          <button type="button" className="cam-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <input
          ref={inputRef}
          className="cam-input"
          type="text"
          inputMode="text"
          placeholder={`Amount of ${currency.name} — e.g. 20M`}
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); submit(); }
            if (e.key === 'Escape') onClose();
          }}
          aria-label={`${currency.name} amount`}
        />
        <small className="cam-suffix-hint">K / M / B / T accepted · 20M = {formatFullNumber(20_000_000)}</small>

        <div className="cam-quick">
          {currency.quickAmounts.map((value) => (
            <button
              type="button"
              key={value}
              className={amount === value && raw ? 'cam-chip on' : 'cam-chip'}
              onClick={() => setRaw(formatCompactNumber(value))}
            >
              {formatCompactNumber(value)}
            </button>
          ))}
        </div>

        <div className="cam-preview">
          {amount > 0 ? (
            <>
              <span className="cam-preview-value">≈ {formatCompactNumber(preview)} value at market ratio</span>
              {existingAmount > 0 && (
                <span className="cam-preview-sub">adds to your {formatFullNumber(existingAmount)} — total {formatFullNumber(existingAmount + amount)}</span>
              )}
            </>
          ) : (
            <span className="cam-preview-sub">
              Type an amount or tap a quick size
              {existingAmount > 0 ? ` — you already have ${formatFullNumber(existingAmount)} ${currency.name} on this side` : ''}
            </span>
          )}
        </div>

        <div className="cam-actions">
          <button type="button" className="cam-cancel" onClick={onClose}>Cancel</button>
          <button type="button" className="cam-add" onClick={submit} disabled={amount <= 0}>
            Add {currency.name}
          </button>
        </div>
      </div>
    </div>
  );
}