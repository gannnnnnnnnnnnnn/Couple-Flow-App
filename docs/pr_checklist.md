# PR Checklist

## Product Rules

- [x] Drawn activity is not rendered as History.
- [x] Accepted draw creates a scheduled plan with `target_week_start_date`.
- [x] Current week is computed from pair timezone.
- [x] Future sessions render under Planning.
- [x] Current week sessions render under This Week / Ongoing.
- [x] Past open sessions render under Needs Review / Overdue.
- [x] History contains only sessions with outcomes.

## V0 Scope

- [x] Week Board exists.
- [x] Activity Pool exists.
- [x] Draw Flow exists.
- [x] History exists.
- [x] Settings / Pair exists.
- [x] Normal user-facing app screens use Simplified Chinese copy.
- [x] Local-first persistence exists before Supabase.
- [x] Optional Supabase pair-code sync exists without requiring env vars for demo mode.
- [x] Supabase setup docs cover schema install, env vars, Realtime replication, restart checks, and troubleshooting.
- [x] Two-device smoke test docs cover create, join, bidirectional activity sync, scheduled-session sync, outcome sync, and device disconnect.
- [x] Settings distinguishes local-only, sync-available, connected, syncing, last-saved, and sync-error states.
- [x] Connected Settings shows the pair code and display name with a copy action.
- [x] Settings disables demo reset and backup import while connected to a pair.
- [x] Settings disconnect clears local device data without remote deletes.
- [x] Activity Pool supports faster mobile quick-add entry.
- [x] JSON backup export/import exists for local mode with shape validation.
- [x] No photos, maps, payments, or push notifications.

## Data Model

- [x] Mock data mirrors Supabase-ready tables.
- [x] Pair timezone defaults to `Australia/Melbourne`.
- [x] Week storage uses `target_week_start_date`, not week numbers.
- [x] Replacement/redraw outcomes include both-member agreement.
- [x] V0 uses per-member activity bans instead of unavailable time windows.
- [x] Local storage persists activities, scheduled sessions, outcomes, weekly activity bans, target week, and budget filter.
- [x] Supabase schema includes pairs, pair members, budget groups, activities, draw sessions, weekly activity bans, scheduled sessions, and session outcomes.
- [x] Repository layer preserves localStorage fallback and keeps Supabase calls out of UI leaf components.
- [x] Pair-code join hydrates remote state before autosave can run.
- [x] Pair-code create intentionally migrates current local state once.
- [x] Normal Supabase autosave is upsert-only and does not delete remote-only rows.
- [x] Autosave is debounced and skips immediate saves after identical remote snapshots are applied.

## Validation

- [x] `npm ci` passes.
- [x] `npm test` passes.
- [x] `npm run build` passes.
- [x] PR body includes preview note or screenshots.
- [x] PR body includes build result.
- [x] PR body includes known gaps.
