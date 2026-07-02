import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  getLocalAppDataFingerprint,
  shouldSkipAutosaveForSnapshot,
} from '../domain/autosave';
import {
  createDemoLocalAppData,
  savePairIdentity,
  type StorageLike,
} from '../domain/localPersistence';
import {
  LocalAppRepository,
  SupabaseAppRepository,
  createPairCode,
  normalizeDisplayName,
  normalizePairCode,
} from './appRepository';

type Operation = {
  table: string;
  type: 'delete' | 'insert' | 'select' | 'upsert';
  rows?: unknown[];
};

class FakeSupabase {
  operations: Operation[] = [];
  tables: Record<string, Record<string, unknown>[]> = {
    pairs: [
      {
        id: 'pair-remote',
        name: 'Remote pair',
        pair_code: 'ABC123',
        timezone: 'Australia/Melbourne',
        created_at: '2026-06-29T00:00:00.000Z',
      },
    ],
    pair_members: [
      {
        id: 'member-existing',
        pair_id: 'pair-remote',
        display_name: 'Existing',
        color: '#f97362',
        created_at: '2026-06-29T00:00:00.000Z',
      },
    ],
    budget_groups: [
      {
        id: 'budget-tiny',
        pair_id: 'pair-remote',
        name: 'tiny',
        amount_hint: '$',
        sort_order: 1,
      },
    ],
    activities: [
      {
        id: 'activity-remote-only',
        pair_id: 'pair-remote',
        title: 'Remote only',
        note: '',
        budget_group_id: 'budget-tiny',
        duration_minutes: 30,
        tags: [],
        created_by_member_id: 'member-existing',
        status: 'active',
        created_at: '2026-06-29T00:00:00.000Z',
      },
    ],
    draw_sessions: [
      {
        id: 'draw-1',
        pair_id: 'pair-remote',
        target_week_start_date: '2026-06-29',
        created_by_member_id: 'member-existing',
        status: 'revealed',
        result_activity_id: 'activity-remote-only',
        pending_action_type: null,
        requested_by_member_id: null,
        agreed_by_member_ids: [],
        created_at: '2026-06-29T00:00:00.000Z',
      },
    ],
    scheduled_sessions: [
      {
        id: 'session-remote',
        pair_id: 'pair-remote',
        activity_id: 'activity-remote-only',
        draw_session_id: 'draw-1',
        target_week_start_date: '2026-06-29',
        status: 'ongoing',
        todo_text: '',
        pending_action_type: null,
        pending_requested_by_member_id: null,
        pending_agreed_by_member_ids: [],
        pending_target_week_start_date: null,
        pending_replacement_activity_id: null,
        pending_reason: null,
        created_at: '2026-06-29T00:00:00.000Z',
      },
    ],
    weekly_activity_bans: [
      {
        id: 'ban-remote',
        draw_session_id: 'draw-1',
        pair_id: 'pair-remote',
        member_id: 'member-existing',
        activity_id: 'activity-remote-only',
        created_at: '2026-06-29T00:00:00.000Z',
      },
    ],
    session_outcomes: [
      {
        id: 'outcome-remote',
        pair_id: 'pair-remote',
        scheduled_session_id: 'session-remote',
        outcome_type: 'completed',
        rating: 'NPC',
        reason: null,
        replacement_activity_id: null,
        agreed_by_member_ids: ['member-existing'],
        created_at: '2026-06-29T00:00:00.000Z',
      },
    ],
  };

  from(table: string) {
    return new FakeQuery(this, table);
  }

  channel() {
    return {
      on: () => this.channel(),
      subscribe: () => this.channel(),
    };
  }

  removeChannel() {
    return Promise.resolve();
  }
}

class MemoryStorage implements StorageLike {
  private values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

class FailingSupabase {
  from() {
    const failure = { data: null, error: { message: '远端数据表还没准备好。' } };
    return {
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve(failure),
          returns: () => Promise.resolve(failure),
        }),
      }),
    };
  }
}

class FakeQuery {
  private filters: { column: string; value: unknown }[] = [];

  constructor(
    private readonly client: FakeSupabase,
    private readonly table: string,
  ) {}

  select() {
    this.client.operations.push({ table: this.table, type: 'select' });
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push({ column, value });
    return this;
  }

  single<T>() {
    return Promise.resolve({ data: this.filteredRows()[0] as T, error: null });
  }

  maybeSingle<T>() {
    return Promise.resolve({ data: (this.filteredRows()[0] ?? null) as T | null, error: null });
  }

  returns<T>() {
    return Promise.resolve({ data: this.filteredRows() as T, error: null });
  }

  insert(rows: unknown) {
    const nextRows = Array.isArray(rows) ? rows : [rows];
    this.client.operations.push({ table: this.table, type: 'insert', rows: nextRows });
    this.client.tables[this.table] = [...(this.client.tables[this.table] ?? []), ...nextRows];
    return Promise.resolve({ data: null, error: null });
  }

