import { describe, expect, it } from 'vitest';
import {
  CONTACT_HAPPINESS_BOOST,
  CONTACT_TRUST_BOOST,
  DELAYED_HAPPINESS_DECAY_PER_DAY,
  REPUTATION_TRUST_FACTOR,
  REQUEST_NAG_HAPPINESS_COST,
  STAGE_ADVANCE_HAPPINESS_BOOST,
  STAGE_HOURS_REQUIRED,
} from '../../src/engine/constants';
import { createStarterState, STARTER_CUSTOMER_ID, STARTER_LOAN_ID } from '../../src/engine/content/starter';
import {
  contactCustomer,
  moveLoanForward,
  requestAllDocuments,
  toggleDelay,
} from '../../src/engine/playerActions';
import { advanceDay, advanceHour, docDeliveryCadence } from '../../src/engine/tick';
import type { GameState } from '../../src/engine/types';
import { withClassicTeam } from '../helpers';

// These tests exercise STAFFED behavior (auto-advance, document trickle);
// M9's solo start means a bare starter has no one to do that work.
const staffedStarter = (seed?: number) => withClassicTeam(createStarterState(seed));

function loanOf(state: GameState) {
  const loan = state.loans[STARTER_LOAN_ID];
  if (!loan) throw new Error('starter loan missing');
  return loan;
}

function customerOf(state: GameState) {
  const customer = state.customers[STARTER_CUSTOMER_ID];
  if (!customer) throw new Error('starter customer missing');
  return customer;
}

function toDocumentCollection(state: GameState): GameState {
  let s = state;
  while (loanOf(s).stage !== 'documentCollection') s = advanceHour(s);
  return s;
}

describe('trait-driven document cadence (GDD §4, M5 — auto-requested since M9)', () => {
  // M9: a staffed processor requests every document the moment collection
  // starts, so requested-cadence is what staffed play actually experiences.
  it('a prompt customer answers the processor every hour', () => {
    // Sarah is prompt + enthusiastic. Trust pinned to 1 so this test isolates
    // the trait cadence (trust shortens it — covered separately below).
    const starter = staffedStarter();
    const sarah = starter.customers[STARTER_CUSTOMER_ID];
    if (sarah) sarah.trust = 1;
    let s = toDocumentCollection(starter);

    const collected = (state: GameState) =>
      Object.values(loanOf(state).documents).filter((d) => d === 'collected').length;
    const start = collected(s);
    s = advanceHour(s); // the processor requests everything, and prompt Sarah answers
    expect(collected(s)).toBe(start + 1);
    s = advanceHour(s);
    expect(collected(s)).toBe(start + 2);
  });

  it('a customer without eager traits answers requests every 2 hours', () => {
    const base = staffedStarter();
    const customer = base.customers[STARTER_CUSTOMER_ID];
    if (!customer) throw new Error('missing customer');
    customer.traits = ['cautious'];
    customer.trust = 1; // isolate the trait cadence from the trust speedup
    let s = toDocumentCollection(base);

    const collected = (state: GameState) =>
      Object.values(loanOf(state).documents).filter((d) => d === 'collected').length;
    const start = collected(s);
    s = advanceHour(s);
    expect(collected(s)).toBe(start);
    s = advanceHour(s);
    expect(collected(s)).toBe(start + 1);
  });

  it('trusting customers send documents faster than wary ones', () => {
    const wary = staffedStarter();
    const trusting = staffedStarter();
    const waryCustomer = wary.customers[STARTER_CUSTOMER_ID];
    const trustingCustomer = trusting.customers[STARTER_CUSTOMER_ID];
    if (!waryCustomer || !trustingCustomer) throw new Error('missing customer');
    waryCustomer.traits = ['cautious'];
    waryCustomer.trust = 1;
    trustingCustomer.traits = ['cautious'];
    trustingCustomer.trust = 5;
    expect(docDeliveryCadence(trustingCustomer, false)).toBeLessThan(
      docDeliveryCadence(waryCustomer, false),
    );
    expect(docDeliveryCadence(trustingCustomer, true)).toBeGreaterThanOrEqual(1); // never below an hour
  });

  it('a miserable customer sometimes sends the wrong papers (deterministic per seed)', () => {
    // scan seeds for a botched delivery: cautious + happiness under the
    // mistake threshold, no docs requested
    let sawBotch = false;
    let sawSuccess = false;
    for (let seed = 1; seed <= 40 && !(sawBotch && sawSuccess); seed++) {
      const base = staffedStarter(seed);
      const customer = base.customers[STARTER_CUSTOMER_ID];
      if (!customer) throw new Error('missing customer');
      customer.traits = ['forgetful'];
      customer.happiness = 20; // forgetful AND miserable — high botch odds
      let s = toDocumentCollection(base);
      const collected = (state: GameState) =>
        Object.values(loanOf(state).documents).filter((d) => d === 'collected').length;
      const start = collected(s);
      s = advanceHour(s);
      s = advanceHour(s);
      s = advanceHour(s);
      if (collected(s) === start) sawBotch = true;
      if (collected(s) > start) sawSuccess = true;
      if (s.eventLog.some((e) => e.title.includes('wrong papers'))) sawBotch = true;
    }
    expect(sawBotch).toBe(true); // it can happen…
    expect(sawSuccess).toBe(true); // …but it isn't guaranteed to
  });
});

