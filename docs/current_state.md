# Current State

## Snapshot

This is the local-first PWA draft with an optional first Supabase pair-sync layer.

## Implemented

- Product harness docs are defined.
- V0 app uses React, TypeScript, Tailwind, Vite, and PWA metadata.
- Local mock data mirrors the Supabase-ready table names and core fields.
- Week Board, Activity Pool, Draw Flow, History, and Settings / Pair screens are playable in local state.
- Local app data is persisted in `localStorage` through a small domain layer for activities, scheduled sessions, outcomes, weekly activity bans, target week, and budget filter.
- First run without saved local data seeds from demo mock data so the phone app is usable immediately.
- Settings shows local-only save status and includes confirmed controls to reset to demo data or clear local user data.
- Supabase setup files exist with `.env.example`, `supabase/schema.sql`, and `supabase/README.md`.
- When Supabase env vars are present, Settings can create or join a V0 pair code with a local display name and stores the current pair/member identity locally.
- App data writes through a repository layer with localStorage fallback and Supabase CRUD/realtime support for activities, scheduled sessions, session outcomes, and weekly activity bans.
- Week Board keeps past open sessions visible under Needs Review / Overdue until an outcome is recorded.
- Replacing or redrawing from Needs Review reschedules follow-up work to the current week by default.
- Draw supports target week, budget filter, two per-member activity bans, eligible count, reveal stack, and accept.
- Ongoing plans support Done, Not done, Replace, and Redraw outcomes.
- Critical state rule is represented in UI data flow: draw/accept creates a scheduled session, not history.
- History renders only scheduled sessions with a `session_outcomes` record.

## Intended App Behavior

- Week Board prioritizes Needs Review, then This Week, then Planning, and exposes outcome actions for reviewable sessions.
- Activity Pool supports budget tabs, local add form, and active/paused toggles.
- Draw Flow filters active eligible activities by budget, activity bans, target-week schedule, and previous-week completed/not-done outcomes.
- History renders only sessions with outcomes and groups them by week.
- Settings exposes pair name, timezone, current week, local save status, pair-code sync controls, and local reset controls.

## Validation

- `npm ci` passed on 2026-06-29.
- `npm test` passed on 2026-06-29: 5 files, 17 tests.
- `npm run build` passed on 2026-06-29.

## Known Gaps

- Supabase is optional and only enabled by local env vars.
- Pair-code sync is not production-grade auth; no email auth or real invite security exists yet.
- Agreement enforcement is represented in UI state and outcome data, not backed by server rules.
- Offline caching is app-shell-only and has not been tuned for runtime data.
