import type { ReactNode } from 'react';
import type { Pair, PairMember } from '../types';
import { navItems, type Screen } from './common';

export function AppShell({
  activeScreen,
  children,
  members,
  navBadges = {},
  onNavigate,
  pair,
}: {
  activeScreen: Screen;
  children: ReactNode;
  members: PairMember[];
  navBadges?: Partial<Record<Screen, number>>;
  onNavigate: (screen: Screen) => void;
  pair: Pair;
}) {
  return (
    <div className="min-h-screen bg-cream">
      <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 pb-28 pt-4 sm:px-6">
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
        {children}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-ink/10 bg-cream/95 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-2 backdrop-blur">
        <div className="mx-auto grid max-w-3xl grid-cols-5 gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeScreen === item.id;
            return (
              <button
                key={item.id}
                className={`flex h-[3.75rem] min-w-0 flex-col items-center justify-center gap-1 rounded-md text-[0.72rem] font-semibold transition ${
                  isActive
                    ? 'bg-ink text-cream shadow-soft'
                    : 'text-ink/65 hover:bg-white/80 hover:text-ink'
                }`}
                type="button"
                onClick={() => onNavigate(item.id)}
                title={item.label}
              >
                <span className="relative grid place-items-center">
                  <Icon size={19} strokeWidth={2.2} />
                  {Boolean(navBadges[item.id]) && (
                    <span className="absolute -right-2 -top-2 grid h-4 min-w-4 place-items-center rounded-full bg-coral px-1 text-[0.62rem] font-black leading-none text-cream">
                      {navBadges[item.id]! > 9 ? '9+' : navBadges[item.id]}
                    </span>
                  )}
                </span>
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
