import { formatWeekLabel } from '../domain/week';
import type { Activity, ScheduledSession, SessionOutcome } from '../types';
import { Chip, EmptyState, SectionTitle } from './common';

export function HistoryScreen({
  activityById,
  historySessions,
  outcomeBySessionId,
}: {
  activityById: Map<string, Activity>;
  historySessions: ScheduledSession[];
  outcomeBySessionId: Map<string, SessionOutcome>;
}) {
  const grouped = historySessions.reduce<Record<string, ScheduledSession[]>>((acc, session) => {
    acc[session.target_week_start_date] = acc[session.target_week_start_date] ?? [];
    acc[session.target_week_start_date].push(session);
    return acc;
  }, {});
  const weekKeys = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-2xl font-black text-ink">History</h2>
        <p className="mt-1 text-sm text-ink/60">{historySessions.length} archived outcomes</p>
      </div>
      {weekKeys.length === 0 && (
        <EmptyState
          title="No history yet"
          body="Plans only land here after done, missed, replaced, or redrawn outcomes."
        />
      )}
      {weekKeys.map((weekStart) => (
        <div key={weekStart} className="space-y-3">
          <SectionTitle title={`Week ${formatWeekLabel(weekStart)}`} />
          {grouped[weekStart].map((session) => {
            const activity = activityById.get(session.activity_id)!;
            const outcome = outcomeBySessionId.get(session.id)!;
            return (
              <article key={session.id} className="rounded-md bg-white/80 p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-clay">
                      {outcome.outcome_type}
                    </p>
                    <h3 className="mt-1 text-lg font-bold text-ink">{activity.title}</h3>
                  </div>
                  {outcome.rating ? <Chip>{outcome.rating}</Chip> : <Chip>{outcome.reason ?? 'agreed'}</Chip>}
                </div>
                {outcome.reason && <p className="mt-3 text-sm text-ink/62">{outcome.reason}</p>}
              </article>
            );
          })}
        </div>
      ))}
    </section>
  );
}
