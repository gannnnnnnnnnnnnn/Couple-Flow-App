# PR Checklist

## Product Rules

- [x] Drawn activity is not rendered as History.
- [x] Accepted draw creates a scheduled plan with `target_week_start_date`.
- [x] Current week is computed from pair timezone.
- [x] Future sessions render under Planning.
- [x] Current week sessions render under This Week / Ongoing.
- [x] History contains only sessions with outcomes.

## V0 Scope

- [x] Week Board exists.
- [x] Activity Pool exists.
- [x] Draw Flow exists.
- [x] History exists.
- [x] Settings / Pair exists.
- [x] No photos, maps, payments, or push notifications.

## Data Model

- [x] Mock data mirrors Supabase-ready tables.
- [x] Pair timezone defaults to `Australia/Melbourne`.
- [x] Week storage uses `target_week_start_date`, not week numbers.
- [x] Replacement/redraw outcomes include both-member agreement.

## Validation

- [x] `npm run build` passes.
- [x] PR body includes preview note or screenshots.
- [x] PR body includes build result.
- [x] PR body includes known gaps.
