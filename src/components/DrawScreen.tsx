import { Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { drawOneActivity, getEligibleActivities } from '../domain/draw';
import { formatWeekLabel } from '../domain/week';
import type {
  Activity,
  BudgetFilter,
  BudgetGroup,
  DrawSession,
  PendingDrawAction,
  PairMember,
  ScheduledSession,
  SessionOutcome,
  WeeklyActivityBan,
} from '../types';
import { BudgetPill, Chip, EmptyState, SectionTitle } from './common';

type DrawClickAction = 'accept' | 'agree' | 'change' | 'reject' | 'reroll';

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
  drawResult,
  currentMemberId,
  currentDrawSession,
  drawNotice,
  pairedMode,
  partnerDrawActive,
  requiresPairedAgreement,
  onTargetWeekChange,
  onBudgetChange,
  onToggleBan,
  onStartDraw,
  onDraw,
  onAccept,
  onRequestAction,
  onAgreePending,
  onRejectPending,
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
  drawResult: Activity | null;
  currentMemberId: string;
  currentDrawSession: DrawSession | undefined;
  drawNotice: string | null;
  pairedMode: boolean;
  partnerDrawActive: boolean;
  requiresPairedAgreement: boolean;
  onTargetWeekChange: (weekStart: string) => void;
  onBudgetChange: (budget: BudgetFilter) => void;
  onToggleBan: (memberId: string, activityId: string) => void;
  onStartDraw: () => boolean;
  onDraw: (result: Activity | null) => void;
  onAccept: (activity: Activity) => void;
  onRequestAction: (actionType: PendingDrawAction) => void;
  onAgreePending: () => void;
  onRejectPending: () => void;
}) {
  const [revealing, setRevealing] = useState(false);
  const [pendingClickAction, setPendingClickAction] = useState<DrawClickAction | null>(null);
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
    const result = drawOneActivity(eligibleActivities, Date.now());
    window.setTimeout(() => {
      onDraw(result);
      setRevealing(false);
    }, 520);
  }

  const pendingAction = currentDrawSession?.pending_action_type ?? null;
  const pendingRequestedByMe =
    !!pendingAction && currentDrawSession?.requested_by_member_id === currentMemberId;
  const hasAgreed =
    !!pendingAction && currentDrawSession?.agreed_by_member_ids.includes(currentMemberId);
  const pendingText =
    pendingAction === 'reroll'
      ? '重抽'
      : pendingAction === 'change'
        ? '换一个'
        : '接受';
  const partnerPendingText =
    pendingAction === 'reroll'
      ? '对方想重抽'
      : pendingAction === 'change'
        ? '对方想换一个'
        : '对方想接受';
  const canActOnResult =
    !!drawResult &&
    currentDrawSession?.status === 'revealed' &&
    !partnerDrawActive &&
    !revealing;
  const actionButtonsDisabled = pendingClickAction !== null;

  useEffect(() => {
    setPendingClickAction(null);
  }, [
    currentDrawSession?.pending_action_type,
    currentDrawSession?.result_activity_id,
    currentDrawSession?.status,
  ]);

  function runGuardedAction(action: DrawClickAction, callback: () => void) {
    if (pendingClickAction) {
      return;
    }

    setPendingClickAction(action);
    callback();
    window.setTimeout(() => {
      setPendingClickAction((currentAction) =>
        currentAction === action ? null : currentAction,
      );
    }, 1200);
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
            对方正在处理这周抽签，结果可能会同步更新。
          </p>
        )}
        <button
          className="mt-4 h-12 w-full rounded-md bg-coral px-4 font-black text-cream shadow-soft disabled:opacity-40"
          type="button"
          disabled={
            !eligibleActivities.length ||
            revealing ||
            currentDrawSession?.status.startsWith('pending_')
          }
          onClick={runDraw}
        >
          {revealing ? '揭晓中...' : '开抽'}
        </button>
      </div>

      <div>
        <SectionTitle title="揭晓区" count={drawResult ? 1 : 0} />
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
          {!revealing && !drawResult && (
            <EmptyState
              title="还没揭晓"
              body="先选屏蔽项，再点开抽。收下的卡会变成本周计划，不会直接进记录。"
            />
          )}
          {drawResult && (
            <article
              key={drawResult.id}
              className="animate-draw-reveal rounded-md bg-ink p-4 text-cream shadow-soft"
            >
              <div className="mb-4 flex items-center justify-between">
                <Sparkles size={22} />
                <Chip tone="light">{budgetById.get(drawResult.budget_group_id)?.name ?? '随意'}</Chip>
              </div>
              <h3 className="text-2xl font-black leading-tight">{drawResult.title}</h3>
              <p className="mt-2 text-sm text-cream/75">{drawResult.note}</p>
              {pendingAction ? (
                <div className="mt-5 space-y-3">
                  <p className="rounded-md bg-cream/15 px-3 py-2 text-sm font-bold text-cream/82">
                    {pendingRequestedByMe || hasAgreed
                      ? `等待对方同意${pendingText}`
                      : partnerPendingText}
                  </p>
                  {!pendingRequestedByMe && !hasAgreed && (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        className="h-11 rounded-md bg-cream px-4 font-bold text-ink disabled:opacity-45"
                        type="button"
                        disabled={actionButtonsDisabled}
                        onClick={() => runGuardedAction('agree', onAgreePending)}
                      >
                        {pendingClickAction === 'agree' ? '处理中' : '同意'}
                      </button>
                      <button
                        className="h-11 rounded-md bg-white/15 px-4 font-bold text-cream disabled:opacity-45"
                        type="button"
                        disabled={actionButtonsDisabled}
                        onClick={() => runGuardedAction('reject', onRejectPending)}
                      >
                        {pendingClickAction === 'reject' ? '处理中' : '不同意'}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-5 grid gap-2">
                  <button
                    className="h-11 w-full rounded-md bg-cream px-4 font-bold text-ink disabled:opacity-45"
                    type="button"
                    disabled={!canActOnResult || actionButtonsDisabled}
                    onClick={() => runGuardedAction('accept', () => onAccept(drawResult))}
                  >
                    {pendingClickAction === 'accept' ? '处理中' : '接受'}
                  </button>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      className="h-11 rounded-md bg-white/15 px-4 font-bold text-cream disabled:opacity-45"
                      type="button"
                      disabled={!canActOnResult || actionButtonsDisabled}
                      onClick={() => runGuardedAction('reroll', () => onRequestAction('reroll'))}
                    >
                      {pendingClickAction === 'reroll' ? '处理中' : '重抽'}
                    </button>
                    <button
                      className="h-11 rounded-md bg-white/15 px-4 font-bold text-cream disabled:opacity-45"
                      type="button"
                      disabled={!canActOnResult || actionButtonsDisabled}
                      onClick={() => runGuardedAction('change', () => onRequestAction('change'))}
                    >
                      {pendingClickAction === 'change' ? '处理中' : '换一个'}
                    </button>
                  </div>
                </div>
              )}
            </article>
          )}
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
