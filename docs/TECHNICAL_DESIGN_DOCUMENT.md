# Mortgage Tycoon — Technical Design Document

**Version:** 1.0 · July 2026
**Companion to:** `GAME_DESIGN_DOCUMENT.md` (the "what"); this document is the "how."
**Audience:** AI coding agents (Claude Code) and human reviewers. Every implementation session must read this file and the GDD before writing code.

---

## 1. Stack

| Layer | Choice | Why |
|---|---|---|
| Language | TypeScript (strict mode) | Type safety keeps AI-generated code consistent across sessions |
| UI | React 18 + Vite | All 10 designed screens are panel/card UI — React's home turf |
| State | Zustand | Simple store, no boilerplate, easy to serialize for saves |
| Styling | CSS Modules + CSS custom properties (design tokens) | Tokens map 1:1 to the Style Guide palette |
| Icons | lucide-react | Style Guide specifies Lucide outline icons |
| Fonts | Fraunces (headings) + Inter (body) via @fontsource | Per Style Guide |
| Animation | CSS transitions + Framer Motion for celebration moments | Confetti burst, reaction pops |
| Rendering (scenes) | **SVG/CSS components in v1 — no game engine yet** | See §1.1 |
| Testing | Vitest (engine unit tests only in v1) | Simulation must be testable headlessly |
| Persistence | localStorage + JSON export/import | No backend in v1 |
| Deploy | Static build → GitHub Pages | Free, zero-ops |

### 1.1 Decision: Phaser is deferred, not adopted

The original plan named Phaser. Reviewing the final mockups: 8 of 10 screens are pure UI (cards, Kanban, meters, trees). Only the **office scene** and **world map** are "game-looking," and both are static isometric compositions with gentle motion (idle bob, blink, ambient cars) — achievable with SVG + CSS keyframes at a fraction of the complexity. Adding a canvas engine now would double the architecture for two screens.

**Rule:** Build v1 engine-free. Revisit Phaser only if a post-v1 feature genuinely needs it (free-camera map, drag-to-place furniture, particles beyond confetti).

---

## 2. Architecture

**Prime directive: the simulation is a pure TypeScript engine with zero React imports.** The UI renders state and dispatches actions; it never computes game logic.

```
        ┌────────────────────────────┐
        │  /src/engine  (pure TS)    │
        │  tick(), reducers, RNG,    │
        │  balancing constants       │
        └────────────┬───────────────┘
                     │ GameState in / GameState out
        ┌────────────▼───────────────┐
        │  /src/store  (Zustand)     │
        │  holds GameState, exposes  │
        │  actions + selectors       │
        └────────────┬───────────────┘
                     │ hooks
        ┌────────────▼───────────────┐
        │  /src/ui  (React)          │
        │  screens, components,      │
        │  design tokens             │
        └────────────────────────────┘
```

Why this matters for AI-assisted development: the engine can be built and unit-tested without any UI existing, screens can be built against mock state without the engine existing, and a bug is always attributable to exactly one layer.

### 2.1 Folder structure

```
mortgage-empire-game/
├── docs/
│   ├── GAME_DESIGN_DOCUMENT.md
│   └── TECHNICAL_DESIGN_DOCUMENT.md
├── design/
│   └── mortgage_game_design.pen
├── CLAUDE.md                  ← agent instructions (see §7)
├── src/
│   ├── engine/
│   │   ├── types.ts           ← all interfaces (§3)
│   │   ├── constants.ts       ← ALL tunable numbers live here, nowhere else
│   │   ├── tick.ts            ← advanceHour(), advanceDay()
│   │   ├── loans.ts           ← stage transitions, requirements
│   │   ├── customers.ts       ← happiness/trust math, walk-away checks
│   │   ├── employees.ts       ← workload, morale, tags, salary
│   │   ├── events.ts          ← event table, weighted draw, effects
│   │   ├── economy.ts         ← income, expenses, interest-rate drift
│   │   ├── progression.ts     ← XP, levels/titles, achievements
│   │   ├── content/           ← data-only: archetypes, upgrades, neighborhoods, names
│   │   └── rng.ts             ← seeded RNG (mulberry32) for reproducible tests
│   ├── store/
│   │   ├── gameStore.ts
│   │   └── saveSystem.ts
│   ├── ui/
│   │   ├── tokens.css         ← Style Guide as CSS custom properties
│   │   ├── components/        ← Button, Card, Meter, Chip, KpiCard, Avatar…
│   │   ├── screens/           ← one folder per GDD screen (MainMenu, Dashboard, Pipeline…)
│   │   └── scenes/            ← OfficeScene.tsx, WorldMapScene.tsx (SVG)
│   ├── App.tsx                ← screen router (simple state-based, no react-router needed)
│   └── main.tsx
└── tests/
    └── engine/                ← Vitest specs mirroring /src/engine
```

