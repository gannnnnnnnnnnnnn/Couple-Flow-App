import { describe, expect, it } from 'vitest';
import type { Activity, DrawSession, PairMember, WeeklyActivityBan } from '../types';
import {
  getActingMemberId,
  getDrawSessionId,
  isPartnerDrawActive,
  mergeRemoteBansForPairedDevice,
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
        drawResults: [activity],
      }),
    ).toBe(true);
  });

  it('guards a target week when the partner is drawing or revealed', () => {
    const drawSession: DrawSession = {
      id: 'draw-pair-1-2026-07-06',
      pair_id: 'pair-1',
      target_week_start_date: '2026-07-06',
      created_by_member_id: 'member-partner',
      status: 'revealed',
      created_at: '',
    };

    expect(isPartnerDrawActive(drawSession, 'member-me')).toBe(true);
    expect(isPartnerDrawActive({ ...drawSession, status: 'accepted' }, 'member-me')).toBe(false);
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
      })[0].status,
    ).toBe('revealed');
  });
});
