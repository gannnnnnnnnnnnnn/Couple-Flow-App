# Two-Device Smoke Test

Use this after Supabase is configured and the same build/env is available on both devices.

## Flow

1. Device A opens Couple Flow with Supabase env configured.
2. Device A opens Settings.
3. Device A enters a display name and creates a pair.
4. Device A sees a pair code and can copy/share it.
5. Device B opens the same deployed build/env.
6. Device B opens Settings.
7. Device B enters the shared pair code and a display name.
8. Device B joins the pair and sees remote pair data load onto the device.
9. Device A adds an activity in Activity Pool.
10. Device B sees the activity.
11. Device B adds an activity in Activity Pool.
12. Device A sees the activity.
13. Device A draws for next week and accepts a scheduled session.
14. Device B sees the scheduled session under Plan / later plans.
15. Device B marks an outcome from This Week or Pending.
16. Device A sees the outcome in History.
17. Device B disconnects this device from Settings.
18. Device A confirms the remote pair data remains available.

## Expected Results

- Local mode remains usable without Supabase env vars.
- Pair creation shows a visible pair code immediately.
- Joining a pair loads remote data onto the second device.
- New activities appear on the other device after save/realtime refresh.
- Accepted draws create scheduled sessions only.
- History updates only after an explicit outcome.
- Disconnecting one device clears that browser's local identity and data, but does not delete remote shared pair data.

## Known Limitations

- Pair codes are not production auth.
- No email auth, app invite, invite expiry, or identity proof exists in V0.
- Normal Supabase autosave is upsert-only; remote deletes are intentionally deferred.
- Realtime depends on Supabase replication being enabled for the required tables.
- Browser localStorage can keep an old pair identity until the device is disconnected or site data is cleared.
