# State Machine

## Principle

History is outcome-driven. Draw, acceptance, and scheduling are planning states, not historical facts.

## Activity Lifecycle

```mermaid
stateDiagram-v2
  [*] --> PoolActive
  PoolActive --> PoolPaused
  PoolPaused --> PoolActive
  PoolActive --> DrawCandidate
  DrawCandidate --> PoolActive: skipped
  DrawCandidate --> Scheduled: accepted for target_week_start_date
  Scheduled --> Ongoing: target week is current week
  Scheduled --> Later: target week is future week
  Later --> Ongoing: week arrives
  Ongoing --> PendingHandling: week passes without outcome
  Scheduled --> PendingHandling: target week is before current week and no outcome exists
  Ongoing --> Completed: completed + rating
  Ongoing --> NotDone: not done + reason
  Ongoing --> Replaced: both agreed replacement
  Ongoing --> Redrawn: both agreed redraw
PendingHandling --> Completed: completed + rating
PendingHandling --> NotDone: not done + reason
PendingHandling --> Replaced: both agreed replacement, follow-up scheduled for current week
PendingHandling --> Redrawn: both agreed redraw, draw target resets to current week
  Completed --> History
  NotDone --> History
  Replaced --> History
  Redrawn --> History
```

## Session Statuses

| Status | Meaning | History? |
| --- | --- | --- |
| `planning` | Accepted for a future target week | No |
| `ongoing` | Target week is current week | No |
| `needs_review` | Derived as the Pending bucket when target week is before current week and no outcome exists | No |
| `completed` | Done with a simple rating | Yes |
| `not_done` | Missed with a reason | Yes |
| `replaced` | Manually replaced with both members agreeing | Yes |
| `redrawn` | Redrawn with both members agreeing | Yes |

## Outcome Ratings

Completed sessions use one simple rating:

- `夯`
- `顶级`
- `人上人`
- `NPC`
- `拉完了`

## Agreement Rules

Replacement and redraw outcomes require both members agreeing. Store explicit agreement records or fields so the outcome is auditable.

## Week Classification

For a pair timezone:

- If `target_week_start_date` is after the current week start, show under Later.
- If `target_week_start_date` equals the current week start and no outcome exists, show under This Week / Ongoing.
- If `target_week_start_date` is before the current week start and no outcome exists, show under Pending.
- If an outcome exists, show under History regardless of target date.
- Replacing or redrawing a Pending session archives the overdue session and schedules the follow-up for the current week by default.

## Forbidden Transitions

- Draw candidate directly to History.
- Accepted scheduled session directly to History without outcome details.
- Future scheduled session to completed before its target week unless the user explicitly records an early outcome in a later version.
