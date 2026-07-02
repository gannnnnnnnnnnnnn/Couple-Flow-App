import { describe, expect, it } from 'vitest';
import type { DrawSession, PairMember } from '../types';
import {
  agreeToPendingDrawAction,
  requestDrawAgreement,
} from './pairedDraw';
import {
  getEffectivePairedAgreementMembers,
  hasExtraRawPairMembers,
} from './pairedAgreement';

const rawMembersWithStaleDuplicate: PairMember[] = [
  {
    id: 'member-me',
    pair_id: 'pair-1',
    display_name: 'Me',
    color: '#f97362',
    created_at: '2026-06-29T00:00:00.000Z',
  },
  {
    id: 'member-partner',
    pair_id: 'pair-1',
    display_name: 'Partner',
    color: '#7ad7bd',
    created_at: '2026-06-29T00:01:00.000Z',
  },
  {
    id: 'member-partner-stale',
    pair_id: 'pair-1',
    display_name: ' partner ',
    color: '#7ad7bd',
    created_at: '2026-06-29T00:02:00.000Z',
  },
];

function drawSession(): DrawSession {
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
    created_at: '2026-06-29T00:00:00.000Z',
  };
}

describe('effective paired agreement members', () => {
  it('three raw pair members with duplicate display name require only two effective members', () => {
    const effectiveMembers = getEffectivePairedAgreementMembers(
      rawMembersWithStaleDuplicate,
      'member-me',
    );

    expect(hasExtraRawPairMembers(rawMembersWithStaleDuplicate)).toBe(true);
    expect(effectiveMembers.map((member) => member.id)).toEqual([
      'member-me',
      'member-partner',
    ]);
  });

  it('preserves the current device member when deduping duplicated display names', () => {
    const rawMembers: PairMember[] = [
      {
        id: 'member-me-stale',
        pair_id: 'pair-1',
        display_name: 'Me',
        color: '#f97362',
        created_at: '2026-06-29T00:00:00.000Z',
      },
      {
        id: 'member-partner',
        pair_id: 'pair-1',
        display_name: 'Partner',
        color: '#7ad7bd',
        created_at: '2026-06-29T00:01:00.000Z',
      },
      {
        id: 'member-me-current',
        pair_id: 'pair-1',
        display_name: ' me ',
        color: '#f97362',
        created_at: '2026-06-29T00:02:00.000Z',
      },
    ];

    expect(
      getEffectivePairedAgreementMembers(rawMembers, 'member-me-current').map(
        (member) => member.id,
      ),
    ).toEqual(['member-partner', 'member-me-current']);
  });

  it('keeps the current device member when capping three unique raw members', () => {
    const rawMembers: PairMember[] = [
      {
        id: 'member-stale-a',
        pair_id: 'pair-1',
        display_name: 'Old A',
        color: '#f97362',
        created_at: '2026-06-29T00:00:00.000Z',
      },
      {
        id: 'member-partner',
        pair_id: 'pair-1',
        display_name: 'Partner',
        color: '#7ad7bd',
        created_at: '2026-06-29T00:01:00.000Z',
      },
      {
        id: 'member-me-current',
        pair_id: 'pair-1',
        display_name: 'Me',
        color: '#f97362',
        created_at: '2026-06-29T00:02:00.000Z',
      },
    ];

    const effectiveMembers = getEffectivePairedAgreementMembers(
      rawMembers,
      'member-me-current',
    );

    expect(effectiveMembers).toHaveLength(2);
    expect(effectiveMembers.map((member) => member.id)).toContain('member-me-current');
  });

  it('stale duplicate member does not block accept agreement', () => {
    const requiredMemberIds = getEffectivePairedAgreementMembers(
      rawMembersWithStaleDuplicate,
      'member-me',
    ).map((member) => member.id);
    const requested = requestDrawAgreement({
      drawSessions: [drawSession()],
      pairId: 'pair-1',
      drawSessionId: 'draw-pair-1-2026-07-06',
      targetWeekStart: '2026-07-06',
      actingMemberId: 'member-me',
      actionType: 'accept',
    });
    const agreed = agreeToPendingDrawAction({
      drawSessions: requested,
      pairId: 'pair-1',
      drawSessionId: 'draw-pair-1-2026-07-06',
      targetWeekStart: '2026-07-06',
      actingMemberId: 'member-partner',
      requiredMemberIds,
    });

    expect(requiredMemberIds).toEqual(['member-me', 'member-partner']);
    expect(agreed.completedAction).toBe('accept');
  });

  it('stale duplicate member does not block reroll or change agreement', () => {
    const requiredMemberIds = getEffectivePairedAgreementMembers(
      rawMembersWithStaleDuplicate,
      'member-me',
    ).map((member) => member.id);

    (['reroll', 'change'] as const).forEach((actionType) => {
      const requested = requestDrawAgreement({
        drawSessions: [drawSession()],
        pairId: 'pair-1',
        drawSessionId: 'draw-pair-1-2026-07-06',
        targetWeekStart: '2026-07-06',
        actingMemberId: 'member-me',
        actionType,
      });
      const agreed = agreeToPendingDrawAction({
        drawSessions: requested,
        pairId: 'pair-1',
        drawSessionId: 'draw-pair-1-2026-07-06',
        targetWeekStart: '2026-07-06',
        actingMemberId: 'member-partner',
        requiredMemberIds,
      });

      expect(agreed.completedAction).toBe(actionType);
    });
  });
});
