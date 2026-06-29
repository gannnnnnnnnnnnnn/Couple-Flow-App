import { describe, expect, it } from 'vitest';
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

  getItem(key: string) {
    return this.values.get(key) ?? null;
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
