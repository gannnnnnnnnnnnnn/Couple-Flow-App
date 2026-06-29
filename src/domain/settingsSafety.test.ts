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
      clearActionLabel: '清空本机数据',
      resetDemoDisabled: false,
      syncStatusLabel: '本机模式：未配置同步',
    });
  });

  it('shows sync-available copy when env exists but no pair is connected', () => {
    expect(getSettingsSafetyCopy({ hasRemoteEnv: true, identity: null })).toMatchObject({
      clearActionLabel: '清空本机数据',
      resetDemoDisabled: false,
      syncStatusLabel: '可同步，尚未配对',
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
      clearActionLabel: '断开本设备',
      resetDemoDisabled: true,
      resetDemoMessage: '已连接双人空间时不能重置演示数据。',
      syncStatusLabel: '已连接配对码 ABC123',
    });
  });

  it('maps import results without treating cancellation as success', () => {
    expect(getImportResultMessage({ status: 'success' })).toBe(
      '备份已导入这台设备。',
    );
    expect(getImportResultMessage({ status: 'cancelled' })).toBeNull();
    expect(
      getImportResultMessage({ status: 'error', message: '备份文件不是有效的 JSON。' }),
    ).toBe('备份文件不是有效的 JSON。');
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
      detail: '这台设备可以完整使用，只是不会同步到另一边。',
      status: '本机模式：未配置同步',
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
      status: '可同步，尚未配对',
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
      detail: '配对码 ABC123 · A',
      error: 'Realtime replication is not enabled.',
      lastSaved: expect.stringContaining('上次保存'),
      status: '同步中',
    });
  });

  it('copies the clean pair code text', () => {
    expect(getPairCodeClipboardText(' ab-c123 ')).toBe('ABC123');
  });
});