---

## 3. Data model (canonical interfaces)

These are the contract between engine, store, and UI. Extend them only by updating this document first.

```ts
// v2 (terminology pivot, GDD §3/§4): authentic stages, documents, roles, products.
type LoanStage = 'lead' | 'preQualification' | 'application'
               | 'documentCollection' | 'processing' | 'underwriting'
               | 'clearToClose' | 'closing' | 'completed';
type LoanProduct = 'conventional' | 'fha' | 'va';
type LoanPurpose = 'purchase' | 'refinance';
type Role      = 'loanOfficer' | 'processor' | 'underwriter' | 'closer';
type DocumentKey = 'employmentVerification' | 'bankStatements' | 'governmentId'
                 | 'residenceHistory' | 'creditAuthorization' | 'taxReturns'
                 | 'homeInspectionReport';

interface Customer {
  id: string;
  name: string;
  age: number;
  buyerTypeLabel: string;            // "First-time Homebuyer"
  traits: TraitKey[];                // 2–3; modify patience/response/happiness math
  happiness: number;                 // 0–100
  happinessAtWeekStart: number;      // baseline for the "↑ 8 this week" trend chip (M5)
  trust: number;                     // 1–5 (fractional internally, bars in UI)
  portraitSeed: string;              // deterministic procedural portrait
  dreamHome: {
    name: string; neighborhoodId: string; beds: number; baths: number;
    categoryChip: string; price: number; downPayment: number; monthly: number;
  };
}

interface Loan {
  id: string;                        // "LN-2026-0001"
  customerId: string;
  product: LoanProduct;              // Conventional | FHA | VA (GDD §3, v2)
  purpose: LoanPurpose;              // Purchase | Refinance only (GDD §3, v2)
  amount: number;
  stage: LoanStage;
  daysInPipeline: number;
  documents: Record<DocumentKey, 'notRequired' | 'missing' | 'requested' | 'collected'>;
  assignedEmployeeId: string | null;
  statusTag: string | null;          // "Missing 2 docs", "Rate lock", …
  rate: number;
  termYears: 15 | 30;
  progressHours: number;             // hours accumulated toward the current stage (§4 rule c)
  delayed: boolean;                  // GDD §4 action 4 — set aside; no work happens, happiness decays daily (M5)
}

interface Employee {
  id: string;
  name: string;
  role: Role;
  level: number;                     // 1–3; promotion raises it — skill cap = 2.5 + level (M6)
  skill: number;                     // 1–5 (fractional internally, stars in UI), capped by level
  happiness: number;                 // 0–100
  workload: number;                  // 0–100, derived each tick from assigned loans
  salaryMonthly: number;
  tag: 'star' | 'readyToPromote' | 'overworked' | 'needsBreak' | null;
}

interface GameState {
  meta: { saveVersion: 4; playerName: string; officeName: string; createdAt: string };
  clock: { day: number; season: 'spring'|'summer'|'fall'|'winter'; weekday: number; hour: number };
  currencies: { coins: number; gems: number; research: number };
  stats: { reputation: number; interestRate: number; xp: number; level: number };
  customers: Record<string, Customer>;
  loans: Record<string, Loan>;
  employees: Record<string, Employee>;
  upgrades: Record<string, 'locked' | 'available' | 'purchased'>;   // 25 ids from GDD §7
  neighborhoods: Record<string, { status: 'locked'|'available'|'branch'|'mainOffice';
                                  demand: 'low'|'med'|'high'; leads: number }>;
  eventLog: GameEvent[];             // today's events; archived on day end
  achievements: Record<string, { earned: boolean; earnedOnDay?: number }>;
  dayHistory: DaySummary[];          // feeds End-of-Day deltas & charts
  glossary: Record<string, { unlocked: boolean; learned: boolean; learnedOnDay?: number }>;
                                     // progressive learning state (GDD §4.1); keys from the glossary module
  rngSeed: number;
}

// Supporting types referenced above (added in M1)
type TraitKey = 'enthusiastic' | 'detailOriented' | 'prompt'
              | 'impatient' | 'cautious' | 'chatty';

interface GameEvent {
  id: string;                        // deterministic: "evt-<day>-<hour>-<n>"
  day: number;
  hour: number;
  category: 'loans' | 'customers' | 'alerts';   // Dashboard feed filters (GDD §6)
  title: string;                     // player-facing — voice rules apply
  detail: string;
}

interface DaySummary {
  day: number;
  loansCompleted: number;
  revenue: number;                   // coins earned during the day
  xpEarned: number;
  starRating: 1 | 2 | 3 | 4 | 5;     // simple formula in M1; refined in M7 (GDD §10)
}
```

