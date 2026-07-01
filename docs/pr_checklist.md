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
- [x] Draw Flow reveals exactly one persisted result and no longer asks the user to choose from three cards.
- [x] History exists.
- [x] Settings / Pair exists.
- [x] Normal user-facing app screens use Simplified Chinese copy.
- [x] Local-first persistence exists before Supabase.
- [x] Optional Supabase pair-code sync exists without requiring env vars for demo mode.
- [x] Supabase setup docs cover schema install, env vars, Realtime replication, restart checks, and troubleshooting.
- [x] Two-device smoke test docs cover create, join, bidirectional activity sync, scheduled-session sync, outcome sync, and device disconnect.
- [x] Vercel deployment docs cover Vite preset, build command, output directory, env vars, and phone install.
- [x] Phone usage docs cover same-URL pairing, no shared Wi-Fi requirement, network expectations, and add-to-home-screen.
- [x] Vercel SPA refreshes route back to the app shell.
- [x] Settings distinguishes local-only, sync-available, connected, syncing, last-saved, and sync-error states.
- [x] App has a top-level Chinese error boundary with reload and owned-storage repair actions.
- [x] App repair and Settings local-device clear remove only Couple Flow-owned `couple-flow.` storage keys.
- [x] Local-only or unpaired use shows a persistent warning with a nearby backup export action.
- [x] Settings local-device clear actions warn about unsynced local data loss.
- [x] Connected Settings shows the pair code and display name with a copy action.
- [x] Settings disables demo reset and backup import while connected to a pair.
- [x] Settings disconnect clears local device data without remote deletes.
- [x] Settings supports explicit local empty start without future demo reseeding on that device.
- [x] Settings supports explicit shared Supabase clear that preserves pair identity, members, and budget groups.
- [x] Activity Pool supports faster mobile quick-add entry.
- [x] Activity Pool supports editing, safe deletion, and pause fallback for referenced activities.
- [x] Paired Draw locks the acting member to the stored device identity.
- [x] Paired Draw renders 我的屏蔽 as editable and 对方的屏蔽 as read-only.
- [x] Draw realtime applies shared changes without navigating, resetting the visible result, or jumping week/budget controls.
- [x] Paired Draw accept, 重抽, and 换一个 requests require both members before creating a todo or replacing the current result.
- [x] JSON backup export/import exists for local mode with shape validation.
- [x] No photos, maps, payments, or push notifications.

## Data Model

- [x] Mock data mirrors Supabase-ready tables.
- [x] Pair timezone defaults to `Australia/Melbourne`.
- [x] Week storage uses `target_week_start_date`, not week numbers.
- [x] Replacement/redraw outcomes include both-member agreement.
- [x] V0 uses per-member activity bans instead of unavailable time windows.
- [x] Local storage persists activities, draw sessions, scheduled sessions, outcomes, weekly activity bans, target week, and budget filter.
- [x] Local storage migration tolerates corrupt JSON, missing draw sessions, old draw statuses, invalid arrays, invalid target weeks, and invalid budget filters without crashing boot.
- [x] Supabase schema includes pairs, pair members, budget groups, activities, draw sessions, weekly activity bans, scheduled sessions, and session outcomes.
- [x] Repository layer preserves localStorage fallback and keeps Supabase calls out of UI leaf components.
- [x] Supabase load/realtime failures keep the app visible and surface sync errors in Settings.
- [x] Pair-code join hydrates remote state before autosave can run.
- [x] Pair-code create intentionally migrates current local state once.
- [x] Normal Supabase autosave keeps remote-only rows unless an explicit UI delete hint scopes the delete.
- [x] Explicit shared clear deletes pair-scoped Supabase activities, plans, bans, draw sessions, and outcomes.
- [x] Removed own weekly bans delete only the matching pair/draw/member/activity row and stay deleted after reload.
- [x] Activity delete sync deletes unreferenced activities remotely and pauses referenced activities instead.
- [x] Draw sessions carry a per-target-week `idle` / `drawing` / `revealed` / `pending_accept` / `accepted` / `pending_reroll` / `pending_change` guard.
- [x] Autosave is debounced and skips immediate saves after identical remote snapshots are applied.
- [x] `.env.example` contains placeholders only.
- [x] `.gitignore` excludes `.env`, `.env.local`, and `.env.*.local`.

## Validation

- [x] `npm ci` passes.
- [x] `npm test` passes.
- [x] `npm run build` passes.
- [x] PR body includes preview note or screenshots.
- [x] PR body includes build result.
- [x] PR body includes known gaps.
