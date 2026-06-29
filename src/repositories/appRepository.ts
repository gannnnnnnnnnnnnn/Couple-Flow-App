import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@supabase/supabase-js';
import {
  budgetGroups as demoBudgetGroups,
  members as demoMembers,
  pair as demoPair,
} from '../mockData';
import type {
  Activity,
  BudgetGroup,
  Pair,
  PairMember,
  ScheduledSession,
  SessionOutcome,
  WeeklyActivityBan,
} from '../types';
import {
  clearLocalAppData,
  clearPairIdentity,
  createDemoLocalAppData,
  loadLocalAppData,
  loadPairIdentity,
  saveLocalAppData,
  savePairIdentity,
  type LocalAppData,
  type LocalStateLoadResult,
  type PairIdentity,
} from '../domain/localPersistence';

export type RepositoryMode = 'local' | 'supabase';

export interface RepositorySnapshot extends LocalStateLoadResult {
  pair: Pair;
  members: PairMember[];
  budgetGroups: BudgetGroup[];
  identity: PairIdentity | null;
  mode: RepositoryMode;
}

export interface SaveResult {
  savedAt: string | null;
  mode: RepositoryMode;
}

export interface AppRepository {
  mode: RepositoryMode;
  hasRemoteEnv: boolean;
  loadSnapshot(): Promise<RepositorySnapshot>;
  saveSnapshot(data: LocalAppData, identity: PairIdentity | null): Promise<SaveResult>;
  createPair(displayName: string): Promise<PairIdentity>;
  joinPair(pairCode: string, displayName: string): Promise<PairIdentity>;
  clearLocalData(): void;
  subscribeToPair(
    identity: PairIdentity,
    onSnapshot: (snapshot: RepositorySnapshot) => void,
  ): () => void;
}

type SupabasePair = Pair & { pair_code: string };
type SessionOutcomeRow = SessionOutcome & { pair_id: string };

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const MEMBER_COLORS = ['#f97362', '#7ad7bd', '#8b5cf6', '#0ea5e9'];

export function createAppRepository(): AppRepository {
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    return new SupabaseAppRepository(createClient(SUPABASE_URL, SUPABASE_ANON_KEY));
  }

  return new LocalAppRepository();
}

export function createPairCode(random = Math.random) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let index = 0; index < 6; index += 1) {
    code += alphabet[Math.floor(random() * alphabet.length) % alphabet.length];
  }
  return code;
}

