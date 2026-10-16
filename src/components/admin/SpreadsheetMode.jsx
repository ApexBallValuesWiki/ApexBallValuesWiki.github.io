import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { DEMAND_COLORS, DEMAND_LABELS, SCARCITY_COLORS, SCARCITY_LABELS, UNIT_RARITIES, getRarityGlow } from '../../data/taxonomy';
import './SpreadsheetMode.css';
import Dropdown from '../Dropdown';

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

// Compact colored chip that opens a floating theme-styled picker. Fixed
// positioning means the menu is never clipped by the table's scroll area.
function ChipSelect({ value, options, colors = {}, onChange, title }) {
  const btnRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);

  useEffect(() => {
    if (!open) return undefined;
    const place = () => {
      const r = btnRef.current?.getBoundingClientRect();
      if (r) setPos({ top: Math.min(r.bottom + 6, window.innerHeight - 260), left: Math.max(8, Math.min(r.left - 30, window.innerWidth - 210)) });
    };
    place();
    const onDown = (e) => { if (!e.target.closest('.sms-chipmenu, .sms-chip')) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
    };
  }, [open]);

  const color = value ? colors[value] || '#cfd6e4' : 'var(--text-faint)';

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className={`sms-chip${value ? '' : ' empty'}${open ? ' open' : ''}`}
        style={{ color, borderColor: `color-mix(in srgb, ${color} 45%, transparent)`, background: `color-mix(in srgb, ${color} 10%, transparent)` }}
        onClick={() => setOpen((o) => !o)}
        title={title}
      >
        {value || '—'}
      </button>
      {open && pos && createPortal(
        <div className="sms-chipmenu" style={pos} role="listbox" aria-label={title} data-lenis-prevent>
          <button type="button" className={value ? '' : 'on'} onClick={() => { onChange(''); setOpen(false); }}>— none</button>
          {options.map((o) => (
            <button
              key={o}
              type="button"
              className={o === value ? 'on' : ''}
              style={o === value ? { color: colors[o], borderColor: `color-mix(in srgb, ${colors[o] || '#fff'} 55%, transparent)` } : undefined}
              onClick={() => { onChange(o); setOpen(false); }}
            >
              {o}
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}

function NumCell({ rowIdx, col, value, disabled, onChange, onKey }) {
  return (
    <input
      data-cell={`${rowIdx}:${col.key}`}
      className="sms-input sms-input-num"
      inputMode="numeric"
      value={value ?? ''}
      disabled={disabled}
      onFocus={(e) => e.target.select?.()}
      onChange={(e) => onChange(col.key, e.target.value)}
      onKeyDown={(e) => onKey(e, rowIdx, col.key)}
      aria-label={col.label}
    />
  );
}

export default function SpreadsheetMode({ units, valueRows, onSaveRows, saving, canEdit }) {
  const isMobile = useIsMobile();
  const [query, setQuery] = useState('');
  const [rarity, setRarity] = useState('All');
  const [visibleKeys, setVisibleKeys] = useState(() => new Set(DEFAULT_KEYS));
  const [showCols, setShowCols] = useState(false);
  const [edits, setEdits] = useState({}); // slug -> { col: value }
  const colsRef = useRef(null);
  const tableRef = useRef(null);

  const cols = ALL_COLS.filter((c) => visibleKeys.has(c.key));

  const rows = useMemo(() => {
    const bySlug = new Map((valueRows || []).map((r) => [r.slug, r || {}]));
    const q = query.trim().toLowerCase();
    return (units || [])
      .filter((u) => (rarity === 'All' ? true : u.rarity === rarity))
      .filter((u) => (q ? String(u.name || '').toLowerCase().includes(q) || String(u.slug || '').includes(q) : true))
      .map((u) => {
        const v = bySlug.get(u.slug) || {};
        return {
          slug: u.slug,
          name: u.name,
          rarity: u.rarity,
          imageUrl: u.imageUrl || u.image_url || null,
          base_value: v.base_value ?? v.baseValue ?? '',
          base_value_max: v.base_value_max ?? v.baseValueMax ?? '',
          gems: v.gems ?? '',
          gems_max: v.gems_max ?? v.gemsMax ?? '',
          coins: v.coins ?? '',
          coins_max: v.coins_max ?? v.coinsMax ?? '',
          demand: v.demand || '',
          scarcity: v.scarcity || '',
          trend: v.trend || 'stable',
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [units, valueRows, query, rarity]);

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
      const base = rows.find((r) => r.slug === slug) || {};
      return { slug, name: base.name, form: { ...base, ...edits[slug] } };
    });
    const ok = await onSaveRows(changed);
    if (ok) setEdits({});
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
      value={cellValue(row, col) || (col.key === 'trend' ? 'stable' : '')}
      options={col.options}
      colors={col.colors}
      onChange={(v) => setCell(row.slug, col.key, v)}
      title={`${col.label} for ${row.name}`}
    />
  );

function UnitAvatar({ imageUrl }) {
  return imageUrl
    ? <img className="sms-unit-img" src={imageUrl} alt="" loading="lazy" decoding="async" />
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

      {dirtyCount > 0 && (
        <div className="sms-actionbar" role="status">
          <strong>✏️ {dirtyCount} modified</strong>
          <span className="sms-actionbar-spacer" />
          <button type="button" onClick={() => setEdits({})}>Discard</button>
          <button type="button" className="filled" onClick={saveAll} disabled={saving || !canEdit}>{saving ? 'Publishing…' : `💾 Save All (${dirtyCount})`}</button>
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
                {cols.filter((c) => c.type === 'num').map((c) => (
                  <label key={c.key} className="sms-card-field">
                    <span>{c.label}</span>
                    <input
                      className="sms-input"
                      inputMode="numeric"
                      value={cellValue(row, c) ?? ''}
                      disabled={!canEdit}
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
                    <td key={c.key} className={c.type === 'num' ? 'sms-td-num' : 'sms-td-chip'}>
                      {c.type === 'num' ? (
                        <NumCell rowIdx={idx} col={c} value={cellValue(row, c)} disabled={!canEdit}
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
          <button type="button" onClick={() => setEdits({})}>Discard</button>
          <button type="button" className="filled" onClick={saveAll} disabled={saving || !canEdit}>{saving ? 'Publishing…' : `💾 Save ${dirtyCount}`}</button>
        </div>
      )}
    </section>
  );
}
