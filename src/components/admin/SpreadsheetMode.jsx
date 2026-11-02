import { useEffect, useMemo, useRef, useState } from 'react';
import { DEMAND_COLORS, DEMAND_LABELS, SCARCITY_COLORS, SCARCITY_LABELS, UNIT_RARITIES, getRarityGlow } from '../../data/taxonomy';
import './SpreadsheetMode.css';
import Dropdown from '../Dropdown';
import { makeSpreadsheetRow } from '../../utils/spreadsheetValues';
import { parseCompactValue, formatSiteNumber } from '../../utils/formatNumber';
import { resolveImageUrl } from '../../utils/localAssets';

// SPREADSHEET MODE — bulk value editing. Design goals (v2):
//   * calm, themed, uncluttered: rarity lives INSIDE the unit cell, optional
//     columns are opt-in, selects are compact colored chips
//   * mobile-first: phones get a vertical CARD list instead of the table
//   * same canonical save path as the single-unit editor (background queue)

const TREND_OPTIONS = ['stable', 'rising', 'falling', 'fluctuating'];
const TREND_COLORS = { rising: '#42d392', stable: '#cfd6e4', falling: '#ff5c5c', fluctuating: '#ffd24d' };

const ALL_COLS = [
  { key: 'base_value', label: 'Value', type: 'num' },
  { key: 'base_value_max', label: 'Max', type: 'num' },
  { key: 'gems', label: 'Gems', type: 'num' },
  { key: 'coins', label: 'Coins', type: 'num' },
  { key: 'gems_max', label: 'Gems max', type: 'num', optional: true },
  { key: 'coins_max', label: 'Coins max', type: 'num', optional: true },
  { key: 'demand', label: 'Demand', type: 'chip', options: DEMAND_LABELS, colors: DEMAND_COLORS },
  { key: 'scarcity', label: 'Scarcity', type: 'chip', options: SCARCITY_LABELS, colors: SCARCITY_COLORS },
  { key: 'trend', label: 'Trend', type: 'chip', options: TREND_OPTIONS, colors: TREND_COLORS },
  { key: 'notes', label: 'Notes', type: 'text', optional: true },
];
const DEFAULT_KEYS = ['base_value', 'base_value_max', 'gems', 'coins', 'demand', 'scarcity', 'trend'];