  upsert(rows: unknown) {
    const nextRows = Array.isArray(rows) ? rows : [rows];
    this.client.operations.push({ table: this.table, type: 'upsert', rows: nextRows });
    const byId = new Map(
      (this.client.tables[this.table] ?? []).map((row) => [String(row.id), row]),
    );
    nextRows.forEach((row) => {
      const typedRow = row as Record<string, unknown>;
      byId.set(String(typedRow.id), typedRow);
    });
    this.client.tables[this.table] = [...byId.values()];
    return Promise.resolve({ data: null, error: null });
  }

  delete() {
    return new FakeDeleteQuery(this.client, this.table);
  }

  private filteredRows() {
    return (this.client.tables[this.table] ?? []).filter((row) =>
      this.filters.every((filter) => row[filter.column] === filter.value),
    );
  }
}

class FakeDeleteQuery implements PromiseLike<{ data: null; error: null }> {
  private filters: { column: string; value: unknown }[] = [];

  constructor(
    private readonly client: FakeSupabase,
    private readonly table: string,
  ) {}

  eq(column: string, value: unknown) {
    this.filters.push({ column, value });
    return this;
  }

  in(column: string, values: unknown[]) {
    this.client.operations.push({ table: this.table, type: 'delete' });
    this.client.tables[this.table] = (this.client.tables[this.table] ?? []).filter(
      (row) => !values.includes(row[column]),
    );
    return Promise.resolve({ data: null, error: null });
  }

