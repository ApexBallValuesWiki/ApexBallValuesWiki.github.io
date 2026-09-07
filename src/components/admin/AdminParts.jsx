import { useState, useMemo, useRef, useEffect } from 'react';
import { fetchChangeLog } from '../../utils/apexClient';
import { compressImage } from '../../utils/adminSafety';
import UnitIcon from '../UnitIcon';
import Dropdown from '../Dropdown';
import ValueTrendGraph from '../ValueTrendGraph';
import { DEMAND_LABELS, SCARCITY_LABELS, getRarityGlow, isShinyRarity, UNIT_RARITIES } from '../../data/taxonomy';
import { upgradeToForm, ensureArray, linesToObject, objectToLines } from '../../utils/adminForms';
import { computeTradeValue } from '../../utils/calculator';
import { getDisplayName } from '../../utils/teamMembers';

const TRENDS = [
  { value: 'stable', label: 'Stable' },
  { value: 'rising', label: 'Rising' },
  { value: 'falling', label: 'Dropping' },
  { value: 'fluctuating', label: 'Fluctuating' },
];

const RARITY_OPTIONS = [
  { value: 'all', label: 'All units' },
  { value: 'live', label: 'Live overrides' },
  ...UNIT_RARITIES.map((rarity) => ({ value: rarity, label: rarity })),
];

// Persist admin logs to localStorage so they survive refreshes
const ADMIN_LOG_KEY = 'apex-admin-log-v1';
const MAX_LOG_ENTRIES = 200;

