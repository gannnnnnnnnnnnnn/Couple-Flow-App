import { describe, expect, it } from 'vitest';
import { createDemoLocalAppData } from './localPersistence';
import { BACKUP_SCHEMA_VERSION, parseAppBackupJson, stringifyAppBackup } from './backup';

describe('app backup import/export', () => {
  it('exports current app data with metadata', () => {
    const data = createDemoLocalAppData();
    const raw = stringifyAppBackup(data, new Date('2026-06-29T12:00:00.000Z'));
    const parsed = JSON.parse(raw);

    expect(parsed).toMatchObject({
      app: 'couple-flow',
      schemaVersion: BACKUP_SCHEMA_VERSION,
      exportedAt: '2026-06-29T12:00:00.000Z',
    });
    expect(parsed.data.activities).toHaveLength(data.activities.length);
  });

  it('parses a valid backup payload', () => {
    const data = createDemoLocalAppData();
    data.targetWeekStart = '2026-07-06';

    const result = parseAppBackupJson(stringifyAppBackup(data));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.backup.data.targetWeekStart).toBe('2026-07-06');
    }
  });

  it('preserves pending plan action fields through backup import', () => {
    const data = createDemoLocalAppData();
    data.scheduledSessions = [
      {
        ...data.scheduledSessions[0],
        pending_action_type: 'replace',
        pending_requested_by_member_id: 'member-g',
        pending_agreed_by_member_ids: ['member-g'],
        pending_target_week_start_date: null,
        pending_replacement_activity_id: 'activity-arcade',
        pending_reason: null,
      },
    ];

    const result = parseAppBackupJson(stringifyAppBackup(data));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.backup.data.scheduledSessions[0]).toMatchObject({
        pending_action_type: 'replace',
        pending_requested_by_member_id: 'member-g',
        pending_agreed_by_member_ids: ['member-g'],
        pending_replacement_activity_id: 'activity-arcade',
      });
    }
  });

  it('keeps older backups without draw sessions importable', () => {
    const data = createDemoLocalAppData();
    const { drawSessions: _drawSessions, ...oldData } = data;

    const result = parseAppBackupJson(
      JSON.stringify({
        app: 'couple-flow',
        schemaVersion: BACKUP_SCHEMA_VERSION,
        exportedAt: '2026-06-29T12:00:00.000Z',
        data: oldData,
      }),
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.backup.data.drawSessions).toEqual([]);
    }
  });

  it('rejects invalid JSON', () => {
    expect(parseAppBackupJson('{nope').ok).toBe(false);
  });

  it('rejects payloads with the wrong shape', () => {
    const result = parseAppBackupJson(
      JSON.stringify({
        app: 'couple-flow',
        schemaVersion: BACKUP_SCHEMA_VERSION,
        exportedAt: '2026-06-29T12:00:00.000Z',
        data: { activities: [] },
      }),
    );

    expect(result).toEqual({
      ok: false,
      error: '备份文件不是 Couple Flow 的可导入数据。',
    });
  });
});
