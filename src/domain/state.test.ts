import { describe, expect, it } from 'vitest';
import type { Activity, ScheduledSession, SessionOutcome } from '../types';
import {
  agreeToPendingPlanAction,
  applyCompletedPlanAction,
  classifySessions,
  createCancelPlanAction,
  createMoveWeekPlanAction,
  createOutcome,
  createRedrawPlanAction,
  createReplacementPlanAction,
  createScheduledSession,
  deleteOrPauseActivity,
  getFollowUpTargetWeek,
  getPlanActionItems,
  rejectPendingPlanAction,
  requestPendingPlanAction,
  isActivityReferenced,
  isHistoryEligible,
  upsertAcceptedDrawScheduledSession,
} from './state';

const activity: Activity = {
  id: 'ramen',
  pair_id: 'pair',
  title: 'Ramen',
  note: '',
  budget_group_id: 'tiny',
  duration_minutes: 60,
  tags: [],
  created_by_member_id: 'a',
  status: 'active',
  created_at: '',
};

const secondActivity: Activity = {
  ...activity,
  id: 'arcade',
  title: 'Arcade',
};

const noPendingPlanAction = {
  pending_action_type: null,
  pending_requested_by_member_id: null,
  pending_agreed_by_member_ids: [],
  pending_target_week_start_date: null,
  pending_replacement_activity_id: null,
  pending_reason: null,
} satisfies Pick<
  ScheduledSession,
  | 'pending_action_type'
  | 'pending_requested_by_member_id'
  | 'pending_agreed_by_member_ids'
  | 'pending_target_week_start_date'
  | 'pending_replacement_activity_id'
  | 'pending_reason'
>;

