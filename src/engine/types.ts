/**
 * Canonical data model — transcribed from TDD §3.
 * These are the contract between engine, store, and UI.
 * Extend them only by updating docs/TECHNICAL_DESIGN_DOCUMENT.md first.
 */

export type LoanStage =
  | 'lead'
  | 'application'
  | 'documents'
  | 'review'
  | 'approval'
  | 'closing'
  | 'completed';

export type LoanType = 'firstHome' | 'homePurchase' | 'refinance' | 'investment';

export type Role = 'loanOfficer' | 'processor' | 'reviewer' | 'closer';

export type DocumentKey =
  | 'proofOfJob'
  | 'moneyInBank'
  | 'photoId'
  | 'addressHistory'
  | 'references'
  | 'taxPapers'
  | 'homeInspection';

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
  trust: number; // 1–5
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
  type: LoanType;
  amount: number;
  stage: LoanStage;
  daysInPipeline: number;
  documents: Record<DocumentKey, DocStatus>;
  assignedEmployeeId: string | null;
  statusTag: string | null;
  rate: number;
  termYears: 15 | 30;
  progressHours: number; // hours accumulated toward the current stage (TDD §4c)
}

export interface Employee {
  id: string;
  name: string;
  role: Role;
  skill: number; // 1–5
  happiness: number; // 0–100
  workload: number; // 0–100
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
  revenue: number;
  xpEarned: number;
  starRating: 1 | 2 | 3 | 4 | 5;
}

export interface GameState {
  meta: {
    saveVersion: 1;
    playerName: string;
    officeName: string;
    createdAt: string;
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
    { status: 'locked' | 'available' | 'branch' | 'mainOffice'; demand: 'low' | 'med' | 'high'; leads: number }
  >;
  eventLog: GameEvent[];
  achievements: Record<string, { earned: boolean; earnedOnDay?: number }>;
  dayHistory: DaySummary[];
  rngSeed: number;
}
