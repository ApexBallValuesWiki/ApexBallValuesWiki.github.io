# Deploy the updated shared database worker — REQUIRED, do this first

Both realms (production **and** the Test Realm) read and write the SAME worker:
`https://apex-db.apexballtd-admin.workers.dev`. An editor publishing a value on
the Test Realm bumps `bundleMeta.v`; both sites send ONE tiny `GET /status`
request per minute and pick up the change within ~60 seconds. The frontend
changes in this package are only useful once the worker below is deployed —
**deploy the worker first** (see section 6 — onboarding a new editor no longer
needs any KV editing).

## 0. What is new in `2026-11-02.5`

The worker roster now has **7 accounts**; `knwasdo@gmail.com` is a
least-privilege `editor` (Values + WIKI editing only). Do **not** create a
passcode by hand: after deploying, an owner/admin opens
`/admin → Team & access → Invite link` and sends the one-time link. The
frontend expects `2026-11-02.5`; the older `.2` still live will keep working
through the legacy fallback, but the Team & access panel will report that the
server needs its update until this worker is deployed.

## 1. Create and bind the KV namespace (critical)

`wrangler.toml` currently has `[[kv_namespaces]]` commented out. Without it the
worker falls back to per-isolate memory and **editor changes are silently lost**
on cold start.

```bash
cd apex-td-final            # or apex-td-project
npx wrangler login
npx wrangler kv namespace create APEX_OVERRIDES
```

Copy the returned `id` into `wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "APEX_OVERRIDES"
id = "<the id returned by the command above>"
```

If you deploy through the Cloudflare dashboard instead: **Workers & Pages →
apex-db → Settings → Variables → KV Namespace Bindings → Add binding**, variable
name exactly `APEX_OVERRIDES`, select the namespace. Then paste the contents of
`scripts/cloudflare-proxy-worker.js` into the editor and Deploy.

## 2. Set the session secret (strongly recommended)

```bash
npx wrangler secret put APEX_SESSION_SECRET
# paste a long random string, e.g. the output of: openssl rand -hex 32
```

With the secret set, `POST /session` issues an 8-hour HMAC token. The site then
stores only that token in `sessionStorage`; no plaintext passcode stays in the
browser. Tokens are bound to the current passcode hash, so **Logout everywhere**
and **Change password** revoke every other session instantly.

## 3. Deploy

```bash
npx wrangler deploy
```

Or paste the worker file into the dashboard and click Deploy.

## 4. Verify (read-only)

```bash
curl https://apex-db.apexballtd-admin.workers.dev/health
# expect: {"ok":true,"version":"2026-11-02.5","kvBound":true,"sessions":true,
#          "authBackend":"invites-v3","provisionedAccounts":N,"rosterSize":6,...}
curl https://apex-db.apexballtd-admin.workers.dev/overrides/version
curl https://apex-db.apexballtd-admin.workers.dev/status
# expect: {"v":…,"maintenance":{"on":false,"confirmed":true},"announcements":[],"workerVersion":"2026-11-02.5",…}
curl https://apex-db.apexballtd-admin.workers.dev/time
curl -I https://apex-db.apexballtd-admin.workers.dev/overrides
# expect: ETag + Cache-Control: public, max-age=60 ...
```

`kvBound:false` → the namespace is not attached. Fix step 1 before letting
editors publish. `version` must match `src/config/workerVersion.js`.

## 5. Stop sharing a default passcode (important)

There is **no shared default password** in this release. The old `apex2026`
default is rejected everywhere. Instead every credential is a 24-character
value from `crypto.getRandomValues`, generated on demand and shown **once**.
That is the "stronger default password": stronger, unique per account, and
never stored in the repository or in chat history.

Ask every editor to change their own passcode in `/admin` after their first
login. Changing a passcode, resetting one, or **Logout everywhere** rotates it
and instantly revokes every HMAC session bound to the old value.

## 6. Give a new editor (e.g. Moonlight) a login — no KV editing

`mnlghtapexhelper@gmail.com` is on both rosters as an **editor** (Values +
WIKI only). Previously the operator had to hand-edit the `adminPasswords` KV
key; that is what failed. Now do this from the browser:

1. Sign in as the owner or an admin and open **`/admin` → Home**.
2. In **👥 Team & access**, find the editor and click **🔗 Invite link**.
3. Copy the generated link and send it to them **privately**. It works once and
   expires after 60 minutes.
