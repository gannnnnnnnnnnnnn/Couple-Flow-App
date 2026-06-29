import {
  Ban,
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  Heart,
  History,
  Home,
  ListPlus,
  Settings,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { formatDateTime, formatWeekLabel, getWeekStartDate } from './dateUtils';
import {
  activities as mockActivities,
  banSlots,
  budgetGroups,
  drawCandidates,
  drawSessions,
  members,
  pair,
  scheduledSessions as mockScheduledSessions,
  sessionOutcomes,
} from './mockData';
import type { Activity, ScheduledSession, SessionOutcome } from './types';

type Screen = 'board' | 'pool' | 'draw' | 'history' | 'settings';

const navItems = [
  { id: 'board', label: 'Week', icon: Home },
  { id: 'pool', label: 'Pool', icon: ListPlus },
  { id: 'draw', label: 'Draw', icon: Sparkles },
  { id: 'history', label: 'History', icon: History },
  { id: 'settings', label: 'Pair', icon: Settings },
] satisfies { id: Screen; label: string; icon: LucideIcon }[];

function App() {
  const [activeScreen, setActiveScreen] = useState<Screen>('board');
  const [activities] = useState<Activity[]>(mockActivities);
  const [scheduledSessions, setScheduledSessions] = useState<ScheduledSession[]>(
    mockScheduledSessions,
  );
  const [outcomes] = useState<SessionOutcome[]>(sessionOutcomes);
  const [drawIndex, setDrawIndex] = useState(0);

  const currentWeekStart = useMemo(
    () => getWeekStartDate(new Date(), pair.timezone),
    [],
  );

  const outcomeBySessionId = useMemo(
    () => new Map(outcomes.map((outcome) => [outcome.scheduled_session_id, outcome])),
    [outcomes],
  );

  const activityById = useMemo(
    () => new Map(activities.map((activity) => [activity.id, activity])),
    [activities],
  );

  const budgetById = useMemo(
    () => new Map(budgetGroups.map((budget) => [budget.id, budget])),
    [],
  );

  const visibleSessions = useMemo(
    () => scheduledSessions.filter((session) => !outcomeBySessionId.has(session.id)),
    [outcomeBySessionId, scheduledSessions],
  );

  const ongoingSessions = visibleSessions.filter(
    (session) => session.target_week_start_date === currentWeekStart,
  );

  const planningSessions = visibleSessions.filter(
    (session) => session.target_week_start_date > currentWeekStart,
  );

  const historySessions = scheduledSessions.filter((session) =>
    outcomeBySessionId.has(session.id),
  );

  const currentDraw = drawSessions[0];
  const currentCandidate =
    drawCandidates.filter((candidate) => candidate.draw_session_id === currentDraw.id)[
      drawIndex % drawCandidates.length
    ];
  const candidateActivity = activityById.get(currentCandidate.activity_id)!;

  function acceptDraw() {
    const alreadyScheduled = scheduledSessions.some(
      (session) =>
        session.draw_session_id === currentDraw.id &&
        session.activity_id === candidateActivity.id,
    );

    if (alreadyScheduled) {
      setActiveScreen('board');
      return;
    }

    setScheduledSessions((sessions) => [
      ...sessions,
      {
        id: `session-${candidateActivity.id}-${Date.now()}`,
        pair_id: pair.id,
        activity_id: candidateActivity.id,
        draw_session_id: currentDraw.id,
        target_week_start_date: currentDraw.target_week_start_date,
        status:
          currentDraw.target_week_start_date === currentWeekStart ? 'ongoing' : 'planning',
        todo_text: 'Pick a time together',
        created_at: new Date().toISOString(),
      },
    ]);
    setActiveScreen('board');
  }

  return (
    <div className="min-h-screen bg-cream">
      <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 pb-24 pt-4 sm:px-6">
        <header className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-clay">
              Couple Flow
            </p>
            <h1 className="text-2xl font-bold text-ink">{pair.name}</h1>
          </div>
          <div className="flex -space-x-2">
            {members.map((member) => (
              <div
                key={member.id}
                className="grid h-10 w-10 place-items-center rounded-full border-2 border-cream text-sm font-bold text-white shadow-soft"
                style={{ backgroundColor: member.color }}
                title={member.display_name}
              >
                {member.display_name}
              </div>
            ))}
          </div>
        </header>

        {activeScreen === 'board' && (
          <WeekBoard
            activityById={activityById}
            budgetById={budgetById}
            currentWeekStart={currentWeekStart}
            ongoingSessions={ongoingSessions}
            planningSessions={planningSessions}
          />
        )}
        {activeScreen === 'pool' && (
          <ActivityPool
            activities={activities}
            budgetById={budgetById}
            activeCount={activities.filter((activity) => activity.status === 'active').length}
          />
        )}
        {activeScreen === 'draw' && (
          <DrawFlow
            activity={candidateActivity}
            budgetName={budgetById.get(candidateActivity.budget_group_id)?.name ?? 'open'}
            targetWeekStart={currentDraw.target_week_start_date}
            onAccept={acceptDraw}
            onRedraw={() => setDrawIndex((index) => index + 1)}
          />
        )}
        {activeScreen === 'history' && (
          <HistoryScreen
            activityById={activityById}
            historySessions={historySessions}
            outcomeBySessionId={outcomeBySessionId}
          />
        )}
        {activeScreen === 'settings' && (
          <SettingsScreen
            currentWeekStart={currentWeekStart}
            ongoingCount={ongoingSessions.length}
            planningCount={planningSessions.length}
          />
        )}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-ink/10 bg-cream/95 px-3 pb-3 pt-2 backdrop-blur">
        <div className="mx-auto grid max-w-3xl grid-cols-5 gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeScreen === item.id;
            return (
              <button
                key={item.id}
                className={`flex h-14 flex-col items-center justify-center gap-1 rounded-md text-xs font-semibold transition ${
                  isActive
                    ? 'bg-ink text-cream shadow-soft'
                    : 'text-ink/65 hover:bg-white/80 hover:text-ink'
                }`}
                type="button"
                onClick={() => setActiveScreen(item.id)}
                title={item.label}
              >
                <Icon size={19} strokeWidth={2.2} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

interface SessionListProps {
  activityById: Map<string, Activity>;
  budgetById: Map<string, { id: string; name: string; amount_hint: string }>;
  currentWeekStart: string;
  ongoingSessions: ScheduledSession[];
  planningSessions: ScheduledSession[];
}

function WeekBoard({
  activityById,
  budgetById,
  currentWeekStart,
  ongoingSessions,
  planningSessions,
}: SessionListProps) {
  return (
    <section className="space-y-5">
      <div className="rounded-md bg-ink p-5 text-cream shadow-soft">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm text-cream/70">This week</p>
            <h2 className="mt-1 text-3xl font-black">{formatWeekLabel(currentWeekStart)}</h2>
          </div>
          <div className="grid h-14 w-14 place-items-center rounded-md bg-coral text-cream">
            <CalendarDays size={27} />
          </div>
        </div>
      </div>

      <div>
        <SectionTitle title="Ongoing" count={ongoingSessions.length} />
        <div className="mt-3 space-y-3">
          {ongoingSessions.map((session) => (
            <SessionCard
              key={session.id}
              activity={activityById.get(session.activity_id)!}
              budgetName={
                budgetById.get(activityById.get(session.activity_id)!.budget_group_id)?.name ??
                'open'
              }
              session={session}
              tone="coral"
            />
          ))}
        </div>
      </div>

      <div>
        <SectionTitle title="Ban slots" count={banSlots.length} />
        <div className="mt-3 grid gap-2">
          {banSlots.map((slot) => (
            <div
              key={slot.id}
              className="flex items-center justify-between rounded-md border border-ink/10 bg-white/75 px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <Ban className="text-clay" size={18} />
                <div>
                  <p className="font-semibold text-ink">{slot.reason}</p>
                  <p className="text-sm text-ink/55">{formatDateTime(slot.starts_at, pair.timezone)}</p>
                </div>
              </div>
              <ChevronRight className="text-ink/35" size={18} />
            </div>
          ))}
        </div>
      </div>

      <div>
        <SectionTitle title="Planning" count={planningSessions.length} />
        <div className="mt-3 space-y-3">
          {planningSessions.map((session) => (
            <SessionCard
              key={session.id}
              activity={activityById.get(session.activity_id)!}
              budgetName={
                budgetById.get(activityById.get(session.activity_id)!.budget_group_id)?.name ??
                'open'
              }
              session={session}
              tone="mint"
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function ActivityPool({
  activities,
  budgetById,
  activeCount,
}: {
  activities: Activity[];
  budgetById: Map<string, { id: string; name: string; amount_hint: string }>;
  activeCount: number;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-ink">Activity Pool</h2>
          <p className="mt-1 text-sm text-ink/60">{activeCount} active ideas</p>
        </div>
        <button
          className="grid h-11 w-11 place-items-center rounded-md bg-coral text-cream shadow-soft"
          type="button"
          title="Add activity"
        >
          <ListPlus size={21} />
        </button>
      </div>
      <div className="space-y-3">
        {activities.map((activity) => (
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
          </article>
        ))}
      </div>
    </section>
  );
}

function DrawFlow({
  activity,
  budgetName,
  targetWeekStart,
  onAccept,
  onRedraw,
}: {
  activity: Activity;
  budgetName: string;
  targetWeekStart: string;
  onAccept: () => void;
  onRedraw: () => void;
}) {
  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-2xl font-black text-ink">Draw Flow</h2>
        <p className="mt-1 text-sm text-ink/60">Target week {formatWeekLabel(targetWeekStart)}</p>
      </div>
      <div className="rounded-md bg-coral p-5 text-cream shadow-soft">
        <div className="mb-5 flex items-center justify-between">
          <Sparkles size={26} />
          <Chip light>{budgetName}</Chip>
        </div>
        <h3 className="text-3xl font-black leading-tight">{activity.title}</h3>
        <p className="mt-3 text-cream/82">{activity.note}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          {activity.tags.map((tag) => (
            <span key={tag} className="rounded-md bg-cream/18 px-3 py-1 text-sm font-semibold">
              {tag}
            </span>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-[1fr_auto] gap-3">
        <button
          className="h-12 rounded-md bg-ink px-4 font-bold text-cream shadow-soft"
          type="button"
          onClick={onAccept}
        >
          Accept for week
        </button>
        <button
          className="grid h-12 w-12 place-items-center rounded-md border border-ink/12 bg-white text-ink"
          type="button"
          onClick={onRedraw}
          title="Redraw"
        >
          <Sparkles size={20} />
        </button>
      </div>
    </section>
  );
}

function HistoryScreen({
  activityById,
  historySessions,
  outcomeBySessionId,
}: {
  activityById: Map<string, Activity>;
  historySessions: ScheduledSession[];
  outcomeBySessionId: Map<string, SessionOutcome>;
}) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-2xl font-black text-ink">History</h2>
        <p className="mt-1 text-sm text-ink/60">{historySessions.length} archived outcomes</p>
      </div>
      <div className="space-y-3">
        {historySessions.map((session) => {
          const activity = activityById.get(session.activity_id)!;
          const outcome = outcomeBySessionId.get(session.id)!;
          return (
            <article key={session.id} className="rounded-md bg-white/80 p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-clay">
                    {formatWeekLabel(session.target_week_start_date)}
                  </p>
                  <h3 className="mt-1 text-lg font-bold text-ink">{activity.title}</h3>
                </div>
                {outcome.rating ? <Chip>{outcome.rating}</Chip> : <Chip>{outcome.outcome_type}</Chip>}
              </div>
              {outcome.reason && <p className="mt-3 text-sm text-ink/62">{outcome.reason}</p>}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function SettingsScreen({
  currentWeekStart,
  ongoingCount,
  planningCount,
}: {
  currentWeekStart: string;
  ongoingCount: number;
  planningCount: number;
}) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-2xl font-black text-ink">Settings / Pair</h2>
        <p className="mt-1 text-sm text-ink/60">{pair.timezone}</p>
      </div>
      <div className="grid gap-3">
        <InfoRow icon={Heart} label="Pair" value={pair.name} />
        <InfoRow icon={CalendarDays} label="Current week" value={currentWeekStart} />
        <InfoRow icon={Clock3} label="Mode" value="Local mock" />
        <InfoRow icon={Check} label="Open plans" value={`${ongoingCount + planningCount}`} />
      </div>
    </section>
  );
}

function SessionCard({
  activity,
  budgetName,
  session,
  tone,
}: {
  activity: Activity;
  budgetName: string;
  session: ScheduledSession;
  tone: 'coral' | 'mint';
}) {
  const toneClass = tone === 'coral' ? 'bg-coral text-cream' : 'bg-mint text-ink';
  return (
    <article className="rounded-md bg-white/85 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-clay">
            Week {formatWeekLabel(session.target_week_start_date)}
          </p>
          <h3 className="mt-1 text-lg font-bold text-ink">{activity.title}</h3>
          <p className="mt-1 text-sm text-ink/60">{session.todo_text}</p>
        </div>
        <span className={`rounded-md px-2.5 py-1 text-xs font-bold ${toneClass}`}>
          {budgetName}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {activity.tags.slice(0, 2).map((tag) => (
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

function SectionTitle({ title, count }: { title: string; count: number }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-xl font-black text-ink">{title}</h2>
      <span className="rounded-md bg-white/75 px-2.5 py-1 text-sm font-bold text-ink/60">
        {count}
      </span>
    </div>
  );
}

function Chip({ children, light = false }: { children: ReactNode; light?: boolean }) {
  return (
    <span
      className={`rounded-md px-2.5 py-1 text-xs font-bold ${
        light ? 'bg-cream/22 text-cream' : 'bg-butter/45 text-ink'
      }`}
    >
      {children}
    </span>
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
      <span className="text-sm font-bold text-ink/62">{value}</span>
    </div>
  );
}

export default App;
