import { describe, expect, it } from 'vitest';
import type { Activity, ScheduledSession, SessionOutcome, WeeklyActivityBan } from '../types';
import { drawActivities, drawOneActivity, getEligibleActivities } from './draw';

const baseActivities: Activity[] = [
  {
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
  },
  {
    id: 'arcade',
    pair_id: 'pair',
    title: 'Arcade',
    note: '',
    budget_group_id: 'treat',
    duration_minutes: 90,
    tags: [],
    created_by_member_id: 'b',
    status: 'active',
    created_at: '',
  },
  {
    id: 'spa',
    pair_id: 'pair',
    title: 'Spa',
    note: '',
    budget_group_id: 'splurge',
    duration_minutes: 120,
    tags: [],
    created_by_member_id: 'a',
    status: 'paused',
    created_at: '',
  },
];

function scheduledSession(
  id: string,
  activityId: string,
  targetWeekStartDate: string,
): ScheduledSession {
  return {
    id,
    pair_id: 'pair',
    activity_id: activityId,
    draw_session_id: null,
    target_week_start_date: targetWeekStartDate,
    status: 'completed',
    todo_text: '',
    created_at: '',
  };
}

describe('draw eligibility', () => {
  it('draws exactly one activity', () => {
    const results = drawActivities(baseActivities, undefined, 42);
    const result = drawOneActivity(baseActivities, 42);

    expect(results).toHaveLength(1);
    expect(result).toEqual(expect.objectContaining({ id: expect.any(String) }));
  });

  it('excludes activities banned by either member for the draw session', () => {
    const bans: WeeklyActivityBan[] = [
      {
        id: 'ban-1',
        pair_id: 'pair',
        draw_session_id: 'draw-1',
        member_id: 'a',
        activity_id: 'ramen',
        created_at: '',
      },
    ];

    expect(
      getEligibleActivities({
        activities: baseActivities,
        budgetGroupId: 'all',
        targetWeekStartDate: '2026-06-29',
        drawSessionId: 'draw-1',
        bans,
        scheduledSessions: [],
        outcomes: [],
      }).map((activity) => activity.id),
    ).toEqual(['arcade']);
  });

  it('excludes activities completed or not_done in the previous week', () => {
    const scheduledSessions = [scheduledSession('session-1', 'ramen', '2026-06-22')];
    const outcomes: SessionOutcome[] = [
      {
        id: 'outcome-1',
        scheduled_session_id: 'session-1',
        outcome_type: 'completed',
        rating: '夯',
        reason: null,
        replacement_activity_id: null,
        agreed_by_member_ids: [],
        created_at: '',
      },
    ];

    expect(
      getEligibleActivities({
        activities: baseActivities,
        budgetGroupId: 'all',
        targetWeekStartDate: '2026-06-29',
        drawSessionId: 'draw-1',
        bans: [],
        scheduledSessions,
        outcomes,
      }).map((activity) => activity.id),
    ).toEqual(['arcade']);
  });
});
