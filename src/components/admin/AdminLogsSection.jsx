import React from 'react';
import BlameLog from './BlameLog';
import { AdminLog, DeletedUnitsPanel } from './AdminParts';
import MarketAnalytics from '../MarketAnalytics';

export default function AdminLogsSection({
  role,
  valueLog = [],
  wikiLog = [],
  localChangeLog = [],
  onClearLogs,
  onRevert,
  deletedUnitSlugs = [],
  onRestoreUnit,
  restoringUnit,
  valueRows = [],
  units = [],
}) {
  return (
    <div className="admin-logs-stack">
      <BlameLog />
      <AdminLog
        activeTool="values"
        valueLog={valueLog}
        wikiLog={wikiLog}
        role={role}
        valueLogs={valueLog}
        wikiLogs={wikiLog}
        localChangeLog={localChangeLog}
        onClearLogs={onClearLogs}
        onRevert={onRevert}
      />
      <DeletedUnitsPanel
        units={[...deletedUnitSlugs]}
        onRestore={onRestoreUnit}
        restoring={restoringUnit}
      />
      {(role === 'owner' || role === 'admin') && (
        <MarketAnalytics valueRows={valueRows} units={units} />
      )}
    </div>
  );
}
