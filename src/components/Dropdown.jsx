import { useEffect, useMemo, useRef, useState } from 'react';
import './Dropdown.css';

/**
 * Accessible, theme-matched custom dropdown that replaces native <select>.
 *
 * Props:
 *  - value / onChange       controlled selection (value is the option .value)
 *  - options                [{ value, label }]  (flat list, no group headers)
 *  - groups                 [{ label, options: [{ value, label }] }]
 *                           group headers + sections (mutually exclusive with options)
 *  - placeholder            text when nothing is selected
 *  - searchable             show a filter box inside the menu
 *  - searchPlaceholder
 *  - disabled
 *  - ariaLabel / id
 *  - accent                 optional CSS color used for the selected option /
 *                           the button focus ring (e.g. a rarity glow color)
 *
 * Keyboard: Enter/Space toggles, Escape closes, click-outside closes.
 */
export default function Dropdown({
  value,
  onChange,
  options,
  groups,
  placeholder = 'Select…',
  searchable = false,
  searchPlaceholder = 'Search…',
  disabled = false,
  ariaLabel,
  id,
  accent,
}) {
  const resolvedGroups = useMemo(() => {
    if (groups) return groups;
    return [{ label: null, options: options || [] }];
  }, [groups, options]);

  const flatOptions = useMemo(
    () => resolvedGroups.flatMap((group) => group.options || []),
    [resolvedGroups]
  );

  const selected = flatOptions.find((option) => option.value === value) || null;

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef(null);
  const buttonRef = useRef(null);

  // Close on outside click + Escape.
  useEffect(() => {
    if (!open) return undefined;
    function onPointer(event) {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false);
    }
    function onKey(event) {
      if (event.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Clear the filter each time the menu opens.
  useEffect(() => {
    if (open) setQuery('');
  }, [open]);

  const normalizedQuery = query.trim().toLowerCase();
  const visibleGroups = useMemo(() => {
    if (!normalizedQuery) return resolvedGroups;
    return resolvedGroups
      .map((group) => ({
        ...group,
        options: (group.options || []).filter((option) =>
          String(option.label).toLowerCase().includes(normalizedQuery)
        ),
      }))
      .filter((group) => group.options.length > 0);
  }, [resolvedGroups, normalizedQuery]);

  function choose(option) {
    onChange?.(option.value);
    setOpen(false);
    buttonRef.current?.focus();
  }

  const accentStyle = accent ? { '--dd-accent': accent } : undefined;

  return (
    <div
      className={`dd-root${open ? ' open' : ''}${disabled ? ' disabled' : ''}`}
      ref={rootRef}
      style={accentStyle}
    >
      <button
        ref={buttonRef}
        type="button"
        id={id}
        className="dd-button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="dd-button-label">
          {selected ? selected.label : <span className="dd-placeholder">{placeholder}</span>}
        </span>
        <span className={`dd-caret${open ? ' flipped' : ''}`} aria-hidden="true">▾</span>
      </button>

      {open && (
        <div className="dd-menu" data-lenis-prevent>
          {searchable && (
            <input
              className="dd-search"
              type="text"
              placeholder={searchPlaceholder}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              autoComplete="off"
              autoFocus
              data-lenis-prevent
            />
          )}
          <div className="dd-list" role="listbox">
            {visibleGroups.length === 0 ? (
              <div className="dd-empty">No matches.</div>
            ) : (
              visibleGroups.map((group, groupIndex) => (
                <div key={group.label || groupIndex} className="dd-group">
                  {group.label && <div className="dd-group-label">{group.label}</div>}
                  {group.options.map((option) => {
                    const isActive = option.value === value;
                    return (
                      <button
                        type="button"
                        key={option.value}
                        role="option"
                        aria-selected={isActive}
                        className={`dd-option${isActive ? ' selected' : ''}`}
                        onClick={() => choose(option)}
                      >
                        <span className="dd-option-label">{option.label}</span>
                        {isActive && <span className="dd-check" aria-hidden="true">✓</span>}
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
