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
  DOC_FRIENDLY_NAME,
  ROLE_BY_STAGE,
  SEASONS,
  STAGE_FRIENDLY_LABEL,
  STAGE_HOURS_REQUIRED,
  STAR_RATING_BASE,
  XP_PER_COMPLETED_LOAN,
} from './constants';
import { missingDocs, nextStage, requirementsMet } from './loans';
import type { DaySummary, GameEvent, GameState, Loan, Role } from './types';

function findEmployeeIdForRole(state: GameState, role: Role): string | null {
  const employee = Object.values(state.employees).find((e) => e.role === role);
  return employee ? employee.id : null;
}

function pushEvent(state: GameState, category: GameEvent['category'], title: string, detail: string): void {
  const { day, hour } = state.clock;
  const n = state.eventLog.length;
  state.eventLog.push({ id: `evt-${day}-${hour}-${n}`, day, hour, category, title, detail });
}

function missingDocsTag(loan: Loan): string | null {
  const count = missingDocs(loan).length;
  if (count === 0) return 'Ready';
  return `Missing ${count} ${count === 1 ? 'doc' : 'docs'}`;
}

/** Advance one loan by one working hour. Mutates the (already cloned) state. */
function workLoan(state: GameState, loan: Loan): void {
  const owningRole = ROLE_BY_STAGE[loan.stage];

  // TDD §4b — an employee of the owning role must have capacity.
  const assigned = loan.assignedEmployeeId ? state.employees[loan.assignedEmployeeId] : undefined;
  if (!assigned || assigned.role !== owningRole) {
    loan.assignedEmployeeId = findEmployeeIdForRole(state, owningRole);
  }
  if (!loan.assignedEmployeeId) return; // stalled: nobody owns this stage yet

  // M1 placeholder: while a loan sits in Papers, the customer sends in one
  // missing paper per hour. M5 replaces this with the request/response loop.
  if (loan.stage === 'documents') {
    const missing = missingDocs(loan);
    const nextDoc = missing[0];
    if (nextDoc) {
      loan.documents[nextDoc] = 'collected';
      loan.statusTag = missingDocsTag(loan);
      const customer = state.customers[loan.customerId];
      const remaining = missing.length - 1;
      pushEvent(
        state,
        'customers',
        `${customer ? customer.name : 'A customer'} sent a paper`,
        remaining === 0
          ? `${DOC_FRIENDLY_NAME[nextDoc]} is in — that's everything!`
          : `${DOC_FRIENDLY_NAME[nextDoc]} is in — ${remaining} more to go!`,
      );
      return; // this hour went to paperwork
    }
  }

  // TDD §4c — accumulate progress-hours toward the current stage.
  loan.progressHours += 1;
  if (loan.progressHours < STAGE_HOURS_REQUIRED[loan.stage] || !requirementsMet(loan)) return;

  const to = nextStage(loan.stage);
  if (!to) return;

  loan.stage = to;
  loan.progressHours = 0;
  loan.assignedEmployeeId = findEmployeeIdForRole(state, ROLE_BY_STAGE[to]);
  const customer = state.customers[loan.customerId];
  const customerName = customer ? customer.name : 'A customer';

  if (to === 'completed') {
    const fee = Math.round(loan.amount * CLOSING_FEE_RATE);
    state.currencies.coins += fee;
    state.stats.xp += XP_PER_COMPLETED_LOAN;
    loan.statusTag = 'Closed';
    pushEvent(
      state,
      'loans',
      `🎉 ${customerName} got the keys!`,
      `${customer ? customer.dreamHome.name : 'Their new home'} is officially theirs. +$${fee.toLocaleString('en-US')}`,
    );
    return;
  }

  loan.statusTag = to === 'documents' ? missingDocsTag(loan) : null;
  pushEvent(
    state,
    'loans',
    `${customerName} is on to the next step`,
    `Now in "${STAGE_FRIENDLY_LABEL[to]}".`,
  );
}

/** One working-hour tick. Returns a new state; the input is never mutated. */
export function advanceHour(state: GameState): GameState {
  const s = structuredClone(state);
  for (const loan of Object.values(s.loans)) {
    if (loan.stage === 'completed') continue;
    workLoan(s, loan);
  }
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
  }

  // Roll the calendar: next morning, 9 AM.
  s.eventLog = []; // today's feed is archived by the DaySummary (TDD §3)
  s.clock.day += 1;
  s.clock.hour = DAY_START_HOUR;
  s.clock.weekday = (s.clock.weekday + 1) % 7;
  const seasonIndex = Math.floor((s.clock.day - 1) / DAYS_PER_SEASON) % SEASONS.length;
  s.clock.season = SEASONS[seasonIndex] ?? 'spring';

  return s;
}
