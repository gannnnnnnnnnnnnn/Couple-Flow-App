# Couple Flow

A playful weekly planning board for a couple.

Couple Flow helps two people keep a shared pool of activity ideas, draw weekly plans, protect unavailable slots, schedule to-dos, and keep true history only after a real outcome.

## V0 Scope

- Mobile-first PWA
- Vite + React + TypeScript + Tailwind
- Supabase-ready data model
- Local mock mode for UI development
- Screens:
  - Week Board
  - Activity Pool
  - Draw Flow
  - History
  - Settings / Pair

Out of scope for V0: photos, maps, payments, and push notifications.

## Critical Product Rule

A drawn activity is not history. Drawn and accepted activities become scheduled plans for a target week. They enter History only after completion, not-done, agreed replacement, or agreed redraw.

## Local Development

```bash
npm install
npm run dev
```

## Validation

```bash
npm run build
```

## Documentation

- [Product spec](docs/product_spec.md)
- [State machine](docs/state_machine.md)
- [Data model](docs/data_model.md)
- [UI/UX spec](docs/ui_ux_spec.md)
- [Current state](docs/current_state.md)
- [PR checklist](docs/pr_checklist.md)
