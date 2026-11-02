# APEX WIKI & Values — release status (November 2, 2026)

**This is a code package, not a deployment.** Nothing was pushed, no live worker
or KV record was modified, no destructive write/delete test was run against the
shared live endpoint. Production and staging still serve their old builds until
you run `push.cmd`.

**Read `DEPLOY-WORKER.md` FIRST.** The frontend in this package expects worker
`2026-11-02.5`. A read-only check during the previous pass showed the live
worker at `2026-11-02.2` with `sessions:false` and no provisioned passcode for
the new editor. Deploy the `.5` worker, keep the KV namespace and session
secret bound, then use **`/admin` → Team & access → Invite link** to onboard
editors (including the newly added `knwasdo@gmail.com`) — no KV editing needed
anymore. If the frontend goes out before the
worker it still works via the legacy three-endpoint fallback; the Team & access
panel shows a clear "server needs its update" message until `.5` is live.

Both ZIPs contain the **same code**. That is intentional: one codebase serves
production at `/` and the Test Realm at `/Apex-Ball-TD-WIKI/`, and both realms
read the same Cloudflare KV namespace. `apex-td-project.zip` pushes to the Test
Realm repo, `apex-td-final.zip` pushes to the production repo. This closes the
16-day drift: production receives the newer staging feature set.

## LATEST PASS — card polish, names, tint and calculator suffixes (`2026-11-02.5`)

Follow-up polish requested after reviewing the WIKI card screenshots. All
items are implemented and browser-verified against the local `dist`:

- **DPS + $/DPS are now ordinary stat widgets** — they use the exact same
  bordered `.unit-card-stat` boxes as Damage / Cooldown / Range / Placement,
  in the same two-column grid. No separate plain row, no divider.
- **Stat glossary removed** — the standalone `/glossary` page, its route,
  prerender entry, nav links and palette command are gone, and `TermTip` no
  longer opens a click/tap popover. In its place, tooltips are **short and
  redesigned**: an opaque dark gradient surface with a rarity-tinted top
  border and border colour, glow, larger radius and a matching arrow; hover
  and keyboard focus only. No blur layer (paints identically in Chromium,
  Firefox and Safari).
- **Bottom tag chips removed** from WIKI unit cards (`Melee`, `DPS`, `Shiny`,
  `Summoner`, …) and from the unit detail / compare views.
- **Shiny Omega and O/C units are affordable from a 300M budget** on
  “What can I afford?”. They are priced at an estimated `300M` and labelled
  `O/C` or `SHINY OMEGA` — never `???`. `???` (Secret) units stay excluded
  and are no longer offered in the rarity filter.
- **Custom `Dropdown` menus** replace the two native `<select>` filters on that
  page (rarity and sort); a `300M` quick-budget chip was added.
- **Display-name corrections** (slugs and data keys untouched):
  `ShadowPrince` → `ShadowPrince (SP)`, `NightmareBall` → `NightmareBall (NM)`,
  `Shiny NightmareBall` → `NightmareBall`, `Shiny CorruptMalware` →
  `CorruptMalware` — the rarity badge already shows “Shiny”.
- **Stronger hero tint and contrast** — the accent layer now uses a `color`
  blend at `0.66` opacity plus a second masked `overlay` gradient, and the
  portrait filter was raised to `contrast(1.55) brightness(0.9)` (prepared
  desktop copies `contrast(1.32) brightness(0.94)`).
- **Trade Calculator accepts K/M/B/T for Gems and Coins** — in the amount
  prompt, the quick-size chips and the inline currency quantity field.
  `clampQuantity` parses suffixes for currency rows while unit quantities keep
  their 9,999 cap.

The `.4` feature set below is retained except for the inline stat glossary,
which this pass deliberately removes. The seven-account roster (including
`knwasdo@gmail.com`) and the invite/claim onboarding are unchanged. Ads stay
OFF; this is still a code package with no live writes.

