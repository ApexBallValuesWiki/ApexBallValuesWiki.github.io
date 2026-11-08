# Fully automatic LIVE exist counts

**Status: the entire pipeline is built and tested locally. No human edits a number.**
It is now a wiring job: connect **one** machine publisher and deploy the worker.
Nothing here was pushed, merged, deployed, or written to the live KV/site.

---

## 1. What "fully automatic" means here

```
GAME / FEED  ──push or 15-min cron──▶  apex-db worker
                                         │  writes KV, bumps existV
                                         ▼
                       ONE existing 60s GET /status poll
                                         │  { v, existV, existAt, existSource, existUnits }
                                         ▼
                       React store (existCountStore)
                                         │  only fetches /exist-counts when existV changed
                                         ▼
              unit cards · WIKI detail · Values detail
                    "1,842 exist · 3m ago"
```

- **Zero manual steps** after a source is connected.
- **Zero new timers and zero extra per-minute requests.** `existV` rides inside
  the `/status` response the site already polls once a minute.
- **Zero extra bandwidth when nothing changed.** `writeExistState` compares the
  counts and only bumps the version on a real change; browsers get a `304`.
- **Zero cost.** Cloudflare free plan: 5 cron triggers, 1-minute granularity,
  ~1,000 KV writes/day. A 15-minute cron = 96 polls/day, and a quiet game
  writes ~0 times/day. No domain, no DNS, no purchase, still `github.io`.
- **Zero invented numbers.** With no source connected the worker publishes an
  empty map and the site renders *nothing* — not `0`, not an estimate.

## 2. The part Roblox will not do for us

