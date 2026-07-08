/**
 * Just-in-time feature trainings (playtest 2026-07-07): instead of stuffing
 * every mechanic into the opening tutorial, each unlock gets a small pop-up
 * the moment it becomes relevant — once per save (GameState.trainingsSeen).
 * Voice: friendly coworker, celebratory, never a lecture.
 */
import type { GameState } from '../types';

export interface TrainingDef {
  key: string;
  title: string;
  body: string;
  tip?: string;
  /** Show once every condition present is met. */
  trigger: {
    /** Player level reaching this value. */
    level?: number;
    /** An active market mood of this kind. */
    marketMood?: 'refiBoom' | 'rateSpike';
  };
}

export const TRAININGS: TrainingDef[] = [
  {
    key: 'itSupport',
    title: 'New on the job board: IT Support 🛠️',
    body: 'You can now hire your own IT Support. Office mishaps — Wi-Fi outages, printer jams, surprise updates — become half as frequent, get fixed sooner, and sting everyone’s morale less. No more waiting on the outsourced tech.',
    tip: 'Find them under Employees → Hire. In-house IT quietly pays for itself in saved hours.',
    trigger: { level: 5 },
  },
  {
    key: 'loanOfficerAssistant',
    title: 'New hire available: Loan Officer Assistant 💌',
    body: 'A Loan Officer Assistant mails one thank-you note from your Wall of Homes every morning — and every note brings a brand-new referral lead through the door. Referrals on autopilot.',
    tip: 'You can still send notes yourself from the Wall of Homes — one per family.',
    trigger: { level: 8 },
  },
  {
    key: 'underwritingRedo',
    title: 'Underwriting just got pickier 📋',
    body: 'From now on, a loan can get a “yes, but…” — one document expires and must be resubmitted, sending the file back through Document Collection for a second look. It only ever happens once per loan.',
    tip: 'A bounced file isn’t a failure — keep the customer smiling with a friendly check-in while the papers come back.',
    trigger: { level: 10 },
  },
  {
    key: 'compliance',
    title: 'New on the job board: Compliance Officer 📑',
    body: 'You can now hire Compliance. Word is the regulators pay every level-20 office a visit — with a Compliance Officer on staff the audit passes with honors (+3 reputation); without one, it costs you 10.',
    tip: 'The audit only happens once. Hire before level 20 and sleep easy.',
    trigger: { level: 15 },
  },
  {
    key: 'branchManager',
    title: 'New on the job board: Branch Manager 🧑‍💼',
    body: 'A Branch Manager keeps the staffing right so you don’t have to: every morning they rebalance any overworked team, and if spreading the load isn’t enough, they hire another specialist themselves and re-deal the work.',
    tip: 'They spend your coins on hires — a well-run office is worth it.',
    trigger: { level: 15 },
  },
  {
    key: 'jumbo',
    title: 'Jumbo loans unlocked 💎',
    body: 'Some purchase shoppers now arrive asking for Jumbo loans — amounts far above the usual, with the biggest closing fees in the game. Bigger balance, pickier file: these customers expect white-glove service.',
    tip: 'The fee is a percentage — a $700,000 closing pays like three ordinary ones.',
    trigger: { level: 16 },
  },
  {
    key: 'walkaways',
    title: 'Unhappy customers can walk 💔',
    body: 'From now on, a customer whose happiness hits rock bottom will take their loan to another lender overnight — and your reputation takes the hit. Watch the happiness meters and mend feelings before it gets that far.',
    tip: 'Contact is the remedy: a friendly check-in heals a nag, a delay, or a botched document.',
    trigger: { level: 20 },
  },
  {
    key: 'construction',
    title: 'Construction loans unlocked 🏗️',
    body: 'Some buyers now arrive with a dream home that isn’t built yet. Construction loans take half again as long at every stage — draws, inspections, weather — but the closing is the largest payday in the game.',
    tip: 'Patience pays. Their Wall of Homes page reads “Custom Build.”',
    trigger: { level: 22 },
  },
  {
    key: 'usda',
    title: 'USDA loans unlocked 🌾',
    body: 'You can now serve the quiet green edges of the map: USDA loans bring modest rural homes to buyers the big programs miss. Smaller balances, big hearts.',
    tip: 'Yes — the same USDA that grades beef also guarantees home loans.',
    trigger: { level: 26 },
  },
  {
    key: 'refiBoom',
    title: 'Your first refi boom 📉',
    body: 'Rates hit a low and all of Meadowbrook noticed — expect extra shoppers at the door while the boom lasts. Booms come and go with the drifting rate; the morning news will always tell you.',
    tip: 'Staff up before the wave: an overworked team is slower exactly when you need speed.',
    trigger: { marketMood: 'refiBoom' },
  },
  {
    key: 'rateSpike',
    title: 'Your first rate spike 📈',
    body: 'Rates jumped and shoppers are spooked — fewer new faces until things settle. Slow seasons are what servicing income is for: every completed loan keeps paying you monthly.',
    tip: 'A quiet week is a great time to train the team and send thank-you notes.',
    trigger: { marketMood: 'rateSpike' },
  },
];

/** The first unseen training whose trigger is met, or null. One at a time. */
export function dueTraining(state: GameState): TrainingDef | null {
  const seen = new Set(state.trainingsSeen ?? []);
  return (
    TRAININGS.find(
      (t) =>
        !seen.has(t.key) &&
        (t.trigger.level === undefined || state.stats.level >= t.trigger.level) &&
        (t.trigger.marketMood === undefined || state.market?.mood === t.trigger.marketMood),
    ) ?? null
  );
}
