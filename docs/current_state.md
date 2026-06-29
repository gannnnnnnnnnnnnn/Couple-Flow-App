# Current State

## Snapshot

This is the first spec-driven draft for Couple Flow.

## Implemented

- Product harness docs are defined.
- V0 app scaffold uses React, TypeScript, Tailwind, Vite, and PWA metadata.
- Local mock data mirrors the Supabase-ready table names and core fields.
- Week Board, Activity Pool, Draw Flow, History, and Settings / Pair screens exist.
- Critical state rule is represented in UI data flow: draw/accept creates a scheduled session, not history.
- History renders only scheduled sessions with a `session_outcomes` record.

## Intended App Behavior

- Week Board separates This Week from Planning.
- Activity Pool uses mock data shaped like future Supabase tables.
- Draw Flow accepts a candidate into a scheduled target week.
- History renders only sessions with outcomes.
- Settings exposes pair timezone and local mock mode.

## Known Gaps

- Supabase is not connected yet.
- No authentication or real pair invite flow yet.
- Draw logic is deterministic/mock-first for UI development.
- Agreement enforcement is represented in data and UI copy, not backed by server rules.
- Offline caching is app-shell-only and has not been tuned for runtime data.