export function loadPersistedLogs() {
  try {
    const raw = localStorage.getItem(ADMIN_LOG_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

export function persistLog(entry) {
  try {
    const existing = loadPersistedLogs();
    existing.unshift(entry);
    if (existing.length > MAX_LOG_ENTRIES) existing.length = MAX_LOG_ENTRIES;
    localStorage.setItem(ADMIN_LOG_KEY, JSON.stringify(existing));
  } catch { /* ignore */ }
}

export function clearPersistedLogs() {
  try { localStorage.removeItem(ADMIN_LOG_KEY); } catch { /* ignore */ }
}

export function DeletedUnitsPanel({ units = [], onRestore, restoring }) {
  if (!units.length) return null;
  return (
    <section className="admin-editor card" style={{ marginTop: 14 }}>
      <p className="admin-kicker">Recycle bin</p>
      <h2>🗑️ Deleted Units</h2>
      <p className="admin-muted">These units are hidden from the entire site (Values, WIKI, search, counts). Restore brings them back everywhere.</p>
      <div className="admin-drafts-list">
        {units.map((slug) => (
          <div key={slug} className="admin-drafts-row">
            <span>🗿 {slug}</span>
            <span className="admin-drafts-row-actions">
              <button type="button" onClick={() => onRestore(slug)} disabled={restoring === slug} title="Bring this unit back to the site">
                {restoring === slug ? 'Restoring…' : '↩️ Restore'}
              </button>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

export function AdminMessage({ message, action }) {
  if (!message) return null;
  return (
    <div className="admin-message" role="status">
      <span>{message}</span>
      {action?.label && typeof action?.run === 'function' && (
        <button type="button" className="admin-message-action" onClick={action.run}>{action.label}</button>
      )}
    </div>
  );
}

export function AuthPanel({ title, message, children }) {
  return (
    <section className="admin-auth card">
      <p className="admin-kicker">Testing Admin Portal</p>
      <h1>{title}</h1>
      <AdminMessage message={message} />
      {children}
    </section>
  );
}

export function EditorTitle({ unit, label, live, dirty, wikiRows = [], imageMap = {} }) {
  const safeUnit = unit || { slug: 'ball', name: 'Ball', rarity: 'Normie', type: 'DPS' };
  const glow = safeUnit.rarity ? getRarityGlow(safeUnit.rarity) : 'var(--accent)';
  const dbUrl = (Array.isArray(wikiRows) ? wikiRows : []).find(r => r?.slug === safeUnit.slug)?.image_url;
  const imageUrl = imageMap[safeUnit.slug] || safeUnit.imageUrl || safeUnit.image_url || dbUrl || null;

  return (
    <div className="admin-editor-head">
      <div className="admin-editor-title">
        <UnitIcon
          slug={safeUnit.slug}
          name={safeUnit.name}
          glowColor={glow}
          shiny={isShinyRarity(safeUnit.rarity)}
          size={52}
          imageUrl={imageUrl}
        />
        <div className="admin-editor-meta">
          <span className="admin-kicker">{label}</span>
          <h2>{safeUnit.name || 'Select Unit'}</h2>
          <span className="admin-sub-meta" style={{ color: glow }}>
            {safeUnit.rarity || 'Normie'} · {safeUnit.type || 'Unit'}
          </span>
        </div>
      </div>
      <div className="admin-title-pills">
        {dirty && <div className="admin-dirty-pill">● Unsaved Changes</div>}
        {live && <div className="admin-local-pill">✓ Live Override</div>}
      </div>
    </div>
  );
}

export function UnitPicker({ units = [], total = 0, query = '', setQuery, filter = 'all', setFilter, selectedUnit, selectUnit, valueRows = [], wikiRows = [], mode = 'values', imageMap = {}, recentEdits = [], onSelectRecent }) {
  const safeUnits = Array.isArray(units) ? units : [];
  const liveRows = mode === 'values' ? (Array.isArray(valueRows) ? valueRows : []) : (Array.isArray(wikiRows) ? wikiRows : []);
  const [activeIdx, setActiveIdx] = useState(-1);
  const listRef = useRef(null);

  // New search → reset the keyboard highlight.
  useEffect(() => { setActiveIdx(-1); }, [query, filter]);
  // Keep the highlighted row visible while arrowing through the list.
  useEffect(() => {
    if (activeIdx < 0 || !listRef.current) return;
    listRef.current.querySelector(`[data-idx="${activeIdx}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [activeIdx]);

  function onSearchKeyDown(event) {
    if (!safeUnits.length) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIdx((i) => (i + 1) % safeUnits.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIdx((i) => (i - 1 + safeUnits.length) % safeUnits.length);
    } else if (event.key === 'Enter') {
      const target = safeUnits[activeIdx] || safeUnits[0];
      if (target) {
        event.preventDefault();
        selectUnit(target.slug);
      }
    }
  }

  const wikiImageMap = useMemo(() => {
    const map = {};
    (Array.isArray(wikiRows) ? wikiRows : []).forEach((row) => {
      if (row?.slug && (row.image_url || row.imageUrl)) {
        map[row.slug] = row.image_url || row.imageUrl;
      }
    });
    return { ...map, ...imageMap };
  }, [wikiRows, imageMap]);

  return (
    <aside className="admin-unit-picker card">
      <div className="admin-section-head">
        <h2>Units</h2>
        <span className="admin-count-badge">{total}</span>
      </div>
      <input
        className="admin-search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={onSearchKeyDown}
        placeholder="Search units, rarity, or type… (typos OK — ↑↓ Enter)"
        aria-label="Search units by name, rarity or type"
      />
      {recentEdits.length > 0 && !query && (
        <div className="admin-recent-row">
          <small className="admin-recent-label">Recently edited</small>
          <div className="admin-recent-pills">
            {recentEdits.map((entry) => (
              <button
                type="button"
                key={`${entry.kind}:${entry.slug}`}
                className="admin-recent-pill"
                onClick={() => onSelectRecent?.(entry)}
                title={`${entry.kind === 'values' ? 'Value' : 'WIKI'} edit — ${entry.name}`}
              >
                {entry.kind === 'values' ? '💰' : '📖'} {entry.name}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="admin-filter-wrap">
        <Dropdown
          value={filter}
          onChange={setFilter}
          options={RARITY_OPTIONS}
          ariaLabel="Filter units by rarity or status"
        />
      </div>
      <div className="admin-unit-list" ref={listRef} data-lenis-prevent>
        {safeUnits.map((unit, idx) => {
          if (!unit || !unit.slug) return null;
          const isSelected = unit.slug === selectedUnit?.slug;
          const isKbdActive = idx === activeIdx && !isSelected;
          const isLive = liveRows.some((row) => row?.slug === unit.slug);
          const glow = getRarityGlow(unit.rarity);
          const imageUrl = unit.imageUrl || unit.image_url || wikiImageMap[unit.slug] || null;

          return (
            <button
              key={unit.slug}
              type="button"
              data-idx={idx}
              className={isSelected ? 'admin-unit active' : `admin-unit${isKbdActive ? ' kbd-active' : ''}`}
              onClick={() => selectUnit(unit.slug)}
            >
              <UnitIcon
                slug={unit.slug}
                name={unit.name}
                glowColor={glow}
                shiny={isShinyRarity(unit.rarity)}
                size={34}
                imageUrl={imageUrl}
              />
              <span className="admin-unit-text">
                <strong className="unit-name-title">{unit.name || unit.slug}</strong>
                <small className="unit-rarity-sub" style={{ color: glow }}>{unit.rarity || 'Normie'}</small>
              </span>
              {isLive && <b className="unit-live-badge">LIVE</b>}
            </button>
          );
        })}
      </div>
    </aside>
  );
}

// Text input for min-max ranges that keeps a LOCAL raw string while typing,
// so '-' can be typed freely (the old controlled rebuild ate trailing
// dashes: '5-' instantly snapped back to '5').
export function RangeTextInput({ label, min, max, onCommit, placeholder }) {
  const external = max ? `${min ?? ''}-${max}` : `${min ?? ''}`;
  const [raw, setRaw] = useState(external);
  const lastExternal = useRef(external);
  if (external !== lastExternal.current) {
    lastExternal.current = external;
    if (raw !== external) setRaw(external);
  }

  function handleChange(event) {
    const val = event.target.value;
    setRaw(val);
    const trimmed = val.trim();
    if (trimmed.includes('-')) {
      const parts = trimmed.split('-').map((s) => s.trim());
      onCommit(parts[0] ?? '', parts[1] ?? '');
    } else {
      onCommit(trimmed, '');
    }
  }

  return (
    <label className="admin-field">
      <span>{label}</span>
      <input
        className="admin-text-input"
        type="text"
        value={raw}
        onChange={handleChange}
        placeholder={placeholder}
      />
    </label>
  );
}

export function ValueEditor({ unit, form = {}, tradeValue = 0, selectedRow, updateField, saveValue, resetValue, refresh, saving, message, messageAction, dirty, imageMap = {}, wikiRows = [], commitRangeRef }) {
  const safeUnit = unit || { slug: 'ball', name: 'Ball', rarity: 'Normie', type: 'DPS' };
  const compGems = computeTradeValue(form.gems, form.demand, form.scarcity);
  const compCoins = computeTradeValue(form.coins, form.demand, form.scarcity);

  // Compute scaled max values when range exists
  const hasRange = form.baseValueMax && Number(form.baseValueMax) > Number(form.baseValue || 0);
  const tradeValueMax = hasRange ? computeTradeValue(form.baseValueMax, form.demand, form.scarcity) : null;
  const gemsMax = form.gemsMax ? computeTradeValue(form.gemsMax, form.demand, form.scarcity) : null;
  const coinsMax = form.coinsMax ? computeTradeValue(form.coinsMax, form.demand, form.scarcity) : null;

  // Local input state so typing feels natural
  const [rangeInput, setRangeInput] = useState(() => {
    return form.baseValueMax
      ? `${form.baseValue || ''}-${form.baseValueMax}`
      : `${form.baseValue || ''}`;
  });

  // Sync local input when form changes externally (unit switch, load, etc.)
  const prevSlug = useMemo(() => String(form.baseValue) + '|' + String(form.baseValueMax), [form.baseValue, form.baseValueMax]);
  const lastSynced = useRef(prevSlug);
  if (prevSlug !== lastSynced.current) {
    lastSynced.current = prevSlug;
    const next = form.baseValueMax
      ? `${form.baseValue || ''}-${form.baseValueMax}`
      : `${form.baseValue || ''}`;
    if (rangeInput !== next) setRangeInput(next);
  }

  function commitRange() {
    const val = rangeInput.trim();
    if (val.includes('-')) {
      const parts = val.split('-').map(s => s.trim());
      const min = parts[0] || '';
      const max = parts[1] || '';
      updateField('baseValue', min);
      updateField('baseValueMax', max);
      return { baseValue: min, baseValueMax: max };
    } else {
      updateField('baseValue', val);
      updateField('baseValueMax', '');
      return { baseValue: val, baseValueMax: '' };
    }
  }

  // Expose commitRange to parent so saveValue can call it first and get values directly
  useEffect(() => {
    if (commitRangeRef) commitRangeRef.current = commitRange;
  });

  return (
    <section className="admin-editor card">
      <EditorTitle unit={safeUnit} label="Editing Values" live={!!selectedRow} dirty={dirty} imageMap={imageMap} wikiRows={wikiRows} />

      <div className="admin-preview-value">
        <span>Exact Live Outputs — numbers publish exactly as typed</span>
        <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', marginTop: 4 }}>
          <strong style={{ color: 'var(--c-info)' }} title={tradeValueMax ? `${formatFullNumber(tradeValue)} - ${formatFullNumber(tradeValueMax)} exact` : `${formatFullNumber(tradeValue)} exact`}>
            Value: {tradeValueMax ? `${formatCompactNumber(tradeValue)}-${formatCompactNumber(tradeValueMax)}` : formatCompactNumber(tradeValue)}
          </strong>
          <strong style={{ color: 'var(--c-purple)' }} title={gemsMax ? `${formatFullNumber(compGems)} - ${formatFullNumber(gemsMax)} exact` : `${formatFullNumber(compGems)} exact`}>
            Gems: {gemsMax ? `${formatCompactNumber(compGems)}-${formatCompactNumber(gemsMax)}` : formatCompactNumber(compGems)}
          </strong>
          <strong style={{ color: 'var(--c-warning)' }} title={coinsMax ? `${formatFullNumber(compCoins)} - ${formatFullNumber(coinsMax)} exact` : `${formatFullNumber(compCoins)} exact`}>
            Coins: {coinsMax ? `${formatCompactNumber(compCoins)}-${formatCompactNumber(coinsMax)}` : formatCompactNumber(compCoins)}
          </strong>
        </div>
      </div>

      <ValueTrendGraph slug={safeUnit.slug} currentValue={form.baseValue} currentGems={form.gems} currentCoins={form.coins} />

      <div className="admin-form-grid">
        <label className="admin-field">
          <span>Value (type 90-100 for range)</span>
          <input
            className="admin-text-input"
            type="text"
            value={rangeInput}
            onChange={(e) => setRangeInput(e.target.value)}
            onBlur={commitRange}
            onKeyDown={(e) => { if (e.key === 'Enter') { commitRange(); e.target.blur(); } }}
            placeholder="e.g. 90-100 or 500"
          />
        </label>
        <RangeTextInput
          label="Gems (type 10-20 for range)"
          min={form.gems}
          max={form.gemsMax}
          onCommit={(nextMin, nextMax) => { updateField('gems', nextMin); updateField('gemsMax', nextMax); }}
          placeholder="e.g. 10-20 or 5"
        />
        <RangeTextInput
          label="Coins (type 5-10 for range)"
          min={form.coins}
          max={form.coinsMax}
          onCommit={(nextMin, nextMax) => { updateField('coins', nextMin); updateField('coinsMax', nextMax); }}
          placeholder="e.g. 5-10 or 3"
        />
        <AdminSelect label="Demand" value={form.demand} onChange={(value) => updateField('demand', value)} options={DEMAND_LABELS} />
        <AdminSelect label="Scarcity" value={form.scarcity} onChange={(value) => updateField('scarcity', value)} options={SCARCITY_LABELS} />
        <AdminSelect label="Trend" value={form.trend} onChange={(value) => updateField('trend', value)} options={TRENDS} />
        <label className="admin-field full">
          <span>Notes &amp; Rationale</span>
          <textarea
            className="admin-textarea"
            value={form.notes || ''}
            onChange={(event) => updateField('notes', event.target.value)}
            placeholder="Reasoning, market evidence, trading observations…"
          />
        </label>
      </div>

      <div className="admin-actions">
        <button type="button" className="filled" onClick={saveValue} disabled={saving} title="Ctrl+S">
          {saving ? 'Saving…' : '💾 Save Global Value'}
        </button>
        <button type="button" onClick={resetValue}>🔄 Reset Value</button>
        <button type="button" onClick={refresh}>⚡ Refresh</button>
      </div>
      <AdminMessage message={message} action={messageAction} />
    </section>
  );
}

export function WikiEditor({ unit, form = {}, selectedRow, updateField, imageFile, setImageFile, saveWiki, resetWiki, refresh, saving, message, messageAction, dirty, imageMap = {}, wikiRows = [], canDeleteUnit, onDeleteUnit }) {
  const [dragging, setDragging] = useState(false);
  const safeUnit = unit || { slug: 'ball', name: 'Ball', rarity: 'Normie', type: 'DPS' };
  const previewSrc = imageFile ? URL.createObjectURL(imageFile) : form.imageUrl;
  const safeUpgrades = ensureArray(form.upgradeForms);

  async function acceptImage(file) {
    if (!file?.type?.startsWith('image/')) return;
    setImageFile(await compressImage(file)); // in-browser downscale before it ever hits the DB
  }
  function onDrop(event) { event.preventDefault(); setDragging(false); acceptImage(event.dataTransfer.files?.[0]); }
  function onPaste(event) {
    const file = event.clipboardData?.files?.[0];
    if (file?.type?.startsWith('image/')) {
      event.preventDefault();
      acceptImage(file);
    }
  }

  function updateUpgrade(index, key, value) {
    const next = [...safeUpgrades];
    next[index] = { ...next[index], [key]: value };
    updateField('upgradeForms', next);
  }

  function addUpgrade() {
    updateField('upgradeForms', [...safeUpgrades, upgradeToForm({}, safeUpgrades.length)]);
  }

  function removeUpgrade(index) {
    updateField('upgradeForms', safeUpgrades.filter((_, i) => i !== index));
  }

  return (
    <section className="admin-editor card">
      <EditorTitle unit={safeUnit} label="Editing WIKI" live={!!selectedRow} dirty={dirty} imageMap={imageMap} wikiRows={wikiRows} />

      <div className="admin-section-block">
        <h3 className="admin-block-title">Basic Unit Information</h3>
        <div style={{ marginBottom: 12, padding: '10px 14px', background: 'rgba(0, 255, 145, 0.06)', border: '1px dashed rgba(0, 255, 145, 0.25)', borderRadius: 12, fontSize: '0.82rem', color: 'var(--c-success)', fontWeight: 600 }}>
          ⚡ <strong>Shiny Autosync Active:</strong> When you save a Normal unit, its Shiny variant is automatically generated with 1.5× damage stats. Same description, type, category, costs, crate obtainments, and placement limit.
        </div>
        <div className="admin-form-grid">
          <div
            className={`admin-upload-zone ${dragging ? 'dragging' : ''}`}
            onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onPaste={onPaste}
          >
            {previewSrc ? (
              <img src={previewSrc} alt="Selected unit preview" className="admin-image-preview" />
            ) : (
              <strong>Drop unit artwork image here</strong>
            )}
            <label className="admin-upload-button">
              📸 Upload Render / Image
              <input type="file" accept="image/*" onChange={(event) => acceptImage(event.target.files?.[0])} />
            </label>
            <span className="admin-upload-meta">Auto-compressed in your browser · drag, browse or paste (Ctrl+V)</span>
          </div>

          <AdminInput label="Type" value={form.type} onChange={(value) => updateField('type', value)} />
          <AdminInput label="Raw Type" value={form.rawType} onChange={(value) => updateField('rawType', value)} />
          <AdminInput label="Category" value={form.category} onChange={(value) => updateField('category', value)} />
          <AdminInput label="Placement Limit" value={form.placementLimit} onChange={(value) => updateField('placementLimit', value)} />
          <AdminInput label="Total Cost" value={form.totalCost} onChange={(value) => updateField('totalCost', value)} />

          <label className="admin-field full">
            <span>Unit Description</span>
            <textarea className="admin-textarea" value={form.description || ''} onChange={(event) => updateField('description', event.target.value)} />
          </label>

          <label className="admin-field">
            <span>Passive Ability</span>
            <textarea className="admin-textarea" value={form.passive || ''} onChange={(event) => updateField('passive', event.target.value)} />
          </label>

          <label className="admin-field"><span>Active Ability</span><textarea className="admin-textarea" value={form.ability || ''} onChange={(event) => updateField('ability', event.target.value)} /></label>
          <label className="admin-field"><span>Synergy Traits</span><textarea className="admin-textarea" value={form.synergy || ''} onChange={(event) => updateField('synergy', event.target.value)} /></label>

          <label className="admin-field full">
            <span>Obtain Methods (one per line)</span>
            <textarea className="admin-textarea" value={form.obtainText || ''} onChange={(event) => updateField('obtainText', event.target.value)} />
          </label>

          <label className="admin-field full">
            <span>Min / Max Stats (one per line, e.g. Damage: 10 → 50)</span>
            <textarea className="admin-textarea admin-code-box" value={form.minMaxStatsText || ''} onChange={(event) => updateField('minMaxStatsText', event.target.value)} />
          </label>
        </div>
      </div>

      <div className="admin-level-editor">
        <div className="admin-section-head">
          <h3>Per-Level Upgrade Progression</h3>
          <button type="button" className="admin-btn-subtle" onClick={addUpgrade}>+ Add Level</button>
        </div>

        {safeUpgrades.map((upgrade, index) => (
          <div key={index} className="admin-level-card card">
            <div className="admin-level-head">
              <strong>Level {index}: {upgrade?.label || `Upgrade ${index}`}</strong>
              <button type="button" className="admin-btn-danger" onClick={() => removeUpgrade(index)}>Remove Level</button>
            </div>
            <div className="admin-form-grid compact" style={{ marginTop: 12 }}>
              <AdminInput label="Level Name" value={upgrade?.label} onChange={(value) => updateUpgrade(index, 'label', value)} />
              <AdminInput label="Upgrade Cost" value={upgrade?.costRaw} onChange={(value) => updateUpgrade(index, 'costRaw', value)} />
              <AdminInput label="Attack Cooldown (s)" value={upgrade?.cooldown} onChange={(value) => updateUpgrade(index, 'cooldown', value)} />
              <AdminInput label="Attack Range" value={upgrade?.range} onChange={(value) => updateUpgrade(index, 'range', value)} />
              <AdminInput label="Cost/DPS" value={upgrade?.costPerDps} onChange={(value) => updateUpgrade(index, 'costPerDps', value)} />

              <label className="admin-field full">
                <span>Level Notes &amp; Description</span>
                <textarea className="admin-textarea" value={upgrade?.description || ''} onChange={(event) => updateUpgrade(index, 'description', event.target.value)} />
              </label>

              <label className="admin-field"><span>DPS Metrics</span><textarea className="admin-textarea" value={upgrade?.dpsText || ''} onChange={(event) => updateUpgrade(index, 'dpsText', event.target.value)} placeholder="DPS: 100" /></label>
              <label className="admin-field"><span>Extra Stat Lines</span><textarea className="admin-textarea" value={upgrade?.statsText || ''} onChange={(event) => updateUpgrade(index, 'statsText', event.target.value)} placeholder="Health: 500" /></label>
              <label className="admin-field"><span>Attack Stat Lines</span><textarea className="admin-textarea" value={upgrade?.attacksText || ''} onChange={(event) => updateUpgrade(index, 'attacksText', event.target.value)} placeholder="Melee / Damage: 25" /></label>
            </div>
          </div>
        ))}
      </div>

      <div className="admin-actions">
        <button type="button" className="filled" onClick={saveWiki} disabled={saving} title="Ctrl+S">
          {saving ? 'Saving…' : '💾 Save WIKI Override'}
        </button>
        <button type="button" onClick={resetWiki}>🔄 Reset WIKI</button>
        <button type="button" onClick={refresh}>⚡ Refresh</button>
        {canDeleteUnit && (
          <button type="button" className="admin-btn-danger" onClick={onDeleteUnit} disabled={saving} title="Permanently remove this created unit from the site">
            🗑️ Delete Unit
          </button>
        )}
      </div>
      <AdminMessage message={message} action={messageAction} />
    </section>
  );
}

export function AdminLog({ activeTool: _activeTool, valueLog = [], wikiLog = [], role, valueLogs, wikiLogs, localChangeLog = [], onClearLogs, onRevert }) {
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [visible, setVisible] = useState(30);
  const [serverChanges, setServerChanges] = useState(null);
  const [serverLoading, setServerLoading] = useState(false);

  // Load the shared (server-side) change feed the first time the tab opens.
  useEffect(() => {
    if (tab !== 'server' || serverChanges !== null || serverLoading) return;
    setServerLoading(true);
    fetchChangeLog().then((changes) => {
      setServerChanges(changes);
      setServerLoading(false);
    }).catch(() => setServerLoading(false));
  }, [tab, serverChanges, serverLoading]);

  // Everything lives in the local change log now (value/wiki/map/crate kinds).
  // Remote log props are kept for compatibility but no longer feed in.
  const allEntries = (Array.isArray(localChangeLog) ? localChangeLog : [])
    .slice()
    .sort((a, b) => String(b.changed_at || '').localeCompare(String(a.changed_at || '')));

  const KIND_META = {
    value: { label: 'Value', icon: '💰', color: 'var(--c-info)' },
    wiki: { label: 'WIKI', icon: '📖', color: 'var(--c-success)' },
    map: { label: 'Map', icon: '🗺️', color: 'var(--c-warning)' },
    crate: { label: 'Crate', icon: '📦', color: 'var(--c-purple)' },
  };

  const q = search.trim().toLowerCase();
  const filtered = allEntries.filter((entry) => {
    const kindOk = tab === 'all' || entry?.kind === tab;
    const searchOk = !q || String(entry?.slug || '').toLowerCase().includes(q) || String(entry?.detail || '').toLowerCase().includes(q);
    return kindOk && searchOk;
  });

  const now = Date.now();
  const dayMs = 86400000;
  const todayCount = allEntries.filter((e) => e?.changed_at && now - new Date(e.changed_at).getTime() < dayMs).length;
  const weekCount = allEntries.filter((e) => e?.changed_at && now - new Date(e.changed_at).getTime() < 7 * dayMs).length;

  function dayGroupLabel(iso) {
    if (!iso) return 'Unknown date';
    const d = new Date(iso);
    const today = new Date();
    const yesterday = new Date(Date.now() - 86400000);
    const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
    if (sameDay(d, today)) return 'Today';
    if (sameDay(d, yesterday)) return 'Yesterday';
    return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  }

  function timeAgo(iso) {
    if (!iso) return '';
    const diff = Math.max(0, now - new Date(iso).getTime());
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  const tabs = [
    { id: 'all', label: 'All', count: allEntries.length },
    ...Object.entries(KIND_META).map(([id, meta]) => ({
      id,
      label: `${meta.icon} ${meta.label}`,
      count: allEntries.filter((e) => e?.kind === id).length,
    })),
    { id: 'server', label: '🌐 Server', count: serverChanges?.length || 0 },
  ];

  return (
    <section className="admin-log card">
      <div className="admin-section-head">
        <h2>📈 Logs &amp; Info</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className="admin-count-badge">{allEntries.length} Entries</span>
          {allEntries.length > 0 && (
            <button
              type="button"
              className="admin-btn-danger"
              onClick={() => { if (window.confirm('Clear ALL saved edit logs? This cannot be undone.')) { clearPersistedLogs(); if (onClearLogs) onClearLogs(); } }}
            >
              Clear Logs
            </button>
          )}
        </div>
      </div>

      <div className="log-stats">
        <div className="log-stat"><strong>{allEntries.length}</strong><span>Total edits</span></div>
        <div className="log-stat"><strong>{todayCount}</strong><span>Last 24h</span></div>
        <div className="log-stat"><strong>{weekCount}</strong><span>Last 7 days</span></div>
      </div>

      <div className="log-toolbar">
        <div className="log-tabs">
          {tabs.map((t) => (
            <button key={t.id} type="button" className={tab === t.id ? 'log-tab active' : 'log-tab'} onClick={() => setTab(t.id)}>
              {t.label}{t.count > 0 && <em>{t.count}</em>}
            </button>
          ))}
        </div>
        <input
          className="admin-search log-search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by unit or change…"
        />
      </div>

      {tab === 'server' ? (
        serverLoading ? (
          <p className="admin-muted">Loading shared history from the live database…</p>
        ) : !serverChanges || serverChanges.length === 0 ? (
          <p className="admin-muted">No shared changes yet. Every published edit from every editor appears here — permanently.</p>
        ) : (
          <div className="admin-log-list" data-lenis-prevent>
            {serverChanges
              .filter((entry) => {
                const q2 = search.trim().toLowerCase();
                return !q2 || String(entry?.slug || '').toLowerCase().includes(q2) || String(entry?.detail || '').toLowerCase().includes(q2);
              })
              .slice(0, visible)
              .map((entry) => {
                const meta = KIND_META[entry?.section] || KIND_META.value;
                const canRevert = typeof onRevert === 'function' && (entry.before || entry.kind === 'delete');
                return (
                  <div key={entry?.id || Math.random()} className="admin-log-entry">
                    <div className="admin-log-head">
                      <span className="log-entry-left">
                        <span className="log-kind" style={{ color: meta.color, borderColor: `color-mix(in srgb, ${meta.color} 45%, transparent)`, background: `color-mix(in srgb, ${meta.color} 10%, transparent)` }}>
                          {meta.icon} {meta.label}
                        </span>
                        <strong>{entry?.slug || 'database'}</strong>
                      </span>
                      <span title={entry?.at ? new Date(entry.at).toLocaleString() : ''}>
                        {timeAgo(entry?.at)}{entry?.by ? ` · ${getDisplayName(entry.by)}` : ''}
                      </span>
                    </div>
                    <p className="admin-log-meta">
                      {entry?.detail || 'Updated'}
                      {entry.kind === 'bundle' && ' (full publish)'}
                      {canRevert && (
                        <button type="button" className="log-revert-btn" onClick={() => onRevert(entry)}>↩️ Revert</button>
                      )}
                    </p>
                  </div>
                );
              })}
            {serverChanges.length > visible && (
              <button type="button" className="log-show-more" onClick={() => setVisible((v) => v + 30)}>
                Show 30 more ({serverChanges.length - visible} remaining)
              </button>
            )}
          </div>
        )
      ) : (role === 'owner' || role === 'admin') && (
        <div className="admin-log-graph-wrap">
          <ContributionGraphInline valueLogs={valueLogs || valueLog} wikiLogs={wikiLogs || wikiLog} localChangeLog={allEntries} />
        </div>
      )}

      {tab !== 'server' && (filtered.length === 0 ? (
        <p className="admin-muted">No matching entries. Save a value, WIKI, map or crate edit and it appears here instantly.</p>
      ) : (
        <div className="admin-log-list" data-lenis-prevent>
          {filtered.slice(0, visible).map((entry, index) => {
            const meta = KIND_META[entry?.kind] || KIND_META.value;
            const dayLabel = dayGroupLabel(entry?.changed_at);
            const prevDayLabel = index > 0 ? dayGroupLabel(filtered[index - 1]?.changed_at) : null;
            const showHeader = dayLabel !== prevDayLabel;
            return (
              <div key={entry?.id || Math.random()}>
                {showHeader && <div className="log-day-sep">{dayLabel}</div>}
                <div className="admin-log-entry">
                  <div className="admin-log-head">
                    <span className="log-entry-left">
                      <span className="log-kind" style={{ color: meta.color, borderColor: `color-mix(in srgb, ${meta.color} 45%, transparent)`, background: `color-mix(in srgb, ${meta.color} 10%, transparent)` }}>
                        {meta.icon} {meta.label}
                      </span>
                      <strong>{entry?.slug || 'unit'}</strong>
                    </span>
                    <span title={entry?.changed_at ? new Date(entry.changed_at).toLocaleString() : ''}>
                      {timeAgo(entry?.changed_at)}{entry?.changed_by_email ? ` · ${getDisplayName(entry.changed_by_email)}` : ''}
                    </span>
                  </div>
                  <p className="admin-log-meta">{entry?.detail || 'Updated'}</p>
                </div>
              </div>
            );
          })}
          {filtered.length > visible && (
            <button type="button" className="log-show-more" onClick={() => setVisible((v) => v + 30)}>
              Show 30 more ({filtered.length - visible} remaining)
            </button>
          )}
        </div>
      ))}
    </section>
  );
}

function ContributionGraphInline({ valueLogs = [], wikiLogs = [], localChangeLog = [] }) {
  const days = 30;
  const now = new Date();
  const buckets = {};
  for (let i = 0; i < days; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    buckets[key] = 0;
  }
  [...(valueLogs || []), ...(wikiLogs || []), ...(localChangeLog || [])].forEach((entry) => {
    if (entry?.changed_at) {
      const key = new Date(entry.changed_at).toISOString().slice(0, 10);
      if (key in buckets) buckets[key]++;
    }
  });
  const entries = Object.entries(buckets).reverse();
  const max = Math.max(1, ...entries.map(([, v]) => v));

  return (
    <div>
      <p style={{ fontSize: '0.8rem', color: 'var(--text-dim, #888)', marginBottom: 8 }}>Activity (last {days} days)</p>
      <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 60 }}>
        {entries.map(([date, count]) => (
          <div key={date} title={`${date}: ${count} edits`} style={{
            flex: 1,
            height: `${Math.max(4, (count / max) * 100)}%`,
            background: count > 0 ? 'var(--accent, var(--c-info))' : 'rgba(255,255,255,0.06)',
            borderRadius: 3,
            minHeight: 4,
          }} />
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-dim, #666)', marginTop: 4 }}>
        <span>{entries[0]?.[0]}</span>
        <span>{entries[entries.length - 1]?.[0]}</span>
      </div>
    </div>
  );
}

import { formatCompactNumber as formatCompactBase, formatFullNumber } from '../../utils/formatNumber';
export { formatFullNumber };

export function formatCompactNumber(value) {
  return formatCompactBase(value);
}

export function AdminInput({ label, value, onChange, type = 'text' }) {
  return (
    <label className="admin-field">
      <span>{label}</span>
      <input className="admin-text-input" type={type} value={value ?? ''} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

export function AdminSelect({ label, value, onChange, options = [] }) {
  return (
    <label className="admin-field">
      <span>{label}</span>
      <Dropdown
        value={value}
        onChange={onChange}
        options={(options || []).map((option) => (option && typeof option === 'object' ? option : { value: option, label: option }))}
        placeholder="Select…"
        ariaLabel={label}
      />
    </label>
  );
}

export function ContentEditor({ kind, item, form = {}, setForm, imageFile, setImageFile, onSave, onReset, saving, dirty }) {
  const [dragging, setDragging] = useState(false);
  const mapMode = kind === 'maps';
  const previewSrc = imageFile ? URL.createObjectURL(imageFile) : form.imageUrl;
  const accept = async (file) => {
    if (!file?.type?.startsWith('image/')) return;
    setImageFile(await compressImage(file)); // in-browser downscale before publish
  };
  const chances = form.chancesText !== undefined ? form.chancesText : Object.entries(form.chances || {}).map(([key, value]) => `${key}: ${value}`).join('\n');

  return (
    <section className="admin-editor card">
      <EditorTitle unit={item} label={`Editing ${mapMode ? 'Map' : 'Crate'}`} dirty={dirty} />
      <div className={`admin-upload-zone ${dragging ? 'dragging' : ''}`} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); accept(event.dataTransfer.files?.[0]); }}>
        {previewSrc ? <img src={previewSrc} alt="Content preview" className="admin-image-preview" /> : <strong>Drop artwork image here</strong>}
        <label className="admin-upload-button">📸 UPLOAD IMAGE<input type="file" accept="image/*" onChange={(event) => accept(event.target.files?.[0])} /></label>
        <span className="admin-upload-meta">Automatic cloud compression &amp; optimization</span>
      </div>
      <div className="admin-form-grid">
        <AdminInput label="Display Name" value={form.name || ''} onChange={(value) => setForm((p) => ({ ...p, name: value }))} />
        {mapMode ? (
          <>
            <AdminInput label="Difficulty Tier" value={form.difficulty || ''} onChange={(value) => setForm((p) => ({ ...p, difficulty: value }))} />
            <AdminInput label="Unlock Requirement" value={form.unlockRequirement || ''} onChange={(value) => setForm((p) => ({ ...p, unlockRequirement: value }))} />
          </>
        ) : (
          <>
            <AdminInput label="Obtain Source" value={form.obtain || ''} onChange={(value) => setForm((p) => ({ ...p, obtain: value }))} />
            <label className="admin-field full">
              <span>Units (one per line, e.g. Ball: 25%)</span>
              <textarea className="admin-textarea" value={chances} onChange={(event) => setForm((p) => ({ ...p, chancesText: event.target.value, chances: linesToObject(event.target.value) }))} />
            </label>
          </>
        )}
        <label className="admin-field full">
          <span>{mapMode ? 'Description' : 'Pity'}</span>
          <textarea
            className="admin-textarea"
            value={form.description || ''}
            onChange={(event) => setForm((p) => ({ ...p, description: event.target.value }))}
            placeholder={mapMode ? 'Short description…' : 'Pity:\n- Mythical: [Number Here]\n- Transcendent: [Number Here]'}
          />
        </label>
      </div>
      <div className="admin-actions">
        <button type="button" className="filled" onClick={onSave} disabled={saving} title="Ctrl+S">{saving ? 'Saving…' : `💾 Save ${mapMode ? 'Map' : 'Crate'}`}</button>
        <button type="button" onClick={onReset}>🔄 Reset Override</button>
      </div>
    </section>
  );
}
