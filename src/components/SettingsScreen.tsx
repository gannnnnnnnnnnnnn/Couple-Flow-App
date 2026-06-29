import { CalendarDays, Check, Clock3, Heart, RotateCcw, Trash2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { pair } from '../mockData';
import type { LocalStateSource } from '../domain/localPersistence';

export function SettingsScreen({
  currentWeekStart,
  needsReviewCount,
  ongoingCount,
  planningCount,
  storageStatus,
  onClearLocalData,
  onResetDemoData,
}: {
  currentWeekStart: string;
  needsReviewCount: number;
  ongoingCount: number;
  planningCount: number;
  storageStatus: {
    canPersist: boolean;
    source: LocalStateSource;
    savedAt: string | null;
  };
  onClearLocalData: () => void;
  onResetDemoData: () => void;
}) {
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

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-2xl font-black text-ink">Pair / Settings</h2>
        <p className="mt-1 text-sm text-ink/60">
          Local-only for now. Data stays on this phone until Supabase arrives.
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
