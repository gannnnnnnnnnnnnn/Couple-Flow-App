import { describe, expect, it } from 'vitest';
import type { Activity, ScheduledSession, SessionOutcome } from '../types';
import {
  classifySessions,
  createOutcome,
  createScheduledSession,
  deleteOrPauseActivity,
  getFollowUpTargetWeek,
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
});
