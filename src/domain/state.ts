import type {
  Activity,
  OutcomeType,
  Rating,
  ScheduledSession,
  SessionOutcome,
} from '../types';

export function getOutcomeBySessionId(outcomes: SessionOutcome[]) {
  return new Map(outcomes.map((outcome) => [outcome.scheduled_session_id, outcome]));
}

export function isHistoryEligible(
  session: ScheduledSession,
  outcomes: SessionOutcome[],
) {
  return outcomes.some((outcome) => outcome.scheduled_session_id === session.id);
}

export function classifySessions(
  sessions: ScheduledSession[],
  outcomes: SessionOutcome[],
  currentWeekStart: string,
) {
  const outcomeBySessionId = getOutcomeBySessionId(outcomes);
  const openSessions = sessions.filter((session) => !outcomeBySessionId.has(session.id));

  return {
    needsReviewSessions: openSessions.filter(
      (session) => session.target_week_start_date < currentWeekStart,
    ),
    ongoingSessions: openSessions.filter(
      (session) => session.target_week_start_date === currentWeekStart,
    ),
    planningSessions: openSessions.filter(
      (session) => session.target_week_start_date > currentWeekStart,
    ),
    historySessions: sessions.filter((session) => outcomeBySessionId.has(session.id)),
  };
}

export function createScheduledSession(
  activity: Activity,
  drawSessionId: string,
  pairId: string,
  targetWeekStartDate: string,
  currentWeekStart: string,
): ScheduledSession {
  return {
    id: `session-${activity.id}-${Date.now()}`,
    pair_id: pairId,
    activity_id: activity.id,
    draw_session_id: drawSessionId,
    target_week_start_date: targetWeekStartDate,
    status:
      targetWeekStartDate < currentWeekStart
        ? 'needs_review'
        : targetWeekStartDate === currentWeekStart
          ? 'ongoing'
          : 'planning',
    todo_text: 'Pick a time together',
    created_at: new Date().toISOString(),
  };
}

export function createOutcome(
  session: ScheduledSession,
  outcomeType: OutcomeType,
  options: {
    rating?: Rating;
    reason?: string;
    replacementActivityId?: string;
    agreedByMemberIds?: string[];
  },
): SessionOutcome {
  return {
    id: `outcome-${session.id}-${Date.now()}`,
    scheduled_session_id: session.id,
    outcome_type: outcomeType,
    rating: options.rating ?? null,
    reason: options.reason ?? null,
    replacement_activity_id: options.replacementActivityId ?? null,
    agreed_by_member_ids: options.agreedByMemberIds ?? [],
    created_at: new Date().toISOString(),
  };
}