  then<TResult1 = { data: null; error: null }, TResult2 = never>(
    onfulfilled?:
      | ((value: { data: null; error: null }) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    this.client.operations.push({ table: this.table, type: 'delete' });
    this.client.tables[this.table] = (this.client.tables[this.table] ?? []).filter(
      (row) => !this.filters.every((filter) => row[filter.column] === filter.value),
    );
    return Promise.resolve({ data: null, error: null }).then(onfulfilled, onrejected);
  }
}

describe('repository helpers', () => {
  it('normalizes pair codes for joins', () => {
    expect(normalizePairCode(' ab-12 c ')).toBe('AB12C');
  });

  it('normalizes display names for member reuse', () => {
    expect(normalizeDisplayName(' Existing ')).toBe('existing');
  });

  it('creates readable six-character pair codes', () => {
    expect(createPairCode(() => 0.1)).toMatch(/^[A-Z0-9]{6}$/);
    expect(createPairCode(() => 0.1)).toHaveLength(6);
  });

  it('joining a pair hydrates remote data without saving stale local data', async () => {
    const fake = new FakeSupabase();
    const repository = new SupabaseAppRepository(fake as unknown as SupabaseClient);

    const snapshot = await repository.joinPairAndLoad('abc123', 'New member');

    expect(snapshot.identity?.pairId).toBe('pair-remote');
    expect(snapshot.data.activities).toEqual([
      expect.objectContaining({ id: 'activity-remote-only' }),
    ]);
    expect(fake.operations).toContainEqual(
      expect.objectContaining({ table: 'pair_members', type: 'insert' }),
    );
    expect(
      fake.operations.filter(
        (operation) =>
          operation.type === 'upsert' &&
          ['activities', 'scheduled_sessions', 'session_outcomes', 'weekly_activity_bans'].includes(
            operation.table,
          ),
      ),
    ).toEqual([]);
  });

  it('joining with the same display name reuses the existing member', async () => {
    const fake = new FakeSupabase();
    const repository = new SupabaseAppRepository(fake as unknown as SupabaseClient);

    const snapshot = await repository.joinPairAndLoad('abc123', ' existing ');

    expect(snapshot.identity?.memberId).toBe('member-existing');
    expect(snapshot.identity?.displayName).toBe('Existing');
    expect(
      fake.operations.filter(
        (operation) => operation.table === 'pair_members' && operation.type === 'insert',
      ),
    ).toEqual([]);
    expect(fake.tables.pair_members).toHaveLength(1);
  });

  it('joining with a different display name creates a new member', async () => {
    const fake = new FakeSupabase();
    const repository = new SupabaseAppRepository(fake as unknown as SupabaseClient);

    const snapshot = await repository.joinPairAndLoad('abc123', 'New member');

    expect(snapshot.identity?.memberId).not.toBe('member-existing');
    expect(snapshot.identity?.displayName).toBe('New member');
    expect(
      fake.operations.filter(
        (operation) => operation.table === 'pair_members' && operation.type === 'insert',
      ),
    ).toHaveLength(1);
    expect(fake.tables.pair_members).toHaveLength(2);
  });

  it('creating a pair intentionally migrates current local data', async () => {
    const fake = new FakeSupabase();
    const repository = new SupabaseAppRepository(fake as unknown as SupabaseClient);
    const localData = createDemoLocalAppData();
    localData.activities = [
      {
        ...localData.activities[0],
        id: 'activity-local-migrate',
        title: 'Local migrate',
      },
    ];

    const snapshot = await repository.createPairFromLocal('Alex', localData);

    expect(snapshot.identity?.pairCode).toHaveLength(6);
    expect(fake.operations).toContainEqual(
      expect.objectContaining({ table: 'activities', type: 'upsert' }),
    );
    const migratedActivities = fake.operations.find(
      (operation) => operation.table === 'activities' && operation.type === 'upsert',
    )?.rows as Record<string, unknown>[];
    expect(migratedActivities).toEqual([
      expect.objectContaining({
        id: 'activity-local-migrate',
        pair_id: snapshot.identity?.pairId,
        title: 'Local migrate',
      }),
    ]);
  });

  it('normal autosave upserts without deleting remote-only rows', async () => {
    const fake = new FakeSupabase();
    const repository = new SupabaseAppRepository(fake as unknown as SupabaseClient);
    const localData = createDemoLocalAppData();
    localData.activities = [];

    await repository.saveSnapshot(localData, {
      pairId: 'pair-remote',
      memberId: 'member-existing',
      pairCode: 'ABC123',
      displayName: 'Existing',
    });

    expect(fake.operations.some((operation) => operation.type === 'delete')).toBe(false);
    expect(fake.tables.activities).toEqual([
      expect.objectContaining({ id: 'activity-remote-only' }),
    ]);
  });

  it('Supabase save preserves scheduled-session pending plan action fields', async () => {
    const fake = new FakeSupabase();
    const repository = new SupabaseAppRepository(fake as unknown as SupabaseClient);
    const localData = createDemoLocalAppData();
    localData.scheduledSessions = [
      {
        ...localData.scheduledSessions[0],
        id: 'session-pending',
        pending_action_type: 'move_week',
        pending_requested_by_member_id: 'member-existing',
        pending_agreed_by_member_ids: ['member-existing'],
        pending_target_week_start_date: '2026-07-06',
        pending_replacement_activity_id: null,
        pending_reason: null,
      },
    ];

    await repository.saveSnapshot(localData, {
      pairId: 'pair-remote',
      memberId: 'member-existing',
      pairCode: 'ABC123',
      displayName: 'Existing',
    });

    const scheduledUpsert = fake.operations.find(
      (operation) => operation.table === 'scheduled_sessions' && operation.type === 'upsert',
    )?.rows as Record<string, unknown>[];

    expect(scheduledUpsert).toEqual([
      expect.objectContaining({
        id: 'session-pending',
        pair_id: 'pair-remote',
        pending_action_type: 'move_week',
        pending_requested_by_member_id: 'member-existing',
        pending_agreed_by_member_ids: ['member-existing'],
        pending_target_week_start_date: '2026-07-06',
      }),
    ]);
  });

  it('Supabase load failure returns a visible local recovery snapshot', async () => {
    const storage = new MemoryStorage();
    const originalWindow = globalThis.window;
    savePairIdentity(
      {
        pairId: 'pair-remote',
        memberId: 'member-existing',
        pairCode: 'ABC123',
        displayName: 'Existing',
      },
      storage,
    );
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: { localStorage: storage },
    });

    try {
      const repository = new SupabaseAppRepository(
        new FailingSupabase() as unknown as SupabaseClient,
      );
      const snapshot = await repository.loadSnapshot();

      expect(snapshot.data.activities.length).toBeGreaterThan(0);
      expect(snapshot.identity?.pairId).toBe('pair-remote');
      expect(snapshot.syncError).toBe('远端数据表还没准备好。');
    } finally {
      Object.defineProperty(globalThis, 'window', {
        configurable: true,
        value: originalWindow,
      });
    }
  });

  it('deletes removed own weekly bans even if realtime matched before debounce', async () => {
    const fake = new FakeSupabase();
    const repository = new SupabaseAppRepository(fake as unknown as SupabaseClient);
    const localData = createDemoLocalAppData();
    localData.weeklyActivityBans = [];
    const currentFingerprint = getLocalAppDataFingerprint(localData);

    expect(
      shouldSkipAutosaveForSnapshot({
        currentFingerprint,
        hasPendingRemoteDeletes: true,
        lastSavedFingerprint: currentFingerprint,
        remoteFingerprint: currentFingerprint,
      }),
    ).toBe(false);

    await repository.saveSnapshot(
      localData,
      {
        pairId: 'pair-remote',
        memberId: 'member-existing',
        pairCode: 'ABC123',
        displayName: 'Existing',
      },
      {
        weeklyActivityBans: [
          {
            drawSessionId: 'draw-1',
            memberId: 'member-existing',
            activityId: 'activity-remote-only',
          },
        ],
      },
    );

    expect(fake.tables.weekly_activity_bans).toEqual([]);
    const reloaded = await repository.joinPairAndLoad('ABC123', 'Reload');
    expect(reloaded.data.weeklyActivityBans).toEqual([]);
    expect(
      fake.operations.filter(
        (operation) => operation.table === 'weekly_activity_bans' && operation.type === 'delete',
      ),
    ).toHaveLength(1);
  });

