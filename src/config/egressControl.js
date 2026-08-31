// ============================================================================
// ============================================================================
// Controls whether public visitors (`/`, `/wiki`, `/values`, `/calculator`)
// send background sync requests to the Cloudflare KV worker.
//
// -> `true`  (Default): Public visitors boot from the baked snapshot and pull
//                       the LIVE KV bundle (1 tiny GET /overrides), then
//                       re-sync on focus / reconnect / every 2 minutes.
//
// -> `false` (ABSOLUTE KILL SWITCH): Public visitors NEVER connect to the
//                       worker. 100% of public traffic reads directly from
//                       the static Vite/GitHub Pages bundle (100 GB/mo free
//                       GitHub egress). Only Admins logged into `/admin`
//                       sync live data.
// ============================================================================
export const PUBLIC_LIVE_SYNC_ENABLED = true;
