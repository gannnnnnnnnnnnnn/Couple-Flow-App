import {
  CalendarDays,
  Check,
  Clock3,
  Heart,
  Link2,
  RotateCcw,
  Trash2,
  Wifi,
  WifiOff,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useState } from 'react';
import type { LocalStateSource, PairIdentity } from '../domain/localPersistence';
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
  onJoinPair,
  onResetDemoData,
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
  onJoinPair: (pairCode: string, displayName: string) => Promise<void>;
  onResetDemoData: () => void;
}) {
  const [displayName, setDisplayName] = useState(syncStatus.identity?.displayName ?? '');
  const [pairCode, setPairCode] = useState('');
  const savedLabel = storageStatus.canPersist
    ? storageStatus.savedAt
      ? `Saved ${new Date(storageStatus.savedAt).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })}`
      : 'Demo seed loaded'
    : 'Storage unavailable';
  const storageValue = !storageStatus.canPersist
    ? savedLabel
    : storageStatus.source === 'demo'
      ? 'Demo seeded'
      : savedLabel;
  const syncValue = !syncStatus.hasRemoteEnv
    ? 'Local demo'
    : syncStatus.identity
      ? `Pair ${syncStatus.identity.pairCode}`
      : 'Supabase ready';

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-2xl font-black text-ink">Pair / Settings</h2>
        <p className="mt-1 text-sm text-ink/60">
          Local-first now. Supabase sync starts after a pair code is created or joined.
        </p>
      </div>
      <div className="grid gap-3">
        <InfoRow icon={Heart} label="Pair" value={pair.name} />
        <InfoRow icon={Clock3} label="Timezone" value={pair.timezone} />
        <InfoRow icon={CalendarDays} label="Current week" value={currentWeekStart} />
        <InfoRow
          icon={Check}
          label="Open plans"
          value={`${needsReviewCount + ongoingCount + planningCount}`}
        />
        <InfoRow
          icon={Check}
          label="Saved locally"
          value={storageValue}
        />
        <InfoRow
          icon={syncStatus.hasRemoteEnv ? Wifi : WifiOff}
          label="Sync mode"
          value={syncValue}
        />
      </div>

      <div className="rounded-md bg-white/80 p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-ink">Pair code sync</p>
            <p className="mt-1 text-sm leading-5 text-ink/58">
              V0 uses a shared code and local display name, not full auth.
            </p>
          </div>
          <div className="grid h-10 w-10 place-items-center rounded-md bg-mint/25 text-ink">
            <Link2 size={18} />
          </div>
        </div>
        <div className="mt-4 grid gap-2">
          <input
            className="h-11 rounded-md border border-ink/10 bg-cream px-3 text-sm"
            placeholder="Your display name"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
          />
          <div className="grid grid-cols-[1fr_7rem] gap-2">
            <input
              className="h-11 rounded-md border border-ink/10 bg-cream px-3 text-sm uppercase"
              placeholder="Pair code"
              value={pairCode}
              onChange={(event) => setPairCode(event.target.value)}
            />
            <button
              className="h-11 rounded-md bg-ink px-3 text-sm font-bold text-cream disabled:opacity-40"
              type="button"
              disabled={!syncStatus.hasRemoteEnv || syncStatus.syncing || !pairCode.trim()}
              onClick={() => void onJoinPair(pairCode, displayName)}
            >
              Join
            </button>
          </div>
          <button
            className="h-11 rounded-md bg-coral px-4 text-sm font-bold text-cream disabled:opacity-40"
            type="button"
            disabled={!syncStatus.hasRemoteEnv || syncStatus.syncing}
            onClick={() => void onCreatePair(displayName)}
          >
            Create pair code
          </button>
          {!syncStatus.hasRemoteEnv && (
            <p className="rounded-md bg-cream px-3 py-2 text-xs font-semibold text-ink/58">
              Add Supabase env vars to enable shared sync. Local demo mode stays available.
            </p>
          )}
          {syncStatus.identity && (
            <p className="rounded-md bg-mint/20 px-3 py-2 text-xs font-bold text-ink/70">
              Current code: {syncStatus.identity.pairCode}
            </p>
          )}
          {syncStatus.error && (
            <p className="rounded-md bg-coral/15 px-3 py-2 text-xs font-bold text-ink">
              {syncStatus.error}
            </p>
          )}
        </div>
      </div>

      <div className="rounded-md bg-white/80 p-4 shadow-sm">
        <p className="text-sm font-bold text-ink">Local data</p>
        <p className="mt-1 text-sm leading-5 text-ink/58">
          Activities, plans, outcomes, bans, target week, and budget filter are saved
          in this browser only.
        </p>
        <div className="mt-4 grid gap-2">
          <button
            className="flex h-11 items-center justify-center gap-2 rounded-md bg-ink px-4 text-sm font-bold text-cream"
            type="button"
            onClick={onResetDemoData}
          >
            <RotateCcw size={17} />
            Reset to demo data
          </button>
          <button
            className="flex h-11 items-center justify-center gap-2 rounded-md bg-cream px-4 text-sm font-bold text-ink/70"
            type="button"
            onClick={onClearLocalData}
          >
            <Trash2 size={17} />
            Clear local user data
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