  it('does not delete partner weekly bans without a matching member-scoped hint', async () => {
    const fake = new FakeSupabase();
    const repository = new SupabaseAppRepository(fake as unknown as SupabaseClient);
    const localData = createDemoLocalAppData();
    localData.weeklyActivityBans = [];

    await repository.saveSnapshot(
      localData,
      {
        pairId: 'pair-remote',
        memberId: 'member-existing',
        pairCode: 'ABC123',
        displayName: 'Existing',
      },
      {
        weeklyActivityBans: [
          {
            drawSessionId: 'draw-1',
            memberId: 'member-other',
            activityId: 'activity-remote-only',
          },
        ],
      },
    );

    expect(fake.tables.weekly_activity_bans).toEqual([
      expect.objectContaining({ id: 'ban-remote', member_id: 'member-existing' }),
    ]);
  });

  it('deletes an unreferenced activity when the UI explicitly removed it', async () => {
    const fake = new FakeSupabase();
    fake.tables.scheduled_sessions = [];
    fake.tables.session_outcomes = [];
    fake.tables.weekly_activity_bans = [];
    const repository = new SupabaseAppRepository(fake as unknown as SupabaseClient);
    const localData = createDemoLocalAppData();
    localData.activities = [];

    await repository.saveSnapshot(
      localData,
      {
        pairId: 'pair-remote',
        memberId: 'member-existing',
        pairCode: 'ABC123',
        displayName: 'Existing',
      },
      { activityIds: ['activity-remote-only'] },
    );

    expect(fake.tables.activities).toEqual(
      expect.not.arrayContaining([
        expect.objectContaining({ id: 'activity-remote-only' }),
      ]),
    );
  });

  it('pauses a remotely referenced activity instead of deleting it', async () => {
    const fake = new FakeSupabase();
    const repository = new SupabaseAppRepository(fake as unknown as SupabaseClient);
    const localData = createDemoLocalAppData();
    localData.activities = [];

    await repository.saveSnapshot(
      localData,
      {
        pairId: 'pair-remote',
        memberId: 'member-existing',
        pairCode: 'ABC123',
        displayName: 'Existing',
      },
      { activityIds: ['activity-remote-only'] },
    );

    expect(fake.tables.activities).toEqual([
      expect.objectContaining({ id: 'activity-remote-only', status: 'paused' }),
    ]);
  });

  it('local start from scratch returns empty app data', async () => {
    const repository = new LocalAppRepository();

    const snapshot = await repository.startFromScratch(null);

    expect(snapshot.data.activities).toEqual([]);
    expect(snapshot.data.scheduledSessions).toEqual([]);
    expect(snapshot.data.outcomes).toEqual([]);
    expect(snapshot.data.weeklyActivityBans).toEqual([]);
    expect(snapshot.data.budgetFilter).toBe('all');
  });

  it('Supabase start from scratch deletes pair data in safe order and preserves pair metadata', async () => {
    const fake = new FakeSupabase();
    const repository = new SupabaseAppRepository(fake as unknown as SupabaseClient);

    const snapshot = await repository.startFromScratch({
      pairId: 'pair-remote',
      memberId: 'member-existing',
      pairCode: 'ABC123',
      displayName: 'Existing',
    });

    expect(
      fake.operations
        .filter((operation) => operation.type === 'delete')
        .map((operation) => operation.table),
    ).toEqual([
      'session_outcomes',
      'scheduled_sessions',
      'weekly_activity_bans',
      'draw_sessions',
      'activities',
    ]);
    expect(snapshot.identity?.pairCode).toBe('ABC123');
    expect(snapshot.pair).toEqual(expect.objectContaining({ id: 'pair-remote' }));
    expect(snapshot.members).toEqual([
      expect.objectContaining({ id: 'member-existing' }),
    ]);
    expect(snapshot.budgetGroups).toEqual([
      expect.objectContaining({ id: 'budget-tiny' }),
    ]);
    expect(snapshot.data.activities).toEqual([]);
    expect(snapshot.data.drawSessions).toEqual([]);
    expect(snapshot.data.scheduledSessions).toEqual([]);
    expect(snapshot.data.weeklyActivityBans).toEqual([]);
    expect(snapshot.data.outcomes).toEqual([]);
  });
});
