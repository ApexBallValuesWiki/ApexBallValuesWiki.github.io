# Apex Values & WIKI — Ball Tower Defense

Companion site for **Ball Tower Defense** (Roblox) by Cash Grab Studios $$$$.
React 19 + Vite, deployed to GitHub Pages with **clean URLs, pre-rendered
pages, social cards, and live updates** — powered end-to-end by a free
Cloudflare Workers KV database (no Supabase).

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
  (1200×630, rarity-themed, unit art when available). The PNGs are
  **regenerable artifacts** — `public/social/` is gitignored on purpose, and
  the Pages workflow runs `npm run cards` on every deploy so the site always
  ships fresh cards without committing ~30 MB of images to the repo.

### Live updates (no refresh needed)
The live database is a single-file Cloudflare Worker + KV namespace
(`scripts/cloudflare-proxy-worker.js`, deployed as
`apex-db.apexballtd-admin.workers.dev`). `src/context/DataContext.jsx` pulls
the live bundle (`GET /overrides`) on load, re-syncs when the visitor returns
to the tab or reconnects, and lightly polls every 2 minutes — so admin edits
reach every player within a couple of minutes with zero realtime
infrastructure. The admin panel (`/admin`), bug inbox and FanArt gallery talk
to the same worker (`/login`, `/overrides`, `/announcements`, `/approvals`,
`/bug-reports`, `/fanart`). See `wrangler.toml` for deployment and the
required `APEX_OVERRIDES` KV binding.

## Project shape
```
src/
  data/
    taxonomy.js             # ALL category/rarity/formula constants — edit here first
    units.js                # Units data, sourced from generated/units.generated.js
    generated/units.generated.js  # AUTO-GENERATED — don't hand-edit
  utils/
    attacks.js              # attack list model (units can have 2+ attacks of the same type)
    apexClient.js           # Cloudflare KV worker URL + fetch helpers
    cleanUrls.js            # legacy #/route -> clean-path URL normalizer
  context/DataContext.jsx   # live Values + WIKI data (KV sync) for the whole app
scripts/
  prerender.mjs             # post-build static pre-render (runs with npm run build)
  generate-social-cards.mjs # social card PNG generator (npm run cards)
  parse_units.py            # stat sheet -> scripts/raw/units_parsed.json
  build_units_js.py         # units_parsed.json -> units.generated.js
scripts/cloudflare-proxy-worker.js  # the ENTIRE live database (deploy to Workers + KV)
```

### Attack data model (two same-type attacks)
`upgrade.attacks` is now an **ordered list** —
`[{ name: 'AoE', stats: { Damage: '500' } }, { name: 'AoE', stats: {...} }]`.
The old object shape silently kept only one value when a unit had two attacks
of one type (e.g. two AoE attacks). `src/utils/attacks.js` normalizes both the
old object shape (older generated data / KV overrides) and the new list
shape, and repeated types render as `AoE (1)`, `AoE (2)` in the UI. In the
admin upgrade editor, typing the same stat key twice under one attack name
starts a new attack block.
