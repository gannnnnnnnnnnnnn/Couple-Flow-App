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
  now = new Date(),
): ScheduledSession {
  return {
    id: `session-${activity.id}-${now.getTime()}`,
    pair_id: pairId,
    activity_id: activity.id,
    draw_session_id: drawSessionId,
    target_week_start_date: targetWeekStartDate,
    status: getScheduledSessionStatus(targetWeekStartDate, currentWeekStart),
    todo_text: '一起挑个时间',
    created_at: now.toISOString(),
  };
}

export function getScheduledSessionStatus(
  targetWeekStartDate: string,
  currentWeekStart: string,
): ScheduledSession['status'] {
  return targetWeekStartDate < currentWeekStart
    ? 'needs_review'
    : targetWeekStartDate === currentWeekStart
      ? 'ongoing'
      : 'planning';
}

export function findScheduledSessionForDrawResult({
  scheduledSessions,
  pairId,
  drawSessionId,
  activityId,
  targetWeekStartDate,
}: {
  scheduledSessions: ScheduledSession[];
  pairId: string;
  drawSessionId: string;
  activityId: string;
  targetWeekStartDate: string;
}) {
  return scheduledSessions.find(
    (session) =>
      session.pair_id === pairId &&
      session.draw_session_id === drawSessionId &&
      session.activity_id === activityId &&
      session.target_week_start_date === targetWeekStartDate,
  );
}

export function upsertAcceptedDrawScheduledSession({
  activity,
  currentWeekStart,
  drawSessionId,
  pairId,
  scheduledSessions,
  targetWeekStartDate,
  now = new Date(),
}: {
  activity: Activity;
  currentWeekStart: string;
  drawSessionId: string;
  pairId: string;
  scheduledSessions: ScheduledSession[];
  targetWeekStartDate: string;
  now?: Date;
}): { scheduledSessions: ScheduledSession[]; session: ScheduledSession } {
  const existing = findScheduledSessionForDrawResult({
    scheduledSessions,
    pairId,
    drawSessionId,
    activityId: activity.id,
    targetWeekStartDate,
  });
  const session =
    existing ??
    createScheduledSession(
      activity,
      drawSessionId,
      pairId,
      targetWeekStartDate,
      currentWeekStart,
      now,
    );
  let seenResult = false;
  const dedupedSessions = scheduledSessions.filter((candidate) => {
    const sameAcceptedDrawResult =
      candidate.pair_id === pairId &&
      candidate.draw_session_id === drawSessionId &&
      candidate.activity_id === activity.id &&
      candidate.target_week_start_date === targetWeekStartDate;

    if (!sameAcceptedDrawResult) {
      return true;
    }

    if (candidate.id === session.id || !seenResult) {
      seenResult = true;
      return candidate.id === session.id;
    }

    return false;
  });

  return {
    session,
    scheduledSessions: existing ? dedupedSessions : [...dedupedSessions, session],
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
