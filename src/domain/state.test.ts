import { describe, expect, it } from 'vitest';
import type { Activity, ScheduledSession, SessionOutcome } from '../types';
import {
  classifySessions,
  createOutcome,
  createScheduledSession,
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
});
