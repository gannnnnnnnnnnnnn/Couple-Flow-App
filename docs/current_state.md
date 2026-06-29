# Current State

## Snapshot

This is the local-first PWA draft for Couple Flow before Supabase.

## Implemented

- Product harness docs are defined.
- V0 app uses React, TypeScript, Tailwind, Vite, and PWA metadata.
- Local mock data mirrors the Supabase-ready table names and core fields.
- Week Board, Activity Pool, Draw Flow, History, and Settings / Pair screens are playable in local state.
- Local app data is persisted in `localStorage` through a small domain layer for activities, scheduled sessions, outcomes, weekly activity bans, target week, and budget filter.
- First run without saved local data seeds from demo mock data so the phone app is usable immediately.
- Settings shows local-only save status and includes confirmed controls to reset to demo data or clear local user data.
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
- Settings exposes pair name, timezone, current week, local-only save status, and local reset controls.

## Validation

- `npm ci` passed on 2026-06-29.
- `npm test` passed on 2026-06-29: 4 files, 14 tests.
- `npm run build` passed on 2026-06-29.

## Known Gaps

- Supabase is not connected yet.
- No authentication or real pair invite flow yet.
- Agreement enforcement is represented in UI state and outcome data, not backed by server rules.
- Offline caching is app-shell-only and has not been tuned for runtime data.
