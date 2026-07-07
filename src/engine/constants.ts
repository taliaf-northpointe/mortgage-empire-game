/**
 * ALL tunable numbers and shared literals live here, nowhere else (TDD §3).
 * Every constant references the GDD/TDD section it comes from.
 */
import type { DocumentKey, LoanProduct, LoanPurpose, LoanStage, Role, Season, TraitKey } from './types';

/** GDD §1 */
export const GAME_TITLE = 'Mortgage Tycoon';
export const TAGLINE = 'Build your neighborhood. Own the block.';

/** TDD §5 — localStorage save key */
export const SAVE_KEY = 'mortgage-empire:save:v1';

/** TDD §6.1 — localStorage key for the glossary text-size preference */
export const GLOSSARY_SIZE_KEY = 'mortgage-empire:ui:glossary-size';

/** TDD §4 — the working day runs 9 AM → 6 PM, 10 ticks/day */
export const DAY_START_HOUR = 9;
export const DAY_END_HOUR = 18;
export const TICKS_PER_DAY = 10;

/** GDD §2 — day-based time with seasons; length per season is a tunable (not specified in GDD) */
export const DAYS_PER_SEASON = 28;
export const SEASONS: readonly Season[] = ['spring', 'summer', 'fall', 'winter'];
export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

/** GDD §3 v2 — the nine pipeline stages, in order */
export const STAGE_ORDER: readonly LoanStage[] = [
  'lead',
  'preQualification',
  'application',
  'documentCollection',
  'processing',
  'underwriting',
  'clearToClose',
  'closing',
  'completed',
];

/** GDD §3 v2 — fixed progress % per stage */
export const STAGE_PROGRESS_PCT: Record<LoanStage, number> = {
  lead: 6,
  preQualification: 14,
  application: 24,
  documentCollection: 36,
  processing: 50,
  underwriting: 64,
  clearToClose: 76,
  closing: 88,
  completed: 100,
};

/** GDD §3 v2 — stage names as shown on the Pipeline board */
export const STAGE_DISPLAY_NAME: Record<LoanStage, string> = {
  lead: 'Lead',
  preQualification: 'Pre-Qualification',
  application: 'Application',
  documentCollection: 'Document Collection',
  processing: 'Processing',
  underwriting: 'Underwriting',
  clearToClose: 'Clear to Close',
  closing: 'Closing',
  completed: 'Complete',
};

/** GDD §5 v2 — which role owns which stage */
export const ROLE_BY_STAGE: Record<LoanStage, Role> = {
  lead: 'loanOfficer',
  preQualification: 'loanOfficer',
  application: 'loanOfficer',
  documentCollection: 'processor',
  processing: 'processor',
  underwriting: 'underwriter',
  clearToClose: 'closer',
  closing: 'closer',
  completed: 'closer',
};

/** GDD §5 v2 — role display names */
export const ROLE_DISPLAY_NAME: Record<Role, string> = {
  loanOfficer: 'Loan Officer',
  processor: 'Processor',
  underwriter: 'Underwriter',
  closer: 'Closer',
};

/**
 * TDD §4c — work-hours a loan must accumulate to clear each stage (base values;
 * skill and upgrades will reduce these in later milestones).
 */
export const STAGE_HOURS_REQUIRED: Record<LoanStage, number> = {
  lead: 2,
  preQualification: 3,
  application: 3,
  documentCollection: 2, // plus one hour per document the customer still owes (see tick.ts)
  processing: 6, // includes the Appraisal (first half) and Title Review (second half) sub-steps
  underwriting: 8, // the decisive review deserves a real waiting period (playtest 2026-07-06)
  clearToClose: 3,
  closing: 4,
  completed: 0,
};

/** GDD §3 v2 — Processing sub-steps: hours into the stage when each completes */
export const PROCESSING_APPRAISAL_HOURS = 3; // appraisal comes back
export const PROCESSING_TITLE_HOURS = 6; // title review wraps (== stage total)