describe('state transitions', () => {
  it('accepted draw creates a scheduled session but not history', () => {
    const session = createScheduledSession(
      activity,
      'draw-1',
      'pair',
      '2026-07-06',
      '2026-06-29',
    );

    expect(session.target_week_start_date).toBe('2026-07-06');
    expect(session.status).toBe('planning');
    expect(isHistoryEligible(session, [])).toBe(false);
  });

  it('accept agreement creates a scheduled session exactly once', () => {
    const first = upsertAcceptedDrawScheduledSession({
      activity,
      currentWeekStart: '2026-06-29',
      drawSessionId: 'draw-1',
      pairId: 'pair',
      scheduledSessions: [],
      targetWeekStartDate: '2026-07-06',
      now: new Date('2026-07-01T00:00:00.000Z'),
    });
    const second = upsertAcceptedDrawScheduledSession({
      activity,
      currentWeekStart: '2026-06-29',
      drawSessionId: 'draw-1',
      pairId: 'pair',
      scheduledSessions: first.scheduledSessions,
      targetWeekStartDate: '2026-07-06',
      now: new Date('2026-07-01T00:00:01.000Z'),
    });

    expect(first.scheduledSessions).toHaveLength(1);
    expect(second.scheduledSessions).toHaveLength(1);
    expect(second.session.id).toBe(first.session.id);
  });

  it('reuses an existing scheduled session for the same accepted draw result', () => {
    const existing = createScheduledSession(
      activity,
      'draw-1',
      'pair',
      '2026-07-06',
      '2026-06-29',
      new Date('2026-07-01T00:00:00.000Z'),
    );
    const result = upsertAcceptedDrawScheduledSession({
      activity,
      currentWeekStart: '2026-06-29',
      drawSessionId: 'draw-1',
      pairId: 'pair',
      scheduledSessions: [existing],
      targetWeekStartDate: '2026-07-06',
      now: new Date('2026-07-01T00:00:01.000Z'),
    });

    expect(result.session).toEqual(existing);
    expect(result.scheduledSessions).toEqual([existing]);
  });

  it('deduplicates repeated scheduled sessions for one accepted draw result', () => {
    const first = createScheduledSession(
      activity,
      'draw-1',
      'pair',
      '2026-07-06',
      '2026-06-29',
      new Date('2026-07-01T00:00:00.000Z'),
    );
    const duplicate = {
      ...first,
      id: 'session-duplicate',
      created_at: '2026-07-01T00:00:01.000Z',
    };
    const result = upsertAcceptedDrawScheduledSession({
      activity,
      currentWeekStart: '2026-06-29',
      drawSessionId: 'draw-1',
      pairId: 'pair',
      scheduledSessions: [first, duplicate],
      targetWeekStartDate: '2026-07-06',
    });

    expect(result.scheduledSessions).toEqual([first]);
  });

  it('allows the same target week to accept two different draw-created activities', () => {
    const first = upsertAcceptedDrawScheduledSession({
      activity,
      currentWeekStart: '2026-06-29',
      drawSessionId: 'draw-1',
      pairId: 'pair',
      scheduledSessions: [],
      targetWeekStartDate: '2026-07-06',
      now: new Date('2026-07-01T00:00:00.000Z'),
    });
    const second = upsertAcceptedDrawScheduledSession({
      activity: secondActivity,
      currentWeekStart: '2026-06-29',
      drawSessionId: 'draw-1',
      pairId: 'pair',
      scheduledSessions: first.scheduledSessions,
      targetWeekStartDate: '2026-07-06',
      now: new Date('2026-07-01T00:01:00.000Z'),
    });

    expect(second.scheduledSessions.map((session) => session.activity_id)).toEqual([
      'ramen',
      'arcade',
    ]);
  });

  it('classifies future accepted sessions as planning', () => {
    const futureSession = createScheduledSession(
      activity,
      'draw-1',
      'pair',
      '2026-07-06',
      '2026-06-29',
    );

    const classified = classifySessions([futureSession], [], '2026-06-29');

    expect(classified.planningSessions).toEqual([futureSession]);
    expect(classified.ongoingSessions).toEqual([]);
    expect(classified.needsReviewSessions).toEqual([]);
    expect(classified.historySessions).toEqual([]);
  });

  it('classifies current-week accepted sessions as ongoing', () => {
    const currentSession = createScheduledSession(
      activity,
      'draw-1',
      'pair',
      '2026-06-29',
      '2026-06-29',
    );

    const classified = classifySessions([currentSession], [], '2026-06-29');

    expect(classified.ongoingSessions).toEqual([currentSession]);
    expect(classified.planningSessions).toEqual([]);
    expect(classified.needsReviewSessions).toEqual([]);
    expect(classified.historySessions).toEqual([]);
  });

  it('classifies past accepted sessions without outcomes as needs review', () => {
    const pastSession = createScheduledSession(
      activity,
      'draw-1',
      'pair',
      '2026-06-22',
      '2026-06-29',
    );

    const classified = classifySessions([pastSession], [], '2026-06-29');

    expect(classified.needsReviewSessions).toEqual([pastSession]);
    expect(classified.ongoingSessions).toEqual([]);
    expect(classified.planningSessions).toEqual([]);
    expect(classified.historySessions).toEqual([]);
  });

  it('outcome makes a scheduled session history eligible', () => {
    const session: ScheduledSession = {
      id: 'session-1',
      pair_id: 'pair',
      activity_id: 'ramen',
      draw_session_id: 'draw-1',
      target_week_start_date: '2026-06-29',
      status: 'ongoing',
      todo_text: '',
      ...noPendingPlanAction,
      created_at: '',
    };
    const outcome: SessionOutcome = createOutcome(session, 'completed', { rating: '顶级' });

    expect(isHistoryEligible(session, [outcome])).toBe(true);
  });

  it('keeps past open sessions in needs review', () => {
    const pastOpenSession: ScheduledSession = {
      id: 'session-overdue',
      pair_id: 'pair',
      activity_id: 'ramen',
      draw_session_id: 'draw-1',
      target_week_start_date: '2026-06-22',
      status: 'ongoing',
      todo_text: '',
      ...noPendingPlanAction,
      created_at: '',
    };

    const classified = classifySessions([pastOpenSession], [], '2026-06-29');

    expect(classified.needsReviewSessions).toEqual([pastOpenSession]);
    expect(classified.ongoingSessions).toEqual([]);
    expect(classified.planningSessions).toEqual([]);
    expect(classified.historySessions).toEqual([]);
  });

  it('keeps past sessions with outcomes in history', () => {
    const pastSession: ScheduledSession = {
      id: 'session-past-done',
      pair_id: 'pair',
      activity_id: 'ramen',
      draw_session_id: 'draw-1',
      target_week_start_date: '2026-06-22',
      status: 'completed',
      todo_text: '',
      ...noPendingPlanAction,
      created_at: '',
    };
    const outcome: SessionOutcome = createOutcome(pastSession, 'completed', {
      rating: '夯',
    });

    const classified = classifySessions([pastSession], [outcome], '2026-06-29');

    expect(classified.needsReviewSessions).toEqual([]);
    expect(classified.historySessions).toEqual([pastSession]);
  });

  it('reschedules follow-up work for overdue sessions to the current week', () => {
    const overdueSession: ScheduledSession = {
      id: 'session-overdue',
      pair_id: 'pair',
      activity_id: 'ramen',
      draw_session_id: 'draw-1',
      target_week_start_date: '2026-06-22',
      status: 'needs_review',
      todo_text: '',
      ...noPendingPlanAction,
      created_at: '',
    };

    expect(getFollowUpTargetWeek(overdueSession, '2026-06-29')).toBe('2026-06-29');
  });

  it('keeps follow-up work for ongoing sessions in the current week', () => {
    const ongoingSession: ScheduledSession = {
      id: 'session-current',
      pair_id: 'pair',
      activity_id: 'ramen',
      draw_session_id: 'draw-1',
      target_week_start_date: '2026-06-29',
      status: 'ongoing',
      todo_text: '',
      ...noPendingPlanAction,
      created_at: '',
    };

    expect(getFollowUpTargetWeek(ongoingSession, '2026-06-29')).toBe('2026-06-29');
  });

  it('deletes unreferenced activities and removes stale bans for the activity', () => {
    const result = deleteOrPauseActivity({
      activityId: 'ramen',
      activities: [activity],
      scheduledSessions: [],
      outcomes: [],
      weeklyActivityBans: [],
    });

    expect(result.result).toBe('deleted');
    expect(result.activities).toEqual([]);
    expect(result.weeklyActivityBans).toEqual([]);
  });

  it('pauses referenced activities instead of deleting them', () => {
    const session: ScheduledSession = {
      id: 'session-1',
      pair_id: 'pair',
      activity_id: 'ramen',
      draw_session_id: 'draw-1',
      target_week_start_date: '2026-06-29',
      status: 'ongoing',
      todo_text: '',
      ...noPendingPlanAction,
      created_at: '',
    };

    const result = deleteOrPauseActivity({
      activityId: 'ramen',
      activities: [activity],
      scheduledSessions: [session],
      outcomes: [],
      weeklyActivityBans: [],
    });

    expect(result.result).toBe('paused');
    expect(result.activities).toEqual([{ ...activity, status: 'paused' }]);
  });

  it('treats replacement outcomes and activity bans as activity references', () => {
    const outcome: SessionOutcome = {
      id: 'outcome-1',
      scheduled_session_id: 'session-1',
      outcome_type: 'replaced',
      rating: null,
      reason: null,
      replacement_activity_id: 'ramen',
      agreed_by_member_ids: ['a', 'b'],
      created_at: '',
    };
    const ban = {
      id: 'ban-1',
      draw_session_id: 'draw-1',
      pair_id: 'pair',
      member_id: 'a',
      activity_id: 'ramen',
      created_at: '',
    };

    expect(isActivityReferenced('ramen', [], [outcome], [])).toBe(true);
    expect(isActivityReferenced('ramen', [], [], [ban])).toBe(true);
  });

  it('exposes plan detail actions by session state', () => {
    const future = createScheduledSession(
      activity,
      'draw-1',
      'pair',
      '2026-07-06',
      '2026-06-29',
    );
    const current = createScheduledSession(
      activity,
      'draw-2',
      'pair',
      '2026-06-29',
      '2026-06-29',
    );
    const overdue = createScheduledSession(
      activity,
      'draw-3',
      'pair',
      '2026-06-22',
      '2026-06-29',
    );

    expect(getPlanActionItems(future, '2026-06-29').map((action) => action.label)).toEqual([
      '改到本周',
      '改到下周',
      '重新抽',
      '换一个活动',
      '取消计划',
    ]);
    expect(getPlanActionItems(current, '2026-06-29').map((action) => action.label)).toEqual([
      '换一个活动',
      '重新抽',
      '没有做',
      '完成了',
      '取消计划',
    ]);
    expect(getPlanActionItems(overdue, '2026-06-29').map((action) => action.label)).toEqual([
      '完成了',
      '没有做',
      '换一个活动',
      '重新抽',
    ]);
  });

  it('paired plan action request starts pending state and requester cannot finish alone', () => {
    const session = createScheduledSession(
      activity,
      'draw-1',
      'pair',
      '2026-07-06',
      '2026-06-29',
    );
    const requested = requestPendingPlanAction({
      scheduledSessions: [session],
      sessionId: session.id,
      actingMemberId: 'member-a',
      request: { type: 'move_week', targetWeekStartDate: '2026-06-29' },
    });

    expect(requested[0]).toMatchObject({
      pending_action_type: 'move_week',
      pending_requested_by_member_id: 'member-a',
      pending_agreed_by_member_ids: ['member-a'],
      pending_target_week_start_date: '2026-06-29',
    });

    const requesterAgree = agreeToPendingPlanAction({
      scheduledSessions: requested,
      sessionId: session.id,
      actingMemberId: 'member-a',
      requiredMemberIds: ['member-a', 'member-b'],
    });

    expect(requesterAgree.completedAction).toBeNull();
    expect(requesterAgree.scheduledSessions[0].pending_action_type).toBe('move_week');
  });

  it('other member agreement completes the pending action exactly once', () => {
    const session = createScheduledSession(
      activity,
      'draw-1',
      'pair',
      '2026-07-06',
      '2026-06-29',
    );
    const requested = requestPendingPlanAction({
      scheduledSessions: [session],
      sessionId: session.id,
      actingMemberId: 'member-a',
      request: { type: 'move_week', targetWeekStartDate: '2026-06-29' },
    });
    const agreed = agreeToPendingPlanAction({
      scheduledSessions: requested,
      sessionId: session.id,
      actingMemberId: 'member-b',
      requiredMemberIds: ['member-a', 'member-b'],
    });

    expect(agreed.completedAction).toMatchObject({
      type: 'move_week',
      sessionId: session.id,
      agreedByMemberIds: ['member-a', 'member-b'],
      targetWeekStartDate: '2026-06-29',
    });
    expect(agreed.scheduledSessions[0].pending_action_type).toBeNull();

    const applied = applyCompletedPlanAction({
      action: agreed.completedAction!,
      activities: [activity],
      currentWeekStart: '2026-06-29',
      outcomes: [],
      pairId: 'pair',
      scheduledSessions: agreed.scheduledSessions,
    });

    expect(applied.scheduledSessions[0].target_week_start_date).toBe('2026-06-29');
    expect(applied.scheduledSessions[0].status).toBe('ongoing');
    expect(applied.outcomes).toEqual([]);
  });

  it('rejection clears pending state without changing the plan', () => {
    const session = createScheduledSession(
      activity,
      'draw-1',
      'pair',
      '2026-07-06',
      '2026-06-29',
    );
    const requested = requestPendingPlanAction({
      scheduledSessions: [session],
      sessionId: session.id,
      actingMemberId: 'member-a',
      request: { type: 'cancel', reason: '计划取消' },
    });
    const rejected = rejectPendingPlanAction({
      scheduledSessions: requested,
      sessionId: session.id,
    });

    expect(rejected[0]).toMatchObject({
      target_week_start_date: '2026-07-06',
      pending_action_type: null,
      pending_requested_by_member_id: null,
      pending_agreed_by_member_ids: [],
    });
  });

  it('move_week updates target week and board bucket', () => {
    const session = createScheduledSession(
      activity,
      'draw-1',
      'pair',
      '2026-07-06',
      '2026-06-29',
    );
    const result = applyCompletedPlanAction({
      action: createMoveWeekPlanAction(session.id, '2026-06-29'),
      activities: [activity],
      currentWeekStart: '2026-06-29',
      outcomes: [],
      pairId: 'pair',
      scheduledSessions: [session],
    });
    const classified = classifySessions(result.scheduledSessions, result.outcomes, '2026-06-29');

    expect(classified.ongoingSessions).toHaveLength(1);
    expect(classified.planningSessions).toEqual([]);
  });

  it('cancel creates a not_done outcome and removes the session from active buckets', () => {
    const session = createScheduledSession(
      activity,
      'draw-1',
      'pair',
      '2026-07-06',
      '2026-06-29',
    );
    const result = applyCompletedPlanAction({
      action: createCancelPlanAction(session.id),
      activities: [activity],
      currentWeekStart: '2026-06-29',
      outcomes: [],
      pairId: 'pair',
      scheduledSessions: [session],
    });
    const classified = classifySessions(result.scheduledSessions, result.outcomes, '2026-06-29');

    expect(result.outcomes[0]).toMatchObject({
      outcome_type: 'not_done',
      reason: '计划取消',
    });
    expect(classified.planningSessions).toEqual([]);
    expect(classified.historySessions).toHaveLength(1);
  });

  it('does not duplicate a finalized plan-changing outcome if applied again', () => {
    const session = createScheduledSession(
      activity,
      'draw-1',
      'pair',
      '2026-07-06',
      '2026-06-29',
    );
    const first = applyCompletedPlanAction({
      action: createCancelPlanAction(session.id),
      activities: [activity],
      currentWeekStart: '2026-06-29',
      outcomes: [],
      pairId: 'pair',
      scheduledSessions: [session],
    });
    const second = applyCompletedPlanAction({
      action: createCancelPlanAction(session.id),
      activities: [activity],
      currentWeekStart: '2026-06-29',
      outcomes: first.outcomes,
      pairId: 'pair',
      scheduledSessions: first.scheduledSessions,
    });

    expect(second.outcomes).toHaveLength(1);
  });

  it('redraw creates a redrawn outcome and routes to draw for the same target week', () => {
    const session = createScheduledSession(
      activity,
      'draw-1',
      'pair',
      '2026-07-06',
      '2026-06-29',
    );
    const result = applyCompletedPlanAction({
      action: createRedrawPlanAction(session.id),
      activities: [activity],
      currentWeekStart: '2026-06-29',
      outcomes: [],
      pairId: 'pair',
      scheduledSessions: [session],
    });

    expect(result.outcomes[0].outcome_type).toBe('redrawn');
    expect(result.routeToDrawWeek).toBe('2026-07-06');
  });

  it('replace creates a replaced outcome and a new scheduled session', () => {
    const session = createScheduledSession(
      activity,
      'draw-1',
      'pair',
      '2026-06-29',
      '2026-06-29',
      new Date('2026-06-29T00:00:00.000Z'),
    );
    const result = applyCompletedPlanAction({
      action: createReplacementPlanAction(session.id, secondActivity.id),
      activities: [activity, secondActivity],
      currentWeekStart: '2026-06-29',
      outcomes: [],
      pairId: 'pair',
      scheduledSessions: [session],
      now: new Date('2026-06-29T00:01:00.000Z'),
    });

    expect(result.outcomes[0]).toMatchObject({
      outcome_type: 'replaced',
      replacement_activity_id: secondActivity.id,
    });
    expect(result.scheduledSessions).toHaveLength(2);
    expect(result.scheduledSessions[1]).toMatchObject({
      activity_id: secondActivity.id,
      target_week_start_date: '2026-06-29',
      status: 'ongoing',
    });
  });

  it('local unpaired mode can apply a plan-changing action immediately', () => {
    const session = createScheduledSession(
      activity,
      'draw-1',
      'pair',
      '2026-07-06',
      '2026-06-29',
    );
    const result = applyCompletedPlanAction({
      action: createMoveWeekPlanAction(session.id, '2026-06-29'),
      activities: [activity],
      currentWeekStart: '2026-06-29',
      outcomes: [],
      pairId: 'pair',
      scheduledSessions: [session],
    });

    expect(result.scheduledSessions[0].pending_action_type).toBeNull();
    expect(result.scheduledSessions[0].target_week_start_date).toBe('2026-06-29');
  });
});
