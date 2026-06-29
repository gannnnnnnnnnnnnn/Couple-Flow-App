import { describe, expect, it } from 'vitest';
import { getImportResultMessage, getSettingsSafetyCopy } from './settingsSafety';

describe('settings safety copy', () => {
  it('shows local-only device safety copy without Supabase env', () => {
    expect(getSettingsSafetyCopy({ hasRemoteEnv: false, identity: null })).toMatchObject({
      clearActionLabel: 'Clear this device data',
      resetDemoDisabled: false,
      syncStatusLabel: 'Saved on this device',
    });
  });

  it('shows sync-available copy when env exists but no pair is connected', () => {
    expect(getSettingsSafetyCopy({ hasRemoteEnv: true, identity: null })).toMatchObject({
      clearActionLabel: 'Clear this device data',
      resetDemoDisabled: false,
      syncStatusLabel: 'Sync available, not connected',
    });
  });

  it('disables demo reset and clarifies disconnect in sync mode', () => {
    expect(
      getSettingsSafetyCopy({
        hasRemoteEnv: true,
        identity: {
          pairId: 'pair-1',
          memberId: 'member-1',
          pairCode: 'ABC123',
          displayName: 'A',
        },
      }),
    ).toMatchObject({
      clearActionLabel: 'Disconnect this device',
      resetDemoDisabled: true,
      resetDemoMessage: 'Demo reset is disabled while connected to a pair.',
      syncStatusLabel: 'Connected to pair code ABC123',
    });
  });

  it('maps import results without treating cancellation as success', () => {
    expect(getImportResultMessage({ status: 'success' })).toBe(
      'Backup imported on this device.',
    );
    expect(getImportResultMessage({ status: 'cancelled' })).toBeNull();
    expect(
      getImportResultMessage({ status: 'error', message: 'Backup file is not valid JSON.' }),
    ).toBe('Backup file is not valid JSON.');
  });
});