/** GDD §3 v2 — loan products & purposes (restricted set) */
export const LOAN_PRODUCTS: readonly LoanProduct[] = ['conventional', 'fha', 'va'];
export const LOAN_PRODUCT_LABEL: Record<LoanProduct, string> = {
  conventional: 'Conventional',
  fha: 'FHA',
  va: 'VA',
};
export const LOAN_PURPOSE_LABEL: Record<LoanPurpose, string> = {
  purchase: 'Purchase',
  refinance: 'Refinance',
};

/** GDD §4 action 3 — Contact Customer: +happiness, +trust, small time cost */
export const CONTACT_HAPPINESS_BOOST = 2;
export const CONTACT_TRUST_BOOST = 0.25;
export const CONTACT_TIME_COST_HOURS = 1;
export const TRUST_MAX = 5;
export const HAPPINESS_MAX = 100;

/**
 * GDD §4 (M5) — document delivery cadence in Document Collection, in hours
 * per document. Requested documents arrive faster; prompt/enthusiastic
 * customers respond faster.
 */
export const REQUESTED_DOC_HOURS = 2;
export const REQUESTED_DOC_HOURS_PROMPT = 1;
export const UNPROMPTED_DOC_HOURS = 3;
export const UNPROMPTED_DOC_HOURS_EAGER = 2;

/** GDD §4 action 1 — asking again when requests are already out costs a little happiness */
export const REQUEST_NAG_HAPPINESS_COST = 2;

/** GDD §4 — happiness rises with successful stages */
export const STAGE_ADVANCE_HAPPINESS_BOOST = 3;

/** GDD §4 action 4 — happiness decays while a loan sits delayed (applied at day end) */
export const DELAYED_HAPPINESS_DECAY_PER_DAY = 3;

/** GDD §4 — customer trait display names */
export const TRAIT_LABEL: Record<TraitKey, string> = {
  enthusiastic: 'Enthusiastic',
  detailOriented: 'Detail-oriented',
  prompt: 'Prompt',
  impatient: 'Impatient',
  cautious: 'Cautious',
  chatty: 'Chatty',
};

/** GDD §9 — neighborhood display names */
export const NEIGHBORHOOD_DISPLAY_NAME: Record<string, string> = {
  oldTown: 'Old Town',
  sunnyHeights: 'Sunny Heights',
  riversideVillage: 'Riverside Village',
  uptownHills: 'Uptown Hills',
  eastRidge: 'East Ridge',
  greenValley: 'Green Valley',
};

/**
 * GDD §4 v2 — which loan documents each purpose needs. Refinance skips several.
 */
export const REQUIRED_DOCS_BY_PURPOSE: Record<LoanPurpose, readonly DocumentKey[]> = {
  purchase: [
    'employmentVerification',
    'bankStatements',
    'governmentId',
    'residenceHistory',
    'creditAuthorization',
    'taxReturns',
    'homeInspectionReport',
  ],
  refinance: ['employmentVerification', 'bankStatements', 'governmentId', 'creditAuthorization', 'taxReturns'],
};

/** GDD §4 v2 — authentic document names (each glossary-linked in the UI) */
export const DOC_DISPLAY_NAME: Record<DocumentKey, string> = {
  employmentVerification: 'Employment Verification',
  bankStatements: 'Bank Statements',
  governmentId: 'Government-Issued ID',
  residenceHistory: 'Residence History',
  creditAuthorization: 'Credit Report Authorization',
  taxReturns: 'Tax Returns',
  homeInspectionReport: 'Home Inspection Report',
};

/** GDD §4 v2 — friendly sub-labels shown under document names */
export const DOC_FRIENDLY_SUBLABEL: Record<DocumentKey, string> = {
  employmentVerification: 'Recent paychecks from their job',
  bankStatements: 'Savings and checking history',
  governmentId: 'Driver license or passport',
  residenceHistory: 'Where they have lived',
  creditAuthorization: 'Permission to check their credit',
  taxReturns: "Last year's taxes",
  homeInspectionReport: "The inspector's write-up",
};

