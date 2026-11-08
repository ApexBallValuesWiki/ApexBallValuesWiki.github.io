# APEX WIKI & Values — release status (updated November 5, 2026)

**This is a code package, not a deployment.** A release *branch* was pushed and
opened as **pull request #1** on the production repo; `main` was not touched,
nothing was merged, and no live worker or KV record was modified. No destructive
write/delete test was run against the shared live endpoint. Production and
staging still serve their old builds until the PR is merged (or you run
`push.cmd`).

**Read `DEPLOY-WORKER.md` FIRST.** The frontend in this package expects worker
`2026-11-02.5`. A read-only check during the previous pass showed the live
worker at `2026-11-02.2` with `sessions:false` and no provisioned passcode for
the new editor. Deploy the `.5` worker, keep the KV namespace and session
secret bound, then use **`/admin` → Team & access → Invite link** to onboard
editors (including `knwasdo@gmail.com` and the re-added `destroyha3@gmail.com` / Nose) — no KV editing needed
anymore. If the frontend goes out before the
worker it still works via the legacy three-endpoint fallback; the Team & access
panel shows a clear "server needs its update" message until `.5` is live.

Both ZIPs contain the **same code**. That is intentional: one codebase serves
production at `/` and the Test Realm at `/Apex-Ball-TD-WIKI/`, and both realms
read the same Cloudflare KV namespace. `apex-td-project.zip` pushes to the Test
Realm repo, `apex-td-final.zip` pushes to the production repo. This closes the
16-day drift: production receives the newer staging feature set.

## LATEST PASS — correction: unit-card filter REVERTED, rotating art fixed instead (November 5, 2026, night)

The operator clarified the earlier request: **"I TOLD YOU TO CHANGE THE
LANDING PAGE ROTATING IMAGES THAT ARE EVERYWHERE IN THE WEBSITE, NOT TO APPLY
THE DANG FILTER TO THE UNIT IMAGE ON CARDS!! REVER IT IMMEDIATELY."**

- **Reverted.** `src/components/UnitIcon.jsx`, `UnitIcon.css` and
  `UnitIcon.test.jsx` are back to their original state. No `unit-icon-tint`
  layer, no `grayscale(1)` filter, no `isolation: isolate`. Unit icons on
  WIKI / Values cards keep their real in-game colours. Browser check after
  the revert: 15 unit icons on `/wiki/units/Omegas`, computed `filter: none`,
  0 tint layers.
- **What was actually wrong.** The 20 rotating hero characters are the
  landing-page art reused across the site. On **desktop** the pre-baked WebP
  copies were in FULL colour and `HeroShowcase.css` removed the greyscale
  filter for that state (`filter: contrast(1.32) brightness(0.94)`), so the
  theme accent was blended over the original brown / green / red hues — the
  "colour over the actual hue" look the operator rejected.
- **Fixed on the rotating art.** All 20 `src/assets/units/hero-desktop/*.webp`
  files were baked greyscale (worst RGB channel spread now `0.03`), the
  `.is-prepared` desktop rule now includes `grayscale(1)` as well, and the
  drifting `AmbientAccents` cutouts now use `grayscale(1)` plus a masked
  `mix-blend-mode: color` accent pass instead of `grayscale(0.35)` with no
  colour pass. `ThemeCutout` already used the correct grey-first order.
  Verified in headless Chromium: with `--accent: #4cc9f0` the whole rotating
  character reads as one clean cyan duotone (luminance from the grey base,
  hue from the accent) rather than a mix of original colours.
- Everything else from the previous pass (one embed per page, real per-unit
  icons, human copy, Nose, live rarity counts) is unchanged.

Current totals after the correction: `npm test` 44 files / **249 tests**,
lint 0 errors, `npm audit --omit=dev` 0, all 11 browser/worker suites green,
`verify_link_and_trade.mjs` **26/26**, package validator **136/136**, both
ZIPs pass `unzip -t`.

## PREVIOUS PASS — one unique, monochrome embed for EVERY page (November 5, 2026, night)

The operator shared a link and saw the OLD coloured calculator card, and
pointed out that the landing page, WIKI, Values and other pages all showed the
same generic preview. Two separate problems, both now fixed in the code:

