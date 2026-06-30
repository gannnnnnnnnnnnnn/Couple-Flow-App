import { describe, expect, it } from 'vitest';
import { createDemoLocalAppData, createEmptyLocalAppData } from './localPersistence';
import { isAuthoritativeSharedClear, mergeRealtimeSnapshotData } from './realtimeSnapshot';

describe('realtime snapshot merging', () => {
  it('treats an empty pair-scoped remote snapshot as an authoritative shared clear', () => {
    const localData = createDemoLocalAppData();
    localData.targetWeekStart = '2026-07-06';
    localData.budgetFilter = 'budget-tiny';
    const remoteData = createEmptyLocalAppData();

    const merged = mergeRealtimeSnapshotData({
      actingMemberId: 'member-g',
      localData,
      pendingActivityDeleteIds: new Set(),
      preserveDeviceUi: true,
      remoteData,
    });

    expect(isAuthoritativeSharedClear(remoteData)).toBe(true);
    expect(merged.activities).toEqual([]);
    expect(merged.drawSessions).toEqual([]);
    expect(merged.scheduledSessions).toEqual([]);
    expect(merged.outcomes).toEqual([]);
    expect(merged.weeklyActivityBans).toEqual([]);
    expect(merged.targetWeekStart).toBe('2026-07-06');
    expect(merged.budgetFilter).toBe('budget-tiny');
  });

  it('does not preserve and re-upload stale rows after another device clears shared data', () => {
    const deviceBData = createDemoLocalAppData();
    const emptyRemoteData = createEmptyLocalAppData();

    const merged = mergeRealtimeSnapshotData({
      actingMemberId: 'member-g',
      localData: deviceBData,
      pendingActivityDeleteIds: new Set(),
      preserveDeviceUi: true,
      remoteData: emptyRemoteData,
    });

    expect(merged).toMatchObject({
      activities: [],
      drawSessions: [],
      scheduledSessions: [],
      outcomes: [],
      weeklyActivityBans: [],
    });
  });

  it('keeps local own bans while merging non-clear partner realtime updates', () => {
    const localData = createEmptyLocalAppData();
    localData.weeklyActivityBans = [
      {
        id: 'ban-own',
        pair_id: 'pair-1',
        draw_session_id: 'draw-1',
        member_id: 'member-me',
        activity_id: 'activity-own',
        created_at: '',
      },
    ];
    const remoteData = createEmptyLocalAppData();
    remoteData.activities = [
      {
        id: 'activity-partner',
        pair_id: 'pair-1',
        title: 'Partner idea',
        note: '',
        budget_group_id: 'budget-tiny',
        duration_minutes: 30,
        tags: [],
        created_by_member_id: 'member-partner',
        status: 'active',
        created_at: '',
      },
    ];
    remoteData.weeklyActivityBans = [
      {
        id: 'ban-partner',
        pair_id: 'pair-1',
        draw_session_id: 'draw-1',
        member_id: 'member-partner',
        activity_id: 'activity-partner',
        created_at: '',
      },
    ];

    const merged = mergeRealtimeSnapshotData({
      actingMemberId: 'member-me',
      localData,
      pendingActivityDeleteIds: new Set(),
      preserveDeviceUi: true,
      remoteData,
    });

    expect(merged.weeklyActivityBans).toEqual([
      expect.objectContaining({ id: 'ban-partner' }),
      expect.objectContaining({ id: 'ban-own' }),
    ]);
  });
});
