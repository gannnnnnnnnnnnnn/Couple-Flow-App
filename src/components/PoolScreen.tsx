import { ListPlus } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { Activity, BudgetFilter, BudgetGroup } from '../types';
import { BudgetPill, Chip } from './common';

export function PoolScreen({
  activities,
  budgetGroups,
  budgetById,
  onAddActivity,
  onToggleStatus,
}: {
  activities: Activity[];
  budgetGroups: BudgetGroup[];
  budgetById: Map<string, BudgetGroup>;
  onAddActivity: (activity: Activity) => void;
  onToggleStatus: (activityId: string) => void;
}) {
  const [budgetFilter, setBudgetFilter] = useState<BudgetFilter>('all');
  const [formOpen, setFormOpen] = useState(false);
  const visibleActivities = useMemo(
    () =>
      activities.filter(
        (activity) => budgetFilter === 'all' || activity.budget_group_id === budgetFilter,
      ),
    [activities, budgetFilter],
  );

  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-ink">Pool</h2>
          <p className="mt-1 text-sm text-ink/60">
            {activities.filter((activity) => activity.status === 'active').length} active ideas
          </p>
        </div>
        <button
          className="grid h-11 w-11 place-items-center rounded-md bg-coral text-cream shadow-soft"
          type="button"
          title="Add activity"
          onClick={() => setFormOpen((open) => !open)}
        >
          <ListPlus size={21} />
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        <BudgetPill active={budgetFilter === 'all'} onClick={() => setBudgetFilter('all')}>
          all
        </BudgetPill>
        {budgetGroups.map((budget) => (
          <BudgetPill
            key={budget.id}
            active={budgetFilter === budget.id}
            onClick={() => setBudgetFilter(budget.id)}
          >
            {budget.name}
          </BudgetPill>
        ))}
      </div>

      {formOpen && (
        <AddActivityForm
          budgetGroups={budgetGroups}
          onAdd={(activity) => {
            onAddActivity(activity);
            setFormOpen(false);
          }}
        />
      )}

      <div className="space-y-3">
        {visibleActivities.map((activity) => (
          <article
            key={activity.id}
            className={`rounded-md border bg-white/80 p-4 shadow-sm ${
              activity.status === 'paused' ? 'border-ink/10 opacity-60' : 'border-white'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-ink">{activity.title}</h3>
                <p className="mt-1 text-sm leading-5 text-ink/62">{activity.note}</p>
              </div>
              <Chip>{budgetById.get(activity.budget_group_id)?.name ?? 'open'}</Chip>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {activity.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-md bg-mint/25 px-2.5 py-1 text-xs font-semibold text-ink/70"
                >
                  {tag}
                </span>
              ))}
              <span className="rounded-md bg-butter/35 px-2.5 py-1 text-xs font-semibold text-ink/70">
                {activity.duration_minutes} min
              </span>
            </div>
            <button
              className="mt-4 h-10 w-full rounded-md bg-cream text-sm font-bold text-ink/70"
              type="button"
              onClick={() => onToggleStatus(activity.id)}
            >
              {activity.status === 'active' ? 'Pause' : 'Reactivate'}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

function AddActivityForm({
  budgetGroups,
  onAdd,
}: {
  budgetGroups: BudgetGroup[];
  onAdd: (activity: Activity) => void;
}) {
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [budgetId, setBudgetId] = useState(budgetGroups[0]?.id ?? '');
  const [duration, setDuration] = useState('60');
  const [tags, setTags] = useState('');

  function submit() {
    if (!title.trim() || !budgetId) {
      return;
    }

    onAdd({
      id: `activity-${Date.now()}`,
      pair_id: 'pair-001',
      title: title.trim(),
      note: note.trim() || 'A fresh idea from the pool.',
      budget_group_id: budgetId,
      duration_minutes: Number(duration) || 60,
      tags: tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
      created_by_member_id: 'member-g',
      status: 'active',
      created_at: new Date().toISOString(),
    });
  }

  return (
    <div className="rounded-md bg-ink p-4 text-cream shadow-soft">
      <div className="grid gap-3">
        <input
          className="h-11 rounded-md border border-cream/10 bg-cream px-3 text-sm text-ink"
          placeholder="Activity title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
        <input
          className="h-11 rounded-md border border-cream/10 bg-cream px-3 text-sm text-ink"
          placeholder="Note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
        <div className="grid grid-cols-[1fr_96px] gap-2">
          <select
            className="h-11 rounded-md border border-cream/10 bg-cream px-3 text-sm text-ink"
            value={budgetId}
            onChange={(event) => setBudgetId(event.target.value)}
          >
            {budgetGroups.map((budget) => (
              <option key={budget.id} value={budget.id}>
                {budget.name}
              </option>
            ))}
          </select>
          <input
            className="h-11 rounded-md border border-cream/10 bg-cream px-3 text-sm text-ink"
            inputMode="numeric"
            value={duration}
            onChange={(event) => setDuration(event.target.value)}
          />
        </div>
        <input
          className="h-11 rounded-md border border-cream/10 bg-cream px-3 text-sm text-ink"
          placeholder="tags, comma separated"
          value={tags}
          onChange={(event) => setTags(event.target.value)}
        />
        <button
          className="h-11 rounded-md bg-coral px-4 font-bold text-cream disabled:opacity-40"
          type="button"
          disabled={!title.trim()}
          onClick={submit}
        >
          Add to pool
        </button>
      </div>
    </div>
  );
}
