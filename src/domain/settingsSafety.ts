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
      syncStatusLabel: `Connected to pair code ${identity.pairCode}`,
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
      : 'Saved on this device',
  };
}