- **The live site is still the old build.** PR #1 has not been merged or
  deployed, so `https://apexballvalueswiki.github.io` still serves the
  pre-monochrome card. Discord / X / WhatsApp also cache embeds by image URL.
  Nothing in this local package can change a live or cached embed; the code
  has to be merged and deployed first. (The `?v=` step below handles the
  cache half of that.)
- **Every page now has its OWN card.** `scripts/lib/route-manifest.mjs` is the
  single source of truth for the 764 prerendered routes AND their link images.
  `prerender-core.mjs` writes each route's `og:image` / `twitter:image`;
  `social-cards-core.mjs` renders that exact file. `/` keeps `default.png`,
  `/values/calculator` keeps `trade-calculator.png`, WIKI unit pages use
  `unit-<slug>.png`, Values unit pages now use their own
  `unit-value-<slug>.png`, and all 120 other pages (WIKI, Values, minigames,
  rarity lists, items, legal, tools, about/contact) get a unique
  `page-<hash>.png` with that page's title, section label, page number and URL.
  Verified: **764 pages / 764 distinct OG image URLs / 0 missing files**.
- **All 764 cards are pure black & white.** The same Billboard frame,
  masthead, footer, greyscale portraits and final `.greyscale()` pass are used
  everywhere, including the calculator card. Sampled page, unit and calculator
  cards all measure R=G=B.
- **Cache busting.** `prerender-core.mjs` hashes the generated card set and
  appends `?v=<hash>` to every OG/Twitter image URL. Discord / X / WhatsApp
  therefore re-fetch the new image after a deploy instead of serving a cached
  old one, while unchanged builds keep a stable URL.
- **Copy is plain everywhere.** The calculator's embed description was also
  AI-sounding (`Compare any Ball Tower Defense trade before accepting it`);
  it is now `Value totals, overpay check and shareable trade links for Ball
  Tower Defense trades.` The crawler-visible home text was updated too.

`npm run cards` now renders 764 cards (~68.5 MB, ~3.5 min) and
`npm run build` regenerates them once in CI (the duplicate `npm run cards`
workflow step was removed). `verify_link_and_trade.mjs` is **23/23**, with new
checks for per-page uniqueness, cache busting, real files and monochrome page
cards. Ads remain OFF, `github.io`, R$0; no merge, deployment, `main` push or
worker/KV/site write. PR #1 on GitHub still has only its original single
commit — pushing the prepared second commit needs a fresh one-time
authorization.

## PREVIOUS PASS — human copy, real in-game icons, corrected rotating art (November 5, 2026, night)

Three corrections from the operator's latest review are now in the source,
built output and verifiers:

- **Plain, human copy.** `Compare any offer before you accept it` is gone — the
  trade card now says `Compare any trade.` The home tagline is
  `Unit values, stats and trades.` and `INSTANT VERDICT` is just `VERDICT`.
  A verifier fails if the old AI-marketing phrases come back.
- **Grey first, colour second — on the ROTATING decorative artwork, not the
  unit icons on WIKI / Values cards.** The operator's correction was explicit:
  the target is the landing-page rotating character art that appears across
  the site. `UnitIcon` was changed by mistake and has been fully **reverted** —
  unit cards keep their original in-game colours and `filter: none`.
  The actual fix is on the decorative art: the 20 desktop hero WebP copies
  were baked greyscale (they were full colour, so the theme accent had been
  laid over the original hue), `HeroShowcase.css` now applies `grayscale(1)`
  to every slide including the `.is-prepared` desktop state, and
  `AmbientAccents` drifting cutouts now use `grayscale(1)` plus a masked
  `mix-blend-mode: color` accent pass. `ThemeCutout` already used this order.
- **Every per-unit link image uses that unit's own in-game icon.**
  `scripts/lib/social-cards-core.mjs` previously only looked at nine bundled
  PNGs, so most unit cards had an empty portrait. It now reads the real icon
  from `public/overrides/staticOverrides.json` — 325 embedded WebP data URIs
  plus 17 files under `public/images/units/` — with a shiny-variant fallback and
  the bundled PNGs as a last resort. All **321** `unit-*.png` cards were
  regenerated; a new verifier hashes every portrait and proves no shared
  ShowmanBall/fallback art is used (272 distinct portraits, max repeat 2 =
  a base unit and its shiny counterpart). Cards are greyscale, palette-optimised
  (~28 MB, down from ~43 MB) and still 1200x630 with no external assets.

