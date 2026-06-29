# Product Spec

## Concept

Couple Flow is a playful weekly planning board for a couple. It combines a shared activity pool, budget groups, weekly draw, per-member activity vetoes, scheduled to-dos, and true history after outcomes.

The product should feel calm and premium, but warm. It borrows:

- Things: clear task hierarchy and calm surfaces
- Todoist: planning structure and fast scanning
- Structured: weekly/timeline rhythm
- Paired: playful couple tone

It should not feel like an enterprise dashboard.

## Personas

- Partner A and Partner B share one pair space.
- Each partner can add activities, ban up to two activities for a draw session, agree to replacement/redraw decisions, and record outcomes.

## Core Objects

- Pair: the shared space, timezone, and members.
- Activity: an idea in the shared pool.
- Budget group: a loose spending or effort band.
- Weekly activity ban: a member veto that prevents an activity from appearing in a draw session.
- Draw session: the act of selecting one or more activities for a target week.
- Scheduled session: an accepted activity planned for a specific week.
- Outcome: the only source of history.

## Critical Rule

A drawn activity is not history.

After draw and accept, the activity is a scheduled plan for `target_week_start_date`.

History is created only when a scheduled session receives one of these outcomes:

- Completed with rating: `夯`, `还行`, `拉`, `再来一次`, `不想再做`
- Not done with a reason
- Manually replaced with both members agreeing
- Redrawn with both members agreeing

## Time Model

- Store pair timezone, default `Australia/Melbourne`.
- Store target week as `target_week_start_date`.
- Do not store or depend on week numbers.
- Compute current week from pair timezone.
- Future sessions show under Planning.
- Current week sessions show under This Week / Ongoing.
- Archived outcomes show under History.

## V0 Screens

### Week Board

Shows the current week, ongoing sessions, future planning, and scheduled to-dos. Unavailable-time slots stay out of V0.

### Activity Pool

Lets the couple collect activities with budget group, tags, rough duration, owner, and active/paused state.

### Draw Flow

Lets the couple choose a target week, filter eligible activities, draw a suggestion, and accept it into the schedule.

### History

Shows only archived outcomes. Drawn, accepted, or scheduled items without outcomes must not appear here.

### Settings / Pair

Shows pair name, timezone, members, mock mode status, and defaults.

## V0 Exclusions

- Photos
- Maps
- Payments
- Push notifications
- Production Supabase auth flow
- Unavailable-time scheduling
