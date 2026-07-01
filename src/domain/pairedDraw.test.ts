import { describe, expect, it } from 'vitest';
import type { Activity, DrawSession, PairMember, WeeklyActivityBan } from '../types';
import {
  agreeToPendingDrawAction,
  applyDrawReplacementResult,
  getActingMemberId,
  getDrawSessionId,
  isPartnerDrawActive,
  mergeRemoteBansForPairedDevice,
  rejectPendingDrawAction,
  requestDrawAgreement,
  resetDrawSessionToIdle,
  shouldShowDrawStaleNotice,
  toggleWeeklyActivityBan,
  upsertDrawSessionState,
} from './pairedDraw';

const members: PairMember[] = [
  {
    id: 'member-me',
    pair_id: 'pair-1',
    display_name: 'Me',
    color: '#f97362',
    created_at: '',
  },
  {
    id: 'member-partner',
    pair_id: 'pair-1',
    display_name: 'Partner',
    color: '#7ad7bd',
    created_at: '',
  },
];

const activity: Activity = {
  id: 'activity-1',
  pair_id: 'pair-1',
  title: 'Dinner',
  note: '',
  budget_group_id: 'budget-1',
  duration_minutes: 60,
  tags: [],
  created_by_member_id: 'member-me',
  status: 'active',
  created_at: '',
};

function ban(overrides: Partial<WeeklyActivityBan> = {}): WeeklyActivityBan {
  return {
    id: 'ban-1',
    pair_id: 'pair-1',
    draw_session_id: 'draw-pair-1-2026-07-06',
    member_id: 'member-me',
    activity_id: 'activity-1',
    created_at: '',
    ...overrides,
  };
}

function drawSession(overrides: Partial<DrawSession> = {}): DrawSession {
  return {
    id: 'draw-pair-1-2026-07-06',
    pair_id: 'pair-1',
    target_week_start_date: '2026-07-06',
    created_by_member_id: 'member-me',
    status: 'revealed',
    result_activity_id: 'activity-1',
    pending_action_type: null,
    requested_by_member_id: null,
    agreed_by_member_ids: [],
    created_at: '',
    ...overrides,
  };
}

