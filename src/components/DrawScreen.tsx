import { Sparkles } from 'lucide-react';
import { useState } from 'react';
import { drawActivities, getEligibleActivities } from '../domain/draw';
import { formatWeekLabel } from '../domain/week';
import type {
  Activity,
  BudgetFilter,
  BudgetGroup,
  DrawSession,
  PairMember,
  ScheduledSession,
  SessionOutcome,
  WeeklyActivityBan,
} from '../types';
import { BudgetPill, Chip, EmptyState, SectionTitle } from './common';

export function DrawScreen({
  activities,
  budgetGroups,
  budgetById,
  currentWeekStart,
  nextWeekStart,
  members,
  scheduledSessions,
  outcomes,
  bans,
  targetWeekStart,
  drawSessionId,
  budgetFilter,
  drawResults,
  currentMemberId,
  currentDrawSession,
  drawNotice,
  pairedMode,
  partnerDrawActive,
  onTargetWeekChange,
  onBudgetChange,
  onToggleBan,
  onStartDraw,
  onDraw,
  onAccept,
}: {
  activities: Activity[];
  budgetGroups: BudgetGroup[];
  budgetById: Map<string, BudgetGroup>;
  currentWeekStart: string;
  nextWeekStart: string;
  members: PairMember[];
  scheduledSessions: ScheduledSession[];
  outcomes: SessionOutcome[];
  bans: WeeklyActivityBan[];
  targetWeekStart: string;
  drawSessionId: string;
  budgetFilter: BudgetFilter;
  drawResults: Activity[];
  currentMemberId: string;
  currentDrawSession: DrawSession | undefined;
  drawNotice: string | null;
  pairedMode: boolean;
  partnerDrawActive: boolean;
  onTargetWeekChange: (weekStart: string) => void;
  onBudgetChange: (budget: BudgetFilter) => void;
  onToggleBan: (memberId: string, activityId: string) => void;
  onStartDraw: () => boolean;
  onDraw: (results: Activity[]) => void;
  onAccept: (activity: Activity) => void;
}) {
  const [revealing, setRevealing] = useState(false);
  const bannableActivities = activities.filter(
    (activity) =>
      activity.status === 'active' &&
      (budgetFilter === 'all' || activity.budget_group_id === budgetFilter),
  );
  const eligibleActivities = getEligibleActivities({
    activities,
    budgetGroupId: budgetFilter,
    targetWeekStartDate: targetWeekStart,
    drawSessionId,
    bans,
    scheduledSessions,
    outcomes,
  });

  function runDraw() {
    if (!onStartDraw()) {
      return;
    }

    setRevealing(true);
    const results = drawActivities(eligibleActivities, 3, Date.now());
    window.setTimeout(() => {
      onDraw(results);
      setRevealing(false);
    }, 520);
  }

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-2xl font-black text-ink">抽签</h2>
        <p className="mt-1 text-sm text-ink/60">选好周次和预算，每个人最多先划掉两个不想要的。</p>
      </div>

      {pairedMode && (
        <p className="rounded-md bg-mint/25 px-3 py-2 text-sm font-bold text-ink/70">
          配对模式：这台设备只能编辑我的选择，对方的选择只读同步。
        </p>
      )}
      {drawNotice && (
        <p className="rounded-md bg-butter/40 px-3 py-2 text-sm font-bold text-ink/70">
          {drawNotice}
        </p>
      )}

      <div className="grid grid-cols-2 gap-2">
        <button
          className={`h-12 rounded-md font-bold ${
            targetWeekStart === currentWeekStart ? 'bg-ink text-cream' : 'bg-white/75 text-ink/65'
          }`}
          type="button"
          onClick={() => onTargetWeekChange(currentWeekStart)}
        >
          本周
        </button>
        <button
          className={`h-12 rounded-md font-bold ${
            targetWeekStart === nextWeekStart ? 'bg-ink text-cream' : 'bg-white/75 text-ink/65'
          }`}
          type="button"
          onClick={() => onTargetWeekChange(nextWeekStart)}
        >
          下周
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        <BudgetPill active={budgetFilter === 'all'} onClick={() => onBudgetChange('all')}>
          全部
        </BudgetPill>
        {budgetGroups.map((budget) => (
          <BudgetPill
            key={budget.id}
            active={budgetFilter === budget.id}
            onClick={() => onBudgetChange(budget.id)}
          >
            {budget.name}
          </BudgetPill>
        ))}
      </div>

      <div className="space-y-3">
        {members
          .filter((member) => !pairedMode || member.id === currentMemberId)
          .map((member) => (
            <BanPanel
              key={member.id}
              activities={bannableActivities}
              bans={bans}
              budgetLabel={
                budgetFilter === 'all' ? '全部预算' : budgetById.get(budgetFilter)?.name ?? '预算'
              }
              drawSessionId={drawSessionId}
              editable
              member={member}
              title={pairedMode ? '我的屏蔽' : `${member.display_name} 这轮不想抽到`}
              onToggleBan={onToggleBan}
            />
          ))}
        {pairedMode &&
          members
            .filter((member) => member.id !== currentMemberId)
            .map((member) => (
              <BanPanel
                key={member.id}
                activities={bannableActivities}
                bans={bans}
                budgetLabel={
                  budgetFilter === 'all' ? '全部预算' : budgetById.get(budgetFilter)?.name ?? '预算'
                }
                drawSessionId={drawSessionId}
                editable={false}
                member={member}
                title="对方的屏蔽"
                onToggleBan={onToggleBan}
              />
            ))}
      </div>

      <div className="rounded-md bg-white/80 p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-ink">可抽活动</p>
            <p className="text-sm text-ink/58">{formatWeekLabel(targetWeekStart)} 那周</p>
          </div>
          <Chip tone={eligibleActivities.length ? 'mint' : 'butter'}>{eligibleActivities.length}</Chip>
        </div>
        {partnerDrawActive && (
          <p className="mt-3 rounded-md bg-cream px-3 py-2 text-sm font-bold text-ink/60">
            对方正在处理这周抽签，这台设备先只读查看。
          </p>
        )}
        {currentDrawSession?.status === 'accepted' && (
          <p className="mt-3 rounded-md bg-cream px-3 py-2 text-sm font-bold text-ink/60">
            这周已经收下一个计划了。
          </p>
        )}
        <button
          className="mt-4 h-12 w-full rounded-md bg-coral px-4 font-black text-cream shadow-soft disabled:opacity-40"
          type="button"
          disabled={
            !eligibleActivities.length ||
            revealing ||
            partnerDrawActive ||
            currentDrawSession?.status === 'accepted'
          }
          onClick={runDraw}
        >
          {revealing ? '揭晓中...' : '抽 1-3 个计划'}
        </button>
      </div>

      <div>
        <SectionTitle title="揭晓区" count={drawResults.length} />
        <div className={`mt-3 space-y-3 ${revealing ? 'animate-draw-shuffle' : ''}`}>
          {revealing && (
            <article className="rounded-md bg-ink p-4 text-cream shadow-soft">
              <div className="mb-4 flex items-center justify-between">
                <Sparkles size={22} />
                <Chip tone="light">抽签中</Chip>
              </div>
              <div className="h-7 w-3/4 rounded-md bg-cream/22" />
              <div className="mt-3 h-4 w-full rounded-md bg-cream/14" />
              <div className="mt-2 h-4 w-2/3 rounded-md bg-cream/14" />
            </article>
          )}
          {!revealing && drawResults.length === 0 && (
            <EmptyState
              title="还没揭晓"
              body="先选屏蔽项，再点抽签。收下的卡会变成本周计划，不会直接进记录。"
            />
          )}
          {drawResults.map((activity, index) => (
            <article
              key={activity.id}
              className="animate-draw-reveal rounded-md bg-ink p-4 text-cream shadow-soft"
              style={{ transform: `rotate(${(index - 1) * 1.2}deg)` }}
            >
              <div className="mb-4 flex items-center justify-between">
                <Sparkles size={22} />
                <Chip tone="light">{budgetById.get(activity.budget_group_id)?.name ?? '随意'}</Chip>
              </div>
              <h3 className="text-2xl font-black leading-tight">{activity.title}</h3>
              <p className="mt-2 text-sm text-cream/75">{activity.note}</p>
              <button
                className="mt-5 h-11 w-full rounded-md bg-cream px-4 font-bold text-ink disabled:opacity-45"
                type="button"
                disabled={partnerDrawActive}
                onClick={() => onAccept(activity)}
              >
                就它了
              </button>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function BanPanel({
  activities,
  bans,
  budgetLabel,
  drawSessionId,
  editable,
  member,
  title,
  onToggleBan,
}: {
  activities: Activity[];
  bans: WeeklyActivityBan[];
  budgetLabel: string;
  drawSessionId: string;
  editable: boolean;
  member: PairMember;
  title: string;
  onToggleBan: (memberId: string, activityId: string) => void;
}) {
  const memberBans = bans.filter(
    (ban) => ban.draw_session_id === drawSessionId && ban.member_id === member.id,
  );

  return (
    <div className="rounded-md bg-white/80 p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="font-black text-ink">{title}</p>
          <p className="text-xs font-semibold text-ink/50">{budgetLabel}</p>
        </div>
        <Chip tone={memberBans.length === 2 ? 'coral' : 'butter'}>{memberBans.length}/2</Chip>
      </div>
      <div className="grid gap-2">
        {activities.length === 0 && (
          <p className="rounded-md bg-cream px-3 py-3 text-sm font-semibold text-ink/55">
            这个预算里暂时没有可用活动。
          </p>
        )}
        {activities.map((activity) => {
          const isBanned = memberBans.some((ban) => ban.activity_id === activity.id);
          const disabled = !editable || (!isBanned && memberBans.length >= 2);
          return (
            <button
              key={activity.id}
              className={`flex min-h-11 items-center justify-between rounded-md px-3 text-left text-sm font-bold ${
                isBanned
                  ? 'bg-coral text-cream'
                  : disabled
                    ? 'bg-cream text-ink/35'
                    : 'bg-cream text-ink/70'
              }`}
              type="button"
              disabled={disabled}
              onClick={() => onToggleBan(member.id, activity.id)}
            >
              <span>{activity.title}</span>
              {isBanned && <span>{editable ? '已屏蔽' : '对方已屏蔽'}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
