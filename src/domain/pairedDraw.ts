import type {
  Activity,
  BudgetFilter,
  DrawSession,
  PairMember,
  WeeklyActivityBan,
} from '../types';
import type { PairIdentity } from './localPersistence';

export interface ToggleWeeklyBanInput {
  bans: WeeklyActivityBan[];
  pairId: string;
  drawSessionId: string;
  requestedMemberId: string;
  actingMemberId: string;
  activityId: string;
  pairedMode: boolean;
  now?: Date;
}

export interface ToggleWeeklyBanResult {
  bans: WeeklyActivityBan[];
  changed: boolean;
  deletedBan:
    | {
        drawSessionId: string;
        memberId: string;
        activityId: string;
      }
    | null;
}

export function getActingMemberId(
  pairIdentity: PairIdentity | null,
  members: PairMember[],
) {
  return pairIdentity?.memberId ?? members[0]?.id ?? 'member-local';
}

export function getDrawSessionId(pairId: string, targetWeekStart: string) {
  return `draw-${pairId}-${targetWeekStart}`;
}

export function toggleWeeklyActivityBan({
  bans,
  pairId,
  drawSessionId,
  requestedMemberId,
  actingMemberId,
  activityId,
  pairedMode,
  now = new Date(),
}: ToggleWeeklyBanInput): ToggleWeeklyBanResult {
  if (pairedMode && requestedMemberId !== actingMemberId) {
    return { bans, changed: false, deletedBan: null };
  }

  const existing = bans.find(
    (ban) =>
      ban.draw_session_id === drawSessionId &&
      ban.member_id === requestedMemberId &&
      ban.activity_id === activityId,
  );

  if (existing) {
    return {
      bans: bans.filter((ban) => ban.id !== existing.id),
      changed: true,
      deletedBan: {
        drawSessionId,
        memberId: requestedMemberId,
        activityId,
      },
    };
  }

  const memberBanCount = bans.filter(
    (ban) => ban.draw_session_id === drawSessionId && ban.member_id === requestedMemberId,
  ).length;

  if (memberBanCount >= 2) {
    return { bans, changed: false, deletedBan: null };
  }

  return {
    bans: [
      ...bans,
      {
        id: `ban-${drawSessionId}-${requestedMemberId}-${activityId}`,
        pair_id: pairId,
        draw_session_id: drawSessionId,
        member_id: requestedMemberId,
        activity_id: activityId,
        created_at: now.toISOString(),
      },
    ],
    changed: true,
    deletedBan: null,
  };
}

export function mergeRemoteBansForPairedDevice(
  localBans: WeeklyActivityBan[],
  remoteBans: WeeklyActivityBan[],
  actingMemberId: string,
) {
  return [
    ...remoteBans.filter((ban) => ban.member_id !== actingMemberId),
    ...localBans.filter((ban) => ban.member_id === actingMemberId),
  ];
}

export function getDrawSessionForWeek(
  drawSessions: DrawSession[],
  targetWeekStart: string,
) {
  return drawSessions.find(
    (drawSession) => drawSession.target_week_start_date === targetWeekStart,
  );
}

export function upsertDrawSessionState({
  drawSessions,
  pairId,
  drawSessionId,
  targetWeekStart,
  actingMemberId,
  status,
  now = new Date(),
}: {
  drawSessions: DrawSession[];
  pairId: string;
  drawSessionId: string;
  targetWeekStart: string;
  actingMemberId: string;
  status: DrawSession['status'];
  now?: Date;
}) {
  const existing = drawSessions.find(
    (drawSession) =>
      drawSession.id === drawSessionId ||
      (drawSession.pair_id === pairId &&
        drawSession.target_week_start_date === targetWeekStart),
  );
  const nextSession: DrawSession = {
    id: existing?.id ?? drawSessionId,
    pair_id: pairId,
    target_week_start_date: targetWeekStart,
    created_by_member_id: existing?.created_by_member_id ?? actingMemberId,
    status,
    created_at: existing?.created_at ?? now.toISOString(),
  };

  if (existing) {
    return drawSessions.map((drawSession) =>
      drawSession.id === existing.id ? nextSession : drawSession,
    );
  }

  return [...drawSessions, nextSession];
}

export function isPartnerDrawActive(
  drawSession: DrawSession | undefined,
  actingMemberId: string,
) {
  return (
    !!drawSession &&
    drawSession.created_by_member_id !== actingMemberId &&
    (drawSession.status === 'drawing' || drawSession.status === 'revealed')
  );
}

export function shouldShowDrawStaleNotice({
  localBans,
  remoteBans,
  drawSessionId,
  drawResults,
}: {
  localBans: WeeklyActivityBan[];
  remoteBans: WeeklyActivityBan[];
  drawSessionId: string;
  drawResults: Activity[];
}) {
  if (!drawResults.length) {
    return false;
  }

  return (
    fingerprintBansForDraw(localBans, drawSessionId) !==
    fingerprintBansForDraw(remoteBans, drawSessionId)
  );
}

function fingerprintBansForDraw(bans: WeeklyActivityBan[], drawSessionId: string) {
  return bans
    .filter((ban) => ban.draw_session_id === drawSessionId)
    .map((ban) => `${ban.member_id}:${ban.activity_id}`)
    .sort()
    .join('|');
}
