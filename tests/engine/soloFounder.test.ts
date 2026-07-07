import { describe, expect, it } from 'vitest';
import {
  AUDIT_PASS_REPUTATION_BONUS,
  AUDIT_REPUTATION_PENALTY,
  LEVEL_XP_THRESHOLDS,
  PLAYER_SOLO_SPEED,
  REQUIRED_DOCS_BY_PURPOSE,
  STAGE_HOURS_REQUIRED,
} from '../../src/engine/constants';
import { maybeSpawnDisruption } from '../../src/engine/content/disruptions';
import { createStarterState, STARTER_LOAN_ID } from '../../src/engine/content/starter';
import { checkLevelUp } from '../../src/engine/economy';
import { hireEmployee } from '../../src/engine/employees';
import {
  approveDocument,
  moveBlockedReason,
  moveLoanForward,
  requestAllDocuments,
} from '../../src/engine/playerActions';
import { advanceHour } from '../../src/engine/tick';
import type { GameState } from '../../src/engine/types';
import { withClassicTeam } from '../helpers';

function loanOf(state: GameState) {
  const loan = state.loans[STARTER_LOAN_ID];
  if (!loan) throw new Error('starter loan missing');
  return loan;
}

function collectedCount(state: GameState): number {
  return Object.values(loanOf(state).documents).filter((d) => d === 'collected').length;
}

describe('M9 — solo founder start', () => {
  it('a new game has no employees and an unassigned starter loan', () => {
    const s = createStarterState();
    expect(Object.keys(s.employees)).toHaveLength(0);
    expect(loanOf(s).assignedEmployeeId).toBeNull();
  });

  it('unstaffed stages accrue at the founder pace and NEVER auto-advance', () => {
    let s = createStarterState();
    expect(loanOf(s).stage).toBe('lead');

    s = advanceHour(s);
    expect(loanOf(s).progressHours).toBeCloseTo(PLAYER_SOLO_SPEED, 5);
    expect(moveBlockedReason(s, STARTER_LOAN_ID)).toContain('Still in the works');

    // grind out the full waiting period — the loan is ready but WAITS for you
    while (loanOf(s).progressHours < STAGE_HOURS_REQUIRED.lead) s = advanceHour(s);
    s = advanceHour(s);
    expect(loanOf(s).stage).toBe('lead'); // no click, no move
    expect(moveBlockedReason(s, STARTER_LOAN_ID)).toBeNull();

    s = moveLoanForward(s, STARTER_LOAN_ID);
    expect(loanOf(s).stage).toBe('preQualification');
  });

  it('solo document collection sits still until YOU request the paperwork', () => {
    const base = createStarterState();
    const loan = base.loans[STARTER_LOAN_ID];
    if (!loan) throw new Error('starter loan missing');
    loan.stage = 'documentCollection';

    let s = base;
    for (let i = 0; i < 3; i++) s = advanceHour(s);
    expect(collectedCount(s)).toBe(0); // nothing asked for, nothing arrives
    expect(loanOf(s).progressHours).toBe(0); // the file just sits

    s = requestAllDocuments(s, STARTER_LOAN_ID);
    s = advanceHour(s); // Sarah is prompt (and trusting) — next hour it lands
    expect(collectedCount(s)).toBe(1);
  });

  it('a processor chases the paperwork automatically once hired', () => {
    const base = withClassicTeam(createStarterState());
    const loan = base.loans[STARTER_LOAN_ID];
    if (!loan) throw new Error('starter loan missing');
    loan.stage = 'documentCollection';

    const s = advanceHour(base);
    const unrequested = Object.values(loanOf(s).documents).filter((d) => d === 'missing');
    expect(unrequested).toHaveLength(0); // Dana asked for everything at once
    expect(s.eventLog.some((e) => e.title.includes('requested'))).toBe(true);
  });
});