Roblox keeps in-game "X exist" counters in the game's own DataStore or an
external database; there is no public web API for them
[1](https://devforum.roblox.com/t/help-with-making-a-system-that-tracks-how-many-of-a-item-exist/1441928)
[2](https://devforum.roblox.com/t/how-to-datastore-item-existence-count/3243459).
The catalog `totalQuantity` field covers UGC *avatar/catalog* limiteds only,
not units that live inside an experience
[4](https://devforum.roblox.com/t/how-do-people-track-ugc-limited-copies/2587036).
**A static `github.io` site cannot read the in-game UI.** So the numbers must
be *published* by something that can see them. That is the one dependency.

## 3. Three publishers — connect any ONE

### A. The game publishes them (best data, needs game-dev cooperation)

A single **server-side Script** in `ServerScriptService`, using the game's own
supply counter. `HttpService` is server-only and supports outbound POST
[5](https://gamertagmythras.com/blog/roblox/roblox-httpservice-guide).
No cron needed: the game pushes.

1. Studio → **File → Experience Settings → Security → Allow HTTP Requests = ON**.
2. Set `EXIST_PUBLISH_SECRET` on the worker (step 5 below).
3. Put this in `ServerScriptService` (server Scripts are **not** replicated to
   clients, so the key stays server-side):

```lua
--!strict
-- APEX LIVE EXIST COUNTS — automatic in-game publisher
-- ServerScriptService · server-only · no client can read this source.
local HttpService = game:GetService("HttpService")

local ENDPOINT   = "https://apex-db.apexballtd-admin.workers.dev/exist-counts/publish"
local PUBLISH_KEY = "<PASTE_EXIST_PUBLISH_SECRET_HERE>"
local INTERVAL_SECONDS = 300

-- Replace this with whatever your game already uses to track supply:
-- a DataStore table, an OrderedDataStore, or your live inventory counter.
local function readExistCounts(): { [string]: number }
    -- Example:
    -- local store = game:GetService("DataStoreService"):GetDataStore("UnitSupply")
    -- return store:GetAsync("counts") or {}
    local counts: { [string]: number } = {}
    -- ...fill counts[unitSlug] = numberOfCopiesThatExist...
    return counts
end

local function publish()
    local ok, counts = pcall(readExistCounts)
    if not ok or not counts then
        warn("[APEX] exist-count read failed:", counts)
        return
    end
    local body = HttpService:JSONEncode({ source = "game", counts = counts })
    local success, response = pcall(function()
        return HttpService:RequestAsync({
            Url     = ENDPOINT,
            Method  = "POST",
            Headers = {
                ["Content-Type"]       = "application/json",
                ["X-Exist-Key"]        = PUBLISH_KEY,
                ["X-Exist-Timestamp"]  = tostring(os.time() * 1000),
            },
            Body = body,
        })
    end)
    if success and response.Success then
        print("[APEX] exist counts published")
    else
        warn("[APEX] exist-count publish failed:", success and response.StatusCode or response)
    end
end

task.spawn(function()
    while true do
        publish()
        task.wait(INTERVAL_SECONDS)
    end
end)
```

**Payload shape** — any of these work, slugs are case/space-normalised:

```json
{ "source": "game", "counts": { "ForestBall": 1842, "ShowManBall": 311 } }
```
```json
{ "source": "bot", "counts": [ { "slug": "robosanta", "exists": 74 } ] }
```
```csv
unit,exists
ForestBall,"1,842"
ShowManBall,311
```

### B. A public feed / Google Sheet / Discord bot (no game-dev cooperation)

If anyone already publishes the counts as JSON or CSV, point the free cron at it:

```bash
npx wrangler secret put EXIST_FEED_URL
# e.g. https://example.com/btd-exist-counts.json
# or a published Google Sheet:
# https://docs.google.com/spreadsheets/d/<ID>/gviz/tq?tqx=out:csv&sheet=Counts
```

`wrangler.toml` already has `[triggers] crons = ["*/15 * * * *"]`.
The `scheduled()` handler fetches, parses, validates, and writes only on a
change. Push-mode installs need no cron; without a source it is a safe no-op.

> If you send me the feed URL, wiring it up is a single `wrangler secret put`
> — no code change.

### C. Roblox Open Cloud DataStore (needs an owner-granted API key)

If the game owner creates an Open Cloud API key with `universe-datastores`
read permission, the worker reads the count map directly:

```bash
npx wrangler secret put ROBLOX_API_KEY
npx wrangler secret put ROBLOX_UNIVERSE_ID
npx wrangler secret put EXIST_DATASTORE_NAME   # e.g. UnitSupply
npx wrangler secret put EXIST_DATASTORE_KEY    # e.g. ExistCounts (one JSON key)
```

The DataStore must hold **one aggregate JSON map**, not 321 separate keys —
the free cron's 10 ms CPU budget cannot page through hundreds of entries.

## 4. What is in the code (all local, all tested)

| File | Job |
|---|---|
| `scripts/cloudflare-proxy-worker.js` | `GET /exist-counts`, `POST /exist-counts/publish`, `scheduled()`, `existV` inside `/status`, parsers, validation, HMAC + key auth, guarded writes |
| `wrangler.toml` | free 15-minute cron trigger |
| `src/utils/liveStatus.js` | forwards `existV` / `existAt` / `existSource` / `existUnits` from the existing poll |
| `src/utils/apexClient.js` | `fetchExistCounts()` — one small GET |
| `src/utils/existCountStore.js` | shared store; fetches **only** when `existV` changes; never invents data |
| `src/hooks/useExistCount.js` | `useSyncExternalStore` hook |
| `src/components/ExistCountBadge.jsx/.css` | additive badge; **no filter/tint/isolation on unit artwork** |
| `src/components/EntityGrid.jsx`, `UnitValueCard.jsx`, `src/pages/wiki/UnitDetail.jsx`, `src/pages/values/UnitValueDetail.jsx` | unit cards + both detail pages |
| `src/App.jsx` | starts the single store once |
| `src/utils/existCountStore.test.js`, `_audit/tools/verify_exist_counts.mjs` | 8 unit tests + 36 worker checks |

**Safety built in:** integer-only counts ≥ 0; max 1,000 entries; a >50% one-shot
drop is refused (a broken feed cannot wipe the data); HMAC/key auth with a
5-minute replay window; an unchanged publish writes **zero** KV records; an
older worker (no `existV`, 404 on `/exist-counts`) simply shows nothing.

## 5. Operator deploy (nothing done by me)

```bash
# 1. Deploy worker 2026-11-02.5 FIRST (see DEPLOY-WORKER.md), including this
#    new code. Back up KV before touching anything.
npx wrangler deploy

# 2. Create the publisher secret (skip if you only use mode B or C)
npx wrangler secret put EXIST_PUBLISH_SECRET
# Save the same value into the Luau script / your bot.

# 3. If using a feed or Open Cloud, add those secrets from §3B / §3C.

# 4. Confirm (no secrets are ever returned):
curl https://apex-db.apexballtd-admin.workers.dev/health
#   existCounts: { mode: "push" | "feed" | "opencloud" | "none", v, units }
curl https://apex-db.apexballtd-admin.workers.dev/exist-counts
curl https://apex-db.apexballtd-admin.workers.dev/status   # has existV
```

Then push the frontend packages (`push.cmd`) and merge PR #1. Ads stay OFF.

## 6. Honesty rules in the UI (non-negotiable)

- Every number shows **"as of …"** and its **source** (`game`, `public feed`,
  `Roblox Open Cloud`).
- Older than 24 h → **grey + "stale"**. No data → **render nothing at all**.
- "LIVE SYNC" means *the site polls every 60 seconds*, not a real-time socket
  into the game. We never claim the game pushes instant updates.
- Exist counts are **never** baked into the build-time OG/social cards (those
  are static PNGs and would go stale immediately).
- The Values page keeps its existing "community-observed, not official prices"
  disclaimer.

## 7. Standing constraints respected

`github.io`, R$0, no domain/DNS/CNAME/purchase/paid CMP, ads OFF, no merge,
no push to `main`, no deploy, no live KV/site writes, no claim of live
deployment. Worker `2026-11-02.5` is an operator action and must be deployed
before merging. This document is engineering work, not legal advice.
