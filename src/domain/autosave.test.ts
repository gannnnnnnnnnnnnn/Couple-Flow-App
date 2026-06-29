import { describe, expect, it } from 'vitest';
import { createDemoLocalAppData } from './localPersistence';
import { getLocalAppDataFingerprint, shouldSkipAutosaveForSnapshot } from './autosave';

describe('autosave helpers', () => {
  it('uses a stable fingerprint for identical snapshots', () => {
    const first = createDemoLocalAppData();
    const second = createDemoLocalAppData();

    expect(getLocalAppDataFingerprint(first)).toBe(getLocalAppDataFingerprint(second));
  });

  it('skips snapshots that already came from remote or were just saved', () => {
    const fingerprint = getLocalAppDataFingerprint(createDemoLocalAppData());

    expect(
      shouldSkipAutosaveForSnapshot({
        currentFingerprint: fingerprint,
        lastSavedFingerprint: null,
        remoteFingerprint: fingerprint,
      }),
    ).toBe(true);

    expect(
      shouldSkipAutosaveForSnapshot({
        currentFingerprint: fingerprint,
        lastSavedFingerprint: fingerprint,
        remoteFingerprint: null,
      }),
    ).toBe(true);
  });

  it('allows local user changes to save', () => {
    const currentFingerprint = getLocalAppDataFingerprint(createDemoLocalAppData());

    expect(
      shouldSkipAutosaveForSnapshot({
        currentFingerprint,
        lastSavedFingerprint: 'older',
        remoteFingerprint: null,
      }),
    ).toBe(false);
  });
});
