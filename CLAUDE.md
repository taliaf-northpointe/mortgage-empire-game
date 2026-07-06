# Mortgage Empire — agent instructions

1. Read `docs/GAME_DESIGN_DOCUMENT.md` and `docs/TECHNICAL_DESIGN_DOCUMENT.md` before coding.
2. The GDD defines behavior; the TDD defines structure. Do not invent mechanics or rename concepts.
3. Engine code (`src/engine`) must have zero React imports and no magic numbers (use `constants.ts`).
4. UI uses design tokens only (`src/ui/tokens.css`) — no raw hex colors in components.
5. Voice rule for all player-facing strings: friendly coworker, no jargon
   ("papers" not "documents", "yes/no" not "approval").
6. Work on exactly one milestone per session (TDD §8). Run `npm run typecheck && npm test`
   before finishing.
7. Update docs first if the implementation requires a design change; flag it in the commit message.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server (app served at `/mortgage-empire-game/`) |
| `npm run typecheck` | TypeScript strict check, no emit |
| `npm test` | Vitest, headless engine tests in `tests/` |
| `npm run build` | Typecheck + production build to `dist/` |

## Milestone status

- [x] M0 — Scaffold
- [x] M1 — Engine core (no UI)
- [ ] M2 — Main Menu + save system
- [ ] M3 — Dashboard shell
- [ ] M4 — Pipeline + loan detail
- [ ] M5 — Customer Profile
- [ ] M6 — Employees
- [ ] M7 — Economy + Upgrades + End of Day
- [ ] M8 — World Map + Tutorial + polish

Update this checklist in the same commit that completes a milestone.
