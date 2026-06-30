import {
  activities as demoActivities,
  drawSessions as demoDrawSessions,
  scheduledSessions as demoScheduledSessions,
  sessionOutcomes as demoOutcomes,
  weeklyActivityBans as demoWeeklyActivityBans,
} from '../mockData';
import type {
  Activity,
  BudgetFilter,
  DrawSession,
  ScheduledSession,
  SessionOutcome,
  WeeklyActivityBan,
} from '../types';
import { getNextWeekStartDate, getWeekStartDate } from './week';

export const LOCAL_STATE_STORAGE_KEY = 'couple-flow.local-state.v1';
export const PAIR_IDENTITY_STORAGE_KEY = 'couple-flow.pair-identity.v1';
export const DEMO_DISABLED_STORAGE_KEY = 'couple-flow.demo-disabled.v1';
const DEFAULT_PAIR_TIMEZONE = 'Australia/Melbourne';

export interface LocalAppData {
  activities: Activity[];
  drawSessions: DrawSession[];
  scheduledSessions: ScheduledSession[];
  outcomes: SessionOutcome[];
  weeklyActivityBans: WeeklyActivityBan[];
  targetWeekStart: string;
  budgetFilter: BudgetFilter;
}

export interface PersistedLocalAppData {
  version: 1;
  savedAt: string;
  data: LocalAppData;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export type LocalStateSource = 'saved' | 'demo' | 'empty';

export interface LocalStateLoadResult {
  data: LocalAppData;
  source: LocalStateSource;
  savedAt: string | null;
  canPersist: boolean;
}

export interface PairIdentity {
  pairId: string;
  memberId: string;
  pairCode: string;
  displayName: string;
}

function cloneData<T>(data: T): T {
  return JSON.parse(JSON.stringify(data)) as T;
}

export function createDemoLocalAppData(): LocalAppData {
  return {
    activities: cloneData(demoActivities),
    drawSessions: cloneData(demoDrawSessions),
    scheduledSessions: cloneData(demoScheduledSessions),
    outcomes: cloneData(demoOutcomes),
    weeklyActivityBans: cloneData(demoWeeklyActivityBans),
    targetWeekStart: '',
    budgetFilter: 'all',
  };
}

export function createEmptyLocalAppData(now = new Date()): LocalAppData {
  return {
    activities: [],
    drawSessions: [],
    scheduledSessions: [],
    outcomes: [],
    weeklyActivityBans: [],
    targetWeekStart: getNextWeekStartDate(getWeekStartDate(now, DEFAULT_PAIR_TIMEZONE)),
    budgetFilter: 'all',
  };
}

export function getBrowserStorage(): StorageLike | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function loadLocalAppData(
  storage: StorageLike | null = getBrowserStorage(),
): LocalStateLoadResult {
  if (!storage) {
    return {
      data: createDemoLocalAppData(),
      source: 'demo',
      savedAt: null,
      canPersist: false,
    };
  }

  let raw: string | null;
  let demoDisabled = false;
  try {
    raw = storage.getItem(LOCAL_STATE_STORAGE_KEY);
    demoDisabled = isDemoSeedDisabled(storage);
  } catch {
    return {
      data: createDemoLocalAppData(),
      source: 'demo',
      savedAt: null,
      canPersist: false,
    };
  }
  if (!raw) {
    if (demoDisabled) {
      return {
        data: createEmptyLocalAppData(),
        source: 'empty',
        savedAt: null,
        canPersist: true,
      };
    }

    return {
      data: createDemoLocalAppData(),
      source: 'demo',
      savedAt: null,
      canPersist: true,
    };
  }

  const persisted = parsePersistedLocalAppData(raw);
  if (!persisted) {
    if (demoDisabled) {
      return {
        data: createEmptyLocalAppData(),
        source: 'empty',
        savedAt: null,
        canPersist: true,
      };
    }

    return {
      data: createDemoLocalAppData(),
      source: 'demo',
      savedAt: null,
      canPersist: true,
    };
  }

  return {
    data: normalizeLocalAppData(persisted.data),
    source: 'saved',
    savedAt: persisted.savedAt,
    canPersist: true,
  };
}

export function saveLocalAppData(
  data: LocalAppData,
  storage: StorageLike | null = getBrowserStorage(),
  now = new Date(),
) {
  if (!storage) {
    return null;
  }

  const savedAt = now.toISOString();
  const payload: PersistedLocalAppData = {
    version: 1,
    savedAt,
    data: cloneData(data),
  };

  try {
    storage.setItem(LOCAL_STATE_STORAGE_KEY, JSON.stringify(payload));
    return savedAt;
  } catch {
    return null;
  }
}

export function clearLocalAppData(storage: StorageLike | null = getBrowserStorage()) {
  try {
    storage?.removeItem(LOCAL_STATE_STORAGE_KEY);
  } catch {
    return;
  }
}

export function disableDemoSeed(storage: StorageLike | null = getBrowserStorage()) {
  try {
    storage?.setItem(DEMO_DISABLED_STORAGE_KEY, 'true');
  } catch {
    return;
  }
}

export function enableDemoSeed(storage: StorageLike | null = getBrowserStorage()) {
  try {
    storage?.removeItem(DEMO_DISABLED_STORAGE_KEY);
  } catch {
    return;
  }
}

export function isDemoSeedDisabled(storage: StorageLike | null = getBrowserStorage()) {
  try {
    return storage?.getItem(DEMO_DISABLED_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function loadPairIdentity(
  storage: StorageLike | null = getBrowserStorage(),
): PairIdentity | null {
  if (!storage) {
    return null;
  }

  try {
    const raw = storage.getItem(PAIR_IDENTITY_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed: unknown = JSON.parse(raw);
    return isPairIdentity(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function savePairIdentity(
  identity: PairIdentity,
  storage: StorageLike | null = getBrowserStorage(),
) {
  try {
    storage?.setItem(PAIR_IDENTITY_STORAGE_KEY, JSON.stringify(identity));
  } catch {
    return;
  }
}

export function clearPairIdentity(storage: StorageLike | null = getBrowserStorage()) {
  try {
    storage?.removeItem(PAIR_IDENTITY_STORAGE_KEY);
  } catch {
    return;
  }
}

export function parsePersistedLocalAppData(raw: string): PersistedLocalAppData | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isPersistedLocalAppData(parsed)) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function isPersistedLocalAppData(value: unknown): value is PersistedLocalAppData {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<PersistedLocalAppData>;
  return (
    candidate.version === 1 &&
    typeof candidate.savedAt === 'string' &&
    isLocalAppData(candidate.data)
  );
}

function isLocalAppData(value: unknown): value is LocalAppData {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<LocalAppData>;
  return (
    Array.isArray(candidate.activities) &&
    (candidate.drawSessions === undefined || Array.isArray(candidate.drawSessions)) &&
    Array.isArray(candidate.scheduledSessions) &&
    Array.isArray(candidate.outcomes) &&
    Array.isArray(candidate.weeklyActivityBans) &&
    typeof candidate.targetWeekStart === 'string' &&
    typeof candidate.budgetFilter === 'string'
  );
}

export function normalizeLocalAppData(data: LocalAppData): LocalAppData {
  return {
    ...cloneData(data),
    drawSessions: Array.isArray(data.drawSessions) ? cloneData(data.drawSessions) : [],
  };
}

function isPairIdentity(value: unknown): value is PairIdentity {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<PairIdentity>;
  return (
    typeof candidate.pairId === 'string' &&
    typeof candidate.memberId === 'string' &&
    typeof candidate.pairCode === 'string' &&
    typeof candidate.displayName === 'string'
  );
}