**Balancing rule:** every tunable number (fees, decay rates, event weights, costs) lives in `engine/constants.ts` with a comment referencing its GDD section. AI agents must never inline magic numbers into logic files.

---

## 4. Simulation model

- **Tick unit = 1 in-game hour**, 9 AM → 6 PM (10 ticks/day). `advanceHour()` progresses assigned loans, decays/boosts meters, and rolls the event table. `advanceDay()` runs 10 hours, computes the `DaySummary` (KPIs, star rating, badges), then pauses on the End-of-Day screen.
- **Player pacing:** the day advances on a real-time timer (default ~6s per hour, pausable, 1×/2×/3× speed). All player actions (Request Documents, Contact, hiring, purchases) apply instantly between ticks.
- **Determinism:** all randomness flows through the seeded RNG so that `advanceDay(state, seed)` is reproducible — this is what makes the engine unit-testable and balancing tweaks comparable.
- **Stage advancement:** a loan advances when (a) its stage requirements are met (e.g. all required docs `collected` for documents→review), (b) an employee of the owning role has capacity, and (c) enough progress-hours have accumulated (skill and upgrades reduce hours needed).

---

## 5. Save system

- **Autosave** to `localStorage` key `mortgage-empire:save:v1` at end of each day and on tab hide.
- **Manual export/import** as a downloadable `.json` (the End-of-Day "Save" button) so progress survives cleared browser data.
- `meta.saveVersion` + a `migrations.ts` map keeps old saves loadable as the schema evolves. **Rule:** any change to `GameState` shape requires a migration entry in the same PR.
- **v1 → v2** (terminology pivot): renames document keys, maps old stages (`documents`→`documentCollection`, `review`→`processing`, `approval`→`underwriting`), splits `Loan.type` into `product`+`purpose` (`firstHome`→FHA·Purchase, `homePurchase`→Conventional·Purchase, `refinance`→Conventional·Refinance, `investment`→Conventional·Purchase), renames the `reviewer` role to `underwriter`, and adds the empty `glossary` map.
- **v2 → v3** (M5 Customer Profile): adds `Loan.delayed = false` and `Customer.happinessAtWeekStart = happiness`.
- **v3 → v4** (M6 Employees): adds `Employee.level = 1`.

## 6.1 MortgageGlossary service (v2, GDD §4.1)

- `src/engine/content/glossary.ts` is the **single source of truth** for every term: key, display term, category, definition, whyItMatters, whereInProcess (a `LoanStage`), optional funFact, related keys. No definition text may live anywhere else — components render from this module. Centralized strings keep the app localization-ready.
- UI: `src/ui/glossary/GlossaryTerm.tsx` renders a bold term + ⓘ button and the tooltip (definition / why it matters / journey tracker with highlighted stage / fun fact; pinnable; Escape + outside-click close; adjustable text size persisted in `localStorage` under `mortgage-empire:ui:glossary-size`).
- Progressive state lives in `GameState.glossary` (per save): `unlocked` = term appeared in gameplay UI; `learned` = player opened it. Learning Center completion % = learned / total.

