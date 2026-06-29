export type SessionStatus =
  | 'planning'
  | 'ongoing'
  | 'completed'
  | 'not_done'
  | 'replaced'
  | 'redrawn';

export type OutcomeType = 'completed' | 'not_done' | 'replaced' | 'redrawn';

export type Rating = '夯' | '还行' | '拉' | '再来一次' | '不想再做';

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

export interface BanSlot {
  id: string;
  pair_id: string;
  member_id: string | null;
  starts_at: string;
  ends_at: string;
  reason: string;
}

export interface DrawSession {
  id: string;
  pair_id: string;
  target_week_start_date: string;
  created_by_member_id: string;
  status: 'draft' | 'accepted' | 'cancelled';
  created_at: string;
}

export interface DrawCandidate {
  id: string;
  draw_session_id: string;
  activity_id: string;
  position: number;
  selected: boolean;
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
