import { describe, expect, it } from 'vitest';
import {
  LEVEL_XP_THRESHOLDS,
  MAX_PLAYER_LEVEL,
  QUIZ_XP,
  REDO_CHALLENGE_LEVEL,
  WALKAWAY_CHALLENGE_LEVEL,
  WALKAWAY_HAPPINESS,
  XP_PER_TERM_LEARNED,
} from '../../src/engine/constants';
import { ALL_TERM_KEYS } from '../../src/engine/content/glossary';
import { createStarterState } from '../../src/engine/content/starter';
import { checkLevelUp } from '../../src/engine/economy';
import { answerQuiz, learnTerm } from '../../src/engine/playerActions';
import { advanceDay, maybeUnderwritingRedo } from '../../src/engine/tick';
import type { GameState } from '../../src/engine/types';

describe('the extended career ladder', () => {
  it('reaches level 30 with strictly growing XP costs', () => {
    expect(MAX_PLAYER_LEVEL).toBe(30);
    expect(LEVEL_XP_THRESHOLDS).toHaveLength(MAX_PLAYER_LEVEL + 1);
    for (let level = 3; level <= MAX_PLAYER_LEVEL; level++) {
      const step = (LEVEL_XP_THRESHOLDS[level] ?? 0) - (LEVEL_XP_THRESHOLDS[level - 1] ?? 0);
      const prevStep = (LEVEL_XP_THRESHOLDS[level - 1] ?? 0) - (LEVEL_XP_THRESHOLDS[level - 2] ?? 0);
      expect(step).toBeGreaterThanOrEqual(prevStep);
    }
  });
});

describe('knowledge pays (playtest 2026-07-06)', () => {
  it('reading a term earns XP exactly once', () => {
    const s = createStarterState();
    const once = learnTerm(s, 'downPayment');
    expect(once.stats.xp).toBe(XP_PER_TERM_LEARNED);
    expect(once.glossary['downPayment']?.learned).toBe(true);
    expect(learnTerm(once, 'downPayment')).toBe(once); // same reference: refused
    expect(learnTerm(once, 'notARealTerm')).toBe(once);
  });

  it('every 5th level sets a pop quiz; a correct answer pays QUIZ_XP', () => {
    const s = createStarterState();
    s.stats.xp = LEVEL_XP_THRESHOLDS[5] ?? 0;
    checkLevelUp(s);
    expect(s.stats.level).toBe(5);
    expect(s.quiz).not.toBeNull();
    expect(ALL_TERM_KEYS).toContain(s.quiz?.termKey);
    expect(s.quiz?.forLevel).toBe(5);

    const xpBefore = s.stats.xp;
    const right = answerQuiz(s, s.quiz?.termKey ?? '');
    expect(right.stats.xp).toBe(xpBefore + QUIZ_XP);
    expect(right.quiz).toBeNull();
    expect(right.glossary[s.quiz?.termKey ?? '']?.learned).toBe(true);

    // a wrong pick resolves the quiz without XP but still teaches the term
    const wrongKey = ALL_TERM_KEYS.find((k) => k !== s.quiz?.termKey) ?? '';
    const wrong = answerQuiz(s, wrongKey);
    expect(wrong.stats.xp).toBe(xpBefore);
    expect(wrong.quiz).toBeNull();
  });
});

describe('escalating challenges', () => {
  function loanLeavingUnderwriting(seed: number, day: number, level: number): GameState {
    const s = createStarterState(seed);
    s.clock.day = day;
    s.stats.level = level;
    const loan = s.loans['LN-2026-0001'];
    if (!loan) throw new Error('starter loan missing');
    loan.stage = 'underwriting';
    for (const key of Object.keys(loan.documents)) {
      const k = key as keyof typeof loan.documents;
      if (loan.documents[k] !== 'notRequired') loan.documents[k] = 'collected';
    }
    return s;
  }

  it('below level 10, underwriting never bounces a loan', () => {
    for (let day = 1; day <= 40; day++) {
      const s = loanLeavingUnderwriting(1234, day, 9);
      const loan = s.loans['LN-2026-0001'];
      if (!loan) throw new Error('missing');
      expect(maybeUnderwritingRedo(s, loan)).toBe(false);
    }
  });

  it('from level 10, some loans bounce back once for a resubmitted document — never twice', () => {
    let bounced: GameState | null = null;
    for (let day = 1; day <= 60 && !bounced; day++) {
      const s = loanLeavingUnderwriting(1234, day, REDO_CHALLENGE_LEVEL);
      const loan = s.loans['LN-2026-0001'];
      if (!loan) throw new Error('missing');
      if (maybeUnderwritingRedo(s, loan)) bounced = s;
    }
    expect(bounced).not.toBeNull();
    if (!bounced) return;

    const loan = bounced.loans['LN-2026-0001'];
    expect(loan?.stage).toBe('documentCollection');
    expect(loan?.underwritingRedo).toBe(true);
    expect(Object.values(loan?.documents ?? {})).toContain('missing');
    expect(bounced.eventLog.some((e) => e.title.includes('one more look'))).toBe(true);

    // the same loan never bounces a second time
    if (loan) {
      loan.stage = 'underwriting';
      expect(maybeUnderwritingRedo(bounced, loan)).toBe(false);
    }
  });

  it('from level 20, a thoroughly unhappy customer walks away overnight', () => {
    // a delayed loan makes the day deterministic: no stage-advance happiness
    // boosts, just the daily delay decay pushing her under the threshold
    const miserable = () => {
      const s = createStarterState();
      const loan = s.loans['LN-2026-0001'];
      const customer = s.customers['cust-sarah-chen'];
      if (!loan || !customer) throw new Error('missing starter data');
      loan.delayed = true;
      customer.happiness = WALKAWAY_HAPPINESS;
      return s;
    };

    const s = miserable();
    s.stats.level = WALKAWAY_CHALLENGE_LEVEL;
    const repBefore = s.stats.reputation;
    const after = advanceDay(s);
    expect(after.customers['cust-sarah-chen']).toBeUndefined();
    expect(Object.values(after.loans).some((l) => l.customerId === 'cust-sarah-chen')).toBe(false);
    expect(after.stats.reputation).toBeLessThan(repBefore);
    expect(after.eventLog.some((e) => e.title.includes('walked away'))).toBe(true);

    // below the challenge level, the same misery is survivable
    const safe = miserable();
    safe.stats.level = WALKAWAY_CHALLENGE_LEVEL - 1;
    expect(advanceDay(safe).customers['cust-sarah-chen']).toBeDefined();
  });
});
