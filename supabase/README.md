# Supabase Setup

This is the first shared-sync layer for Couple Flow. It is not production-grade auth.

## Setup

1. Create a Supabase project.
2. Open the SQL editor and run `supabase/schema.sql`.
3. Enable Realtime replication for:
   - `activities`
   - `scheduled_sessions`
   - `session_outcomes`
   - `weekly_activity_bans`
   - `pair_members`
4. Copy `.env.example` to `.env.local`.
5. Fill in:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
6. Restart the Vite dev server.

When those env vars are missing, the app stays in local demo mode and uses `localStorage`.

## Sync Behavior

- Joining a pair loads the remote snapshot first; local demo data does not overwrite the shared pair.
- Creating a pair intentionally migrates the current local app data into the new pair once.
- Normal V0 autosave is conservative and upsert-only. Remote deletes are deferred until an explicit user action and stricter authorization rules exist.

## Pair Code V0

Pair codes are simple shared codes stored on the `pairs` table. A user can create a pair code or join an existing code with a local display name. The app stores the resulting pair/member identity in browser storage.

This is intentionally lightweight for V0 sync. It does not provide email auth, identity proof, invite expiry, abuse prevention, private row access, or production authorization. Replace the permissive anon policies before shipping a real shared app.
