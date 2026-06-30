import type { LocalAppData } from './localPersistence';

export const AUTOSAVE_DEBOUNCE_MS = 600;
export const SYNCING_VISIBILITY_DELAY_MS = 300;

export function getLocalAppDataFingerprint(data: LocalAppData) {
  return JSON.stringify(data);
}

export function shouldSkipAutosaveForSnapshot({
  currentFingerprint,
  hasPendingRemoteDeletes = false,
  lastSavedFingerprint,
  remoteFingerprint,
}: {
  currentFingerprint: string;
  hasPendingRemoteDeletes?: boolean;
  lastSavedFingerprint: string | null;
  remoteFingerprint: string | null;
}) {
  if (hasPendingRemoteDeletes) {
    return false;
  }

  return (
    currentFingerprint === remoteFingerprint ||
    currentFingerprint === lastSavedFingerprint
  );
}
