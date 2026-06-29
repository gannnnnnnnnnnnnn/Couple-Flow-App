export type SessionStatus =
  | 'planning'
  | 'ongoing'
  | 'needs_review'
  | 'completed'
  | 'not_done'
  | 'replaced'
  | 'redrawn';

export type OutcomeType = 'completed' | 'not_done' | 'replaced' | 'redrawn';

export type Rating = '夯' | '顶级' | '人上人' | 'NPC' | '拉完了';

export type BudgetFilter = 'all' | string;

export interface Pair {
  id: string;
  name: string;
  timezone: string;
  created_at: string;
}

export interface PairMember {
  id: string;
  pair_id: string;
  display_name: string;
  color: string;
  created_at: string;
}

export interface BudgetGroup {
  id: string;
  pair_id: string;
  name: string;
  amount_hint: string;
  sort_order: number;
}

export interface Activity {
  id: string;
  pair_id: string;
  title: string;
  note: string;
  budget_group_id: string;
  duration_minutes: number;
  tags: string[];
  created_by_member_id: string;
  status: 'active' | 'paused';
  created_at: string;
}

export interface DrawSession {
  id: string;
  pair_id: string;
  target_week_start_date: string;
  created_by_member_id: string;
  status: 'draft' | 'accepted' | 'cancelled';
  created_at: string;
}

export interface WeeklyActivityBan {
  id: string;
  draw_session_id: string;
  pair_id: string;
  member_id: string;
  activity_id: string;
  created_at: string;
}

export interface ScheduledSession {
  id: string;
  pair_id: string;
  activity_id: string;
  draw_session_id: string | null;
  target_week_start_date: string;
  status: SessionStatus;
  todo_text: string;
  created_at: string;
}

export interface SessionOutcome {
  id: string;
  scheduled_session_id: string;
  outcome_type: OutcomeType;
  rating: Rating | null;
  reason: string | null;
  replacement_activity_id: string | null;
  agreed_by_member_ids: string[];
  created_at: string;
}
