# Mortgage Tycoon — Game Design Document

*(Renamed from "Mortgage Empire", July 2026. The Pencil mockups still show the old title.)*

**Version:** 2.0 · July 2026 — *terminology pivot: authentic mortgage terms + glossary (supersedes v1's "no jargon" rule)*
**Status:** Design locked to Pencil mockup set v1 (`mortgage_game_design.pen`, 10 screens); §3/§4/§4.1/§5/§12 updated beyond the mockups
**Purpose:** This is the source of truth for all gameplay, content, and UI decisions. Every implementation session (human or AI) should reference this document. If code and this document disagree, this document wins — or this document gets updated first.

---

## 1. Game Overview

| | |
|---|---|
| **Title** | Mortgage Tycoon |
| **Tagline** | *Build your neighborhood. Own the block.* |
| **Genre** | Cozy 2D isometric management / tycoon |
| **Positioning pill** | "A Cozy Tycoon Game" |
| **Target audience** | Casual players 16+; no mortgage knowledge required |
| **Platform** | Browser (desktop-first, 1440×900 design canvas) |
| **Session length** | 10–30 minutes (one to a few in-game days) |
| **Educational goal** | A player who finishes the tutorial and a few days of play should be able to describe the real home-loan journey — using the real terms (Underwriting, Loan Estimate, Clear to Close) — because the game taught them gently as they played |

**Elevator pitch:** Mortgage Tycoon is a cozy management game where you guide real, memorable people — not loan numbers — through the journey of buying a home. You grow from a single desk into a regional mortgage company by keeping customers happy, your team healthy, and your pipeline flowing.

**Win condition:** There is no final boss. The long-term goal is transforming one desk in Old Town into a thriving multi-branch company across the Meadowbrook Region, with high reputation and happy customers. Progression milestones (Section 10) provide the sense of "winning."

**Lose condition:** Soft-fail only. Running out of money pauses hiring/upgrades and forces recovery play; it never hard-ends a save. Customers can walk away (lost loan, reputation hit), but the game never game-overs.

**Design pillars:**
1. **People, not paperwork.** Every loan is a character with a face, traits, and a dream home.
2. **Real terms, gently taught.** The game uses authentic mortgage terminology (Underwriting, Loan Estimate, Closing Disclosure) — and every term is glossary-linked with a friendly one-tap explanation (§4.1). Players learn the real process by osmosis, never by being lectured.
3. **Cozy, never punishing.** Setbacks create gentle pressure and choices, not failure screens.
4. **Simplified but truthful.** The pipeline mirrors the real process closely enough to be genuinely educational — without regulatory complexity, lender-specific edge cases, or term overload.

---

## 2. Core Gameplay Loop

```
Customer arrives (lead)
      ↓
Take application
      ↓
Collect documents ("papers")
      ↓
Review the file
      ↓
Approval decision ("Yes/No")
      ↓
Closing (signing)
      ↓
Completed — customer gets the keys 🎉
      ↓
Earn revenue → upgrade office / hire & train staff / expand to new neighborhoods
      ↓
More (and bigger) customers arrive
```

**Moment-to-moment play:** The player watches the office scene and notification feed, opens the Pipeline to advance loans, opens Customer profiles to resolve blockers (missing papers, unhappy customers), and manages Employees when workload tags appear. The day ends with an End-of-Day Summary, then the player starts the next day.

**Time model:** Day-based with seasons. The HUD displays e.g. `DAY 42 · SPRING · MONDAY`. Each day simulates a working timeline of 9 AM–6 PM (this drives the hourly revenue chart on the End-of-Day screen). Loans track "days in pipeline."

---

## 3. Loan Stages (The Pipeline)

**v2 pivot:** the pipeline now follows the real mortgage workflow with authentic stage names. Nine stages appear as Kanban columns; the remaining real-world steps are **sub-steps inside stages** (status tags + feed events), never extra columns — clarity over realism overload.

| # | Board stage | Progress | Sub-steps handled inside the stage | Owner |
|---|-------------|----------|-------------------------------------|-------|
| 1 | Lead | 6% | — | Loan Officer |
| 2 | Pre-Qualification | 14% | Loan Consultation | Loan Officer |
| 3 | Application | 24% | Loan Estimate issued (event) | Loan Officer |
| 4 | Document Collection | 36% | per-document checklist; most blockers live here | Processor |
| 5 | Processing | 50% | Appraisal ordered/complete · Title Review (status tags + events) | Processor |
| 6 | Underwriting | 64% | Conditional Approval (event on exit) | Underwriter |
| 7 | Clear to Close | 76% | Closing Disclosure sent (event) | Closer |
| 8 | Closing | 88% | Signing · Funding (event on exit) | Closer |
| 9 | Complete | 100% | keys handed over 🎉; loan enters **Servicing** (monthly payment trickle, §8) | Closer |

The full journey shown in glossary trackers (and the Customer screen journey tracker) reads: Lead → Pre-Qualification → Application → Document Collection → Processing → Appraisal → Title Review → Underwriting → Conditional Approval → Clear to Close → Closing → Funding → Loan Complete.

**Loan card data (Pipeline board):** avatar/initials, customer name, loan product + purpose, loan amount (e.g. `$340K`), days in pipeline, progress %, and optional status tag.

**Status tag vocabulary:** `Missing 2 docs`, `Ready`, `Appraisal ordered`, `Title review`, `Rate lock`, `Closed`.

**Loan products (3) × purpose (2) at launch — restricted by design:**
- **Conventional** — the standard product; Purchase or Refinance.
- **FHA** — lower down payments, popular with first-time buyers (Sarah Chen's loan). Purchase or Refinance.
- **VA** — for veterans and service members; famously low/no down payment. Purchase or Refinance.
- Purposes: **Purchase** and **Refinance** only. No investment/jumbo/cash-out complexity at launch.

**Pipeline summary metrics (top of Pipeline screen):** Total Loans, Total Volume ($), Avg. Time in Pipeline (days), Conversion Rate (%) — each with a delta vs. prior period.

**Loan detail popover (click a card):** customer name, loan ID (`LN-YYYY-NNNN` format), type, stage chip (`IN DOCUMENTS · DAY 6`), amount / term / rate, document checklist with per-item `Request` buttons, and actions **Move to [next stage]** and **Contact**.

---

## 4. Customers

Customers are the emotional core. Every customer has:

- **Identity:** name, portrait, age, buyer type label (e.g. "First-time Homebuyer · Age 32")
- **Personality traits:** 2–3 chips (e.g. `Enthusiastic`, `Detail-oriented`, `Prompt`). Traits modify behavior: response speed to document requests, patience (walk-away threshold), happiness sensitivity.
- **Happiness:** 0–100%, shown with a smile meter. Rises with speed, communication, and successful stages; falls with delays and repeated requests. Weekly trend shown (e.g. "↑ 8 this week").
- **Trust Level:** 1–5 bars, a slower-moving stat built through good service; high trust makes customers forgiving of hiccups and generates referrals.
- **Dream Home card:** home name + style ("Cozy Bungalow"), neighborhood, beds/baths, a category chip ("Family Home"), Home Price, Down Payment, and estimated Monthly payment. This is where the game quietly teaches price → down payment → monthly payment relationships.
- **Journey tracker:** the full loan journey (§3) with the current position and an encouraging status line ("You're doing great! Waiting on 2 more documents to move ahead.").
- **Loan Documents checklist** — authentic document names (v2 pivot), each glossary-linked (§4.1), with a friendly sub-label:

| In-game name (glossary-linked) | Friendly sub-label |
|---|---|
| Employment Verification | Recent paychecks from her job |
| Bank Statements | Savings and checking history |
| Government-Issued ID | Driver license or passport |
| Residence History | Where she has lived |
| Credit Report Authorization | Permission to check her credit |
| Tax Returns | Last year's taxes |
| Home Inspection Report | The inspector's write-up |

Not every loan requires every document — Refinance skips several. Checklist shows "5 of 7 collected · 2 more to go!" style progress with an encouragement chip ("Almost there!"). The broader real-world document set (Pay Stubs, W-2 Forms, Loan Estimate, Closing Disclosure, Purchase Agreement, Promissory Note…) appears in the Learning Center (§4.1) rather than as extra checklist rows — clarity over completeness.

**Player actions on a customer (4 buttons, fixed):**
1. **Request Documents** — ask for missing documents (small happiness cost if repeated)
2. **Continue Processing** — move to next stage (only when requirements met)
3. **Contact Customer** — send a friendly message (+happiness, +trust, small time cost)
4. **Delay** — set aside for later (happiness decays while delayed)

**Character archetype seeds (initial cast concepts):** Enthusiastic first-timer (Sarah Chen pattern), impatient investor (Ivan Petrov / Ravi Sethi pattern), retiree who needs guidance, growing family (The Martinez / Johnson Family pattern). Content goal at launch: ~12 named archetypes with trait combinations, drawn randomly with procedural names thereafter.

---

## 4.1 Mortgage Glossary & Learning Center (v2 system)

**Goal:** every mortgage term in the UI is a tiny doorway to learning — real mortgage education through simple gameplay, never a training manual.

**Glossary-linked terms.** Every mortgage-specific term in the UI renders **bold** with a small circular **ⓘ** info icon after it. Hover (desktop) or tap (mobile) opens a cozy tooltip containing:
1. **Definition** — one beginner-friendly sentence or two.
2. **Why it matters** — the purpose, in plain words.
3. **Where you are** — the loan journey list (§3) with the term's stage highlighted.
4. **Fun fact** *(optional)* — one short educational insight.

Tooltip rules: consistent ⓘ everywhere, cozy style, smooth hover/tap animation, never blocks gameplay, closes on outside click or Escape, can be **pinned** open. Tooltip text size is adjustable (S/M/L, persisted locally). Keyboard: the ⓘ is a real focusable button; entries are reachable by Tab; ARIA labels throughout.

**Mortgage Learning Center** — an in-game encyclopedia screen reached from the Dashboard sidebar. Four categories:
- **Getting Started:** Buying a Home · Mortgage Basics · Common Loan Types
- **Documents:** Loan Application · Pay Stubs · W-2 Forms · Tax Returns · Bank Statements · Loan Estimate · Closing Disclosure · plus the in-game checklist documents
- **Loan Process:** Pre-Qualification · Processing · Appraisal · Title Review · Underwriting · Conditional Approval · Clear to Close · Closing · Funding · Loan Servicing
- **Financial Concepts:** Down Payment · Interest Rate · Principal · Escrow · Debt-to-Income Ratio (DTI) · Loan-to-Value Ratio (LTV) · Closing Costs · Private Mortgage Insurance (PMI)

Each entry: beginner-friendly explanation, why it matters, where it appears in the process, related topics (clickable).

**Progressive learning.** Terms unlock a "seen in play" badge when they first appear in gameplay; opening a term (tooltip or Learning Center) marks it **Learned**. The Learning Center header shows completion % ("You've learned 12 of 33 terms"). All entries remain browsable — curiosity is never locked out.

**Technical rule (TDD §6.1):** one centralized glossary data module (the MortgageGlossary service) is the only place term content lives — no duplicated definitions, localization-ready, easy to extend.

**Balance rule:** authentic, but never overwhelming — no regulatory depth, no lender-specific edge cases, and never a wall of new terms at once.

---

## 5. Employees

**Roles (4 hireable at launch), mapped to pipeline stages:**

| Role | Owns stages (v2 pipeline, §3) | Mockup salary range |
|---|---|---|
| Loan Officer | Lead, Pre-Qualification, Application | $4,400–$5,800/mo |
| Processor | Document Collection, Processing | $3,600–$4,100/mo |
| Underwriter *(v1 "Reviewer")* | Underwriting | $4,700–$5,400/mo |
| Closer | Clear to Close, Closing, Complete | $4,200–$5,100/mo |

**Employee stats:** Skill (1–5 stars), Happiness (0–100%), Workload (0–100%), Monthly salary, loans in progress.

**Status tags (auto-applied by the simulation):**
- `Star Employee` — top skill + high happiness; small aura buff to nearby workers
- `Ready to Promote` — skill capped for current level; promote to unlock
- `Overworked` — workload ≥ ~90%; skill effectiveness drops
- `Needs a break` — sustained high workload + low happiness; risk of quitting if ignored

**Per-employee actions:** Train (spend money → skill XP), Promote (raise + skill cap increase), Assign Work (rebalance loans).
**Team-level actions:** Hire (new candidates with randomized skill/salary), plus team tabs filtered by role.
**Team header metrics:** headcount, average happiness, monthly payroll.

**Core tension:** more loans = more revenue, but overloading people tanks happiness → mistakes, slower stages, and eventually resignations. The Employees screen is where the player keeps the machine humane.

---

## 6. Random Events

Events fire during the day and land in the notification feed (Dashboard, right panel) with category filters `All / Loans / Customers / Alerts`, and are recapped on the End-of-Day screen.

**Positive (examples from mockups + thread):**
- Customer uploads documents early
- Customer writes a glowing review (+reputation)
- Referral arrives from a happy customer (new lead, high starting trust)
- New lead discovered in an unowned neighborhood (expansion teaser)
- Interest rates improve (more leads arrive)
- Deal streak — multiple closings in one hour (badge trigger)

**Negative:**
- Missing document discovered late in Review (loan bounces back to Documents)
- Customer changes jobs (Proof of Job must be re-collected)
- Appraisal/inspection delayed (Closing pushed)
- Customer makes a big purchase before closing (approval at risk — teaches a real lesson gently)
- Employee is starting to feel burned out (workload warning)
- Office internet outage (all stages slowed for N hours)
- Impatient customer threatens to walk (respond via Contact or lose the loan)

**Design rule:** every negative event must have a clear player response (an action button or an obvious next step). Events never silently ruin a run.

---

## 7. Upgrades

Five categories × five tiers = **25 upgrades**, displayed as left-to-right progression trees with three states: **Purchased** (check), **Available** (cost shown), **Locked** (lock icon; previous tier required). Header shows total progress ("11 / 25").

| Category | Theme line | Tier 1 → 5 (mockup names & coin costs) |
|---|---|---|
| Office Improvements | "Make your workspace cozy" | Cozy Chairs → Better Lighting → Coffee Machine (1,200) → Corner Office (3,500) → Executive Suite (12,000) |
| Staff Training | "Level up your team" | Basic Skills → Advanced Training → Leadership → Specialization (2,400) → Master Class (6,800) |
| Marketing | "Attract new customers" | Flyers → Local Ads (1,600) → Social Media (2,200) → TV Spots (5,400) → Brand Voice (9,000) |
| Technology | "Modernize the office" | Modern PCs → Fast Internet → CRM System (3,200) → AI Assistant (7,500) → Auto Approvals (14,000) |
| Customer Experience | "Delight your clients" | Welcome Kit → Coffee Bar (1,800) → Concierge (4,200) → Priority Line (6,500) → VIP Lounge (11,000) |

**Upgrade detail popover:** icon, name, `Category · Tier N`, one-line flavor description, 2–3 quantified benefit chips (e.g. `+15% new leads`, `+8% reputation`, `+5% happiness`), and a purchase button with cost.

**Effect mapping (what each category buffs):**
- Office → employee happiness & productivity
- Staff Training → skill growth rate & skill caps
- Marketing → lead volume & reputation
- Technology → stage processing speed & error reduction
- Customer Experience → customer happiness & trust gain

---

## 8. Economy

**Three currencies (as designed on the Upgrades screen header):**

| Currency | Earned by | Spent on |
|---|---|---|
| **Coins ($)** | Closing loans, monthly servicing trickle | Salaries, hiring, most upgrades, branch offices, training |
| **Gems** | Achievements/badges, 5-star days, milestone rewards | Premium/cosmetic upgrades, instant-finish a stage, rare candidates. *Earned in play only — no real-money purchases, ever.* |
| **Research** | Completing loans of new types, tutorial steps, "first time" discoveries | Technology-tier unlocks and specializations |

**Income:**
- Loan closing fee: % of loan amount (tunable; target ~1.5–2% so a $340K loan pays ~$5–7K)
- Monthly payment trickle from serviced loans (e.g. the "Payment Received · Johnson · $2,340 monthly" notification)
- Referral bonuses, achievement rewards

**Expenses:**
- Monthly payroll (visible on Employees header, e.g. "$42.6K")
- Upgrades, training, hiring costs
- Branch expansion (e.g. Riverside Village branch: **$45,000**)
- Scouting a neighborhood (cheap information purchase before committing)

**Ambient economy:** a global Interest Rate (HUD stat, e.g. 6.4%) drifts over time and shifts lead volume and mix (low rates → refinance wave; high rates → fewer but more serious buyers). This is the game's gentle macro-lesson.

**Reputation (0–100):** a HUD-level stat fed by reviews, completions, and events; gates some expansion and improves lead quality.

---

## 9. World Map & Expansion

**Region:** Meadowbrook Region — 6 neighborhoods at launch:

| Neighborhood | Launch state | Demand | Notes |
|---|---|---|---|
| Old Town | **Main Office** | High | Starting location; businesses + houses |
| Sunny Heights | Branch (unlockable early) | High | First expansion target in mockup state |
| Riverside Village | Available | High | "Cozy riverside community full of first-time buyers." 142 homes, 12 leads, branch cost $45,000 |
| Uptown Hills | Locked | Med | Larger homes, bigger loans |
| East Ridge | Locked | Low | Cheap to enter, slow burn |
| Green Valley | Locked | Med | Largest neighborhood (most houses) |

**Map UI:** left panel lists neighborhoods with status lines ("Main Office · 24 loans", "Available! · 12 leads", "Locked · —"); right detail panel shows description, Demand / Homes / Leads stats, branch cost, **Open Branch Office** button, and a **Send scouts first** secondary action (reveals hidden stats for a small fee). Legend: Main Office / Branch / Available / Locked / High Demand / Customers. Ambient life: people and cars animate on the map.

**Expansion loop:** Reputation + coins unlock neighborhoods → new branch generates local leads → local demand level sets lead rate → each branch needs staff assigned (post-launch: per-branch staffing; at launch, branches share the team pool).

---

## 10. Progression

**Player identity:** The player has a name, avatar, title, and level (Dashboard user card, e.g. "Alex Turner · CEO · Level 4" — name is chosen at New Game; "Alex Turner" is placeholder art).

**Reconciled design decision:** The thread proposed starting as a Loan Officer and earning promotions; the mockups show a CEO at Level 4. These merge as one system — **player level = career title**, and titles gate features:

| Level | Title | Unlocks |
|---|---|---|
| 1 | Loan Officer | Tutorial; one desk, one customer at a time; Lead→Application only (rest auto-resolve slowly) |
| 2 | Senior Loan Officer | Hire first Processor; Documents stage becomes playable |
| 3 | Branch Manager | Reviewer + Closer hires; full pipeline; Upgrades screen |
| 4 | CEO | World Map; first branch expansion; Reports |
| 5 | Regional Director | 3+ branches; advanced upgrades (Tier 4–5) |
| 6+ | Mortgage Mogul | Prestige-style long-game goals, seasonal events |

**XP sources:** completed loans, achievements (End-of-Day shows "+300 XP"), tutorial steps, first-time discoveries.

**Achievements/badges (launch set from mockups):** Deal Streak (3 loans in 1 hour), Happy Customer (5-star review), Team Builder (hired new employee), Rainmaker ($50K in a day), Scout (found new lead). Badges award XP and gems; End-of-Day surfaces newly earned badges with a `NEW` ribbon.

**Day rating:** each day is scored 1–5 stars from loans completed, satisfaction, morale, and events — shown on the End-of-Day hero ("Great day! · 4/5 stars").

---

## 11. Screens & UI Flow

**Navigation model:** persistent left sidebar on the Dashboard (`Office, Employees, Pipeline, Upgrades, Reports, Map, Settings` — with live count badges on Employees/Pipeline); sub-screens use a back button + breadcrumb (`Dashboard / Loan Pipeline`).

```
Main Menu ── New Game ──> Tutorial (7 steps, skippable) ──> Office Dashboard
                                                              │
              ┌───────────┬──────────┬────────────┬───────────┼──────────┬──────────┐
              ▼           ▼          ▼            ▼           ▼          ▼          ▼
           Office      Employees   Pipeline    Upgrades    Reports      Map      Settings
                                      │
                                      ▼
                              Loan detail popover ──> Customer Profile (prev/next paging: "Customer 3 of 24")
                                      
Day ends ──> End of Day Summary ──> Start Next Day ──> Dashboard (next day)
```

**Screen inventory (all 10 designed in Pencil):**

1. **Main Menu** — title + tagline, buttons `New Game / Continue / Settings / Credits / Exit`, animated town scene background, keyboard hint ("Press ENTER for New Game").
2. **Office Dashboard** — the hub. Top KPI bar (Money, Reputation /100, Active Loans, Happiness %, Interest %) + day/season chip; sidebar nav; central isometric office scene (workstations, employees, decor items like plants/water cooler that reflect purchased upgrades); notification panel with filter chips and event cards (title, detail, relative timestamp).
3. **Loan Pipeline** — 7-column Kanban, summary metric row, search + filter, loan detail popover.
4. **Customer Profile** — 3-column layout: portrait/traits/happiness/trust · dream home + journey · document checklist; 4-action row; prev/next customer paging.
5. **Employee Management** — team header stats + Hire; role tabs with counts; employee card grid; Train/Promote/Assign Work.
6. **Upgrades** — currency header (coins/gems/research), legend + total progress, 5 category rows × 5 nodes, purchase popover.
7. **World Map** — isometric region view, neighborhood list panel, detail/expansion panel, legend, zoom controls.
8. **End of Day Summary** — hero (day chip, verdict, star rating), 4 KPI cards with deltas, hourly revenue bar chart (9a–6p, today vs. yesterday), events highlights, badges earned, Up Next teaser, `Start Next Day` + Save/Share.
9. **Tutorial Overlay** — dimmed background with spotlight, mascot ("Alex says…"), step chip (`STEP 3 OF 7`), title + friendly explanation + tip bullets, Previous/Next/dot nav, persistent Skip Tutorial link, top progress indicator.
10. **Style Guide** — see Section 12.

**Tutorial content (7 steps):** Welcome & office tour → Meet your first customer → The pipeline → The Documents stage ("When a customer sends you their papers… Peek inside to see what's still missing!") → Approving & closing → Hiring your first employee → Your first day ends. Tone: encouraging tips, never walls of text.

---

## 12. Art & Content Style (binding rules from the Style Guide screen)

**Feel:** Cozy · Warm · Cheerful · Educational.

**Art direction target (v1.1, July 2026):** "lofi cozy 2D" per Talia's reference sheet — soft rounded characters with simple hair/outfits, isometric *rooms* (walls, windows, wall art, shelves, rugs) rather than floating floor islands, dense friendly props (plants, mugs, folders), and a pastel palette compatible with the §12 tokens. Current scenes are hand-coded SVG approximations; the full look lands when generated sprite/prop PNGs (from the reference) replace or augment the SVG layer.

**Color palette** (never pure black; "colorful but muted — warm sunset primaries with soft accents"):

| Group | Tokens |
|---|---|
| Warm primaries | Sunset `#E9A554` · Cream `#F5EFE0` · Terracotta `#D96658` · Honey `#F5C842` |
| Cool accents | Sky `#5EAAE0` · Sage `#5FA574` · Lavender `#9B7EDB` · Rose `#E86D93` |
| Neutrals | Ink `#2E2417` · Cocoa `#7A6D57` · Sand `#E7DFD0` · Paper `#FFFFFF` |
| Semantic | Success `#5FA574` · Warning `#E9A554` · Danger `#D96658` · Info `#5EAAE0` |

**Typography:** Headings — **Fraunces** (friendly serif, weight 700; scale 44/H1, 28/H2, 20/H3, 16/H4). Body — **Inter** (18/Lead, 14/Body, 11/Caption, 10/Label).

**Voice & tone (hard rule, v2):** "We write like a friendly coworker who happens to know mortgages. Short sentences. Use the real term — then make it feel easy: every mortgage term is glossary-linked (§4.1), and surrounding copy stays warm and plain. Encouraging, patient, curious. Celebrate small wins. When something goes wrong, offer a next step — never blame the player. Never stack more than one new term in a single sentence."

**Components:** rounded panels (radius scale 10 / 14 / 20 / 999 — never sharp corners), soft shadow `0 6px 20 #2E241714`, 1px sand borders, 2px warm focus ring.

**Iconography:** Lucide outline icons in rounded soft-color tiles; rounded friendly strokes, no thin technical lines, never solid black on white.

**Characters:** slightly cartoonish, big eyes, expressive, diverse; 120×140 base size; 5 core expressions (Happy, Excited, Thoughtful, Confused, Sad).

**Buildings:** 30° isometric suburban; bright roofs, warm siding, yellow windows, no sharp edges.

**Motion:** Idle Bob (±2px, 2.4s ease-in-out) · Blink (4s loop, 120ms close) · Confetti Burst on loan close (800ms) · Reaction Pop (scale 1.0→1.15, spring). Confetti-on-close is the game's signature payoff moment and ships in the first playable milestone.

---

## 13. Open Questions & Deferred Decisions

1. **"Northpointe Branch" label** on the Dashboard mockup — placeholder or intentional? Recommendation: make office name player-chosen at New Game; keep it out of shipped art for a public release.
2. **Reports screen** — in the sidebar nav but has no mockup. Deferred to a later milestone; hide the nav item until then.
3. **Per-branch staffing** — launch uses a shared employee pool; per-branch assignment is a post-launch system.
4. **Gems economy tuning** — earn rates need playtest data; the no-real-money rule is final.
5. **Save/Share on End-of-Day** — Save is core; Share (image export of the day card) is nice-to-have.
6. **Audio** — no direction yet. Cozy lo-fi loop + soft UI sounds proposed; needs its own mini style guide.
7. **Payroll deduction** is displayed from M6 (Employees header) but only *charged* from M7 (Economy) — charging salaries before lead generation matures would bankrupt every new game.
8. **Lead generation (M6, decided):** a simple seeded daily spawn (chance per morning, capped active loans, ~12 archetypes) ships with M6 so workload matters; richer referral/event-driven leads arrive with M7 events.
9. **v2 terminology pivot (July 2026, decided):** authentic mortgage terms + glossary replace the v1 "no jargon" rule. The Pencil mockups still show v1 labels ("Papers", "Yes/No", Reviewer) — mockups to be refreshed when convenient; this document wins meanwhile. The 17-step real workflow is compressed to 9 board columns with in-stage sub-steps (§3) per the "no excessive sub-steps in the main UI" rule.
10. **Tutorial copy** (§11) still references v1 wording — rewrite with glossary-linked terms when the Tutorial ships (M8).
11. **Tutorial rewards (M8, decided):** completing all 7 steps grants +100 XP and +5 research (GDD §8/§10 "tutorial steps"); skipping grants nothing. The overlay uses a cozy mascot card rather than literal spotlight cutouts.
12. **Map zoom controls (M8, deferred):** in the mockup but low-value at one region; revisit when a second region ships.
13. **Level gates simplified (M7, decided):** retro-locking already-built screens would frustrate players, so the §10 gate table applies forward only — the Upgrades screen unlocks at Level 3 (Branch Manager), upgrade Tiers 4–5 need Level 5 (Regional Director), and the Map will unlock at Level 4. Pipeline/Employees/Customer screens stay available from Level 1.
14. **Servicing income (M7, decided):** each Complete loan credits its full monthly payment once per 28-day month — a cozy simplification of real servicing margins that gives the long game its engine.

---

## 14. Companion Documents

- `TECHNICAL_DESIGN_DOCUMENT.md` *(next up)* — architecture (React + Phaser + TypeScript), folder structure, save format, coding standards, milestone plan.
- `mortgage_game_design.pen` — Pencil mockup source (10 screens, 233 design tokens). Suggested repo location: `design/`.