/** GDD §8 — closing fee as a share of loan amount (target 1.5–2%) */
export const CLOSING_FEE_RATE = 0.0175;

/** GDD §10 — XP per completed loan (End-of-Day shows "+300 XP" for a good day) */
export const XP_PER_COMPLETED_LOAN = 100;

/** GDD §5 — workload = active assigned loans / this, as a % */
export const MAX_LOANS_PER_EMPLOYEE = 4;

/** GDD §5 (M6) — employee effectiveness: progress per worked hour */
export const SKILL_SPEED_STEP = 0.15; // each skill point above/below 3 = ±15% speed
export const OVERWORKED_THRESHOLD = 90; // workload % at which effectiveness drops
export const OVERWORKED_SPEED_PENALTY = 0.5; // overworked employees work at half speed

/** GDD §5 (M6) — daily morale: heavy workload wears people down, light lets them recover */
export const WORKLOAD_HEAVY = 70;
export const WORKLOAD_LIGHT = 50;
export const HAPPINESS_DECAY_OVERWORKED = 4; // per day at ≥ OVERWORKED_THRESHOLD
export const HAPPINESS_DECAY_HEAVY = 2; // per day at ≥ WORKLOAD_HEAVY
export const HAPPINESS_RECOVERY_LIGHT = 2; // per day at < WORKLOAD_LIGHT

/** GDD §5 (M6) — employee tags */
export const STAR_SKILL_MIN = 4.5;
export const STAR_HAPPINESS_MIN = 80;
export const NEEDS_BREAK_HAPPINESS = 40;

/** GDD §5 (M6) — Train / Promote / Hire */
export const TRAINING_COST = 400;
export const TRAINING_SKILL_GAIN = 0.25;
export const SKILL_CAP_BASE = 2.5; // cap = base + level
export const EMPLOYEE_MAX_LEVEL = 3;
export const PROMOTION_RAISE = 1.15; // salary multiplier on promotion
export const HIRING_FEE = 1_000;

/** GDD §5 — mockup salary ranges per role (used for hire candidates) */
export const SALARY_RANGE_BY_ROLE: Record<Role, { min: number; max: number }> = {
  loanOfficer: { min: 4_400, max: 5_800 },
  processor: { min: 3_600, max: 4_100 },
  underwriter: { min: 4_700, max: 5_400 },
  closer: { min: 4_200, max: 5_100 },
};

/** GDD §2/§4 (M6) — simple daily lead generation until M8 events */
export const LEAD_SPAWN_CHANCE = 0.7; // per morning, before modifiers
/** Warm opening: a lead is guaranteed every morning until this many total loans exist. */
export const WARM_OPENING_LOANS = 4;
export const MAX_ACTIVE_LOANS = 6;

/* ── M7: Economy (GDD §8) ─────────────────────────────────────────── */

/** Payroll is charged daily at 1/30 of monthly salaries */
export const PAYROLL_DAYS_PER_MONTH = 30;

/** GDD §13 decision 12 — servicing trickle: full monthly payment per Complete loan, every 28 days */
export const SERVICING_INTERVAL_DAYS = 28;

/** GDD §8 — global interest rate drifts daily within cozy bounds */
export const INTEREST_DRIFT_MAX = 0.15; // max ± per day
export const INTEREST_RATE_MIN = 4.5;
export const INTEREST_RATE_MAX = 8.5;
/** low rates bring more leads (and vice versa): chance += (baseline − rate) × this */
export const RATE_LEAD_SENSITIVITY = 0.04;
export const LEAD_CHANCE_MIN = 0.25;
export const LEAD_CHANCE_MAX = 0.9;

