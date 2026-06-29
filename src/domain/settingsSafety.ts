import type { PairIdentity } from './localPersistence';

export interface SettingsSafetyInput {
  hasRemoteEnv: boolean;
  identity: PairIdentity | null;
}

export interface SettingsSafetyCopy {
  clearActionLabel: string;
  clearConfirmation: string;
  resetDemoDisabled: boolean;
  resetDemoMessage: string | null;
  syncStatusLabel: string;
}

export interface RuntimeSyncStatusInput extends SettingsSafetyInput {
  error: string | null;
  savedAt: string | null;
  syncing: boolean;
}

export interface RuntimeSyncStatusCopy {
  detail: string;
  error: string | null;
  lastSaved: string | null;
  status: string;
}

export type ImportDataResult =
  | { status: 'success' }
  | { status: 'cancelled' }
  | { status: 'error'; message: string };

export function getSettingsSafetyCopy({
  hasRemoteEnv,
  identity,
}: SettingsSafetyInput): SettingsSafetyCopy {
  if (identity) {
    return {
      clearActionLabel: 'Disconnect this device',
      clearConfirmation:
        'Disconnect this device from the pair? Remote shared pair data will not be deleted or changed.',
      resetDemoDisabled: true,
      resetDemoMessage: 'Demo reset is disabled while connected to a pair.',
      syncStatusLabel: hasRemoteEnv
        ? `Connected to pair code ${identity.pairCode}`
        : 'Local only: Supabase env missing',
    };
  }

  return {
    clearActionLabel: 'Clear this device data',
    clearConfirmation:
      'Clear data saved on this device? Remote pair data will not be affected.',
    resetDemoDisabled: false,
    resetDemoMessage: null,
    syncStatusLabel: hasRemoteEnv
      ? 'Sync available, not connected'
      : 'Local only: Supabase env missing',
  };
}

export function getRuntimeSyncStatusCopy({
  error,
  hasRemoteEnv,
  identity,
  savedAt,
  syncing,
}: RuntimeSyncStatusInput): RuntimeSyncStatusCopy {
  const lastSaved = savedAt ? `Last saved ${formatSavedTime(savedAt)}` : null;

  if (!hasRemoteEnv) {
    return {
      detail: 'Local mode is fully usable on this device.',
      error,
      lastSaved,
      status: 'Local only: Supabase env missing',
    };
  }

  if (!identity) {
    return {
      detail: 'Create or join a pair code to load shared data.',
      error,
      lastSaved,
      status: syncing ? 'Preparing sync' : 'Sync available, not connected',
    };
  }

  return {
    detail: `Pair code ${identity.pairCode} as ${identity.displayName}`,
    error,
    lastSaved,
    status: syncing ? 'Syncing' : 'Connected',
  };
}

export function getPairCodeClipboardText(pairCode: string) {
  return pairCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function formatSavedTime(savedAt: string) {
  return new Date(savedAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getImportResultMessage(result: ImportDataResult) {
  if (result.status === 'success') {
    return 'Backup imported on this device.';
  }

  if (result.status === 'error') {
    return result.message;
  }

  return null;
}
