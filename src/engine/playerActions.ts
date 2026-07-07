/**
 * Player actions on a loan/customer (GDD §3 loan detail popover, GDD §4
 * customer actions). Pure: each returns a new state, or the ORIGINAL state
 * unchanged when the action isn't allowed — the UI can rely on referential
 * equality.
 */
import {
  CONTACT_HAPPINESS_BOOST,
  CONTACT_TIME_COST_HOURS,
  CONTACT_TRUST_BOOST,
  CX_TRUST_BONUS_PER_TIER,
  DOC_DISPLAY_NAME,
  HAPPINESS_MAX,
  MANUAL_MOVE_INSTANT_STAGES,
  QUIZ_XP,
  REPUTATION_TRUST_FACTOR,
  REQUEST_NAG_HAPPINESS_COST,
  STAGE_DISPLAY_NAME,
  STAGE_HOURS_REQUIRED,
  TRUST_MAX,
  TUTORIAL_RESEARCH,
  TUTORIAL_XP,
  XP_PER_TERM_LEARNED,
} from './constants';
import { checkLevelUp } from './economy';
import { getEntry } from './content/glossary';
import { spawnReferralLead } from './content/leads';
import { tiersOwned } from './upgrades';
import { missingDocs, unapprovedDocs } from './loans';
import { advanceLoanStage, missingDocsTag } from './tick';
import type { DocumentKey, GameEvent, GameState } from './types';

function pushEvent(state: GameState, category: GameEvent['category'], title: string, detail: string): void {
  const { day, hour } = state.clock;
  const n = state.eventLog.length;
  state.eventLog.push({ id: `evt-${day}-${hour}-${n}`, day, hour, category, title, detail });
}

/** Ask the customer for one specific missing loan document (loan popover). */
export function requestDocument(state: GameState, loanId: string, key: DocumentKey): GameState {
  const loan = state.loans[loanId];
  // Paperwork only starts once the loan reaches Document Collection
  // (playtest 2026-07-07) — no chasing papers during the early conversations.
  if (!loan || loan.stage !== 'documentCollection' || loan.documents[key] !== 'missing') return state;

  const s = structuredClone(state);
  const l = s.loans[loanId];
  if (!l) return state;
  l.documents[key] = 'requested';
  l.statusTag = l.stage === 'documentCollection' ? missingDocsTag(l) : l.statusTag;

  const customer = s.customers[l.customerId];
  pushEvent(
    s,
    'customers',
    `You asked ${customer ? customer.name : 'the customer'} for a document`,
    `${DOC_DISPLAY_NAME[key]} — it'll come in first.`,
  );
  return s;
}

/**
 * "Request Documents" (GDD §4 action 1, Customer screen): ask for every
 * missing document at once. Asking again while requests are already out
 * costs a little happiness — nobody likes being nagged.
 */
export function requestAllDocuments(state: GameState, loanId: string): GameState {
  const loan = state.loans[loanId];
  if (!loan || loan.stage !== 'documentCollection') return state;
  const stillMissing = missingDocs(loan).filter((key) => loan.documents[key] === 'missing');
  const alreadyRequested = missingDocs(loan).some((key) => loan.documents[key] === 'requested');
  if (stillMissing.length === 0 && !alreadyRequested) return state;

  const s = structuredClone(state);
  const l = s.loans[loanId];
  if (!l) return state;
  const customer = s.customers[l.customerId];

  for (const key of stillMissing) l.documents[key] = 'requested';
  l.statusTag = l.stage === 'documentCollection' ? missingDocsTag(l) : l.statusTag;

  // Irritation escalates (playtest 2026-07-06 #2): the first reminder is a
  // nudge; the fourth is a problem. Cost = base × how many times they've
  // already been re-asked.
  const nagCost = customer ? REQUEST_NAG_HAPPINESS_COST * ((customer.nagCount ?? 0) + 1) : 0;

  if (stillMissing.length === 0 && alreadyRequested) {
    // pure nag — everything was already asked for
    if (customer) {
      customer.nagCount = (customer.nagCount ?? 0) + 1;
      customer.happiness = Math.max(0, customer.happiness - nagCost);
      pushEvent(
        s,
        'customers',
        `${customer.name} is already on it`,
        `They know! Each extra reminder wears thinner (−${nagCost} happiness this time).`,
      );
    }
    return s;
  }

  if (alreadyRequested && customer) {
    customer.nagCount = (customer.nagCount ?? 0) + 1;
    customer.happiness = Math.max(0, customer.happiness - nagCost);
  }
  pushEvent(
    s,
    'customers',
    `You asked ${customer ? customer.name : 'the customer'} for their documents`,
    `${stillMissing.length} ${stillMissing.length === 1 ? 'document' : 'documents'} requested — they'll come in first.`,
  );
  return s;
}

