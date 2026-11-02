import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { dropdownPosition } from './dropdownPosition';
import CoolIcon from './CoolIcon';
import './Dropdown.css';

// Editable counterpart to Dropdown: identical theme, menu and option styling,
// but the user can type immediately and keep native form submission behavior.
export default function Autocomplete({ id, ariaLabel, value, onChange, onSelect, options = [], groups, placeholder = 'Search…', renderOption, className = '', emptyText = 'No matches.' }) {
  const listId = useId().replaceAll(':', '');
  const inputRef = useRef(null);
  const rootRef = useRef(null);
  const menuRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const [style, setStyle] = useState(null);
  const resolvedGroups = useMemo(() => groups || [{ label: null, options }], [groups, options]);
  const flat = useMemo(() => resolvedGroups.flatMap((group) => group.options || []), [resolvedGroups]);

  useEffect(() => {
    if (!open) return undefined;
    const place = () => { const rect = inputRef.current?.getBoundingClientRect(); if (rect) setStyle(dropdownPosition(rect, window.innerWidth, window.innerHeight)); };
    const onPointer = (e) => { if (!rootRef.current?.contains(e.target) && !menuRef.current?.contains(e.target)) setOpen(false); };
    // Follow the trigger as browsers scroll it into view on mobile keyboards.
    const onScroll = (e) => { if (!menuRef.current?.contains(e.target)) place(); };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', onScroll, true);
    document.addEventListener('pointerdown', onPointer);
    return () => { window.removeEventListener('resize', place); window.removeEventListener('scroll', onScroll, true); document.removeEventListener('pointerdown', onPointer); };
  }, [open]);
  useEffect(() => { if (open && highlight >= 0) menuRef.current?.querySelector('.dd-option.highlight')?.scrollIntoView({ block: 'nearest' }); }, [highlight, open]);

  function choose(option) {
    onSelect?.(option);
    setOpen(false);
    setHighlight(-1);
    inputRef.current?.focus();
  }
  function onKeyDown(event) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) setOpen(true);
      if (!flat.length) return;
      setHighlight((prev) => prev < 0 ? (event.key === 'ArrowDown' ? 0 : flat.length - 1) : (prev + (event.key === 'ArrowDown' ? 1 : -1) + flat.length) % flat.length);
    } else if (event.key === 'Escape' && open) {
      event.preventDefault(); setOpen(false); setHighlight(-1);
    } else if (event.key === 'Enter' && open && highlight >= 0 && flat[highlight]) {
      event.preventDefault(); choose(flat[highlight]);
    } else if (event.key === 'Enter' && open) {
      // No highlighted suggestion: let the parent form submit the typed value.
      setOpen(false);
    }
  }
  return (
    <div className={`dd-root dd-autocomplete${open ? ' open' : ''}${className ? ` ${className}` : ''}`} ref={rootRef}>
      <div className="dd-input-wrap">
        <CoolIcon name="search" size={18} className="dd-input-icon" />
        <input ref={inputRef} id={id} className="dd-input" role="combobox" aria-label={ariaLabel} aria-autocomplete="list" aria-expanded={open} aria-controls={open ? listId : undefined} aria-activedescendant={open && highlight >= 0 ? `${listId}-option-${highlight}` : undefined} value={value} onChange={(e) => { onChange(e.target.value); setHighlight(-1); setOpen(true); }} onFocus={() => setOpen(true)} onBlur={() => window.setTimeout(() => setOpen(false), 130)} onKeyDown={onKeyDown} placeholder={placeholder} autoComplete="off" />
      </div>
      {open && style && createPortal(
        <div className="dd-menu" style={style} ref={menuRef} data-lenis-prevent>
          <div className="dd-list" id={listId} role="listbox" aria-label={ariaLabel || placeholder}>
            {!flat.length ? <div className="dd-empty">{emptyText}</div> : resolvedGroups.map((group, groupIndex) => (
              <div className="dd-group" role="presentation" key={group.label || groupIndex}>
                {group.label && <div className="dd-group-label">{group.label}</div>}
                {(group.options || []).map((option) => {
                  const index = flat.indexOf(option);
                  return <button type="button" role="option" aria-selected={index === highlight} id={`${listId}-option-${index}`} key={String(option.value)} className={`dd-option${index === highlight ? ' highlight' : ''}`} onMouseDown={(e) => e.preventDefault()} onClick={() => choose(option)} onMouseEnter={() => setHighlight(index)}>
                    {renderOption ? renderOption(option) : <>{option.icon && <img className="dd-option-icon" src={option.icon} alt="" loading="lazy" />}<span className="dd-option-label">{option.label}</span>{option.meta && <small className="dd-option-meta">{option.meta}</small>}</>}
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