function useIsMobile() {
  const [mobile, setMobile] = useState(() => (typeof window !== 'undefined' ? window.matchMedia('(max-width: 768px)').matches : false));
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const onChange = () => setMobile(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return mobile;
}

// Status cells use the same accessible dropdown as the rest of the site.
function ChipSelect({ value, options, colors = {}, onChange, title, disabled }) {
  return <Dropdown compact className="sms-chip-dropdown" value={value ?? ''} onChange={onChange}
    options={[{ value: '', label: '— none' }, ...options.map((v) => ({ value: v, label: v }))]}
    accent={colors[value]} ariaLabel={title} disabled={disabled} />;
}

function NumCell({ rowIdx, col, value, disabled, onChange, onKey }) {
  const [focused, setFocused] = useState(false);
  const numeric = col.type === 'num' && value !== '' && value != null && parseCompactValue(value) !== null;
  const display = !focused && numeric ? formatSiteNumber(parseCompactValue(value)) : (value ?? '');
  return (
    <input
      data-cell={`${rowIdx}:${col.key}`}
      className={`sms-input${col.type === 'num' ? ' sms-input-num' : ''}`}
      inputMode={col.type === 'num' ? 'text' : undefined}
      value={display}
      disabled={disabled}
      onFocus={(e) => { setFocused(true); e.target.select?.(); }}
      onBlur={() => setFocused(false)}
      onChange={(e) => {
        const parsed = col.type === 'num' ? parseCompactValue(e.target.value) : null;
        onChange(col.key, parsed !== null ? String(parsed) : e.target.value);
      }}
      onKeyDown={(e) => onKey(e, rowIdx, col.key)}
      aria-label={col.label}
      title={numeric ? `${formatSiteNumber(parseCompactValue(value), { full: true })} — K/M/B/T accepted` : undefined}
    />
  );
}

export default function SpreadsheetMode({ units, valueRows, onSaveRows, saving, canEdit, edits: sharedEdits, setEdits: setSharedEdits }) {
  const isMobile = useIsMobile();
  const [query, setQuery] = useState('');
  const [rarity, setRarity] = useState('All');
  const [visibleKeys, setVisibleKeys] = useState(() => new Set(DEFAULT_KEYS));
  const [showCols, setShowCols] = useState(false);
  const [localEdits, setLocalEdits] = useState({});
  const edits = sharedEdits ?? localEdits; // slug -> { col: value }
  const setEdits = setSharedEdits ?? setLocalEdits;
  const [committing, setCommitting] = useState(false);
  const [saveError, setSaveError] = useState('');
  const colsRef = useRef(null);
  const tableRef = useRef(null);

  const cols = ALL_COLS.filter((c) => visibleKeys.has(c.key));

  // Build the unfiltered index first: a row edited before changing the search
  // must still carry its complete values when Save All is pressed.
  const allRows = useMemo(() => {
    const bySlug = new Map((valueRows || []).map((row) => [row.slug, row]));
    return (units || []).map((unit) => makeSpreadsheetRow(unit, bySlug.get(unit.slug)))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [units, valueRows]);
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allRows.filter((u) => (rarity === 'All' || u.rarity === rarity) &&
      (!q || String(u.name || '').toLowerCase().includes(q) || String(u.slug || '').toLowerCase().includes(q)));
  }, [allRows, query, rarity]);

  const dirtySlugs = useMemo(() => Object.keys(edits).filter((s) => Object.keys(edits[s] || {}).length), [edits]);
  const dirtyCount = dirtySlugs.length;

  const cellValue = (row, col) => (edits[row.slug] && edits[row.slug][col] !== undefined ? edits[row.slug][col] : row[col]);
  const isDirty = (slug) => !!(edits[slug] && Object.keys(edits[slug]).length);

  function setCell(slug, col, value) {
    setEdits((prev) => ({ ...prev, [slug]: { ...(prev[slug] || {}), [col]: value } }));
  }

  // Excel-style keyboard navigation (desktop table only)
  function moveFocus(rowIdx, colKey, delta) {
    const next = tableRef.current?.querySelector(`[data-cell="${rowIdx + delta}:${colKey}"]`);
    if (next) { next.focus(); next.select?.(); }
  }
  function handleKey(e, rowIdx, colKey) {
    if (e.key === 'ArrowDown' || e.key === 'Enter') { e.preventDefault(); moveFocus(rowIdx, colKey, 1); }
    if (e.key === 'ArrowUp') { e.preventDefault(); moveFocus(rowIdx, colKey, -1); }
  }

  async function saveAll() {
    if (!dirtyCount || !onSaveRows) return;
    const changed = dirtySlugs.map((slug) => {
      const base = allRows.find((r) => r.slug === slug);
      return base ? { slug, name: base.name, form: { ...base, ...edits[slug] }, changes: { ...edits[slug] } } : null;
    });
    if (changed.some((row) => !row)) { setSaveError('A modified unit is no longer available. Refresh before saving.'); return; }
    setCommitting(true);
    setSaveError('');
    try {
      const ok = await onSaveRows(changed);
      if (ok) setEdits({});
    } catch (error) {
      setSaveError(error?.message || 'Could not save these changes. Your edits are still here.');
    } finally { setCommitting(false); }
  }

  // close the columns popover on outside click
  useEffect(() => {
    if (!showCols) return undefined;
    const onDown = (e) => { if (!e.target.closest('.sms-cols, .sms-cols-pop')) setShowCols(false); };
    const onKey = (e) => { if (e.key === 'Escape') setShowCols(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [showCols]);

  const rarityOptions = useMemo(
    () => [{ value: 'All', label: 'All rarities' }, ...UNIT_RARITIES.map((r) => ({ value: r, label: r }))],
    []
  );

  const renderChip = (row, col) => (
    <ChipSelect
      value={cellValue(row, col.key) ?? ''}
      options={col.options}
      colors={col.colors}
      onChange={(v) => setCell(row.slug, col.key, v)}
      title={`${col.label} for ${row.name}`}
      disabled={!canEdit || saving || committing}
    />
  );

function UnitAvatar({ imageUrl }) {
  return imageUrl
    ? <img className="sms-unit-img" src={resolveImageUrl(imageUrl)} alt="" loading="lazy" decoding="async" />
    : <span className="sms-unit-img fallback" aria-hidden="true" />;
}

  return (
    <section className="sms-wrap card">
      <div className="sms-toolbar">
        <div className="sms-toolbar-left">
          <h2>📊 Spreadsheet Mode</h2>
          <p className="sms-hint">{dirtyCount > 0 ? `${dirtyCount} unit${dirtyCount > 1 ? 's' : ''} modified — Save All publishes just those` : 'Edit many units at once · Tab / Enter / ↑↓ to move'}</p>
        </div>
        <div className="sms-toolbar-right">
          <input className="admin-search sms-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter units…" aria-label="Filter units" />
          <Dropdown compact className="sms-select" value={rarity} onChange={setRarity} options={rarityOptions} ariaLabel="Filter by rarity" />
          <div className="sms-cols">
            <button type="button" className={`sms-cols-btn${showCols ? ' open' : ''}`} onClick={() => setShowCols((v) => !v)} aria-expanded={showCols}>▾ Columns</button>
            {showCols && (
              <div className="sms-cols-pop" role="menu">
                {ALL_COLS.map((c) => (
                  <label key={c.key} className="sms-cols-item">
                    <input
                      type="checkbox"
                      checked={visibleKeys.has(c.key)}
                      onChange={(e) => {
                        const next = new Set(visibleKeys);
                        if (e.target.checked) next.add(c.key); else next.delete(c.key);
                        if (next.size) setVisibleKeys(next);
                      }}
                    />
                    <span>{c.label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {saveError && <p className="sms-error" role="alert">{saveError}</p>}
      {dirtyCount > 0 && (
        <div className="sms-actionbar" role="status">
          <strong>✏️ {dirtyCount} modified</strong>
          <span className="sms-actionbar-spacer" />
          <button type="button" disabled={saving || committing} onClick={() => setEdits({})}>Discard</button>
          <button type="button" className="filled" onClick={saveAll} disabled={saving || committing || !canEdit}>{saving || committing ? 'Saving…' : `💾 Save All (${dirtyCount})`}</button>
        </div>
      )}

      {isMobile ? (
        /* ---------------- MOBILE: vertical card list ---------------- */
        <div className="sms-cards" data-lenis-prevent>
          {rows.map((row) => (
            <div key={row.slug} className={`sms-card${isDirty(row.slug) ? ' dirty' : ''}`}>
              <div className="sms-card-head">
                <UnitAvatar imageUrl={row.imageUrl} />
                <strong className="sms-card-name">{row.name}</strong>
                <span className="sms-card-rarity" style={{ color: getRarityGlow(row.rarity) }}>{row.rarity}</span>
              </div>
              <div className="sms-card-grid">
                {cols.filter((c) => c.type !== 'chip').map((c) => (
                  <label key={c.key} className="sms-card-field">
                    <span>{c.label}</span>
                    <input
                      className="sms-input"
                      inputMode={c.type === 'num' ? 'text' : undefined}
                      value={cellValue(row, c.key) ?? ''}
                      disabled={!canEdit || saving || committing}
                      onChange={(e) => setCell(row.slug, c.key, e.target.value)}
                      aria-label={`${c.label} for ${row.name}`}
                    />
                  </label>
                ))}
              </div>
              <div className="sms-card-chips">
                {cols.filter((c) => c.type === 'chip').map((c) => (
                  <span key={c.key} className="sms-card-chip-slot">
                    <small>{c.label}</small>
                    {renderChip(row, c)}
                  </span>
                ))}
              </div>
            </div>
          ))}
          {rows.length === 0 && <div className="sms-empty">No units match that filter.</div>}
        </div>
      ) : (
        /* ---------------- DESKTOP: spreadsheet table ---------------- */
        <div className="sms-table-wrap" ref={tableRef} data-lenis-prevent>
          <table className="sms-table">
            <thead>
              <tr>
                <th className="sms-th-name">Unit</th>
                {cols.map((c) => <th key={c.key} className={c.type === 'num' ? 'sms-th-num' : ''}>{c.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={row.slug} className={isDirty(row.slug) ? 'sms-row-dirty' : ''}>
                  <td className="sms-td-name">
                    <UnitAvatar imageUrl={row.imageUrl} />
                    <span className="sms-unit-id">
                      <span className="sms-unit-name">{row.name}</span>
                      <span className="sms-unit-rarity" style={{ color: getRarityGlow(row.rarity) }}>{row.rarity}</span>
                    </span>
                  </td>
                  {cols.map((c) => (
                    <td key={c.key} className={c.type === 'chip' ? 'sms-td-chip' : 'sms-td-num'}>
                      {c.type !== 'chip' ? (
                        <NumCell rowIdx={idx} col={c} value={cellValue(row, c.key)} disabled={!canEdit || saving || committing}
                          onChange={(k, v) => setCell(row.slug, k, v)} onKey={handleKey} />
                      ) : renderChip(row, c)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <div className="sms-empty">No units match that filter.</div>}
        </div>
      )}

      {/* mobile sticky save bar */}
      {isMobile && dirtyCount > 0 && (
        <div className="sms-mobile-save">
          <span>{dirtyCount} modified</span>
          <button type="button" disabled={saving || committing} onClick={() => setEdits({})}>Discard</button>
          <button type="button" className="filled" onClick={saveAll} disabled={saving || committing || !canEdit}>{saving || committing ? 'Saving…' : `💾 Save ${dirtyCount}`}</button>
        </div>
      )}
    </section>
  );
}
