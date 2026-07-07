import { describe, expect, it } from 'vitest';
import { parseSave } from '../../src/store/saveSystem';

/** A minimal hand-written v1 save (old stages, doc keys, loan type, reviewer role). */
function v1Save() {
  return {
    meta: { saveVersion: 1, playerName: 'Talia', officeName: 'Northpointe', createdAt: '2026-07-06' },
    clock: { day: 3, season: 'spring', weekday: 3, hour: 11 },
    currencies: { coins: 9000, gems: 0, research: 0 },
    stats: { reputation: 50, interestRate: 6.4, xp: 0, level: 1 },
    customers: {},
    loans: {
      'LN-2026-0001': {
        id: 'LN-2026-0001',
        customerId: 'cust-1',
        type: 'firstHome',
        amount: 220000,
        stage: 'review',
        daysInPipeline: 2,
        documents: {
          proofOfJob: 'collected',
          moneyInBank: 'missing',
          photoId: 'requested',
          addressHistory: 'missing',
          references: 'missing',
          taxPapers: 'collected',
          homeInspection: 'notRequired',
        },
        assignedEmployeeId: null,
        statusTag: null,
        rate: 6.4,
        termYears: 30,
        progressHours: 1,
      },
    },
    employees: {
      'emp-1': {
        id: 'emp-1',
        name: 'Priya Nair',
        role: 'reviewer',
        skill: 3,
        happiness: 80,
        workload: 10,
        salaryMonthly: 4700,
        tag: null,
      },
    },
    upgrades: {},
    neighborhoods: {},
    eventLog: [],
    achievements: {},
    dayHistory: [],
    rngSeed: 42,
  };
}

describe('save migration chain v1 → v10', () => {
  it('upgrades stages, documents, loan type, roles, and newer fields', () => {
    const migrated = parseSave(JSON.stringify(v1Save()));

    expect(migrated.meta.saveVersion).toBe(10);

    const loan = migrated.loans['LN-2026-0001'];
    expect(loan).toBeDefined();
    expect(loan?.stage).toBe('processing'); // v1 'review' maps into Processing
    expect(loan?.product).toBe('fha'); // firstHome → FHA · Purchase
    expect(loan?.purpose).toBe('purchase');
    expect((loan as unknown as Record<string, unknown>)['type']).toBeUndefined();

    expect(loan?.documents.employmentVerification).toBe('collected');
    expect(loan?.documents.bankStatements).toBe('missing');
    expect(loan?.documents.governmentId).toBe('requested');
    expect(loan?.documents.residenceHistory).toBe('missing');
    expect(loan?.documents.creditAuthorization).toBe('missing');
    expect(loan?.documents.taxReturns).toBe('collected');
    expect(loan?.documents.homeInspectionReport).toBe('notRequired');

    expect(migrated.employees['emp-1']?.role).toBe('underwriter');
    expect(migrated.glossary).toEqual({});

    // v2 → v3 additions
    expect(loan?.delayed).toBe(false);

    // v3 → v4 additions
    expect(migrated.employees['emp-1']?.level).toBe(1);

    // v4 → v5 additions
    expect(migrated.todayRevenueByHour).toHaveLength(10);
    expect(migrated.upgrades['cozyChairs']).toBe('available');
    expect(migrated.upgrades['executiveSuite']).toBe('locked');

    // v5 → v6 additions — veterans skip the tutorial
    expect(migrated.meta.tutorialDone).toBe(true);

    // v6 → v7 additions — daily XP snapshot backfilled from current XP
    expect(migrated.xpAtDayStart).toBe(0);

    // v7 → v8 (+ v10 recast) — gender-matched portrait (Priya → female pool,
    // never a retired sprite)
    expect([3, 6, 9, 10, 13, 14, 16]).toContain(migrated.employees['emp-1']?.spriteId);
  });

  it('v2 → v3 backfills the weekly-trend baseline from current happiness', () => {
    const save = v1Save() as unknown as Record<string, unknown>;
    save['customers'] = {
      'cust-1': {
        id: 'cust-1',
        name: 'Sarah Chen',
        age: 32,
        buyerTypeLabel: 'First-time Homebuyer',
        traits: ['prompt'],
        happiness: 64,
        trust: 2,
        portraitSeed: 'sarah-chen',
        dreamHome: {
          name: 'Cozy Bungalow',
          neighborhoodId: 'oldTown',
          beds: 3,
          baths: 2,
          categoryChip: 'Family Home',
          price: 240000,
          downPayment: 20000,
          monthly: 1450,
        },
      },
    };
    const migrated = parseSave(JSON.stringify(save));
    expect(migrated.customers['cust-1']?.happinessAtWeekStart).toBe(64);

    // v8 → v9 — Sarah Chen gets her borrower portrait; strangers keep the fallback
    expect(migrated.customers['cust-1']?.portraitId).toBe(1);
    expect(migrated.customers['cust-1']?.about).toBeTruthy();
  });

  it('maps every v1 loan type onto the restricted product/purpose set', () => {
    for (const [oldType, expected] of [
      ['firstHome', { product: 'fha', purpose: 'purchase' }],
      ['homePurchase', { product: 'conventional', purpose: 'purchase' }],
      ['refinance', { product: 'conventional', purpose: 'refinance' }],
      ['investment', { product: 'conventional', purpose: 'purchase' }],
    ] as const) {
      const save = v1Save();
      const loan = save.loans['LN-2026-0001'] as unknown as Record<string, unknown>;
      loan['type'] = oldType;
      const migrated = parseSave(JSON.stringify(save));
      expect(migrated.loans['LN-2026-0001']?.product).toBe(expected.product);
      expect(migrated.loans['LN-2026-0001']?.purpose).toBe(expected.purpose);
    }
  });
});
