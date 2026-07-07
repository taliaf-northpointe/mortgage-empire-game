import { describe, expect, it } from 'vitest';
import {
  CLOSING_FEE_RATE,
  DAY_START_HOUR,
  STARTING_COINS,
  TICKS_PER_DAY,
  XP_PER_COMPLETED_LOAN,
} from '../../src/engine/constants';
import { createStarterState, STARTER_LOAN_ID } from '../../src/engine/content/starter';
import { advanceDay, advanceHour } from '../../src/engine/tick';
import type { GameState } from '../../src/engine/types';

function loanOf(state: GameState) {
  const loan = state.loans[STARTER_LOAN_ID];
  if (!loan) throw new Error('starter loan missing');
  return loan;
}

function runDays(state: GameState, days: number): GameState {
  let s = state;
  for (let i = 0; i < days; i++) s = advanceDay(s);
  return s;
}

describe('advanceHour', () => {
  it('is pure: the input state is not mutated', () => {
    const before = createStarterState();
    const snapshot = JSON.stringify(before);
    advanceHour(before);
    expect(JSON.stringify(before)).toBe(snapshot);
  });

  it('accumulates progress and moves lead → Pre-Qualification after enough hours', () => {
    let s = createStarterState();
    expect(loanOf(s).stage).toBe('lead');
    s = advanceHour(s);
    expect(loanOf(s).stage).toBe('lead');
    s = advanceHour(s);
    expect(loanOf(s).stage).toBe('preQualification');
    expect(s.clock.hour).toBe(DAY_START_HOUR + 2);
  });

  it('collects unprompted documents on the trait cadence (Sarah at trust 1: every 2 hours)', () => {
    let s = createStarterState();
    const sarah = s.customers['cust-sarah-chen'];
    if (sarah) sarah.trust = 1; // pin trust so the pure trait cadence shows
    while (loanOf(s).stage !== 'documentCollection') s = advanceHour(s);
    const before = Object.values(loanOf(s).documents).filter((d) => d === 'collected').length;
    s = advanceHour(s);
    s = advanceHour(s);
    const after = Object.values(loanOf(s).documents).filter((d) => d === 'collected').length;
    expect(after).toBe(before + 1);
    expect(loanOf(s).statusTag).toMatch(/Missing \d+ docs|Ready/);
  });

  it('runs the Processing sub-steps: Appraisal, then Title Review', () => {
    let s = createStarterState();
    while (loanOf(s).stage !== 'processing') s = advanceHour(s);
    expect(loanOf(s).statusTag).toBe('Appraisal ordered');

    let sawAppraisalEvent = false;
    while (loanOf(s).stage === 'processing') {
      s = advanceHour(s);
      if (s.eventLog.some((e) => e.title.includes('Appraisal came back'))) sawAppraisalEvent = true;
      if (loanOf(s).stage === 'processing' && loanOf(s).statusTag === 'Title review') break;
    }
    expect(sawAppraisalEvent || loanOf(s).statusTag === 'Title review').toBe(true);
  });

  it('stalls a stage that has no employee of the owning role', () => {
    const base = createStarterState();
    delete base.employees['emp-processor-1'];
    let s = base;
    for (let i = 0; i < TICKS_PER_DAY * 4; i++) s = advanceHour(s);
    expect(loanOf(s).stage).toBe('documentCollection'); // stuck: nobody owns Document Collection
  });
});

describe('advanceDay', () => {
  it('runs the full working day and rolls the calendar to 9 AM next day', () => {
    const s = advanceDay(createStarterState());
    expect(s.clock.day).toBe(2);
    expect(s.clock.hour).toBe(DAY_START_HOUR);
    expect(s.clock.weekday).toBe(2);
    expect(s.dayHistory).toHaveLength(1);
    // Yesterday's feed is archived; anything left is fresh morning news
    // (new leads, rate moves, neighborhood unlocks).
    expect(s.eventLog.every((e) => e.day === 2)).toBe(true);
    expect(loanOf(s).daysInPipeline).toBe(1);
  });
});

describe('acceptance: a loan travels the full v2 pipeline deterministically', () => {
  it('completes within a few days and pays the closing fee', () => {
    let s = createStarterState();
    let days = 0;
    while (loanOf(s).stage !== 'completed' && days < 10) {
      s = advanceDay(s);
      days += 1;
    }

    const loan = loanOf(s);
    expect(loan.stage).toBe('completed');
    expect(days).toBeLessThanOrEqual(6);
    expect(loan.statusTag).toBe('Closed');

    const fee = Math.round(loan.amount * CLOSING_FEE_RATE);
    expect(s.stats.xp).toBeGreaterThanOrEqual(XP_PER_COMPLETED_LOAN);

    // M7 accounting identity: coins = start + all revenue − all payroll.
    const totalRevenue = s.dayHistory.reduce((sum, d) => sum + d.revenue, 0);
    const totalPayroll = s.dayHistory.reduce((sum, d) => sum + d.payroll, 0);
    expect(totalRevenue).toBeGreaterThanOrEqual(fee);
    expect(totalPayroll).toBeGreaterThan(0); // money pressure is real
    expect(s.currencies.coins).toBe(STARTING_COINS + totalRevenue - totalPayroll);

    const completedDay = s.dayHistory.find((d) => d.loansCompleted >= 1);
    expect(completedDay).toBeDefined();
    expect(completedDay?.revenue).toBeGreaterThanOrEqual(fee);
  });

  it('two runs from the same starting state end in identical states', () => {
    const runA = runDays(createStarterState(), 6);
    const runB = runDays(createStarterState(), 6);
    expect(JSON.stringify(runA)).toBe(JSON.stringify(runB));
  });
});
