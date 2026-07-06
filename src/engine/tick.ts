/**
 * The simulation clock (TDD §4): advanceHour() is one working-hour tick,
 * advanceDay() runs the 9 AM – 6 PM day and produces the DaySummary.
 * Pure: (GameState in) → (GameState out). No React, no magic numbers.
 */
import {
  CLOSING_FEE_RATE,
  DAY_END_HOUR,
  DAY_START_HOUR,
  DAYS_PER_SEASON,
  DELAYED_HAPPINESS_DECAY_PER_DAY,
  DOC_DISPLAY_NAME,
  HAPPINESS_MAX,
  PROCESSING_APPRAISAL_HOURS,
  REQUESTED_DOC_HOURS,
  REQUESTED_DOC_HOURS_PROMPT,
  ROLE_BY_STAGE,
  SEASONS,
  STAGE_ADVANCE_HAPPINESS_BOOST,
  STAGE_DISPLAY_NAME,
  STAGE_HOURS_REQUIRED,
  STAR_RATING_BASE,
  UNPROMPTED_DOC_HOURS,
  UNPROMPTED_DOC_HOURS_EAGER,
  XP_PER_COMPLETED_LOAN,
} from './constants';
import { maybeSpawnLead } from './content/leads';
import {
  applyDailyMorale,
  deriveWorkloads,
  effectiveness,
  leastLoadedEmployeeId,
  updateEmployeeTags,
} from './employees';
import { missingDocs, nextStage, requirementsMet } from './loans';
import type { Customer, DaySummary, GameEvent, GameState, Loan, Role } from './types';

function findEmployeeIdForRole(state: GameState, role: Role): string | null {
  return leastLoadedEmployeeId(state, role);
}

function pushEvent(state: GameState, category: GameEvent['category'], title: string, detail: string): void {
  const { day, hour } = state.clock;
  const n = state.eventLog.length;
  state.eventLog.push({ id: `evt-${day}-${hour}-${n}`, day, hour, category, title, detail });
}

export function missingDocsTag(loan: Loan): string | null {
  const count = missingDocs(loan).length;
  if (count === 0) return 'Ready';
  return `Missing ${count} ${count === 1 ? 'doc' : 'docs'}`;
}

/**
 * Move a loan into its next stage: reassign, retag, log the milestone events,
 * and pay out on completion. Mutates the (already cloned) state. Shared by the
 * tick loop and the player's "Move to next stage" action (GDD §3).
 */
export function advanceLoanStage(state: GameState, loan: Loan): void {
  const to = nextStage(loan.stage);
  if (!to) return;

  const from = loan.stage;
  loan.stage = to;
  loan.progressHours = 0;
  loan.assignedEmployeeId = findEmployeeIdForRole(state, ROLE_BY_STAGE[to]);
  const customer = state.customers[loan.customerId];
  const customerName = customer ? customer.name : 'A customer';

  // GDD §4 — happiness rises with successful stages.
  if (customer) {
    customer.happiness = Math.min(HAPPINESS_MAX, customer.happiness + STAGE_ADVANCE_HAPPINESS_BOOST);
  }

  if (to === 'completed') {
    const fee = Math.round(loan.amount * CLOSING_FEE_RATE);
    state.currencies.coins += fee;
    state.stats.xp += XP_PER_COMPLETED_LOAN;
    loan.statusTag = 'Closed';
    pushEvent(
      state,
      'loans',
      `🎉 ${customerName} got the keys!`,
      `The loan funded and ${customer ? customer.dreamHome.name : 'their new home'} is officially theirs. +$${fee.toLocaleString('en-US')}`,
    );
    return;
  }

  loan.statusTag = to === 'documentCollection' ? missingDocsTag(loan) : null;

  // Milestone sub-step events (GDD §3 v2 — sub-steps live inside stages).
  if (from === 'application' && to === 'documentCollection') {
    pushEvent(
      state,
      'loans',
      `Loan Estimate sent to ${customerName}`,
      'Their Loan Estimate spells out the rate, payment, and closing costs — now we gather documents.',
    );
    return;
  }
  if (to === 'processing') {
    loan.statusTag = 'Appraisal ordered';
  }
  if (from === 'underwriting' && to === 'clearToClose') {
    pushEvent(
      state,
      'loans',
      `Conditional Approval for ${customerName}!`,
      'Underwriting says yes — just a few conditions to clear, then it’s Clear to Close.',
    );
    return;
  }
  if (from === 'clearToClose' && to === 'closing') {
    pushEvent(
      state,
      'loans',
      `${customerName} is Clear to Close`,
      'The Closing Disclosure is out for review. Next stop: the signing table.',
    );
    return;
  }

  pushEvent(
    state,
    'loans',
    `${customerName} is on to the next step`,
    `Now in ${STAGE_DISPLAY_NAME[to]}.`,
  );
}

/**
 * How many hours between document deliveries (GDD §4, M5): requested
 * documents come faster, and prompt/enthusiastic customers respond faster.
 */
function docDeliveryCadence(customer: Customer | undefined, hasRequested: boolean): number {
  const traits = customer?.traits ?? [];
  if (hasRequested) {
    return traits.includes('prompt') ? REQUESTED_DOC_HOURS_PROMPT : REQUESTED_DOC_HOURS;
  }
  return traits.includes('prompt') || traits.includes('enthusiastic')
    ? UNPROMPTED_DOC_HOURS_EAGER
    : UNPROMPTED_DOC_HOURS;
}

