import type {
  Activity,
  OutcomeType,
  Rating,
  ScheduledSession,
  SessionOutcome,
  WeeklyActivityBan,
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

export function getFollowUpTargetWeek(
  session: ScheduledSession,
  currentWeekStart: string,
) {
  return session.target_week_start_date < currentWeekStart
    ? currentWeekStart
    : session.target_week_start_date;
}

export function isActivityReferenced(
  activityId: string,
  scheduledSessions: ScheduledSession[],
  outcomes: SessionOutcome[],
  weeklyActivityBans: WeeklyActivityBan[],
) {
  return (
    scheduledSessions.some((session) => session.activity_id === activityId) ||
    outcomes.some((outcome) => outcome.replacement_activity_id === activityId) ||
    weeklyActivityBans.some((ban) => ban.activity_id === activityId)
  );
}

export function deleteOrPauseActivity({
  activityId,
  activities,
  scheduledSessions,
  outcomes,
  weeklyActivityBans,
}: {
  activityId: string;
  activities: Activity[];
  scheduledSessions: ScheduledSession[];
  outcomes: SessionOutcome[];
  weeklyActivityBans: WeeklyActivityBan[];
}) {
  if (isActivityReferenced(activityId, scheduledSessions, outcomes, weeklyActivityBans)) {
    return {
      activities: activities.map((activity) =>
        activity.id === activityId ? { ...activity, status: 'paused' as const } : activity,
      ),
      weeklyActivityBans,
      result: 'paused' as const,
    };
  }

  return {
    activities: activities.filter((activity) => activity.id !== activityId),
    weeklyActivityBans: weeklyActivityBans.filter((ban) => ban.activity_id !== activityId),
    result: 'deleted' as const,
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
