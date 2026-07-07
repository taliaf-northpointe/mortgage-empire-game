import { describe, expect, it } from 'vitest';
import {
  HIRING_FEE,
  MAX_LOANS_PER_EMPLOYEE,
  OVERWORKED_SPEED_PENALTY,
  STARTING_COINS,
  TRAINING_COST,
} from '../../src/engine/constants';
import { generateCandidates } from '../../src/engine/content/candidates';
import { createStarterState } from '../../src/engine/content/starter';
import {
  assignedLoanCount,
  deriveWorkloads,
  effectiveness,
  hireEmployee,
  leastLoadedEmployeeId,
  promoteEmployee,
  rebalanceLoans,
  skillCap,
  trainEmployee,
  updateEmployeeTags,
} from '../../src/engine/employees';
import { advanceHour } from '../../src/engine/tick';
import type { GameState, Loan } from '../../src/engine/types';

/** Give the lone processor `count` extra active loans in Processing. */
function withProcessingLoans(state: GameState, count: number): GameState {
  const s = structuredClone(state);
  const template = s.loans['LN-2026-0001'];
  if (!template) throw new Error('starter loan missing');
  for (let i = 0; i < count; i++) {
    const loan: Loan = structuredClone(template);
    loan.id = `LN-2026-9${String(i).padStart(3, '0')}`;
    loan.stage = 'processing';
    loan.progressHours = 0;
    loan.assignedEmployeeId = 'emp-processor-1';
    s.loans[loan.id] = loan;
  }
  deriveWorkloads(s);
  return s;
}

describe('workload (GDD §5)', () => {
  it('derives workload from assigned active loans', () => {
    const s = withProcessingLoans(createStarterState(), 2);
    expect(s.employees['emp-processor-1']?.workload).toBe(
      Math.round((2 / MAX_LOANS_PER_EMPLOYEE) * 100),
    );
  });

  it('ACCEPTANCE: an overworked employee slows loans…', () => {
    const relaxed = withProcessingLoans(createStarterState(), 1);
    const swamped = withProcessingLoans(createStarterState(), 5);

    const target = 'LN-2026-9000';
    const afterRelaxed = advanceHour(relaxed).loans[target]?.progressHours ?? 0;
    const afterSwamped = advanceHour(swamped).loans[target]?.progressHours ?? 0;

    expect(afterSwamped).toBeLessThan(afterRelaxed);
    expect(afterSwamped).toBeCloseTo(afterRelaxed * OVERWORKED_SPEED_PENALTY, 1);
  });

  it('…and hiring (plus rebalancing) fixes it', () => {
    let s = withProcessingLoans(createStarterState(), 5);
    expect(s.employees['emp-processor-1']?.workload).toBe(100);

    s = hireEmployee(s, { name: 'Avery Brooks', gender: 'f', role: 'processor', skill: 3, salaryMonthly: 3_900, spriteId: 2 });
    s = rebalanceLoans(s);

    const processorLoads = Object.values(s.employees)
      .filter((e) => e.role === 'processor')
      .map((e) => ({ id: e.id, workload: e.workload }));
    expect(processorLoads).toHaveLength(2);
    for (const { workload } of processorLoads) expect(workload).toBeLessThan(90);

    // No overwork penalty anymore — progress reflects pure skill speed
    // (Dana is skill 2 → 0.85×), well above the swamped 0.5× rate.
    const target = advanceHour(s).loans['LN-2026-9000'];
    expect(target?.progressHours ?? 0).toBeGreaterThanOrEqual(0.85);
  });
});

describe('assignment', () => {
  it('new stages go to the least-loaded employee of the owning role', () => {
    let s = withProcessingLoans(createStarterState(), 3);
    s = hireEmployee(s, { name: 'Rowan Kim', gender: 'm', role: 'processor', skill: 3, salaryMonthly: 3_900, spriteId: 5 });
    const newbie = Object.values(s.employees).find((e) => e.name === 'Rowan Kim');
    expect(newbie).toBeDefined();
    expect(leastLoadedEmployeeId(s, 'processor')).toBe(newbie?.id);
  });
});

