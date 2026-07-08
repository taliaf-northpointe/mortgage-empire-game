/**
 * Employee simulation (GDD §5, M6): workload, effectiveness, morale, tags,
 * and the Train / Promote / Hire / Rebalance actions.
 * Pure functions + mutating helpers for already-cloned states. No React.
 */
import {
  BRANCH_MANAGER_MAX_HIRES_PER_MORNING,
  EMPLOYEE_MAX_LEVEL,
  FIRE_TEAM_HAPPINESS_COST,
  HAPPINESS_DECAY_HEAVY,
  HAPPINESS_DECAY_OVERWORKED,
  HAPPINESS_MAX,
  HAPPINESS_RECOVERY_LIGHT,
  HAPPY_SPEED_MAX,
  HAPPY_SPEED_MIN,
  HIGH_WORKLOAD,
  HIRING_FEE,
  LEVEL_SPEED_BONUS_PER_LEVEL,
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
import { generateCandidates } from './content/candidates';
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
 * Progress an employee contributes per worked hour — deliberately never a
 * static number (playtest 2026-07-06 #2): skill speeds work up, workload past
 * HIGH_WORKLOAD drags it down toward the overworked floor, morale makes a
 * happy teammate genuinely faster (and a miserable one slower), and each
 * earned level adds seasoned-professional speed.
 */
export function effectiveness(employee: Employee): number {
  const skillFactor = 1 + (employee.skill - 3) * SKILL_SPEED_STEP;
  const strain =
    employee.workload <= HIGH_WORKLOAD
      ? 1
      : Math.max(
          OVERWORKED_SPEED_PENALTY,
          1 - ((employee.workload - HIGH_WORKLOAD) / (100 - HIGH_WORKLOAD)) * (1 - OVERWORKED_SPEED_PENALTY),
        );
  const morale = HAPPY_SPEED_MIN + (HAPPY_SPEED_MAX - HAPPY_SPEED_MIN) * (employee.happiness / 100);
  const seniority = 1 + LEVEL_SPEED_BONUS_PER_LEVEL * (employee.level - 1);
  return Math.max(0.2, skillFactor * strain * morale * seniority);
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
    } else if (employee.workload > HIGH_WORKLOAD) {
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
  let best = pool[0] ?? 3;
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

/** Does anyone on the team hold this role? (M9 — solo founders often say no.) */
export function hasRole(state: GameState, role: Role): boolean {
  return Object.values(state.employees).some((e) => e.role === role);
}

/** Why an employee can't be let go right now, or null if they can. */
export function fireBlockedReason(state: GameState, employeeId: string): string | null {
  const employee = state.employees[employeeId];
  if (!employee) return 'Nobody by that name works here.';
  // M9 — solo founders can run stages by hand, so anyone can be let go. Only
  // guard against firing into an ACTIVE workload the player can't see coming:
  // support roles (IT, compliance) own no stage and are always releasable.
  return null;
}

/**
 * Let an employee go (playtest 2026-07-06 #2): payroll shrinks immediately,
 * their loans move to teammates — and everyone who stays takes a morale hit.
 * A slower, sadder office is the real price of the savings.
 */
export function fireEmployee(state: GameState, employeeId: string): GameState {
  const employee = state.employees[employeeId];
  if (!employee || fireBlockedReason(state, employeeId)) return state;

  const s = structuredClone(state);
  delete s.employees[employeeId];
  for (const loan of Object.values(s.loans)) {
    if (loan.assignedEmployeeId === employeeId) loan.assignedEmployeeId = null; // workLoan reassigns
  }
  for (const teammate of Object.values(s.employees)) {
    teammate.happiness = Math.max(0, teammate.happiness - FIRE_TEAM_HAPPINESS_COST);
  }
  deriveWorkloads(s);
  updateEmployeeTags(s);
  pushEvent(
    s,
    'alerts',
    `${employee.name} was let go`,
    `Payroll drops $${employee.salaryMonthly.toLocaleString('en-US')}/mo, but the office feels it — everyone's happiness fell ${FIRE_TEAM_HAPPINESS_COST} points.`,
  );
  return s;
}

/** Assign Work (GDD §5): rebalance every active loan across its role's team. */
export function rebalanceLoans(state: GameState, actorName?: string): GameState {
  const s = structuredClone(state);
  const activeLoans = Object.values(s.loans).filter((l) => l.stage !== 'completed');
  for (const loan of activeLoans) loan.assignedEmployeeId = null;
  for (const loan of activeLoans) {
    loan.assignedEmployeeId = leastLoadedEmployeeId(s, ROLE_BY_STAGE[loan.stage]);
  }
  deriveWorkloads(s);
  updateEmployeeTags(s);
  pushEvent(
    s,
    'loans',
    `${actorName ?? 'You'} rebalanced the workload`,
    'Every loan found the least-busy pair of hands.',
  );
  return s;
}

/**
 * The Branch Manager's morning round (playtest 2026-07-07): if anyone on a
 * pipeline role is overworked, spread the load; if that isn't enough, hire
 * another pair of hands for the busiest role (at most
 * BRANCH_MANAGER_MAX_HIRES_PER_MORNING per day) and spread it again. The
 * result: a team that stays under the strain line without you micromanaging.
 */
export function branchManagerMorning(state: GameState): GameState {
  const manager = Object.values(state.employees).find((e) => e.role === 'branchManager');
  if (!manager) return state;

  let s = structuredClone(state);
  deriveWorkloads(s);
  const pipelineRoles = new Set<Role>(Object.values(ROLE_BY_STAGE));
  const overworked = () =>
    Object.values(s.employees)
      .filter((e) => pipelineRoles.has(e.role) && e.workload > HIGH_WORKLOAD)
      .sort((a, b) => b.workload - a.workload);

  if (overworked().length === 0) return state;

  // First move: spread the existing load fairly.
  s = rebalanceLoans(s, manager.name);

  // Still drowning? Bring in reinforcements for the busiest role.
  for (let hires = 0; hires < BRANCH_MANAGER_MAX_HIRES_PER_MORNING; hires++) {
    const busiest = overworked()[0];
    if (!busiest || s.currencies.coins < HIRING_FEE) break;
    const candidates = generateCandidates((s.rngSeed ^ (s.clock.day * 52_361 + hires)) >>> 0, busiest.role);
    const pick = candidates[0];
    if (!pick) break;
    const teamBefore = Object.keys(s.employees).length;
    s = hireEmployee(s, pick);
    if (Object.keys(s.employees).length === teamBefore) break; // couldn't afford after all
    pushEvent(
      s,
      'alerts',
      `🧑‍💼 ${manager.name} hired ${pick.name}`,
      `The ${ROLE_DISPLAY_NAME[busiest.role]}s were drowning, so your Branch Manager brought in help and re-dealt the work.`,
    );
    s = rebalanceLoans(s, manager.name);
  }
  return s;
}