**Verification for `.5`**: `npm test` → 213 tests in 40 files; `npm run lint`
→ 95 warnings / 0 errors; `npm audit --omit=dev` → 0 vulnerabilities;
`npm run build` → 762 pre-rendered pages and all social cards; browser suites
→ 59/59 feature checks, 29/29 build, 18/18 new-feature, 29/29 regression;
worker mock → 49/49; `/tmp/validate_zips.py` → 94/94 package checks; both ZIPs
pass `unzip -t`. Ads OFF; no live writes, no deployment.

## PREVIOUS PASS — seven features + a seventh editor (November 2, 2026, `2026-11-02.4`)

Historical record of the previous package. The `/glossary` page, click-to-pin
popovers and WIKI card tags described below were **removed or changed in `.5`**;
see the latest pass above.

All seven requested features are **implemented**, not just proposed. The two
scope corrections are honoured exactly: “What can I afford?” is a **standalone
page** (`/values/afford`, in the Values nav) and **not** a Trade Calculator
feature; compact K/M/B/T suffixes apply **site-wide**, not only to admin inputs.

1. **Command palette improvements** — a real global palette now exists (the
   previous `GlobalUnitSearch.jsx` was never mounted). `⌘K` / `Ctrl+K` or the
   header “Search anything…” button opens it; fuzzy search across pages and
   units, arrow-key/Enter/Escape navigation, and an OFFLINE-mode command.
2. **OFFLINE Values mode** — a persistent, visitor-switchable LIVE/OFFLINE chip
   in the header. When forced (or the browser is offline) the data layer skips
   the live KV bundle and status poll entirely, serves the baked snapshot plus
   the last cached bundle, shows a visible `OFFLINE VALUES` badge on value/WIKI
   pages and reports the exact data source. Switching back re-syncs immediately.
3. **Inline stat glossary** — `TermTip` now works on click/tap as well as hover
   and keyboard (Enter/Space/Escape), with expanded definitions and a new
   standalone `/glossary` page (17 definitions, linked from Values/WIKI nav).
4. **DPS + DPS/Cost on WIKI cards** — compact widgets read parsed upgrade data
   with `damage / cooldown` and `cost / dps` fallbacks, formatted with suffixes.
5. **K/M/B/T admin value inputs** — Value, Gems, Coins and Spreadsheet Mode
   accept `20M`, `1M-2M`, `$3K`, `1.5B`; exact values stay available on focus /
   hover, and the form receives real numbers so publishing is unchanged.
6. **“What can I afford?” reverse research PAGE** — `/values/afford`: set a
   budget (quick chips 100K→1B), choose trade value / gems / coins, filter by
   name/rarity/Shiny, sort, and see ranked units with “% of budget” bars. Links
   on to the calculator and glossary. Pre-rendered and in the Values nav.
7. **Compact suffixes on the WHOLE WEBSITE** — one shared `formatSiteNumber`
   formatter plus live suffix parsing; applied to new pages, WIKI DPS widgets,
   card zoom values, spreadsheet cells, admin saved-value messages and the
   existing `formatCompactNumber` surfaces. Exact values remain in tooltips.

**New editor:** `knwasdo@gmail.com` is a least-privilege `editor` in both the
worker `TEAM_ROLES` roster and the frontend roster (7 accounts total). They
must be onboarded with a one-time invite link from `/admin → Team & access`;
no passcode is stored in code. Invite/claim/reset/session flows from `.3` are
unchanged.

**Verification on this `.4` build:** `npm run build` → 763 pre-rendered pages /
763 routes / all social cards, `dist/values/afford/index.html`,
`dist/glossary/index.html`; `npm test` → 206 tests in 38 files; `npm run lint`
→ 95 warnings / 0 errors; `npm audit --omit=dev` → 0 vulnerabilities; worker
mock → 49/49; browser verifiers → 29/29, 18/18, 29/29 and a new 42/42 v4
feature check; minigames → 0 blocked buttons on 4 routes. Ads stay OFF.

This is still a **code package**: no live worker, KV record, site or git push
was changed by us.

## EARLIER PASS — bug fixes, admin backend, and design (November 2, 2026, third request)

