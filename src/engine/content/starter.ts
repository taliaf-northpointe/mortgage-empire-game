/**
 * Data-only starter content (TDD §2.1 — engine/content is data, not logic).
 * M1: the hardcoded first customer, her loan, and a minimal starter team so
 * every pipeline stage has an owner. M2's New Game flow builds on this.
 */
import {
  STARTING_COINS,
  STARTING_INTEREST_RATE,
  STARTING_REPUTATION,
} from '../constants';
import { initialDocuments } from '../loans';
import type { GameState } from '../types';

export const STARTER_LOAN_ID = 'LN-2026-0001';
export const STARTER_CUSTOMER_ID = 'cust-sarah-chen';

export function createStarterState(rngSeed = 42): GameState {
  return {
    meta: {
      saveVersion: 1,
      playerName: 'You',
      officeName: 'Old Town Office',
      // Fixed for determinism; the real New Game flow (M2) stamps the actual date.
      createdAt: '2026-07-06',
    },
    clock: { day: 1, season: 'spring', weekday: 1, hour: 9 },
    currencies: { coins: STARTING_COINS, gems: 0, research: 0 },
    stats: { reputation: STARTING_REPUTATION, interestRate: STARTING_INTEREST_RATE, xp: 0, level: 1 },
    customers: {
      [STARTER_CUSTOMER_ID]: {
        id: STARTER_CUSTOMER_ID,
        name: 'Sarah Chen',
        age: 32,
        buyerTypeLabel: 'First-time Homebuyer',
        traits: ['enthusiastic', 'detailOriented', 'prompt'],
        happiness: 80,
        trust: 2,
        portraitSeed: 'sarah-chen',
        dreamHome: {
          name: 'Cozy Bungalow',
          neighborhoodId: 'oldTown',
          beds: 3,
          baths: 2,
          categoryChip: 'Family Home',
          price: 240_000,
          downPayment: 20_000,
          monthly: 1_450,
        },
      },
    },
    loans: {
      [STARTER_LOAN_ID]: {
        id: STARTER_LOAN_ID,
        customerId: STARTER_CUSTOMER_ID,
        type: 'firstHome',
        amount: 220_000,
        stage: 'lead',
        daysInPipeline: 0,
        documents: initialDocuments('firstHome'),
        assignedEmployeeId: 'emp-loan-officer-1',
        statusTag: null,
        rate: STARTING_INTEREST_RATE,
        termYears: 30,
        progressHours: 0,
      },
    },
    employees: {
      'emp-loan-officer-1': {
        id: 'emp-loan-officer-1',
        name: 'Marcus Webb',
        role: 'loanOfficer',
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
        skill: 2,
        happiness: 90,
        workload: 20,
        salaryMonthly: 3_600,
        tag: null,
      },
      'emp-reviewer-1': {
        id: 'emp-reviewer-1',
        name: 'Priya Nair',
        role: 'reviewer',
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
        skill: 3,
        happiness: 85,
        workload: 10,
        salaryMonthly: 4_200,
        tag: null,
      },
    },
    upgrades: {},
    neighborhoods: {
      oldTown: { status: 'mainOffice', demand: 'high', leads: 3 },
      sunnyHeights: { status: 'available', demand: 'high', leads: 8 },
      riversideVillage: { status: 'available', demand: 'high', leads: 12 },
      uptownHills: { status: 'locked', demand: 'med', leads: 0 },
      eastRidge: { status: 'locked', demand: 'low', leads: 0 },
      greenValley: { status: 'locked', demand: 'med', leads: 0 },
    },
    eventLog: [],
    achievements: {},
    dayHistory: [],
    rngSeed,
  };
}
