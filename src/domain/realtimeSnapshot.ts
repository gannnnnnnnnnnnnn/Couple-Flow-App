import type { Activity, DrawSession, ScheduledSession, SessionOutcome } from '../types';
import type { LocalAppData } from './localPersistence';
import { mergeRemoteBansForPairedDevice } from './pairedDraw';

export function isAuthoritativeSharedClear(data: LocalAppData) {
  return (
    data.activities.length === 0 &&
    data.drawSessions.length === 0 &&
    data.scheduledSessions.length === 0 &&
    data.outcomes.length === 0 &&
    data.weeklyActivityBans.length === 0
  );
}

export function mergeRealtimeSnapshotData({
  actingMemberId,
  localData,
  pendingDrawSessionIds = new Set(),
  pendingScheduledSessionIds = new Set(),
  pendingActivityDeleteIds,
  preserveDeviceUi,
  remoteData,
}: {
  actingMemberId: string | null;
  localData: LocalAppData;
  pendingDrawSessionIds?: Set<string>;
  pendingScheduledSessionIds?: Set<string>;
  pendingActivityDeleteIds: Set<string>;
  preserveDeviceUi: boolean;
  remoteData: LocalAppData;
}): LocalAppData {
  if (!preserveDeviceUi || !actingMemberId) {
    return remoteData;
  }

  if (isAuthoritativeSharedClear(remoteData)) {
    return {
      ...remoteData,
      targetWeekStart: localData.targetWeekStart,
      budgetFilter: localData.budgetFilter,
    };
  }

  return {
    activities: mergeActivitiesForRealtime(
      localData.activities,
      remoteData.activities,
      actingMemberId,
      pendingActivityDeleteIds,
    ),
    drawSessions: mergeDrawSessionsForRealtime(
      localData.drawSessions,
      remoteData.drawSessions,
      actingMemberId,
      pendingDrawSessionIds,
    ),
    scheduledSessions: mergeScheduledSessionsForRealtime(
      localData.scheduledSessions,
      remoteData.scheduledSessions,
      pendingScheduledSessionIds,
    ),
    outcomes: mergeLocalRowsById(localData.outcomes, remoteData.outcomes),
    weeklyActivityBans: mergeRemoteBansForPairedDevice(
      localData.weeklyActivityBans,
      remoteData.weeklyActivityBans,
      actingMemberId,
    ),
    targetWeekStart: localData.targetWeekStart,
    budgetFilter: localData.budgetFilter,
  };
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
  pendingDrawSessionIds: Set<string>,
) {
  const merged = new Map(remoteDrawSessions.map((drawSession) => [drawSession.id, drawSession]));

  localDrawSessions.forEach((drawSession) => {
    if (pendingDrawSessionIds.has(drawSession.id)) {
      merged.set(drawSession.id, drawSession);
      return;
    }

    if (
      drawSession.created_by_member_id === actingMemberId &&
      !merged.has(drawSession.id)
    ) {
      merged.set(drawSession.id, drawSession);
    }
  });

  return [...merged.values()];
}

function mergeScheduledSessionsForRealtime(
  localScheduledSessions: ScheduledSession[],
  remoteScheduledSessions: ScheduledSession[],
  pendingScheduledSessionIds: Set<string>,
) {
  const merged = new Map(remoteScheduledSessions.map((session) => [session.id, session]));
  localScheduledSessions.forEach((session) => {
    if (pendingScheduledSessionIds.has(session.id)) {
      merged.set(session.id, session);
      return;
    }

    if (!merged.has(session.id)) {
      merged.set(session.id, session);
    }
  });
  return [...merged.values()];
}

function mergeLocalRowsById<T extends ScheduledSession | SessionOutcome>(
  localRows: T[],
  remoteRows: T[],
) {
  const merged = new Map(remoteRows.map((row) => [row.id, row]));
  localRows.forEach((row) => {
    if (!merged.has(row.id)) {
      merged.set(row.id, row);
    }
  });
  return [...merged.values()];
}
