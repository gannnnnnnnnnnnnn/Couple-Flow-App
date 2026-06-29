# Couple Flow Agent Guide

## Product Boundary

Couple Flow is a mobile-first PWA for playful weekly planning between two people. Keep the experience beautiful, soft, premium, and useful, with a couple-centered tone rather than a generic dashboard.

## Critical Rule

A drawn activity is not history.

After draw and accept, an activity becomes a scheduled session for a `target_week_start_date`. It enters history only after an explicit outcome:

- completed with rating: `夯`, `顶级`, `人上人`, `NPC`, or `拉完了`
- not done with a reason
- manually replaced with both members agreeing
- redrawn with both members agreeing

## Time Model

- Store the pair timezone. Default: `Australia/Melbourne`.
- Store weeks as `target_week_start_date`, not week numbers.
- Compute the current week from the pair timezone.
- Future sessions belong in Planning.
- Current week sessions belong in This Week / Ongoing.
- Past open sessions with no outcome belong in Needs Review / Overdue.
- Outcomes belong in History.

## V0 Tech

- Vite + React + TypeScript + Tailwind
- Mobile-first PWA
- Supabase-ready model with local mock mode for UI development
- Per-member activity bans are draw-session vetoes, not unavailable time windows
- No photos, maps, payments, push notifications, unavailable-time scheduling, or Supabase auth in V0

## Working Rules

- Prefer explicit state-machine changes over implicit status edits.
- Do not add history records from draw/accept alone.
- Keep mock data shaped like the future Supabase tables.
- When adding UI, optimize for a narrow mobile viewport first, then scale up.
- Update `docs/current_state.md` and `docs/pr_checklist.md` when product scope or validation changes.
