import { useExistCounts } from '../hooks/useExistCount';
import { formatExistCount, isExistStale, existAgeLabel } from '../utils/existCountStore';
import './ExistCountBadge.css';

const SOURCE_LABELS = {
  feed: 'public feed',
  cron: 'scheduled feed',
  opencloud: 'Roblox Open Cloud',
  push: 'game publisher',
  editor: 'editor',
  unknown: 'feed',
  none: 'no source',
};

/**
 * Renders NOTHING when the worker has no data. No zero, no estimate, no
 * placeholder. Never touches unit artwork in any way.
 */
export default function ExistCountBadge({ slug, compact = false, className = '' }) {
  const snapshot = useExistCounts();
  const value = snapshot.counts[String(slug || '').toLowerCase()];
  if (!Number.isInteger(value)) return null;

  const stale = isExistStale(snapshot.at);
  const source = SOURCE_LABELS[snapshot.source] || snapshot.source;
  const classes = ['exist-badge', compact ? 'is-compact' : '', stale ? 'is-stale' : '', className]
    .filter(Boolean).join(' ');

  return (
    <span
      className={classes}
      data-exist-slug={slug}
      data-exist-count={value}
      title={`${formatExistCount(value)} copies exist in-game · source: ${source} · as of ${snapshot.at || 'unknown'} · the site syncs every 60 seconds`}
    >
      <span className="exist-badge-dot" aria-hidden="true" />
      <strong>{formatExistCount(value)}</strong>&nbsp;exist
      {!compact && <span className="exist-badge-asof"> · {stale ? 'stale · ' : ''}{existAgeLabel(snapshot.at)}</span>}
    </span>
  );
}
