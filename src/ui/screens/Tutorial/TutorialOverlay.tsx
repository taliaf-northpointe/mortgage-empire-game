import { useEffect, useState } from 'react';
import { useGameStore } from '../../../store/gameStore';
import { Button } from '../../components/Button';
import styles from './TutorialOverlay.module.css';

interface TutorialStep {
  title: string;
  body: string;
  tips: string[];
  /** Matches a [data-tutorial="…"] element on the Dashboard; that element gets the spotlight. */
  highlight?: string;
}

/**
 * GDD §11 — the guided tour. Numbers here mirror src/engine/constants.ts;
 * update both together. Each step can spotlight the piece of the Dashboard
 * it describes via `highlight`.
 */
const STEPS: TutorialStep[] = [
  {
    title: 'Welcome to your office! 🏠',
    body: "You run a small mortgage office, and your mission is wonderfully simple to state: help your neighbors become homeowners. Time advances on its own — roughly one in-game hour every 10 seconds — and each business day runs 9 AM to 6 PM before pausing on an evening summary.",
    tips: [
      'The highlighted controls set the pace: pause, 1×, 2×, or 3×.',
      'Menus, this tour, and the evening summary all stop the clock — nothing happens without you.',
    ],
    highlight: 'speed',
  },
  {
    title: 'Your vital signs 📊',
    body: 'These five numbers tell you how the office is doing at a glance. Money is earnings minus salaries and upgrades. Reputation (out of 100) rises with every closed loan and unlocks new neighborhoods. Active Loans counts files in motion. Happiness averages your customers\' moods. And the Interest Rate drifts daily — when it dips, more buyers come shopping.',
    tips: [
      'Money declining during a quiet day is normal: payroll is charged daily.',
      'A low-rate morning is an excellent time to grow.',
    ],
    highlight: 'kpis',
  },
  {
    title: 'Meet Sarah Chen 👋',
    body: "Your first customer is already waiting. Sarah is a first-time homebuyer with her heart set on a Cozy Bungalow in Old Town, applying for an FHA loan — a program first-timers favor because it permits a smaller down payment. Every customer shows two feelings: Happiness (how the process feels) and Trust (how much they believe in you).",
    tips: [
      'Open the highlighted Pipeline and click her card to follow her loan.',
      'Her profile holds her photo, her story, her dream home, and her documents.',
    ],
    highlight: 'nav-pipeline',
  },
  {
    title: 'The journey, part 1: getting started 🚶',
    body: 'Every loan walks the authentic mortgage road, one stage at a time. Lead: a curious neighbor says hello. Pre-Qualification: a quick estimate of what they can afford. Application: the official paperwork, answered by a Loan Estimate that spells out the rate and costs. Document Collection: gathering their real paperwork — more on that shortly.',
    tips: [
      'Your Loan Officer owns these early stages.',
      'Bold terms with a little ⓘ open friendly explanations — tap any of them.',
    ],
    highlight: 'nav-pipeline',
  },
  {
    title: 'The journey, part 2: to the keys 🔑',
    body: 'Processing: your team verifies everything that came in, ordering the Appraisal and Title Review. Underwriting: the decisive review that ends in a Conditional Approval. Clear to Close: the green light. Closing: the signing table. Complete: the loan funds, keys change hands, and confetti flies.',
    tips: [
      'Loans progress automatically while their owner works.',
      'Between certain stages YOU click to advance — the button tells you when it\'s ready.',
    ],
  },
  {
    title: 'Documents make the world go round 📄',
    body: 'In Document Collection, Sarah owes genuine paperwork: Employment Verification, Bank Statements, Government-Issued ID, Residence History, Credit Report Authorization, Tax Returns, and a Home Inspection Report. Documents trickle in on their own schedule, but anything you Request jumps to the front of the line.',
    tips: [
      'The loan advances only once every required document reads Collected.',
      'Repeating a request nags her — each reminder costs 2 happiness.',
    ],
  },
  {
    title: 'Your four moves 🎯',
    body: "On any loan you command four actions. Request Documents: accelerate the missing papers. Continue Processing: advance the loan when its stage is satisfied. Contact: a friendly check-in worth +2 happiness and +0.25 trust, at the cost of one hour's work on their file. Delay: shelve a loan (and Resume it later) when the team is stretched thin.",
    tips: [
      'Contact is the remedy after a document nag or a delay — it mends feelings.',
      'A popup confirms precisely what each action accomplished.',
    ],
  },
  {
    title: 'Your team, at their desks 👩‍💼',
    body: 'The people in this room each own part of the journey: your Loan Officer opens files, the Processor gathers and verifies, the Underwriter renders the decision, and the Closer brings it home. Each teammate comfortably handles a few loans at once — overload someone and their workload bar runs hot, cutting their speed in half on everything they touch.',
    tips: [
      'Hiring costs $1,000 plus salary; training ($400) raises skill; promotion lifts the ceiling.',
      'Payroll is charged daily at 1/30 of each monthly salary — expand when closings support it.',
    ],
    highlight: 'office',
  },
  {
    title: 'How the money works 💰',
    body: "Every closed loan pays 1.75% of its amount — roughly $3,850 on Sarah's $220,000 loan — and completed loans keep contributing: each sends its monthly payment as servicing income every 28 days. Reinvest through the Upgrades tree: training, technology, marketing, customer experience, and office comforts, each with a real mechanical effect.",
    tips: [
      'Office upgrades literally renovate the room — every second tier unveils a nicer space.',
      'Closings earn XP too: Level 3 (Branch Manager) unlocks Upgrades; Level 4 (CEO) opens the World Map.',
    ],
    highlight: 'nav-upgrades',
  },
  {
    title: 'Some days misbehave 🌧️',
    body: "From day 6 onward, an occasional morning brings a mishap: the Wi-Fi drops and a ticket goes to IT (nothing moves until it's fixed), the printer jams (documents stop arriving), a surprise system update halves everyone's speed, or the coffee machine breaks and morale dips. A chip appears beside the clock counting down the hours.",
    tips: [
      'Mishaps grow slightly more frequent as your career advances — success breeds chaos.',
      "They always resolve on their own; plan around them rather than panic.",
    ],
    highlight: 'clock',
  },
  {
    title: 'The Wall of Homes ❤️',
    body: 'Every family you help earns a page in the scrapbook: their photo in front of their new home, the loan that made it possible, the closing date, and the thank-you note they left. Money is the score, but the Wall is the point — a growing record of the neighbors whose lives you changed.',
    tips: ['Visit it from the highlighted heart in the sidebar any time you need a reason to smile.'],
    highlight: 'nav-wall',
  },
  {
    title: 'Your first moves, step by step 🗺️',
    body: "Here's precisely how to start strong. 1: Set speed to 2× — early days involve waiting. 2: Open the Pipeline and click Sarah's card. 3: When she reaches Document Collection, press Request Documents. 4: While papers arrive, open Employees and note everyone's workload. 5: Once every document reads Collected, press Continue Processing — then let your team carry her to the keys. A new neighbor will walk in every morning at first, so keep the loop turning.",
    tips: [
      'Short on cash early? One closing covers about a week of payroll.',
      'If a loan looks stuck, its card names who owns it and how long remains.',
    ],
    highlight: 'speed',
  },
  {
    title: "You're ready! 🎉",
    body: "That's the loop: welcome new leads, gather documents, keep people happy, close loans, grow the team — and one day, scout the Meadowbrook Region and open branches in new neighborhoods. Every evening ends with a summary, your game saves itself, and this tour is always available again from the ? button in the header.",
    tips: [
      'The Learning Center keeps every mortgage term you discover — and Settings hides a Cozy Dark theme.',
      'Finishing this tour the first time earns +100 XP and +5 research. Good luck! 🍀',
    ],
  },
];

