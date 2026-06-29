import { ListPlus } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { Activity, BudgetFilter, BudgetGroup } from '../types';
import { BudgetPill, Chip } from './common';

const quickIdeas = [
  {
    title: '饭后甜品散步',
    note: '买一样甜的，边走边分着吃。',
    duration: '45',
    tags: '散步, 甜食',
  },
  {
    title: '小超市挑战',
    note: '买材料做一个两个人都没试过的小零食。',
    duration: '60',
    tags: '吃的, 在家',
  },
  {
    title: '无手机咖啡',
    note: '一人一杯，手机收起来。',
    duration: '40',
    tags: '安静',
  },
];

export function PoolScreen({
  activities,
  budgetGroups,
  budgetById,
  currentMemberId,
  pairId,
  onAddActivity,
  onToggleStatus,
}: {
  activities: Activity[];
  budgetGroups: BudgetGroup[];
  budgetById: Map<string, BudgetGroup>;
  currentMemberId: string;
  pairId: string;
  onAddActivity: (activity: Activity) => void;
  onToggleStatus: (activityId: string) => void;
}) {
  const [budgetFilter, setBudgetFilter] = useState<BudgetFilter>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [lastAddedTitle, setLastAddedTitle] = useState('');
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
          <h2 className="text-2xl font-black text-ink">活动池</h2>
          <p className="mt-1 text-sm text-ink/60">
            {activities.filter((activity) => activity.status === 'active').length} 个可抽点子
          </p>
        </div>
        <button
          className="grid h-11 w-11 place-items-center rounded-md bg-coral text-cream shadow-soft"
          type="button"
          title="添加活动"
          onClick={() => setFormOpen((open) => !open)}
        >
          <ListPlus size={21} />
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        <BudgetPill active={budgetFilter === 'all'} onClick={() => setBudgetFilter('all')}>
          全部
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
          currentMemberId={currentMemberId}
          onAdd={(activity) => {
            onAddActivity(activity);
            setLastAddedTitle(activity.title);
          }}
          pairId={pairId}
        />
      )}
      {lastAddedTitle && (
        <p className="rounded-md bg-mint/25 px-3 py-2 text-sm font-bold text-ink/70">
          已加入：{lastAddedTitle}
        </p>
      )}

      <div className="space-y-3">
        {visibleActivities.length === 0 && (
          <div className="rounded-md border border-dashed border-ink/16 bg-white/60 p-5 text-center">
            <p className="font-bold text-ink">这个预算还没有点子</p>
            <p className="mt-1 text-sm leading-5 text-ink/58">
              加一个新的，或者切到别的预算看看。
            </p>
          </div>
        )}
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
              <Chip>{budgetById.get(activity.budget_group_id)?.name ?? '随意'}</Chip>
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
                {activity.duration_minutes} 分钟
              </span>
            </div>
            <button
              className="mt-4 h-10 w-full rounded-md bg-cream text-sm font-bold text-ink/70"
              type="button"
              onClick={() => onToggleStatus(activity.id)}
            >
              {activity.status === 'active' ? '先暂停' : '恢复可抽'}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

function AddActivityForm({
  budgetGroups,
  currentMemberId,
  onAdd,
  pairId,
}: {
  budgetGroups: BudgetGroup[];
  currentMemberId: string;
  onAdd: (activity: Activity) => void;
  pairId: string;
}) {
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [budgetId, setBudgetId] = useState(budgetGroups[0]?.id ?? '');
  const [duration, setDuration] = useState('60');
  const [tags, setTags] = useState('');

  function applyQuickIdea(idea: (typeof quickIdeas)[number]) {
    setTitle(idea.title);
    setNote(idea.note);
    setDuration(idea.duration);
    setTags(idea.tags);
  }

  function submit() {
    if (!title.trim() || !budgetId) {
      return;
    }

    onAdd({
      id: `activity-${Date.now()}`,
      pair_id: pairId,
      title: title.trim(),
      note: note.trim() || '一个新鲜的小点子。',
      budget_group_id: budgetId,
      duration_minutes: Number(duration) || 60,
      tags: tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
      created_by_member_id: currentMemberId,
      status: 'active',
      created_at: new Date().toISOString(),
    });
    setTitle('');
    setNote('');
    setDuration('60');
    setTags('');
  }

  return (
    <div className="rounded-md bg-ink p-4 text-cream shadow-soft">
      <div className="grid gap-3">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {quickIdeas.map((idea) => (
            <button
              key={idea.title}
              className="h-9 shrink-0 rounded-md bg-cream/12 px-3 text-xs font-bold text-cream/85"
              type="button"
              onClick={() => applyQuickIdea(idea)}
            >
              {idea.title}
            </button>
          ))}
        </div>
        <input
          className="h-11 rounded-md border border-cream/10 bg-cream px-3 text-sm text-ink"
          placeholder="活动名"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
        <input
          className="h-11 rounded-md border border-cream/10 bg-cream px-3 text-sm text-ink"
          placeholder="备注，可不填"
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
            placeholder="60"
            value={duration}
            onChange={(event) => setDuration(event.target.value)}
          />
        </div>
        <input
          className="h-11 rounded-md border border-cream/10 bg-cream px-3 text-sm text-ink"
          placeholder="标签，可不填"
          value={tags}
          onChange={(event) => setTags(event.target.value)}
        />
        <button
          className="h-11 rounded-md bg-coral px-4 font-bold text-cream disabled:opacity-40"
          type="button"
          disabled={!title.trim()}
          onClick={submit}
        >
          加进活动池
        </button>
      </div>
    </div>
  );
}
