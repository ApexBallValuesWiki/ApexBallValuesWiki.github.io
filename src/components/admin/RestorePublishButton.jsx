import { useState } from 'react';
import { restoreOverridesBackup } from '../../utils/apexClient';

/**
 * Undo the previous publish. The worker keeps `backup:previous` on every
 * write, so a bad save (or a unit that vanished after Refresh) is recoverable
 * instead of being permanent.
 */
export default function RestorePublishButton({ onDone, className = '' }) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');

  async function restore() {
    if (busy) return;
    if (typeof window !== 'undefined' && !window.confirm('Restore the previous published database? The current version is kept as the new backup.')) return;
    setBusy(true);
    setNote('');
    try {
      const result = await restoreOverridesBackup();
      if (!result?.ok) {
        setNote(result?.error || 'Restore failed.');
      } else {
        setNote(`Restored v${result.v}`);
        if (onDone) await onDone();
      }
    } catch {
      setNote('Restore failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className={`admin-restore-wrap ${className}`.trim()}>
      <button
        type="button"
        className="admin-restore-btn"
        onClick={restore}
        disabled={busy}
        title="Undo the last publish — restores the previous saved database"
      >
        {busy ? 'Restoring…' : '↩︎ Undo last publish'}
      </button>
      {note && <small className="admin-restore-note">{note}</small>}
    </span>
  );
}
