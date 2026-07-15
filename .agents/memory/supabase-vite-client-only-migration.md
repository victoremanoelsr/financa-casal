---
name: Supabase client-only auth in Vite (no SSR)
description: How a Next.js+Supabase app was ported to Vite/wouter without a backend, and how to verify a user's own Supabase project is wired correctly.
---

When porting a Next.js app that calls Supabase directly from the browser (no custom API routes) into a Vite/React artifact:
- Drop `@supabase/ssr`, `server.ts`, `proxy.ts`/middleware entirely — use plain `@supabase/supabase-js` `createClient()` in a browser-only module. There is no SSR session to refresh.
- Rename `NEXT_PUBLIC_*` env vars to `VITE_*`; Vite auto-exposes `VITE_`-prefixed vars already present in `process.env` (e.g. Replit secrets) without extra config.
- Replace the Next.js server-rendered auth-gate (redirect in a server component) with a client-side `useEffect` that calls `supabase.auth.getUser()` and navigates away if there's no session.
- Keep a graceful "Supabase not configured" demo-mode fallback (localStorage-backed state) so the app runs before the user provides real credentials — ask for `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` via `requestSecrets` only when the user wants real persistence.

**Verifying a user-supplied Supabase project without exposing secret values:** run curl from a shell one-liner that references `$VITE_SUPABASE_URL`/`$VITE_SUPABASE_PUBLISHABLE_KEY` directly in the command string (never printed) and only echo the HTTP status / response body (which contains no secret material). `GET {url}/rest/v1/<table>?select=...` with just the `apikey` header against an RLS-protected table returning `200 []` confirms the URL+key pair is valid even before any user is authenticated. The bare `/rest/v1/` root can 401 with "Secret API key required" on newer Supabase projects — that's about the OpenAPI introspection endpoint, not a sign the anon/publishable key is wrong; test an actual table instead.

**Name-only (no email) accounts on Supabase Auth:** Supabase Auth requires an email-shaped identifier internally. To let users sign up with just a display name + password, slugify the name into a synthetic address on a fake internal domain (e.g. `name.slug@contas.<app>.internal`) and use that as the `email` in `signUp`/`signInWithPassword` — the user never sees it. Real domains like `example.com`/`example.org` get rejected by Supabase with `email_address_invalid` (blocklisted placeholder domains); an arbitrary made-up domain (e.g. `*.internal`) passes format validation fine.

Because there's no real inbox behind the synthetic address, the project's "Confirm email" setting (Authentication > Sign In/Providers > Email) must be turned OFF, or accounts can sign up but never log in (`email_not_confirmed` forever). This is a project-level Auth config setting, not a database row — it cannot be changed via SQL, only via the Supabase dashboard toggle or the account-wide Management API (which needs a broad personal access token, not the per-project anon/service key).

**Trap:** the Email provider's dashboard section has two separate toggles that look related: "Email provider enabled" (must stay ON) and "Confirm email" (turn OFF for synthetic-email flows). Toggling the wrong one disables signups entirely with `email_provider_disabled`, not the intended fix. Symptom of over-eager `signUp` testing: `over_email_send_rate_limit` (429) — each signup attempt tries to send a real confirmation email even to a fake address, and Supabase's free-tier send quota is small; this stops entirely once "Confirm email" is off since no email is sent.
