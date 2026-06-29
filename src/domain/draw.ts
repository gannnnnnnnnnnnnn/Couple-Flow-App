import type {
  Activity,
  BudgetFilter,
  ScheduledSession,
  SessionOutcome,
  WeeklyActivityBan,
} from '../types';
import { getPreviousWeekStartDate } from './week';

export interface EligibleActivityInput {
  activities: Activity[];
  budgetGroupId: BudgetFilter;
  targetWeekStartDate: string;
  drawSessionId: string;
  bans: WeeklyActivityBan[];
  scheduledSessions: ScheduledSession[];
  outcomes: SessionOutcome[];
}

export function getBannedActivityIdsForDraw(
  drawSessionId: string,
  bans: WeeklyActivityBan[],
) {
  return new Set(
    bans
      .filter((ban) => ban.draw_session_id === drawSessionId)
      .map((ban) => ban.activity_id),
  );
}

export function getPreviousWeekOutcomeActivityIds(
  targetWeekStartDate: string,
  scheduledSessions: ScheduledSession[],
  outcomes: SessionOutcome[],
) {
  const previousWeekStart = getPreviousWeekStartDate(targetWeekStartDate);
  const completedOrMissedSessionIds = new Set(
    outcomes
      .filter(
        (outcome) =>
          outcome.outcome_type === 'completed' || outcome.outcome_type === 'not_done',
      )
      .map((outcome) => outcome.scheduled_session_id),
  );

  return new Set(
    scheduledSessions
      .filter(
        (session) =>
          session.target_week_start_date === previousWeekStart &&
          completedOrMissedSessionIds.has(session.id),
      )
      .map((session) => session.activity_id),
  );
}

export function getEligibleActivities({
  activities,
  budgetGroupId,
  targetWeekStartDate,
  drawSessionId,
  bans,
  scheduledSessions,
  outcomes,
}: EligibleActivityInput) {
  const bannedActivityIds = getBannedActivityIdsForDraw(drawSessionId, bans);
  const scheduledForTargetWeek = new Set(
    scheduledSessions
      .filter((session) => session.target_week_start_date === targetWeekStartDate)
      .map((session) => session.activity_id),
  );
  const previousWeekOutcomeActivityIds = getPreviousWeekOutcomeActivityIds(
    targetWeekStartDate,
    scheduledSessions,
    outcomes,
  );

  return activities.filter((activity) => {
    const matchesBudget =
      budgetGroupId === 'all' || activity.budget_group_id === budgetGroupId;

    return (
      activity.status === 'active' &&
      matchesBudget &&
      !bannedActivityIds.has(activity.id) &&
      !scheduledForTargetWeek.has(activity.id) &&
      !previousWeekOutcomeActivityIds.has(activity.id)
    );
  });
}

function seededRandom(seed: number) {
  let value = seed % 2147483647;
  if (value <= 0) {
    value += 2147483646;
  }

  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

export function drawActivities(eligibleActivities: Activity[], count = 3, seed = Date.now()) {
  const random = seededRandom(seed);
  const shuffled = [...eligibleActivities];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled.slice(0, Math.min(count, shuffled.length));
}
