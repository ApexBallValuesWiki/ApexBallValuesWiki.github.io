import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';

import { getRarityGlow } from '../data/taxonomy';
import { formatSiteNumber } from '../utils/formatNumber';
import { toggleOfflineValuesMode } from '../utils/offlineValues';
import './CommandPalette.css';

export const OPEN_PALETTE_EVENT = 'apex:open-palette';

const PAGE_COMMANDS = [
  { group: 'Values', label: 'What can I afford?', hint: 'Reverse budget research', to: '/values/afford', icon: '💎' },
  { group: 'Values', label: 'Trade Calculator', hint: 'Compare a trade', to: '/values/calculator', icon: '🧮' },
  { group: 'Values', label: 'Search Unit Values', hint: 'All value entries', to: '/values/units/search', icon: '🔎' },
  { group: 'Values', label: 'Market Analytics', hint: 'Demand & trends', to: '/values/analytics', icon: '📈' },
  { group: 'WIKI', label: 'Browse Units', hint: 'Stats, upgrades, DPS', to: '/wiki/units/search', icon: '📚' },
  { group: 'WIKI', label: 'Maps', hint: 'All maps', to: '/wiki/maps', icon: '🗺️' },
  { group: 'WIKI', label: 'Crates', hint: 'Crate odds', to: '/wiki/crates', icon: '📦' },
  { group: 'Other', label: 'Home', hint: 'Landing page', to: '/', icon: '🏠' },
  { group: 'Other', label: 'Theme Studio', hint: 'Customise the look', to: '/theme-editor', icon: '🎨' },
  { group: 'Other', label: 'Admin Panel', hint: 'Editors only', to: '/admin', icon: '⚙️' },
  { group: 'Other', label: 'Toggle OFFLINE Values mode', hint: 'Use baked + cached values, no network', action: 'toggle-offline', icon: '📴' },
];

function score(haystack, needle) {
  const text = haystack.toLowerCase();
  const query = needle.toLowerCase().trim();
  if (!query) return 1;
  if (text === query) return 100;
  if (text.startsWith(query)) return 70;
  const index = text.indexOf(query);
  if (index !== -1) return 40 - Math.min(index, 20);
  // Fuzzy: all query characters in order.
  let cursor = 0;
  for (const char of query) {
    cursor = text.indexOf(char, cursor);
    if (cursor === -1) return 0;
    cursor += 1;
  }
  return 8;
}

/**
 * Global command palette. Open with ⌘K / Ctrl+K, the header search button, or
 * the `apex:open-palette` event. Searches pages and units in one place, with
 * full arrow-key / Enter / Escape navigation.
 */
export default function CommandPalette() {
  const navigate = useNavigate();
  const location = useLocation();
  const { unitValues } = useData();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);

  const unitCommands = useMemo(() => (unitValues || [])
    .filter((unit) => unit && unit.slug && unit.kind !== 'item')
    .map((unit) => ({
      group: 'Units',
      label: unit.name,
      hint: `${unit.rarity || 'Unit'} · ${formatSiteNumber(unit.tradeValue)} value`,
      to: `/values/units/${encodeURIComponent(unit.rarity || 'Normie')}/${encodeURIComponent(unit.slug)}`,
      icon: '🎯',
      glow: getRarityGlow(unit.rarity),
      keywords: `${unit.name} ${unit.rarity} ${unit.slug}`,
    })), [unitValues]);

  const results = useMemo(() => {
    const all = [
      ...PAGE_COMMANDS.map((item) => ({ ...item, keywords: `${item.label} ${item.hint} ${item.group}` })),
      ...unitCommands,
    ];
    if (!query.trim()) return PAGE_COMMANDS.slice(0, 8);
    return all
      .map((item) => ({ ...item, rank: Math.max(score(item.label, query), score(item.keywords, query) * 0.8) }))
      .filter((item) => item.rank > 0)
      .sort((a, b) => b.rank - a.rank)
      .slice(0, 12);
  }, [query, unitCommands]);

  useEffect(() => { setActive(0); }, [query, open]);

  useEffect(() => {
    function onOpen() { setOpen(true); }
    function onKeyDown(event) {
      const key = event.key;
      if ((event.metaKey || event.ctrlKey) && key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((value) => !value);
        return;
      }
      if (key === 'Escape') setOpen(false);
    }
    window.addEventListener(OPEN_PALETTE_EVENT, onOpen);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener(OPEN_PALETTE_EVENT, onOpen);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => inputRef.current?.focus(), 20);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [open]);

  function choose(item) {
    if (!item) return;
    setOpen(false);
    setQuery('');
    if (item.action === 'toggle-offline') {
      toggleOfflineValuesMode();
      return;
    }
    navigate(item.to);
  }

  function onInputKeyDown(event) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((value) => Math.min(results.length - 1, value + 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((value) => Math.max(0, value - 1));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      choose(results[active]);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
    }
  }

  if (!open) return null;

  return (
    <div className="apex-palette-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <div className="apex-palette" role="dialog" aria-modal="true" aria-label="Command palette" data-apex-palette="open">
        <div className="apex-palette-search">
          <span aria-hidden="true">🔍</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onInputKeyDown}
            placeholder="Search units, pages and tools…"
            aria-label="Search commands"
            data-apex-palette-input=""
          />
          <kbd>ESC</kbd>
        </div>
        <div className="apex-palette-results" role="listbox" aria-label="Results">
          {results.length === 0 && <div className="apex-palette-empty">No matches. Try a unit name, “afford”, or “settings”.</div>}
          {results.map((item, index) => (
            <button
              key={`${item.to}-${index}`}
              type="button"
              role="option"
              aria-selected={index === active}
              className={`apex-palette-item${index === active ? ' active' : ''}`}
              onMouseEnter={() => setActive(index)}
              onClick={() => choose(item)}
              style={item.glow ? { '--palette-glow': item.glow } : undefined}
            >
              <span className="apex-palette-icon" aria-hidden="true">{item.icon}</span>
              <span className="apex-palette-text">
                <strong>{item.label}</strong>
                <small>{item.hint}</small>
              </span>
              <span className="apex-palette-group">{item.group}</span>
            </button>
          ))}
        </div>
        <div className="apex-palette-footer">
          <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
          <span><kbd>↵</kbd> open</span>
          <span><kbd>⌘</kbd><kbd>K</kbd> toggle</span>
          <span className="apex-palette-loc">{location.pathname}</span>
        </div>
      </div>
    </div>
  );
}
