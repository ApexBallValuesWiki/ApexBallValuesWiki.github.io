// Only associate a feed entry with the SAME history record, never with another
// edit of the same unit. Old records without IDs can match a unique timestamp.
export function matchHistoryRecord(entry, history) {
  if (!entry || !Array.isArray(history)) return null;
  if (entry.id != null) return history.find((row) => row?.id != null && String(row.id) === String(entry.id)) || null;
  if (!entry.at) return null;
  const matches = history.filter((row) => row?.at === entry.at && (!row.section || row.section === entry.section) && (!row.slug || row.slug === entry.slug));
  return matches.length === 1 ? matches[0] : null;
}

const META_KEYS = new Set(['updated_at', 'updatedAt', 'updated_by', 'updatedBy']);
export function historyChanges(record) {
  if (!record || !Object.hasOwn(record, 'before') || !Object.hasOwn(record, 'after')) return null;
  const before = record.before && typeof record.before === 'object' ? record.before : {};
  const after = record.after && typeof record.after === 'object' ? record.after : {};
  return [...new Set([...Object.keys(before), ...Object.keys(after)])]
    .filter((key) => !META_KEYS.has(key) && JSON.stringify(before[key]) !== JSON.stringify(after[key]))
    .map((key) => ({ key, before: before[key], after: after[key] }));
}

export function displayAuditValue(value) {
  if (value === undefined) return 'Not present';
  if (value === null) return 'null';
  if (typeof value === 'string') return value === '' ? 'Empty string' : value;
  try { return JSON.stringify(value); } catch { return '[Value unavailable]'; }
}
