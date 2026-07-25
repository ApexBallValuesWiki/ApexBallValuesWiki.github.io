# Apex Values & WIKI — Ball Tower Defense

Companion site for **Ball Tower Defense** (Roblox) by Cash Grab Studios $$$$.
React 19 + Vite + Supabase, deployed to GitHub Pages with **clean URLs,
pre-rendered pages, social cards, and realtime live updates**.

## Run locally
```bash
npm install
npm run dev        # dev server
npm run build      # production build -> dist/  (includes pre-rendering)
npm run preview    # preview the production build
npm test           # unit tests (vitest)
npm run lint       # oxlint
npm run cards      # regenerate public/social/*.png (run when units/art change)
```

## Deploying (GitHub Pages)

Just push to `main` — `.github/workflows/deploy.yml` (repo root) automatically:

1. `npm ci`
2. `npm run build` with:
   - `VITE_BASE_PATH=/<repo-name>/` so clean URLs and pre-rendered pages work
     from the Pages project subfolder (auto-follows repo renames), and
   - `VITE_SITE_URL=https://<owner>.github.io` so canonical/og:image URLs are
     absolute,
3. deploys `apex-td-project/dist/`.

One-time setup on GitHub: **Settings → Pages → Build and deployment → Source →
GitHub Actions**.

### Clean URLs — how it works
The app uses `BrowserRouter`. Because every public page is **pre-rendered** as
a real file (`dist/wiki/units/Normie/ball/index.html`, …), GitHub Pages
serves clean URLs directly — no hash, no JS redirect. Client-only routes
(`/admin`, …) fall back to `404.html`, which boots the same SPA shell, so no
URL ever 404s visibly. Old `…/#/some/route` links are automatically
rewrite-redirected to `/some/route` on load, so existing bookmarks and Discord
posts keep working.

### Social cards & SEO
- Every route gets its own `<title>`, description, canonical link, Open Graph
  and Twitter Card tags plus `sitemap.xml`/`robots.txt` (all in
  `scripts/lib/prerender-core.mjs`).
- Sharing any unit page renders a preview card from `public/social/unit-*.png`
  (1200×630, rarity-themed, unit art when available). Regenerate with
  `npm run cards` (needs devDependency `sharp`) and commit the results — the
  deploy needs no native deps.

### Live updates (no refresh needed)
`src/context/DataContext.jsx` streams `value_entries` +
`unit_wiki_overrides` changes to every connected visitor through Supabase
Realtime; the FanArt gallery and admin bug inbox stream `fanart_entries` /
`bug_reports` the same way. Returning to the tab also silently revalidates.
**Run the updated `supabase/schema.sql` after deploying this version** — it
adds `REPLICA IDENTITY FULL` (so deletions propagate) and publishes the
fanart/bug tables to the realtime feed.

## Project shape
```
src/
  data/
    taxonomy.js             # ALL category/rarity/formula constants — edit here first
    units.js                # Units data, sourced from generated/units.generated.js
    generated/units.generated.js  # AUTO-GENERATED — don't hand-edit
  utils/
    attacks.js              # attack list model (units can have 2+ attacks of the same type)
    supabase.js             # client + clean-URL/recovery URL handling
  context/DataContext.jsx   # live Values + WIKI data (realtime) for the whole app
scripts/
  prerender.mjs             # post-build static pre-render (runs with npm run build)
  generate-social-cards.mjs # social card PNG generator (npm run cards)
  parse_units.py            # stat sheet -> scripts/raw/units_parsed.json
  build_units_js.py         # units_parsed.json -> units.generated.js
supabase/schema.sql         # database schema + realtime publication (re-run after updates)
```

### Attack data model (two same-type attacks)
`upgrade.attacks` is now an **ordered list** —
`[{ name: 'AoE', stats: { Damage: '500' } }, { name: 'AoE', stats: {...} }]`.
The old object shape silently kept only one value when a unit had two attacks
of one type (e.g. two AoE attacks). `src/utils/attacks.js` normalizes both the
old object shape (older generated data / Supabase overrides) and the new list
shape, and repeated types render as `AoE (1)`, `AoE (2)` in the UI. In the
admin upgrade editor, typing the same stat key twice under one attack name
starts a new attack block.