/** Send a friendly message (GDD §4 action 3): +happiness, +trust, small time cost. */
export function contactCustomer(state: GameState, loanId: string): GameState {
  const loan = state.loans[loanId];
  if (!loan) return state;
  const customer = state.customers[loan.customerId];
  if (!customer) return state;

  const s = structuredClone(state);
  const l = s.loans[loanId];
  const c = s.customers[loan.customerId];
  if (!l || !c) return state;
  c.happiness = Math.min(HAPPINESS_MAX, c.happiness + CONTACT_HAPPINESS_BOOST);
  // Customer Experience upgrades deepen every friendly chat (GDD §7), and a
  // strong reputation makes your word count for more (playtest 2026-07-06 #2).
  const trustGain =
    CONTACT_TRUST_BOOST +
    CX_TRUST_BONUS_PER_TIER * tiersOwned(s, 'customerExperience') +
    (s.stats.reputation / 100) * REPUTATION_TRUST_FACTOR;
  c.trust = Math.min(TRUST_MAX, Math.round((c.trust + trustGain) * 100) / 100);
  l.progressHours = Math.max(0, l.progressHours - CONTACT_TIME_COST_HOURS); // the small time cost

  pushEvent(
    s,
    'customers',
    `You checked in with ${c.name}`,
    `A friendly hello goes a long way. Happiness is at ${c.happiness}%.`,
  );
  return s;
}

/**
 * Why a loan can't be advanced by hand right now, or null when it can (M9).
 * Manual moves respect the same waiting periods the team does — being the
 * founder doesn't make underwriting decide faster.
 */
export function moveBlockedReason(state: GameState, loanId: string): string | null {
  const loan = state.loans[loanId];
  if (!loan || loan.stage === 'completed') return 'This one is already home.';
  if (loan.delayed) return 'The loan is set aside — resume it first.';
  if (loan.stage === 'documentCollection' && missingDocs(loan).length > 0) {
    const owed = missingDocs(loan).length;
    return `Waiting on ${owed} more ${owed === 1 ? 'document' : 'documents'}.`;
  }
  if (loan.stage === 'underwriting' && unapprovedDocs(loan).length > 0) {
    const pending = unapprovedDocs(loan).length;
    return `${pending} ${pending === 1 ? 'document needs' : 'documents need'} sign-off first.`;
  }
  // The early stages are conversations — your click IS the work (playtest
  // 2026-07-07). Waiting periods only bind from Processing onward.
  if (MANUAL_MOVE_INSTANT_STAGES.includes(loan.stage)) return null;
  if (loan.progressHours < STAGE_HOURS_REQUIRED[loan.stage]) {
    const left = Math.ceil(STAGE_HOURS_REQUIRED[loan.stage] - loan.progressHours);
    return `Still in the works — about ${left}h of ${STAGE_DISPLAY_NAME[loan.stage]} to go.`;
  }
  return null;
}

/**
 * "Continue Processing" / "Move to [next stage]" (GDD §4 action 2): only when
 * the stage's requirements AND its waiting period are met (M9 — solo founders
 * work every stage by hand, but the clock is the clock).
 */
export function moveLoanForward(state: GameState, loanId: string): GameState {
  if (moveBlockedReason(state, loanId)) return state;

  const s = structuredClone(state);
  const l = s.loans[loanId];
  if (!l) return state;
  advanceLoanStage(s, l);
  return s;
}

/**
 * M9 — the underwriting sign-off, by hand: open a document, look it over,
 * approve it. An underwriter does this automatically, one per worked hour.
 */
export function approveDocument(state: GameState, loanId: string, key: DocumentKey): GameState {
  const loan = state.loans[loanId];
  if (!loan || loan.stage !== 'underwriting' || loan.delayed) return state;
  if (loan.documents[key] !== 'collected' || loan.docApprovals?.[key]) return state;

  const s = structuredClone(state);
  const l = s.loans[loanId];
  if (!l) return state;
  l.docApprovals = { ...l.docApprovals, [key]: true };
  if (unapprovedDocs(l).length === 0) {
    const customer = s.customers[l.customerId];
    pushEvent(
      s,
      'loans',
      'You finished the document review ✅',
      `${customer ? customer.name : 'The'} file checks out page by page — the decision is close now.`,
    );
  }
  return s;
}

