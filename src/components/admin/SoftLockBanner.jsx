import { useEffect, useState } from 'react';
import { fetchChangeLog } from '../../utils/apexClient';
import { getTeamMember } from '../../utils/teamMembers';

// SOFT LOCK — "who else is in here?" Zero new infrastructure: it cross-
// references the shared change feed (someone edited this unit recently) and a
// BroadcastChannel (this unit is open in another tab right now). Soft by
// design — it warns, it never blocks.
const RECENT_MS = 15 * 60 * 1000; // "recently edited" window

export default function SoftLockBanner({ slug, selfEmail }) {
  const [recent, setRecent] = useState(null); // { name, mins }
  const [otherTab, setOtherTab] = useState(false);

  useEffect(() => {
    if (!slug) { setRecent(null); setOtherTab(false); return undefined; }
    let alive = true;
    const load = async () => {
      const rows = await fetchChangeLog();
      if (!alive) return;
      const hit = rows
        .filter((r) => r.slug === slug && r.by && r.by !== selfEmail)
        .map((r) => ({ by: r.by, at: new Date(r.at || 0).getTime() }))
        .filter((r) => Number.isFinite(r.at) && Date.now() - r.at < RECENT_MS)
        .sort((a, b) => b.at - a.at)[0];
      if (hit) {
        const mins = Math.max(1, Math.round((Date.now() - hit.at) / 60000));
        setRecent({ name: getTeamMember(hit.by).name, mins });
      } else setRecent(null);
    };
    load();
    const poll = window.setInterval(load, 60000);

    // Same-browser presence: another tab has this unit open right now
    let chan = null;
    try {
      chan = new BroadcastChannel('apex-admin-presence');
      chan.onmessage = (ev) => {
        const msg = ev.data || {};
        if (msg.slug === slug) setOtherTab(true);
        else if (msg.slug === null) setOtherTab(false);
      };
      chan.postMessage({ slug });
    } catch { /* BroadcastChannel unavailable — soft feature, fine */ }

    return () => {
      alive = false;
      window.clearInterval(poll);
      try { chan?.postMessage({ slug: null }); chan?.close(); } catch { /* ignore */ }
    };
  }, [slug, selfEmail]);

  if (!slug || (!recent && !otherTab)) return null;

  return (
    <div className="softlock-banner" role="status">
      {otherTab && <span>🗂️ <strong>This unit is open in another tab</strong> — editing both will overwrite each other.</span>}
      {recent && (
        <span>
          ✏️ <strong>{recent.name}</strong> edited this unit {recent.mins === 1 ? 'about a minute' : `${recent.mins} minutes`} ago
          — they might still be working on it. Coordinate before overwriting.
        </span>
      )}
    </div>
  );
}
