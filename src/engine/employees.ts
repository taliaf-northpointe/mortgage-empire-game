/**
 * Employee simulation (GDD §5, M6): workload, effectiveness, morale, tags,
 * and the Train / Promote / Hire / Rebalance actions.
 * Pure functions + mutating helpers for already-cloned states. No React.
 */
import {
  EMPLOYEE_MAX_LEVEL,
  HAPPINESS_DECAY_HEAVY,
  HAPPINESS_DECAY_OVERWORKED,
  HAPPINESS_MAX,
  HAPPINESS_RECOVERY_LIGHT,
  HIRING_FEE,
  MAX_LOANS_PER_EMPLOYEE,
  NEEDS_BREAK_HAPPINESS,
  OVERWORKED_SPEED_PENALTY,
  OVERWORKED_THRESHOLD,
  PROMOTION_RAISE,
  ROLE_BY_STAGE,
  ROLE_DISPLAY_NAME,
  SKILL_CAP_BASE,
  SKILL_SPEED_STEP,
  STAR_HAPPINESS_MIN,
  STAR_SKILL_MIN,
  TRAINING_CAP_BONUS_PER_TIER,
  TRAINING_COST,
  TRAINING_GAIN_BONUS_PER_TIER,
  TRAINING_SKILL_GAIN,
  WORKLOAD_HEAVY,
  WORKLOAD_LIGHT,
} from './constants';
import { genderForName, spritesForGender } from './content/characterSprites';
import type { SpriteGender } from './content/characterSprites';
import { awardAchievement } from './economy';
import { tiersOwned } from './upgrades';
import type { Employee, GameEvent, GameState, Role } from './types';

function pushEvent(state: GameState, category: GameEvent['category'], title: string, detail: string): void {
  const { day, hour } = state.clock;
  const n = state.eventLog.length;
  state.eventLog.push({ id: `evt-${day}-${hour}-${n}`, day, hour, category, title, detail });
}

/** Active (non-completed, non-delayed) loans assigned to an employee. */
export function assignedLoanCount(state: GameState, employeeId: string): number {
  return Object.values(state.loans).filter(
    (loan) => loan.assignedEmployeeId === employeeId && loan.stage !== 'completed' && !loan.delayed,
  ).length;
}

/** The employee of `role` with the fewest active loans (stable tie-break by id). */
export function leastLoadedEmployeeId(state: GameState, role: Role): string | null {
  const candidates = Object.values(state.employees)
    .filter((e) => e.role === role)
    .sort((a, b) => {
      const diff = assignedLoanCount(state, a.id) - assignedLoanCount(state, b.id);
      return diff !== 0 ? diff : a.id.localeCompare(b.id);
    });
  return candidates[0]?.id ?? null;
}

/** GDD §5 — workload is derived from assigned loans. Mutates the cloned state. */
export function deriveWorkloads(state: GameState): void {
  for (const employee of Object.values(state.employees)) {
    employee.workload = Math.min(
      100,
      Math.round((assignedLoanCount(state, employee.id) / MAX_LOANS_PER_EMPLOYEE) * 100),
    );
  }
}

/**
 * Progress an employee contributes per worked hour: skill helps, being
 * overworked hurts badly (GDD §5 core tension).
 */
export function effectiveness(employee: Employee): number {
  const skillFactor = 1 + (employee.skill - 3) * SKILL_SPEED_STEP;
  const overworkFactor = employee.workload >= OVERWORKED_THRESHOLD ? OVERWORKED_SPEED_PENALTY : 1;
  return Math.max(0.2, skillFactor * overworkFactor);
}

export function skillCap(employee: Employee, trainingTiers = 0): number {
  return Math.min(5, SKILL_CAP_BASE + employee.level + trainingTiers * TRAINING_CAP_BONUS_PER_TIER);
}

/** Re-evaluate auto-applied tags (GDD §5). Mutates the cloned state. */
export function updateEmployeeTags(state: GameState): void {
  const trainingTiers = tiersOwned(state, 'training');
  for (const employee of Object.values(state.employees)) {
    if (employee.happiness < NEEDS_BREAK_HAPPINESS && employee.workload >= WORKLOAD_HEAVY) {
      employee.tag = 'needsBreak';
    } else if (employee.workload >= OVERWORKED_THRESHOLD) {
      employee.tag = 'overworked';
    } else if (employee.skill >= skillCap(employee, trainingTiers) && employee.level < EMPLOYEE_MAX_LEVEL) {
      employee.tag = 'readyToPromote';
    } else if (employee.skill >= STAR_SKILL_MIN && employee.happiness >= STAR_HAPPINESS_MIN) {
      employee.tag = 'star';
    } else {
      employee.tag = null;
    }
  }
}

/**
 * Daily morale swing from workload (GDD §5); a comfy office adds a bonus to
 * everyone's day (GDD §7 Office upgrades). Mutates the cloned state.
 */
export function applyDailyMorale(state: GameState, officeBonus = 0): void {
  for (const employee of Object.values(state.employees)) {
    if (officeBonus > 0) {
      employee.happiness = Math.min(HAPPINESS_MAX, employee.happiness + officeBonus);
    }
    if (employee.workload >= OVERWORKED_THRESHOLD) {
      employee.happiness = Math.max(0, employee.happiness - HAPPINESS_DECAY_OVERWORKED);
      if (employee.happiness < NEEDS_BREAK_HAPPINESS) {
        pushEvent(
          state,
          'alerts',
          `${employee.name} needs a break`,
          'The workload is wearing them down — hire help or rebalance the loans.',
        );
      }
    } else if (employee.workload >= WORKLOAD_HEAVY) {
      employee.happiness = Math.max(0, employee.happiness - HAPPINESS_DECAY_HEAVY);
    } else if (employee.workload < WORKLOAD_LIGHT) {
      employee.happiness = Math.min(HAPPINESS_MAX, employee.happiness + HAPPINESS_RECOVERY_LIGHT);
    }
  }
  updateEmployeeTags(state);
}