The `apex-td-project.zip` staging package did not work for the new editor. This
pass fixes that and every item on the reported list. Scope was explicitly a
**heavy front-end redesign plus a rewrite of the admin authentication backend**;
the tested foundations (shared KV, HMAC sessions, legal pages, ads off, no
third-party assets) were kept intact.

| Reported problem | Root cause / fix |
|---|---|
| "Tons of buttons stopped working", "can't press any of the pages on the bottom" | **Two invisible full-page click blockers.** (1) `FirstTimeTutorial` was a `z-index:99999`, `pointer-events:auto` scrim covering the whole page; if Framer Motion stalled under a motion gate it stayed invisible yet still swallowed clicks. Replaced with a non-blocking, dismissible quick-start card (wrapper `pointer-events:none`, Escape to close, re-openable from the footer). (2) `.holo-crt-scanlines` was a bare root sibling with `position:absolute; inset:0` and default pointer events — an invisible sheet over the entire document. It now lives inside `.holo-bg` (`pointer-events:none`, `z-index:-1`). The privacy consent banner also no longer traps footer links: the page gains bottom clearance while it is open. Real Playwright clicks now succeed on footer links, all minigame buttons and the admin editor. |
| "Clicking spreadsheet mode on the value tab doesn't work" | Same scanline blocker covering the button. Verified with a real click from `💰 Values` → `📊 Spreadsheet Mode` → matrix sheet. |
| "NO smooth scrolling … NO animations … PC Firefox and Brave" | Desktop browsers reporting `prefers-reduced-motion: reduce` (Windows "animation effects" off) triggered CSS that forced every animation to `0.001ms` and disabled Lenis — the chopped slides and buttons jumping. Added a single `data-motion` gate: all 16 reduced-motion CSS blocks are scoped to `html:not([data-motion="on"])`, so an explicit opt-in genuinely restores them. A discoverable **Animations are paused** chip (and a new **Motion** tab in Theme Studio) lets the visitor choose *Automatic / Force smooth motion / Always reduce*. PC detection no longer relies on `(pointer: fine)`, which some Windows laptops report as false. Verified in a reduced-motion Chromium context: `motion:off → on`, `lenis:true`, 8 running CSS animations. |
| "theme tint should be as the old Push #300 and below" | Compared against the production clone (`35ababe`). The staging-based build had flattened the cutout tint to a single 0.42-opacity normal layer. Restored the old two-pass **colour-blend (0.96) + soft-light sheen (0.62)** plus the tinted drop-shadow glow, with motion gates preserved and the sheen disabled on small screens for performance. |
| "Browse Values by rarity icons should follow the rarity's color" | `ThemeCutout` gained a `tintColor` prop; `ValuesHome` and `WikiHome` now pass each rarity's `getRarityGlow()` colour. Verified: 6/6 cards match. |
| "landing trade calculator … don't give the whole feature set with the test version" | Replaced the `Example 1/2/3` sample tabs with a real two-sided calculator preview: live unit rows, totals, an outcome badge, a balance bar, swap, add/remove up to 3 units per side, and a **Open full calculator** CTA. Currencies, history, sharing and saved trades stay in `/values/calculator`. |
| "I dislike the current panel design entirely, a beginner doesn't know how most of the stuff work" | Removed "MISSION CONTROL / DATABASE COMMAND CENTER" jargon. Plain-language hero, a 4-step **How to use this panel** guide with a glossary, role-specific permission summary, a persistent **❓ Help** button, descriptive tooltips on every navigation pill, and simpler labels (`Home`, `Spreadsheet`, `History`). |
| "rewrite the whole back-end code for the admin panel" / "stronger default password" / "better password reset" | New **invites-v3** credential backend: no shared default at all (the weak `apex2026` is rejected everywhere); every passcode is 24 chars from `crypto.getRandomValues`. One-time, expiring, single-use invite links (`/invite?token=…`) are stored only as SHA-256 digests and generate the editor's passcode on redemption; owner/admin resets rotate it and revoke all sessions; `GET /admin/accounts` reports provisioning without secrets; every change goes to an `adminAudit` log. Login failures now return actionable codes. `APEX_BOOTSTRAP_SECRET` provides a one-time escape hatch for a fresh deployment. `PUT` added to CORS. Front-end auth now goes through one `adminAccounts.js` client instead of scattered fetches. |
| "useless settings … 3D Scene, 3D metalic finish … redesign the whole theme editor" | Removed the three dead controls (3D Scene, 3D Metallic Finish, 3D Metallic Reflectivity — they set CSS variables/datasets nothing consumed). The studio now has four plain-language tabs — **Colors / Motion / Accessibility / Advanced** — with one focused group visible at a time, and the new motion override lives in Motion. |

