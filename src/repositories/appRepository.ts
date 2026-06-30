import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@supabase/supabase-js';
import { clearCoupleFlowStorage } from '../domain/appStorage';
import {
  budgetGroups as demoBudgetGroups,
  members as demoMembers,
  pair as demoPair,
} from '../mockData';
import type {
  Activity,
  BudgetGroup,
  DrawSession,
  Pair,
  PairMember,
  ScheduledSession,
  SessionOutcome,
  WeeklyActivityBan,
} from '../types';
import {
  createEmptyLocalAppData,
  createDemoLocalAppData,
  disableDemoSeed,
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
  syncError?: string;
}

export interface SaveResult {
  savedAt: string | null;
  mode: RepositoryMode;
}

export interface RemoteDeleteHints {
  activityIds?: string[];
  weeklyActivityBans?: {
    drawSessionId: string;
    memberId: string;
    activityId: string;
  }[];
}

export interface AppRepository {
  mode: RepositoryMode;
  hasRemoteEnv: boolean;
  loadSnapshot(): Promise<RepositorySnapshot>;
  saveSnapshot(
    data: LocalAppData,
    identity: PairIdentity | null,
    deleteHints?: RemoteDeleteHints,
  ): Promise<SaveResult>;
  createPairFromLocal(
    displayName: string,
    currentData: LocalAppData,
  ): Promise<RepositorySnapshot>;
  joinPairAndLoad(pairCode: string, displayName: string): Promise<RepositorySnapshot>;
  startFromScratch(identity: PairIdentity | null): Promise<RepositorySnapshot>;
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

function startLocalFromScratch(mode: RepositoryMode): RepositorySnapshot {
  const data = createEmptyLocalAppData();
  disableDemoSeed();
  const savedAt = saveLocalAppData(data);

  return {
    data,
    source: 'saved',
    savedAt,
    canPersist: true,
    pair: demoPair,
    members: demoMembers,
    budgetGroups: demoBudgetGroups,
    identity: loadPairIdentity(),
    mode,
  };
}

export class LocalAppRepository implements AppRepository {
  readonly mode: RepositoryMode = 'local';
  hasRemoteEnv = false;

  async loadSnapshot() {
    return localSnapshot('local');
  }

  async saveSnapshot(data: LocalAppData): Promise<SaveResult> {
    return { savedAt: saveLocalAppData(data), mode: this.mode };
  }

  async createPairFromLocal(displayName: string, currentData: LocalAppData) {
    const identity: PairIdentity = {
      pairId: demoPair.id,
      memberId: demoMembers[0]?.id ?? 'member-local',
      pairCode: 'LOCAL',
      displayName: displayName.trim() || demoMembers[0]?.display_name || '我',
    };
    savePairIdentity(identity);
    saveLocalAppData(currentData);
    return {
      ...(await this.loadSnapshot()),
      data: currentData,
      identity,
    };
  }

  async joinPairAndLoad(pairCode: string, displayName: string) {
    const identity: PairIdentity = {
      pairId: demoPair.id,
      memberId: demoMembers[0]?.id ?? 'member-local',
      pairCode: normalizePairCode(pairCode) || 'LOCAL',
      displayName: displayName.trim() || demoMembers[0]?.display_name || '我',
    };
    savePairIdentity(identity);
    return {
      ...(await this.loadSnapshot()),
      identity,
    };
  }

  async startFromScratch(_identity: PairIdentity | null = null) {
    return startLocalFromScratch(this.mode);
  }

  clearLocalData() {
    clearCoupleFlowStorage();
  }

  subscribeToPair() {
    return () => undefined;
  }
}

export class SupabaseAppRepository implements AppRepository {
  readonly mode: RepositoryMode = 'supabase';
  hasRemoteEnv = true;

  constructor(private readonly supabase: SupabaseClient) {}

  async loadSnapshot() {
    const identity = loadPairIdentity();
    if (!identity) {
      return localSnapshot('supabase');
    }

    try {
      return await this.loadSupabaseSnapshot(identity);
    } catch (error) {
      return {
        ...localSnapshot('supabase'),
        identity,
        syncError: getErrorMessage(error, '同步载入失败，请稍后重试。'),
      };
    }
  }

  async saveSnapshot(
    data: LocalAppData,
    identity: PairIdentity | null,
    deleteHints: RemoteDeleteHints = {},
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
        'draw_sessions',
        identity.pairId,
        scopedData.drawSessions,
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

    await applyRemoteDeleteHints(this.supabase, identity.pairId, deleteHints);

    return { savedAt: saveLocalAppData(scopedData), mode: this.mode };
  }