/** "Delay" (GDD §4 action 4): set aside for later — or pick it back up. */
export function toggleDelay(state: GameState, loanId: string): GameState {
  const loan = state.loans[loanId];
  if (!loan || loan.stage === 'completed') return state;

  const s = structuredClone(state);
  const l = s.loans[loanId];
  if (!l) return state;
  l.delayed = !l.delayed;
  const customer = s.customers[l.customerId];
  const name = customer ? customer.name : 'The customer';

  if (l.delayed) {
    l.statusTag = 'Delayed';
    pushEvent(s, 'alerts', `${name}'s loan is set aside`, 'Nothing will move until you pick it back up — and waiting wears on them.');
  } else {
    l.statusTag = l.stage === 'documentCollection' ? missingDocsTag(l) : null;
    pushEvent(s, 'loans', `${name}'s loan is back on track`, 'Picking up right where you left off.');
  }
  return s;
}

/**
 * Finish (or skip) the tutorial (GDD §11 #9). Completing all seven steps
 * pays XP + research (GDD §13 decision 11); skipping just closes it.
 */
export function completeTutorial(state: GameState, skipped: boolean): GameState {
  if (state.meta.tutorialDone) return state;

  const s = structuredClone(state);
  s.meta.tutorialDone = true;
  if (!skipped) {
    s.stats.xp += TUTORIAL_XP;
    s.currencies.research += TUTORIAL_RESEARCH;
    pushEvent(
      s,
      'loans',
      'Tutorial complete! 🎓',
      `You know the ropes — +${TUTORIAL_XP} XP and +${TUTORIAL_RESEARCH} research to start strong.`,
    );
    checkLevelUp(s);
  }
  return s;
}

/**
 * Learn a glossary term (GDD §4.1 progressive learning). First read pays a
 * little XP (playtest 2026-07-06: knowledge should reward the career too).
 */
export function learnTerm(state: GameState, key: string): GameState {
  if (state.glossary[key]?.learned || !getEntry(key)) return state;

  const s = structuredClone(state);
  s.glossary[key] = { unlocked: true, learned: true, learnedOnDay: s.clock.day };
  s.stats.xp += XP_PER_TERM_LEARNED;
  checkLevelUp(s);
  return s;
}

/**
 * Answer the pending mortgage quiz (every QUIZ_EVERY_LEVELS levels). A correct
 * pick pays QUIZ_XP; either way the quiz is resolved and the term is learned —
 * getting one wrong is still a lesson.
 */
export function answerQuiz(state: GameState, chosenTermKey: string): GameState {
  const quiz = state.quiz;
  if (!quiz) return state;

  const s = structuredClone(state);
  const correct = chosenTermKey === quiz.termKey;
  const term = getEntry(quiz.termKey)?.term ?? quiz.termKey;
  s.quiz = null;
  s.glossary[quiz.termKey] = { unlocked: true, learned: true, learnedOnDay: s.clock.day };
  if (correct) {
    s.stats.xp += QUIZ_XP;
    pushEvent(s, 'alerts', 'Quiz aced! 🎓', `You know your ${term}. +${QUIZ_XP} XP.`);
    checkLevelUp(s);
  } else {
    pushEvent(s, 'alerts', 'Quiz missed — no harm done', `${term} is waiting in the Learning Center for a refresher.`);
  }
  return s;
}

/**
 * Send a thank-you note to a family on the Wall of Homes (playtest 2026-07-07):
 * going above and beyond gets talked about — a brand-new referral lead walks
 * in. Once per borrower; a Loan Officer Assistant mails these automatically
 * each morning once hired (level 8).
 */
export function sendThankYouNote(state: GameState, loanId: string): GameState {
  const entry = state.memoryWall.find((m) => m.loanId === loanId);
  if (!entry || entry.thanked) return state;

  const s = structuredClone(state);
  const page = s.memoryWall.find((m) => m.loanId === loanId);
  if (!page) return state;
  page.thanked = true;
  const referral = spawnReferralLead(s, page.customerName);
  pushEvent(
    s,
    'customers',
    `💌 You sent ${page.customerName} a thank-you note`,
    referral
      ? `They loved it — and told ${referral} to come see you. Kindness pays.`
      : 'They loved it. Word travels fast in Meadowbrook.',
  );
  return s;
}

/** Documents the player can still request for this loan. */
export function requestableDocs(state: GameState, loanId: string): DocumentKey[] {
  const loan = state.loans[loanId];
  if (!loan) return [];
  return missingDocs(loan).filter((key) => loan.documents[key] === 'missing');
}
