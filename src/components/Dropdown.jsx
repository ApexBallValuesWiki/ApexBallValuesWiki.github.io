import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './Dropdown.css';

/**
 * Accessible, theme-matched custom dropdown that replaces native <select>.
 * EVERY dropdown on the site routes through this component — no native
 * selects anywhere in the UI.
 *
 * The menu is portaled to document.body with position: fixed, because the
 * app scrolls inside a CSS-transformed wrapper (lenis) where absolutely
 * positioned menus compute wrong coordinates. Position is measured from the
 * button rect, clamped to the viewport, and flips upward when there is more
 * room above. Any scroll outside the menu closes it (so it never detaches).
 *
 * Props:
 *  - value / onChange       controlled selection (value is the option .value)
 *  - options                [{ value, label }]  (flat list, no group headers)
 *  - groups                 [{ label, options: [{ value, label }] }]
 *  - placeholder            text when nothing is selected
 *  - searchable             show a filter box inside the menu
 *  - searchPlaceholder
 *  - disabled
 *  - ariaLabel / id
 *  - accent                 optional CSS color for selection + focus ring
 *  - option.icon            optional image URL rendered beside the label
 *                           (unit images in pickers) and in the button
 *  - compact                smaller button (toolbars/filters)
 *  - className              extra classes on the root (e.g. width utilities)
 *
 * Keyboard: Enter/Space toggles, ↑/↓ move, Enter picks, Escape closes,
 * click-outside closes.
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
  compact = false,
  className = '',
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
  const [menuStyle, setMenuStyle] = useState(null);
  const [highlight, setHighlight] = useState(-1);
  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);

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

  const visibleOptions = useMemo(
    () => visibleGroups.flatMap((group) => group.options || []),
    [visibleGroups]
  );

  // Measure the button and place the menu (fixed, viewport-clamped, flips up).
  useEffect(() => {
    if (!open || !buttonRef.current) return undefined;
    function place() {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;
      const width = Math.max(rect.width, 170);
      const spaceBelow = window.innerHeight - rect.bottom;
      const roomBelow = Math.min(340, spaceBelow - 14);
      const openUp = roomBelow < 140 && rect.top > spaceBelow;
      let left = rect.left;
      if (left + width > window.innerWidth - 8) left = Math.max(8, window.innerWidth - 8 - width);
      setMenuStyle(
        openUp
          ? {
              position: 'fixed',
              left: `${Math.round(left)}px`,
              bottom: `${Math.round(window.innerHeight - rect.top + 6)}px`,
              minWidth: `${Math.round(width)}px`,
              maxHeight: `${Math.max(120, Math.round(rect.top - 14))}px`,
            }
          : {
              position: 'fixed',
              left: `${Math.round(left)}px`,
              top: `${Math.round(rect.bottom + 6)}px`,
              minWidth: `${Math.round(width)}px`,
              maxHeight: `${Math.max(120, Math.round(roomBelow))}px`,
            }
      );
    }
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [open]);

  // Close on outside click, Escape, and any scroll that isn't inside the menu.
  useEffect(() => {
    if (!open) return undefined;
    function onPointer(event) {
      if (rootRef.current?.contains(event.target)) return;
      if (menuRef.current?.contains(event.target)) return;
      setOpen(false);
    }
    function onKey(event) {
      if (event.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    function onScroll(event) {
      if (menuRef.current?.contains(event.target)) return;
      setOpen(false);
    }
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [open]);

  // Reset filter + highlight each time the menu opens.
  useEffect(() => {
    if (open) {
      setQuery('');
      setHighlight(visibleOptions.findIndex((o) => o.value === value));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Keep the highlighted option in view while arrowing through the list.
  useEffect(() => {
    if (!open || highlight < 0) return;
    menuRef.current?.querySelector('.dd-option.highlight')?.scrollIntoView({ block: 'nearest' });
  }, [highlight, open]);

  function choose(option) {
    onChange?.(option.value);
    setOpen(false);
    buttonRef.current?.focus();
  }

  function onButtonKeyDown(event) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      setHighlight((prev) => {
        if (visibleOptions.length === 0) return -1;
        if (prev === -1) return event.key === 'ArrowDown' ? 0 : visibleOptions.length - 1;
        const next = event.key === 'ArrowDown' ? prev + 1 : prev - 1;
        if (next < 0) return visibleOptions.length - 1;
        if (next >= visibleOptions.length) return 0;
        return next;
      });
    } else if (event.key === 'Enter' && open) {
      event.preventDefault();
      if (highlight >= 0 && visibleOptions[highlight]) choose(visibleOptions[highlight]);
      else setOpen(false);
    }
  }

  const accentStyle = accent ? { '--dd-accent': accent } : undefined;

  return (
    <div
      className={`dd-root${open ? ' open' : ''}${disabled ? ' disabled' : ''}${compact ? ' compact' : ''}${className ? ` ${className}` : ''}`}
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
        onKeyDown={onButtonKeyDown}
      >
        {selected?.icon ? <img className="dd-button-icon" src={selected.icon} alt="" /> : null}
        <span className="dd-button-label">
          {selected ? selected.label : <span className="dd-placeholder">{placeholder}</span>}
        </span>
        <span className={`dd-caret${open ? ' flipped' : ''}`} aria-hidden="true">▾</span>
      </button>

      {open &&
        createPortal(
          <div className="dd-menu" style={menuStyle ?? undefined} ref={menuRef} data-lenis-prevent>
            {searchable && (
              <input
                className="dd-search"
                type="text"
                placeholder={searchPlaceholder}
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setHighlight(-1);
                }}
                autoComplete="off"
                data-lenis-prevent
              />
            )}
            <div className="dd-list" role="listbox">
              {visibleOptions.length === 0 ? (
                <div className="dd-empty">No matches.</div>
              ) : (
                visibleGroups.map((group, groupIndex) => (
                  <div key={group.label || groupIndex} className="dd-group">
                    {group.label && <div className="dd-group-label">{group.label}</div>}
                    {group.options.map((option) => {
                      const isActive = option.value === value;
                      const isHighlighted = option === visibleOptions[highlight];
                      return (
                        <button
                          type="button"
                          key={option.value}
                          role="option"
                          aria-selected={isActive}
                          className={`dd-option${isActive ? ' selected' : ''}${isHighlighted ? ' highlight' : ''}`}
                          onClick={() => choose(option)}
                          onMouseEnter={() => setHighlight(visibleOptions.indexOf(option))}
                        >
                          {option.icon ? <img className="dd-option-icon" src={option.icon} alt="" loading="lazy" /> : null}
                          <span className="dd-option-label">{option.label}</span>
                          {isActive && <span className="dd-check" aria-hidden="true">✓</span>}
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
