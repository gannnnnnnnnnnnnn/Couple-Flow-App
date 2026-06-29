import {
  activities as demoActivities,
  scheduledSessions as demoScheduledSessions,
  sessionOutcomes as demoOutcomes,
  weeklyActivityBans as demoWeeklyActivityBans,
} from '../mockData';
import type {
  Activity,
  BudgetFilter,
  ScheduledSession,
  SessionOutcome,
  WeeklyActivityBan,
} from '../types';

export const LOCAL_STATE_STORAGE_KEY = 'couple-flow.local-state.v1';

export interface LocalAppData {
  activities: Activity[];
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

export type LocalStateSource = 'saved' | 'demo';

export interface LocalStateLoadResult {
  data: LocalAppData;
  source: LocalStateSource;
  savedAt: string | null;
  canPersist: boolean;
}

function cloneData<T>(data: T): T {
  return JSON.parse(JSON.stringify(data)) as T;
}

export function createDemoLocalAppData(): LocalAppData {
  return {
    activities: cloneData(demoActivities),
    scheduledSessions: cloneData(demoScheduledSessions),
    outcomes: cloneData(demoOutcomes),
    weeklyActivityBans: cloneData(demoWeeklyActivityBans),
    targetWeekStart: '',
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
  try {
    raw = storage.getItem(LOCAL_STATE_STORAGE_KEY);
  } catch {
    return {
      data: createDemoLocalAppData(),
      source: 'demo',
      savedAt: null,
      canPersist: false,
    };
  }
  if (!raw) {
    return {
      data: createDemoLocalAppData(),
      source: 'demo',
      savedAt: null,
      canPersist: true,
    };
  }

  const persisted = parsePersistedLocalAppData(raw);
  if (!persisted) {
    return {
      data: createDemoLocalAppData(),
      source: 'demo',
      savedAt: null,
      canPersist: true,
    };
  }

  return {
    data: cloneData(persisted.data),
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
    Array.isArray(candidate.scheduledSessions) &&
    Array.isArray(candidate.outcomes) &&
    Array.isArray(candidate.weeklyActivityBans) &&
    typeof candidate.targetWeekStart === 'string' &&
    typeof candidate.budgetFilter === 'string'
  );
}
