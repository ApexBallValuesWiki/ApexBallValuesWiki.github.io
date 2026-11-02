import React, { useMemo } from 'react';
import BlameLog from './BlameLog';
import { AdminMessage, DeletedUnitsPanel } from './AdminParts';
import MarketAnalytics from '../MarketAnalytics';

function LocalDraftLog({ entries }) {
  const recent = useMemo(() => [...(Array.isArray(entries) ? entries : [])]
    .sort((a, b) => String(b.changed_at || '').localeCompare(String(a.changed_at || ''))), [entries]);
  return (
    <section className="activity-local card" aria-labelledby="local-drafts-title">
      <span className="activity-kicker">THIS BROWSER ONLY</span>
      <h2 id="local-drafts-title">Local edit history</h2>
      <p>These are browser-local actions, not confirmation that a change was published. They may also appear in the shared feed after a successful publish.</p>
      {!recent.length ? <p className="activity-empty">No local actions are recorded in this browser.</p> : (
        <div className="activity-local-list" data-lenis-prevent>
          {recent.map((entry, i) => {
            const time = new Date(entry.changed_at || '');
            const validTime = Number.isFinite(time.getTime());
            return <div className="activity-local-row" key={entry.id ?? i}>
              <div><strong>{entry.detail || 'Local action'}</strong><span>{entry.slug || 'Unit not recorded'} · {entry.kind || 'Section not recorded'}</span></div>
              <time dateTime={validTime ? entry.changed_at : undefined}>{validTime ? time.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : 'Time not recorded'}</time>
            </div>;
          })}
        </div>
      )}
    </section>
  );
}

export default function AdminLogsSection({ role, localChangeLog = [], deletedUnitSlugs = [], onRestoreUnit, restoringUnit, valueRows = [], units = [], onRevert, message, messageAction }) {
  return (
    <div className="admin-logs-stack">
      <AdminMessage message={message} action={messageAction} />
      <BlameLog onRevert={onRevert} />
      <LocalDraftLog entries={localChangeLog} />
      <DeletedUnitsPanel units={[...deletedUnitSlugs]} onRestore={onRestoreUnit} restoring={restoringUnit} />
      {(role === 'owner' || role === 'admin') && <MarketAnalytics valueRows={valueRows} units={units} />}
    </div>
  );
}
