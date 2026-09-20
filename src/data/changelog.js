// ============================================================================
// SITE CHANGELOG — "What's new on APEX". Newest first. Keep entries short and
// player-facing; internal refactors only when they change behavior.
// Tags: theme | values | wiki | minigames | qol | site | ads | fix
// ============================================================================

export const CHANGELOG = [
  {
    date: '2026-09-20',
    version: 'Live updates',
    tag: 'qol',
    title: 'Instant live updates',
    items: [
      'Values, WIKI edits and announcements now appear on the site automatically within seconds — no refresh needed',
      'All open tabs update together',
      'A small ⚡ notice confirms when live data changed',
    ],
  },
  {
    date: '2026-09-20',
    version: 'Hints',
    tag: 'minigames',
    title: 'Hint system for minigames',
    items: [
      'Earn 💡 hints by winning dailies, perfect runs and streaks',
      'Ball Knowledge: spend a hint to reveal the first letter, rarity or unit type',
      'Ballonomics: spend a hint to reveal both units\' demand & scarcity',
      'Balling: spend a hint to reveal more pixels',
    ],
  },
  {
    date: '2026-09-20',
    version: 'Ballonomics difficulty',
    tag: 'minigames',
    title: 'Ballonomics difficulty options',
    items: [
      'Endless mode now has Easy / Medium / Hard',
      'Hard serves much closer value pairs — for veterans only',
    ],
  },
  {
    date: '2026-09-20',
    version: 'Origin tags',
    tag: 'wiki',
    title: 'Event & seasonal origin tags',
    items: [
      'Unit cards now show origin badges: Seasonal ❄️, Exclusive 💎, Unobtainable 🚫',
      'Visible on WIKI cards, Values cards and unit pages',
    ],
  },
  {
    date: '2026-09-20',
    version: 'Changelog',
    tag: 'site',
    title: 'This page',
    items: ['Every site update, documented in one place'],
  },
  {
    date: '2026-09-19',
    version: 'AdSense policy fix',
    tag: 'ads',
    title: 'Ads never render on empty screens',
    items: [
      'Ads now wait for maintenance-off confirmation and real page content before loading',
      'Maintenance screens can never show ads again',
      'Privacy Policy page added with site-wide footer links',
    ],
  },
  {
    date: '2026-09-07',
    version: 'The rebrand',
    tag: 'site',
    title: 'Apex Testing is now Apex WIKI & Values',
    items: [
      'New name everywhere: header, titles, PWA install, social share cards',
      'Share links now use the apexballvalueswiki.github.io domain',
    ],
  },
  {
    date: '2026-09-07',
    version: 'Reward themes',
    tag: 'theme',
    title: 'Reward themes — earn looks by completing achievement sets',
    items: [
      'Knowledge Rise 🧠 — floating glyphs (pick any emoji, painted in your color)',
      'Money Grid 📈 — coins + gems drawn onto the background grid',
      'Retro Ball 🟪 — blocky UI with the Press Start 2P arcade font',
      'Premium Aura 👑 — aurora backdrop + gilded cards for full general achievement sets',
      'APEX Team 🎩 — exclusive theme for team admins',
      'Full customization: color, density, intensity, glyph',
    ],
  },
  {
    date: '2026-09-07',
    version: 'Modern cards',
    tag: 'qol',
    title: 'Modern unit cards + stat tooltips',
    items: [
      'Cleaner, softer card design across WIKI and Values',
      'Icons on every stat',
      'Hover Value / Gems / Coins / Demand / Status / Scarcity for a plain-English explanation',
      'Home page: new Minigames card',
    ],
  },
  {
    date: '2026-08-29',
    version: 'Create Unit',
    tag: 'wiki',
    title: 'Create Unit page for editors',
    items: [
      'Editors can add units at runtime — no code deploy needed',
      'Theme-correct controls and dropdowns',
    ],
  },
  {
    date: '2026-08-28',
    version: 'Announcements 2.0',
    tag: 'site',
    title: 'One modern server-driven announcement banner',
    items: [
      'Announcements update instantly and can be deleted',
      'Home page logo pillows + live content counts',
    ],
  },
  {
    date: '2026-08-28',
    version: 'Minigames hub',
    tag: 'minigames',
    title: 'Minigames hub with Ball Knowledge, Ballonomics and Balling',
    items: [
      'Daily puzzles with server-verified timing',
      'Leaderboards, streaks and achievements',
    ],
  },
];

export const TAG_META = {
  theme: { label: 'Theme', color: '#c04dff' },
  values: { label: 'Values', color: '#ffd24d' },
  wiki: { label: 'WIKI', color: '#4d9dff' },
  minigames: { label: 'Minigames', color: '#42d392' },
  qol: { label: 'QoL', color: '#00e5ff' },
  site: { label: 'Site', color: '#ff7ad9' },
  ads: { label: 'Ads', color: '#ff9d3b' },
  fix: { label: 'Fix', color: '#ff5c5c' },
};
