# Data Model

The V0 app uses local mock data, shaped to be Supabase-ready.

## Tables

### pairs

| Field | Type | Notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `name` | text | Pair display name |
| `timezone` | text | Defaults to `Australia/Melbourne` |
| `created_at` | timestamptz | Created time |

### pair_members

| Field | Type | Notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `pair_id` | uuid | References `pairs.id` |
| `display_name` | text | Member name |
| `color` | text | UI accent |
| `created_at` | timestamptz | Created time |

### budget_groups

| Field | Type | Notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `pair_id` | uuid | References `pairs.id` |
| `name` | text | Example: tiny, treat, splurge |
| `amount_hint` | text | Human budget hint |
| `sort_order` | integer | Display order |

### activities

| Field | Type | Notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `pair_id` | uuid | References `pairs.id` |
| `title` | text | Activity name |
| `note` | text | Optional context |
| `budget_group_id` | uuid | References `budget_groups.id` |
| `duration_minutes` | integer | Optional rough duration |
| `tags` | text[] | Local filters |
| `created_by_member_id` | uuid | References `pair_members.id` |
| `status` | text | `active` or `paused` |
| `created_at` | timestamptz | Created time |

### ban_slots

| Field | Type | Notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `pair_id` | uuid | References `pairs.id` |
| `member_id` | uuid | Optional owner |
| `starts_at` | timestamptz | Start |
| `ends_at` | timestamptz | End |
| `reason` | text | Optional label |

### draw_sessions

| Field | Type | Notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `pair_id` | uuid | References `pairs.id` |
| `target_week_start_date` | date | Week anchor in pair timezone |
| `created_by_member_id` | uuid | References `pair_members.id` |
| `status` | text | `draft`, `accepted`, or `cancelled` |
| `created_at` | timestamptz | Created time |

### draw_candidates

| Field | Type | Notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `draw_session_id` | uuid | References `draw_sessions.id` |
| `activity_id` | uuid | References `activities.id` |
| `position` | integer | Draw order |
| `selected` | boolean | Accepted candidate |

### scheduled_sessions

| Field | Type | Notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `pair_id` | uuid | References `pairs.id` |
| `activity_id` | uuid | References `activities.id` |
| `draw_session_id` | uuid | Nullable for manual plans |
| `target_week_start_date` | date | Required |
| `status` | text | `planning`, `ongoing`, `completed`, `not_done`, `replaced`, `redrawn` |
| `todo_text` | text | Optional scheduled to-do |
| `created_at` | timestamptz | Created time |

### session_outcomes

| Field | Type | Notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `scheduled_session_id` | uuid | References `scheduled_sessions.id` |
| `outcome_type` | text | `completed`, `not_done`, `replaced`, `redrawn` |
| `rating` | text | Required for completed |
| `reason` | text | Required for not done |
| `replacement_activity_id` | uuid | Optional for replaced |
| `agreed_by_member_ids` | uuid[] | Required for replaced/redrawn |
| `created_at` | timestamptz | Outcome time |

## Local Mock Mode

Local mock mode should expose the same object names and field names as the Supabase-ready model. UI components should not rely on mock-only fields.

## Derived Views

- Planning: scheduled sessions with no outcome and future `target_week_start_date`.
- This Week / Ongoing: scheduled sessions with no outcome and current `target_week_start_date`.
- History: sessions with a `session_outcomes` record.
