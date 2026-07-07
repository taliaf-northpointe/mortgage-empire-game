# Mortgage Tycoon

*(Formerly "Mortgage Empire" — the repository name keeps the old slug.)*

> *Build your neighborhood. Own the block.*

**A Cozy Tycoon Game** — a 2D isometric management game where you guide real, memorable people (not loan numbers) through the journey of buying a home. Grow from a single desk in Old Town into a thriving multi-branch mortgage company across the Meadowbrook Region by keeping customers happy, your team healthy, and your pipeline flowing.

| | |
|---|---|
| **Genre** | Cozy 2D isometric management / tycoon |
| **Platform** | Browser — desktop and mobile friendly |
| **Audience** | Casual players 16+ — no mortgage knowledge required |
| **Session length** | 10–30 minutes (one to a few in-game days) |
| **Stack** | TypeScript (strict) · React 18 + Vite · Zustand · CSS Modules + design tokens |
| **Status** | **v1 + the Solo Founder update** (M0–M9 and beyond) — play it at [taliaf-northpointe.github.io/mortgage-empire-game](https://taliaf-northpointe.github.io/mortgage-empire-game/) |

## You start alone

It's *your* mortgage company — so on day one, you're the whole staff. You welcome the leads, request the documents, sign off every page in underwriting, and close the loans yourself, at a founder's humble pace. Every hire automates their part of the journey (the manual buttons never go away): a Loan Officer opens files, a Processor chases paperwork, an Underwriter reviews documents one per hour, a Closer lands the keys. Later come the supporting cast — IT Support (level 5) to keep the Wi-Fi gremlins away, a Loan Officer Assistant (level 8) to mail your thank-you notes, and a Compliance Officer (level 15) you'll be very glad to have when the level-20 audit knocks.

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

- **Pipeline** — a 9-column Kanban board of active loans across three loan products (Conventional, FHA, VA) and two purposes (Purchase, Refinance), each with its own amounts, pace, and customer temperament. The early conversations move at the click of a button; from Processing onward the real waiting periods bind — including a per-document sign-off in Underwriting.
- **Glossary & Learning Center** — 33 beginner-friendly entries across Getting Started, Documents, Loan Process, and Financial Concepts; terms unlock as they appear in play, reading one earns XP, and every fifth level brings a pop quiz.
- **Customers** — a hand-drawn cast of borrowers with personality traits, a happiness meter, and a slower-moving trust level. Trusting customers send paperwork faster; nagged ones wear thin; a stressed or forgetful one sends the wrong papers; a truly neglected one walks away. Names and stories never repeat within a save.
- **Employees** — you start with none. Seven hireable roles (Loan Officer, Loan Officer Assistant, Processor, Underwriter, Closer, IT Support, Compliance Officer). Their pace is never a fixed number: skill, happiness, seniority, and workload all move it, and letting someone go shakes everyone who stays — the core tension.
- **The Wall of Homes** — every family you help gets a scrapbook page: their photo in front of their new home and the note they left on closing day. Send a thank-you note back (one per family) and word of mouth brings a brand-new referral lead.
- **Office mishaps** — from day 6, some mornings misbehave: Wi-Fi outages, printer jams, surprise system updates, a broken coffee machine. In-house IT makes them rarer, shorter, and gentler on morale.
- **Upgrades** — 25 upgrades across five categories (Office, Staff Training, Marketing, Technology, Customer Experience). Office tiers visibly renovate the room, desks and all.
- **Economy** — coins from closings and servicing, gems earned in play only (**no real-money purchases, ever**), research for tech unlocks, plus a drifting global interest rate that shifts lead volume and mix.
- **World map** — six neighborhoods in the Meadowbrook Region to scout, unlock, and open branches in.
- **Progression** — thirty career levels, from Loan Officer to Mortgage Mogul, gating features as the game opens up. Mastery invites adversity: from level 10 underwriting can bounce a file back, and level 20 brings a compliance audit. Day ratings, XP, badges, and an end-of-day summary close each loop.

## Look & voice

Cozy, warm, cheerful, educational. Warm sunset primaries with soft accents, never pure black, never sharp corners — plus a **Cozy Dark** theme in Settings. Headings in Fraunces, body in Inter. All the art is hand-made for the game: the isometric office (which grows through three stages as you upgrade), a cast of sixteen office faces, seventeen borrower households with their matching houses, and the Meadowbrook Region map — set to a lo-fi soundtrack. Confetti bursts when a loan closes — the game's signature payoff moment.

The writing rule: *"We write like a friendly coworker who happens to know mortgages. Short sentences. Use the real term — then make it feel easy. Celebrate small wins. When something goes wrong, offer a next step — never blame the player."*

## Architecture (v1)

The simulation is a **pure TypeScript engine with zero React imports** — the UI renders state and dispatches actions, never computes game logic. Time advances in one-hour ticks (9 AM–6 PM, 10 ticks per day), all randomness flows through a seeded RNG so every day is reproducible and unit-testable, and every tunable number lives in one constants file.

No game engine in v1: most screens are pure UI, and the scene screens (office, world map) render the hand-made isometric art with gentle motion — plain img/CSS handles them. Phaser is deferred until a feature genuinely needs it.

Saves autosave to `localStorage` with JSON export/import and a full migration chain (v1 → v11), so old saves keep working as the game grows. The app deploys as a static build to GitHub Pages. A replayable 14-step guided tour (the ? button) spotlights each part of the dashboard as it teaches.

Development proceeded in milestones (M0 scaffold → M8 world map/tutorial/polish → M9 Solo Founder), each ending in a working, committed build — see the [technical design document](docs/TECHNICAL_DESIGN_DOCUMENT.md) §8.

## Repository contents

| Path | What it is |
|---|---|
| [docs/GAME_DESIGN_DOCUMENT.md](docs/GAME_DESIGN_DOCUMENT.md) | **The "what"** — source of truth for all gameplay, content, and UI decisions. If code and this document disagree, the document wins — or gets updated first. |
| [docs/TECHNICAL_DESIGN_DOCUMENT.md](docs/TECHNICAL_DESIGN_DOCUMENT.md) | **The "how"** — stack, architecture, data model, save system, coding standards, and the M0–M8 milestone plan. Every implementation session reads both docs before writing code. |
| [design/mortgage_game_design.pen](design/mortgage_game_design.pen) | Pencil mockup source (10 screens, 233 design tokens) covering every screen in the game. |