Verification: `verify_link_and_trade.mjs` is now **19/19** (added human-copy,
rotating-art and per-unit icon-identity checks), and all
321 portraits were rendered and reviewed. `dist/` rebuilt: 764 prerendered
routes with every social card present. Ads remain OFF, the site stays on
`github.io`, R$0 spent, and nothing was merged or deployed. This work and the
monochrome redesign are prepared locally as the second commit on the same PR
branch. **PR #1 on GitHub still has only its original single commit**: pushing
that second commit needs a fresh one-time GitHub authorization, so the remote
PR has not been updated yet. `main` is untouched.

## PREVIOUS PASS — full monochrome link-image redesign (November 5, 2026, evening)

The operator reviewed the shared-link preview and asked for a whole new look:
keep the Billboard layout, drop the big `321+` number, and make the entire
embed black and white. **Done across all 323 cards**, not just the home one.

- **Pure monochrome.** `scripts/lib/social-cards-core.mjs` now builds every
  card in black / white / grey only. Unit art is converted to high-contrast
  greyscale before embedding, and each finished PNG is forced through a final
  `.greyscale()` pass — so no accent colour can leak into an embed. A verifier
  checks R=G=B on the home card, the calculator card and sampled unit cards.
- **New Billboard composition.** Hairline frame with corner ticks, small
  tracked-out masthead, one large circular unit portrait, an oversized `APEX`
  wordmark, a short tagline, and a slim three-part index strip
  (`UNIT WIKI · LIVE VALUES · TRADE CALC`). The giant `321+` block and the
  colourful gradient / chips / rotated art collage are gone.
- **One consistent system.** The `/values/calculator` card (YOU GIVE /
  THEY GIVE panels + verdict bar) and all 321 `unit-*.png` cards use the same
  frame, masthead, footer, typography and monochrome portraits. Rarity is now
  shown as an outlined white pill instead of a colour.
- **Legible at embed size.** Heavy DejaVu/Liberation type, high contrast and
  very few words; the design was reviewed at a simulated 340×179 thumbnail.
- Cards are still 1200×630 and generated locally by `npm run cards`
  (323 files). No external fonts, images or CDNs. `dist/` rebuilt;
  `verify_link_and_trade.mjs` gained the monochrome checks.

Ads remain OFF, site stays on `github.io`, R$0 spent. The monochrome
cards are part of the second commit on the same PR branch.

## PREVIOUS PASS — link images, trade PNG, Nose, live rarity counts (November 5, 2026)

**A code package, R$0, `https://apexballvalueswiki.github.io`.**
Ads stay OFF; nothing was pushed, deployed, or written to the worker/KV/site.

- **Better Link Image.** The shared-link (Open Graph / Twitter) preview is now a
  branded 1200×630 card: collage of real unit art, rarity chips, a
  `321+ UNITS` count chip, the APEX logo and the site URL. Unit pages keep their
  own per-unit cards. `/values/calculator` gets a dedicated
  `social/trade-calculator.png` with YOU GIVE / THEY GIVE panels and a verdict
  bar. All cards are generated locally by `npm run cards` (323 files, ~28 MB);
  no external images, fonts or CDNs.
- **Better Trade Calculator export image.** `src/utils/tradeCardRender.js`
  renders a redesigned 1800×1120 PNG: themed background, brand header,
  YOU GIVE / THEY GIVE panels with real unit art and rarity colours, VS
  medallion, totals, a clear WIN/LOSS/FAIR verdict band with a split value bar,
  and a footer with the site URL, an "estimates, not official prices" note and
  the generation time. `🖼️ Export Image` copies to the clipboard and falls back
  to a file download; a new `⬇️ Save PNG` button always saves directly. The old
  ad-hoc canvas helpers were removed.
