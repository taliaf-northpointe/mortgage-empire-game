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
import { initialUpgradeStates } from '../upgrades';
import type { GameState } from '../types';

export const STARTER_LOAN_ID = 'LN-2026-0001';
export const STARTER_CUSTOMER_ID = 'cust-sarah-chen';

export function createStarterState(rngSeed = 42): GameState {
  return {
    meta: {
      saveVersion: 11,
      playerName: 'You',
      officeName: 'Old Town Office',
      // Fixed for determinism; the real New Game flow (M2) stamps the actual date.
      createdAt: '2026-07-06',
      tutorialDone: false,
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
        happinessAtWeekStart: 80,
        trust: 2,
        portraitSeed: 'sarah-chen',
        portraitId: 1,
        portraitVariant: 0,
        about:
          'Your very first customer! She has a color-coded folder of listings and a golden retriever who comes along to every showing.',
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
        // FHA Purchase — the classic first-time-homebuyer loan (GDD §3 v2)
        product: 'fha',
        purpose: 'purchase',
        amount: 220_000,
        stage: 'lead',
        daysInPipeline: 0,
        documents: initialDocuments('purchase'),
        assignedEmployeeId: null, // solo start — the founder owns everything (M9)
        statusTag: null,
        rate: STARTING_INTEREST_RATE,
        termYears: 30,
        progressHours: 0,
        delayed: false,
      },
    },
    // M9 (playtest 2026-07-06 #3): it's YOUR company — you start alone.
    // Every stage is worked by hand until you hire the role that automates it.
    employees: {},
    upgrades: initialUpgradeStates(),
    neighborhoods: {
      oldTown: { status: 'mainOffice', demand: 'high', leads: 3, scouted: true },
      sunnyHeights: { status: 'available', demand: 'high', leads: 8, scouted: false },
      riversideVillage: { status: 'available', demand: 'high', leads: 12, scouted: false },
      uptownHills: { status: 'locked', demand: 'med', leads: 5, scouted: false },
      eastRidge: { status: 'locked', demand: 'low', leads: 2, scouted: false },
      greenValley: { status: 'locked', demand: 'med', leads: 7, scouted: false },
    },
    eventLog: [],
    achievements: {},
    dayHistory: [],
    todayRevenueByHour: Array.from({ length: 10 }, () => 0),
    xpAtDayStart: 0,
    glossary: {},
    memoryWall: [],
    rngSeed,
  };
}