describe('Train / Promote / Hire (GDD §5)', () => {
  it('training costs coins and raises skill toward the cap', () => {
    const s = trainEmployee(createStarterState(), 'emp-processor-1');
    expect(s.currencies.coins).toBe(STARTING_COINS - TRAINING_COST);
    expect(s.employees['emp-processor-1']?.skill).toBe(2.25);
  });

  it('training refuses beyond the level cap; promotion raises the cap and salary', () => {
    let s = createStarterState();
    const employee = s.employees['emp-processor-1'];
    if (!employee) throw new Error('missing employee');
    employee.skill = skillCap(employee); // 3.5 at level 1
    s.currencies.coins = 100_000;
    updateEmployeeTags(s);
    expect(s.employees['emp-processor-1']?.tag).toBe('readyToPromote');
    expect(trainEmployee(s, 'emp-processor-1')).toBe(s); // refused at cap

    const promoted = promoteEmployee(s, 'emp-processor-1');
    expect(promoted.employees['emp-processor-1']?.level).toBe(2);
    expect(promoted.employees['emp-processor-1']?.salaryMonthly).toBe(Math.round(3_600 * 1.15));
    expect(trainEmployee(promoted, 'emp-processor-1')).not.toBe(promoted); // room to grow again
  });

  it('hiring pays the fee and adds a fresh teammate', () => {
    const s = hireEmployee(createStarterState(), {
      name: 'Casey Nguyen',
      gender: 'f',
      role: 'underwriter',
      skill: 3.5,
      salaryMonthly: 5_000,
      spriteId: 2,
    });
    expect(s.currencies.coins).toBe(STARTING_COINS - HIRING_FEE);
    const hired = Object.values(s.employees).find((e) => e.name === 'Casey Nguyen');
    expect(hired?.role).toBe('underwriter');
    expect(hired?.level).toBe(1);
    expect(assignedLoanCount(s, hired?.id ?? '')).toBe(0);
  });

  it('portraits are gender-matched and unique while sprites remain (v8)', () => {
    // starter women use sprites 3 (Dana) and 10 (Priya); the female pool is [3, 6, 9, 10, 13, 14, 16]
    let s = createStarterState();
    s = hireEmployee(s, { name: 'Avery Brooks', gender: 'f', role: 'processor', skill: 3, salaryMonthly: 3_900, spriteId: 3 });
    const avery = Object.values(s.employees).find((e) => e.name === 'Avery Brooks');
    expect(avery?.spriteId).not.toBe(3); // preferred sprite already taken by Dana
    expect([6, 9, 13, 14, 16]).toContain(avery?.spriteId);

    s = hireEmployee(s, { name: 'Harper Osei', gender: 'f', role: 'closer', skill: 3, salaryMonthly: 4_500, spriteId: avery?.spriteId ?? 2 });
    const harper = Object.values(s.employees).find((e) => e.name === 'Harper Osei');
    const womenSprites = Object.values(s.employees)
      .filter((e) => ['Dana Kim', 'Priya Nair', 'Avery Brooks', 'Harper Osei'].includes(e.name))
      .map((e) => e.spriteId);
    expect(new Set(womenSprites).size).toBe(4); // all four women look distinct
    expect(harper?.spriteId).toBeDefined();
  });

  it('candidate generation is deterministic per seed and priced by skill', () => {
    const a = generateCandidates(1234, 'processor');
    const b = generateCandidates(1234, 'processor');
    expect(a).toEqual(b);
    expect(a).toHaveLength(3);
    for (const candidate of a) {
      expect(candidate.skill).toBeGreaterThanOrEqual(1.5);
      expect(candidate.skill).toBeLessThanOrEqual(4);
      expect(candidate.salaryMonthly).toBeGreaterThanOrEqual(3_600);
      expect(candidate.salaryMonthly).toBeLessThanOrEqual(4_100);
    }
  });
});

describe('effectiveness (GDD §5)', () => {
  it('skill speeds work up; overwork halves it', () => {
    const base = createStarterState().employees['emp-underwriter-1'];
    if (!base) throw new Error('missing employee');
    expect(effectiveness({ ...base, skill: 3, workload: 50 })).toBe(1);
    expect(effectiveness({ ...base, skill: 5, workload: 50 })).toBeCloseTo(1.3);
    expect(effectiveness({ ...base, skill: 3, workload: 95 })).toBeCloseTo(0.5);
  });
});