- **Nose is back.** `destroyha3@gmail.com` / Nose is a least-privilege **Editor**
  in both `src/utils/teamMembers.js` and the worker `TEAM_ROLES` (the auth source
  of truth — 8 accounts), on `/credits` and in `DEPLOY-WORKER.md`. No passcode is
  stored. Onboard Nose with `/admin` → Team & access → Invite link after the `.5`
  worker is live.
- **Live Browse-by-Rarity counts.** `src/utils/rarityBrowse.js` builds both hubs
  from the live `unitValues` roster instead of a frozen `UNITS_BY_RARITY` table.
  Adding a unit, deleting a unit, changing a shiny counterpart or publishing a
  rarity override updates the counts at once; editor-created rarities are valid
  routes on both `/wiki/units/:rarity` and `/values/units/:rarity`.
  `rarityBrowse.test.js` (9 tests) plus `verify_live_rarity_counts.mjs` (12
  headless-browser checks) prove add/delete, custom rarities, published rarity overrides and shiny counterparts.

Verification for this pass: `npm test` 44 files / 249 tests, lint 94 warnings /
0 errors on 271 files, `npm audit --omit=dev` 0, `npm run build` 764 prerendered
routes with all social cards, `verify_build.mjs` 29, `verify_free_prep.mjs`
36/36, `verify_free_prep_browser.mjs` 11, `verify_adsense_meta.mjs` 7/7,
`verify_live_rarity_counts.mjs` 12/12, `verify_link_and_trade.mjs` 14/14,
`verify_free_prep_browser.mjs` 11, `worker_verify.mjs` 49 (roster-size assertion
updated for the 8 accounts), plus `verify_bugfixes.mjs` 36/36,
`verify_v4_features.mjs` 59/59, `verify_new_features.mjs` 18/18 and
`verify_fixes_v3.mjs` 29/29. Results are in `/home/user/_audit/browser/`.

## PREVIOUS PASS — R$0 AdSense-readiness prep (November 4, 2026)

**Everything that can be fixed without spending money was fixed in this pass.** No domain,
no DNS, no CNAME, no purchase, no paid CMP. Site stays on
`https://apexballvalueswiki.github.io`. Ads are still OFF; nothing was pushed,
deployed, or written to the worker/KV. The operator is 18+, so they own the
AdSense account and payments — no parent/guardian account-holder step.

- **Site verification:** `<meta name="google-adsense-account"
  content="ca-pub-2832011907708910">` installed in `index.html` and all built
  pages; `ads.txt` unchanged. Passive tag — loads nothing, serves no ads.
- **Crawlable content:** `scripts/lib/static-content.mjs` emits a genuine,
  readable HTML snapshot into `#root` for **every** built page (765 HTML files).
  Previously non-JS crawlers saw an empty div. Full legal/About/Contact text,
  real descriptions and internal links are in the raw HTML. A progressive-
  enhancement rule (`html.apex-js .apex-static{display:none}`) hides the
  snapshot from JS visitors, so there is no text-page flash; no-JS clients get
  the complete readable page. React's `createRoot` replaces it on boot.
- **About + Contact:** new `/about` and `/contact` pages, routes, lazy imports,
  footer links, consent-banner links, sitemap entries and prerendered pages.
  Operator identity moved to `src/data/operator.js` as the single source of
  truth for React pages AND the static HTML (a verifier checks for drift).
- **Honest legal text:** Privacy §5 / Cookies §5 now name Google AdSense and
  `pub-2832011907708910`, Google's free certified CMP, the non-personalised
  default, child-safety wording and opt-out links, while still stating clearly
  that ads are currently disabled.
- **Certified CMP adapter (`src/utils/cmp.js`):** reads Google Funding Choices
  consent-mode API + IAB TCF v2, and **fails closed** — no CMP or refused/
  unknown consent means no ad script and no ad request, even with
  `VITE_ADS_ENABLED=true`. Applies Google's official `pauseAdRequests` and
  `requestNonPersonalizedAds=1` (`&npa=1`) signals before every push.
  `consentGate()` in `ads.js` delegates ad consent to the CMP once enabled.
- **Free configurability:** `VITE_ADS_SLOT_HOME`, `VITE_ADS_SLOT_CALCULATOR`
  and optional `VITE_ADS_CMP_URL` — no code edit needed later. No script is
  bundled by default.
