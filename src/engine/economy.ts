/**
 * Economy (GDD §8) + progression rewards (GDD §10): payroll, servicing,
 * interest-rate drift, XP → levels, achievements. Mutating helpers operate
 * on already-cloned states inside the tick.
 */
import {
  AUDIT_LEVEL,
  AUDIT_PASS_REPUTATION_BONUS,
  AUDIT_REPUTATION_PENALTY,
  DEAL_STREAK_COUNT,
  GEMS_PER_BADGE,
  GEMS_PER_LEVEL_UP,
  INTEREST_DRIFT_MAX,
  INTEREST_RATE_MAX,
  INTEREST_RATE_MIN,
  LEVEL_XP_THRESHOLDS,
  MAX_PLAYER_LEVEL,
  PAYROLL_DAYS_PER_MONTH,
  QUIZ_EVERY_LEVELS,
  QUIZ_XP,
  SERVICING_INTERVAL_DAYS,
  titleForLevel,
  XP_PER_BADGE,
} from './constants';
import { ACHIEVEMENTS_BY_ID } from './content/achievements';
import { ALL_TERM_KEYS } from './content/glossary';
import { mulberry32 } from './rng';
import type { GameEvent, GameState } from './types';

function pushEvent(state: GameState, category: GameEvent['category'], title: string, detail: string): void {
  const { day, hour } = state.clock;
  const n = state.eventLog.length;
  state.eventLog.push({ id: `evt-${day}-${hour}-${n}`, day, hour, category, title, detail });
}

/** Award a badge once: XP + a gem + a feed event (GDD §10). */
export function awardAchievement(state: GameState, id: string): void {
  if (state.achievements[id]?.earned) return;
  const def = ACHIEVEMENTS_BY_ID[id];
  if (!def) return;
  state.achievements[id] = { earned: true, earnedOnDay: state.clock.day };
  state.stats.xp += XP_PER_BADGE;
  state.currencies.gems += GEMS_PER_BADGE;
  pushEvent(state, 'loans', `🏅 Badge earned: ${def.name}!`, `${def.emoji} ${def.description} +${XP_PER_BADGE} XP, +${GEMS_PER_BADGE} gem.`);
  checkLevelUp(state);
}

/** Level up whenever XP crosses a threshold (GDD §10: level = career title). */
export function checkLevelUp(state: GameState): void {
  while (
    state.stats.level < MAX_PLAYER_LEVEL &&
    state.stats.xp >= (LEVEL_XP_THRESHOLDS[state.stats.level + 1] ?? Number.POSITIVE_INFINITY)
  ) {
    state.stats.level += 1;
    state.currencies.gems += GEMS_PER_LEVEL_UP;
    pushEvent(
      state,
      'loans',
      `🎉 You're now a ${titleForLevel(state.stats.level)}!`,
      `Level ${state.stats.level} reached. +${GEMS_PER_LEVEL_UP} gems — new doors are opening.`,
    );

    // M9 — the level-20 compliance audit: with a Compliance Officer on staff
    // you pass with flying colors; without one, the regulators notice.
    if (state.stats.level === AUDIT_LEVEL && !state.auditDone) {
      state.auditDone = true;
      // (inlined rather than employees.hasRole — economy must not import employees)
      const hasCompliance = Object.values(state.employees).some((e) => e.role === 'compliance');
      if (hasCompliance) {
        state.stats.reputation = Math.min(100, state.stats.reputation + AUDIT_PASS_REPUTATION_BONUS);
        pushEvent(
          state,
          'alerts',
          'Compliance audit: PASSED ✅',
          `Your Compliance Officer had every file ready. +${AUDIT_PASS_REPUTATION_BONUS} reputation — regulators love you.`,
        );
      } else {
        state.stats.reputation = Math.max(0, state.stats.reputation - AUDIT_REPUTATION_PENALTY);
        pushEvent(
          state,
          'alerts',
          'Compliance audit: FINDINGS 🚩',
          `No compliance program on record. −${AUDIT_REPUTATION_PENALTY} reputation — a Compliance Officer would have passed this.`,
        );
      }
    }

    // Every Nth level: a pop quiz on a mortgage term (playtest 2026-07-06).
    // One at a time; deterministic term per (seed, level).
    if (state.stats.level % QUIZ_EVERY_LEVELS === 0 && !state.quiz) {
      const rng = mulberry32((state.rngSeed ^ (state.stats.level * 97_911)) >>> 0);
      const termKey = ALL_TERM_KEYS[rng.int(0, ALL_TERM_KEYS.length - 1)];
      if (termKey) {
        state.quiz = { termKey, forLevel: state.stats.level };
        pushEvent(
          state,
          'alerts',
          'Pop quiz! 🎓',
          `Prove your mortgage chops — answer correctly for +${QUIZ_XP} XP.`,
        );
      }
    }
  }
}

