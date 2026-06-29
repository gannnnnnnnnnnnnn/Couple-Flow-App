import type { LocalAppData } from './localPersistence';

export const BACKUP_SCHEMA_VERSION = 1;

export interface AppBackupFile {
  app: 'couple-flow';
  schemaVersion: typeof BACKUP_SCHEMA_VERSION;
  exportedAt: string;
  data: LocalAppData;
}

export type BackupParseResult =
  | { ok: true; backup: AppBackupFile }
  | { ok: false; error: string };

export function createAppBackup(data: LocalAppData, now = new Date()): AppBackupFile {
  return {
    app: 'couple-flow',
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: now.toISOString(),
    data: cloneData(data),
  };
}

export function stringifyAppBackup(data: LocalAppData, now = new Date()) {
  return JSON.stringify(createAppBackup(data, now), null, 2);
}

export function parseAppBackupJson(raw: string): BackupParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: 'Backup file is not valid JSON.' };
  }

  if (!isBackupFile(parsed)) {
    return { ok: false, error: 'Backup file does not match Couple Flow data.' };
  }

  return { ok: true, backup: cloneData(parsed) };
}

function cloneData<T>(data: T): T {
  return JSON.parse(JSON.stringify(data)) as T;
}

function isBackupFile(value: unknown): value is AppBackupFile {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<AppBackupFile>;
  return (
    candidate.app === 'couple-flow' &&
    candidate.schemaVersion === BACKUP_SCHEMA_VERSION &&
    typeof candidate.exportedAt === 'string' &&
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