- **Guides rewritten:** `ADSENSE-FREE-SETUP.md` (EN/PT) and `ENABLE-ADS.md`
  now describe exactly what is done and what only the operator can do.

**Verification for this pass:** `npm test` → 239 tests in 43 files (10 new CMP
tests); lint 94 warnings / 0 errors on 268 files; `npm audit --omit=dev` → 0;
`npm run build` → 764 prerendered pages + all social cards; `node --check`
worker OK; browser suites 36/36 bugfixes, 59/59 v4, 29/29 build,
18/18 new-features, 29/29 fixes-v3, 49 worker; new `verify_free_prep.mjs`
36/36, `verify_free_prep_browser.mjs` 11, `verify_adsense_meta.mjs` 7/7.
Package validator 94/94, both ZIPs pass `unzip -t`.

**Still operator-only (all free):** real DOB + postal PIN + tax/payment details
inside their own Google account, publishing Google's free consent message,
clicking verify/submit, running `push.cmd`, and an independent adult/legal
review of the notices. `github.io` rejection/reapply is free.

## PREVIOUS PASS — compact-number typing, Balling answers + O/C and N/A values (post-`.5` quick fixes)

Three reported bugs fixed in the `.5` source. Same worker version
(`2026-11-02.5`), same seven-account roster, ads still OFF, no deployment.

- **K/M/B/T suffixes no longer appear or reformat while typing.** Admin Value /
  Gems range fields, Spreadsheet Mode cells and the Trade Calculator's inline
  currency amount keep the raw text exactly as typed while focused; the compact
  form is applied only on blur or when the field is updated externally. Typing
  `1300000` no longer snaps to `1.3K000`, `1.3M` no longer becomes `1300000`
  mid-entry, and `6.2M` in the calculator no longer clamps to `2000000`.
  Parsing of `K/M/B/T` on commit is unchanged.
- **Balling now accepts correct answers even when shiny rows reuse the normal
  unit's art or name.** `eligiblePool()` keeps exactly one answer per unique
  artwork and prefers the non-shiny row, so a duplicate render can never be
  picked as an unmatchable answer. Same-name variants with distinct art are
  grouped: clicking a suggestion pins its slug, ambiguous labels show the
  rarity (`LaserBall · Transcendents`), and a typed bare name, `Shiny …` name
  or punctuation variant matches the whole alias group.
- **`O/C` and `N/A` are valid Value, Gems and Coins entries again.** The
  compact-number parsers treated those markers as invalid text, so the admin
  fields flagged them red and reset them to the old number on blur. The three
  value inputs now opt in to marker parsing, keep the marker on blur, show it
  in the "Exact Live Outputs" preview and publish it as a string (never `0`).
  `isSpecialBaseValue()` is now one canonical definition shared by the input
  layer, `normalizeValueForm()`, Spreadsheet Mode and the public cards; it
  accepts case/spacing/punctuation variants (`o/c`, `n/a`, `O / C`, `OC`,
  `N.A.`) and normalizes them. A marker clears any stale min-max range, and
  the spreadsheet also gains the `T` suffix for consistency. Markers still
  show as `O/C` / `N/A` on the public WIKI/Values cards.

**AdSense ownership verification (ads still OFF):** the operator supplied
`<meta name="google-adsense-account" content="ca-pub-2832011907708910">`;
it is installed in `index.html` and the prerender copies it into all 763 built
HTML pages plus `404.html`. It is a passive ownership tag — no external script,
no ad unit, no cookies. `ads.txt` remains correct. The `adsbygoogle.js` script
and `<ins>` ad units are still injected dynamically by `src/utils/ads.js` /
`src/components/AdSlot.jsx` only behind the five existing gates, so no ads are
served before approval and consent. `/home/user/_audit/tools/verify_adsense_meta.mjs`
→ 7/7 checks (tag on every page, zero static ad scripts, zero static `<ins>`).