describe('Request Documents (GDD §4 action 1)', () => {
  it('requests every missing document at once', () => {
    const s = requestAllDocuments(staffedStarter(), STARTER_LOAN_ID);
    const statuses = Object.values(loanOf(s).documents).filter((d) => d !== 'notRequired');
    expect(statuses.every((d) => d === 'requested')).toBe(true);
  });

  it('asking again irritates more and more each time (escalating nags)', () => {
    let s = requestAllDocuments(staffedStarter(), STARTER_LOAN_ID);
    const before = customerOf(s).happiness;
    s = requestAllDocuments(s, STARTER_LOAN_ID); // 1st nag: −base
    expect(customerOf(s).happiness).toBe(before - REQUEST_NAG_HAPPINESS_COST);
    s = requestAllDocuments(s, STARTER_LOAN_ID); // 2nd nag: −2×base
    expect(customerOf(s).happiness).toBe(before - 3 * REQUEST_NAG_HAPPINESS_COST);
    s = requestAllDocuments(s, STARTER_LOAN_ID); // 3rd nag: −3×base
    expect(customerOf(s).happiness).toBe(before - 6 * REQUEST_NAG_HAPPINESS_COST);
  });
});

describe('Contact Customer (GDD §4 action 3)', () => {
  it('boosts happiness and trust, and costs a little progress time', () => {
    const base = staffedStarter();
    const loan = base.loans[STARTER_LOAN_ID];
    if (!loan) throw new Error('missing loan');
    loan.progressHours = 2;

    const s = contactCustomer(base, STARTER_LOAN_ID);
    expect(customerOf(s).happiness).toBe(80 + CONTACT_HAPPINESS_BOOST);
    // trust gain = base boost + reputation bonus (rep 50 → half the factor)
    expect(customerOf(s).trust).toBeCloseTo(
      2 + CONTACT_TRUST_BOOST + (50 / 100) * REPUTATION_TRUST_FACTOR,
      2,
    );
    expect(loanOf(s).progressHours).toBe(1);
  });

  it('a famous office earns trust faster on every check-in', () => {
    const modest = staffedStarter();
    const famous = staffedStarter();
    famous.stats.reputation = 100;
    const a = contactCustomer(modest, STARTER_LOAN_ID);
    const b = contactCustomer(famous, STARTER_LOAN_ID);
    expect(customerOf(b).trust).toBeGreaterThan(customerOf(a).trust);
  });
});

describe('Delay (GDD §4 action 4)', () => {
  it('freezes the loan and decays happiness daily until resumed', () => {
    let s = toggleDelay(staffedStarter(), STARTER_LOAN_ID);
    expect(loanOf(s).delayed).toBe(true);
    expect(loanOf(s).statusTag).toBe('Delayed');

    const happinessBefore = customerOf(s).happiness;
    const stageBefore = loanOf(s).stage;
    s = advanceDay(s);
    expect(loanOf(s).stage).toBe(stageBefore); // nothing moved
    expect(customerOf(s).happiness).toBe(happinessBefore - DELAYED_HAPPINESS_DECAY_PER_DAY);

    s = toggleDelay(s, STARTER_LOAN_ID);
    expect(loanOf(s).delayed).toBe(false);
    s = advanceHour(s);
    s = advanceHour(s);
    expect(loanOf(s).stage).not.toBe(stageBefore); // moving again
  });
});

describe('happiness dynamics', () => {
  it('rises when a stage completes', () => {
    const base = staffedStarter();
    const loan = base.loans[STARTER_LOAN_ID];
    if (!loan) throw new Error('missing loan');
    loan.progressHours = STAGE_HOURS_REQUIRED.lead; // waiting period served (M9)
    const before = customerOf(base).happiness;
    const s = moveLoanForward(base, STARTER_LOAN_ID);
    expect(customerOf(s).happiness).toBe(before + STAGE_ADVANCE_HAPPINESS_BOOST);
  });

  it('resets the weekly trend baseline when a new week starts', () => {
    let s = staffedStarter();
    s = contactCustomer(s, STARTER_LOAN_ID); // happiness 82, baseline 80
    expect(customerOf(s).happiness).not.toBe(customerOf(s).happinessAtWeekStart);

    for (let day = 1; day <= 7; day++) s = advanceDay(s); // day becomes 8 → new week
    expect(customerOf(s).happinessAtWeekStart).toBe(customerOf(s).happiness);
  });
});