/* ── Player actions (pure: same-reference refusal) ─────────────────── */

/** Train (GDD §5): spend coins → skill XP, up to the level's cap. Staff
 * Training upgrades boost the gain and raise the cap (GDD §7). */
export function trainEmployee(state: GameState, employeeId: string): GameState {
  const employee = state.employees[employeeId];
  if (!employee) return state;
  if (state.currencies.coins < TRAINING_COST) return state;
  const trainingTiers = tiersOwned(state, 'training');
  if (employee.skill >= skillCap(employee, trainingTiers)) return state;

  const s = structuredClone(state);
  const e = s.employees[employeeId];
  if (!e) return state;
  s.currencies.coins -= TRAINING_COST;
  const gain = TRAINING_SKILL_GAIN * (1 + TRAINING_GAIN_BONUS_PER_TIER * trainingTiers);
  e.skill = Math.round(Math.min(skillCap(e, trainingTiers), e.skill + gain) * 100) / 100;
  updateEmployeeTags(s);
  pushEvent(
    s,
    'loans',
    `${e.name} finished a training session`,
    `Skill is up to ${e.skill.toFixed(2)} ★. Money well spent.`,
  );
  return s;
}

/** Promote (GDD §5): raise + higher skill cap. */
export function promoteEmployee(state: GameState, employeeId: string): GameState {
  const employee = state.employees[employeeId];
  if (!employee || employee.level >= EMPLOYEE_MAX_LEVEL) return state;
  if (employee.skill < skillCap(employee, tiersOwned(state, 'training'))) return state; // must be capped

  const s = structuredClone(state);
  const e = s.employees[employeeId];
  if (!e) return state;
  e.level += 1;
  e.salaryMonthly = Math.round(e.salaryMonthly * PROMOTION_RAISE);
  updateEmployeeTags(s);
  pushEvent(
    s,
    'loans',
    `${e.name} got promoted! 🎉`,
    `Now level ${e.level} with room to grow — and a well-earned raise.`,
  );
  return s;
}

export interface HireCandidate {
  name: string;
  gender: SpriteGender;
  role: Role;
  skill: number;
  salaryMonthly: number;
  /** preview face for the hire modal; re-checked for uniqueness on hire */
  spriteId: number;
}

/**
 * Pick a portrait for a new teammate (v8): gender-matched, preferring the
 * least-used sprite so faces stay unique while unused ones remain.
 */
export function pickSpriteId(state: GameState, gender: SpriteGender, preferred?: number): number {
  const pool = spritesForGender(gender);
  const usage = new Map<number, number>(pool.map((id) => [id, 0]));
  for (const employee of Object.values(state.employees)) {
    if (usage.has(employee.spriteId)) usage.set(employee.spriteId, (usage.get(employee.spriteId) ?? 0) + 1);
  }
  if (preferred !== undefined && usage.get(preferred) === 0) return preferred;
  let best = pool[0] ?? 1;
  let bestCount = Number.POSITIVE_INFINITY;
  for (const id of pool) {
    const count = usage.get(id) ?? 0;
    if (count < bestCount) {
      best = id;
      bestCount = count;
    }
  }
  return best;
}

/** Hire (GDD §5): pay the fee, welcome them aboard. */
export function hireEmployee(state: GameState, candidate: HireCandidate): GameState {
  if (state.currencies.coins < HIRING_FEE) return state;

  const s = structuredClone(state);
  s.currencies.coins -= HIRING_FEE;
  const n = Object.keys(s.employees).length + 1;
  const id = `emp-${candidate.role}-${n}-${candidate.name.toLowerCase().replace(/[^a-z]/g, '')}`;
  s.employees[id] = {
    id,
    name: candidate.name,
    role: candidate.role,
    spriteId: pickSpriteId(s, candidate.gender ?? genderForName(candidate.name), candidate.spriteId),
    level: 1,
    skill: Math.round(candidate.skill * 100) / 100,
    happiness: 85,
    workload: 0,
    salaryMonthly: candidate.salaryMonthly,
    tag: null,
  };
  deriveWorkloads(s);
  updateEmployeeTags(s);
  pushEvent(
    s,
    'loans',
    `${candidate.name} joined the team!`,
    `Your new ${ROLE_DISPLAY_NAME[candidate.role]} is settling in at their desk.`,
  );
  awardAchievement(s, 'teamBuilder'); // GDD §10
  return s;
}

/** Assign Work (GDD §5): rebalance every active loan across its role's team. */
export function rebalanceLoans(state: GameState): GameState {
  const s = structuredClone(state);
  const activeLoans = Object.values(s.loans).filter((l) => l.stage !== 'completed');
  for (const loan of activeLoans) loan.assignedEmployeeId = null;
  for (const loan of activeLoans) {
    loan.assignedEmployeeId = leastLoadedEmployeeId(s, ROLE_BY_STAGE[loan.stage]);
  }
  deriveWorkloads(s);
  updateEmployeeTags(s);
  pushEvent(s, 'loans', 'You rebalanced the workload', 'Every loan found the least-busy pair of hands.');
  return s;
}
