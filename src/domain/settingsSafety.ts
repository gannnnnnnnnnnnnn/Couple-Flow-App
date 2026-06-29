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
      clearActionLabel: '断开本设备',
      clearConfirmation:
        '要断开这台设备吗？云端双人数据不会被删除或改动。',
      resetDemoDisabled: true,
      resetDemoMessage: '已连接双人空间时不能重置演示数据。',
      syncStatusLabel: hasRemoteEnv
        ? `已连接配对码 ${identity.pairCode}`
        : '本机模式：未配置同步',
    };
  }

  return {
    clearActionLabel: '清空本机数据',
    clearConfirmation:
      '要清空这台设备上的数据吗？云端数据不会受影响。',
    resetDemoDisabled: false,
    resetDemoMessage: null,
    syncStatusLabel: hasRemoteEnv
      ? '可同步，尚未配对'
      : '本机模式：未配置同步',
  };
}

export function getRuntimeSyncStatusCopy({
  error,
  hasRemoteEnv,
  identity,
  savedAt,
  syncing,
}: RuntimeSyncStatusInput): RuntimeSyncStatusCopy {
  const lastSaved = savedAt ? `上次保存 ${formatSavedTime(savedAt)}` : null;

  if (!hasRemoteEnv) {
    return {
      detail: '这台设备可以完整使用，只是不会同步到另一边。',
      error,
      lastSaved,
      status: '本机模式：未配置同步',
    };
  }

  if (!identity) {
    return {
      detail: '创建或加入配对码后，就能读取同一个双人空间。',
      error,
      lastSaved,
      status: syncing ? '准备同步中' : '可同步，尚未配对',
    };
  }

  return {
    detail: `配对码 ${identity.pairCode} · ${identity.displayName}`,
    error,
    lastSaved,
    status: syncing ? '同步中' : '已连接',
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
    return '备份已导入这台设备。';
  }

  if (result.status === 'error') {
    return result.message;
  }

  return null;
}
