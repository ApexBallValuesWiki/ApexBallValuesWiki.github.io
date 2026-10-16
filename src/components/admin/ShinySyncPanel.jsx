import { useMemo, useState } from 'react';
import { buildShinyPayload, shinyDiff } from '../../utils/shinySync';

// SHINY SYNC — scan every normal unit, compare its published shiny row against
// what the canonical auto-sync WOULD produce, and re-sync the ones that
// drifted. Publishes go through the background queue; the panel warns about
// the daily publish budget so a full-site sync never happens by accident.
const SAFE_BATCH = 40;

export default function ShinySyncPanel({ units, wikiRows, onSyncSelected, canEdit }) {
  const [open, setOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState(null); // [{ slug, name, issues }]
  const [selected, setSelected] = useState(new Set());
  const [syncing, setSyncing] = useState(false);

  function scan() {
    setScanning(true);
    // Let the button paint its "scanning…" state before the heavy loop.
    window.setTimeout(() => {
      const bySlug = new Map((wikiRows || []).map((r) => [r.slug, r]));
      const out = [];
      for (const unit of units || []) {
        if (!unit?.slug || unit.slug.startsWith('shiny-')) continue;
        const baseRow = bySlug.get(unit.slug);
        if (!baseRow) continue; // nothing published for the base unit
        const shinyRow = bySlug.get(`shiny-${unit.slug}`) || bySlug.get(unit.shinySlug || '');
        const diff = shinyDiff(baseRow, shinyRow, unit, units);
        if (diff && diff.length) {
          out.push({ slug: unit.slug, name: unit.name || unit.slug, issues: diff, hasRow: !!shinyRow });
        }
      }
      out.sort((a, b) => a.name.localeCompare(b.name));
      setResults(out);
      setSelected(new Set(out.map((r) => r.slug)));
      setScanning(false);
    }, 30);
  }

  const issueCounts = useMemo(() => {
    const c = { missing: 0, fields: 0 };
    (results || []).forEach((r) => { if (!r.hasRow) c.missing += 1; else c.fields += 1; });
    return c;
  }, [results]);

  async function syncSelected() {
    if (!onSyncSelected || selected.size === 0) return;
    setSyncing(true);
    try {
      const ok = await onSyncSelected([...selected]);
      if (ok) {
        setResults(null);
        setSelected(new Set());
      }
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className={`shiny-sync card${open ? ' open' : ''}`}>
      <button type="button" className="shiny-sync-header" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <span className="shiny-sync-title">
          ✨ Shiny Sync <span className="shiny-sync-sub">keep every shiny variant matching its base unit — 1.5× damage, rarity, name</span>
        </span>
        <span className={`shiny-sync-caret${open ? ' flipped' : ''}`} aria-hidden="true">▾</span>
      </button>
      {open && (
      <div className="shiny-sync-body">
        <div className="shiny-sync-actions">
          <button type="button" className="filled" onClick={scan} disabled={scanning || !canEdit}>
            {scanning ? '🔍 Scanning…' : '🔍 Scan all shinies'}
          </button>
          {results && results.length > 0 && (
            <>
              <button type="button" onClick={syncSelected} disabled={syncing || selected.size === 0 || !canEdit}>
                {syncing ? '⚡ Syncing…' : `⚡ Sync selected (${selected.size})`}
              </button>
              <span className="shiny-sync-count">
                {results.length} out of sync{issueCounts.missing ? ` · ${issueCounts.missing} missing` : ''}{issueCounts.fields ? ` · ${issueCounts.fields} drifted` : ''}
                {selected.size > SAFE_BATCH && <strong className="shiny-sync-warn"> — large batch: this uses ~{selected.size} publishes of the daily budget, consider doing it in two passes</strong>}
              </span>
            </>
          )}
          {results && results.length === 0 && <span className="shiny-sync-count">✅ All shiny variants are in sync.</span>}
        </div>

        {results && results.length > 0 && (
          <div className="shiny-sync-list" data-lenis-prevent>
            {results.map((r) => (
              <label key={r.slug} className="shiny-sync-row">
                <input
                  type="checkbox"
                  checked={selected.has(r.slug)}
                  onChange={(e) => {
                    const next = new Set(selected);
                    if (e.target.checked) next.add(r.slug); else next.delete(r.slug);
                    setSelected(next);
                  }}
                />
                <strong>{r.name}</strong>
                <span className="shiny-sync-issues">
                  {r.issues.includes('missing') ? 'shiny row missing — will be created' : r.issues.join(', ')}
                </span>
              </label>
            ))}
          </div>
        )}
      </div>
      )}
    </div>
  );
}
