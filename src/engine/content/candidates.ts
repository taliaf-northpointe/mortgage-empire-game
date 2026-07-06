/**
 * Hire-pool candidate generation (GDD §5: "new candidates with randomized
 * skill/salary"). Deterministic for a given seed — the UI picks the seed.
 */
import { SALARY_RANGE_BY_ROLE } from '../constants';
import type { HireCandidate } from '../employees';
import { mulberry32 } from '../rng';
import type { Role } from '../types';

const CANDIDATE_NAMES = [
  'Avery Brooks',
  'Jordan Patel',
  'Casey Nguyen',
  'Riley Thompson',
  'Morgan Alvarez',
  'Quinn Fischer',
  'Harper Osei',
  'Rowan Kim',
  'Sydney Larsson',
  'Emerson Cole',
  'Jamie Okada',
  'Alexis Romero',
  'Taylor Singh',
  'Devon Marsh',
  'Skyler Anand',
  'Reese Delgado',
];

/** Three candidates for a role. Higher skill costs more, sensibly. */
export function generateCandidates(seed: number, role: Role): HireCandidate[] {
  const rng = mulberry32(seed >>> 0);
  const range = SALARY_RANGE_BY_ROLE[role];
  const usedNames = new Set<string>();

  return Array.from({ length: 3 }, () => {
    let name = rng.pick(CANDIDATE_NAMES);
    while (usedNames.has(name)) name = rng.pick(CANDIDATE_NAMES);
    usedNames.add(name);

    const skill = Math.round((1.5 + rng.next() * 2.5) * 4) / 4; // 1.5–4.0 in quarter steps
    const skillShare = (skill - 1.5) / 2.5;
    const salaryMonthly =
      Math.round((range.min + (range.max - range.min) * (0.3 + 0.7 * skillShare)) / 50) * 50;

    return { name, role, skill, salaryMonthly };
  });
}
