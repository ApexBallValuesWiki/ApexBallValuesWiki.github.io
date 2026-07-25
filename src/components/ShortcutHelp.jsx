import './ShortcutHelp.css';

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

export default function ShortcutHelp({ open, onClose }) {
  if (!open) return null;

  return (
    <div className="shortcut-overlay" onClick={onClose}>
      <div className="shortcut-panel card" onClick={(event) => event.stopPropagation()}>
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
      </div>
    </div>
  );
}