/** Deal Streak: three closings logged in the same hour (GDD §10). */
export function checkDealStreak(state: GameState): void {
  const { day, hour } = state.clock;
  const closingsThisHour = state.eventLog.filter(
    (e) => e.day === day && e.hour === hour && e.title.includes('got the keys'),
  ).length;
  if (closingsThisHour >= DEAL_STREAK_COUNT) awardAchievement(state, 'dealStreak');
}

/** Charge daily payroll (GDD §8; §13 decision 7). Returns the amount charged. */
export function chargePayroll(state: GameState): number {
  const monthly = Object.values(state.employees).reduce((sum, e) => sum + e.salaryMonthly, 0);
  const daily = Math.round(monthly / PAYROLL_DAYS_PER_MONTH);
  if (daily <= 0) return 0;
  state.currencies.coins -= daily;
  return daily;
}

/**
 * Monthly servicing trickle (GDD §8; §13 decision 12): every 28th day,
 * each Complete loan's customer sends their monthly payment.
 * Returns the total credited.
 */
export function creditServicing(state: GameState): number {
  if (state.clock.day === 0 || state.clock.day % SERVICING_INTERVAL_DAYS !== 0) return 0;
  let total = 0;
  const serviced = Object.values(state.loans).filter((l) => l.stage === 'completed');
  for (const loan of serviced) {
    const customer = state.customers[loan.customerId];
    const payment = customer?.dreamHome.monthly ?? 0;
    total += payment;
  }
  if (total > 0) {
    state.currencies.coins += total;
    const sample = serviced[0] ? state.customers[serviced[0].customerId]?.name : undefined;
    pushEvent(
      state,
      'loans',
      `Payments received: $${total.toLocaleString('en-US')}`,
      `${serviced.length} serviced ${serviced.length === 1 ? 'loan' : 'loans'} paid this month${sample ? ` — including ${sample}'s` : ''}. Loan Servicing at work.`,
    );
  }
  return total;
}

/** Daily interest-rate drift (GDD §8 ambient economy). Deterministic per (seed, day). */
export function driftInterestRate(state: GameState): void {
  const rng = mulberry32((state.rngSeed ^ (state.clock.day * 40_503 + 7)) >>> 0);
  const drift = (rng.next() * 2 - 1) * INTEREST_DRIFT_MAX;
  const next = Math.min(INTEREST_RATE_MAX, Math.max(INTEREST_RATE_MIN, state.stats.interestRate + drift));
  const rounded = Math.round(next * 100) / 100;
  const before = state.stats.interestRate;
  state.stats.interestRate = rounded;
  if (Math.abs(rounded - before) >= 0.1) {
    pushEvent(
      state,
      'alerts',
      rounded < before ? 'Interest rates dipped' : 'Interest rates ticked up',
      `The going rate is now ${rounded.toFixed(2)}% — expect ${rounded < before ? 'more' : 'fewer'} folks shopping for loans.`,
    );
  }
}