**Verification for this pass:** 35 files / **193** unit tests, 0 lint errors /
95 pre-existing warnings, `npm audit` 0, **49/49** worker mock checks (16 new
invite/reset/audit/CORS assertions), **29/29** base browser checks, **18/18**
new-feature browser checks and **29/29** new regression checks
(`_audit/browser/fixes-v3-verify.json`). All browser checks ran against local
`dist` with mocked worker responses; no live writes.

## What was fixed

| Issue | Fix |
|---|---|
| Staging edits not landing on production; 16-day drift | One shared KV bundle + `bundleMeta.v` + `GET /overrides/version`. Both sites poll the ~80-byte version and pull the full bundle only on change (~60 s propagation). `backup:previous` rollback snapshot on every write. Local mock test proves a staging-origin write is visible from the production origin. |
| Worker CORS `*` + credentials, cross-origin writes | Exact two-origin allowlist, fixed allow-headers, 403 on cross-origin writes/preflight from unlisted origins, `nosniff` + `no-referrer`. |
| Plaintext passcode in `localStorage` forever | `sessionStorage`, 8-hour HMAC `/session` token bound to the passcode hash; token rotation/revocation on password change and logout-all; tab-scoped legacy fallback for an un-upgraded worker. Login now prefers `/session` and never stores the passcode when it succeeds. |
| 7.5 MB downloaded every 60 s per visitor; cache-buster defeats edge | Version probe, ETag/`304`, `Cache-Control: public, max-age=60`, no default `?_=Date.now()`; maintenance poll aligned to 60 s. |
| `wrangler.toml` KV binding commented → silent in-memory data loss | Documented as a hard prerequisite, exposed by `GET /health` (`kvBound`). |
| `/terms` 404, missing legal pages | `Terms`, `Privacy`, `Cookies`, `Disclaimer` rewritten with the operator's legal name, private contact, 15-day worldwide SLA, LGPD/ECA Digital/GDPR/UK GDPR/COPPA/US state rights, child-safety, Roblox IP disclaimer and takedown channel. All four are prerendered (`/terms/index.html` etc.) and linked from the footer. |
| No consent control; prod ads loading without consent | First-party `PrivacyChoices` banner with reject/customize/accept, statistics and advertising OFF by default, withdraw anytime. **All ads are OFF on both realms**; `TagError: X/Y` fixed by one slot per placement, one push per node, script-load gating, and a production-only `VITE_ADS_ENABLED` switch. See `ENABLE-ADS.md`. |
| Third-party asset/time/privacy leaks | 13 Supabase unit images self-hosted under `public/images/units/`, URLs rewritten at render and in the baked fallback; fonts already self-hosted; `worldtimeapi.org` / `timeapi.io` replaced by same-origin `GET /time`; `0` third-party hosts contacted in browser tests. |
| Broken animations | `AnimatePresence` makes route exit variants live; scroll-reveal for above-the-fold and on scroll; `--theme-speed` has one writer and never becomes `0.0001`; `data-anim-speed="none"` and OS reduced-motion disable CSS animations globally; lightweight CRT texture restored on mobile/tablet; duplicate `@keyframes apex-pop` renamed; 3D hero no longer excludes ordinary laptops/tablets and logs (rather than hides) WebGL failures. |
| Heavy 404 / unoptimized payloads | 404 slimmed from ~3,000 to 152 DOM nodes; baked JSON minified 8.28 MB → 7.50 MB and localized; `eval()` removed from `bake-data.mjs`; `<AnimatePresence>` route transitions verified. |
| Staging duplicate canonical/sitemap paths, staging indexed | `VITE_SITE_URL` is now origin-only with a defensive strip; verified `https://zenithvalues.github.io/Apex-Ball-TD-WIKI/` (single); staging gets `noindex,nofollow` and `Disallow: /`. |
| Force-push deploy helpers, no CI gates | `git push --force` removed from `push.sh`/`push-test.sh`; new `push.cmd` uses a non-force push; `deploy.yml` now runs lint + tests, disables persisted credentials and passes `VITE_ADS_ENABLED`; new `verify.yml` runs on PRs. |
| Supply chain | `npm audit` **0 vulnerabilities** (was 7/10 advisories, including 2 high + 2 critical dev-only). `react-router-dom` lock bumped to 7.18.5, `vitest` to 4.1.12; 190 tests still pass. |


