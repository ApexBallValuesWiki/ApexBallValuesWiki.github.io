import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { dropdownPosition } from './dropdownPosition';
import CoolIcon from './CoolIcon';
import './Dropdown.css';

// Shared select surface: the same fixed menu and options are also used by the
// editable Autocomplete. Portalling avoids clipping in cards and scroll panes.
export default function Dropdown({ value, onChange, options, groups, placeholder = 'Select…', searchable = false, searchPlaceholder = 'Search…', disabled = false, ariaLabel, id, accent, compact = false, className = '' }) {
  const menuId = useId().replaceAll(':', '');
  const resolvedGroups = useMemo(() => groups || [{ label: null, options: options || [] }], [groups, options]);
  const allOptions = useMemo(() => resolvedGroups.flatMap((group) => group.options || []), [resolvedGroups]);
  const selected = allOptions.find((option) => option.value === value);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [menuStyle, setMenuStyle] = useState(null);
  const [highlight, setHighlight] = useState(-1);
  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const searchRef = useRef(null);
  const menuRef = useRef(null);

  const visibleGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    return resolvedGroups.map((group) => ({ ...group, options: (group.options || []).filter((option) => !q || String(option.label).toLowerCase().includes(q)) })).filter((group) => group.options.length);
  }, [resolvedGroups, query]);
  const visibleOptions = useMemo(() => visibleGroups.flatMap((group) => group.options), [visibleGroups]);

  useEffect(() => {
    if (!open) return undefined;
    const place = () => {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (rect) setMenuStyle(dropdownPosition(rect, window.innerWidth, window.innerHeight));
    };
    place();
    window.addEventListener('resize', place);
    const focusTimer = searchable ? window.setTimeout(() => searchRef.current?.focus(), 0) : null;
    return () => { window.removeEventListener('resize', place); if (focusTimer) window.clearTimeout(focusTimer); };
  }, [open, searchable]);

  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (e) => { if (!rootRef.current?.contains(e.target) && !menuRef.current?.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') { setOpen(false); buttonRef.current?.focus(); } };
    const onScroll = (e) => {
      if (!menuRef.current?.contains(e.target)) {
        const rect = buttonRef.current?.getBoundingClientRect();
        if (rect) setMenuStyle(dropdownPosition(rect, window.innerWidth, window.innerHeight));
      }
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, true);
    return () => { document.removeEventListener('pointerdown', onPointer); document.removeEventListener('keydown', onKey); window.removeEventListener('scroll', onScroll, true); };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setHighlight(allOptions.findIndex((option) => option.value === value));
    // Reset once per opening; options and selection can change while open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => { if (open && highlight >= 0) menuRef.current?.querySelector('.dd-option.highlight')?.scrollIntoView({ block: 'nearest' }); }, [highlight, open]);
  function choose(option) { onChange?.(option.value); setOpen(false); buttonRef.current?.focus(); }
  function onKeyDown(event) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) { setOpen(true); return; }
      setHighlight((prev) => {
        if (!visibleOptions.length) return -1;
        if (prev < 0) return event.key === 'ArrowDown' ? 0 : visibleOptions.length - 1;
        return (prev + (event.key === 'ArrowDown' ? 1 : -1) + visibleOptions.length) % visibleOptions.length;
      });
    } else if (event.key === 'Enter' && open) {
      event.preventDefault();
      const pick = visibleOptions[highlight >= 0 ? highlight : 0];
      if (pick) choose(pick);
    }
  }
  const activeId = highlight >= 0 && visibleOptions[highlight] ? `${menuId}-option-${highlight}` : undefined;
  return (
    <div ref={rootRef} className={`dd-root${open ? ' open' : ''}${disabled ? ' disabled' : ''}${compact ? ' compact' : ''}${className ? ` ${className}` : ''}`} style={accent ? { '--dd-accent': accent } : undefined}>
      <button ref={buttonRef} type="button" id={id} className="dd-button" disabled={disabled} aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? menuId : undefined} aria-label={ariaLabel} onClick={() => setOpen((prev) => !prev)} onKeyDown={onKeyDown}>
        {selected?.icon && <img className="dd-button-icon" src={selected.icon} alt="" />}
        <span className="dd-button-label">{selected ? selected.label : <span className="dd-placeholder">{placeholder}</span>}</span>
        <CoolIcon name="chevron-down" size={18} className={`dd-caret${open ? ' flipped' : ''}`} />
      </button>
      {open && menuStyle && createPortal(
        <div className="dd-menu" style={menuStyle} ref={menuRef} data-lenis-prevent>
          {searchable && <input ref={searchRef} className="dd-search" type="text" role="combobox" aria-label={searchPlaceholder} aria-autocomplete="list" aria-expanded="true" aria-controls={menuId} aria-activedescendant={activeId} placeholder={searchPlaceholder} value={query} onChange={(e) => { setQuery(e.target.value); setHighlight(-1); }} onKeyDown={onKeyDown} autoComplete="off" />}
          <div id={menuId} className="dd-list" role="listbox" aria-label={ariaLabel || placeholder}>
            {!visibleOptions.length ? <div className="dd-empty">No matches.</div> : visibleGroups.map((group, i) => (
              <div key={group.label || i} className="dd-group" role="presentation">
                {group.label && <div className="dd-group-label">{group.label}</div>}
                {group.options.map((option) => {
                  const index = visibleOptions.indexOf(option);
                  const isActive = option.value === value;
                  return <button type="button" key={String(option.value)} id={`${menuId}-option-${index}`} role="option" aria-selected={isActive} className={`dd-option${isActive ? ' selected' : ''}${index === highlight ? ' highlight' : ''}`} onClick={() => choose(option)} onMouseEnter={() => setHighlight(index)}>
                    {option.icon && <img className="dd-option-icon" src={option.icon} alt="" loading="lazy" />}
                    <span className="dd-option-label">{option.label}</span>
                    {isActive && <CoolIcon name="check" size={16} className="dd-check" />}
                  </button>;
                })}
              </div>
            ))}
          </div>
        </div>, document.body
      )}
    </div>
  );
}