/** Advance one loan by one working hour. Mutates the (already cloned) state. */
function workLoan(state: GameState, loan: Loan): void {
  if (loan.delayed) return; // GDD §4 action 4 — set aside, nothing moves

  const owningRole = ROLE_BY_STAGE[loan.stage];

  // TDD §4b — an employee of the owning role must have capacity.
  const assigned = loan.assignedEmployeeId ? state.employees[loan.assignedEmployeeId] : undefined;
  if (!assigned || assigned.role !== owningRole) {
    loan.assignedEmployeeId = findEmployeeIdForRole(state, owningRole);
  }
  if (!loan.assignedEmployeeId) return; // stalled: nobody owns this stage yet

  // Document Collection (GDD §4, M5): the customer sends documents on a
  // trait-driven cadence — requested ones first and faster.
  if (loan.stage === 'documentCollection') {
    const missing = missingDocs(loan);
    if (missing.length > 0) {
      loan.progressHours += 1; // hours spent waiting on documents
      const customer = state.customers[loan.customerId];
      const requested = missing.filter((key) => loan.documents[key] === 'requested');
      const nextDoc = requested[0] ?? missing[0];
      const cadence = docDeliveryCadence(customer, requested.length > 0);
      if (nextDoc && loan.progressHours % cadence === 0) {
        loan.documents[nextDoc] = 'collected';
        loan.statusTag = missingDocsTag(loan);
        const remaining = missing.length - 1;
        pushEvent(
          state,
          'customers',
          `${customer ? customer.name : 'A customer'} sent a document`,
          remaining === 0
            ? `${DOC_DISPLAY_NAME[nextDoc]} is in — that's everything!`
            : `${DOC_DISPLAY_NAME[nextDoc]} is in — ${remaining} more to go!`,
        );
      }
      return; // this hour went to document collection
    }
  }

  // TDD §4c — accumulate progress-hours toward the current stage, scaled by
  // the assigned employee's effectiveness (skill helps; overwork hurts, GDD §5).
  const worker = state.employees[loan.assignedEmployeeId];
  const hoursBefore = loan.progressHours;
  loan.progressHours = Math.round((loan.progressHours + (worker ? effectiveness(worker) : 1)) * 100) / 100;

  // Processing sub-steps (GDD §3 v2): Appraisal, then Title Review.
  if (
    loan.stage === 'processing' &&
    hoursBefore < PROCESSING_APPRAISAL_HOURS &&
    loan.progressHours >= PROCESSING_APPRAISAL_HOURS
  ) {
    loan.statusTag = 'Title review';
    const customer = state.customers[loan.customerId];
    pushEvent(
      state,
      'loans',
      'The Appraisal came back',
      `${customer ? customer.dreamHome.name : 'The home'} appraised nicely. Title Review is up next.`,
    );
  }

  if (loan.progressHours < STAGE_HOURS_REQUIRED[loan.stage] || !requirementsMet(loan)) return;

  advanceLoanStage(state, loan);
}

/** One working-hour tick. Returns a new state; the input is never mutated. */
export function advanceHour(state: GameState): GameState {
  const s = structuredClone(state);
  deriveWorkloads(s); // workload reflects assignments before anyone works (GDD §5)
  for (const loan of Object.values(s.loans)) {
    if (loan.stage === 'completed') continue;
    workLoan(s, loan);
  }
  deriveWorkloads(s);
  updateEmployeeTags(s);
  s.clock.hour += 1;
  return s;
}

/**
 * Run the rest of the working day (9 AM → 6 PM), then roll the calendar over
 * and record the DaySummary. Returns the state paused at the next morning.
 */
export function advanceDay(state: GameState): GameState {
  let s = structuredClone(state);

  const coinsAtStart = s.currencies.coins;
  const xpAtStart = s.stats.xp;
  const completedAtStart = Object.values(s.loans).filter((l) => l.stage === 'completed').length;

  while (s.clock.hour <= DAY_END_HOUR) {
    s = advanceHour(s);
  }

  const loansCompleted =
    Object.values(s.loans).filter((l) => l.stage === 'completed').length - completedAtStart;
  const starRating = Math.min(5, Math.max(1, STAR_RATING_BASE + loansCompleted)) as DaySummary['starRating'];
  s.dayHistory.push({
    day: s.clock.day,
    loansCompleted,
    revenue: s.currencies.coins - coinsAtStart,
    xpEarned: s.stats.xp - xpAtStart,
    starRating,
  });

  for (const loan of Object.values(s.loans)) {
    if (loan.stage !== 'completed') loan.daysInPipeline += 1;

    // GDD §4 action 4 — happiness decays while a loan sits delayed.
    if (loan.delayed) {
      const customer = s.customers[loan.customerId];
      if (customer) {
        customer.happiness = Math.max(0, customer.happiness - DELAYED_HAPPINESS_DECAY_PER_DAY);
      }
    }
  }

  // Roll the calendar: next morning, 9 AM.
  s.eventLog = []; // today's feed is archived by the DaySummary (TDD §3)
  s.clock.day += 1;
  s.clock.hour = DAY_START_HOUR;
  s.clock.weekday = (s.clock.weekday + 1) % 7;
  const seasonIndex = Math.floor((s.clock.day - 1) / DAYS_PER_SEASON) % SEASONS.length;
  s.clock.season = SEASONS[seasonIndex] ?? 'spring';

  // A new week: reset the happiness trend baseline (GDD §4 "↑ 8 this week").
  if ((s.clock.day - 1) % 7 === 0) {
    for (const customer of Object.values(s.customers)) {
      customer.happinessAtWeekStart = customer.happiness;
    }
  }

  // GDD §5 — workload wears on (or restores) the team overnight.
  applyDailyMorale(s);

  // GDD §2 — more customers arrive (seeded, capped; GDD §13 decision 8).
  maybeSpawnLead(s);

  return s;
}
