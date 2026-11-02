// Controls whether public visitors receive editor changes live.
//
// -> `true`  (REQUIRED): Both realms read the SAME Cloudflare KV database.
//                       Public visitors boot from the baked snapshot, then
//                       poll GET /overrides/version (~80 bytes) every 60s.
//                       The full bundle is downloaded only when an editor
//                       publishes, so staging edits land on production fast
//                       WITHOUT shipping ~7.5 MB per visitor per minute.
//
// -> `false` (KILL SWITCH): Public visitors never connect to the worker. Use
//                       ONLY for an emergency; editor changes would then stop
//                       reaching production visitors until the next build.
export const PUBLIC_LIVE_SYNC_ENABLED = true;
