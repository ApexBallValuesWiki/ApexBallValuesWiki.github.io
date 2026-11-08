# For Spoon to paste into the team chat

**TL;DR:** A free, fan-made BTD value/wiki site wants to show the "X exist"
numbers the game already displays. Easiest option for us: publish one small
JSON file on any URL — **no changes to the game at all**. They poll it every
15 minutes and handle everything else. No bots, no scraping, no exploits, no
player data, no cost to us, reversible instantly.

---

**What they're asking for (just one of these):**

1. **Host a tiny JSON/CSV somewhere** — even a public Google Sheet. One row per
   unit: `slug` + `count`. They poll it every 15 min. **Zero game changes.** ←
   easiest
2. Paste **one server Script** into `ServerScriptService` and switch on *Allow
   HTTP Requests*. It reads a counter we already keep and POSTs a
   `{slug: count}` map every 5 minutes. ~288 tiny requests/day.
3. A **read-only Open Cloud API key** for one DataStore key holding a single
   JSON map. They read it every 15 min.

All three send the same thing: a list of whole numbers, nothing else.

---

**The questions this usually gets:**

| | |
|---|---|
| Any player data leaving? | No. No IDs, inventories, chat, telemetry, IPs. Just `{"forestball":1842,...}`. |
| Bots / scraping / exploits? | No. No automated Roblox accounts, no executors, no reading the client. Option 1 needs no code in the game at all. |
| Does it touch gameplay or perf? | No. Option 1: nothing. Option 2: one `pcall`'d POST every 5 min in a `task.spawn` loop; failures only `warn()`, never error the server. |
| Who pays? | Nobody. Their site is `github.io` with ads off; their worker is on Cloudflare's free tier (96 polls/day, 0 writes when numbers don't change, under the 1,000 writes/day free limit). |
| The key in the Script — safe? | It's in a server-only Script (not replicated to clients) and only authorises POSTing numbers to their endpoint. It cannot change anything in our game. Rotating it is one command on their side. |
| What if we change our minds? | Stop publishing (or delete the Script). Their site shows **nothing** within a minute — no stale number, no made-up number. Instantly reversible. |
| What do we get out of it? | Fewer "how many exist?" questions, and a reference the trading community already uses. No ongoing work for us. |
| Who are they? | Apex Values & WIKI, `apexballvalueswiki.github.io`. Fan-made, no affiliation claim, no ads, no monetisation. |

---

**Low-commitment way to try it:** they can run it with **2–3 units for a week**
and keep it off the public site until we're comfortable. Nothing ships without
us saying it's fine.

**If the answer is no:** totally fine, they just leave the feature switched off.
No hard feelings, no follow-up pestering.

---

Longer version + the actual Script (only if the team wants to see it):
`MESSAGE-TO-DEVS.md` and `EXIST-COUNT-AUTOMATIC.md`.
Their side is already built and tested; a yes is one config line + a worker
deploy on their end, not a new project.
