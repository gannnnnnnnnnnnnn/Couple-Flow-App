import { useEffect, useMemo, useState } from 'react';
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
  createDemoLocalAppData,
  loadLocalAppData,
  type LocalStateLoadResult,
  type LocalStateSource,
  type LocalAppData,
  type PairIdentity,
} from './domain/localPersistence';
import {
  createAppRepository,
  type RepositoryMode,
  type RepositorySnapshot,
} from './repositories/appRepository';
import {
  budgetGroups,
  members,
  pair,
} from './mockData';
import type {
  Activity,
  BudgetFilter,
  BudgetGroup,
  Pair,
  PairMember,
  Rating,
  ScheduledSession,
  SessionOutcome,
  WeeklyActivityBan,
} from './types';

function getInitialLocalState(): LocalStateLoadResult {
  return loadLocalAppData();
}

function App() {
  const repository = useMemo(() => createAppRepository(), []);
  const initialLocalState = useMemo(() => getInitialLocalState(), []);
  const [activeScreen, setActiveScreen] = useState<Screen>('board');
  const [activePair, setActivePair] = useState<Pair>(pair);
  const [activeMembers, setActiveMembers] = useState<PairMember[]>(members);
  const [activeBudgetGroups, setActiveBudgetGroups] = useState<BudgetGroup[]>(budgetGroups);
  const [activities, setActivities] = useState<Activity[]>(
    initialLocalState.data.activities,
  );
  const [scheduledSessions, setScheduledSessions] = useState<ScheduledSession[]>(
    initialLocalState.data.scheduledSessions,
  );
  const [outcomes, setOutcomes] = useState<SessionOutcome[]>(
    initialLocalState.data.outcomes,
  );
  const [bans, setBans] = useState<WeeklyActivityBan[]>(
    initialLocalState.data.weeklyActivityBans,
  );
  const [targetWeekStart, setTargetWeekStart] = useState(
    initialLocalState.data.targetWeekStart,
  );
  const [budgetFilter, setBudgetFilter] = useState<BudgetFilter>(
    initialLocalState.data.budgetFilter,
  );
  const [drawResults, setDrawResults] = useState<Activity[]>([]);
  const [storageSource, setStorageSource] = useState<LocalStateSource>(
    initialLocalState.source,
  );
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(
    initialLocalState.savedAt,
  );
  const [pairIdentity, setPairIdentity] = useState<PairIdentity | null>(null);
  const [repositoryMode, setRepositoryMode] = useState<RepositoryMode>(repository.mode);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [hydrating, setHydrating] = useState(true);

  const currentWeekStart = useMemo(
    () => getWeekStartDate(new Date(), activePair.timezone),
    [activePair.timezone],
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
    () => new Map(activeBudgetGroups.map((budget) => [budget.id, budget])),
    [activeBudgetGroups],
  );
  const outcomeBySessionId = useMemo(() => getOutcomeBySessionId(outcomes), [outcomes]);
  const { needsReviewSessions, ongoingSessions, planningSessions, historySessions } = useMemo(
    () => classifySessions(scheduledSessions, outcomes, currentWeekStart),
    [currentWeekStart, outcomes, scheduledSessions],
  );

  const activePairId = pairIdentity?.pairId ?? activePair.id;
  const activeMemberId = pairIdentity?.memberId ?? activeMembers[0]?.id ?? 'member-local';

  function applySnapshot(snapshot: RepositorySnapshot) {
    setActivities(snapshot.data.activities);
    setScheduledSessions(snapshot.data.scheduledSessions);
    setOutcomes(snapshot.data.outcomes);
    setBans(snapshot.data.weeklyActivityBans);
    setTargetWeekStart(snapshot.data.targetWeekStart);
    setBudgetFilter(snapshot.data.budgetFilter);
    setStorageSource(snapshot.source);
    setLastSavedAt(snapshot.savedAt);
    setActivePair(snapshot.pair);
    setActiveMembers(snapshot.members);
    setActiveBudgetGroups(snapshot.budgetGroups);
    setPairIdentity(snapshot.identity);
    setRepositoryMode(snapshot.mode);
  }

  function getCurrentAppData(): LocalAppData {
    return {
      activities,
      scheduledSessions,
      outcomes,
      weeklyActivityBans: bans,
      targetWeekStart,
      budgetFilter,
    };
  }

  useEffect(() => {
    let cancelled = false;
    setHydrating(true);

    repository
      .loadSnapshot()
      .then((snapshot) => {
        if (!cancelled) {
          applySnapshot(snapshot);
          setHydrating(false);
        }
      })
      .catch((error: Error) => {
        if (!cancelled) {
          setSyncError(error.message);
          setHydrating(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [repository]);

  useEffect(() => {
    if (hydrating) {
      return;
    }

    const snapshotData = getCurrentAppData();

    repository
      .saveSnapshot(snapshotData, pairIdentity)
      .then(({ savedAt, mode }) => {
        if (savedAt) {
          setLastSavedAt(savedAt);
          setStorageSource('saved');
        }
        setRepositoryMode(mode);
      })
      .catch((error: Error) => setSyncError(error.message));
  }, [
    activities,
    bans,
    budgetFilter,
    hydrating,
    outcomes,
    pairIdentity,
    repository,
    scheduledSessions,
    targetWeekStart,
  ]);

  useEffect(() => {
    if (!pairIdentity || repository.mode !== 'supabase') {
      return undefined;
    }

    return repository.subscribeToPair(pairIdentity, applySnapshot);
  }, [pairIdentity, repository]);

  function replaceLocalState(data = createDemoLocalAppData()) {
    setActivities(data.activities);
    setScheduledSessions(data.scheduledSessions);
    setOutcomes(data.outcomes);
    setBans(data.weeklyActivityBans);
    setTargetWeekStart(data.targetWeekStart);
    setBudgetFilter(data.budgetFilter);
    setDrawResults([]);
    setActiveScreen('board');
    setStorageSource('demo');
  }

  function resetToDemoData() {
    const confirmed = window.confirm(
      'Reset this phone to the demo Couple Flow data? Your local changes will be replaced.',
    );

    if (!confirmed) {
      return;
    }

    replaceLocalState();
  }

  async function createPairCode(displayName: string) {
    setSyncing(true);
    setHydrating(true);
    setSyncError(null);
    try {
      const snapshot = await repository.createPairFromLocal(
        displayName,
        getCurrentAppData(),
      );
      applySnapshot(snapshot);
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : 'Could not create pair code.');
    } finally {
      setHydrating(false);
      setSyncing(false);
    }
  }

  async function joinPairCode(pairCode: string, displayName: string) {
    setSyncing(true);
    setHydrating(true);
    setSyncError(null);
    try {
      const snapshot = await repository.joinPairAndLoad(pairCode, displayName);
      applySnapshot(snapshot);
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : 'Could not join pair code.');
    } finally {
      setHydrating(false);
      setSyncing(false);
    }
  }

  function clearLocalUserData() {
    const confirmed = window.confirm(
      'Clear local user data on this phone? The demo seed will load again so the app stays usable.',
    );

    if (!confirmed) {
      return;
    }

    repository.clearLocalData();
    setPairIdentity(null);
    setLastSavedAt(null);
    replaceLocalState();
  }

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
          pair_id: activePairId,
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
      activePairId,
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
        agreedByMemberIds: activeMembers.map((member) => member.id),
      }),
    ]);
    const followUpTargetWeek = getFollowUpTargetWeek(session, currentWeekStart);

    setScheduledSessions((sessions) => [
      ...sessions,
      createScheduledSession(
        replacement,
        `manual-replace-${session.id}`,
        activePairId,
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
        agreedByMemberIds: activeMembers.map((member) => member.id),
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
    <AppShell
      activeScreen={activeScreen}
      members={activeMembers}
      onNavigate={setActiveScreen}
      pair={activePair}
    >
      {activeScreen === 'board' && (
        <WeekBoard
          activityById={activityById}
          activities={activities}
          budgetById={budgetById}
          currentWeekStart={currentWeekStart}
          members={activeMembers}
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
          budgetGroups={activeBudgetGroups}
          budgetById={budgetById}
          currentWeekStart={currentWeekStart}
          nextWeekStart={nextWeekStart}
          members={activeMembers}
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
          budgetGroups={activeBudgetGroups}
          budgetById={budgetById}
          currentMemberId={activeMemberId}
          pairId={activePairId}
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
          pair={activePair}
          currentWeekStart={currentWeekStart}
          ongoingCount={ongoingSessions.length}
          planningCount={planningSessions.length}
          needsReviewCount={needsReviewSessions.length}
          syncStatus={{
            error: syncError,
            hasRemoteEnv: repository.hasRemoteEnv,
            identity: pairIdentity,
            mode: repositoryMode,
            syncing,
          }}
          storageStatus={{
            canPersist: initialLocalState.canPersist,
            source: storageSource,
            savedAt: lastSavedAt,
          }}
          onCreatePair={createPairCode}
          onClearLocalData={clearLocalUserData}
          onJoinPair={joinPairCode}
          onResetDemoData={resetToDemoData}
        />
      )}
    </AppShell>
  );
}

export default App;
