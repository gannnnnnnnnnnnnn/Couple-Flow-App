import type { LocalAppData } from './localPersistence';

export const AUTOSAVE_DEBOUNCE_MS = 600;
export const SYNCING_VISIBILITY_DELAY_MS = 300;

export function getLocalAppDataFingerprint(data: LocalAppData) {
  return JSON.stringify(data);
}

export function shouldSkipAutosaveForSnapshot({
  currentFingerprint,
  hasPendingRemoteDeletes = false,
  isSyncRecoverySnapshot = false,
  lastSavedFingerprint,
  remoteFingerprint,
}: {
  currentFingerprint: string;
  hasPendingRemoteDeletes?: boolean;
  isSyncRecoverySnapshot?: boolean;
  lastSavedFingerprint: string | null;
  remoteFingerprint: string | null;
}) {
  if (isSyncRecoverySnapshot) {
    return true;
  }

  if (hasPendingRemoteDeletes) {
    return false;
  }

  return (
    currentFingerprint === remoteFingerprint ||
    currentFingerprint === lastSavedFingerprint
  );
}
