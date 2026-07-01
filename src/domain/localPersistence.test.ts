import { describe, expect, it } from 'vitest';
import { clearCoupleFlowStorage } from './appStorage';
import {
  LOCAL_STATE_STORAGE_KEY,
  clearLocalAppData,
  createEmptyLocalAppData,
  createDemoLocalAppData,
  disableDemoSeed,
  loadPairIdentity,
  loadLocalAppData,
  saveLocalAppData,
  savePairIdentity,
  type StorageLike,
} from './localPersistence';

class MemoryStorage implements StorageLike {
  private values = new Map<string, string>();

  get length() {
    return this.values.size;
  }

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  key(index: number) {
    return [...this.values.keys()][index] ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }

  removeItem(key: string) {
    this.values.delete(key);
  }
}

describe('local persistence', () => {
  it('seeds demo data when no saved local data exists', () => {
    const result = loadLocalAppData(new MemoryStorage());

    expect(result.source).toBe('demo');
    expect(result.canPersist).toBe(true);
    expect(result.data.activities.length).toBeGreaterThan(0);
    expect(result.data.scheduledSessions.length).toBeGreaterThan(0);
    expect(result.data.budgetFilter).toBe('all');
  });

  it('does not seed demo data when the empty-start flag is set', () => {
    const storage = new MemoryStorage();

    disableDemoSeed(storage);
    const result = loadLocalAppData(storage);

    expect(result.source).toBe('empty');
    expect(result.data.activities).toEqual([]);
    expect(result.data.scheduledSessions).toEqual([]);
    expect(result.data.outcomes).toEqual([]);
    expect(result.data.weeklyActivityBans).toEqual([]);
    expect(result.data.budgetFilter).toBe('all');
  });

  it('creates empty local app data with the persisted app shape', () => {
    const data = createEmptyLocalAppData(new Date('2026-06-29T10:00:00.000Z'));

    expect(data).toMatchObject({
      activities: [],
      scheduledSessions: [],
      outcomes: [],
      weeklyActivityBans: [],
      budgetFilter: 'all',
    });
    expect(data.targetWeekStart).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('round-trips the local app state payload', () => {
    const storage = new MemoryStorage();
    const data = createDemoLocalAppData();
    const added = {
      ...data.activities[0],
      id: 'activity-local-only',
      title: 'Local only idea',
    };
    data.activities = [...data.activities, added];
    data.targetWeekStart = '2026-07-06';

    const savedAt = saveLocalAppData(
      data,
      storage,
      new Date('2026-06-29T10:00:00.000Z'),
    );
    const result = loadLocalAppData(storage);

    expect(savedAt).toBe('2026-06-29T10:00:00.000Z');
    expect(result.source).toBe('saved');
    expect(result.savedAt).toBe(savedAt);
    expect(result.data.activities[result.data.activities.length - 1]).toMatchObject({
      id: 'activity-local-only',
      title: 'Local only idea',
    });
    expect(result.data.targetWeekStart).toBe('2026-07-06');
  });

  it('loads older saved app data without draw sessions', () => {
    const storage = new MemoryStorage();
    const data = createDemoLocalAppData();
    const { drawSessions: _drawSessions, ...oldData } = data;
    storage.setItem(
      LOCAL_STATE_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        savedAt: '2026-06-29T12:00:00.000Z',
        data: oldData,
      }),
    );

    const result = loadLocalAppData(storage);

    expect(result.source).toBe('saved');
    expect(result.data.drawSessions).toEqual([]);
  });

  it('migrates old draft draw session status to idle', () => {
    const storage = new MemoryStorage();
    const data = createDemoLocalAppData();
    storage.setItem(
      LOCAL_STATE_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        savedAt: '2026-06-29T12:00:00.000Z',
        data: {
          ...data,
          drawSessions: [{ ...data.drawSessions[0], status: 'draft' }],
        },
      }),
    );

    expect(loadLocalAppData(storage).data.drawSessions[0].status).toBe('idle');
  });

  it('migrates old cancelled draw session status to idle', () => {
    const storage = new MemoryStorage();
    const data = createDemoLocalAppData();
    storage.setItem(
      LOCAL_STATE_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        savedAt: '2026-06-29T12:00:00.000Z',
        data: {
          ...data,
          drawSessions: [{ ...data.drawSessions[0], status: 'cancelled' }],
        },
      }),
    );

    expect(loadLocalAppData(storage).data.drawSessions[0].status).toBe('idle');
  });

  it('adds V0 draw result and agreement defaults to older saved sessions', () => {
    const storage = new MemoryStorage();
    const data = createDemoLocalAppData();
    const {
      result_activity_id: _resultActivityId,
      pending_action_type: _pendingActionType,
      requested_by_member_id: _requestedByMemberId,
      agreed_by_member_ids: _agreedByMemberIds,
      ...oldDrawSession
    } = data.drawSessions[0];
    storage.setItem(
      LOCAL_STATE_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        savedAt: '2026-06-29T12:00:00.000Z',
        data: {
          ...data,
          drawSessions: [{ ...oldDrawSession, status: 'revealed' }],
        },
      }),
    );

    expect(loadLocalAppData(storage).data.drawSessions[0]).toEqual(
      expect.objectContaining({
        status: 'idle',
        result_activity_id: null,
        pending_action_type: null,
        requested_by_member_id: null,
        agreed_by_member_ids: [],
      }),
    );
  });

  it('falls invalid arrays back to empty arrays', () => {
    const storage = new MemoryStorage();
    storage.setItem(
      LOCAL_STATE_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        savedAt: '2026-06-29T12:00:00.000Z',
        data: {
          activities: 'bad',
          drawSessions: null,
          scheduledSessions: {},
          outcomes: false,
          weeklyActivityBans: 12,
          targetWeekStart: '2026-07-06',
          budgetFilter: 'all',
        },
      }),
    );

    const result = loadLocalAppData(storage);

    expect(result.source).toBe('saved');
    expect(result.data.activities).toEqual([]);
    expect(result.data.drawSessions).toEqual([]);
    expect(result.data.scheduledSessions).toEqual([]);
    expect(result.data.outcomes).toEqual([]);
    expect(result.data.weeklyActivityBans).toEqual([]);
  });

  it('falls invalid budget and target week back to safe defaults', () => {
    const storage = new MemoryStorage();
    storage.setItem(
      LOCAL_STATE_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        savedAt: '2026-06-29T12:00:00.000Z',
        data: {
          activities: [],
          drawSessions: [],
          scheduledSessions: [],
          outcomes: [],
          weeklyActivityBans: [],
          targetWeekStart: 'not-a-week',
          budgetFilter: 42,
        },
      }),
    );

    const result = loadLocalAppData(storage);

    expect(result.data.budgetFilter).toBe('all');
    expect(result.data.targetWeekStart).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('corrupt localStorage JSON does not throw or crash boot', () => {
    const storage = new MemoryStorage();
    storage.setItem(LOCAL_STATE_STORAGE_KEY, '{bad json');

    expect(() => loadLocalAppData(storage)).not.toThrow();
    expect(loadLocalAppData(storage).source).toBe('demo');
  });

  it('unsupported saved state returns empty state when demo is disabled', () => {
    const storage = new MemoryStorage();
    disableDemoSeed(storage);
    storage.setItem(
      LOCAL_STATE_STORAGE_KEY,
      JSON.stringify({ version: 999, savedAt: 'x', data: {} }),
    );

    expect(loadLocalAppData(storage).source).toBe('empty');
  });

  it('falls back to demo data for invalid saved payloads', () => {
    const storage = new MemoryStorage();
    storage.setItem(LOCAL_STATE_STORAGE_KEY, '{"version":1,"data":{"activities":[]}}');

    const result = loadLocalAppData(storage);

    expect(result.source).toBe('demo');
    expect(result.savedAt).toBeNull();
    expect(result.data.activities.length).toBeGreaterThan(0);
  });

  it('clears the saved local payload without touching demo seed construction', () => {
    const storage = new MemoryStorage();
    saveLocalAppData(createDemoLocalAppData(), storage);

    clearLocalAppData(storage);

    expect(storage.getItem(LOCAL_STATE_STORAGE_KEY)).toBeNull();
    expect(loadLocalAppData(storage).source).toBe('demo');
  });

  it('clears only Couple Flow owned storage keys', () => {
    const storage = new MemoryStorage();
    storage.setItem('couple-flow.local-state.v1', 'a');
    storage.setItem('couple-flow.pair-identity.v1', 'b');
    storage.setItem('other-app', 'c');

    expect(clearCoupleFlowStorage(storage)).toBe(2);
    expect(storage.getItem('couple-flow.local-state.v1')).toBeNull();
    expect(storage.getItem('couple-flow.pair-identity.v1')).toBeNull();
    expect(storage.getItem('other-app')).toBe('c');
  });

  it('stores the current pair and member identity locally', () => {
    const storage = new MemoryStorage();

    savePairIdentity(
      {
        pairId: 'pair-remote',
        memberId: 'member-me',
        pairCode: 'ABC123',
        displayName: 'Me',
      },
      storage,
    );

    expect(loadPairIdentity(storage)).toEqual({
      pairId: 'pair-remote',
      memberId: 'member-me',
      pairCode: 'ABC123',
      displayName: 'Me',
    });
  });
});
