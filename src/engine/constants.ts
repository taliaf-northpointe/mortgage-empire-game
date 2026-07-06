/**
 * ALL tunable numbers and shared literals live here, nowhere else (TDD §3).
 * Every constant references the GDD/TDD section it comes from.
 */
import type { DocumentKey, LoanStage, LoanType, Role, Season } from './types';

/** GDD §1 */
export const GAME_TITLE = 'Mortgage Empire';
export const TAGLINE = 'Build your neighborhood. Own the block.';

/** TDD §5 — localStorage save key */
export const SAVE_KEY = 'mortgage-empire:save:v1';

/** TDD §4 — the working day runs 9 AM → 6 PM, 10 ticks/day */
export const DAY_START_HOUR = 9;
export const DAY_END_HOUR = 18;
export const TICKS_PER_DAY = 10;

/** GDD §2 — day-based time with seasons; length per season is a tunable (not specified in GDD) */
export const DAYS_PER_SEASON = 28;
export const SEASONS: readonly Season[] = ['spring', 'summer', 'fall', 'winter'];
export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

/** GDD §3 — the seven pipeline stages, in order, with fixed progress % */
export const STAGE_ORDER: readonly LoanStage[] = [
  'lead',
  'application',
  'documents',
  'review',
  'approval',
  'closing',
  'completed',
];

export const STAGE_PROGRESS_PCT: Record<LoanStage, number> = {
  lead: 15,
  application: 30,
  documents: 45,
  review: 60,
  approval: 75,
  closing: 90,
  completed: 100,
};

/** GDD §3 — friendly journey labels shown on the Customer screen */
export const STAGE_FRIENDLY_LABEL: Record<LoanStage, string> = {
  lead: 'Hello!',
  application: 'Filling forms',
  documents: 'Papers',
  review: 'Checking',
  approval: 'Yes/No',
  closing: 'Signing',
  completed: 'Home!',
};

/** GDD §5 — which role owns which stage */
export const ROLE_BY_STAGE: Record<LoanStage, Role> = {
  lead: 'loanOfficer',
  application: 'loanOfficer',
  documents: 'processor',
  review: 'reviewer',
  approval: 'reviewer',
  closing: 'closer',
  completed: 'closer',
};

/**
 * TDD §4c — work-hours a loan must accumulate to clear each stage (base values;
 * skill and upgrades will reduce these in later milestones).
 */
export const STAGE_HOURS_REQUIRED: Record<LoanStage, number> = {
  lead: 2,
  application: 3,
  documents: 2, // plus one hour per paper the customer still owes (M1 behavior, see tick.ts)
  review: 4,
  approval: 2,
  closing: 5,
  completed: 0,
};

/**
 * GDD §4 — which papers each loan type needs. Refinance skips some;
 * Investment needs the full set.
 */
export const REQUIRED_DOCS_BY_LOAN_TYPE: Record<LoanType, readonly DocumentKey[]> = {
  firstHome: ['proofOfJob', 'moneyInBank', 'photoId', 'addressHistory', 'references', 'taxPapers', 'homeInspection'],
  homePurchase: ['proofOfJob', 'moneyInBank', 'photoId', 'addressHistory', 'taxPapers', 'homeInspection'],
  refinance: ['proofOfJob', 'moneyInBank', 'photoId', 'taxPapers'],
  investment: ['proofOfJob', 'moneyInBank', 'photoId', 'addressHistory', 'references', 'taxPapers', 'homeInspection'],
};

/** GDD §4 — plain-language paper names (players never see jargon) */
export const DOC_FRIENDLY_NAME: Record<DocumentKey, string> = {
  proofOfJob: 'Proof of Job',
  moneyInBank: 'Money in the Bank',
  photoId: 'Photo ID',
  addressHistory: 'Home Address History',
  references: 'References',
  taxPapers: 'Tax Papers',
  homeInspection: 'Home Inspection',
};

/** GDD §8 — closing fee as a share of loan amount (target 1.5–2%) */
export const CLOSING_FEE_RATE = 0.0175;

/** GDD §10 — XP per completed loan (End-of-Day shows "+300 XP" for a good day) */
export const XP_PER_COMPLETED_LOAN = 100;

/** M6 will derive workload from this; declared now so no magic numbers later */
export const MAX_LOANS_PER_EMPLOYEE = 4;

/** New-game starting values (GDD §8 HUD examples; coins are a tunable) */
export const STARTING_COINS = 12_000;
export const STARTING_REPUTATION = 50;
export const STARTING_INTEREST_RATE = 6.4;

/** GDD §10 — day star rating; placeholder formula until M7: base + completions, clamped 1–5 */
export const STAR_RATING_BASE = 2;