/** GDD §8/§10 — reputation & reward tuning */
export const REPUTATION_PER_COMPLETION = 1;
export const GEMS_PER_LEVEL_UP = 2;
export const GEMS_PER_BADGE = 1;
export const XP_PER_BADGE = 100;
export const GEMS_FIVE_STAR_DAY = 1;
export const RESEARCH_FIRST_PRODUCT = 5; // first Conventional/FHA/VA completion each

/**
 * GDD §10 — XP needed to REACH each level (index = level); titles in LEVEL_TITLES.
 * The ladder extends past the six named titles (playtest 2026-07-06: quizzes
 * every 5 levels, new challenges at 10 and 20): after level 6 each level costs
 * 1,000 XP more than the last, growing by 200 per step.
 */
export const MAX_PLAYER_LEVEL = 30;
export const LEVEL_XP_THRESHOLDS: readonly number[] = (() => {
  const thresholds = [0, 0, 200, 500, 900, 1_500, 2_500];
  for (let level = 7; level <= MAX_PLAYER_LEVEL; level++) {
    thresholds[level] = (thresholds[level - 1] ?? 0) + 1_000 + (level - 7) * 200;
  }
  return thresholds;
})();

/* ── Knowledge rewards & escalating challenges (playtest 2026-07-06) ── */

/** Reading a Learning Center term for the first time pays a little XP. */
export const XP_PER_TERM_LEARNED = 10;
/** Every Nth level triggers a multiple-choice mortgage quiz. */
export const QUIZ_EVERY_LEVELS = 5;
export const QUIZ_XP = 150;
export const QUIZ_OPTION_COUNT = 4;
/** Leads scale with your career: extra daily lead chance per level past 1. */
export const LEAD_CHANCE_PER_LEVEL = 0.03;
/** Extra active-loan headroom per 2 player levels (volume grows with skill). */
export const LOAN_CAP_PER_2_LEVELS = 1;
/** From this level, underwriting may bounce a loan back once for a missing document. */
export const REDO_CHALLENGE_LEVEL = 10;
export const UNDERWRITING_REDO_CHANCE = 0.25;
export const REDO_HAPPINESS_COST = 5;
/** From this level, a thoroughly unhappy customer will walk away. */
export const WALKAWAY_CHALLENGE_LEVEL = 20;
export const WALKAWAY_HAPPINESS = 15;
export const WALKAWAY_REPUTATION_COST = 2;

/** GDD §10 — achievement triggers */
export const RAINMAKER_REVENUE = 50_000; // in one day
export const DEAL_STREAK_COUNT = 3; // closings in one hour
export const HAPPY_CUSTOMER_MIN = 95; // happiness at closing

/* ── M7: Upgrades (GDD §7) ────────────────────────────────────────── */

export const UPGRADES_SCREEN_LEVEL = 3; // Branch Manager unlocks the screen (GDD §10)
export const UPGRADES_TIER45_LEVEL = 5; // Regional Director unlocks Tiers 4–5

/** Effect rates per purchased tier in each category (GDD §7 effect mapping) */
export const TRAINING_GAIN_BONUS_PER_TIER = 0.2; // training sessions teach 20% more per tier
export const TRAINING_CAP_BONUS_PER_TIER = 0.1; // skill cap headroom
export const TECH_SPEED_BONUS_PER_TIER = 0.05; // stage processing speed
export const MARKETING_LEAD_BONUS_PER_TIER = 0.05; // lead chance
export const MARKETING_REPUTATION_PER_PURCHASE = 2; // instant on purchase
export const CX_TRUST_BONUS_PER_TIER = 0.05; // extra trust per Contact
/** Office upgrade tiers unlock nicer rooms (Talia's staged art): 0–1 → 1, 2–3 → 2, 4–5 → 3. */
export const OFFICE_ART_STAGES = 3;
export const CX_HAPPINESS_BONUS_PER_2_TIERS = 1; // extra happiness per stage advance
export const OFFICE_MORALE_BONUS_PER_2_TIERS = 1; // extra daily employee recovery

