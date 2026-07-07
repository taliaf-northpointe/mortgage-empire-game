/**
 * Canonical data model — transcribed from TDD §3 (v2, terminology pivot).
 * These are the contract between engine, store, and UI.
 * Extend them only by updating docs/TECHNICAL_DESIGN_DOCUMENT.md first.
 */

export type LoanStage =
  | 'lead'
  | 'preQualification'
  | 'application'
  | 'documentCollection'
  | 'processing'
  | 'underwriting'
  | 'clearToClose'
  | 'closing'
  | 'completed';

export type LoanProduct = 'conventional' | 'fha' | 'va';
export type LoanPurpose = 'purchase' | 'refinance';

export type Role = 'loanOfficer' | 'processor' | 'underwriter' | 'closer';

export type DocumentKey =
  | 'employmentVerification'
  | 'bankStatements'
  | 'governmentId'
  | 'residenceHistory'
  | 'creditAuthorization'
  | 'taxReturns'
  | 'homeInspectionReport';

export type DocStatus = 'notRequired' | 'missing' | 'requested' | 'collected';

export type TraitKey =
  | 'enthusiastic'
  | 'detailOriented'
  | 'prompt'
  | 'impatient'
  | 'cautious'
  | 'chatty';

export type Season = 'spring' | 'summer' | 'fall' | 'winter';

export interface Customer {
  id: string;
  name: string;
  age: number;
  buyerTypeLabel: string;
  traits: TraitKey[];
  happiness: number; // 0–100
  happinessAtWeekStart: number; // baseline for the "↑ 8 this week" trend chip (M5)
  trust: number; // 1–5 (fractional internally, bars in UI)
  portraitSeed: string;
  dreamHome: {
    name: string;
    neighborhoodId: string;
    beds: number;
    baths: number;
    categoryChip: string;
    price: number;
    downPayment: number;
    monthly: number;
  };
}

export interface Loan {
  id: string; // "LN-2026-0001"
  customerId: string;
  product: LoanProduct; // Conventional | FHA | VA (GDD §3 v2)
  purpose: LoanPurpose; // Purchase | Refinance only (GDD §3 v2)
  amount: number;
  stage: LoanStage;
  daysInPipeline: number;
  documents: Record<DocumentKey, DocStatus>;
  assignedEmployeeId: string | null;
  statusTag: string | null;
  rate: number;
  termYears: 15 | 30;
  progressHours: number; // hours accumulated toward the current stage (TDD §4c)
  delayed: boolean; // GDD §4 action 4 — set aside; no work happens, happiness decays daily
}

export interface Employee {
  id: string;
  name: string;
  role: Role;
  spriteId: number; // 1–8, gender-matched to the name, unique while sprites last (v8)
  level: number; // 1–3; promotion raises it — skill cap = 2.5 + level (M6)
  skill: number; // 1–5 (fractional internally, stars in UI), capped by level
  happiness: number; // 0–100
  workload: number; // 0–100, derived each tick from assigned loans
  salaryMonthly: number;
  tag: 'star' | 'readyToPromote' | 'overworked' | 'needsBreak' | null;
}

export interface GameEvent {
  id: string; // deterministic: "evt-<day>-<hour>-<n>"
  day: number;
  hour: number;
  category: 'loans' | 'customers' | 'alerts';
  title: string;
  detail: string;
}

export interface DaySummary {
  day: number;
  loansCompleted: number;
  revenue: number; // gross coins earned during the day (fees + servicing)
  payroll: number; // charged at day end (M7)
  servicingIncome: number; // monthly trickle credited this day, if any (M7)
  xpEarned: number;
  starRating: 1 | 2 | 3 | 4 | 5;
  revenueByHour: number[]; // 10 entries, 9 AM → 6 PM (M7 End-of-Day chart)
  badgesEarned: string[]; // achievement ids earned during the day (M7)
  highlights: { title: string; detail: string }[]; // up to 6 feed events (M7)
}

/** Progressive learning state for one glossary term (GDD §4.1). */
export interface GlossaryProgress {
  unlocked: boolean; // term has appeared in gameplay UI
  learned: boolean; // player opened its tooltip or Learning Center entry
  learnedOnDay?: number;
}

export interface GameState {
  meta: {
    saveVersion: 8;
    playerName: string;
    officeName: string;
    createdAt: string;
    tutorialDone: boolean; // M8 — tutorial shows once per save
  };
  clock: { day: number; season: Season; weekday: number; hour: number };
  currencies: { coins: number; gems: number; research: number };
  stats: { reputation: number; interestRate: number; xp: number; level: number };
  customers: Record<string, Customer>;
  loans: Record<string, Loan>;
  employees: Record<string, Employee>;
  upgrades: Record<string, 'locked' | 'available' | 'purchased'>;
  neighborhoods: Record<
    string,
    {
      status: 'locked' | 'available' | 'branch' | 'mainOffice';
      demand: 'low' | 'med' | 'high';
      leads: number;
      scouted: boolean; // M8 — stats hidden until scouted (GDD §9)
    }
  >;
  eventLog: GameEvent[];
  achievements: Record<string, { earned: boolean; earnedOnDay?: number }>;
  dayHistory: DaySummary[];
  todayRevenueByHour: number[]; // 10 running totals for the current day (M7); reset at rollover
  xpAtDayStart: number; // snapshot at rollover so the summary can report XP earned today (v7)
  glossary: Record<string, GlossaryProgress>;
  rngSeed: number;
}
