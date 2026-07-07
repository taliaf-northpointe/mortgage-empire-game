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
    title: "It's your company — and today, a company of one 🏠",
    body: "Welcome to your mortgage office. You founded it, and right now you ARE it: every stage of every loan is yours to work by hand until you hire someone to take it over. Time advances on its own — roughly one in-game hour every 10 seconds, 9 AM to 6 PM — and each evening pauses on a summary of your day.",
    tips: [
      'The highlighted controls set the pace: pause, 1×, 2×, or 3×.',
      'Menus, this tour, and the evening summary all stop the clock — nothing happens without you.',
    ],
    highlight: 'speed',
  },
  {
    title: 'Your vital signs 📊',
    body: 'These five numbers tell you how the office is doing at a glance. Money is earnings minus salaries and upgrades (a solo office pays no payroll at all). Reputation (out of 100) rises with every closed loan, unlocks neighborhoods, and even makes customers trust you sooner. Active Loans counts files in motion. Happiness averages your customers\' moods. The Interest Rate drifts daily — when it dips, more buyers come shopping.',
    tips: [
      'Once you have staff, payroll is charged daily — money dipping on quiet days is normal.',
      'A low-rate morning is an excellent time to grow.',
    ],
    highlight: 'kpis',
  },
  {
    title: 'Meet Sarah Chen 👋',
    body: "Your first customer is already waiting. Sarah is a first-time homebuyer with her heart set on a Cozy Bungalow in Old Town, applying for an FHA loan — a program first-timers favor because it permits a smaller down payment. Every customer shows two feelings: Happiness (how the process feels) and Trust (how much they believe in you). Both genuinely change how they behave.",
    tips: [
      'Open the highlighted Pipeline and click her card to work her loan.',
      'Her profile holds her photo, her story, her dream home, and her documents.',
    ],
    highlight: 'nav-pipeline',
  },
  {
    title: 'The journey, part 1: getting started 🚶',
    body: 'Every loan walks the authentic mortgage road. Lead: a curious neighbor says hello. Pre-Qualification: a quick estimate of what they can afford. Application: the official paperwork, answered by a Loan Estimate. Each stage has a real working time — and until you hire a Loan Officer, YOU push these stages along: open the loan and press Continue when its time is served.',
    tips: [
      'A Loan Officer automates these early stages entirely (you can still click ahead of them).',
      'Bold terms with a little ⓘ open friendly explanations — tap any of them.',
    ],
    highlight: 'nav-pipeline',
  },
  {
    title: 'The journey, part 2: to the keys 🔑',
    body: "Document Collection: gathering the customer's real paperwork. Processing: verifying it all, with the Appraisal and Title Review. Underwriting: the decisive review — every single document needs a sign-off, and the decision takes the better part of a day. Clear to Close, then Closing: the signing table. Complete: the loan funds and keys change hands. Solo, YOU do each part; each hire automates theirs.",
    tips: [
      'Underwriting solo: open the loan and Approve each document yourself, then wait out the review.',
      'The Closer automates the final stretch; solo, you press "Close the loan" yourself.',
    ],
  },
  {
    title: 'Documents make the world go round 📄',
    body: "Customers owe genuine paperwork: Employment Verification, Bank Statements, Government-Issued ID, and more. Solo, nothing arrives until YOU press Request Documents — a Processor requests everything automatically the moment a loan reaches Document Collection. Trusting customers respond faster; happy customers send correct papers; a stressed or forgetful one occasionally sends the wrong thing and has to redo it.",
    tips: [
      'Re-requesting papers they already promised irritates them more each time — the cost escalates.',
      'A botched document is a hint: check in with them before asking again.',
    ],
  },
  {
    title: 'Your four moves 🎯',
    body: "On any loan you command four actions. Request Documents: start (or hurry) the paperwork. Continue Processing: advance the loan once its stage requirements AND its working time are met. Contact: a friendly check-in worth +2 happiness and growing trust — the stronger your reputation, the more your word counts — at the cost of one hour's work on the file. Delay: shelve a loan and Resume it later.",
    tips: [
      'Contact is the remedy after a nag, a delay, or a botched document — it mends feelings.',
      'A popup confirms precisely what each action accomplished.',
    ],
  },
  {
    title: 'Hiring: how the office comes alive 👩‍💼',
    body: 'Every hire automates their stage of the journey — the Loan Officer opens files, the Processor chases paperwork, the Underwriter signs off documents, the Closer lands the keys — while manual control always remains yours. Their pace is never fixed: skill, happiness, and level all speed them up, and workload past 75% slows them down and grinds their morale. You can also let people go to cut payroll, but everyone who stays takes it hard.',
    tips: [
      'A happy, seasoned teammate is dramatically faster than a miserable rookie.',
      'Watch the workload bars: past 75% people get slower AND unhappier every day.',
    ],
    highlight: 'nav-employees',
  },
  {
    title: 'How the money works 💰',
    body: "Every closed loan pays 1.75% of its amount — roughly $3,850 on Sarah's $220,000 loan — and completed loans keep sending their monthly payment as servicing income every 28 days. Solo you keep every dollar; hires cost payroll daily but multiply your throughput. Reinvest through the Upgrades tree: training, technology, marketing, customer experience, and office comforts.",
    tips: [
      'Office upgrades literally renovate the room — every second tier unveils a nicer space.',
      'Closings earn XP: Level 3 (Branch Manager) unlocks Upgrades; Level 4 (CEO) opens the World Map.',
    ],
    highlight: 'nav-upgrades',
  },
  {
    title: 'Some days misbehave 🌧️',
    body: "From day 6 onward, an occasional morning brings a mishap: the Wi-Fi drops, the printer jams, a surprise system update halves everyone's speed, or the coffee machine breaks. Without IT on staff, an outsourced tech takes their time. At level 5 you can hire your own IT Support — outages become half as frequent, get fixed sooner, and sting morale less.",
    tips: [
      'A chip appears beside the clock counting down the hours until the fix.',
      'In-house IT quietly pays for itself in saved hours and happier people.',
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
    title: 'The road ahead 📈',
    body: 'Your career climbs through thirty levels and the game grows with you: more leads each level, more room in the pipeline, and a pop quiz on a mortgage term every fifth level (+150 XP for a correct answer). Mastery invites adversity — from level 10 underwriting can bounce a loan back for a resubmitted document, and from level 20 a neglected customer will walk away. At level 15, Compliance unlocks: hire one before the level-20 audit and you pass with honors; face the auditors without one and your reputation pays.',
    tips: [
      'Reading any term in the Learning Center earns +10 XP — knowledge is career fuel.',
      'The audit only happens once. Be ready for it.',
    ],
    highlight: 'nav-learning',
  },
  {
    title: 'Your first moves, step by step 🗺️',
    body: "Here's exactly how to start strong, alone. 1: Set speed to 2×. 2: Open the Pipeline, click Sarah, and press Continue whenever her stage's time is served — you're the Loan Officer today. 3: In Document Collection, press Request Documents — you're the Processor too. 4: In Underwriting, Approve each document, then wait out the review. 5: Press Close the loan and collect your first fee. 6: Spend it on your first hire and watch that stage start running itself.",
    tips: [
      'Solo work moves at half a specialist\'s pace — every hire is a real acceleration.',
      'If a loan looks stuck, its card says exactly what (or who) it\'s waiting on.',
    ],
    highlight: 'speed',
  },
  {
    title: "You're ready! 🎉",
    body: "That's the loop: welcome leads, gather documents, sign off files, close loans, and grow from a company of one into a team that hums without you — then scout the Meadowbrook Region and open branches. Every evening ends with a summary, your game saves itself, and this tour is always available again from the ? button in the header.",
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
