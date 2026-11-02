// ============================================================================
// StatMeta — shared icons + compact hover/focus tooltips for the stat labels
// used across the wiki (unit cards, values list, value detail). No glossary
// page, no click-to-pin popovers: just a short, redesigned tooltip (see
// .term-tip in index.css).
// ============================================================================

export const TERM_TIPS = {
  value: 'Estimated trade worth, set by the APEX team.',
  gems: 'Price in gems — the main trading currency.',
  coins: 'Price in coins.',
  demand: 'How wanted the unit is right now.',
  scarcity: 'How rare it is in circulation.',
  status: 'Current market trend.',
  damage: 'Damage dealt per attack.',
  cooldown: 'Seconds between attacks.',
  range: 'Attack reach.',
  placement: 'How many you can place.',
  dps: 'Damage per second — overall attacking power.',
  costPerDps: 'Cash paid per point of DPS. Lower is better value.',
  upgradeCost: 'In-game cash to reach this upgrade level.',
  tradeValue: 'Estimated trade worth in gems.',
  rarity: 'The unit tier, from Normie through Omegas.',
  shiny: 'A special 1.5× damage variant.',
  budget: 'Maximum spend. Try 20M, 300M or 1B.',
};

// Minimal stroke icons (16x16, currentColor) — one per stat term.
const ICONS = {
  value: (
    <>
      <path d="M2.5 8.5 L8 3 h5.5 v5.5 L8 14 z" />
      <circle cx="11" cy="5" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
  gems: (
    <>
      <path d="M8 2 L13 6 L8 14 L3 6 Z" />
      <path d="M3 6 h10 M8 2 L6 6 L8 14 L10 6 Z" />
    </>
  ),
  coins: (
    <>
      <circle cx="8" cy="8" r="5.5" />
      <circle cx="8" cy="8" r="2.6" />
    </>
  ),
  demand: (
    <>
      <path d="M2 12 L6 7 l3 2.5 L14 4" />
      <path d="M10 4 h4 v4" />
    </>
  ),
  scarcity: (
    <>
      <path d="M8 1.5 L9.6 6 L14 7.5 L9.6 9 L8 13.5 L6.4 9 L2 7.5 L6.4 6 Z" />
    </>
  ),
  status: (
    <>
      <path d="M1.5 8 h3 l2-4.5 3 9 2-4.5 h3" />
    </>
  ),
  damage: (
    <>
      <path d="M13.5 2.5 L6 10 M13.5 2.5 l-1 3 M13.5 2.5 l-3 1 M4 9 l3 3 M2.5 13.5 L5 11" />
    </>
  ),
  cooldown: (
    <>
      <circle cx="8" cy="8" r="5.5" />
      <path d="M8 4.5 V8 l2.5 1.5" />
    </>
  ),
  range: (
    <>
      <circle cx="8" cy="8" r="5.5" />
      <circle cx="8" cy="8" r="1.8" />
      <path d="M8 1 v2.2 M8 12.8 V15 M1 8 h2.2 M12.8 8 H15" />
    </>
  ),
  placement: (
    <>
      <rect x="2.5" y="2.5" width="4.4" height="4.4" rx="0.6" />
      <rect x="9.1" y="2.5" width="4.4" height="4.4" rx="0.6" />
      <rect x="2.5" y="9.1" width="4.4" height="4.4" rx="0.6" />
      <rect x="9.1" y="9.1" width="4.4" height="4.4" rx="0.6" />
    </>
  ),
};

/**
 * Small stroke icon for a stat term.
 *   <StatIcon name="gems" />
 */
export function StatIcon({ name, size = 12, className = 'stat-icon' }) {
  const path = ICONS[name];
  if (!path) return null;
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      {path}
    </svg>
  );
}

/**
 * A stat label with its icon and a short hover/focus tooltip.
 *   <TermTip term="gems">Gems</TermTip>
 */
export function TermTip({ term, children, className = '' }) {
  const tip = TERM_TIPS[term];
  if (!tip) return <span className={className}>{children}</span>;
  return (
    <span
      className={`term-tip ${className}`.trim()}
      data-tip={tip}
      tabIndex={0}
      aria-label={`${children} — ${tip}`}
    >
      <StatIcon name={term} />
      {children}
    </span>
  );
}
