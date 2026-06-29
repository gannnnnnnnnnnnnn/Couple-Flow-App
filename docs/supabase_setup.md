# Supabase Setup

Couple Flow stays fully usable in local mode when Supabase env vars are missing. Add Supabase only when you want pair-code sync between two devices.

## Steps

1. Create a Supabase project.
2. Open the Supabase SQL editor.
3. Run the full contents of `supabase/schema.sql`.
4. In Supabase, open Database > Replication.
5. Enable Realtime replication for these tables:
   - `activities`
   - `scheduled_sessions`
   - `session_outcomes`
   - `weekly_activity_bans`
   - `pair_members`
6. Open Project Settings > API.
7. Copy the project URL.
8. Copy the anon public key.
9. Create `.env.local` from `.env.example`.
10. Fill in:
    - `VITE_SUPABASE_URL`
    - `VITE_SUPABASE_ANON_KEY`
11. Restart the Vite dev server.
12. Open Settings and confirm Sync mode changes from local-only copy to `Sync available, not connected`.

## Expected Settings States

- Without env vars: `Local only: Supabase env missing`.
- With env vars and no pair on this device: `Sync available, not connected`.
- After creating or joining a pair: `Connected`, with pair code, display name, last saved time, and any sync error visible.
- While saving shared changes: `Syncing`.

## Troubleshooting

- Env vars missing or typo: confirm `.env.local` exists at the project root and uses the exact names from `.env.example`.
- Dev server not restarted: stop and restart Vite after changing `.env.local`; Vite reads env vars at startup.
- Pair code not found: copy the code from the connected device again, avoid extra spaces, and make sure both devices use the same Supabase project.
- Realtime not updating: confirm replication is enabled for `activities`, `scheduled_sessions`, `session_outcomes`, `weekly_activity_bans`, and `pair_members`.
- One device still in local mode: open Settings on that device and confirm it does not still say `Local only: Supabase env missing`.
- Browser localStorage has stale pair identity: use Settings > Disconnect this device, then create or join the pair again.

## V0 Boundaries

Pair-code sync is lightweight shared access for personal testing. It is not production auth, does not use email login, and does not add invites, maps, photos, payments, push notifications, or app-store packaging.
