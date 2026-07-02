import type {
  Activity,
  OutcomeType,
  PendingPlanAction,
  Rating,
  ScheduledSession,
  SessionOutcome,
  WeeklyActivityBan,
} from '../types';
import { getNextWeekStartDate } from './week';

export type PlanActionId =
  | 'move_current'
  | 'move_next'
  | 'redraw'
  | 'replace'
  | 'cancel'
  | 'not_done'
  | 'complete';

export interface PlanActionItem {
  id: PlanActionId;
  label: string;
  pendingType?: PendingPlanAction;
}

export interface PendingPlanActionRequest {
  type: PendingPlanAction;
  targetWeekStartDate?: string | null;
  replacementActivityId?: string | null;
  reason?: string | null;
}

export interface CompletedPlanAction {
  type: PendingPlanAction;
  sessionId: string;
  requestedByMemberId: string | null;
  agreedByMemberIds: string[];
  targetWeekStartDate: string | null;
  replacementActivityId: string | null;
  reason: string | null;
}

export interface ApplyPlanActionResult {
  scheduledSessions: ScheduledSession[];
  outcomes: SessionOutcome[];
  routeToDrawWeek: string | null;
}

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

export function getPlanStatusLabel(
  session: ScheduledSession,
  outcomes: SessionOutcome[],
  currentWeekStart: string,
) {
  if (outcomes.some((outcome) => outcome.scheduled_session_id === session.id)) {
    return '已归档';
  }

  if (session.target_week_start_date < currentWeekStart) {
    return '待复盘';
  }

  if (session.target_week_start_date === currentWeekStart) {
    return '本周待办';
  }

  return '计划中';
}

export function getPlanActionItems(
  session: ScheduledSession,
  currentWeekStart: string,
): PlanActionItem[] {
  if (session.target_week_start_date > currentWeekStart) {
    return [
      { id: 'move_current', label: '改到本周', pendingType: 'move_week' },
      { id: 'move_next', label: '改到下周', pendingType: 'move_week' },
      { id: 'redraw', label: '重新抽', pendingType: 'redraw' },
      { id: 'replace', label: '换一个活动', pendingType: 'replace' },
      { id: 'cancel', label: '取消计划', pendingType: 'cancel' },
    ];
  }

  if (session.target_week_start_date === currentWeekStart) {
    return [
      { id: 'replace', label: '换一个活动', pendingType: 'replace' },
      { id: 'redraw', label: '重新抽', pendingType: 'redraw' },
      { id: 'not_done', label: '没有做' },
      { id: 'complete', label: '完成了' },
      { id: 'cancel', label: '取消计划', pendingType: 'cancel' },
    ];
  }

  return [
    { id: 'complete', label: '完成了' },
    { id: 'not_done', label: '没有做' },
    { id: 'replace', label: '换一个活动', pendingType: 'replace' },
    { id: 'redraw', label: '重新抽', pendingType: 'redraw' },
  ];
}

export function getPlanActionLabel(action: PendingPlanAction | null) {
  switch (action) {
    case 'move_week':
      return '改这个计划';
    case 'redraw':
      return '重新抽';
    case 'replace':
      return '换一个活动';
    case 'cancel':
      return '取消计划';
    default:
      return '改这个计划';
  }
}

