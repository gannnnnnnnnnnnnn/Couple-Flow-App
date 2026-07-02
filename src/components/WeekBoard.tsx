import { CalendarDays, Check, Repeat2, Shuffle, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import {
  getPlanActionItems,
  getPlanActionLabel,
  getPlanStatusLabel,
  getTargetWeekForPlanAction,
  type PlanActionId,
} from '../domain/state';
import { formatWeekLabel } from '../domain/week';
import type {
  Activity,
  BudgetGroup,
  PairMember,
  Rating,
  ScheduledSession,
  SessionOutcome,
} from '../types';
import { Chip, EmptyState, SectionTitle, type Screen } from './common';

const ratings: Rating[] = ['夯', '顶级', '人上人', 'NPC', '拉完了'];

export type PlanActionCommand =
  | { type: 'complete'; rating: Rating }
  | { type: 'not_done'; reason: string }
  | { type: 'move_week'; targetWeekStartDate: string }
  | { type: 'redraw' }
  | { type: 'replace'; replacementActivityId: string }
  | { type: 'cancel' };

export function WeekBoard({
  activityById,
  activities,
  budgetById,
  currentMemberId,
  currentWeekStart,
  members,
  needsReviewSessions,
  ongoingSessions,
  outcomes,
  pairedMode,
  planningSessions,
  onAgreePendingPlanAction,
  onNavigate,
  onPlanAction,
  onRejectPendingPlanAction,
}: {
  activityById: Map<string, Activity>;
  activities: Activity[];
  budgetById: Map<string, BudgetGroup>;
  currentMemberId: string;
  currentWeekStart: string;
  members: PairMember[];
  needsReviewSessions: ScheduledSession[];
  ongoingSessions: ScheduledSession[];
  outcomes: SessionOutcome[];
  pairedMode: boolean;
  planningSessions: ScheduledSession[];
  onAgreePendingPlanAction: (session: ScheduledSession) => void;
  onNavigate: (screen: Screen) => void;
  onPlanAction: (session: ScheduledSession, command: PlanActionCommand) => void;
  onRejectPendingPlanAction: (session: ScheduledSession) => void;
}) {
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const allOpenSessions = useMemo(
    () => [...needsReviewSessions, ...ongoingSessions, ...planningSessions],
    [needsReviewSessions, ongoingSessions, planningSessions],
  );
  const selectedSession =
    allOpenSessions.find((session) => session.id === selectedSessionId) ?? null;
  const selectedActivity = selectedSession
    ? activityById.get(selectedSession.activity_id) ?? null
    : null;
  const openPlanCount =
    needsReviewSessions.length + ongoingSessions.length + planningSessions.length;

  function closeSheet() {
    setSelectedSessionId(null);
  }

  return (
    <section className="space-y-5">
      <div className="rounded-md bg-ink p-5 text-cream shadow-soft">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm text-cream/70">计划</p>
            <h2 className="mt-1 text-3xl font-black">计划</h2>
            <p className="mt-2 text-sm text-cream/70">
              {needsReviewSessions.length
                ? `${needsReviewSessions.length} 个过期计划待处理`
                : `${openPlanCount} 个进行中的计划`}
            </p>
          </div>
          <div className="grid h-14 w-14 place-items-center rounded-md bg-coral text-cream">
            <CalendarDays size={27} />
          </div>
        </div>
      </div>

      <PlanSection
        activityById={activityById}
        budgetById={budgetById}
        currentWeekStart={currentWeekStart}
        emptyBody="过期但还没结果的计划会留在这里，直到补上完成、没做、换掉或重抽。"
        emptyTitle="没有待处理计划"
        onOpen={setSelectedSessionId}
        sessions={needsReviewSessions}
        title="待处理"
      />

      <PlanSection
        activityById={activityById}
        budgetById={budgetById}
        currentWeekStart={currentWeekStart}
        emptyAction={
          <button
            className="h-11 rounded-md bg-coral px-4 font-bold text-cream"
            type="button"
            onClick={() => onNavigate('draw')}
          >
            抽本周
          </button>
        }
        emptyBody="想来一点两个人的小仪式，就给本周抽一个。"
        emptyTitle="这周还没有计划"
        onOpen={setSelectedSessionId}
        sessions={ongoingSessions}
        title="本周"
      />

      <PlanSection
        activityById={activityById}
        budgetById={budgetById}
        currentWeekStart={currentWeekStart}
        emptyAction={
          <button
            className="h-11 rounded-md bg-ink px-4 font-bold text-cream"
            type="button"
            onClick={() => onNavigate('draw')}
          >
            抽下周
          </button>
        }
        emptyBody="选个预算，各自划掉不想要的，再一起揭晓。"
        emptyTitle="下周还空着"
        onOpen={setSelectedSessionId}
        sessions={planningSessions}
        title="之后"
      />

      {selectedSession && selectedActivity && (
        <PlanDetailSheet
          activity={selectedActivity}
          activities={activities}
          budgetById={budgetById}
          currentMemberId={currentMemberId}
          currentWeekStart={currentWeekStart}
          members={members}
          outcomes={outcomes}
          pairedMode={pairedMode}
          session={selectedSession}
          onAgreePending={() => onAgreePendingPlanAction(selectedSession)}
          onClose={closeSheet}
          onRejectPending={() => onRejectPendingPlanAction(selectedSession)}
          onSubmitAction={(command) => {
            onPlanAction(selectedSession, command);
            if (!pairedMode || command.type === 'complete' || command.type === 'not_done') {
              closeSheet();
            }
          }}
        />
      )}
    </section>
  );
}

function PlanSection({
  activityById,
  budgetById,
  currentWeekStart,
  emptyAction,
  emptyBody,
  emptyTitle,
  onOpen,
  sessions,
  title,
}: {
  activityById: Map<string, Activity>;
  budgetById: Map<string, BudgetGroup>;
  currentWeekStart: string;
  emptyAction?: ReactNode;
  emptyBody: string;
  emptyTitle: string;
  onOpen: (sessionId: string) => void;
  sessions: ScheduledSession[];
  title: string;
}) {
  return (
    <div>
      <SectionTitle title={title} count={sessions.length} />
      <div className="mt-3 space-y-3">
        {sessions.length === 0 && (
          <EmptyState title={emptyTitle} body={emptyBody} action={emptyAction} />
        )}
        {sessions.map((session) => {
          const activity = activityById.get(session.activity_id);
          if (!activity) {
            return null;
          }

          return (
            <SessionCard
              key={session.id}
              activity={activity}
              budgetById={budgetById}
              currentWeekStart={currentWeekStart}
              onOpen={() => onOpen(session.id)}
              session={session}
            />
          );
        })}
      </div>
    </div>
  );
}

function SessionCard({
  activity,
  budgetById,
  currentWeekStart,
  onOpen,
  session,
}: {
  activity: Activity;
  budgetById: Map<string, BudgetGroup>;
  currentWeekStart: string;
  onOpen: () => void;
  session: ScheduledSession;
}) {
  const stateLabel =
    session.target_week_start_date < currentWeekStart
      ? '待处理'
      : session.target_week_start_date === currentWeekStart
        ? '本周'
        : '之后';

  return (
    <button
      className="w-full rounded-md bg-white/85 p-4 text-left shadow-sm transition active:scale-[0.99]"
      type="button"
      onClick={onOpen}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-clay">
            {stateLabel} · {formatWeekLabel(session.target_week_start_date)}
          </p>
          <h3 className="mt-1 text-lg font-bold text-ink">{activity.title}</h3>
          <p className="mt-1 text-sm text-ink/60">{session.todo_text}</p>
          {session.pending_action_type && (
            <p className="mt-2 text-xs font-bold text-coral">等待双方确认</p>
          )}
        </div>
        <Chip tone={stateLabel === '之后' ? 'mint' : stateLabel === '待处理' ? 'butter' : 'coral'}>
          {budgetById.get(activity.budget_group_id)?.name ?? '随意'}
        </Chip>
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
    </button>
  );
}

function PlanDetailSheet({
  activity,
  activities,
  budgetById,
  currentMemberId,
  currentWeekStart,
  members,
  outcomes,
  pairedMode,
  session,
  onAgreePending,
  onClose,
  onRejectPending,
  onSubmitAction,
}: {
  activity: Activity;
  activities: Activity[];
  budgetById: Map<string, BudgetGroup>;
  currentMemberId: string;
  currentWeekStart: string;
  members: PairMember[];
  outcomes: SessionOutcome[];
  pairedMode: boolean;
  session: ScheduledSession;
  onAgreePending: () => void;
  onClose: () => void;
  onRejectPending: () => void;
  onSubmitAction: (command: PlanActionCommand) => void;
}) {
  const [mode, setMode] = useState<'idle' | 'done' | 'missed' | 'replace'>('idle');
  const [reason, setReason] = useState('');
  const [replacementId, setReplacementId] = useState('');
  const [pendingClickAction, setPendingClickAction] = useState<string | null>(null);
  const actions = getPlanActionItems(session, currentWeekStart);
  const replacements = activities.filter(
    (candidate) => candidate.status === 'active' && candidate.id !== activity.id,
  );
  const statusLabel = getPlanStatusLabel(session, outcomes, currentWeekStart);
  const pendingAction = session.pending_action_type;
  const pendingActionLabel = getPendingPlanActionLabel(session, currentWeekStart);
  const pendingRequestedByMe = session.pending_requested_by_member_id === currentMemberId;
  const currentMemberAgreed = session.pending_agreed_by_member_ids.includes(currentMemberId);
  const canRespondToPending =
    pairedMode && pendingAction && !pendingRequestedByMe && !currentMemberAgreed;
  const actionButtonsDisabled = pendingClickAction !== null;

  useEffect(() => {
    setPendingClickAction(null);
  }, [session.id, session.pending_action_type, session.pending_agreed_by_member_ids.length]);

  function runGuardedAction(actionId: string, callback: () => void) {
    if (pendingClickAction) {
      return;
    }

    setPendingClickAction(actionId);
    callback();
    window.setTimeout(() => {
      setPendingClickAction((currentAction) =>
        currentAction === actionId ? null : currentAction,
      );
    }, 1200);
  }

  function submitAction(actionId: PlanActionId) {
    const targetWeekStartDate = getTargetWeekForPlanAction(actionId, currentWeekStart);
    if (actionId === 'move_current' || actionId === 'move_next') {
      if (targetWeekStartDate) {
        onSubmitAction({ type: 'move_week', targetWeekStartDate });
      }
      return;
    }

    if (actionId === 'replace') {
      setMode('replace');
      return;
    }

    if (actionId === 'complete') {
      setMode('done');
      return;
    }

    if (actionId === 'not_done') {
      setMode('missed');
      return;
    }

    onSubmitAction({ type: actionId });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-ink/35 px-3 pb-3" role="presentation">
      <section
        aria-label="计划详情"
        className="max-h-[88vh] w-full overflow-y-auto rounded-md bg-cream p-4 shadow-soft"
        role="dialog"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-black text-clay">计划详情</p>
            <h2 className="mt-1 text-2xl font-black leading-tight text-ink">{activity.title}</h2>
          </div>
          <button
            aria-label="关闭"
            className="grid h-10 w-10 place-items-center rounded-md bg-white/80 text-ink"
            type="button"
            onClick={onClose}
          >
            <X size={19} />
          </button>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
          <DetailItem label="预算" value={budgetById.get(activity.budget_group_id)?.name ?? '随意'} />
          <DetailItem label="周次" value={formatWeekLabel(session.target_week_start_date)} />
          <DetailItem label="状态" value={statusLabel} />
          <DetailItem label="成员" value={members.map((member) => member.display_name).join(' + ')} />
        </dl>

        {(session.todo_text || activity.note) && (
          <div className="mt-4 space-y-2 text-sm font-semibold text-ink/70">
            {session.todo_text && <p>{session.todo_text}</p>}
            {activity.note && <p>{activity.note}</p>}
          </div>
        )}

        {pendingAction ? (
          <div className="mt-4 space-y-3 rounded-md bg-white/80 p-3">
            <p className="text-sm font-black text-ink">
              {pendingRequestedByMe || currentMemberAgreed
                ? '等待对方同意'
                : '对方想要改这个计划'}
            </p>
            <p className="text-sm font-semibold text-ink/60">
              {pendingRequestedByMe || currentMemberAgreed
                ? `已发起：${pendingActionLabel}`
                : `对方想要：${pendingActionLabel}`}
            </p>
            {canRespondToPending && (
              <div className="grid grid-cols-2 gap-2">
                <button
                  className="h-11 rounded-md bg-ink px-4 font-bold text-cream"
                  type="button"
                  disabled={actionButtonsDisabled}
                  onClick={() => runGuardedAction('agree', onAgreePending)}
                >
                  {pendingClickAction === 'agree' ? '处理中' : '同意'}
                </button>
                <button
                  className="h-11 rounded-md bg-white px-4 font-bold text-ink/65"
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
          <div className="mt-5 grid grid-cols-2 gap-2">
            {actions.map((action) => (
              <ActionButton
                key={action.id}
                icon={iconForAction(action.id)}
                label={action.label}
                disabled={actionButtonsDisabled}
                onClick={() => runGuardedAction(action.id, () => submitAction(action.id))}
              />
            ))}
          </div>
        )}

        {mode === 'done' && !pendingAction && (
          <div className="mt-4 flex flex-wrap gap-2">
            {ratings.map((rating) => (
              <button
                key={rating}
                className="rounded-md bg-butter/50 px-3 py-2 text-sm font-bold text-ink"
                type="button"
                disabled={actionButtonsDisabled}
                onClick={() =>
                  runGuardedAction(`complete:${rating}`, () =>
                    onSubmitAction({ type: 'complete', rating }),
                  )
                }
              >
                {rating}
              </button>
            ))}
          </div>
        )}

        {mode === 'missed' && !pendingAction && (
          <div className="mt-4 grid gap-2">
            <input
              className="h-11 rounded-md border border-ink/10 bg-white px-3 text-sm"
              placeholder="简单说下原因"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
            <button
              className="h-11 rounded-md bg-ink px-4 font-bold text-cream disabled:opacity-40"
              type="button"
              disabled={reason.trim().length < 3}
              onClick={() =>
                runGuardedAction('not_done', () =>
                  onSubmitAction({ type: 'not_done', reason: reason.trim() }),
                )
              }
            >
              记为没有做
            </button>
          </div>
        )}

        {mode === 'replace' && !pendingAction && (
          <div className="mt-4 grid gap-2">
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
            <button
              className="h-11 rounded-md bg-ink px-4 font-bold text-cream disabled:opacity-40"
              type="button"
              disabled={!replacementId || actionButtonsDisabled}
              onClick={() =>
                runGuardedAction('replace-submit', () =>
                  onSubmitAction({ type: 'replace', replacementActivityId: replacementId }),
                )
              }
            >
              换一个活动
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-white/70 px-3 py-2">
      <dt className="text-xs font-bold text-ink/45">{label}</dt>
      <dd className="mt-0.5 font-black text-ink">{value}</dd>
    </div>
  );
}

function ActionButton({
  disabled = false,
  icon: Icon,
  label,
  onClick,
}: {
  disabled?: boolean;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className="flex h-14 items-center justify-center gap-2 rounded-md bg-white text-sm font-black text-ink shadow-sm"
      type="button"
      disabled={disabled}
      onClick={onClick}
    >
      <Icon size={17} />
      {label}
    </button>
  );
}

function iconForAction(actionId: PlanActionId) {
  switch (actionId) {
    case 'complete':
      return Check;
    case 'redraw':
      return Shuffle;
    case 'replace':
      return Repeat2;
    case 'not_done':
    case 'cancel':
      return X;
    default:
      return CalendarDays;
  }
}

function getPendingPlanActionLabel(
  session: ScheduledSession,
  currentWeekStart: string,
) {
  if (session.pending_action_type === 'move_week') {
    if (session.pending_target_week_start_date === currentWeekStart) {
      return '改到本周';
    }

    if (session.pending_target_week_start_date) {
      return `改到 ${formatWeekLabel(session.pending_target_week_start_date)}`;
    }
  }

  return getPlanActionLabel(session.pending_action_type);
}
