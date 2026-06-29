import { useMemo, useState } from 'react';
import { AppShell } from './components/AppShell';
import { DrawScreen } from './components/DrawScreen';
import { HistoryScreen } from './components/HistoryScreen';
import { PoolScreen } from './components/PoolScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { WeekBoard } from './components/WeekBoard';
import type { Screen } from './components/common';
import {
  classifySessions,
  createOutcome,
  createScheduledSession,
  getFollowUpTargetWeek,
  getOutcomeBySessionId,
} from './domain/state';
import { getNextWeekStartDate, getWeekStartDate } from './domain/week';
import {
  activities as mockActivities,
  budgetGroups,
  members,
  pair,
  scheduledSessions as mockScheduledSessions,
  sessionOutcomes,
  weeklyActivityBans,
} from './mockData';
import type {
  Activity,
  BudgetFilter,
  Rating,
  ScheduledSession,
  SessionOutcome,
  WeeklyActivityBan,
} from './types';

function App() {
  const [activeScreen, setActiveScreen] = useState<Screen>('board');
  const [activities, setActivities] = useState<Activity[]>(mockActivities);
  const [scheduledSessions, setScheduledSessions] = useState<ScheduledSession[]>(
    mockScheduledSessions,
  );
  const [outcomes, setOutcomes] = useState<SessionOutcome[]>(sessionOutcomes);
  const [bans, setBans] = useState<WeeklyActivityBan[]>(weeklyActivityBans);
  const [targetWeekStart, setTargetWeekStart] = useState('');
  const [budgetFilter, setBudgetFilter] = useState<BudgetFilter>('all');
  const [drawResults, setDrawResults] = useState<Activity[]>([]);

  const currentWeekStart = useMemo(
    () => getWeekStartDate(new Date(), pair.timezone),
    [],
  );
  const nextWeekStart = useMemo(
    () => getNextWeekStartDate(currentWeekStart),
    [currentWeekStart],
  );
  const selectedTargetWeek = targetWeekStart || nextWeekStart;

  const activityById = useMemo(
    () => new Map(activities.map((activity) => [activity.id, activity])),
    [activities],
  );
  const budgetById = useMemo(
    () => new Map(budgetGroups.map((budget) => [budget.id, budget])),
    [],
  );
  const outcomeBySessionId = useMemo(() => getOutcomeBySessionId(outcomes), [outcomes]);
  const { needsReviewSessions, ongoingSessions, planningSessions, historySessions } = useMemo(
    () => classifySessions(scheduledSessions, outcomes, currentWeekStart),
    [currentWeekStart, outcomes, scheduledSessions],
  );

  function changeTargetWeek(weekStart: string) {
    setTargetWeekStart(weekStart);
    setDrawResults([]);
  }

  function changeBudget(filter: BudgetFilter) {
    setBudgetFilter(filter);
    setDrawResults([]);
  }

  function toggleBan(memberId: string, activityId: string) {
    const drawSessionId = `draw-${selectedTargetWeek}`;

    setBans((currentBans) => {
      const existing = currentBans.find(
        (ban) =>
          ban.draw_session_id === drawSessionId &&
          ban.member_id === memberId &&
          ban.activity_id === activityId,
      );

      if (existing) {
        return currentBans.filter((ban) => ban.id !== existing.id);
      }

      const memberBanCount = currentBans.filter(
        (ban) => ban.draw_session_id === drawSessionId && ban.member_id === memberId,
      ).length;

      if (memberBanCount >= 2) {
        return currentBans;
      }

      return [
        ...currentBans,
        {
          id: `ban-${drawSessionId}-${memberId}-${activityId}`,
          pair_id: pair.id,
          draw_session_id: drawSessionId,
          member_id: memberId,
          activity_id: activityId,
          created_at: new Date().toISOString(),
        },
      ];
    });
    setDrawResults([]);
  }

  function acceptDraw(activity: Activity) {
    const session = createScheduledSession(
      activity,
      `draw-${selectedTargetWeek}`,
      pair.id,
      selectedTargetWeek,
      currentWeekStart,
    );

    setScheduledSessions((sessions) => [...sessions, session]);
    setDrawResults([]);
    setActiveScreen('board');
  }

  function completeSession(session: ScheduledSession, rating: Rating) {
    setOutcomes((currentOutcomes) => [
      ...currentOutcomes,
      createOutcome(session, 'completed', { rating }),
    ]);
  }

  function missSession(session: ScheduledSession, reason: string) {
    setOutcomes((currentOutcomes) => [
      ...currentOutcomes,
      createOutcome(session, 'not_done', { reason }),
    ]);
  }

  function replaceSession(session: ScheduledSession, replacementActivityId: string) {
    const replacement = activityById.get(replacementActivityId);
    if (!replacement) {
      return;
    }

    setOutcomes((currentOutcomes) => [
      ...currentOutcomes,
      createOutcome(session, 'replaced', {
        replacementActivityId,
        agreedByMemberIds: members.map((member) => member.id),
      }),
    ]);
    const followUpTargetWeek = getFollowUpTargetWeek(session, currentWeekStart);

    setScheduledSessions((sessions) => [
      ...sessions,
      createScheduledSession(
        replacement,
        `manual-replace-${session.id}`,
        pair.id,
        followUpTargetWeek,
        currentWeekStart,
      ),
    ]);
  }

  function redrawSession(session: ScheduledSession) {
    const followUpTargetWeek = getFollowUpTargetWeek(session, currentWeekStart);

    setOutcomes((currentOutcomes) => [
      ...currentOutcomes,
      createOutcome(session, 'redrawn', {
        agreedByMemberIds: members.map((member) => member.id),
      }),
    ]);
    setTargetWeekStart(followUpTargetWeek);
    setDrawResults([]);
    setActiveScreen('draw');
  }

  function addActivity(activity: Activity) {
    setActivities((currentActivities) => [...currentActivities, activity]);
  }

  function toggleActivityStatus(activityId: string) {
    setActivities((currentActivities) =>
      currentActivities.map((activity) =>
        activity.id === activityId
          ? { ...activity, status: activity.status === 'active' ? 'paused' : 'active' }
          : activity,
      ),
    );
  }

  return (
    <AppShell activeScreen={activeScreen} onNavigate={setActiveScreen}>
      {activeScreen === 'board' && (
        <WeekBoard
          activityById={activityById}
          activities={activities}
          budgetById={budgetById}
          currentWeekStart={currentWeekStart}
          members={members}
          needsReviewSessions={needsReviewSessions}
          ongoingSessions={ongoingSessions}
          planningSessions={planningSessions}
          onComplete={completeSession}
          onNotDone={missSession}
          onReplace={replaceSession}
          onRedraw={redrawSession}
          onNavigate={setActiveScreen}
        />
      )}
      {activeScreen === 'draw' && (
        <DrawScreen
          activities={activities}
          budgetGroups={budgetGroups}
          budgetById={budgetById}
          currentWeekStart={currentWeekStart}
          nextWeekStart={nextWeekStart}
          members={members}
          scheduledSessions={scheduledSessions}
          outcomes={outcomes}
          bans={bans}
          targetWeekStart={selectedTargetWeek}
          budgetFilter={budgetFilter}
          drawResults={drawResults}
          onTargetWeekChange={changeTargetWeek}
          onBudgetChange={changeBudget}
          onToggleBan={toggleBan}
          onDraw={setDrawResults}
          onAccept={acceptDraw}
        />
      )}
      {activeScreen === 'pool' && (
        <PoolScreen
          activities={activities}
          budgetGroups={budgetGroups}
          budgetById={budgetById}
          onAddActivity={addActivity}
          onToggleStatus={toggleActivityStatus}
        />
      )}
      {activeScreen === 'history' && (
        <HistoryScreen
          activityById={activityById}
          historySessions={historySessions}
          outcomeBySessionId={outcomeBySessionId}
        />
      )}
      {activeScreen === 'settings' && (
        <SettingsScreen
          currentWeekStart={currentWeekStart}
          ongoingCount={ongoingSessions.length}
          planningCount={planningSessions.length}
          needsReviewCount={needsReviewSessions.length}
        />
      )}
    </AppShell>
  );
}

export default App;
