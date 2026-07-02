import {
  History,
  Home,
  ListPlus,
  Settings,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';

export type Screen = 'board' | 'pool' | 'draw' | 'history' | 'settings';

export const navItems = [
  { id: 'board', label: '计划', icon: Home },
  { id: 'pool', label: '活动池', icon: ListPlus },
  { id: 'draw', label: '抽签', icon: Sparkles },
  { id: 'history', label: '记录', icon: History },
  { id: 'settings', label: '设置', icon: Settings },
] satisfies { id: Screen; label: string; icon: LucideIcon }[];

export function SectionTitle({ title, count }: { title: string; count?: number }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-xl font-black text-ink">{title}</h2>
      {typeof count === 'number' && (
        <span className="rounded-md bg-white/75 px-2.5 py-1 text-sm font-bold text-ink/60">
          {count}
        </span>
      )}
    </div>
  );
}

export function Chip({
  children,
  tone = 'butter',
}: {
  children: ReactNode;
  tone?: 'butter' | 'mint' | 'coral' | 'ink' | 'light';
}) {
  const toneClass = {
    butter: 'bg-butter/45 text-ink',
    mint: 'bg-mint/30 text-ink',
    coral: 'bg-coral text-cream',
    ink: 'bg-ink text-cream',
    light: 'bg-cream/22 text-cream',
  }[tone];

  return <span className={`rounded-md px-2.5 py-1 text-xs font-bold ${toneClass}`}>{children}</span>;
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-md border border-dashed border-ink/16 bg-white/60 p-5 text-center">
      <p className="font-bold text-ink">{title}</p>
      <p className="mt-1 text-sm leading-5 text-ink/58">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function BudgetPill({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      className={`h-10 rounded-md px-3 text-sm font-bold transition ${
        active ? 'bg-ink text-cream shadow-soft' : 'bg-white/75 text-ink/65 hover:text-ink'
      }`}
      type="button"
      onClick={onClick}
    >
      {children}
    </button>
  );
}
