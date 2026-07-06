# Mortgage Tycoon

*(Formerly "Mortgage Empire" — the repository name keeps the old slug.)*

> *Build your neighborhood. Own the block.*

**A Cozy Tycoon Game** — a 2D isometric management game where you guide real, memorable people (not loan numbers) through the journey of buying a home. Grow from a single desk in Old Town into a thriving multi-branch mortgage company across the Meadowbrook Region by keeping customers happy, your team healthy, and your pipeline flowing.

| | |
|---|---|
| **Genre** | Cozy 2D isometric management / tycoon |
| **Platform** | Browser (desktop-first, 1440×900 design canvas) |
| **Audience** | Casual players 16+ — no mortgage knowledge required |
| **Session length** | 10–30 minutes (one to a few in-game days) |
| **Stack** | TypeScript (strict) · React 18 + Vite · Zustand · CSS Modules + design tokens |
| **Status** | In development — M0–M4 complete, live at [taliaf-northpointe.github.io/mortgage-empire-game](https://taliaf-northpointe.github.io/mortgage-empire-game/) |

## The idea

A player who finishes the tutorial and a few days of play should be able to describe the real home-loan journey — using the real terms — because the game taught them gently as they played. Loans move through a nine-stage pipeline that mirrors the real process:

```
Lead → Pre-Qualification → Application → Document Collection → Processing
     → Underwriting → Clear to Close → Closing → Complete 🏠
```

Real-world sub-steps (Loan Estimate, Appraisal, Title Review, Conditional Approval, Closing Disclosure, Funding) happen *inside* those stages as status tags and feed events — clarity, not realism overload. Every mortgage term in the UI is **bold with a ⓘ**: hover or tap for a friendly definition, why it matters, and where it sits in the journey. The **Mortgage Learning Center** collects all glossary entries with progressive "Learned" tracking.

## Design pillars

1. **People, not paperwork.** Every loan is a character with a face, traits, and a dream home.
2. **Real terms, gently taught.** Authentic mortgage terminology (Underwriting, Loan Estimate, Closing Disclosure), every term glossary-linked with a one-tap plain-language explanation.
3. **Cozy, never punishing.** Setbacks create gentle pressure and choices — no failure screens, no hard game over.
4. **Simplified but truthful.** The loan journey is close enough to the real process to be genuinely educational — without regulatory complexity or term overload.

## Core systems

- **Pipeline** — a 9-column Kanban board of active loans across three loan products (Conventional, FHA, VA) and two purposes (Purchase, Refinance), each with its own amounts, pace, and customer temperament.
- **Glossary & Learning Center** — ~30 beginner-friendly entries across Getting Started, Documents, Loan Process, and Financial Concepts; terms unlock as they appear in play.
- **Customers** — personality traits, a happiness meter, a slower-moving trust level, and a Dream Home card that quietly teaches how price, down payment, and monthly payment relate.
- **Employees** — four hireable roles (Loan Officer, Processor, Underwriter, Closer) mapped to pipeline stages. More loans mean more revenue, but overworked people make mistakes and eventually quit — the core tension.
- **Random events** — positive and negative, from early document uploads to a customer buying a car right before closing. Every negative event has a clear player response; nothing silently ruins a run.
- **Upgrades** — 25 upgrades across five categories (Office, Staff Training, Marketing, Technology, Customer Experience).
- **Economy** — coins from closings and servicing, gems earned in play only (**no real-money purchases, ever**), research for tech unlocks, plus a drifting global interest rate that shifts lead volume and mix.
- **World map** — six neighborhoods in the Meadowbrook Region to scout, unlock, and open branches in.
- **Progression** — player level = career title, from Loan Officer to Mortgage Mogul, gating features as the game opens up. Day ratings, XP, badges, and an end-of-day summary close each loop.

## Look & voice

Cozy, warm, cheerful, educational. Warm sunset primaries with soft accents, never pure black, never sharp corners. Headings in Fraunces, body in Inter. Confetti bursts when a loan closes — the game's signature payoff moment.

The writing rule: *"We write like a friendly coworker who happens to know mortgages. Short sentences. Use the real term — then make it feel easy. Celebrate small wins. When something goes wrong, offer a next step — never blame the player."*

## Architecture (v1)

The simulation is a **pure TypeScript engine with zero React imports** — the UI renders state and dispatches actions, never computes game logic. Time advances in one-hour ticks (9 AM–6 PM, 10 ticks per day), all randomness flows through a seeded RNG so every day is reproducible and unit-testable, and every tunable number lives in one constants file.

No game engine in v1: eight of the ten screens are pure UI, and the two scene screens (office, world map) are static isometric compositions with gentle motion — SVG + CSS handles them. Phaser is deferred until a post-v1 feature genuinely needs it.

Saves autosave to `localStorage` with JSON export/import; the app deploys as a static build to GitHub Pages.

Development proceeds in nine milestones (M0 scaffold → M8 world map, tutorial & polish), each ending in a working, committed build — see the [technical design document](docs/TECHNICAL_DESIGN_DOCUMENT.md) §8.

## Repository contents

| Path | What it is |
|---|---|
| [docs/GAME_DESIGN_DOCUMENT.md](docs/GAME_DESIGN_DOCUMENT.md) | **The "what"** — source of truth for all gameplay, content, and UI decisions. If code and this document disagree, the document wins — or gets updated first. |
| [docs/TECHNICAL_DESIGN_DOCUMENT.md](docs/TECHNICAL_DESIGN_DOCUMENT.md) | **The "how"** — stack, architecture, data model, save system, coding standards, and the M0–M8 milestone plan. Every implementation session reads both docs before writing code. |
| [design/mortgage_game_design.pen](design/mortgage_game_design.pen) | Pencil mockup source (10 screens, 233 design tokens) covering every screen in the game. |
