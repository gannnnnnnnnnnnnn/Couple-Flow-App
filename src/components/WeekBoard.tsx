import { CalendarDays, Check, Repeat2, Shuffle, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { formatWeekLabel } from '../domain/week';
import type { Activity, BudgetGroup, PairMember, Rating, ScheduledSession } from '../types';
import { Chip, EmptyState, SectionTitle, type Screen } from './common';

const ratings: Rating[] = ['夯', '顶级', '人上人', 'NPC', '拉完了'];

export function WeekBoard({
  activityById,
  activities,
  budgetById,
  currentWeekStart,
  members,
  needsReviewSessions,
  ongoingSessions,
  planningSessions,
  onComplete,
  onNotDone,
  onReplace,
  onRedraw,
  onNavigate,
}: {
  activityById: Map<string, Activity>;
  activities: Activity[];
  budgetById: Map<string, BudgetGroup>;
  currentWeekStart: string;
  members: PairMember[];
  needsReviewSessions: ScheduledSession[];
  ongoingSessions: ScheduledSession[];
  planningSessions: ScheduledSession[];
  onComplete: (session: ScheduledSession, rating: Rating) => void;
  onNotDone: (session: ScheduledSession, reason: string) => void;
  onReplace: (session: ScheduledSession, replacementActivityId: string) => void;
  onRedraw: (session: ScheduledSession) => void;
  onNavigate: (screen: Screen) => void;
}) {
  const openPlanCount =
    needsReviewSessions.length + ongoingSessions.length + planningSessions.length;

  return (
    <section className="space-y-5">
      <div className="rounded-md bg-ink p-5 text-cream shadow-soft">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm text-cream/70">本周看板</p>
            <h2 className="mt-1 text-3xl font-black">{formatWeekLabel(currentWeekStart)}</h2>
            <p className="mt-2 text-sm text-cream/70">
              {needsReviewSessions.length
                ? `${needsReviewSessions.length} 个过期计划待复盘`
                : `${openPlanCount} 个进行中的计划`}
            </p>
          </div>
          <div className="grid h-14 w-14 place-items-center rounded-md bg-coral text-cream">
            <CalendarDays size={27} />
          </div>
        </div>
      </div>

      <div>
        <SectionTitle title="待复盘" count={needsReviewSessions.length} />
        <div className="mt-3 space-y-3">
          {needsReviewSessions.length === 0 && (
            <EmptyState
              title="都处理完啦"
              body="过期但还没结果的计划会留在这里，直到你们说清楚它后来怎样了。"
            />
          )}
          {needsReviewSessions.map((session) => (
            <OngoingCard
              key={session.id}
              activity={activityById.get(session.activity_id)!}
              activities={activities}
              budgetById={budgetById}
              members={members}
              session={session}
              onComplete={onComplete}
              onNotDone={onNotDone}
              onReplace={onReplace}
              onRedraw={onRedraw}
              stateLabel="待复盘"
            />
          ))}
        </div>
      </div>

      <div>
        <SectionTitle title="本周" count={ongoingSessions.length} />
        <div className="mt-3 space-y-3">
          {ongoingSessions.length === 0 && (
            <EmptyState
              title="这周还没有计划"
              body="想来一点两个人的小仪式，就给本周抽一个。"
              action={
                <button
                  className="h-11 rounded-md bg-coral px-4 font-bold text-cream"
                  type="button"
                  onClick={() => onNavigate('draw')}
                >
                  抽本周
                </button>
              }
            />
          )}
          {ongoingSessions.map((session) => (
            <OngoingCard
              key={session.id}
              activity={activityById.get(session.activity_id)!}
              activities={activities}
              budgetById={budgetById}
              members={members}
              session={session}
              onComplete={onComplete}
              onNotDone={onNotDone}
              onReplace={onReplace}
              onRedraw={onRedraw}
              stateLabel="本周"
            />
          ))}
        </div>
      </div>

      <div>
        <SectionTitle title="计划中" count={planningSessions.length} />
        <div className="mt-3 space-y-3">
          {planningSessions.length === 0 && (
            <EmptyState
              title="下周还空着"
              body="选个预算，各自划掉不想要的，再一起揭晓。"
              action={
                <button
                  className="h-11 rounded-md bg-ink px-4 font-bold text-cream"
                  type="button"
                  onClick={() => onNavigate('draw')}
                >
                  抽下周
                </button>
              }
            />
          )}
          {planningSessions.map((session) => (
            <PlanCard
              key={session.id}
              activity={activityById.get(session.activity_id)!}
              budgetById={budgetById}
              session={session}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function OngoingCard({
  activity,
  activities,
  budgetById,
  members,
  session,
  onComplete,
  onNotDone,
  onReplace,
  onRedraw,
  stateLabel,
}: {
  activity: Activity;
  activities: Activity[];
  budgetById: Map<string, BudgetGroup>;
  members: PairMember[];
  session: ScheduledSession;
  onComplete: (session: ScheduledSession, rating: Rating) => void;
  onNotDone: (session: ScheduledSession, reason: string) => void;
  onReplace: (session: ScheduledSession, replacementActivityId: string) => void;
  onRedraw: (session: ScheduledSession) => void;
  stateLabel: '本周' | '待复盘';
}) {
  const [mode, setMode] = useState<'idle' | 'done' | 'missed' | 'replace' | 'redraw'>('idle');
  const [reason, setReason] = useState('');
  const [replacementId, setReplacementId] = useState('');
  const [agreedIds, setAgreedIds] = useState<string[]>([]);
  const replacements = useMemo(
    () =>
      activities.filter(
        (candidate) => candidate.status === 'active' && candidate.id !== activity.id,
      ),
    [activities, activity.id],
  );
  const bothAgreed = agreedIds.length === members.length;

  function toggleAgreement(memberId: string) {
    setAgreedIds((ids) =>
      ids.includes(memberId) ? ids.filter((id) => id !== memberId) : [...ids, memberId],
    );
  }

  return (
    <article className="rounded-md bg-white/85 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-clay">
            {stateLabel} · {formatWeekLabel(session.target_week_start_date)}
          </p>
          <h3 className="mt-1 text-lg font-bold text-ink">{activity.title}</h3>
          <p className="mt-1 text-sm text-ink/60">
            {stateLabel === '待复盘'
              ? '这个计划已经过期了。先补一个结果，它才会进记录。'
              : session.todo_text}
          </p>
        </div>
        <Chip tone={stateLabel === '待复盘' ? 'butter' : 'coral'}>
          {budgetById.get(activity.budget_group_id)?.name ?? '随意'}
        </Chip>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-2">
        <ActionButton icon={Check} label="完成" onClick={() => setMode('done')} />
        <ActionButton icon={X} label="没做" onClick={() => setMode('missed')} />
        <ActionButton icon={Repeat2} label="换一个" onClick={() => setMode('replace')} />
        <ActionButton icon={Shuffle} label="重抽" onClick={() => setMode('redraw')} />
      </div>

      {mode === 'done' && (
        <div className="mt-4 flex flex-wrap gap-2">
          {ratings.map((rating) => (
            <button
              key={rating}
              className="rounded-md bg-butter/50 px-3 py-2 text-sm font-bold text-ink"
              type="button"
              onClick={() => onComplete(session, rating)}
            >
              {rating}
            </button>
          ))}
        </div>
      )}

      {mode === 'missed' && (
        <div className="mt-4 grid gap-2">
          <input
            className="h-11 rounded-md border border-ink/10 bg-cream px-3 text-sm"
            placeholder="简单说下原因"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
          <button
            className="h-11 rounded-md bg-ink px-4 font-bold text-cream disabled:opacity-40"
            type="button"
            disabled={reason.trim().length < 3}
            onClick={() => onNotDone(session, reason.trim())}
          >
            记为没做
          </button>
        </div>
      )}

      {(mode === 'replace' || mode === 'redraw') && (
        <div className="mt-4 space-y-3 rounded-md bg-cream p-3">
          {stateLabel === '待复盘' && (
            <p className="text-sm font-semibold text-ink/60">
              过期计划如果换掉或重抽，会顺手排到本周。
            </p>
          )}
          {mode === 'replace' && (
            <select
              className="h-11 w-full rounded-md border border-ink/10 bg-white px-3 text-sm"
              value={replacementId}
              onChange={(event) => setReplacementId(event.target.value)}
            >
              <option value="">选一个替代活动</option>
              {replacements.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.title}
                </option>
              ))}
            </select>
          )}
          <div className="grid grid-cols-2 gap-2">
            {members.map((member) => (
              <button
                key={member.id}
                className={`h-10 rounded-md text-sm font-bold ${
                  agreedIds.includes(member.id)
                    ? 'bg-mint text-ink'
                    : 'bg-white text-ink/60'
                }`}
                type="button"
                onClick={() => toggleAgreement(member.id)}
              >
                {member.display_name} 同意
              </button>
            ))}
          </div>
          <button
            className="h-11 w-full rounded-md bg-ink px-4 font-bold text-cream disabled:opacity-40"
            type="button"
            disabled={!bothAgreed || (mode === 'replace' && !replacementId)}
            onClick={() =>
              mode === 'replace' ? onReplace(session, replacementId) : onRedraw(session)
            }
          >
            {mode === 'replace' ? '一起换掉' : '一起重抽'}
          </button>
        </div>
      )}
    </article>
  );
}

function PlanCard({
  activity,
  budgetById,
  session,
}: {
  activity: Activity;
  budgetById: Map<string, BudgetGroup>;
  session: ScheduledSession;
}) {
  return (
    <article className="rounded-md bg-white/85 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-clay">
            {formatWeekLabel(session.target_week_start_date)}
          </p>
          <h3 className="mt-1 text-lg font-bold text-ink">{activity.title}</h3>
          <p className="mt-1 text-sm text-ink/60">{session.todo_text}</p>
        </div>
        <Chip tone="mint">{budgetById.get(activity.budget_group_id)?.name ?? '随意'}</Chip>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {activity.tags.slice(0, 3).map((tag) => (
          <span
            key={tag}
            className="rounded-md bg-lilac/25 px-2.5 py-1 text-xs font-semibold text-ink/70"
          >
            {tag}
          </span>
        ))}
      </div>
    </article>
  );
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className="flex h-14 flex-col items-center justify-center gap-1 rounded-md bg-cream text-xs font-bold text-ink/70"
      type="button"
      onClick={onClick}
    >
      <Icon size={17} />
      {label}
    </button>
  );
}
