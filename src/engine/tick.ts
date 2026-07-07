/**
 * The simulation clock (TDD §4): advanceHour() is one working-hour tick,
 * advanceDay() runs the 9 AM – 6 PM day and produces the DaySummary.
 * Pure: (GameState in) → (GameState out). No React, no magic numbers.
 */
import {
  CLOSING_FEE_RATE,
  CX_HAPPINESS_BONUS_PER_2_TIERS,
  DAY_END_HOUR,
  DAY_START_HOUR,
  DAYS_PER_SEASON,
  DELAYED_HAPPINESS_DECAY_PER_DAY,
  DOC_DISPLAY_NAME,
  GEMS_FIVE_STAR_DAY,
  HAPPINESS_MAX,
  HAPPY_CUSTOMER_MIN,
  OFFICE_MORALE_BONUS_PER_2_TIERS,
  PROCESSING_APPRAISAL_HOURS,
  RAINMAKER_REVENUE,
  REPUTATION_PER_COMPLETION,
  REQUESTED_DOC_HOURS,
  REQUESTED_DOC_HOURS_PROMPT,
  RESEARCH_FIRST_PRODUCT,
  ROLE_BY_STAGE,
  SEASONS,
  STAGE_ADVANCE_HAPPINESS_BOOST,
  STAGE_DISPLAY_NAME,
  STAGE_HOURS_REQUIRED,
  STAR_RATING_BASE,
  SYSTEM_UPDATE_SPEED_FACTOR,
  TECH_SPEED_BONUS_PER_TIER,
  UNPROMPTED_DOC_HOURS,
  UNPROMPTED_DOC_HOURS_EAGER,
  XP_PER_COMPLETED_LOAN,
} from './constants';
import { maybeSpawnDisruption, tickDisruption } from './content/disruptions';
import { maybeSpawnLead } from './content/leads';
import {
  awardAchievement,
  chargePayroll,
  checkDealStreak,
  checkLevelUp,
  creditServicing,
  driftInterestRate,
} from './economy';
import {
  applyDailyMorale,
  deriveWorkloads,
  effectiveness,
  leastLoadedEmployeeId,
  updateEmployeeTags,
} from './employees';
import { missingDocs, nextStage, requirementsMet } from './loans';
import { refreshNeighborhoodAvailability } from './map';
import { tiersOwned } from './upgrades';
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

  // GDD §4 — happiness rises with successful stages (Customer Experience
  // upgrades sweeten it, GDD §7).
  if (customer) {
    const cxBonus =
      Math.floor(tiersOwned(state, 'customerExperience') / 2) * CX_HAPPINESS_BONUS_PER_2_TIERS;
    customer.happiness = Math.min(
      HAPPINESS_MAX,
      customer.happiness + STAGE_ADVANCE_HAPPINESS_BOOST + cxBonus,
    );
  }

  if (to === 'completed') {
    const fee = Math.round(loan.amount * CLOSING_FEE_RATE);
    state.currencies.coins += fee;
    // Record income at the source so both simulated and player-driven
    // closings land in the End-of-Day chart (M8.1 fix).
    const hourIndex = Math.min(9, Math.max(0, state.clock.hour - DAY_START_HOUR));
    if (state.todayRevenueByHour[hourIndex] !== undefined) {
      state.todayRevenueByHour[hourIndex] += fee;
    }
    state.stats.xp += XP_PER_COMPLETED_LOAN;
    loan.statusTag = 'Closed';
    pushEvent(
      state,
      'loans',
      `🎉 ${customerName} got the keys!`,
      `The loan funded and ${customer ? customer.dreamHome.name : 'their new home'} is officially theirs. +$${fee.toLocaleString('en-US')}`,
    );

    // GDD §8 — Research for the first completion of each loan product.
    const priorOfProduct = Object.values(state.loans).some(
      (l) => l.id !== loan.id && l.stage === 'completed' && l.product === loan.product,
    );
    if (!priorOfProduct) {
      state.currencies.research += RESEARCH_FIRST_PRODUCT;
      pushEvent(
        state,
        'loans',
        'New expertise unlocked!',
        `First ${loan.product.toUpperCase()} loan closed — +${RESEARCH_FIRST_PRODUCT} research.`,
      );
    }

    // GDD §10 — badges & levels.
    if (customer && customer.happiness >= HAPPY_CUSTOMER_MIN) awardAchievement(state, 'happyCustomer');
    checkDealStreak(state);
    checkLevelUp(state);
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
 * Exported for the loan-detail ETA display (engine/insights.ts).
 */
export function docDeliveryCadence(customer: Customer | undefined, hasRequested: boolean): number {
  const traits = customer?.traits ?? [];
  if (hasRequested) {
    return traits.includes('prompt') ? REQUESTED_DOC_HOURS_PROMPT : REQUESTED_DOC_HOURS;
  }
  return traits.includes('prompt') || traits.includes('enthusiastic')
    ? UNPROMPTED_DOC_HOURS_EAGER
    : UNPROMPTED_DOC_HOURS;
}

/** Advance one loan by one working hour. Mutates the (already cloned) state. */
function workLoan(
  state: GameState,
  loan: Loan,
  mishap: { docsBlocked: boolean; speedFactor: number } = { docsBlocked: false, speedFactor: 1 },
): void {
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
    if (missing.length > 0 && mishap.docsBlocked) return; // GDD §6 — the mail is stuck
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
  // the assigned employee's effectiveness (skill helps; overwork hurts, GDD §5)
  // and the Technology upgrade speed bonus (GDD §7).
  const worker = state.employees[loan.assignedEmployeeId];
  const techBoost = 1 + TECH_SPEED_BONUS_PER_TIER * tiersOwned(state, 'technology');
  const hoursBefore = loan.progressHours;
  loan.progressHours =
    Math.round(
      (loan.progressHours + (worker ? effectiveness(worker) : 1) * techBoost * mishap.speedFactor) * 100,
    ) / 100;

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

  // GDD §6 — an active office mishap changes how (or whether) work happens.
  const wifiDown = s.disruption?.kind === 'wifiDown';
  const mishap = {
    docsBlocked: s.disruption?.kind === 'printerJam',
    speedFactor: s.disruption?.kind === 'systemUpdate' ? SYSTEM_UPDATE_SPEED_FACTOR : 1,
  };
  if (!wifiDown) {
    for (const loan of Object.values(s.loans)) {
      if (loan.stage === 'completed') continue;
      workLoan(s, loan, mishap);
    }
  }
  tickDisruption(s);
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

  while (s.clock.hour <= DAY_END_HOUR) {
    s = advanceHour(s);
  }

  // ── M7 evening economy (GDD §8) ──
  // The summary reads the WHOLE day's accumulated tracking — in live play
  // hours tick one by one and advanceDay only fires at rollover, so
  // point-of-rollover diffs would always read zero (the M8.1 fix).
  const servicingIncome = creditServicing(s);
  const grossRevenue = s.todayRevenueByHour.reduce((a, b) => a + b, 0) + servicingIncome;
  const payroll = chargePayroll(s);
  if (payroll > 0) {
    pushEvent(
      s,
      'alerts',
      `Payroll: −$${payroll.toLocaleString('en-US')}`,
      "The team's daily share of salaries, paid with thanks.",
    );
  }
  if (grossRevenue >= RAINMAKER_REVENUE) awardAchievement(s, 'rainmaker');

  // Today's closings live in the day's event feed until it is archived.
  const loansCompleted = s.eventLog.filter((e) => e.title.includes('got the keys')).length;
  s.stats.reputation = Math.min(100, s.stats.reputation + loansCompleted * REPUTATION_PER_COMPLETION);

  const starRating = Math.min(5, Math.max(1, STAR_RATING_BASE + loansCompleted)) as DaySummary['starRating'];
  if (starRating === 5) {
    s.currencies.gems += GEMS_FIVE_STAR_DAY;
    s.stats.reputation = Math.min(100, s.stats.reputation + 1);
  }
  checkLevelUp(s);

  const badgesEarned = Object.entries(s.achievements)
    .filter(([, a]) => a.earned && a.earnedOnDay === s.clock.day)
    .map(([id]) => id);

  s.dayHistory.push({
    day: s.clock.day,
    loansCompleted,
    revenue: grossRevenue,
    payroll,
    servicingIncome,
    xpEarned: s.stats.xp - s.xpAtDayStart,
    starRating,
    revenueByHour: [...s.todayRevenueByHour],
    badgesEarned,
    highlights: s.eventLog.slice(0, 6).map((e) => ({ title: e.title, detail: e.detail })),
  });
  s.todayRevenueByHour = Array.from({ length: 10 }, () => 0);
  s.xpAtDayStart = s.stats.xp;

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

  // GDD §8 — the ambient economy drifts overnight.
  driftInterestRate(s);

  // GDD §9 — growing reputation opens new neighborhoods.
  refreshNeighborhoodAvailability(s);

  // GDD §5 — workload wears on (or restores) the team overnight; a cozy
  // office (GDD §7) softens the grind.
  const officeBonus =
    Math.floor(tiersOwned(s, 'office') / 2) * OFFICE_MORALE_BONUS_PER_2_TIERS;
  applyDailyMorale(s, officeBonus);

  // GDD §2 — more customers arrive (seeded, capped; GDD §13 decision 8).
  maybeSpawnLead(s);

  // GDD §6 — and some mornings, the office has other plans.
  maybeSpawnDisruption(s);

  return s;
}
