import { describe, expect, it } from 'vitest';
import {
  GEMS_PER_BADGE,
  GEMS_PER_LEVEL_UP,
  INTEREST_RATE_MAX,
  INTEREST_RATE_MIN,
  LEVEL_XP_THRESHOLDS,
  PAYROLL_DAYS_PER_MONTH,
  SERVICING_INTERVAL_DAYS,
  XP_PER_BADGE,
} from '../../src/engine/constants';
import { createStarterState, STARTER_LOAN_ID } from '../../src/engine/content/starter';
import { awardAchievement, checkLevelUp, driftInterestRate } from '../../src/engine/economy';
import { advanceDay, advanceHour } from '../../src/engine/tick';
import type { GameState } from '../../src/engine/types';
import { withClassicTeam } from '../helpers';

// Payroll and auto-advance tests need staff (M9: new games start solo).
const staffedStarter = (seed?: number) => withClassicTeam(createStarterState(seed));

describe('payroll (GDD §8, charged from M7)', () => {
  it('charges 1/30 of monthly salaries at day end and records it', () => {
    const s = advanceDay(staffedStarter());
    const monthly = Object.values(s.employees).reduce((sum, e) => sum + e.salaryMonthly, 0);
    const expected = Math.round(monthly / PAYROLL_DAYS_PER_MONTH);
    const today = s.dayHistory[0];
    expect(today?.payroll).toBe(expected);
    expect(s.currencies.coins).toBeLessThan(12_000); // money pressure is real
  });

  it('a solo founder pays no payroll at all (M9)', () => {
    const s = advanceDay(createStarterState());
    expect(s.dayHistory[0]?.payroll).toBe(0);
  });
});

describe('servicing trickle (GDD §13 decision 12)', () => {
  it('credits each Complete loan monthly payment every 28 days', () => {
    const base = createStarterState();
    const loan = base.loans[STARTER_LOAN_ID];
    if (!loan) throw new Error('missing loan');
    loan.stage = 'completed';
    base.clock.day = SERVICING_INTERVAL_DAYS; // the 28th

    const s = advanceDay(base);
    const today = s.dayHistory[0];
    expect(today?.servicingIncome).toBe(1_450); // Sarah's monthly payment
  });

  it('does not credit on ordinary days', () => {
    const base = createStarterState();
    const loan = base.loans[STARTER_LOAN_ID];
    if (!loan) throw new Error('missing loan');
    loan.stage = 'completed';
    base.clock.day = 5;
    const s = advanceDay(base);
    expect(s.dayHistory[0]?.servicingIncome).toBe(0);
  });
});

describe('levels & badges (GDD §10)', () => {
  it('levels up when XP crosses a threshold, awarding gems', () => {
    const s = createStarterState();
    s.stats.xp = LEVEL_XP_THRESHOLDS[2] ?? 200;
    checkLevelUp(s);
    expect(s.stats.level).toBe(2);
    expect(s.currencies.gems).toBe(GEMS_PER_LEVEL_UP);
    expect(s.eventLog.some((e) => e.title.includes('Senior Loan Officer'))).toBe(true);
  });

  it('badges award once: XP, a gem, and an event', () => {
    const s = createStarterState();
    awardAchievement(s, 'scout');
    awardAchievement(s, 'scout');
    expect(s.achievements['scout']?.earned).toBe(true);
    expect(s.stats.xp).toBe(XP_PER_BADGE);
    expect(s.currencies.gems).toBe(GEMS_PER_BADGE);
    expect(s.eventLog.filter((e) => e.title.includes('Badge earned')).length).toBe(1);
  });
});

describe('interest-rate drift (GDD §8)', () => {
  it('drifts deterministically within bounds', () => {
    const a = createStarterState(5);
    const b = createStarterState(5);
    driftInterestRate(a);
    driftInterestRate(b);
    expect(a.stats.interestRate).toBe(b.stats.interestRate);

    const s: GameState = createStarterState(5);
    for (let day = 1; day < 200; day++) {
      s.clock.day = day;
      driftInterestRate(s);
      expect(s.stats.interestRate).toBeGreaterThanOrEqual(INTEREST_RATE_MIN);
      expect(s.stats.interestRate).toBeLessThanOrEqual(INTEREST_RATE_MAX);
    }
  });
});

describe('REGRESSION (M8.1): hour-by-hour play must still produce a real summary', () => {
  it('records completions, revenue, and XP when the day ticks one hour at a time', () => {
    // This mirrors the live store loop (advanceHour per tick, advanceDay only
    // at rollover) — the bug was a summary that always read zero this way.
    let s = staffedStarter();
    const loan = s.loans[STARTER_LOAN_ID];
    if (!loan) throw new Error('missing loan');
    loan.stage = 'closing';
    loan.progressHours = 3.5;

    let guard = 0;
    while (s.dayHistory.length === 0 && guard++ < 40) {
      s = s.clock.hour > 18 ? advanceDay(s) : advanceHour(s);
    }

    const today = s.dayHistory[0];
    expect(today?.loansCompleted).toBe(1);
    expect(today?.revenue).toBeGreaterThan(0);
    expect(today?.xpEarned).toBeGreaterThanOrEqual(100);
    expect((today?.revenueByHour ?? []).reduce((a, b) => a + b, 0)).toBe(
      (today?.revenue ?? 0) - (today?.servicingIncome ?? 0),
    );
  });
});

describe('End-of-Day data (GDD §11 screen 8)', () => {
  it('records hourly revenue that sums to fee income, then resets the tracker', () => {
    // Preload a loan about to close so revenue lands during the day.
    const base = staffedStarter();
    const loan = base.loans[STARTER_LOAN_ID];
    if (!loan) throw new Error('missing loan');
    loan.stage = 'closing';
    loan.progressHours = 3.5;

    const s = advanceDay(base);
    const today = s.dayHistory[0];
    expect(today).toBeDefined();
    const hourlySum = (today?.revenueByHour ?? []).reduce((a, b) => a + b, 0);
    expect(hourlySum).toBe(today?.revenue);
    expect(hourlySum).toBeGreaterThan(0);
    expect(s.todayRevenueByHour.every((v) => v === 0)).toBe(true);
    expect(today?.highlights.length).toBeGreaterThan(0);
  });
});
