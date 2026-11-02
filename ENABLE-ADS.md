# Enable ads AFTER AdSense approval

**Current state: advertising is OFF on both realms.** The Test Realm can never
serve ads. Production ads are fully repaired but gated behind a build variable,
a consent choice, a maintenance check, a route allowlist and the host check.
`public/ads.txt` is kept only for future publisher verification.

## Why it is off

- The operator has not requested/approved the AdSense account yet.
- The audience includes children and teenagers. Serving advertising cookies
  without a certified CMP and child-safety settings creates COPPA / LGPD
  (Art. 14 + ECA Digital) / GDPR exposure.
- The old build had 3 ad slots reusing one slot ID (`2911497117`) and
  reproduced `TagError: X/Y` on every production page. That is fixed: one slot
  per placement, one push per DOM node, and the script must finish loading
  before any push.

## When you are ready

1. Get the AdSense account approved (the account holder must be **18+**; if the
   operator is younger, a parent/guardian must own the account — see
   LAUNCH-STATUS.md).
2. Create one ad unit per placement in AdSense and put each real ID into
   `src/utils/ads.js` → `AD_SLOTS`. Never reuse an ID twice on one page.
3. Configure a **Google-certified CMP** (or equivalent consent platform) and
   replace the first-party `PrivacyChoices` ad toggle with the CMP signal in
   `src/utils/privacyChoices.js` → `adsConsentAllowed()`.
4. In the **production repo** go to *Settings → Secrets and variables → Actions
   → Variables* and set `VITE_ADS_ENABLED` = `true`. The deploy workflow passes
   it to the build. Leave it unset/false on the Test Realm repo.
5. Update `src/pages/Privacy.jsx` §5 and `src/pages/Cookies.jsx` §5 with the
   actual ad partners and their privacy links.
6. Push (using `push.cmd`). Verify: ad slots appear only on `/`, `/wiki`,
   `/values`, `/values/calculator`, only after consent, no `TagError` in the
   console, and zero ad requests on the Test Realm.

To turn ads off again in an emergency, delete the `VITE_ADS_ENABLED` variable
and redeploy. No code change is needed.
