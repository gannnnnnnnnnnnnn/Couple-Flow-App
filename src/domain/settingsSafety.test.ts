import { describe, expect, it } from 'vitest';
import {
  getImportResultMessage,
  getPairCodeClipboardText,
  getRuntimeSyncStatusCopy,
  getSettingsSafetyCopy,
} from './settingsSafety';

describe('settings safety copy', () => {
  it('shows local-only device safety copy without Supabase env', () => {
    expect(getSettingsSafetyCopy({ hasRemoteEnv: false, identity: null })).toMatchObject({
      clearActionLabel: 'Clear this device data',
      resetDemoDisabled: false,
      syncStatusLabel: 'Local only: Supabase env missing',
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

  it('distinguishes local-only, available, and connected runtime sync states', () => {
    expect(
      getRuntimeSyncStatusCopy({
        error: null,
        hasRemoteEnv: false,
        identity: null,
        savedAt: null,
        syncing: false,
      }),
    ).toMatchObject({
      detail: 'Local mode is fully usable on this device.',
      status: 'Local only: Supabase env missing',
    });

    expect(
      getRuntimeSyncStatusCopy({
        error: null,
        hasRemoteEnv: true,
        identity: null,
        savedAt: null,
        syncing: false,
      }),
    ).toMatchObject({
      status: 'Sync available, not connected',
    });

    expect(
      getRuntimeSyncStatusCopy({
        error: 'Realtime replication is not enabled.',
        hasRemoteEnv: true,
        identity: {
          pairId: 'pair-1',
          memberId: 'member-1',
          pairCode: 'ABC123',
          displayName: 'A',
        },
        savedAt: '2026-06-29T10:30:00.000Z',
        syncing: true,
      }),
    ).toMatchObject({
      detail: 'Pair code ABC123 as A',
      error: 'Realtime replication is not enabled.',
      lastSaved: expect.stringContaining('Last saved'),
      status: 'Syncing',
    });
  });

  it('copies the clean pair code text', () => {
    expect(getPairCodeClipboardText(' ab-c123 ')).toBe('ABC123');
  });
});
