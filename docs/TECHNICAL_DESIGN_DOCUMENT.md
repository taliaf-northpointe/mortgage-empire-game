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
  portraitSeed: string;              // deterministic procedural portrait (fallback)
  portraitId?: number;               // borrower-N.png (Talia's art); optional — old saves keep the drawn fallback
  portraitVariant?: number;          // 0 = first appearance; 1+ = repeat lead under the next alternate name
  about?: string;                    // one-line persona from the archetype, shown on the profile
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
  spriteId: number;                  // 1–8, gender-matched to the name, unique while sprites last (v8)
  level: number;                     // 1–3; promotion raises it — skill cap = 2.5 + level (M6)
  skill: number;                     // 1–5 (fractional internally, stars in UI), capped by level
  happiness: number;                 // 0–100
  workload: number;                  // 0–100, derived each tick from assigned loans
  salaryMonthly: number;
  tag: 'star' | 'readyToPromote' | 'overworked' | 'needsBreak' | null;
}

interface GameState {
  meta: { saveVersion: 8; playerName: string; officeName: string; createdAt: string;
          tutorialDone: boolean };   // M8 — tutorial shows once per save
  clock: { day: number; season: 'spring'|'summer'|'fall'|'winter'; weekday: number; hour: number };
  currencies: { coins: number; gems: number; research: number };
  stats: { reputation: number; interestRate: number; xp: number; level: number };
  customers: Record<string, Customer>;
  loans: Record<string, Loan>;
  employees: Record<string, Employee>;
  upgrades: Record<string, 'locked' | 'available' | 'purchased'>;   // 25 ids from GDD §7
  neighborhoods: Record<string, { status: 'locked'|'available'|'branch'|'mainOffice';
                                  demand: 'low'|'med'|'high'; leads: number;
                                  scouted: boolean }>;   // M8 — stats hidden until scouted (GDD §9)
  eventLog: GameEvent[];             // today's events; archived on day end
  achievements: Record<string, { earned: boolean; earnedOnDay?: number }>;
  dayHistory: DaySummary[];          // feeds End-of-Day deltas & charts
  todayRevenueByHour: number[];      // 10 running totals for the current day (M7); reset at rollover
  xpAtDayStart: number;              // snapshot at rollover for the daily XP stat (v7)
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
  revenue: number;                   // gross coins earned during the day (fees + servicing)
  payroll: number;                   // charged at day end (M7)
  servicingIncome: number;           // monthly trickle credited this day, if any (M7)
  xpEarned: number;
  starRating: 1 | 2 | 3 | 4 | 5;
  revenueByHour: number[];           // 10 entries, 9 AM → 6 PM — feeds the End-of-Day chart (M7)
  badgesEarned: string[];            // achievement ids earned during the day (M7)
  highlights: { title: string; detail: string }[]; // up to 6 feed events (M7)
}
```

**Balancing rule:** every tunable number (fees, decay rates, event weights, costs) lives in `engine/constants.ts` with a comment referencing its GDD section. AI agents must never inline magic numbers into logic files.

---

## 4. Simulation model

- **Tick unit = 1 in-game hour**, 9 AM → 6 PM (10 ticks/day). `advanceHour()` progresses assigned loans, decays/boosts meters, and rolls the event table. `advanceDay()` runs 10 hours, computes the `DaySummary` (KPIs, star rating, badges), then pauses on the End-of-Day screen.
- **Player pacing:** the day advances on a real-time timer (10s per hour at 1× after playtest tuning — a full day ≈ 100s; pausable, 1×/2×/3× speed). All player actions (Request Documents, Contact, hiring, purchases) apply instantly between ticks.
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
- **v4 → v5** (M7 Economy): adds `todayRevenueByHour` (zeros), populates the `upgrades` map (tier 1 available, rest locked), and backfills the extended `DaySummary` fields on existing history.
- **v5 → v6** (M8 Map + Tutorial): adds `neighborhood.scouted` (true for non-locked so veterans keep their visible stats) and `meta.tutorialDone = true` for existing saves (only fresh games see the tutorial).
- **v6 → v7** (M8.1 fix): adds `xpAtDayStart` so the End-of-Day summary reports the whole day (revenue is recorded at the payout source; completions come from the day's events) instead of a rollover-instant diff that always read zero in live play.
- **v7 → v8** (art sprites): adds `Employee.spriteId` — gender-matched via the shared first-name table, assigned least-used-first so the cast stays distinct.
- **v9 → v10** (bigger office cast): character sprites 1, 2, and 8 retired; new sprites 9–16 joined the pool. Employees wearing a retired face are re-assigned a gender-matched, least-used one.
- **v10 → v11** (the Wall of Homes): adds `GameState.memoryWall: MemoryEntry[]` — a scrapbook page per funded loan (family portrait, house, product/purpose, closing date, persona-keyed thank-you note from `engine/content/memoryWall.ts`). The migration backfills pages for already-completed loans (their closing date is null — it was never stored). New `MemoryWall` screen, reachable from the dashboard sidebar.
- **Living team & customers (playtest 2026-07-06 #2, optional fields — no migration):** `effectiveness()` is never static: skill × workload strain (linear decline past `HIGH_WORKLOAD` 75% to the 0.5 floor at 100%) × morale (`HAPPY_SPEED_MIN..MAX` across happiness) × seniority (`LEVEL_SPEED_BONUS_PER_LEVEL` per level). `fireEmployee` (+`fireBlockedReason`): removes staff, reassigns their loans, costs every teammate `FIRE_TEAM_HAPPINESS_COST` happiness; the last owner of a stage can't be fired. Customers: trust shortens the document cadence (`TRUST_DOC_HOURS_OFF_PER_2_TRUST`); forgetful (new trait) or unhappy (<40) customers can botch a delivery (seeded, the wait restarts); repeat document requests escalate (`Customer.nagCount`, cost = base × count); Contact's trust gain grows with reputation (`REPUTATION_TRUST_FACTOR`) and famous offices (≥70 rep) spawn leads with +1 trust.
- **Knowledge, challenges & scaling (playtest 2026-07-06, all optional fields — no migration):** underwriting now requires 8 hours (a real waiting period). The career ladder extends to level 30 (`MAX_PLAYER_LEVEL`; thresholds grow +1,000 XP +200/step past level 6; titles clamp at Mortgage Mogul). Reading a glossary term pays `XP_PER_TERM_LEARNED`; every `QUIZ_EVERY_LEVELS` levels `checkLevelUp` sets `GameState.quiz` (term seeded per level) — the QuizModal pays `QUIZ_XP` for a correct pick and resolves either way. Challenges: from level 10 `maybeUnderwritingRedo` can bounce a loan back once (`Loan.underwritingRedo`, one document reverts, back through Document Collection); from level 20 customers at ≤`WALKAWAY_HAPPINESS` walk away overnight (loan + customer removed, reputation cost). Leads scale with level (`LEAD_CHANCE_PER_LEVEL`, cap +1 per 2 levels). Persona uniqueness: names and abouts never repeat within a save (hand-written pools → seeded generators, uniqueness-checked against existing customers); repeat portraits are paired with houses they haven't lived in (`Customer.houseId`, purchase dream-home flavor follows the house via `HOUSE_FLAVOR`; refinancers keep their own home's identity). Sarah Chen is the only fixed identity.
- **The office visibly grows** (GDD §7, UI-only — no save change): `officeStage(state)` in `engine/upgrades.ts` maps office-category tiers to Talia's staged art (0–1 tiers → `office-room-1.png`/`desk-1.png`, 2–3 → stage 2, 4–5 → stage 3; cap in `OFFICE_ART_STAGES`). `OfficeScene` swaps the backdrop and desk sprites per stage, each on its native canvas.
- **`GameState.disruption` needs no migration** (optional field, GDD §6 office mishaps): `{ kind, hoursLeft } | null`. Spawned mornings from day 6 (chance scales with player level, capped 25%), one at a time, in `engine/content/disruptions.ts`. Effects in `advanceHour`: wifiDown halts all loan work; printerJam stops document arrivals; systemUpdate halves work speed; coffeeOut hits team happiness once. Lead spawning also gained a "warm opening": a lead is guaranteed each morning until the office holds `WARM_OPENING_LOANS` total loans.
- **M9 Solo Founder (playtest 2026-07-06 #3, optional fields — no migration):** new games start with **no employees** — the founder does every job by hand until roles are hired (`starter.ts` ships `employees: {}`). In `workLoan`, unstaffed stages accrue hours at `PLAYER_SOLO_SPEED` (0.5×) and **never auto-advance**: `moveLoanForward` (gated by `moveBlockedReason`: requirements + `STAGE_HOURS_REQUIRED` waiting periods) is the founder's click. Per-role automation once hired (manual always stays available): the loan officer advances ready stages; the processor auto-requests documents (solo, the file sits until YOU request); the underwriter signs off one document per hour into `Loan.docApprovals` (solo, `approveDocument` per document — `requirementsMet('underwriting')` needs every sign-off); the closer closes. Support roles unlock by level (`ROLE_UNLOCK_LEVEL`: IT 5, Compliance 15 — UI-gated hire tabs): in-house IT halves disruption chance (`IT_DISRUPTION_CHANCE_FACTOR`), shortens fixes (`IT_DISRUPTION_HOURS_OFF`), and softens the coffee-morale hit; at level `AUDIT_LEVEL` (20) a one-time compliance audit (`GameState.auditDone`) passes (+`AUDIT_PASS_REPUTATION_BONUS`) with a Compliance Officer or docks `AUDIT_REPUTATION_PENALTY` reputation without. `fireBlockedReason` is now always null — the founder can cover any stage. Tutorial rewritten (14 steps) around the company-of-one arc.
- **Thank-you notes & referrals (playtest 2026-07-07, optional field — no migration):** `MemoryEntry.thanked` marks a Wall of Homes page whose family got a thank-you note back — once per borrower. `sendThankYouNote(state, loanId)` (playerActions) sets it and calls `spawnReferralLead` (leads.ts — the daily spawn body extracted into a shared `spawnLead`; referrals skip the daily luck AND the loan cap, seeded per day + customer count). New role `loanOfficerAssistant` (unlock level 8, `ROLE_UNLOCK_LEVEL`): each morning in `advanceDay` it mails `ASSISTANT_THANK_YOUS_PER_MORNING` (1) note(s) automatically. Wall cards grow a "Send a thank-you note" button / "sent" chip.
- **Manual flow polish (playtest 2026-07-07, no save change):** `MANUAL_MOVE_INSTANT_STAGES` (lead, preQualification, application, documentCollection) — a manual Continue click moves these instantly (no waiting period; requirements like "all documents in" still gate documentCollection). Waiting periods bind manual moves from processing onward; automation always works by the hour. `requestDocument`/`requestAllDocuments` now refuse before the loan reaches documentCollection (UI hides/disables the buttons too). Tutorial: spotlight targets scroll into view (`block: 'start'`, `scroll-margin-top`) and track page scroll — fixes phones, where the dashboard scrolls; the card caps at 58vh in spotlight mode, nav dots hide, and Previous/Next share the row.
- **v8 → v9** (borrower art): backfills Sarah Chen's `portraitId`/`about`. The customer portrait fields are otherwise optional — new leads get them from their archetype (one persona per borrower portrait, `borrower-2..14.png`); other pre-v9 customers keep the procedural drawn portrait. Lead spawning cycles the whole cast before any portrait repeats (least-used-first); a repeat arrives under its next alternate name with the art untouched (no tinting — art variety comes from adding more images).

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