**Verification for this pass**: `npm test` → 229 tests in 41 files (new
`src/utils/balling.test.js` plus marker tests in `formatNumber`,
`adminForms` and `spreadsheetValues`); `npm run lint` → 95 warnings / 0 errors;
`npm audit --omit=dev` → 0 vulnerabilities; `npm run build` → 762 pre-rendered
pages and all social cards; new browser suite
`/home/user/_audit/tools/verify_bugfixes.mjs` → 36/36 checks, including a
mocked shared-art shiny row and a full marker save → public card round trip
in both the single-unit editor and Spreadsheet Mode; all prior browser suites
still green (59/59 feature, 29/29 build, 18/18 new-feature, 29/29 regression);
worker mock 49/49; `/tmp/validate_zips.py` → 94/94 package checks; both ZIPs
pass `unzip -t`. No live site, worker, KV or git writes.

## PREVIOUS PASS — card polish, names, tint and calculator suffixes (`2026-11-02.5`)

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

**Verification for the original `.5` package**: `npm test` → 213 tests in 40 files; `npm run lint`
→ 95 warnings / 0 errors; `npm audit --omit=dev` → 0 vulnerabilities;
`npm run build` → 762 pre-rendered pages and all social cards; browser suites
→ 59/59 feature checks, 29/29 build, 18/18 new-feature, 29/29 regression;
worker mock → 49/49; `/tmp/validate_zips.py` → 94/94 package checks; both ZIPs
pass `unzip -t`. Ads OFF; no live writes, no deployment.

## EARLIER PASS — seven features + a seventh editor (November 2, 2026, `2026-11-02.4`)

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
4. **Legal review**: the pages are technical preparation, not legal advice. Have an independent adult/qualified reviewer check the operator identity, the 15-day SLA, the child-safety statements and the retention wording before publication. No postal address is published; `gustavo.romao.borges0@gmail.com` is the published privacy/takedown channel; `gustavo.rb1410@gmail.com` remains the admin/owner address.
5. **AdSense** (`ENABLE-ADS.md`): apply **after** this deploy. Google requires the account holder to be 18+; the operator is 18+ and owns the account and payments. Use the account holder's real date of birth — Google verifies identity via a mailed PIN and payment checks. Never share bank details, passwords or PINs with anyone. A Google-certified CMP (the free built-in one is sufficient) and real per-placement ad-unit IDs are required before `VITE_ADS_ENABLED=true`. Ads stay OFF meanwhile; `ads.txt` is inert. See `ADSENSE-FREE-SETUP.md` for the free `github.io` path.
6. **Staging confidentiality**: `AccessGate` is a client-side UI gate. GitHub Pages static files remain directly fetchable by anonymous visitors. For genuine team-only staging, use Cloudflare Access on a protected origin or private hosting. This is a hosting limitation, not a code bug.

## Deliberate limitations / open decisions

- Ads are OFF by default in production until approval + CMP. The one-variable switch is documented; no code change is needed to turn them on.
- The KV version check is best-effort and not an atomic compare-and-swap; concurrent editor writes can still race. A Durable Object would be required for strict transactional integrity. Backup snapshots are best-effort too.
- Worker rate limiting is per-isolate (in-memory), not distributed.
- No certified CMP or verified parental-consent flow is bundled. The zero-personal-data architecture is what makes ordinary browsing safe for children; that claim depends on keeping ads, analytics and third-party assets off.
- No legal counsel was engaged. This document and the site copy are engineering work, not a compliance certification.


---

## 2026-11-05 · Automatic exist counts added locally (NOT deployed)

`EXIST-COUNT-AUTOMATIC.md` is the full guide. Summary:

- Worker `2026-11-02.5` now has `GET /exist-counts`,
  `POST /exist-counts/publish` (HMAC/key + replay window), a `scheduled()`
  handler, and `existV`/`existAt`/`existSource`/`existUnits` in `/status`.
- `wrangler.toml` has a free 15-minute cron. Unchanged publishes write **zero**
  KV records; a >50% one-shot drop is refused so a broken feed cannot wipe
  data.
- Frontend: `existCountStore.js`, `useExistCount.js`, `ExistCountBadge.jsx`,
  four UI surfaces, started once from `App.jsx`. No second timer, no extra
  per-minute request, no filter/tint on unit artwork.
- QA: `existCountStore.test.js` 5 tests, `verify_exist_counts.mjs` 36/36 worker
  checks (mock KV + mock feeds + `data:` URL cron). Older workers without
  `existV` degrade to showing nothing.
