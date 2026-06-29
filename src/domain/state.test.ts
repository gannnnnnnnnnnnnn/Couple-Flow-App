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