## New in the follow-up pass (same day, second request)

Scope was explicitly **"optimize the back-end logic while maintaining the
front-end except for the requests"** — not a from-scratch rewrite. The tested
November 2 foundations (shared KV, HMAC sessions, legal pages, ads off, no
third-party assets) were kept intact.

- **Moonlight added.** `mnlghtapexhelper@gmail.com` is an `editor` (Values +
  WIKI, least privilege) in both the worker `TEAM_ROLES` and the frontend
  roster. No passcode is in the code; see `DEPLOY-WORKER.md` §6 for KV
  provisioning. The pre-existing worker/frontend role mismatch for Izak and
  Horren is resolved with no loss of privileges, and a unit test now fails if
  the two rosters ever drift again.
- **Backend optimized.** `GET /status` consolidates bundle version, maintenance
  and announcements into one request per visible tab per minute (three timers
  → one; other tabs share the result over BroadcastChannel; legacy workers fall
  back automatically). ETag/304 on `/status` and `/overrides/version`; a
  per-isolate sanitized-body cache keyed by `__v` avoids reparsing the 7.5 MB
  bundle on every request; the edge cache is now **populated** as well as read;
  credential lookups are cached and invalidated on rotation; admin auth is
  memoized per request; `writeOverridesBundle` no longer re-reads the whole
  bundle for its rollback snapshot and writes metadata + backup in parallel;
  `logout-all` now writes to the bound `APEX_OVERRIDES` namespace (the old
  `env.KV` call silently did nothing). `bake-data.mjs` preserves `__v` so a
  cold start never reports version 0.
- **All 20 supplied images.** The hero carousel was extended from 17 to 20
  (Overclocked Overlord, Hacker Ball, Forest Ball); PNG + desktop WebP pairs
  were regenerated from the original uploads, and the carousel tests assert 20
  unique slides. Six tiny self-hosted WebP cutouts now provide 1–2 low-opacity
  accents per desktop view — including 404, maintenance and the staging gate —
  with a slow drift. No parallax, no scroll listener, no third-party assets;
  touch, data-saver, reduced motion and animations-off skip them entirely.
- **PC animations and smooth scrolling.** Lenis was already present but
  implicit; the desktop path is now explicit and observable via
  `html[data-apex-smooth-scroll="lenis|native|off"]`, with a new **PC Scroll
  Ease** control in Theme Studio. Wheel feel is tuned for mouse/trackpad;
  touch and reduced motion stay native. A watchdog prevents a slow/stalled
  image `decode()` from freezing the hero carousel, and hero actions/controls
  get a short staggered entrance that respects every motion gate.
- **Fresh verification** (below): 35 files / 190 unit tests, 0 lint errors,
  full `npm run build` with 760 prerendered pages, 33/33 worker mock checks,
  29/29 base browser checks and 18/18 new-feature browser checks.

## Verification performed