- **Not connected to a live source yet.** Roblox has no public API for in-game
  exist counts, so one publisher must be wired (game-side HttpService, a public
  feed URL, or an owner-granted Open Cloud key). No numbers were invented.
- No push, no merge, no deploy, no live KV/site write. Ads OFF. `github.io`.


---

## 2026-11-08 · Database safety + value/UI batch (local, NOT deployed)

- **Data loss on Refresh:** admin `/overrides` reads now authenticate, the
  Cache API uses ONE canonical key for match/put/purge, every bundle write
  purges it, and `stale-while-revalidate` dropped from 300s to 30s.
  `bundleToWikiRows` spreads all WIKI fields so `custom_unit`/`kind` survive.
  New `POST /overrides/restore-backup` + an **Undo last publish** button in the
  WIKI editor restores `backup:previous`. Verified 55/55 worker checks.
- **WIKI images only visible to the editor:** same cache-purge fix. Public
  visitors now converge on the newest bundle within ~30s.
- **Worker errors:** `Date.parse()` instead of `new Date() - new Date()`;
  cache put/purge keys unified.
- **Afford:** O/C → "O/C" + "N/A%", value ranges (min–max display and
  conservative max affordability), `Sort by relevancy` with 7 pinned units,
  19-entry Shiny O/C ranking, real Include Shiny toggle button.
- **Trade Calculator:** range totals + per-entry ranges, demand meter with
  quantity-weighted average offer demand and a combined value/demand W line.
- **Values:** 64 zero rows filled by rarity tier in
  `public/overrides/staticOverrides.json` (`__v` 308 → 309); 33 non-zero rows,
  178 shiny rows and WormBall preserved. The same rule runs on live KV rows.
  Spreadsheet `NumCell` focus bug fixed (36/36 bugfix checks).
- QA: 46 test files / 262 tests, lint 0 errors on 279 files, 12 verifier
  suites green, 764 prerendered pages, ZIP validator 136/136.
- **Assumption to confirm:** the brief listed "Every Awesome" twice (50 then
  500). The 500 tier was applied to **Legendaries**, the next rarity after
  Awesome. Say the word if it should be Mythics instead.
- No push, no merge, no deploy, no live KV/site write. Ads OFF. `github.io`.


---

## 2026-11-08 (later) · N/A specials, stacked meters, instant sync (local only)

- **N/A Shiny Omegas:** `specialMarker()` now returns `O/C` or `N/A`; both are
  "no fixed price" and render their marker plus `N/A% of your budget` instead
  of 300M / a percentage. 30 rows in the baked DB carry `N/A` as their value.
- **Meters:** the separate value-range and demand text blocks were replaced by
  four stacked bars — YOU VALUE, YOU DEMAND, THEY VALUE, THEY DEMAND. The
  min→max range is drawn as a lighter segment ON the value bar. Average offer
  demand is the number on each demand bar; a combined Value W / Demand W line
  sits underneath. Verified 4 meter rows in the browser.
- **Instant updates:** new `GET /overrides/wait?since=N` long-polls an
  edge-local Cache API version marker (plus an in-isolate value). Every
  successful bundle write updates the marker, so open tabs wake in ~400ms and
  re-read `/status` → `/overrides` with **no page reload**. Proven in a mocked
  browser: `/status` went from v998 to v999 with `window.__noReload` intact.
  One request per ~20s per tab (~4,320/day), so it stays inside the free tier.
- **Honest limits:** "0 ms everywhere" is not achievable on this stack. The
  long-poll starts 2.5s after load (so the page can settle), a publish that
  lands on a different Cloudflare edge is picked up on the next 20s reconnect,
  and a true global push would need Durable Objects / WebSockets. Most
  importantly **the live site still runs the old worker** (60s poll) — nothing
  was deployed. Operator must deploy worker 2026-11-02.5 before any of this is
  visible publicly.
- QA: 46 files / 262 tests, lint 0 errors, 12 verifier suites green
  (worker 58/58, bugfixes 36/36, v4 59/59, link/trade 26/26), 764 pages,
  0 page errors. ZIP validator 136/136.
