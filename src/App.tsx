import { useEffect, useMemo, useRef, useState } from 'react';
import { AppShell } from './components/AppShell';
import { DrawScreen } from './components/DrawScreen';
import { HistoryScreen } from './components/HistoryScreen';
import { PoolScreen } from './components/PoolScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { WeekBoard } from './components/WeekBoard';
import type { Screen } from './components/common';
import { parseAppBackupJson, stringifyAppBackup } from './domain/backup';
import {
  AUTOSAVE_DEBOUNCE_MS,
  SYNCING_VISIBILITY_DELAY_MS,
  getLocalAppDataFingerprint,
  shouldSkipAutosaveForSnapshot,
} from './domain/autosave';
import type { ImportDataResult } from './domain/settingsSafety';
import {
  classifySessions,
  createOutcome,
  createScheduledSession,
  deleteOrPauseActivity,
  getFollowUpTargetWeek,
  getOutcomeBySessionId,
  isActivityReferenced,
} from './domain/state';
import { getNextWeekStartDate, getWeekStartDate } from './domain/week';
import {
  createDemoLocalAppData,
  enableDemoSeed,
  loadLocalAppData,
  type LocalStateLoadResult,
  type LocalStateSource,
  type LocalAppData,
  type PairIdentity,
} from './domain/localPersistence';
import {
  getActingMemberId,
  getDrawSessionForWeek,
  getDrawSessionId,
  isPartnerDrawActive,
  mergeRemoteBansForPairedDevice,
  shouldShowDrawStaleNotice,
  toggleWeeklyActivityBan,
  upsertDrawSessionState,
} from './domain/pairedDraw';
import {
  createAppRepository,
  type RemoteDeleteHints,
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
  DrawSession,
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
  const [drawSessions, setDrawSessions] = useState<DrawSession[]>(
    initialLocalState.data.drawSessions,
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
  const lastSavedFingerprintRef = useRef<string | null>(null);
  const remoteSnapshotFingerprintRef = useRef<string | null>(null);
  const saveSequenceRef = useRef(0);
  const pendingRemoteDeletesRef = useRef<Required<RemoteDeleteHints>>({
    activityIds: [],
    weeklyActivityBans: [],
  });
  const latestUiRef = useRef({
    targetWeekStart: '',
    budgetFilter: 'all' as BudgetFilter,
    drawResults: [] as Activity[],
    activities: [] as Activity[],
    drawSessions: [] as DrawSession[],
    scheduledSessions: [] as ScheduledSession[],
    outcomes: [] as SessionOutcome[],
    bans: [] as WeeklyActivityBan[],
  });
  const [drawNotice, setDrawNotice] = useState<string | null>(null);

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
  const referencedActivityIds = useMemo(
    () =>
      new Set(
        activities
          .filter((activity) =>
            isActivityReferenced(activity.id, scheduledSessions, outcomes, bans),
          )
          .map((activity) => activity.id),
      ),
    [activities, bans, outcomes, scheduledSessions],
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
  const activeMemberId = getActingMemberId(pairIdentity, activeMembers);
  const currentDrawSessionId = getDrawSessionId(activePairId, selectedTargetWeek);
  const currentDrawSession = getDrawSessionForWeek(drawSessions, selectedTargetWeek);
  const partnerDrawActive = pairIdentity
    ? isPartnerDrawActive(currentDrawSession, activeMemberId)
    : false;

  latestUiRef.current = {
    targetWeekStart: selectedTargetWeek,
    budgetFilter,
    drawResults,
    activities,
    drawSessions,
    scheduledSessions,
    outcomes,
    bans,
  };

  function applySnapshot(
    snapshot: RepositorySnapshot,
    options: { suppressAutosave?: boolean; preserveDeviceUi?: boolean } = {},
  ) {
    const { suppressAutosave = true, preserveDeviceUi = false } = options;
    const pendingActivityDeleteIds = new Set(
      pendingRemoteDeletesRef.current.activityIds,
    );
    const nextActivities =
      preserveDeviceUi && snapshot.identity
        ? mergeActivitiesForRealtime(
            latestUiRef.current.activities,
            snapshot.data.activities,
            snapshot.identity.memberId,
            pendingActivityDeleteIds,
          )
        : snapshot.data.activities;
    const nextDrawSessions =
      preserveDeviceUi && snapshot.identity
        ? mergeDrawSessionsForRealtime(
            latestUiRef.current.drawSessions,
            snapshot.data.drawSessions,
            snapshot.identity.memberId,
          )
        : snapshot.data.drawSessions;
    const nextScheduledSessions = preserveDeviceUi
      ? mergeLocalRowsById(
          latestUiRef.current.scheduledSessions,
          snapshot.data.scheduledSessions,
        )
      : snapshot.data.scheduledSessions;
    const nextOutcomes = preserveDeviceUi
      ? mergeLocalRowsById(latestUiRef.current.outcomes, snapshot.data.outcomes)
      : snapshot.data.outcomes;
    const nextBans =
      preserveDeviceUi && snapshot.identity
        ? mergeRemoteBansForPairedDevice(
            latestUiRef.current.bans,
            snapshot.data.weeklyActivityBans,
            snapshot.identity.memberId,
          )
        : snapshot.data.weeklyActivityBans;
    const appliedData: LocalAppData = {
      activities: nextActivities,
      drawSessions: nextDrawSessions,
      scheduledSessions: nextScheduledSessions,
      outcomes: nextOutcomes,
      weeklyActivityBans: nextBans,
      targetWeekStart: preserveDeviceUi
        ? latestUiRef.current.targetWeekStart
        : snapshot.data.targetWeekStart,
      budgetFilter: preserveDeviceUi ? latestUiRef.current.budgetFilter : snapshot.data.budgetFilter,
    };
    if (suppressAutosave) {
      const fingerprint = getLocalAppDataFingerprint(appliedData);
      remoteSnapshotFingerprintRef.current = fingerprint;
      lastSavedFingerprintRef.current = fingerprint;
    }
    if (
      preserveDeviceUi &&
      shouldShowDrawStaleNotice({
        localBans: latestUiRef.current.bans,
        remoteBans: snapshot.data.weeklyActivityBans,
        drawSessionId: getDrawSessionId(
          snapshot.identity?.pairId ?? snapshot.pair.id,
          latestUiRef.current.targetWeekStart,
        ),
        drawResults: latestUiRef.current.drawResults,
      })
    ) {
      setDrawNotice('对方刚刚更新了选择，本轮抽签结果可能需要重新抽。');
    }

    setActivities(nextActivities);
    setDrawSessions(nextDrawSessions);
    setScheduledSessions(nextScheduledSessions);
    setOutcomes(nextOutcomes);
    setBans(nextBans);
    if (!preserveDeviceUi) {
      setTargetWeekStart(snapshot.data.targetWeekStart);
      setBudgetFilter(snapshot.data.budgetFilter);
      setDrawResults([]);
      setDrawNotice(null);
    }
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
      drawSessions,
      scheduledSessions,
      outcomes,
      weeklyActivityBans: bans,
      targetWeekStart,
      budgetFilter,
    };
  }

  function getPendingRemoteDeleteHints(): RemoteDeleteHints {
    return {
      activityIds: [...pendingRemoteDeletesRef.current.activityIds],
      weeklyActivityBans: pendingRemoteDeletesRef.current.weeklyActivityBans.map((ban) => ({
        ...ban,
      })),
    };
  }

  function clearPendingRemoteDeleteHints(sentHints: RemoteDeleteHints) {
    const sentActivityIds = new Set(sentHints.activityIds ?? []);
    const sentBanKeys = new Set(
      (sentHints.weeklyActivityBans ?? []).map(
        (ban) => `${ban.drawSessionId}:${ban.memberId}:${ban.activityId}`,
      ),
    );

    pendingRemoteDeletesRef.current.activityIds =
      pendingRemoteDeletesRef.current.activityIds.filter(
        (activityId) => !sentActivityIds.has(activityId),
      );
    pendingRemoteDeletesRef.current.weeklyActivityBans =
      pendingRemoteDeletesRef.current.weeklyActivityBans.filter(
        (ban) => !sentBanKeys.has(`${ban.drawSessionId}:${ban.memberId}:${ban.activityId}`),
      );
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
    const currentFingerprint = getLocalAppDataFingerprint(snapshotData);

    if (
      shouldSkipAutosaveForSnapshot({
        currentFingerprint,
        lastSavedFingerprint: lastSavedFingerprintRef.current,
        remoteFingerprint: remoteSnapshotFingerprintRef.current,
      })
    ) {
      remoteSnapshotFingerprintRef.current = null;
      return;
    }

    const saveId = saveSequenceRef.current + 1;
    saveSequenceRef.current = saveId;
    const deleteHints = getPendingRemoteDeleteHints();
    let syncingTimer: number | undefined;

    const debounceTimer = window.setTimeout(() => {
      syncingTimer = window.setTimeout(() => {
        if (saveSequenceRef.current === saveId) {
          setSyncing(true);
        }
      }, SYNCING_VISIBILITY_DELAY_MS);

      repository
        .saveSnapshot(snapshotData, pairIdentity, deleteHints)
        .then(({ savedAt, mode }) => {
          if (saveSequenceRef.current !== saveId) {
            return;
          }
          lastSavedFingerprintRef.current = currentFingerprint;
          clearPendingRemoteDeleteHints(deleteHints);
          if (savedAt) {
            setLastSavedAt(savedAt);
            setStorageSource('saved');
          }
          setRepositoryMode(mode);
          setSyncError(null);
        })
        .catch((error: Error) => {
          if (saveSequenceRef.current === saveId) {
            setSyncError(error.message);
          }
        })
        .finally(() => {
          if (syncingTimer) {
            window.clearTimeout(syncingTimer);
          }
          if (saveSequenceRef.current === saveId) {
            setSyncing(false);
          }
        });
    }, AUTOSAVE_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(debounceTimer);
      if (syncingTimer) {
        window.clearTimeout(syncingTimer);
      }
    };
  }, [
    activities,
    bans,
    budgetFilter,
    drawSessions,
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

    return repository.subscribeToPair(pairIdentity, (snapshot) =>
      applySnapshot(snapshot, { preserveDeviceUi: true }),
    );
  }, [pairIdentity, repository]);

  function replaceLocalState(data = createDemoLocalAppData(), source: LocalStateSource = 'demo') {
    setActivities(data.activities);
    setDrawSessions(data.drawSessions);
    setScheduledSessions(data.scheduledSessions);
    setOutcomes(data.outcomes);
    setBans(data.weeklyActivityBans);
    setTargetWeekStart(data.targetWeekStart);
    setBudgetFilter(data.budgetFilter);
    setDrawResults([]);
    setDrawNotice(null);
    setActiveScreen('board');
    setStorageSource(source);
  }

  function resetToDemoData() {
    if (pairIdentity) {
      return;
    }

    const confirmed = window.confirm(
      '要把这台设备恢复成演示数据吗？本机改动会被替换。',
    );

    if (!confirmed) {
      return;
    }

    enableDemoSeed();
    replaceLocalState();
  }

  async function startFromScratch() {
    const confirmed = window.confirm(
      pairIdentity
        ? '确定要清空这个双人空间的数据吗？这会删除两个人共享的活动、计划、屏蔽项和记录，但会保留配对码和成员。'
        : '要从空白开始吗？这会清空本机演示活动、计划和记录，但不会影响云端数据。',
    );

    if (!confirmed) {
      return;
    }

    setSyncing(true);
    setHydrating(true);
    setSyncError(null);
    try {
      const snapshot = await repository.startFromScratch(pairIdentity);
      applySnapshot(snapshot);
      setActiveScreen('pool');
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : '清空数据失败。');
    } finally {
      setHydrating(false);
      setSyncing(false);
    }
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
      setSyncError(error instanceof Error ? error.message : '配对码创建失败。');
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
      setSyncError(error instanceof Error ? error.message : '加入配对失败。');
    } finally {
      setHydrating(false);
      setSyncing(false);
    }
  }

  function clearLocalUserData() {
    const confirmed = window.confirm(
      pairIdentity
        ? '要断开这台设备吗？云端双人数据不会被删除或改动。'
        : '要清空这台设备上的数据吗？云端数据不会受影响。',
    );

    if (!confirmed) {
      return;
    }

    repository.clearLocalData();
    setPairIdentity(null);
    setLastSavedAt(null);
    replaceLocalState();
  }

  function exportAppData() {
    const raw = stringifyAppBackup(getCurrentAppData());
    const blob = new Blob([raw], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `couple-flow-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function importAppData(file: File): Promise<ImportDataResult> {
    if (pairIdentity) {
      return {
        status: 'error',
        message: '已连接双人空间时不能导入，避免覆盖同步数据。',
      };
    }

    const raw = await file.text();
    const result = parseAppBackupJson(raw);
    if (!result.ok) {
      return { status: 'error', message: result.error };
    }

    const confirmed = window.confirm(
      '要在这台设备导入备份吗？本机的活动、计划、记录、屏蔽项、目标周和预算筛选会被替换，云端数据不受影响。',
    );
    if (!confirmed) {
      return { status: 'cancelled' };
    }

    replaceLocalState(result.backup.data);
    return { status: 'success' };
  }

  function changeTargetWeek(weekStart: string) {
    setTargetWeekStart(weekStart);
    setDrawResults([]);
    setDrawNotice(null);
  }

  function changeBudget(filter: BudgetFilter) {
    setBudgetFilter(filter);
    setDrawResults([]);
    setDrawNotice(null);
  }

  function toggleBan(memberId: string, activityId: string) {
    setBans((currentBans) => {
      const result = toggleWeeklyActivityBan({
        bans: currentBans,
        pairId: activePairId,
        drawSessionId: currentDrawSessionId,
        requestedMemberId: memberId,
        actingMemberId: activeMemberId,
        activityId,
        pairedMode: !!pairIdentity,
      });

      if (result.deletedBan) {
        pendingRemoteDeletesRef.current.weeklyActivityBans.push(result.deletedBan);
      }

      return result.bans;
    });
    setDrawResults([]);
    setDrawNotice(null);
  }

  function startDraw() {
    if (partnerDrawActive) {
      return false;
    }

    setDrawSessions((sessions) =>
      upsertDrawSessionState({
        drawSessions: sessions,
        pairId: activePairId,
        drawSessionId: currentDrawSessionId,
        targetWeekStart: selectedTargetWeek,
        actingMemberId: activeMemberId,
        status: 'drawing',
      }),
    );
    setDrawNotice(null);
    return true;
  }

  function revealDraw(results: Activity[]) {
    setDrawResults(results);
    setDrawSessions((sessions) =>
      upsertDrawSessionState({
        drawSessions: sessions,
        pairId: activePairId,
        drawSessionId: currentDrawSessionId,
        targetWeekStart: selectedTargetWeek,
        actingMemberId: activeMemberId,
        status: 'revealed',
      }),
    );
  }

  function acceptDraw(activity: Activity) {
    const session = createScheduledSession(
      activity,
      currentDrawSessionId,
      activePairId,
      selectedTargetWeek,
      currentWeekStart,
    );

    setScheduledSessions((sessions) => [...sessions, session]);
    setDrawSessions((sessions) =>
      upsertDrawSessionState({
        drawSessions: sessions,
        pairId: activePairId,
        drawSessionId: currentDrawSessionId,
        targetWeekStart: selectedTargetWeek,
        actingMemberId: activeMemberId,
        status: 'accepted',
      }),
    );
    setDrawResults([]);
    setDrawNotice(null);
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

  function updateActivity(updatedActivity: Activity) {
    setActivities((currentActivities) =>
      currentActivities.map((activity) =>
        activity.id === updatedActivity.id ? updatedActivity : activity,
      ),
    );
  }

  function removeActivity(activityId: string) {
    if (!referencedActivityIds.has(activityId)) {
      const confirmed = window.confirm('确定删除这个活动吗？');
      if (!confirmed) {
        return;
      }
    }

    const result = deleteOrPauseActivity({
      activityId,
      activities,
      scheduledSessions,
      outcomes,
      weeklyActivityBans: bans,
    });
    setActivities(result.activities);
    setBans(result.weeklyActivityBans);
    if (result.result === 'deleted') {
      pendingRemoteDeletesRef.current.activityIds.push(activityId);
    }
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
          drawSessionId={currentDrawSessionId}
          budgetFilter={budgetFilter}
          drawResults={drawResults}
          currentMemberId={activeMemberId}
          currentDrawSession={currentDrawSession}
          drawNotice={drawNotice}
          pairedMode={!!pairIdentity}
          partnerDrawActive={partnerDrawActive}
          onTargetWeekChange={changeTargetWeek}
          onBudgetChange={changeBudget}
          onToggleBan={toggleBan}
          onStartDraw={startDraw}
          onDraw={revealDraw}
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
          onDeleteActivity={removeActivity}
          onUpdateActivity={updateActivity}
          onToggleStatus={toggleActivityStatus}
          referencedActivityIds={referencedActivityIds}
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
          onExportData={exportAppData}
          onImportData={importAppData}
          onJoinPair={joinPairCode}
          onResetDemoData={resetToDemoData}
          onStartFromScratch={startFromScratch}
        />
      )}
    </AppShell>
  );
}

function mergeActivitiesForRealtime(
  localActivities: Activity[],
  remoteActivities: Activity[],
  actingMemberId: string,
  pendingDeleteIds: Set<string>,
) {
  const merged = new Map(
    remoteActivities
      .filter((activity) => !pendingDeleteIds.has(activity.id))
      .map((activity) => [activity.id, activity]),
  );

  localActivities.forEach((activity) => {
    if (pendingDeleteIds.has(activity.id) || activity.created_by_member_id !== actingMemberId) {
      return;
    }
    merged.set(activity.id, activity);
  });

  return [...merged.values()];
}

function mergeDrawSessionsForRealtime(
  localDrawSessions: DrawSession[],
  remoteDrawSessions: DrawSession[],
  actingMemberId: string,
) {
  const merged = new Map(remoteDrawSessions.map((drawSession) => [drawSession.id, drawSession]));

  localDrawSessions.forEach((drawSession) => {
    const remoteDrawSession = merged.get(drawSession.id);
    if (
      drawSession.created_by_member_id === actingMemberId &&
      (!remoteDrawSession || remoteDrawSession.created_by_member_id === actingMemberId)
    ) {
      merged.set(drawSession.id, drawSession);
    }
  });

  return [...merged.values()];
}

function mergeLocalRowsById<T extends { id: string }>(localRows: T[], remoteRows: T[]) {
  const merged = new Map(remoteRows.map((row) => [row.id, row]));
  localRows.forEach((row) => {
    if (!merged.has(row.id)) {
      merged.set(row.id, row);
    }
  });
  return [...merged.values()];
}

export default App;
