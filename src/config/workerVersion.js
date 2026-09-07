// Must match WORKER_VERSION in scripts/cloudflare-proxy-worker.js.
// Bump BOTH together on every worker deploy. The admin dashboard compares
// the live worker's /version against this and warns when a deploy is due.
export const EXPECTED_WORKER_VERSION = '2026-09-02.1';