/* ── M8: World Map & Tutorial (GDD §9/§11) ────────────────────────── */

export const MAP_SCREEN_LEVEL = 4; // CEO unlocks the World Map (GDD §10, §13 decision 13)
export const SCOUTING_COST = 500; // GDD §9 — "cheap information purchase"
export const BRANCH_LEAD_BONUS = 0.08; // extra daily lead chance per open branch
export const BRANCH_LOAN_CAP_BONUS = 2; // extra active-loan headroom per branch

/** GDD §13 decision 11 — tutorial completion rewards */
export const TUTORIAL_XP = 100;
export const TUTORIAL_RESEARCH = 5;

/*
 * M8 balancing pass (reviewed 2026-07-06): starting runway is ~21 days of
 * payroll ($563/day vs $12,000 coins) against ~$3,850 per closed loan every
 * 3–4 days — tight but fair, per the M7 acceptance. Doc cadences, XP curve
 * (Level 4 ≈ 8–9 loans), and upgrade costs were reviewed and left as-is;
 * the only new levers are the branch bonuses above.
 */

/* ── Office disruptions (GDD §6 negative events; playtest request 2026-07-06) ── */

/** The honeymoon: no mishaps before this day. */
export const DISRUPTION_START_DAY = 6;
/** Per-morning chance once disruptions begin, before the level scaling. */
export const DISRUPTION_BASE_CHANCE = 0.1;
/** Success breeds chaos — each player level past 1 adds this much chance. */
export const DISRUPTION_CHANCE_PER_LEVEL = 0.03;
export const DISRUPTION_CHANCE_MAX = 0.25;
/** systemUpdate: everyone works at this fraction of normal speed. */
export const SYSTEM_UPDATE_SPEED_FACTOR = 0.5;
/** coffeeOut: instant morale hit to the whole team. */
export const COFFEE_OUT_HAPPINESS_HIT = 4;

/** New-game starting values (GDD §8 HUD examples; coins are a tunable) */
export const STARTING_COINS = 12_000;
export const STARTING_REPUTATION = 50;
export const STARTING_INTEREST_RATE = 6.4;

/** GDD §10 — day star rating; placeholder formula until M7: base + completions, clamped 1–5 */
export const STAR_RATING_BASE = 2;

/**
 * TDD §4 — real-time pacing: one in-game hour every 10 seconds at 1× speed
 * (playtest tuning: 6 s felt rushed; 2×/3× remain the fast options).
 */
export const REAL_MS_PER_HOUR = 10_000;

/** GDD §10 — player level = career title */
export const LEVEL_TITLES: Record<number, string> = {
  1: 'Loan Officer',
  2: 'Senior Loan Officer',
  3: 'Branch Manager',
  4: 'CEO',
  5: 'Regional Director',
  6: 'Mortgage Mogul',
};

export function titleForLevel(level: number): string {
  return LEVEL_TITLES[Math.min(level, 6)] ?? 'Loan Officer';
}

/**
 * GDD §3 v2 — the full journey as shown in glossary "Where you are" trackers
 * and the Customer screen. Sub-steps map onto their containing board stage.
 */
export const JOURNEY_DISPLAY: readonly { label: string; stage: LoanStage }[] = [
  { label: 'Lead', stage: 'lead' },
  { label: 'Pre-Qualification', stage: 'preQualification' },
  { label: 'Application', stage: 'application' },
  { label: 'Document Collection', stage: 'documentCollection' },
  { label: 'Processing', stage: 'processing' },
  { label: 'Appraisal', stage: 'processing' },
  { label: 'Title Review', stage: 'processing' },
  { label: 'Underwriting', stage: 'underwriting' },
  { label: 'Conditional Approval', stage: 'underwriting' },
  { label: 'Clear to Close', stage: 'clearToClose' },
  { label: 'Closing', stage: 'closing' },
  { label: 'Funding', stage: 'closing' },
  { label: 'Loan Complete', stage: 'completed' },
];
