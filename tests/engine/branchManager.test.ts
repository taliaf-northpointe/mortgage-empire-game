import { describe, expect, it } from 'vitest';
import { HIGH_WORKLOAD } from '../../src/engine/constants';
import { createStarterState } from '../../src/engine/content/starter';
import { TRAININGS, dueTraining } from '../../src/engine/content/trainings';
import { branchManagerMorning, deriveWorkloads, hireEmployee } from '../../src/engine/employees';
import { markTrainingSeen } from '../../src/engine/playerActions';
import type { GameState, Loan } from '../../src/engine/types';
import { withClassicTeam } from '../helpers';

/** A staffed office whose lone processor is buried under `count` loans. */
function swampedOffice(count: number): GameState {
  const s = withClassicTeam(createStarterState());
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

function withManager(state: GameState): GameState {
  return hireEmployee(state, {
    name: 'Ruth Calloway',
    gender: 'f',
    role: 'branchManager',
    skill: 4,
    salaryMonthly: 5_800,
    spriteId: 13,
  });
}

describe('the Branch Manager keeps the staffing right (playtest 2026-07-07)', () => {
  it('without a manager, an overworked team stays overworked', () => {
    const s = branchManagerMorning(swampedOffice(6));
    expect(s.employees['emp-processor-1']?.workload).toBeGreaterThan(HIGH_WORKLOAD);
  });

  it('hires reinforcements when rebalancing alone cannot fix the strain', () => {
    // One processor, six processing loans — no rebalance can save them.
    const before = withManager(swampedOffice(6));
    const processorsBefore = Object.values(before.employees).filter((e) => e.role === 'processor');
    expect(processorsBefore).toHaveLength(1);

    const s = branchManagerMorning(before);
    const processors = Object.values(s.employees).filter((e) => e.role === 'processor');
    expect(processors).toHaveLength(2); // reinforcements arrived
    for (const p of processors) expect(p.workload).toBeLessThanOrEqual(HIGH_WORKLOAD);
    expect(s.eventLog.some((e) => e.title.includes('Ruth Calloway hired'))).toBe(true);
    expect(s.eventLog.some((e) => e.title.includes('rebalanced the workload'))).toBe(true);
  });

  it('leaves a comfortable team alone — no busywork, no surprise hires', () => {
    const calm = withManager(swampedOffice(2)); // 2 loans ≈ 40% workload
    const s = branchManagerMorning(calm);
    expect(s).toBe(calm); // untouched reference — nothing to do
  });

  it('never hires with an empty wallet', () => {
    const broke = withManager(swampedOffice(6));
    broke.currencies.coins = 500; // less than the hiring fee
    const s = branchManagerMorning(broke);
    expect(Object.values(s.employees).filter((e) => e.role === 'processor')).toHaveLength(1);
  });
});

describe('just-in-time trainings (playtest 2026-07-07)', () => {
  it('nothing is due at level 1 in a calm market', () => {
    expect(dueTraining(createStarterState())).toBeNull();
  });

  it('level unlocks come due at their level, one at a time, once each', () => {
    const s = createStarterState();
    s.stats.level = 5;
    expect(dueTraining(s)?.key).toBe('itSupport');

    const seen = markTrainingSeen(s, 'itSupport');
    expect(dueTraining(seen)).toBeNull(); // dismissed and remembered
    expect(markTrainingSeen(seen, 'itSupport')).toBe(seen); // idempotent

    // A jump to level 15 queues every unlock passed along the way, in order —
    // an existing save catching up sees each pop-up once.
    seen.stats.level = 15;
    expect(dueTraining(seen)?.key).toBe('loanOfficerAssistant'); // level 8, still unseen
    let queued = markTrainingSeen(seen, 'loanOfficerAssistant');
    expect(dueTraining(queued)?.key).toBe('underwritingRedo'); // level 10
    queued = markTrainingSeen(queued, 'underwritingRedo');
    expect(dueTraining(queued)?.key).toBe('compliance'); // level 15…
    queued = markTrainingSeen(queued, 'compliance');
    expect(dueTraining(queued)?.key).toBe('branchManager'); // …then its level-15 twin
  });

  it('market trainings fire on the first boom or spike', () => {
    const s = createStarterState();
    s.market = { mood: 'refiBoom', daysLeft: 5 };
    expect(dueTraining(s)?.key).toBe('refiBoom');
    const seen = markTrainingSeen(s, 'refiBoom');
    expect(dueTraining(seen)).toBeNull(); // once per save, even next boom
  });

  it('every training has a unique key and real copy', () => {
    const keys = TRAININGS.map((t) => t.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const t of TRAININGS) {
      expect(t.title.length).toBeGreaterThan(5);
      expect(t.body.length).toBeGreaterThan(40);
    }
  });
});