## 6. Design tokens

`src/ui/tokens.css` transcribes GDD §12 exactly: the 16 palette colors, radius scale (10/14/20/999px), shadow `0 6px 20px #2E241714`, focus ring, and font stacks. Components consume only `var(--…)` tokens — no hex codes in component files. This is the single place a future re-theme happens.

---

## 7. AI development workflow

Create `CLAUDE.md` at the repo root containing, at minimum:

```md
# Mortgage Tycoon — agent instructions
1. Read docs/GAME_DESIGN_DOCUMENT.md and docs/TECHNICAL_DESIGN_DOCUMENT.md before coding.
2. The GDD defines behavior; the TDD defines structure. Do not invent mechanics or rename concepts.
3. Engine code (src/engine) must have zero React imports and no magic numbers (use constants.ts).
4. UI uses design tokens only — no raw hex colors in components.
5. Voice rule for all player-facing strings: friendly coworker, no jargon
   ("papers" not "documents", "yes/no" not "approval").
6. Work on exactly one milestone per session. Run `npm run typecheck && npm test` before finishing.
7. Update docs first if the implementation requires a design change; flag it in the commit message.
```

**Session pattern (one milestone per session):**
> "Read CLAUDE.md and both docs. Implement Milestone N from TDD §8. Acceptance criteria are listed there. Do not start Milestone N+1."

Small, verifiable sessions prevent the classic failure mode: the agent inventing mechanics mid-build and drifting from the design.

---

## 8. Milestones

Each milestone ends in a working, committed build. Acceptance criteria are testable by playing for 2 minutes.

**M0 — Scaffold** · Vite + React + TS strict + Zustand + Vitest + tokens.css + CLAUDE.md; empty screen router; deploys to GitHub Pages. ✅ *Blank themed app loads in browser; CI green.*

**M1 — Engine core (no UI)** · types, constants, RNG, clock, one hardcoded customer+loan advancing through all 7 stages via `advanceHour()`; unit tests for stage transitions. ✅ *`npm test` proves a loan goes lead→completed deterministically.*

**M2 — Main Menu + save system** · Main Menu screen per mockup; New Game (name + office name), Continue, autosave/load, export/import. ✅ *Start a game, refresh browser, Continue restores it.*

**M3 — Dashboard shell** · Top KPI bar, sidebar nav, notification panel wired to eventLog; static office scene (SVG, idle bob). ✅ *KPIs tick as hours pass; notifications appear.*

**M4 — Pipeline + loan detail** · 7-column Kanban bound to real loans, summary metrics, detail popover with Move/Contact/Request actions. ✅ *Advance a real loan to Completed from the board; confetti fires.*

**M5 — Customer Profile** · Full 3-column screen: traits, happiness, trust, dream home, journey tracker, checklist, 4 action buttons; prev/next paging. ✅ *Requesting docs changes checklist state and happiness.*

**M6 — Employees** · Hire pool, role tabs, cards with meters/tags, Train/Promote/Assign; workload actually gates loan progress. ✅ *An overworked employee slows loans; hiring fixes it.*

**M7 — Economy + Upgrades + End of Day** · Payroll, closing fees, three currencies; 25-node upgrade tree with effects; End-of-Day screen (KPIs, hourly chart, events, badges, star rating); XP/levels/titles gate features per GDD §10. ✅ *A full day loop plays start to finish with meaningful money pressure.*

**M8 — World Map + Tutorial + polish** · Meadowbrook map, scouting, branch purchase, per-neighborhood leads; 7-step tutorial overlay; sound pass; balancing pass on constants.ts. ✅ *New player can go from New Game through the tutorial to opening the Riverside Village branch.*

**Post-v1 backlog:** Reports screen, per-branch staffing, Share card export, seasonal events, Phaser evaluation, more archetypes.

---

## 9. Coding standards (summary)

TypeScript strict, no `any`. Functional React components + hooks only. Engine functions are pure: `(state, action|rng) → state`. Named exports. Prettier defaults. Conventional commits (`feat(engine): …`, `feat(ui): …`). One PR/commit per milestone step; never mix engine and UI refactors in one commit.