describe('M9 — underwriting sign-off', () => {
  function readyForUnderwriting(state: GameState): GameState {
    const loan = state.loans[STARTER_LOAN_ID];
    if (!loan) throw new Error('starter loan missing');
    loan.stage = 'underwriting';
    for (const key of REQUIRED_DOCS_BY_PURPOSE.purchase) loan.documents[key] = 'collected';
    return state;
  }

  it('solo, every document needs YOUR approval before the loan can move', () => {
    let s = readyForUnderwriting(createStarterState());
    const loan = s.loans[STARTER_LOAN_ID];
    if (!loan) throw new Error('starter loan missing');
    loan.progressHours = STAGE_HOURS_REQUIRED.underwriting; // waiting period served

    expect(moveBlockedReason(s, STARTER_LOAN_ID)).toContain('sign-off');
    for (const key of REQUIRED_DOCS_BY_PURPOSE.purchase) {
      s = approveDocument(s, STARTER_LOAN_ID, key);
    }
    expect(moveBlockedReason(s, STARTER_LOAN_ID)).toBeNull();
    expect(moveLoanForward(s, STARTER_LOAN_ID).loans[STARTER_LOAN_ID]?.stage).toBe('clearToClose');
  });

  it('approving respects the rules: underwriting only, collected only, once only', () => {
    const wrongStage = createStarterState();
    expect(approveDocument(wrongStage, STARTER_LOAN_ID, 'taxReturns')).toBe(wrongStage);

    const s = readyForUnderwriting(createStarterState());
    const loan = s.loans[STARTER_LOAN_ID];
    if (!loan) throw new Error('starter loan missing');
    loan.documents.taxReturns = 'requested'; // not in hand yet
    expect(approveDocument(s, STARTER_LOAN_ID, 'taxReturns')).toBe(s);

    const once = approveDocument(s, STARTER_LOAN_ID, 'bankStatements');
    expect(approveDocument(once, STARTER_LOAN_ID, 'bankStatements')).toBe(once); // no double-stamp
  });

  it('even the founder waits out the underwriting period', () => {
    let s = readyForUnderwriting(createStarterState());
    for (const key of REQUIRED_DOCS_BY_PURPOSE.purchase) {
      s = approveDocument(s, STARTER_LOAN_ID, key);
    }
    expect(moveBlockedReason(s, STARTER_LOAN_ID)).toContain('Underwriting'); // hours still owed
    expect(moveLoanForward(s, STARTER_LOAN_ID)).toBe(s);
  });

  it('a hired underwriter signs off one document per worked hour', () => {
    const s = readyForUnderwriting(withClassicTeam(createStarterState()));
    const approvals = (state: GameState) =>
      Object.values(state.loans[STARTER_LOAN_ID]?.docApprovals ?? {}).filter(Boolean).length;

    const afterOne = advanceHour(s);
    expect(approvals(afterOne)).toBe(1);
    const afterTwo = advanceHour(afterOne);
    expect(approvals(afterTwo)).toBe(2);
  });
});

describe('M9 — in-house IT vs. the outsourced tech', () => {
  it('an IT hire makes mishaps rarer and shorter (deterministic scan)', () => {
    const solo = createStarterState(42);
    solo.stats.level = 10; // success breeds chaos — plenty of chances to compare
    const staffedIt = hireEmployee(solo, {
      name: 'Ivy Chen',
      gender: 'f',
      role: 'it',
      skill: 3,
      salaryMonthly: 4_000,
      spriteId: 6,
    });

    const spawnDays = (base: GameState) => {
      const days = new Map<number, number>(); // day → hoursLeft
      for (let day = 10; day <= 90; day++) {
        const s = structuredClone(base);
        s.clock.day = day;
        maybeSpawnDisruption(s);
        if (s.disruption) days.set(day, s.disruption.hoursLeft);
      }
      return days;
    };

    const without = spawnDays(solo);
    const withIt = spawnDays(staffedIt);

    expect(without.size).toBeGreaterThan(0); // gremlins exist
    expect(withIt.size).toBeLessThan(without.size); // …but fewer with IT on staff
    for (const [day, hours] of withIt) {
      expect(without.has(day)).toBe(true); // IT never CAUSES a mishap
      expect(hours).toBeLessThanOrEqual(without.get(day) ?? 0); // and fixes are never slower
    }
  });
});

describe('M9 — the level-20 compliance audit', () => {
  function atTheThreshold(): GameState {
    const s = createStarterState();
    s.stats.level = 19;
    s.stats.xp = LEVEL_XP_THRESHOLDS[20] ?? Number.MAX_SAFE_INTEGER;
    return s;
  }

  it('no compliance program → findings, and reputation pays for it', () => {
    const s = atTheThreshold();
    checkLevelUp(s);
    expect(s.stats.level).toBe(20);
    expect(s.auditDone).toBe(true);
    expect(s.stats.reputation).toBe(50 - AUDIT_REPUTATION_PENALTY);
    expect(s.eventLog.some((e) => e.title.includes('FINDINGS'))).toBe(true);
  });

  it('with a Compliance Officer, the audit passes — and reputation grows', () => {
    let s = createStarterState();
    s = hireEmployee(s, {
      name: 'Nora Vance',
      gender: 'f',
      role: 'compliance',
      skill: 3,
      salaryMonthly: 5_500,
      spriteId: 9,
    });
    s.stats.level = 19;
    s.stats.xp = LEVEL_XP_THRESHOLDS[20] ?? Number.MAX_SAFE_INTEGER;
    checkLevelUp(s);
    expect(s.auditDone).toBe(true);
    expect(s.stats.reputation).toBe(50 + AUDIT_PASS_REPUTATION_BONUS);
    expect(s.eventLog.some((e) => e.title.includes('PASSED'))).toBe(true);
  });
});
