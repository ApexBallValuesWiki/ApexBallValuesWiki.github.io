import './ShortcutHelp.css';

import { useEffect, useRef } from 'react';

const SHORTCUTS = [
  ['/', 'Open unit search'],
  ['W', 'WIKI home'],
  ['V', 'Values home'],
  ['C', 'Trade Calculator'],
  ['B', 'Ball Knowledge'],
  ['T', 'Theme Editor'],
  ['?', 'Show / hide shortcuts'],
  ['Esc', 'Close overlays'],
];

const ADMIN_SHORTCUTS = [
  ['Ctrl+S', 'Save the open editor form'],
  ['Ctrl+Z', 'Undo the last saved change'],
  ['Ctrl+Shift+Z', 'Redo an undone change'],
  ['↑ ↓ Enter', 'Walk unit search results'],
  ['Ctrl+V', 'Paste a screenshot into the image drop zone'],
];

export default function ShortcutHelp({ open, onClose, isAdmin = false }) {
  const panelRef = useRef(null);
  const restoreFocusRef = useRef(null);

  // Accessible dialog: focus moves in on open, is trapped while open, and
  // returns to the opener on close.
  useEffect(() => {
    if (!open) return undefined;
    restoreFocusRef.current = document.activeElement;
    panelRef.current?.focus();
    function onKey(event) {
      if (event.key !== 'Tab' || !panelRef.current) return;
      const focusables = panelRef.current.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      restoreFocusRef.current?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="shortcut-overlay" onClick={onClose}>
      <div ref={panelRef} role="dialog" aria-modal="true" aria-label="Keyboard shortcuts" tabIndex={-1} className="shortcut-panel card" onClick={(event) => event.stopPropagation()}>
        <div className="shortcut-head">
          <h2>Keyboard Shortcuts</h2>
          <button type="button" onClick={onClose}>✕</button>
        </div>
        <div className="shortcut-list">
          {SHORTCUTS.map(([key, label]) => (
            <div key={key} className="shortcut-row">
              <kbd>{key}</kbd>
              <span>{label}</span>
            </div>
          ))}
        </div>
        {isAdmin && (
          <>
            <h3 className="shortcut-group-title">Admin panel</h3>
            <div className="shortcut-list">
              {ADMIN_SHORTCUTS.map(([key, label]) => (
                <div key={key} className="shortcut-row">
                  <kbd>{key}</kbd>
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
