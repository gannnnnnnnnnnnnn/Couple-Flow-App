import type {
  DrawSession,
  PendingDrawAction,
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

export type AgreementCompletion = PendingDrawAction | null;

export const PENDING_DRAW_STATUS_BY_ACTION: Record<
  PendingDrawAction,
  DrawSession['status']
> = {
  accept: 'pending_accept',
  reroll: 'pending_reroll',
  change: 'pending_change',
};

const pendingDrawStatuses = new Set<DrawSession['status']>([
  'pending_accept',
  'pending_reroll',
  'pending_change',
]);

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
  resultActivityId,
  pendingActionType,
  requestedByMemberId,
  agreedByMemberIds,
  now = new Date(),
}: {
  drawSessions: DrawSession[];
  pairId: string;
  drawSessionId: string;
  targetWeekStart: string;
  actingMemberId: string;
  status: DrawSession['status'];
  resultActivityId?: string | null;
  pendingActionType?: PendingDrawAction | null;
  requestedByMemberId?: string | null;
  agreedByMemberIds?: string[];
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
    result_activity_id:
      resultActivityId === undefined ? existing?.result_activity_id ?? null : resultActivityId,
    pending_action_type:
      pendingActionType === undefined
        ? existing?.pending_action_type ?? null
        : pendingActionType,
    requested_by_member_id:
      requestedByMemberId === undefined
        ? existing?.requested_by_member_id ?? null
        : requestedByMemberId,
    agreed_by_member_ids:
      agreedByMemberIds === undefined
        ? existing?.agreed_by_member_ids ?? []
        : uniqueMemberIds(agreedByMemberIds),
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
    drawSession.status === 'drawing'
  );
}

export function hasPendingDrawAction(drawSession: DrawSession | undefined) {
  return !!drawSession && pendingDrawStatuses.has(drawSession.status);
}

export function canRequestDrawAction(drawSession: DrawSession | undefined) {
  return (
    !!drawSession &&
    drawSession.status === 'revealed' &&
    !!drawSession.result_activity_id &&
    !drawSession.pending_action_type
  );
}

export function requestDrawAgreement({
  drawSessions,
  pairId,
  drawSessionId,
  targetWeekStart,
  actingMemberId,
  actionType,
}: {
  drawSessions: DrawSession[];
  pairId: string;
  drawSessionId: string;
  targetWeekStart: string;
  actingMemberId: string;
  actionType: PendingDrawAction;
}) {
  const existing = getDrawSessionForWeek(drawSessions, targetWeekStart);
  const resultActivityId = existing?.result_activity_id ?? null;
  if (!canRequestDrawAction(existing) || !resultActivityId) {
    return drawSessions;
  }

  return upsertDrawSessionState({
    drawSessions,
    pairId,
    drawSessionId,
    targetWeekStart,
    actingMemberId,
    status: PENDING_DRAW_STATUS_BY_ACTION[actionType],
    resultActivityId,
    pendingActionType: actionType,
    requestedByMemberId: actingMemberId,
    agreedByMemberIds: [actingMemberId],
  });
}

export function agreeToPendingDrawAction({
  drawSessions,
  pairId,
  drawSessionId,
  targetWeekStart,
  actingMemberId,
  requiredMemberIds,
}: {
  drawSessions: DrawSession[];
  pairId: string;
  drawSessionId: string;
  targetWeekStart: string;
  actingMemberId: string;
  requiredMemberIds: string[];
}): { drawSessions: DrawSession[]; completedAction: AgreementCompletion } {
  const existing = getDrawSessionForWeek(drawSessions, targetWeekStart);
  if (!existing?.pending_action_type || !hasPendingDrawAction(existing)) {
    return { drawSessions, completedAction: null };
  }

  const agreedByMemberIds = uniqueMemberIds([
    ...existing.agreed_by_member_ids,
    actingMemberId,
  ]);
  const requiredIds = uniqueMemberIds(requiredMemberIds);
  const agreementComplete =
    requiredIds.length > 0 && requiredIds.every((memberId) => agreedByMemberIds.includes(memberId));
  const completedAction = agreementComplete ? existing.pending_action_type : null;

  return {
    completedAction,
    drawSessions: upsertDrawSessionState({
      drawSessions,
      pairId,
      drawSessionId,
      targetWeekStart,
      actingMemberId,
      status: agreementComplete ? 'revealed' : existing.status,
      resultActivityId: existing.result_activity_id,
      pendingActionType: agreementComplete ? null : existing.pending_action_type,
      requestedByMemberId: agreementComplete ? null : existing.requested_by_member_id,
      agreedByMemberIds: agreementComplete ? [] : agreedByMemberIds,
    }),
  };
}

export function rejectPendingDrawAction({
  drawSessions,
  pairId,
  drawSessionId,
  targetWeekStart,
  actingMemberId,
}: {
  drawSessions: DrawSession[];
  pairId: string;
  drawSessionId: string;
  targetWeekStart: string;
  actingMemberId: string;
}) {
  const existing = getDrawSessionForWeek(drawSessions, targetWeekStart);
  if (!hasPendingDrawAction(existing)) {
    return drawSessions;
  }

  return upsertDrawSessionState({
    drawSessions,
    pairId,
    drawSessionId,
    targetWeekStart,
    actingMemberId,
    status: 'revealed',
    resultActivityId: existing?.result_activity_id ?? null,
    pendingActionType: null,
    requestedByMemberId: null,
    agreedByMemberIds: [],
  });
}

export function shouldShowDrawStaleNotice({
  localBans,
  remoteBans,
  drawSessionId,
  resultActivityId,
}: {
  localBans: WeeklyActivityBan[];
  remoteBans: WeeklyActivityBan[];
  drawSessionId: string;
  resultActivityId: string | null;
}) {
  if (!resultActivityId) {
    return false;
  }

  return (
    fingerprintBansForDraw(localBans, drawSessionId) !==
    fingerprintBansForDraw(remoteBans, drawSessionId)
  );
}

function uniqueMemberIds(memberIds: string[]) {
  return Array.from(new Set(memberIds.filter(Boolean)));
}

function fingerprintBansForDraw(bans: WeeklyActivityBan[], drawSessionId: string) {
  return bans
    .filter((ban) => ban.draw_session_id === drawSessionId)
    .map((ban) => `${ban.member_id}:${ban.activity_id}`)
    .sort()
    .join('|');
}
