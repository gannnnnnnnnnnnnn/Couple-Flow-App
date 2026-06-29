import { CalendarDays, Check, Clock3, Heart } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { pair } from '../mockData';

export function SettingsScreen({
  currentWeekStart,
  needsReviewCount,
  ongoingCount,
  planningCount,
}: {
  currentWeekStart: string;
  needsReviewCount: number;
  ongoingCount: number;
  planningCount: number;
}) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-2xl font-black text-ink">Pair / Settings</h2>
        <p className="mt-1 text-sm text-ink/60">Local mode, Supabase-ready later.</p>
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
