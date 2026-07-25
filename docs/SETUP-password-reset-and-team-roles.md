# APEX Admin — Password Reset & Team Roles Setup

This covers the **Supabase dashboard** steps for the two things that can't be
fixed by code alone. The frontend code for password reset and the role system
is already implemented; these steps make it work against your live Supabase
project (`rfeoicbcprziqlcmbjgi.supabase.co`).

---

## 1. Fix the database (run once in the Supabase SQL Editor)

The previous `schema.sql` had a **missing comma** in the `admin_users` seed
that aborted the whole insert — so the team roles table was empty and nobody
could log in / reset a password. That's fixed in `supabase/schema.sql` now.

The updated schema also adds `public.value_entries` and
`public.unit_wiki_overrides` to Supabase Realtime's `supabase_realtime`
publication. This manual SQL step is required for cross-browser instant live
updates: when one browser saves a Value or WIKI override, other open browsers
can receive the change without refreshing.

1. Supabase Dashboard → **SQL Editor** → New query.
2. Paste the **entire** contents of `supabase/schema.sql` and **Run**.
3. Verify: Table Editor → `admin_users` should now list all 7 members.
4. Verify cross-browser live updates after deployment: edit a Value/WIKI row in
   one browser and confirm another open browser updates without a refresh.

### Current team roles
| Email | Role | Can do |
|-------|------|--------|
| gustavo.rb1410@gmail.com | `owner` | **Everything** — Values, WIKI, see editor emails in logs |
| bananatempest25@gmail.com | `editor` | Values **and** WIKI editing (no email visibility / owner tools) |
| destroyha3@gmail.com | `value_editor` | Values editing only |
| hellfiregamingytt@gmail.com | `value_editor` | Values editing only |
| hungryaistukas@gmail.com | `value_editor` | Values editing only |
| luquitas290414@gmail.com | `wiki_editor` | WIKI editing only |
| treymurphy3rd@gmail.com | `value_editor` | Values editing only |

> "Seeing editor emails" is gated to `owner` only — everyone else (including
> `editor`) sees log entries without the email, exactly as requested.

---

## 2. Create the auth accounts (so each member can log in)

The `admin_users` table only controls **permissions**. Each person also needs
an **auth account** to sign in.

For each of the 7 emails, in Supabase Dashboard → **Authentication → Users →
Add user**:
- Email: the member's email
- Set a temporary password (or tick **"Auto Confirm User"** and let them use
  "Send Password Reset Email" on `/admin` to set their own)
- Click **Create user**

> Tip: create them unconfirmed, then have each member open `/admin`, type their
> email, and click **"Send Password Reset Email"** to set their own password.
> (Requires step 3 below to be done first.)

---

## 3. Make "Reset Password" actually work (Auth URL config)

This is the most common reason password reset "doesn't work through the site."

Supabase Dashboard → **Authentication → URL Configuration**:

**Site URL**
```
https://zenithvalues.github.io/<your-repo-name>/
```

> The app now explicitly sends each reset email back to the deployment where
> the Admin page was opened, rather than falling back to this Site URL. Still
> set the Site URL to the current production site: it is the safe default for
> auth flows that do not supply their own redirect.

**Redirect URLs** — add ALL of these (one per line):
```
https://zenithvalues.github.io/<your-repo-name>/
https://zenithvalues.github.io/<your-repo-name>/admin
https://zenithvalues.github.io/<your-repo-name>/admin/reset-password
http://localhost:5173/
http://localhost:5173/admin
http://localhost:5173/admin/reset-password
```
(Add your production domain too if you use a custom domain. The site now uses
clean URLs — old `#/admin` style links are auto-rewritten, so hash-based
redirect URLs are no longer needed.)

**Save.** The exact root URL for every environment where an admin can request
an email must be listed here. Otherwise Supabase rejects the app's explicit
redirect instead of sending the email.

### Why this prevents links going to an old repository
The Admin page sends `redirectTo` as the root URL of the site currently open in
the browser (without the `#/...` route). That value takes precedence over a
stale Supabase **Site URL**, so a reset requested from
`https://zenithvalues.github.io/Apex-Ball-TD-WIKI/` returns to this repository's
deployment. The root URL must remain in the Redirect URLs allow-list above.

### Also check the email template
Supabase Dashboard → **Authentication → Email Templates → Reset Password**.
The `{{ .ConfirmationURL }}` variable is what gets sent. Keep the default
template — the code handles the recovery link (`code` param) whether it lands
in the query string or the hash route.

### How the flow now works (after the code changes)
1. Member goes to `/admin`, clicks **"Send Password Reset Email"**, types email.
2. Email arrives → click the link.
3. The link lands on `/admin/reset-password`. The page **exchanges the recovery
   code** and waits for the `PASSWORD_RECOVERY` event.
4. It shows **"Reset link verified. Enter your new password."** → enter + save.
5. Done. If the link is expired/invalid, it instead shows a box to request a
   fresh reset email.

> ⚠️ Password reset links are **single-use** and the recovery code relies on a
> verifier stored in the browser that requested the reset. So have each member
> request the reset **from the same browser** they'll open the link in. (This is
> a Supabase PKCE limitation, not a bug in the site.)

---

## 4. Deploy

Push to `main` — the GitHub Actions workflow builds and deploys to GitHub Pages
automatically. Verify at `https://zenithvalues.github.io/Apex-Ball-TD-WIKI/`.

---

## What was fixed in code (already in this branch)
- **Nightmare timer** (`src/pages/BallKnowledge.jsx`): countdown no longer jumps
  to ~4 days at midnight EST; it now counts down smoothly to the real 3‑day
  3PM‑EST rollover and actually resets when it hits zero.
- **Unit sorting** (`src/utils/sortUnits.js`): rarity ladder first, then A–Z —
  applied to Unit Compare, Global Unit Search, and the sidebar Unit Search.
  KrampusBall (Transcendent) now sits with the other Transcendents.
- **Custom dropdowns** (`src/components/Dropdown.jsx`): replaced every native
  `<select>` — Unit Compare (grouped + searchable), Admin editor fields, create‑
  unit rarity, and the Theme Editor preset.
- **Schema SQL** (`supabase/schema.sql`): fixed the broken comma + corrected all
  7 team roles.
- **Password reset** (`src/pages/admin/AdminHome.jsx`, `src/utils/supabase.js`):
  reset emails explicitly redirect to the currently open deployment instead of
  an old Supabase Site URL, plus recovery-code exchange, `PASSWORD_RECOVERY`
  handling, and clear messaging for expired/invalid links.