export function getTargetWeekForPlanAction(
  actionId: PlanActionId,
  currentWeekStart: string,
) {
  if (actionId === 'move_current') {
    return currentWeekStart;
  }

  if (actionId === 'move_next') {
    return getNextWeekStartDate(currentWeekStart);
  }

  return null;
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
    pending_action_type: null,
    pending_requested_by_member_id: null,
    pending_agreed_by_member_ids: [],
    pending_target_week_start_date: null,
    pending_replacement_activity_id: null,
    pending_reason: null,
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

export function clearPendingPlanAction(session: ScheduledSession): ScheduledSession {
  return {
    ...session,
    pending_action_type: null,
    pending_requested_by_member_id: null,
    pending_agreed_by_member_ids: [],
    pending_target_week_start_date: null,
    pending_replacement_activity_id: null,
    pending_reason: null,
  };
}

export function requestPendingPlanAction({
  scheduledSessions,
  sessionId,
  actingMemberId,
  request,
}: {
  scheduledSessions: ScheduledSession[];
  sessionId: string;
  actingMemberId: string;
  request: PendingPlanActionRequest;
}) {
  return scheduledSessions.map((session) =>
    session.id === sessionId
      ? {
          ...session,
          pending_action_type: request.type,
          pending_requested_by_member_id: actingMemberId,
          pending_agreed_by_member_ids: [actingMemberId],
          pending_target_week_start_date: request.targetWeekStartDate ?? null,
          pending_replacement_activity_id: request.replacementActivityId ?? null,
          pending_reason: request.reason ?? null,
        }
      : session,
  );
}

export function rejectPendingPlanAction({
  scheduledSessions,
  sessionId,
}: {
  scheduledSessions: ScheduledSession[];
  sessionId: string;
}) {
  return scheduledSessions.map((session) =>
    session.id === sessionId ? clearPendingPlanAction(session) : session,
  );
}

export function agreeToPendingPlanAction({
  scheduledSessions,
  sessionId,
  actingMemberId,
  requiredMemberIds,
}: {
  scheduledSessions: ScheduledSession[];
  sessionId: string;
  actingMemberId: string;
  requiredMemberIds: string[];
}): { scheduledSessions: ScheduledSession[]; completedAction: CompletedPlanAction | null } {
  const session = scheduledSessions.find((candidate) => candidate.id === sessionId);
  if (!session?.pending_action_type || !session.pending_requested_by_member_id) {
    return { scheduledSessions, completedAction: null };
  }

  const agreedByMemberIds = uniqueStrings([
    ...(session.pending_agreed_by_member_ids ?? []),
    actingMemberId,
  ]);
  const completed = requiredMemberIds.every((memberId) =>
    agreedByMemberIds.includes(memberId),
  );
  const completedAction: CompletedPlanAction | null = completed
    ? {
        type: session.pending_action_type,
        sessionId: session.id,
        requestedByMemberId: session.pending_requested_by_member_id,
        agreedByMemberIds,
        targetWeekStartDate: session.pending_target_week_start_date,
        replacementActivityId: session.pending_replacement_activity_id,
        reason: session.pending_reason,
      }
    : null;

  return {
    completedAction,
    scheduledSessions: scheduledSessions.map((candidate) =>
      candidate.id === sessionId
        ? completed
          ? clearPendingPlanAction({
              ...candidate,
              pending_agreed_by_member_ids: agreedByMemberIds,
            })
          : { ...candidate, pending_agreed_by_member_ids: agreedByMemberIds }
        : candidate,
    ),
  };
}

export function createCancelPlanAction(sessionId: string): CompletedPlanAction {
  return {
    type: 'cancel',
    sessionId,
    requestedByMemberId: null,
    agreedByMemberIds: [],
    targetWeekStartDate: null,
    replacementActivityId: null,
    reason: '计划取消',
  };
}

export function createMoveWeekPlanAction(
  sessionId: string,
  targetWeekStartDate: string,
): CompletedPlanAction {
  return {
    type: 'move_week',
    sessionId,
    requestedByMemberId: null,
    agreedByMemberIds: [],
    targetWeekStartDate,
    replacementActivityId: null,
    reason: null,
  };
}

export function createReplacementPlanAction(
  sessionId: string,
  replacementActivityId: string,
): CompletedPlanAction {
  return {
    type: 'replace',
    sessionId,
    requestedByMemberId: null,
    agreedByMemberIds: [],
    targetWeekStartDate: null,
    replacementActivityId,
    reason: null,
  };
}

export function createRedrawPlanAction(sessionId: string): CompletedPlanAction {
  return {
    type: 'redraw',
    sessionId,
    requestedByMemberId: null,
    agreedByMemberIds: [],
    targetWeekStartDate: null,
    replacementActivityId: null,
    reason: null,
  };
}

export function applyCompletedPlanAction({
  action,
  activities,
  currentWeekStart,
  outcomes,
  pairId,
  scheduledSessions,
  now = new Date(),
}: {
  action: CompletedPlanAction;
  activities: Activity[];
  currentWeekStart: string;
  outcomes: SessionOutcome[];
  pairId: string;
  scheduledSessions: ScheduledSession[];
  now?: Date;
}): ApplyPlanActionResult {
  const session = scheduledSessions.find((candidate) => candidate.id === action.sessionId);
  if (!session) {
    return { scheduledSessions, outcomes, routeToDrawWeek: null };
  }

  if (action.type === 'move_week') {
    const targetWeek = action.targetWeekStartDate;
    if (!targetWeek) {
      return { scheduledSessions, outcomes, routeToDrawWeek: null };
    }

    return {
      outcomes,
      routeToDrawWeek: null,
      scheduledSessions: scheduledSessions.map((candidate) =>
        candidate.id === session.id
          ? clearPendingPlanAction({
              ...candidate,
              target_week_start_date: targetWeek,
              status: getScheduledSessionStatus(targetWeek, currentWeekStart),
            })
          : candidate,
      ),
    };
  }

  const alreadyHasOutcome = outcomes.some(
    (outcome) => outcome.scheduled_session_id === session.id,
  );
  if (alreadyHasOutcome) {
    return {
      outcomes,
      routeToDrawWeek: action.type === 'redraw' ? session.target_week_start_date : null,
      scheduledSessions: scheduledSessions.map((candidate) =>
        candidate.id === session.id ? clearPendingPlanAction(candidate) : candidate,
      ),
    };
  }

  if (action.type === 'cancel') {
    const outcome = createOutcome(session, 'not_done', {
      reason: action.reason ?? '计划取消',
      agreedByMemberIds: action.agreedByMemberIds,
    });

    return {
      outcomes: [...outcomes, outcome],
      routeToDrawWeek: null,
      scheduledSessions: markSessionSettled(scheduledSessions, session.id, 'not_done'),
    };
  }

  if (action.type === 'redraw') {
    const outcome = createOutcome(session, 'redrawn', {
      agreedByMemberIds: action.agreedByMemberIds,
    });

    return {
      outcomes: [...outcomes, outcome],
      routeToDrawWeek: session.target_week_start_date,
      scheduledSessions: markSessionSettled(scheduledSessions, session.id, 'redrawn'),
    };
  }

  const replacement = activities.find(
    (activity) => activity.id === action.replacementActivityId,
  );
  if (!replacement) {
    return { scheduledSessions, outcomes, routeToDrawWeek: null };
  }

  const replacementTargetWeek =
    action.targetWeekStartDate ?? getFollowUpTargetWeek(session, currentWeekStart);
  const outcome = createOutcome(session, 'replaced', {
    replacementActivityId: replacement.id,
    agreedByMemberIds: action.agreedByMemberIds,
  });

  return {
    outcomes: [...outcomes, outcome],
    routeToDrawWeek: null,
    scheduledSessions: [
      ...markSessionSettled(scheduledSessions, session.id, 'replaced'),
      createScheduledSession(
        replacement,
        `manual-replace-${session.id}`,
        pairId,
        replacementTargetWeek,
        currentWeekStart,
        now,
      ),
    ],
  };
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
  const now = new Date();
  return {
    id: `outcome-${session.id}-${now.getTime()}`,
    scheduled_session_id: session.id,
    outcome_type: outcomeType,
    rating: options.rating ?? null,
    reason: options.reason ?? null,
    replacement_activity_id: options.replacementActivityId ?? null,
    agreed_by_member_ids: options.agreedByMemberIds ?? [],
    created_at: now.toISOString(),
  };
}

function markSessionSettled(
  scheduledSessions: ScheduledSession[],
  sessionId: string,
  status: ScheduledSession['status'],
) {
  return scheduledSessions.map((session) =>
    session.id === sessionId ? clearPendingPlanAction({ ...session, status }) : session,
  );
}

function uniqueStrings(values: string[]) {
  return [...new Set(values.filter((value) => value.trim().length > 0))];
}