| Check | Result |
|---|---|
| `npm test` | 35 files, **190 passed** — adds consolidated `/status` polling, roster-mirror and Moonlight tests |
| `npm run lint` | **0 errors**; 93 pre-existing warnings |
| `npm audit` (all deps + prod-only) | **0 vulnerabilities** |
| `npm run build` | success; **760** prerendered pages, all social cards present, `/privacy`, `/terms`, `/cookies`, `/disclaimer` emitted, 20 hero + 6 ambient WebP/PNG assets bundled |
| Worker local mock (in-memory KV, no live calls) | **33/33 checks** — CORS, CSRF, sessions, ETag/304, `/status`, shared-DB propagation, backups, private endpoints, legacy auth, logout-all persistence + HMAC session revocation |
| Playwright browser (local `dist`) | **29/29** base checks + **18/18** new-feature checks — 20-slide hero, 2 desktop accents, 404 decoration, Lenis wheel easing, touch native scrolling, reduced motion, one `/status` request, carousel watchdog, legacy fallback, zero console/page errors, zero ad slots, zero third-party hosts |
| Staging-base build | canonical/sitemap single `/Apex-Ball-TD-WIKI/`, `noindex`, `Disallow: /` |
| JS syntax | `node --check` on worker, `apexClient.js`, `bake-data.mjs`, `prerender-core.mjs`; Vite build compiles all JSX |

Evidence: `/home/user/_audit/browser/build-verify.json`,
`/home/user/_audit/browser/new-features-verify.json`,
`/home/user/_audit/browser/probe.json`, `/home/user/APEX-DIAGNOSIS.md`
(the original read-only diagnosis). All browser/worker checks ran against local
`dist` and an in-memory KV mock; no live write/delete test was executed.

## Operator actions still required

1. **Deploy the worker first** (`DEPLOY-WORKER.md`): create/bind `APEX_OVERRIDES`, set `APEX_SESSION_SECRET` via `wrangler secret put`, deploy, then check `/health` shows `kvBound:true`, `sessions:true` and `statusEndpoint:true`, and `GET /status` returns `workerVersion: 2026-11-02.5`. Back up KV first. Rotate every editor passcode; the Test Realm credentials were shared in plain text. **Onboard Moonlight and the new `knwasdo@gmail.com` editor with invite links** from `/admin` → Team & access (§6) — no KV editing, no passcode in the repository. Deploying the frontend before the worker logs one harmless `/status` 404 and falls back to the three legacy endpoints.
2. **Push both packages** with `push.cmd` (Test Realm first is a useful smoke test, then production). Each `push.cmd` performs a non-force push. Edit `push-message.txt` if you want a different commit message.
3. **Verify**: live `/version` = `2026-11-02.5`, production `/terms` = 200, one value edited on the Test Realm appears on production within ~60 s, Moonlight and the new editor can sign in, no `TagError`, no ad requests.
4. **Legal review**: the pages are technical preparation, not legal advice. Have the operator's parent/guardian review the operator identity, the 15-day SLA, the child-safety statements and the retention wording before publication. No postal address is published; `gustavo.romao.borges0@gmail.com` is the published privacy/takedown channel; `gustavo.rb1410@gmail.com` remains the admin/owner address.
5. **AdSense** (`ENABLE-ADS.md`): apply **after** this deploy. Google requires the account holder to be 18+, so a parent/guardian must own the account and payments. A Google-certified CMP and real per-placement ad-unit IDs are required before `VITE_ADS_ENABLED=true`. Ads stay OFF meanwhile; `ads.txt` is inert.
6. **Staging confidentiality**: `AccessGate` is a client-side UI gate. GitHub Pages static files remain directly fetchable by anonymous visitors. For genuine team-only staging, use Cloudflare Access on a protected origin or private hosting. This is a hosting limitation, not a code bug.

## Deliberate limitations / open decisions

- Ads are OFF by default in production until approval + CMP. The one-variable switch is documented; no code change is needed to turn them on.
- The KV version check is best-effort and not an atomic compare-and-swap; concurrent editor writes can still race. A Durable Object would be required for strict transactional integrity. Backup snapshots are best-effort too.
- Worker rate limiting is per-isolate (in-memory), not distributed.
- No certified CMP or verified parental-consent flow is bundled. The zero-personal-data architecture is what makes ordinary browsing safe for children; that claim depends on keeping ads, analytics and third-party assets off.
- No legal counsel was engaged. This document and the site copy are engineering work, not a compliance certification.
