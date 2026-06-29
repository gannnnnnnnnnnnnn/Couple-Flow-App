import {
  CalendarDays,
  Check,
  Copy,
  Download,
  Clock3,
  Heart,
  Link2,
  RotateCcw,
  Trash2,
  Upload,
  Wifi,
  WifiOff,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useRef, useState } from 'react';
import type { LocalStateSource, PairIdentity } from '../domain/localPersistence';
import {
  getPairCodeClipboardText,
  getImportResultMessage,
  getRuntimeSyncStatusCopy,
  getSettingsSafetyCopy,
  type ImportDataResult,
} from '../domain/settingsSafety';
import type { Pair } from '../types';
import type { RepositoryMode } from '../repositories/appRepository';

export function SettingsScreen({
  pair,
  currentWeekStart,
  needsReviewCount,
  ongoingCount,
  planningCount,
  syncStatus,
  storageStatus,
  onCreatePair,
  onClearLocalData,
  onExportData,
  onImportData,
  onJoinPair,
  onResetDemoData,
  onStartFromScratch,
}: {
  pair: Pair;
  currentWeekStart: string;
  needsReviewCount: number;
  ongoingCount: number;
  planningCount: number;
  syncStatus: {
    error: string | null;
    hasRemoteEnv: boolean;
    identity: PairIdentity | null;
    mode: RepositoryMode;
    syncing: boolean;
  };
  storageStatus: {
    canPersist: boolean;
    source: LocalStateSource;
    savedAt: string | null;
  };
  onCreatePair: (displayName: string) => Promise<void>;
  onClearLocalData: () => void;
  onExportData: () => void;
  onImportData: (file: File) => Promise<ImportDataResult>;
  onJoinPair: (pairCode: string, displayName: string) => Promise<void>;
  onResetDemoData: () => void;
  onStartFromScratch: () => Promise<void>;
}) {
  const importInputRef = useRef<HTMLInputElement>(null);
  const [displayName, setDisplayName] = useState(syncStatus.identity?.displayName ?? '');
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [pairCode, setPairCode] = useState('');
  const safetyCopy = getSettingsSafetyCopy({
    hasRemoteEnv: syncStatus.hasRemoteEnv,
    identity: syncStatus.identity,
  });
  const runtimeCopy = getRuntimeSyncStatusCopy({
    error: syncStatus.error,
    hasRemoteEnv: syncStatus.hasRemoteEnv,
    identity: syncStatus.identity,
    savedAt: storageStatus.savedAt,
    syncing: syncStatus.syncing,
  });
  const savedLabel = storageStatus.canPersist
    ? storageStatus.savedAt
      ? `已保存 ${new Date(storageStatus.savedAt).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })}`
      : '已载入演示数据'
    : '本机存储不可用';
  const storageValue = !storageStatus.canPersist
    ? savedLabel
    : storageStatus.source === 'demo'
      ? '演示数据'
      : savedLabel;
  const isSyncConnected = syncStatus.hasRemoteEnv && Boolean(syncStatus.identity);
  const displayedStorageValue =
    storageStatus.source === 'empty' ? '空白状态' : storageValue;

  async function handleCopyPairCode() {
    if (!syncStatus.identity) {
      return;
    }

    const clipboardText = getPairCodeClipboardText(syncStatus.identity.pairCode);
    try {
      if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
        throw new Error('剪贴板不可用。');
      }

      await navigator.clipboard.writeText(clipboardText);
      setCopyMessage('配对码已复制。');
    } catch {
      setCopyMessage('剪贴板不可用，请手动选中复制。');
    }
  }

  async function handleImport(file: File | undefined) {
    if (!file) {
      return;
    }

    const result = await onImportData(file);
    setImportMessage(getImportResultMessage(result));
    if (importInputRef.current) {
      importInputRef.current.value = '';
    }
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-2xl font-black text-ink">双人设置</h2>
        <p className="mt-1 text-sm text-ink/60">
          先在本机玩起来；创建或加入配对码后，再和另一台设备同步。
        </p>
      </div>
      <div className="grid gap-3">
        <InfoRow icon={Heart} label="双人空间" value={pair.name} />
        <InfoRow icon={Clock3} label="时区" value={pair.timezone} />
        <InfoRow icon={CalendarDays} label="本周开始" value={currentWeekStart} />
        <InfoRow
          icon={Check}
          label="未收尾计划"
          value={`${needsReviewCount + ongoingCount + planningCount}`}
        />
        <InfoRow
          icon={Check}
          label="本机保存"
          value={displayedStorageValue}
        />
        <InfoRow
          icon={syncStatus.hasRemoteEnv ? Wifi : WifiOff}
          label="同步状态"
          value={runtimeCopy.status}
        />
      </div>

      <div className="rounded-md bg-white/80 p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-ink">配对码同步</p>
            <p className="mt-1 text-sm leading-5 text-ink/58">
              V0 先用共享配对码和本机昵称，不做复杂账号系统。
            </p>
          </div>
          <div className="grid h-10 w-10 place-items-center rounded-md bg-mint/25 text-ink">
            <Link2 size={18} />
          </div>
        </div>
        <div className="mt-4 grid gap-2">
          <div className="rounded-md bg-cream px-3 py-3 text-sm text-ink/70">
            <p className="font-bold text-ink">{runtimeCopy.status}</p>
            <p className="mt-1 leading-5">{runtimeCopy.detail}</p>
            {runtimeCopy.lastSaved && (
              <p className="mt-2 text-xs font-bold text-ink/60">{runtimeCopy.lastSaved}</p>
            )}
            {runtimeCopy.error && (
              <p className="mt-2 rounded-md bg-coral/15 px-3 py-2 text-xs font-bold text-ink">
                {runtimeCopy.error}
              </p>
            )}
          </div>
          {isSyncConnected && syncStatus.identity && (
            <div className="rounded-md bg-mint/20 p-3">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink/52">
                配对码
              </p>
              <div className="mt-2 grid grid-cols-[1fr_auto] items-center gap-2">
                <p className="rounded-md bg-white/80 px-3 py-3 font-mono text-xl font-black tracking-[0.18em] text-ink">
                  {syncStatus.identity.pairCode}
                </p>
                <button
                  className="grid h-11 w-11 place-items-center rounded-md bg-ink text-cream"
                  type="button"
                  aria-label="复制配对码"
                  title="复制配对码"
                  onClick={() => void handleCopyPairCode()}
                >
                  <Copy size={18} />
                </button>
              </div>
              <div className="mt-3 grid gap-1 text-xs font-semibold text-ink/62">
                <p>昵称：{syncStatus.identity.displayName}</p>
                <p>状态：{runtimeCopy.status}</p>
              </div>
              {copyMessage && (
                <p className="mt-2 text-xs font-bold text-ink/70">{copyMessage}</p>
              )}
            </div>
          )}
          {!isSyncConnected && (
            <>
              <input
                className="h-11 rounded-md border border-ink/10 bg-cream px-3 text-sm"
                placeholder="你的昵称"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
              />
              <div className="grid grid-cols-[1fr_7rem] gap-2">
                <input
                  className="h-11 rounded-md border border-ink/10 bg-cream px-3 text-sm uppercase"
                  placeholder="配对码"
                  value={pairCode}
                  onChange={(event) => setPairCode(event.target.value)}
                />
                <button
                  className="h-11 rounded-md bg-ink px-3 text-sm font-bold text-cream disabled:opacity-40"
                  type="button"
                  disabled={!syncStatus.hasRemoteEnv || syncStatus.syncing || !pairCode.trim()}
                  onClick={() => void onJoinPair(pairCode, displayName)}
                >
                  加入
                </button>
              </div>
              <p className="rounded-md bg-cream px-3 py-2 text-xs font-semibold text-ink/58">
                加入后会先把云端双人数据载入这台设备。
              </p>
              <button
                className="h-11 rounded-md bg-coral px-4 text-sm font-bold text-cream disabled:opacity-40"
                type="button"
                disabled={!syncStatus.hasRemoteEnv || syncStatus.syncing}
                onClick={() => void onCreatePair(displayName)}
              >
                创建配对码
              </button>
              {!syncStatus.hasRemoteEnv && (
                <p className="rounded-md bg-cream px-3 py-2 text-xs font-semibold text-ink/58">
                  这个构建还没配置同步。补上 Supabase 环境变量后可用配对码；本机模式仍然可用。
                </p>
              )}
            </>
          )}
        </div>
      </div>

      <div className="rounded-md bg-white/80 p-4 shadow-sm">
        <p className="text-sm font-bold text-ink">本机数据</p>
        <p className="mt-1 text-sm leading-5 text-ink/58">
          活动、计划、记录、屏蔽项、目标周和预算筛选会保存在当前浏览器。
        </p>
        <div className="mt-4 grid gap-2">
          <button
            className="flex h-11 items-center justify-center gap-2 rounded-md bg-mint/35 px-4 text-sm font-bold text-ink"
            type="button"
            onClick={onExportData}
          >
            <Download size={17} />
            导出 JSON 备份
          </button>
          <input
            ref={importInputRef}
            className="hidden"
            type="file"
            accept="application/json,.json"
            onChange={(event) => void handleImport(event.target.files?.[0])}
          />
          <button
            className="flex h-11 items-center justify-center gap-2 rounded-md bg-cream px-4 text-sm font-bold text-ink/70 disabled:opacity-40"
            type="button"
            disabled={Boolean(syncStatus.identity)}
            onClick={() => importInputRef.current?.click()}
          >
            <Upload size={17} />
            导入 JSON 备份
          </button>
          {syncStatus.identity && (
            <p className="rounded-md bg-cream px-3 py-2 text-xs font-semibold text-ink/58">
              已连接双人空间时不能导入，避免覆盖共享同步数据。
            </p>
          )}
          {importMessage && (
            <p className="rounded-md bg-mint/20 px-3 py-2 text-xs font-bold text-ink/70">
              {importMessage}
            </p>
          )}
          <button
            className="flex h-11 items-center justify-center gap-2 rounded-md bg-coral px-4 text-sm font-bold text-cream disabled:opacity-40"
            type="button"
            disabled={syncStatus.syncing}
            onClick={() => void onStartFromScratch()}
          >
            <Trash2 size={17} />
            {isSyncConnected ? '清空双人空间数据' : '从空白开始'}
          </button>
          <p className="rounded-md bg-cream px-3 py-2 text-xs font-semibold text-ink/58">
            {isSyncConnected
              ? '只清空共享的活动、计划、屏蔽项和记录，配对码、成员和预算分组会保留。'
              : '清空本机演示活动、计划和记录后，这台设备不会再自动放回演示数据。'}
          </p>
          <button
            className="flex h-11 items-center justify-center gap-2 rounded-md bg-ink px-4 text-sm font-bold text-cream disabled:opacity-40"
            type="button"
            disabled={safetyCopy.resetDemoDisabled}
            onClick={onResetDemoData}
          >
            <RotateCcw size={17} />
            恢复演示数据
          </button>
          {safetyCopy.resetDemoMessage && (
            <p className="rounded-md bg-cream px-3 py-2 text-xs font-semibold text-ink/58">
              {safetyCopy.resetDemoMessage}
            </p>
          )}
          <button
            className="flex h-11 items-center justify-center gap-2 rounded-md bg-cream px-4 text-sm font-bold text-ink/70"
            type="button"
            onClick={onClearLocalData}
            title={safetyCopy.clearConfirmation}
          >
            <Trash2 size={17} />
            {safetyCopy.clearActionLabel}
          </button>
        </div>
      </div>
    </section>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-md bg-white/80 px-4 py-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-md bg-mint/25 text-ink">
          <Icon size={19} />
        </div>
        <span className="font-semibold text-ink">{label}</span>
      </div>
      <span className="text-right text-sm font-bold text-ink/62">{value}</span>
    </div>
  );
}