4. They open `/invite?token=…`. The worker generates a strong passcode and
   shows it once. They copy it, then sign in at `/admin`.
5. If an editor loses their passcode, click **🔄 Reset passcode**. The old one
   stops working immediately.

Behind the scenes: `POST /admin/invite` (owner/admin) stores only a SHA-256
digest of the token in `adminInvites`; `POST /admin/claim` redeems it once and
writes a fresh passcode to `adminPasswords`; `POST /admin/reset-passcode`
rotates an existing account; `GET /admin/accounts` lists who is provisioned
without exposing any secret. Every credential change is appended to the
`adminAudit` KV log. Login failures now return an actionable `code`
(`account_not_provisioned`, `invalid_passcode`, `not_on_roster`,
`legacy_default`, `locked`) instead of one generic 401.

**Fresh deployment with zero accounts?** Set a Worker secret once:

```bash
npx wrangler secret put APEX_BOOTSTRAP_SECRET
# paste a long random string, e.g. the output of: openssl rand -hex 32
```

Then open `/admin`, or call `POST /admin/bootstrap` with
`{"secret":"<that value>"}`. It only works while **no** roster account has a
passcode; it provisions the owner with one generated passcode and refuses to
run again. Without this secret the endpoint returns 404 and cannot be abused.

The manual KV route still works if you prefer it: the `adminPasswords` JSON map
accepts `"mnlghtapexhelper@gmail.com": "<a fresh random secret>"`. Back up
the map first and never commit it.

**Pending deploy:** until worker `2026-11-02.5` is live, the Team & access
panel shows a clear "server needs its update" message instead of a raw error.
The rest of the site keeps working through the legacy endpoints.

## What changed in the worker

| Before | After |
|---|---|
| `ACAO: *` + `Allow-Credentials: true` + reflect any header | Exact allowlist of the two GitHub Pages origins, no credentials header, fixed allow-headers |
| Any origin could POST/DELETE | Cross-origin writes from unlisted origins → **403** |
| Full 7.5 MB bundle fetched every 60 s per visitor | `GET /overrides/version` (~80 B) polled; full bundle only when `__v` changes |
| `?_=Date.now()` defeated edge caching | `ETag` + `Cache-Control: public, max-age=60`, `304` support |
| No rollback | `backup:previous` snapshot written on every change |
| Plaintext passcode in `localStorage` forever | 8 h HMAC session in `sessionStorage`, tab-scoped legacy fallback |
| No deployment health check | `GET /health` reports `kvBound` / `sessions` |
| Third-party time APIs | Same-origin `GET /time` |
| Silent KV-binding fallback | `/health` exposes it; this doc makes it a hard prerequisite |
| Three separate 30/60 s client polls (version, maintenance, announcements) | One `GET /status` per visible tab per minute, with ETag/304 and BroadcastChannel tab sharing; legacy workers still fall back to the three original endpoints |
| `GET /overrides` parsed the 7.5 MB JSON on every request just to find `__v`; edge cache was only ever read, never filled | Per-isolate memoized public body keyed by `__v`, cheap version metadata TTL, `cache.put` on the public path, cached credentials (invalidated on rotation) |
| `writeOverridesBundle` re-read the whole 7.5 MB bundle for its backup | Reuses the already-fetched raw value; metadata + rollback written in parallel after the commit |
| `logout-all` wrote to an unbound `env.KV` namespace | Writes to `APEX_OVERRIDES` and invalidates the credential cache; verified by a local mock |
| Baked snapshot had no `__v`, so cold-start version polling reported 0 | `bake-data.mjs` preserves the live `__v`; the packaged snapshot carries it too |
| Moonlight absent; frontend/worker rosters disagreed for Izak and Horren | Moonlight added as `editor`; rosters now match exactly and are guarded by a unit test |
| A new editor could not log in without hand-editing KV; one generic 401 for every failure | One-time invite links (`/invite`), owner-triggered resets, strong 24-char generated passcodes, an audit log and actionable login error codes |
| `Allow-Methods` omitted `PUT` | `GET, POST, PUT, DELETE, OPTIONS` |

A frontend deployed before this worker will log one harmless `/status` 404 in
the browser console and automatically use the three legacy endpoints. Deploy
the worker first to avoid it.

No destructive write/delete test was executed against the live endpoint.
