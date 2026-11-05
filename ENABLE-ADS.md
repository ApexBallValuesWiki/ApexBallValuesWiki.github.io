# Enable ads AFTER AdSense approval

**Current state: advertising is OFF on both realms.** The Test Realm can never
serve ads. Production ads are gated behind a build variable, a **certified-CMP
consent signal**, a maintenance check, a route allowlist and the host check.
`public/ads.txt` and the `google-adsense-account` meta tag are verification
only — neither enables ads.

## Why it is off

- The AdSense account has not been approved yet (`VITE_ADS_ENABLED` is unset).
- The audience includes children and teenagers. Serving advertising cookies
  without a certified CMP and child-safety settings creates COPPA / LGPD
  (Art. 14 + ECA Digital) / GDPR exposure.
- The old build had 3 ad slots reusing one slot ID (`2911497117`) and
  reproduced `TagError: X/Y` on every production page. That is fixed: one slot
  per placement, one push per DOM node, and the script must finish loading
  before any push.

## What is already wired (free, no action needed)

| Piece | Where | Behaviour |
|---|---|---|
| **CMP adapter** | `src/utils/cmp.js` | Reads Google's free *Privacy & messaging* (Funding Choices) consent-mode API and IAB TCF v2. **Fails closed**: no CMP present / refused / unknown ⇒ no ad script and no ad request. |
| **Consent gate** | `src/utils/ads.js` → `consentGate()` | When `VITE_ADS_ENABLED=true`, consent comes from the certified CMP, not the first-party toggle. Prevents two conflicting banners. |
| **Child safety** | `src/utils/cmp.js` + `src/components/AdSlot.jsx` | Official AdSense `pauseAdRequests=1` until consent, `requestNonPersonalizedAds=1` (`&npa=1`) by default, `data-tag-for-age-treatment="1"`. Personalised ads only if the CMP explicitly grants `ad_personalization`. |
| **Optional CMP loader** | `VITE_ADS_CMP_URL` | Only loads a script if ads are enabled **and** the operator supplies Google's exact CMP URL. Nothing is bundled by default. |
| **Slot IDs** | `VITE_ADS_SLOT_HOME`, `VITE_ADS_SLOT_CALCULATOR` | Override without a code edit; both default to `2911497117`. Never reuse one ID twice on the same page. |
| **Legal text** | `src/pages/Privacy.jsx` §5, `Cookies.jsx` §5 | Names Google AdSense, `pub-2832011907708910`, the free CMP, non-personalised default and opt-out links. |
| **Trust pages** | `/about`, `/contact` | Real operator identity and private contact channel, in the footer, sitemap and consent banner. |
| **Crawlable content** | `scripts/lib/static-content.mjs` | Every built HTML page carries a readable text snapshot for non-JS crawlers. |

Verified by `/home/user/_audit/tools/verify_free_prep.mjs` (36/36),
`verify_free_prep_browser.mjs` (11) and `verify_adsense_meta.mjs` (7/7).

## When you are ready

1. Get the AdSense account approved (the account holder must be **18+**; the
   operator is 18+, so they own the account and payments — no guardian step).
2. Publish the **free Google CMP message**: *Privacy & messaging → European
   regulations → Create message*. If Google gives you a script URL, set
   `VITE_ADS_CMP_URL` to that exact URL. If Google injects its CMP
   automatically, the adapter detects `window.googlefc` / `__tcfapi` with no
   changes. **No paid CMP.**
3. (Optional) Create a second ad unit and set `VITE_ADS_SLOT_CALCULATOR`, or
   leave both variables unset to use the one existing unit.
4. In the **production repo** go to *Settings → Secrets and variables →
   Actions → Variables* and set `VITE_ADS_ENABLED` = `true`. The deploy
   workflow passes it to the build. **Leave it unset/false on the Test Realm.**
5. Push (using `push.cmd`). Wait for the GitHub Actions deploy, then verify:
   - No ad request or `adsbygoogle.js` before consent.
   - Ad requests carry `&npa=1` unless the CMP explicitly granted
     personalisation.
   - Slots appear only on `/`, `/wiki`, `/values`, `/values/calculator`.
     `/about`, `/contact`, `/privacy`, `/terms`, `/cookies`, `/disclaimer`,
     `/admin` and the Test Realm never serve ads.
   - No `TagError` in the console; exactly one `push({})` per slot.
   - Google's consent banner is reachable and can be changed/withdrawn.
6. Re-read `src/pages/Privacy.jsx` §5 and `Cookies.jsx` §5 against the actual
   partners shown in your AdSense account and adjust if anything differs.

> **If ads do not appear after step 5, that is the fail-closed gate working.**
> Most likely the CMP is not detected (no `googlefc`/`__tcfapi` on the page).
> Check `getCmpState()` in the console; `present` must be `true` and `ads`
> must be `true`. Publish the consent message or set `VITE_ADS_CMP_URL`, then
> redeploy. Do not bypass the gate.

## Emergency off switch

Delete the `VITE_ADS_ENABLED` variable and redeploy. No code change is needed.
`ads.txt` and the verification meta tag can stay — they are passive.
