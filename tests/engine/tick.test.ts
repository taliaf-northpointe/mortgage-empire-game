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

  it('accumulates progress and moves lead → application after enough hours', () => {
    let s = createStarterState();
    expect(loanOf(s).stage).toBe('lead');
    s = advanceHour(s);
    expect(loanOf(s).stage).toBe('lead');
    s = advanceHour(s);
    expect(loanOf(s).stage).toBe('application');
    expect(s.clock.hour).toBe(DAY_START_HOUR + 2);
  });

  it('collects one paper per hour while the loan sits in Papers', () => {
    let s = createStarterState();
    while (loanOf(s).stage !== 'documents') s = advanceHour(s);
    const before = Object.values(loanOf(s).documents).filter((d) => d === 'collected').length;
    s = advanceHour(s);
    const after = Object.values(loanOf(s).documents).filter((d) => d === 'collected').length;
    expect(after).toBe(before + 1);
    expect(loanOf(s).statusTag).toMatch(/Missing \d+ docs|Ready/);
  });

  it('stalls a stage that has no employee of the owning role', () => {
    const base = createStarterState();
    delete base.employees['emp-processor-1'];
    let s = base;
    for (let i = 0; i < TICKS_PER_DAY * 3; i++) s = advanceHour(s);
    expect(loanOf(s).stage).toBe('documents'); // stuck: nobody works Papers
  });
});

describe('advanceDay', () => {
  it('runs the full working day and rolls the calendar to 9 AM next day', () => {
    const s = advanceDay(createStarterState());
    expect(s.clock.day).toBe(2);
    expect(s.clock.hour).toBe(DAY_START_HOUR);
    expect(s.clock.weekday).toBe(2);
    expect(s.dayHistory).toHaveLength(1);
    expect(s.eventLog).toHaveLength(0); // feed archived at day end
    expect(loanOf(s).daysInPipeline).toBe(1);
  });
});

describe('M1 acceptance: a loan travels lead → completed deterministically', () => {
  it('completes within a few days and pays the closing fee', () => {
    let s = createStarterState();
    let days = 0;
    while (loanOf(s).stage !== 'completed' && days < 10) {
      s = advanceDay(s);
      days += 1;
    }

    const loan = loanOf(s);
    expect(loan.stage).toBe('completed');
    expect(days).toBeLessThanOrEqual(5);
    expect(loan.statusTag).toBe('Closed');

    const fee = Math.round(loan.amount * CLOSING_FEE_RATE);
    expect(s.currencies.coins).toBe(STARTING_COINS + fee);
    expect(s.stats.xp).toBe(XP_PER_COMPLETED_LOAN);

    const completedDay = s.dayHistory.find((d) => d.loansCompleted === 1);
    expect(completedDay).toBeDefined();
    expect(completedDay?.revenue).toBe(fee);
    expect(completedDay?.starRating).toBeGreaterThanOrEqual(3);
  });

  it('two runs from the same starting state end in identical states', () => {
    const runA = runDays(createStarterState(), 5);
    const runB = runDays(createStarterState(), 5);
    expect(JSON.stringify(runA)).toBe(JSON.stringify(runB));
  });
});