  async createPairFromLocal(displayName: string, currentData: LocalAppData) {
    const pairId = createId('pair');
    const memberId = createId('member');
    const pairCode = createPairCode();
    const createdAt = new Date().toISOString();
    const pair: SupabasePair = {
      id: pairId,
      name: `${displayName.trim() || '我们'}的双人空间`,
      pair_code: pairCode,
      timezone: demoPair.timezone,
      created_at: createdAt,
    };
    const member: PairMember = {
      id: memberId,
      pair_id: pairId,
      display_name: displayName.trim() || '我',
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
    const scopedData = scopeDataForPair(currentData, identity, new Set([memberId]));
    await this.saveSnapshot(scopedData, identity);
    return this.loadSupabaseSnapshot(identity);
  }

  async joinPairAndLoad(pairCode: string, displayName: string) {
    const normalizedCode = normalizePairCode(pairCode);
    const { data: pair, error } = await this.supabase
      .from('pairs')
      .select('*')
      .eq('pair_code', normalizedCode)
      .single<SupabasePair>();
    if (error || !pair) {
      throw new Error('没有找到这个配对码。');
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
      display_name: displayName.trim() || '我',
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
    return this.loadSupabaseSnapshot(identity);
  }

  async startFromScratch(identity: PairIdentity | null) {
    if (!identity) {
      return startLocalFromScratch('supabase');
    }

    const emptyData = createEmptyLocalAppData();
    disableDemoSeed();
    saveLocalAppData(emptyData);

    await deletePairScopedRows(this.supabase, 'session_outcomes', identity.pairId);
    await deletePairScopedRows(this.supabase, 'scheduled_sessions', identity.pairId);
    await deletePairScopedRows(this.supabase, 'weekly_activity_bans', identity.pairId);
    await deletePairScopedRows(this.supabase, 'draw_sessions', identity.pairId);
    await deletePairScopedRows(this.supabase, 'activities', identity.pairId);

    return this.loadSupabaseSnapshot(identity);
  }

  clearLocalData() {
    clearCoupleFlowStorage();
  }

  subscribeToPair(identity: PairIdentity, onSnapshot: (snapshot: RepositorySnapshot) => void) {
    const channels: RealtimeChannel[] = [
      this.channelFor(identity, 'activities', onSnapshot),
      this.channelFor(identity, 'scheduled_sessions', onSnapshot),
      this.channelFor(identity, 'session_outcomes', onSnapshot),
      this.channelFor(identity, 'weekly_activity_bans', onSnapshot),
      this.channelFor(identity, 'draw_sessions', onSnapshot),
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
          void this.loadSupabaseSnapshot(identity)
            .then(onSnapshot)
            .catch((error: Error) => {
              onSnapshot({
                ...localSnapshot('supabase'),
                identity,
                syncError: getErrorMessage(error, '同步更新失败，请稍后重试。'),
              });
            });
        },
      )
      .subscribe();
  }

  private async loadSupabaseSnapshot(identity: PairIdentity): Promise<RepositorySnapshot> {
    const [pair, members, budgetGroups, activities, drawSessions, scheduledSessions, bans, outcomes] =
      await Promise.all([
        selectSingle<SupabasePair>(this.supabase, 'pairs', identity.pairId),
        selectPairRows<PairMember>(this.supabase, 'pair_members', identity.pairId),
        selectPairRows<BudgetGroup>(this.supabase, 'budget_groups', identity.pairId),
        selectPairRows<Activity>(this.supabase, 'activities', identity.pairId),
        selectPairRows<DrawSession>(this.supabase, 'draw_sessions', identity.pairId),
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
      drawSessions,
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
    throw new Error(error.message ?? '同步请求失败。');
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
  if (rows.length) {
    const pairRows = cloneData(rows).map((row) => ({ ...row, pair_id: pairId }));
    const { error } = await supabase.from(table).upsert(pairRows);
    if (error) {
      throw error;
    }
  }
}

async function deletePairScopedRows(
  supabase: SupabaseClient,
  table: string,
  pairId: string,
) {
  const { error } = await supabase.from(table).delete().eq('pair_id', pairId);
  if (error) {
    throw error;
  }
}

async function applyRemoteDeleteHints(
  supabase: SupabaseClient,
  pairId: string,
  deleteHints: RemoteDeleteHints,
) {
  const banDeletes = uniqueBy(
    deleteHints.weeklyActivityBans ?? [],
    (ban) => `${ban.drawSessionId}:${ban.memberId}:${ban.activityId}`,
  );
  for (const ban of banDeletes) {
    await deleteWeeklyActivityBan(supabase, pairId, ban);
  }

  const activityIds = [...new Set(deleteHints.activityIds ?? [])];
  for (const activityId of activityIds) {
    await deleteOrPauseRemoteActivity(supabase, pairId, activityId);
  }
}

async function deleteWeeklyActivityBan(
  supabase: SupabaseClient,
  pairId: string,
  ban: {
    drawSessionId: string;
    memberId: string;
    activityId: string;
  },
) {
  const { error } = await supabase
    .from('weekly_activity_bans')
    .delete()
    .eq('pair_id', pairId)
    .eq('draw_session_id', ban.drawSessionId)
    .eq('member_id', ban.memberId)
    .eq('activity_id', ban.activityId);
  if (error) {
    throw error;
  }
}

async function deleteOrPauseRemoteActivity(
  supabase: SupabaseClient,
  pairId: string,
  activityId: string,
) {
  const [activities, scheduledSessions, outcomes, bans] = await Promise.all([
    selectPairRows<Activity>(supabase, 'activities', pairId),
    selectPairRows<ScheduledSession>(supabase, 'scheduled_sessions', pairId),
    selectPairRows<SessionOutcomeRow>(supabase, 'session_outcomes', pairId),
    selectPairRows<WeeklyActivityBan>(supabase, 'weekly_activity_bans', pairId),
  ]);
  const activity = activities.find((candidate) => candidate.id === activityId);
  if (!activity) {
    return;
  }

  const referenced =
    scheduledSessions.some((session) => session.activity_id === activityId) ||
    outcomes.some((outcome) => outcome.replacement_activity_id === activityId) ||
    bans.some((ban) => ban.activity_id === activityId);

  if (referenced) {
    await assertNoError(
      supabase.from('activities').upsert({ ...activity, status: 'paused' }),
    );
    return;
  }

  const { error } = await supabase
    .from('activities')
    .delete()
    .eq('pair_id', pairId)
    .eq('id', activityId);
  if (error) {
    throw error;
  }
}

function uniqueBy<T>(items: T[], keyForItem: (item: T) => string) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = keyForItem(item);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message) {
      return message;
    }
  }

  return fallback;
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
    drawSessions: data.drawSessions.map((drawSession) => ({
      ...drawSession,
      pair_id: identity.pairId,
      created_by_member_id: safeMemberId(drawSession.created_by_member_id),
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
