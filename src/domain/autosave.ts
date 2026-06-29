import type { LocalAppData } from './localPersistence';

export const AUTOSAVE_DEBOUNCE_MS = 600;
export const SYNCING_VISIBILITY_DELAY_MS = 300;

export function getLocalAppDataFingerprint(data: LocalAppData) {
  return JSON.stringify(data);
}

export function shouldSkipAutosaveForSnapshot({
  currentFingerprint,
  lastSavedFingerprint,
  remoteFingerprint,
}: {
  currentFingerprint: string;
  lastSavedFingerprint: string | null;
  remoteFingerprint: string | null;
}) {
  return (
    currentFingerprint === remoteFingerprint ||
    currentFingerprint === lastSavedFingerprint
  );
}
