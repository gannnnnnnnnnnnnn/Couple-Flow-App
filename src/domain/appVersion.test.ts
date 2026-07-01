import { describe, expect, it } from 'vitest';
import {
  APP_VERSION,
  fetchAppVersionManifest,
  hasAppVersionMismatch,
} from './appVersion';

describe('app version update path', () => {
  it('detects a newer app version without touching local data', () => {
    expect(hasAppVersionMismatch(APP_VERSION, { version: 'next-version' })).toBe(true);
    expect(hasAppVersionMismatch(APP_VERSION, { version: APP_VERSION })).toBe(false);
  });

  it('ignores missing version manifests', async () => {
    const manifest = await fetchAppVersionManifest(
      () =>
        Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ version: 'next-version' }),
        } as Response),
      1,
    );

    expect(manifest).toBeNull();
  });
});
