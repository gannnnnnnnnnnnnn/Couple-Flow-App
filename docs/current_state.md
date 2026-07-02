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
- A top-level React error boundary catches render/runtime failures and shows a Chinese recovery screen with reload and owned-storage repair actions.
- The repair action clears only `couple-flow.` localStorage keys after warning that unsynced local device data will be deleted.
- Local saved-state loading is defensive: corrupt JSON, missing `drawSessions`, old draw statuses, invalid arrays, invalid target weeks, and invalid budget filters fall back to safe state instead of crashing boot.
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
- `vercel.json` rewrites browser refreshes back to the Vite app shell and sends conservative cache headers for the app shell, service worker, and version manifest.
- The app checks a version manifest, shows `发现新版本，刷新后继续使用。` with `刷新到新版本`, and reloads without clearing localStorage or pair identity.
- When Supabase env vars are present, Settings can create or join a V0 pair code with a local display name and stores the current pair/member identity locally.
- Joining an existing pair reuses a pair member with the same trimmed, case-insensitive display name to avoid duplicate avatars after local browser data is cleared.
- Settings clearly separates local-only, sync-available, connected, delayed syncing, last-saved, and sync-error states.
- When a device is local-only or not yet paired, the app persistently warns `当前只保存在这台设备，清除浏览器数据会丢失。` with a nearby `导出备份` action.
- Any Settings action that clears local device state warns `这会删除这台设备上尚未同步的数据。已同步到双人空间的数据不会受影响。`
- Connected Settings shows the current pair code, display name, status, last saved time, and a copy-code action with a browser clipboard fallback.
- App data writes through a repository layer with localStorage fallback and Supabase CRUD/realtime support for activities, draw sessions, scheduled sessions, session outcomes, and weekly activity bans.
- Supabase snapshot/realtime load failures fall back to the visible local app state and surface the recovery message in Settings instead of blank-screening.
- Supabase recovery fallback snapshots are blocked from autosave so local/demo/stale recovery data cannot overwrite remote pair data.
- Pair-code join/create hydrates a complete repository snapshot before App autosave resumes, so joining a pair does not overwrite remote data with stale local demo data.
- Normal Supabase autosave is debounced, suppresses identical realtime-applied snapshots, keeps remote-only rows unless there is an explicit UI delete hint, and scopes member-ban deletes by pair, draw session, member, and activity.
- Week Board keeps past open sessions visible under Needs Review / Overdue until an outcome is recorded.
- Replacing or redrawing from Needs Review reschedules follow-up work to the current week by default.
- Activity Pool supports faster mobile entry with simple required fields, optional note/duration/tags, quick-add examples, clear-after-add, and lightweight success feedback.
- Activity Pool supports editing title, budget group, note, duration, and tags, deleting explicitly removed unreferenced activities remotely, and pausing activities that are already referenced by plans, outcomes, or bans.
- In paired mode, the acting member is locked to the stored device identity; local/demo mode keeps flexible member testing.
- Draw supports target week, budget filter, split 我的屏蔽 / 对方的屏蔽 sections, two per-member activity bans, eligible count, one persisted draw result, accept, 重抽, and 换一个.
- Draw realtime applies shared changes quietly without changing the current screen, week, budget tab, visible result, or local form/draft state; if partner choice changes make a visible draw result stale, the draw screen shows `对方刚刚更新了选择，本轮抽签结果可能需要重新抽。`
- An empty remote pair snapshot from shared clear is authoritative, so other connected devices do not preserve or re-upload stale local activities, draw sessions, plans, outcomes, or bans.
- Draw sessions use a per-target-week active-round row with `idle`, `drawing`, `revealed`, `pending_accept`, `accepted`, `pending_reroll`, and `pending_change`; paired accept, 重抽, and 换一个 requests wait for both effective members before changing the result or creating the scheduled session.
- Paired agreement uses at most two effective V0 members, deduped by display name while preserving the current device member, so stale duplicate `pair_members` rows do not block draw or plan agreement.
- Settings shows `检测到重复成员，已按当前两台设备处理同意流程。` when more than two raw pair members are present.
- Accepted draw finalization creates or reuses one scheduled session, then resets the same target-week draw row to `idle` so the couple can draw another activity for that week immediately.
- Supabase schema includes a partial unique index for draw-created scheduled sessions where `draw_session_id` is present, with a migration block that deduplicates existing rows first.
- Ongoing plans support Done, Not done, Replace, and Redraw outcomes.
- Week Board scheduled-session cards open a mobile-first `计划详情` bottom sheet with the activity title, budget, target week, status, todo, note, and state-specific actions.
- Future planning sessions can move to this week, move to next week, redraw, replace, or cancel from the detail sheet.
- Current-week sessions can be replaced, redrawn, marked not done, completed, or cancelled from the detail sheet.
- Past open sessions can be completed, marked not done, replaced, or redrawn from the detail sheet.
- In paired mode, scheduled-session plan-changing actions (`move_week`, `redraw`, `replace`, and `cancel`) persist pending agreement state on `scheduled_sessions`; the requester waits, the other member can agree or reject, and completion applies the action once.
- Local/unpaired mode applies the same plan-changing actions immediately.
- Critical state rule is represented in UI data flow: draw/accept creates a scheduled session, not history.
- History renders only scheduled sessions with a `session_outcomes` record.

## Intended App Behavior

- Week Board prioritizes Needs Review, then This Week, then Planning, and exposes outcome actions for reviewable sessions.
- Week Board cards are actionable through the plan detail sheet without changing board bucket semantics.
- Activity Pool supports budget tabs, local add form, and active/paused toggles.
- Activity Pool delete removes unused activities and falls back to pause for referenced activities.
- Draw Flow filters active eligible activities by budget, activity bans, target-week schedule, and previous-week completed/not-done outcomes.
- In paired mode, each device can edit only its own draw bans; partner bans are visible but read-only and update via realtime.
- History renders only sessions with outcomes and groups them by week.
- Settings exposes pair name, timezone, current week, local/sync status, visible connected pair-code details, local-safe reset/disconnect controls, and JSON backup import/export.

## Validation

- `npm ci` passed on 2026-07-01.
- `npm test` passed on 2026-07-02: 13 files, 113 tests.
- `npm run build` passed on 2026-07-02.
- `git diff --check` passed on 2026-07-02.

## Known Gaps

- Supabase is optional and only enabled by local env vars.
- Public deployment still requires the deployer to add Supabase environment variables in Vercel when pair-code sync is desired.
- Pair-code sync is not production-grade auth; no email auth or real invite security exists yet.
- Remote deletes are action-scoped in V0: shared clear still clears all pair data, removed own weekly bans delete only the matching member-scoped row, and explicitly deleted unreferenced activities delete remotely while referenced activities pause.
- Agreement enforcement is represented in UI state and the draw-created scheduled-session uniqueness guard, not full server-side member authorization.
- This PR does not implement the CS2-style draw animation or a full UI/UX redesign.
- Offline caching is conservative and network-first for app updates; richer offline runtime data caching is not tuned yet.
- Pair-code sharing is copy-only; V0 intentionally does not include invitation management.
