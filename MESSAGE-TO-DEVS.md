# Message to the Ball Tower Defense devs

**Subject:** Small ask — publishing the "X exist" counts for a fan value list

Hi! We run Apex Values & WIKI (`https://apexballvalueswiki.github.io`), a free,
fan-made value list and unit wiki for Ball Tower Defense. No affiliation, no ads,
no monetisation — just a reference for traders.

The game shows how many of each unit exist. We'd love to show that number on our
site with an "as of" timestamp instead of guessing or asking players to type it
in. Roblox doesn't expose that data through any public API, so we can't get it
from our side.

**We are NOT asking for bot accounts, scraping, exploits, or any access to player
data.** Three options, easiest first — any ONE is enough:

**1. Publish a small JSON or CSV file anywhere you can host it** (even a public
Google Sheet). One row per unit: slug + count. We poll it every 15 minutes.
Zero changes to your game. Example:
```json
{ "forestball": 1842, "showmanball": 311 }
```
This is our favourite — you don't have to touch the place at all.

**2. Paste one server Script into `ServerScriptService`** (below), and turn on
*Allow HTTP Requests* in Experience Settings → Security. It reads whatever
counter you already keep and POSTs a `{slug: count}` map to our worker every
5 minutes. Server-side only, never replicated to clients. The key in it only
authorises writing numbers to our endpoint — it can't touch your game. Roughly
288 tiny requests/day, no player info, no gameplay change, no cost to you.

**3. Create a read-only Open Cloud API key** with `universe-datastores` read
access to a single aggregate key (e.g. DataStore `UnitSupply`, key
`ExistCounts`, holding one JSON map). We read it on a free 15-minute cron.

Whichever it is, we handle everything else: validation, versioning, and pushing
the update to every open tab within ~60 seconds. The site always labels the
source and the "as of" time, goes grey if the feed goes stale, and shows
**nothing at all** if the feed stops — never a made-up number.

If this isn't something you're comfortable with, no worries at all — we'll just
leave the feature off. Thanks for reading either way.

---

## Attached: the Script for option 2

```lua
--!strict
-- APEX LIVE EXIST COUNTS — automatic publisher. ServerScriptService only.
local HttpService = game:GetService("HttpService")

local ENDPOINT    = "https://apex-db.apexballtd-admin.workers.dev/exist-counts/publish"
local PUBLISH_KEY = "<WE_WILL_GIVE_YOU_THIS_KEY>"
local INTERVAL_SECONDS = 300

-- Replace with whatever you already use to track supply (a DataStore table,
-- an OrderedDataStore, or your live inventory counter).
local function readExistCounts(): { [string]: number }
    -- local store = game:GetService("DataStoreService"):GetDataStore("UnitSupply")
    -- return store:GetAsync("counts") or {}
    local counts: { [string]: number } = {}
    -- ...fill counts[unitSlug] = copiesThatExist...
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
            Url    = ENDPOINT,
            Method = "POST",
            Headers = {
                ["Content-Type"]      = "application/json",
                ["X-Exist-Key"]       = PUBLISH_KEY,
                ["X-Exist-Timestamp"] = tostring(os.time() * 1000),
            },
            Body = body,
        })
    end)
    if success and response.Success then
        print("[APEX] exist counts published")
    else
        warn("[APEX] publish failed:", success and response.StatusCode or response)
    end
end

task.spawn(function()
    while true do
        publish()
        task.wait(INTERVAL_SECONDS)
    end
end)
```

Our side is already built and tested (`EXIST-COUNT-AUTOMATIC.md`). If they say
yes, wiring it up is one `wrangler secret put` plus deploying worker
`2026-11-02.5` — no rebuild, no new feature work. If they say no, the fallback
is a player "report the count you see" button, which needs zero permission.