interface TutorialOverlayProps {
  /** Replay mode: provided when reopening the tour — closes without touching game state. */
  onClose?: () => void;
}

export function TutorialOverlay({ onClose }: TutorialOverlayProps) {
  const completeTutorial = useGameStore((s) => s.completeTutorial);
  const [stepIndex, setStepIndex] = useState(0);
  const step = STEPS[stepIndex];
  const [spot, setSpot] = useState<DOMRect | null>(null);

  // Measure the highlighted element for this step (and re-measure on resize).
  useEffect(() => {
    const measure = () => {
      const target = step?.highlight
        ? document.querySelector(`[data-tutorial="${step.highlight}"]`)
        : null;
      setSpot(target ? target.getBoundingClientRect() : null);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [step]);

  if (!step) return null;
  const last = stepIndex === STEPS.length - 1;
  const finish = (skipped: boolean) => (onClose ? onClose() : completeTutorial(skipped));

  return (
    <div
      className={spot ? styles.overlaySpotlit : styles.overlay}
      role="dialog"
      aria-label={`Tutorial step ${stepIndex + 1} of ${STEPS.length}`}
    >
      {spot && (
        <div
          className={styles.spotlight}
          style={{
            left: spot.left - 8,
            top: spot.top - 8,
            width: spot.width + 16,
            height: spot.height + 16,
          }}
          aria-hidden="true"
        />
      )}
      <div className={styles.progressTrack} aria-hidden="true">
        <div className={styles.progressFill} style={{ width: `${((stepIndex + 1) / STEPS.length) * 100}%` }} />
      </div>
      <section className={styles.card}>
        <div className={styles.mascotRow}>
          <svg className={styles.mascot} viewBox="0 0 60 60" aria-hidden="true">
            <circle cx="30" cy="34" r="24" fill="var(--color-sunset)" />
            <circle cx="30" cy="24" r="15" fill="var(--color-cream)" stroke="var(--color-cocoa)" strokeWidth="1.5" />
            <circle cx="25" cy="22" r="1.8" fill="var(--color-ink)" />
            <circle cx="35" cy="22" r="1.8" fill="var(--color-ink)" />
            <path d="M 24 28 Q 30 33 36 28" stroke="var(--color-ink)" strokeWidth="1.6" fill="none" strokeLinecap="round" />
          </svg>
          <div>
            <span className={styles.stepChip}>
              STEP {stepIndex + 1} OF {STEPS.length}
            </span>
            <span className={styles.says}>Alex says…</span>
          </div>
          <button type="button" className={styles.skip} onClick={() => finish(true)}>
            {onClose ? 'Close' : 'Skip Tutorial'}
          </button>
        </div>

        <h2>{step.title}</h2>
        <p className={styles.body}>{step.body}</p>
        <ul className={styles.tips}>
          {step.tips.map((tip) => (
            <li key={tip}>💡 {tip}</li>
          ))}
        </ul>

        <footer className={styles.nav}>
          <Button variant="ghost" disabled={stepIndex === 0} onClick={() => setStepIndex((i) => i - 1)}>
            ← Previous
          </Button>
          <div className={styles.dots} aria-hidden="true">
            {STEPS.map((_, i) => (
              <button
                key={i}
                type="button"
                className={i === stepIndex ? styles.dotActive : styles.dot}
                onClick={() => setStepIndex(i)}
                tabIndex={-1}
              />
            ))}
          </div>
          {last ? (
            <Button variant="primary" onClick={() => finish(false)}>
              {onClose ? 'Back to work! 🎉' : 'Start playing! 🎉'}
            </Button>
          ) : (
            <Button variant="primary" onClick={() => setStepIndex((i) => i + 1)}>
              Next →
            </Button>
          )}
        </footer>
      </section>
    </div>
  );
}
