import { useState } from 'react';
import { useGameStore } from '../../../store/gameStore';
import { Button } from '../../components/Button';
import styles from './TutorialOverlay.module.css';

interface TutorialStep {
  title: string;
  body: string;
  tips: string[];
}

/**
 * GDD §11 — the guided tour, expanded to really teach the systems (numbers
 * here mirror src/engine/constants.ts; update both together).
 */
const STEPS: TutorialStep[] = [
  {
    title: 'Welcome to your office! 🏠',
    body: "You run a small mortgage office, and your job is wonderfully simple to say: help your neighbors buy homes. Time moves on its own — about one in-game hour every 10 seconds — and each day runs from 9 AM to 6 PM. When evening comes, everything pauses on a summary of your day.",
    tips: [
      'The 1× / 2× / 3× buttons change how fast time flows; pause anytime.',
      'Nothing bad happens while a menu or this tutorial is open — the clock waits for you.',
    ],
  },
  {
    title: 'The top bar is your dashboard 📊',
    body: "Money is what you've earned minus what you spend on salaries and upgrades. Reputation (out of 100) grows as you close loans — it unlocks new neighborhoods later. Happiness is the average mood of your customers. And the Interest Rate drifts a little every day: when it's low, more people come shopping for homes.",
    tips: [
      'Money going down during the day is normal — payroll is charged daily.',
      'Watch the rate: a dip is a great time to grow.',
    ],
  },
  {
    title: 'Meet Sarah Chen 👋',
    body: "Your very first customer! Sarah is a first-time homebuyer with her heart set on a Cozy Bungalow in Old Town. She's applying for an FHA loan — a favorite for first-timers because it allows a smaller down payment. Every customer has two feelings you can see: Happiness (how the process feels) and Trust (how much they believe in you).",
    tips: [
      'Open the Pipeline and click her card to follow her loan.',
      'Her profile shows her photo, her story, her dream home, and her documents.',
    ],
  },
  {
    title: 'The journey, part 1: getting started 🚶',
    body: 'Every loan walks the real mortgage road, one stage at a time. Lead: someone curious says hello. Pre-Qualification: a quick look at their numbers. Application: the official paperwork, and they receive a Loan Estimate that spells out rate and costs. Document Collection: gathering their paperwork — more on that next.',
    tips: [
      'Your Loan Officer owns these early stages.',
      'Bold terms with a little ⓘ have friendly explanations — tap any of them!',
    ],
  },
  {
    title: 'The journey, part 2: to the keys 🔑',
    body: "Processing: your team verifies everything that came in. Underwriting: the big careful review that ends in a Conditional Approval. Clear to Close: the happy green light. Closing: the signing table. Complete: the loan funds, keys change hands, and confetti flies. Your Processor, Underwriter, and Closer each own their part of this road.",
    tips: [
      'Loans move themselves through a stage as their owner works.',
      'Between some stages, YOU click to advance — the button tells you when.',
    ],
  },
  {
    title: 'Documents make the world go round 📄',
    body: "In Document Collection, Sarah owes real paperwork: Employment Verification, Bank Statements, Government-Issued ID, Residence History, Credit Report Authorization, Tax Returns, and a Home Inspection Report. Documents trickle in on their own, but anything you Request jumps to the front of the line.",
    tips: [
      'The loan can only move on once every needed document is Collected.',
      'Asking again after you already asked nags her — each reminder costs 2 happiness.',
    ],
  },
  {
    title: 'Your four moves 🎯',
    body: "On any loan you have four buttons. Request Documents: bring missing papers in faster. Continue Processing: push the loan to its next stage when it's ready. Contact: a friendly check-in that adds +2 happiness and +0.25 trust, but costs an hour of work on their loan. Delay: set a loan aside (and Resume it later) when your team is stretched thin.",
    tips: [
      'Contact is perfect after a document nag or a delay — it mends feelings.',
      'A little popup confirms exactly what each action did.',
    ],
  },
  {
    title: 'Your team 👩‍💼👨‍💼',
    body: "Marcus (Loan Officer), Dana (Processor), Priya (Underwriter), and Leo (Closer) each own stages of the journey. Each teammate can comfortably work a few loans at once — pile on more and their workload bar runs hot, and an overworked teammate works at HALF speed on everything.",
    tips: [
      'Hiring costs $1,000 + salary; training ($400) raises skill; promoting raises the skill cap.',
      'Payroll is charged daily (1/30 of each monthly salary) — grow when loans support it.',
    ],
  },
  {
    title: 'How the money works 💰',
    body: "Each closed loan pays you 1.75% of the loan amount — about $3,850 on Sarah's $220,000 loan. Completed loans keep paying: every 28 days, each one sends its monthly payment as servicing income. Spend your earnings on hiring, training, and the Upgrades tree (better tech, marketing, comfy chairs — all with real effects).",
    tips: [
      'Closing loans also earns XP: your career climbs from Loan Officer to Mortgage Mogul.',
      'Level 3 (Branch Manager) unlocks Upgrades; Level 4 (CEO) unlocks the World Map.',
    ],
  },
  {
    title: 'Your first moves, step by step 🗺️',
    body: "Here's exactly how to start strong. 1: Set speed to 2× — the first days have waiting in them. 2: Open the Pipeline and click Sarah's card. 3: When she reaches Document Collection, hit Request Documents. 4: While papers arrive, open Employees and note everyone's workload. 5: When Sarah's documents are all Collected, click Continue Processing — then let your team carry her to the keys. New neighbors will walk in every morning at first, so keep the loop going!",
    tips: [
      'Short on cash early? Payroll is small — one closing covers about a week of it.',
      'If a loan looks stuck, its card tells you who is working it and how long is left.',
    ],
  },
  {
    title: "You're ready! 🎉",
    body: "That's the loop: welcome new leads, gather documents, keep people happy, close loans, grow the team — and one day, scout the Meadowbrook Region and open branch offices in new neighborhoods. Every evening ends with a summary, and your game saves itself. Go make some homeowners!",
    tips: [
      'The Learning Center keeps every mortgage term you discover.',
      'Finishing this tour earns +100 XP and +5 research. Good luck! 🍀',
    ],
  },
];

export function TutorialOverlay() {
  const completeTutorial = useGameStore((s) => s.completeTutorial);
  const [stepIndex, setStepIndex] = useState(0);
  const step = STEPS[stepIndex];
  if (!step) return null;
  const last = stepIndex === STEPS.length - 1;

  return (
    <div className={styles.overlay} role="dialog" aria-label={`Tutorial step ${stepIndex + 1} of ${STEPS.length}`}>
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
          <button type="button" className={styles.skip} onClick={() => completeTutorial(true)}>
            Skip Tutorial
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
            <Button variant="primary" onClick={() => completeTutorial(false)}>
              Start playing! 🎉
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