describe('paired draw helpers', () => {
  it('locks the acting member to pair identity in paired mode', () => {
    expect(
      getActingMemberId(
        {
          pairId: 'pair-1',
          memberId: 'member-partner',
          pairCode: 'ABC123',
          displayName: 'Partner',
        },
        members,
      ),
    ).toBe('member-partner');
  });

  it('uses the first member in local demo mode', () => {
    expect(getActingMemberId(null, members)).toBe('member-me');
  });

  it('lets the current member add and remove their own ban', () => {
    const drawSessionId = getDrawSessionId('pair-1', '2026-07-06');
    const added = toggleWeeklyActivityBan({
      bans: [],
      pairId: 'pair-1',
      drawSessionId,
      requestedMemberId: 'member-me',
      actingMemberId: 'member-me',
      activityId: 'activity-1',
      pairedMode: true,
      now: new Date('2026-06-30T00:00:00.000Z'),
    });

    expect(added.changed).toBe(true);
    expect(added.bans).toEqual([
      expect.objectContaining({
        pair_id: 'pair-1',
        draw_session_id: drawSessionId,
        member_id: 'member-me',
        activity_id: 'activity-1',
      }),
    ]);

    const removed = toggleWeeklyActivityBan({
      bans: added.bans,
      pairId: 'pair-1',
      drawSessionId,
      requestedMemberId: 'member-me',
      actingMemberId: 'member-me',
      activityId: 'activity-1',
      pairedMode: true,
    });

    expect(removed.bans).toEqual([]);
    expect(removed.deletedBan).toEqual({
      drawSessionId,
      memberId: 'member-me',
      activityId: 'activity-1',
    });
  });

  it('prevents the current member from mutating partner bans while paired', () => {
    const existing = [ban({ member_id: 'member-partner' })];

    const result = toggleWeeklyActivityBan({
      bans: existing,
      pairId: 'pair-1',
      drawSessionId: 'draw-pair-1-2026-07-06',
      requestedMemberId: 'member-partner',
      actingMemberId: 'member-me',
      activityId: 'activity-1',
      pairedMode: true,
    });

    expect(result.changed).toBe(false);
    expect(result.bans).toBe(existing);
    expect(result.deletedBan).toBeNull();
  });

  it('keeps local own bans while accepting partner realtime ban updates', () => {
    expect(
      mergeRemoteBansForPairedDevice(
        [ban({ id: 'local-own', member_id: 'member-me' })],
        [ban({ id: 'remote-partner', member_id: 'member-partner' })],
        'member-me',
      ),
    ).toEqual([
      expect.objectContaining({ id: 'remote-partner' }),
      expect.objectContaining({ id: 'local-own' }),
    ]);
  });

  it('flags revealed draw results as stale when remote choices change', () => {
    expect(
      shouldShowDrawStaleNotice({
        localBans: [ban({ activity_id: 'activity-1' })],
        remoteBans: [ban({ activity_id: 'activity-2' })],
        drawSessionId: 'draw-pair-1-2026-07-06',
        resultActivityId: activity.id,
      }),
    ).toBe(true);
  });

  it('guards a target week when the partner is drawing or revealed', () => {
    const activeDrawSession = drawSession({
      created_by_member_id: 'member-partner',
      status: 'drawing',
    });

    expect(isPartnerDrawActive(activeDrawSession, 'member-me')).toBe(true);
    expect(isPartnerDrawActive({ ...activeDrawSession, status: 'revealed' }, 'member-me')).toBe(false);
    expect(isPartnerDrawActive({ ...activeDrawSession, status: 'accepted' }, 'member-me')).toBe(false);
  });

  it('upserts draw state for the target week', () => {
    const drawSessionId = getDrawSessionId('pair-1', '2026-07-06');
    const drawing = upsertDrawSessionState({
      drawSessions: [],
      pairId: 'pair-1',
      drawSessionId,
      targetWeekStart: '2026-07-06',
      actingMemberId: 'member-me',
      status: 'drawing',
      now: new Date('2026-06-30T00:00:00.000Z'),
    });

    expect(drawing).toEqual([
      expect.objectContaining({
        id: drawSessionId,
        status: 'drawing',
        result_activity_id: null,
        created_by_member_id: 'member-me',
      }),
    ]);
    expect(
      upsertDrawSessionState({
        drawSessions: drawing,
        pairId: 'pair-1',
        drawSessionId,
        targetWeekStart: '2026-07-06',
        actingMemberId: 'member-me',
        status: 'revealed',
        resultActivityId: activity.id,
      })[0].status,
    ).toBe('revealed');
  });

  it('updates an existing same-week draw session with a different id', () => {
    const existing = drawSession({
      id: 'draw-seed',
      created_by_member_id: 'member-partner',
      status: 'idle',
      created_at: '2026-06-29T00:00:00.000Z',
    });

    const updated = upsertDrawSessionState({
      drawSessions: [existing],
      pairId: 'pair-1',
      drawSessionId: getDrawSessionId('pair-1', '2026-07-06'),
      targetWeekStart: '2026-07-06',
      actingMemberId: 'member-me',
      status: 'drawing',
    });

    expect(updated).toEqual([
      {
        ...existing,
        status: 'drawing',
      },
    ]);
  });

  it('creates a pending reroll request without changing the current result', () => {
    const requested = requestDrawAgreement({
      drawSessions: [drawSession()],
      pairId: 'pair-1',
      drawSessionId: 'draw-pair-1-2026-07-06',
      targetWeekStart: '2026-07-06',
      actingMemberId: 'member-me',
      actionType: 'reroll',
    });

    expect(requested[0]).toEqual(
      expect.objectContaining({
        status: 'pending_reroll',
        result_activity_id: 'activity-1',
        pending_action_type: 'reroll',
        requested_by_member_id: 'member-me',
        agreed_by_member_ids: ['member-me'],
      }),
    );
  });

  it('completes a pending reroll only after the second member agrees', () => {
    const requested = drawSession({
      status: 'pending_reroll',
      pending_action_type: 'reroll',
      requested_by_member_id: 'member-me',
      agreed_by_member_ids: ['member-me'],
    });

    const firstAgreement = agreeToPendingDrawAction({
      drawSessions: [requested],
      pairId: 'pair-1',
      drawSessionId: requested.id,
      targetWeekStart: requested.target_week_start_date,
      actingMemberId: 'member-me',
      requiredMemberIds: ['member-me', 'member-partner'],
    });
    expect(firstAgreement.completedAction).toBeNull();

    const secondAgreement = agreeToPendingDrawAction({
      drawSessions: firstAgreement.drawSessions,
      pairId: 'pair-1',
      drawSessionId: requested.id,
      targetWeekStart: requested.target_week_start_date,
      actingMemberId: 'member-partner',
      requiredMemberIds: ['member-me', 'member-partner'],
    });

    expect(secondAgreement.completedAction).toBe('reroll');
    expect(secondAgreement.drawSessions[0]).toEqual(
      expect.objectContaining({
        status: 'revealed',
        result_activity_id: 'activity-1',
        pending_action_type: null,
        requested_by_member_id: null,
        agreed_by_member_ids: [],
      }),
    );
  });

  it('reroll agreement updates the result and clears pending state', () => {
    const pending = drawSession({
      status: 'pending_reroll',
      pending_action_type: 'reroll',
      requested_by_member_id: 'member-me',
      agreed_by_member_ids: ['member-me'],
    });
    const agreed = agreeToPendingDrawAction({
      drawSessions: [pending],
      pairId: 'pair-1',
      drawSessionId: pending.id,
      targetWeekStart: pending.target_week_start_date,
      actingMemberId: 'member-partner',
      requiredMemberIds: ['member-me', 'member-partner'],
    });
    const replaced = applyDrawReplacementResult({
      drawSessions: agreed.drawSessions,
      pairId: 'pair-1',
      drawSessionId: pending.id,
      targetWeekStart: pending.target_week_start_date,
      actingMemberId: 'member-partner',
      resultActivityId: 'activity-2',
    });

    expect(replaced[0]).toEqual(
      expect.objectContaining({
        status: 'revealed',
        result_activity_id: 'activity-2',
        pending_action_type: null,
        requested_by_member_id: null,
        agreed_by_member_ids: [],
      }),
    );
  });

  it('rejects a pending request and keeps the current result', () => {
    const pending = drawSession({
      status: 'pending_change',
      pending_action_type: 'change',
      requested_by_member_id: 'member-me',
      agreed_by_member_ids: ['member-me'],
    });

    expect(
      rejectPendingDrawAction({
        drawSessions: [pending],
        pairId: 'pair-1',
        drawSessionId: pending.id,
        targetWeekStart: pending.target_week_start_date,
        actingMemberId: 'member-partner',
      })[0],
    ).toEqual(
      expect.objectContaining({
        status: 'revealed',
        result_activity_id: 'activity-1',
        pending_action_type: null,
        requested_by_member_id: null,
        agreed_by_member_ids: [],
      }),
    );
  });

  it('change agreement updates the result and clears pending state', () => {
    const pending = drawSession({
      status: 'pending_change',
      pending_action_type: 'change',
      requested_by_member_id: 'member-me',
      agreed_by_member_ids: ['member-me'],
    });
    const agreed = agreeToPendingDrawAction({
      drawSessions: [pending],
      pairId: 'pair-1',
      drawSessionId: pending.id,
      targetWeekStart: pending.target_week_start_date,
      actingMemberId: 'member-partner',
      requiredMemberIds: ['member-me', 'member-partner'],
    });
    const replaced = applyDrawReplacementResult({
      drawSessions: agreed.drawSessions,
      pairId: 'pair-1',
      drawSessionId: pending.id,
      targetWeekStart: pending.target_week_start_date,
      actingMemberId: 'member-partner',
      resultActivityId: 'activity-3',
    });

    expect(replaced[0]).toEqual(
      expect.objectContaining({
        status: 'revealed',
        result_activity_id: 'activity-3',
        pending_action_type: null,
        requested_by_member_id: null,
        agreed_by_member_ids: [],
      }),
    );
  });

  it('keeps the current result and clears pending state when no replacement exists', () => {
    const pending = drawSession({
      status: 'pending_change',
      pending_action_type: 'change',
      requested_by_member_id: 'member-me',
      agreed_by_member_ids: ['member-me'],
    });
    const agreed = agreeToPendingDrawAction({
      drawSessions: [pending],
      pairId: 'pair-1',
      drawSessionId: pending.id,
      targetWeekStart: pending.target_week_start_date,
      actingMemberId: 'member-partner',
      requiredMemberIds: ['member-me', 'member-partner'],
    });

    expect(agreed.drawSessions[0]).toEqual(
      expect.objectContaining({
        status: 'revealed',
        result_activity_id: 'activity-1',
        pending_action_type: null,
        requested_by_member_id: null,
        agreed_by_member_ids: [],
      }),
    );
  });

  it('requires both members for paired accept agreement', () => {
    const requested = requestDrawAgreement({
      drawSessions: [drawSession()],
      pairId: 'pair-1',
      drawSessionId: 'draw-pair-1-2026-07-06',
      targetWeekStart: '2026-07-06',
      actingMemberId: 'member-me',
      actionType: 'accept',
    });
    expect(requested[0]).toEqual(
      expect.objectContaining({
        status: 'pending_accept',
        pending_action_type: 'accept',
        agreed_by_member_ids: ['member-me'],
      }),
    );

    const agreed = agreeToPendingDrawAction({
      drawSessions: requested,
      pairId: 'pair-1',
      drawSessionId: 'draw-pair-1-2026-07-06',
      targetWeekStart: '2026-07-06',
      actingMemberId: 'member-partner',
      requiredMemberIds: ['member-me', 'member-partner'],
    });

    expect(agreed.completedAction).toBe('accept');
    expect(agreed.drawSessions[0]).toEqual(
      expect.objectContaining({
        status: 'idle',
        result_activity_id: null,
        pending_action_type: null,
        requested_by_member_id: null,
        agreed_by_member_ids: [],
      }),
    );
  });

  it('resets an accepted draw round to idle so the same week can draw again', () => {
    const reset = resetDrawSessionToIdle({
      drawSessions: [
        drawSession({
          status: 'pending_accept',
          pending_action_type: 'accept',
          requested_by_member_id: 'member-me',
          agreed_by_member_ids: ['member-me', 'member-partner'],
        }),
      ],
      pairId: 'pair-1',
      drawSessionId: 'draw-pair-1-2026-07-06',
      targetWeekStart: '2026-07-06',
      actingMemberId: 'member-partner',
    });

    expect(reset[0]).toEqual(
      expect.objectContaining({
        status: 'idle',
        result_activity_id: null,
        pending_action_type: null,
        requested_by_member_id: null,
        agreed_by_member_ids: [],
      }),
    );
  });
});
