// ============================================================================
// APEX MASTER EGRESS KILL SWITCH (SUPABASE PUBLIC SHIELD)
// ============================================================================
// Controls whether public visitors (`/`, `/wiki`, `/values`, `/calculator`)
// send background network requests to Supabase.
//
// -> `true`  (Default): Public visitors use our Egress Delta-Sync Shield.
//                       They serve from local cache (0 bytes) and only send a
//                       tiny ~150-byte timestamp check (`WHERE updated_at > ts`).
//
// -> `false` (ABSOLUTE KILL SWITCH): Public visitors NEVER connect to Supabase.
//                       100% of public traffic reads directly from the static
//                       Vite/GitHub Pages bundle (100 GB/mo free GitHub Egress).
//                       Supabase Egress drops to literal `0.0000 bytes` for public
//                       visitors. Only Admins logged into `/admin` connect to Supabase.
// ============================================================================
export const PUBLIC_SUPABASE_ENABLED = true;
