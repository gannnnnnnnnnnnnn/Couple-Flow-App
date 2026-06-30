# Current State

## Snapshot

This is the local-first PWA draft with an optional first Supabase pair-sync layer.

## Implemented

- Product harness docs are defined.
- V0 app uses React, TypeScript, Tailwind, Vite, and PWA metadata.
- Local mock data mirrors the Supabase-ready table names and core fields.
- Week Board, Activity Pool, Draw Flow, History, and Settings / Pair screens are playable in local state with Simplified Chinese user-facing app copy.
- Local demo budgets, activities, tags, todos, quick-add examples, backup/import messages, pair-code helper copy, sync status copy, and PWA metadata are localized for a natural Chinese mobile app feel.
- Local app data is persisted in `localStorage` through a small domain layer for activities, draw sessions, scheduled sessions, outcomes, weekly activity bans, target week, and budget filter.
- First run without saved local data seeds from demo mock data so the phone app is usable immediately.
- Users can explicitly choose a blank start; that device stores `couple-flow.demo-disabled.v1` so missing local data no longer reseeds demo rows after an intentional empty start.
- Settings shows local/save/sync status and includes confirmed controls for reset, disconnect, device clear, JSON export, and JSON import.
- Settings includes a confirmed local `从空白开始` action and a connected `清空双人空间数据` action.
- When connected to a pair, demo reset and JSON import are disabled so shared Supabase data cannot be accidentally overwritten from Settings.
- Connected shared clear deletes pair-scoped session outcomes, scheduled sessions, weekly activity bans, draw sessions, and activities in that order while preserving pairs, pair members, and budget groups.
- Disconnecting a synced device clears only local device data and pair identity; it does not delete or modify remote pair data.
- Supabase setup files exist with `.env.example`, `supabase/schema.sql`, and `supabase/README.md`.
- `docs/supabase_setup.md` documents Supabase project setup, required Realtime replication tables, env vars, restart checks, and common troubleshooting.
- `docs/two_device_smoke_test.md` documents the intended create-pair, join-pair, shared activity, scheduled session, outcome, and disconnect smoke flow.
- `docs/deployment.md` documents Vercel deployment with the Vite preset, `npm run build`, `dist`, Supabase environment variables, and phone home-screen setup.
- `docs/phone_usage.md` documents the two-phone public-URL flow, pair-code create/join, network expectations, and add-to-home-screen usage.
- `vercel.json` rewrites browser refreshes back to the Vite app shell.
- When Supabase env vars are present, Settings can create or join a V0 pair code with a local display name and stores the current pair/member identity locally.
- Settings clearly separates local-only, sync-available, connected, delayed syncing, last-saved, and sync-error states.
- Connected Settings shows the current pair code, display name, status, last saved time, and a copy-code action with a browser clipboard fallback.
- App data writes through a repository layer with localStorage fallback and Supabase CRUD/realtime support for activities, draw sessions, scheduled sessions, session outcomes, and weekly activity bans.
- Pair-code join/create hydrates a complete repository snapshot before App autosave resumes, so joining a pair does not overwrite remote data with stale local demo data.
- Normal Supabase autosave is debounced, suppresses identical realtime-applied snapshots, keeps remote-only rows unless there is an explicit UI delete hint, and scopes member-ban deletes by pair, draw session, member, and activity.
- Week Board keeps past open sessions visible under Needs Review / Overdue until an outcome is recorded.
- Replacing or redrawing from Needs Review reschedules follow-up work to the current week by default.
- Activity Pool supports faster mobile entry with simple required fields, optional note/duration/tags, quick-add examples, clear-after-add, and lightweight success feedback.
- Activity Pool supports editing title, budget group, note, duration, and tags, deleting explicitly removed unreferenced activities remotely, and pausing activities that are already referenced by plans, outcomes, or bans.
- In paired mode, the acting member is locked to the stored device identity; local/demo mode keeps flexible member testing.
- Draw supports target week, budget filter, split 我的屏蔽 / 对方的屏蔽 sections, two per-member activity bans, eligible count, reveal stack, and accept.
- Draw realtime applies shared changes quietly without changing the current screen, week, budget tab, reveal stack, or local form/draft state; if partner choice changes make a visible draw result stale, the draw screen shows `对方刚刚更新了选择，本轮抽签结果可能需要重新抽。`
- Draw sessions use a pragmatic per-target-week guard with `idle`, `drawing`, `revealed`, and `accepted` so a paired device treats a partner's active draw as read-only instead of starting a competing draw.
- Ongoing plans support Done, Not done, Replace, and Redraw outcomes.
- Critical state rule is represented in UI data flow: draw/accept creates a scheduled session, not history.
- History renders only scheduled sessions with a `session_outcomes` record.

## Intended App Behavior

- Week Board prioritizes Needs Review, then This Week, then Planning, and exposes outcome actions for reviewable sessions.
- Activity Pool supports budget tabs, local add form, and active/paused toggles.
- Activity Pool delete removes unused activities and falls back to pause for referenced activities.
- Draw Flow filters active eligible activities by budget, activity bans, target-week schedule, and previous-week completed/not-done outcomes.
- In paired mode, each device can edit only its own draw bans; partner bans are visible but read-only and update via realtime.
- History renders only sessions with outcomes and groups them by week.
- Settings exposes pair name, timezone, current week, local/sync status, visible connected pair-code details, local-safe reset/disconnect controls, and JSON backup import/export.

## Validation

- `npm ci` passed on 2026-06-30.
- `npm test` passed on 2026-06-30: 9 files, 54 tests.
- `npm run build` passed on 2026-06-30.

## Known Gaps

- Supabase is optional and only enabled by local env vars.
- Public deployment still requires the deployer to add Supabase environment variables in Vercel when pair-code sync is desired.
- Pair-code sync is not production-grade auth; no email auth or real invite security exists yet.
- Remote deletes are action-scoped in V0: shared clear still clears all pair data, removed own weekly bans delete only the matching member-scoped row, and explicitly deleted unreferenced activities delete remotely while referenced activities pause.
- Agreement enforcement is represented in UI state and outcome data, not backed by server rules.
- Offline caching is app-shell-only and has not been tuned for runtime data.
- Pair-code sharing is copy-only; V0 intentionally does not include invitation management.