export function normalizePairCode(code: string) {
  return code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function createId(prefix: string) {
  const id =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${id}`;
}

function cloneData<T>(data: T): T {
  return JSON.parse(JSON.stringify(data)) as T;
}

function localSnapshot(mode: RepositoryMode): RepositorySnapshot {
  const loaded = loadLocalAppData();
  return {
    ...loaded,
    pair: demoPair,
    members: demoMembers,
    budgetGroups: demoBudgetGroups,
    identity: loadPairIdentity(),
    mode,
  };
}

class LocalAppRepository implements AppRepository {
  readonly mode: RepositoryMode = 'local';
  hasRemoteEnv = false;

  async loadSnapshot() {
    return localSnapshot('local');
  }

  async saveSnapshot(data: LocalAppData): Promise<SaveResult> {
    return { savedAt: saveLocalAppData(data), mode: this.mode };
  }

  async createPair(displayName: string) {
    const identity: PairIdentity = {
      pairId: demoPair.id,
      memberId: demoMembers[0]?.id ?? 'member-local',
      pairCode: 'LOCAL',
      displayName: displayName.trim() || demoMembers[0]?.display_name || 'Me',
    };
    savePairIdentity(identity);
    return identity;
  }

  async joinPair(pairCode: string, displayName: string) {
    const identity: PairIdentity = {
      pairId: demoPair.id,
      memberId: demoMembers[0]?.id ?? 'member-local',
      pairCode: normalizePairCode(pairCode) || 'LOCAL',
      displayName: displayName.trim() || demoMembers[0]?.display_name || 'Me',
    };
    savePairIdentity(identity);
    return identity;
  }

  clearLocalData() {
    clearLocalAppData();
    clearPairIdentity();
  }

  subscribeToPair() {
    return () => undefined;
  }
}

class SupabaseAppRepository implements AppRepository {
  readonly mode: RepositoryMode = 'supabase';
  hasRemoteEnv = true;

  constructor(private readonly supabase: SupabaseClient) {}

  async loadSnapshot() {
    const identity = loadPairIdentity();
    if (!identity) {
      return localSnapshot('supabase');
    }

    return this.loadSupabaseSnapshot(identity);
  }

  async saveSnapshot(
    data: LocalAppData,
    identity: PairIdentity | null,
  ): Promise<SaveResult> {
    if (!identity) {
      return { savedAt: saveLocalAppData(data), mode: 'local' };
    }

    const validMemberIds = new Set(
      (await selectPairRows<PairMember>(this.supabase, 'pair_members', identity.pairId)).map(
        (member) => member.id,
      ),
    );
    const scopedData = scopeDataForPair(data, identity, validMemberIds);

    await Promise.all([
      syncPairScopedTable(
        this.supabase,
        'activities',
        identity.pairId,
        scopedData.activities,
      ),
      syncPairScopedTable(
        this.supabase,
        'scheduled_sessions',
        identity.pairId,
        scopedData.scheduledSessions,
      ),
      syncPairScopedTable(
        this.supabase,
        'weekly_activity_bans',
        identity.pairId,
        scopedData.weeklyActivityBans,
      ),
      syncPairScopedTable(
        this.supabase,
        'session_outcomes',
        identity.pairId,
        scopedData.outcomes.map((outcome) => toOutcomeRow(outcome, identity.pairId)),
      ),
    ]);

    return { savedAt: saveLocalAppData(scopedData), mode: this.mode };
  }

  async createPair(displayName: string) {
    const pairId = createId('pair');
    const memberId = createId('member');
    const pairCode = createPairCode();
    const createdAt = new Date().toISOString();
    const pair: SupabasePair = {
      id: pairId,
      name: `${displayName.trim() || 'Couple'}'s pair`,
      pair_code: pairCode,
      timezone: demoPair.timezone,
      created_at: createdAt,
    };
    const member: PairMember = {
      id: memberId,
      pair_id: pairId,
      display_name: displayName.trim() || 'Me',
      color: MEMBER_COLORS[0],
      created_at: createdAt,
    };
    const budgets = demoBudgetGroups.map((budget) => ({ ...budget, pair_id: pairId }));

    await assertNoError(this.supabase.from('pairs').insert(pair));
    await assertNoError(this.supabase.from('pair_members').insert(member));
    await assertNoError(this.supabase.from('budget_groups').upsert(budgets));

    const identity = {
      pairId,
      memberId,
      pairCode,
      displayName: member.display_name,
    };
    savePairIdentity(identity);
    return identity;
  }

  async joinPair(pairCode: string, displayName: string) {
    const normalizedCode = normalizePairCode(pairCode);
    const { data: pair, error } = await this.supabase
      .from('pairs')
      .select('*')
      .eq('pair_code', normalizedCode)
      .single<SupabasePair>();
    if (error || !pair) {
      throw new Error('Pair code not found.');
    }

    const { data: existingMembers, error: membersError } = await this.supabase
      .from('pair_members')
      .select('*')
      .eq('pair_id', pair.id)
      .returns<PairMember[]>();
    if (membersError) {
      throw membersError;
    }

    const member: PairMember = {
      id: createId('member'),
      pair_id: pair.id,
      display_name: displayName.trim() || 'Me',
      color: MEMBER_COLORS[existingMembers?.length ?? 0] ?? MEMBER_COLORS[0],
      created_at: new Date().toISOString(),
    };
    await assertNoError(this.supabase.from('pair_members').insert(member));

    const identity = {
      pairId: pair.id,
      memberId: member.id,
      pairCode: normalizedCode,
      displayName: member.display_name,
    };
    savePairIdentity(identity);
    return identity;
  }

  clearLocalData() {
    clearLocalAppData();
    clearPairIdentity();
  }

  subscribeToPair(identity: PairIdentity, onSnapshot: (snapshot: RepositorySnapshot) => void) {
    const channels: RealtimeChannel[] = [
      this.channelFor(identity, 'activities', onSnapshot),
      this.channelFor(identity, 'scheduled_sessions', onSnapshot),
      this.channelFor(identity, 'session_outcomes', onSnapshot),
      this.channelFor(identity, 'weekly_activity_bans', onSnapshot),
      this.channelFor(identity, 'pair_members', onSnapshot),
    ];

    return () => {
      channels.forEach((channel) => {
        void this.supabase.removeChannel(channel);
      });
    };
  }

  private channelFor(
    identity: PairIdentity,
    table: string,
    onSnapshot: (snapshot: RepositorySnapshot) => void,
  ) {
    return this.supabase
      .channel(`couple-flow-${table}-${identity.pairId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          filter: `pair_id=eq.${identity.pairId}`,
        },
        () => {
          void this.loadSupabaseSnapshot(identity).then(onSnapshot);
        },
      )
      .subscribe();
  }

  private async loadSupabaseSnapshot(identity: PairIdentity): Promise<RepositorySnapshot> {
    const [pair, members, budgetGroups, activities, scheduledSessions, bans, outcomes] =
      await Promise.all([
        selectSingle<SupabasePair>(this.supabase, 'pairs', identity.pairId),
        selectPairRows<PairMember>(this.supabase, 'pair_members', identity.pairId),
        selectPairRows<BudgetGroup>(this.supabase, 'budget_groups', identity.pairId),
        selectPairRows<Activity>(this.supabase, 'activities', identity.pairId),
        selectPairRows<ScheduledSession>(
          this.supabase,
          'scheduled_sessions',
          identity.pairId,
        ),
        selectPairRows<WeeklyActivityBan>(
          this.supabase,
          'weekly_activity_bans',
          identity.pairId,
        ),
        selectPairRows<SessionOutcomeRow>(
          this.supabase,
          'session_outcomes',
          identity.pairId,
        ),
      ]);

    const data: LocalAppData = {
      activities,
      scheduledSessions,
      outcomes: outcomes.map(fromOutcomeRow),
      weeklyActivityBans: bans,
      targetWeekStart: loadLocalAppData().data.targetWeekStart,
      budgetFilter: loadLocalAppData().data.budgetFilter,
    };
    const savedAt = saveLocalAppData(data);

    return {
      data,
      source: 'saved',
      savedAt,
      canPersist: true,
      pair: pair ?? { ...demoPair, id: identity.pairId, name: identity.pairCode },
      members: members.length ? members : demoMembers,
      budgetGroups: budgetGroups.length ? budgetGroups : demoBudgetGroups,
      identity,
      mode: this.mode,
    };
  }
}

async function assertNoError<T>(
  request: PromiseLike<{ error: { message?: string } | null; data: T | null }>,
) {
  const { error } = await request;
  if (error) {
    throw new Error(error.message ?? 'Supabase request failed.');
  }
}

async function selectSingle<T>(
  supabase: SupabaseClient,
  table: string,
  id: string,
): Promise<T | null> {
  const { data, error } = await supabase.from(table).select('*').eq('id', id).maybeSingle<T>();
  if (error) {
    throw error;
  }
  return data;
}

async function selectPairRows<T>(
  supabase: SupabaseClient,
  table: string,
  pairId: string,
): Promise<T[]> {
  const { data, error } = await supabase.from(table).select('*').eq('pair_id', pairId).returns<T[]>();
  if (error) {
    throw error;
  }
  return data ?? [];
}

async function syncPairScopedTable<T extends { id: string }>(
  supabase: SupabaseClient,
  table: string,
  pairId: string,
  rows: T[],
) {
  const { data: existing, error: selectError } = await supabase
    .from(table)
    .select('id')
    .eq('pair_id', pairId)
    .returns<{ id: string }[]>();
  if (selectError) {
    throw selectError;
  }

  const nextIds = new Set(rows.map((row) => row.id));
  const staleIds = (existing ?? [])
    .map((row) => row.id)
    .filter((id) => !nextIds.has(id));

  if (staleIds.length) {
    const { error } = await supabase.from(table).delete().in('id', staleIds);
    if (error) {
      throw error;
    }
  }

  if (rows.length) {
    const { error } = await supabase.from(table).upsert(cloneData(rows));
    if (error) {
      throw error;
    }
  }
}

function toOutcomeRow(outcome: SessionOutcome, pairId: string): SessionOutcomeRow {
  return { ...outcome, pair_id: pairId };
}

function fromOutcomeRow(row: SessionOutcomeRow): SessionOutcome {
  const { pair_id: _pairId, ...outcome } = row;
  return outcome;
}

function scopeDataForPair(
  data: LocalAppData,
  identity: PairIdentity,
  validMemberIds: Set<string>,
): LocalAppData {
  const safeMemberId = (memberId: string) =>
    validMemberIds.has(memberId) ? memberId : identity.memberId;

  return {
    ...data,
    activities: data.activities.map((activity) => ({
      ...activity,
      pair_id: identity.pairId,
      created_by_member_id: safeMemberId(activity.created_by_member_id),
    })),
    scheduledSessions: data.scheduledSessions.map((session) => ({
      ...session,
      pair_id: identity.pairId,
    })),
    weeklyActivityBans: data.weeklyActivityBans.map((ban) => ({
      ...ban,
      pair_id: identity.pairId,
      member_id: safeMemberId(ban.member_id),
    })),
    outcomes: data.outcomes.map((outcome) => ({
      ...outcome,
      agreed_by_member_ids: outcome.agreed_by_member_ids.map(safeMemberId),
    })),
  };
}
