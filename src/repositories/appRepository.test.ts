import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createDemoLocalAppData } from '../domain/localPersistence';
import {
  SupabaseAppRepository,
  createPairCode,
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
    scheduled_sessions: [],
    weekly_activity_bans: [],
    session_outcomes: [],
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
    this.client.operations.push({ table: this.table, type: 'delete' });
    return {
      in: () => Promise.resolve({ data: null, error: null }),
    };
  }

  private filteredRows() {
    return (this.client.tables[this.table] ?? []).filter((row) =>
      this.filters.every((filter) => row[filter.column] === filter.value),
    );
  }
}

describe('repository helpers', () => {
  it('normalizes pair codes for joins', () => {
    expect(normalizePairCode(' ab-12 c ')).toBe('AB12C');
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
});
