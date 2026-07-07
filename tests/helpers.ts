/**
 * Test helpers. M9 made new games start with NO employees (solo founder) —
 * tests that exercise staffed behavior add the classic four back with this.
 */
import type { GameState } from '../src/engine/types';

/** The original starter team, exactly as it shipped before M9. */
export function withClassicTeam(state: GameState): GameState {
  state.employees = {
    'emp-loan-officer-1': {
      id: 'emp-loan-officer-1',
      name: 'Marcus Webb',
      role: 'loanOfficer',
      spriteId: 11,
      level: 1,
      skill: 3,
      happiness: 85,
      workload: 25,
      salaryMonthly: 4_400,
      tag: null,
    },
    'emp-processor-1': {
      id: 'emp-processor-1',
      name: 'Dana Kim',
      role: 'processor',
      spriteId: 3,
      level: 1,
      skill: 2,
      happiness: 90,
      workload: 20,
      salaryMonthly: 3_600,
      tag: null,
    },
    'emp-underwriter-1': {
      id: 'emp-underwriter-1',
      name: 'Priya Nair',
      role: 'underwriter',
      spriteId: 10,
      level: 1,
      skill: 3,
      happiness: 80,
      workload: 15,
      salaryMonthly: 4_700,
      tag: null,
    },
    'emp-closer-1': {
      id: 'emp-closer-1',
      name: 'Leo Ortiz',
      role: 'closer',
      spriteId: 4,
      level: 1,
      skill: 3,
      happiness: 85,
      workload: 10,
      salaryMonthly: 4_200,
      tag: null,
    },
  };
  const loan = state.loans['LN-2026-0001'];
  if (loan) loan.assignedEmployeeId = 'emp-loan-officer-1';
  return state;
}

/** createStarterState + the classic team, for staffed-behavior tests. */
export function staffedStarter(create: (seed?: number) => GameState, seed?: number): GameState {
  return withClassicTeam(create(seed));
}
