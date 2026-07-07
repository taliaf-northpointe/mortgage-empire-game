/**
 * Save migrations (TDD §5): any change to the GameState shape requires a
 * migration entry in the same PR. Keyed by the saveVersion being upgraded
 * FROM; each migration returns data at saveVersion + 1.
 */

import { genderForName, RETIRED_SPRITES, spritesForGender } from '../engine/content/characterSprites';
import { initialUpgradeStates } from '../engine/upgrades';

export const CURRENT_SAVE_VERSION = 10;

type Migration = (data: Record<string, unknown>) => Record<string, unknown>;

/** v1 → v2: the terminology pivot (GDD v2, TDD §5). */
const V1_STAGE_MAP: Record<string, string> = {
  lead: 'lead',
  application: 'application',
  documents: 'documentCollection',
  review: 'processing',
  approval: 'underwriting',
  closing: 'closing',
  completed: 'completed',
};

const V1_DOC_KEY_MAP: Record<string, string> = {
  proofOfJob: 'employmentVerification',
  moneyInBank: 'bankStatements',
  photoId: 'governmentId',
  addressHistory: 'residenceHistory',
  references: 'creditAuthorization',
  taxPapers: 'taxReturns',
  homeInspection: 'homeInspectionReport',
};

const V1_TYPE_MAP: Record<string, { product: string; purpose: string }> = {
  firstHome: { product: 'fha', purpose: 'purchase' },
  homePurchase: { product: 'conventional', purpose: 'purchase' },
  refinance: { product: 'conventional', purpose: 'refinance' },
  investment: { product: 'conventional', purpose: 'purchase' },
};

function migrateV1toV2(data: Record<string, unknown>): Record<string, unknown> {
  const next = structuredClone(data);

  const loans = (next['loans'] ?? {}) as Record<string, Record<string, unknown>>;
  for (const loan of Object.values(loans)) {
    const mapped = V1_TYPE_MAP[String(loan['type'])] ?? V1_TYPE_MAP['homePurchase'];
    loan['product'] = mapped?.product ?? 'conventional';
    loan['purpose'] = mapped?.purpose ?? 'purchase';
    delete loan['type'];

    loan['stage'] = V1_STAGE_MAP[String(loan['stage'])] ?? 'lead';

    const oldDocs = (loan['documents'] ?? {}) as Record<string, unknown>;
    const newDocs: Record<string, unknown> = {};
    for (const [oldKey, status] of Object.entries(oldDocs)) {
      newDocs[V1_DOC_KEY_MAP[oldKey] ?? oldKey] = status;
    }
    loan['documents'] = newDocs;
  }

  const employees = (next['employees'] ?? {}) as Record<string, Record<string, unknown>>;
  for (const employee of Object.values(employees)) {
    if (employee['role'] === 'reviewer') employee['role'] = 'underwriter';
  }

  next['glossary'] = next['glossary'] ?? {};

  const meta = (next['meta'] ?? {}) as Record<string, unknown>;
  meta['saveVersion'] = 2;
  next['meta'] = meta;
  return next;
}

/** v2 → v3 (M5 Customer Profile): adds Loan.delayed and Customer.happinessAtWeekStart. */
function migrateV2toV3(data: Record<string, unknown>): Record<string, unknown> {
  const next = structuredClone(data);

  const loans = (next['loans'] ?? {}) as Record<string, Record<string, unknown>>;
  for (const loan of Object.values(loans)) {
    loan['delayed'] = loan['delayed'] ?? false;
  }

  const customers = (next['customers'] ?? {}) as Record<string, Record<string, unknown>>;
  for (const customer of Object.values(customers)) {
    customer['happinessAtWeekStart'] =
      customer['happinessAtWeekStart'] ?? customer['happiness'] ?? 100;
  }

  const meta = (next['meta'] ?? {}) as Record<string, unknown>;
  meta['saveVersion'] = 3;
  next['meta'] = meta;
  return next;
}

/** v3 → v4 (M6 Employees): adds Employee.level. */
function migrateV3toV4(data: Record<string, unknown>): Record<string, unknown> {
  const next = structuredClone(data);
  const employees = (next['employees'] ?? {}) as Record<string, Record<string, unknown>>;
  for (const employee of Object.values(employees)) {
    employee['level'] = employee['level'] ?? 1;
  }
  const meta = (next['meta'] ?? {}) as Record<string, unknown>;
  meta['saveVersion'] = 4;
  next['meta'] = meta;
  return next;
}

/** v4 → v5 (M7 Economy): hourly revenue tracking, populated upgrades, extended DaySummary. */
function migrateV4toV5(data: Record<string, unknown>): Record<string, unknown> {
  const next = structuredClone(data);

  next['todayRevenueByHour'] = next['todayRevenueByHour'] ?? Array.from({ length: 10 }, () => 0);

  const upgrades = (next['upgrades'] ?? {}) as Record<string, string>;
  if (Object.keys(upgrades).length === 0) {
    next['upgrades'] = initialUpgradeStates();
  }

  const history = (next['dayHistory'] ?? []) as Record<string, unknown>[];
  for (const day of history) {
    day['payroll'] = day['payroll'] ?? 0;
    day['servicingIncome'] = day['servicingIncome'] ?? 0;
    day['revenueByHour'] = day['revenueByHour'] ?? Array.from({ length: 10 }, () => 0);
    day['badgesEarned'] = day['badgesEarned'] ?? [];
    day['highlights'] = day['highlights'] ?? [];
  }

  const meta = (next['meta'] ?? {}) as Record<string, unknown>;
  meta['saveVersion'] = 5;
  next['meta'] = meta;
  return next;
}

/** v5 → v6 (M8 Map + Tutorial): neighborhood.scouted + meta.tutorialDone. */
function migrateV5toV6(data: Record<string, unknown>): Record<string, unknown> {
  const next = structuredClone(data);

  const neighborhoods = (next['neighborhoods'] ?? {}) as Record<string, Record<string, unknown>>;
  for (const hood of Object.values(neighborhoods)) {
    hood['scouted'] = hood['scouted'] ?? hood['status'] !== 'locked';
  }

  const meta = (next['meta'] ?? {}) as Record<string, unknown>;
  meta['tutorialDone'] = meta['tutorialDone'] ?? true; // veterans skip it
  meta['saveVersion'] = 6;
  next['meta'] = meta;
  return next;
}

/** v6 → v7 (M8.1 End-of-Day fix): XP snapshot for accurate daily summaries. */
function migrateV6toV7(data: Record<string, unknown>): Record<string, unknown> {
  const next = structuredClone(data);
  const stats = (next['stats'] ?? {}) as Record<string, unknown>;
  next['xpAtDayStart'] = next['xpAtDayStart'] ?? stats['xp'] ?? 0;
  const meta = (next['meta'] ?? {}) as Record<string, unknown>;
  meta['saveVersion'] = 7;
  next['meta'] = meta;
  return next;
}

/** v7 → v8 (art sprites): gender-matched, least-used portrait per employee. */
function migrateV7toV8(data: Record<string, unknown>): Record<string, unknown> {
  const next = structuredClone(data);
  const employees = (next['employees'] ?? {}) as Record<string, Record<string, unknown>>;
  const usage = new Map<number, number>();
  for (const id of Object.keys(employees).sort()) {
    const employee = employees[id];
    if (!employee || typeof employee['spriteId'] === 'number') continue;
    const pool = spritesForGender(genderForName(String(employee['name'] ?? '')));
    let best = pool[0] ?? 1;
    let bestCount = Number.POSITIVE_INFINITY;
    for (const spriteId of pool) {
      const count = usage.get(spriteId) ?? 0;
      if (count < bestCount) {
        best = spriteId;
        bestCount = count;
      }
    }
    employee['spriteId'] = best;
    usage.set(best, (usage.get(best) ?? 0) + 1);
  }
  const meta = (next['meta'] ?? {}) as Record<string, unknown>;
  meta['saveVersion'] = 8;
  next['meta'] = meta;
  return next;
}

/**
 * v8 → v9 (borrower art): Sarah Chen — deterministic in every save — gets her
 * portrait and persona line. Other pre-v9 customers keep the drawn fallback;
 * new leads arrive with portraits from their archetype.
 */
function migrateV8toV9(data: Record<string, unknown>): Record<string, unknown> {
  const next = structuredClone(data);
  const customers = (next['customers'] ?? {}) as Record<string, Record<string, unknown>>;
  const sarah = Object.values(customers).find((c) => c && c['name'] === 'Sarah Chen');
  if (sarah && typeof sarah['portraitId'] !== 'number') {
    sarah['portraitId'] = 1;
    sarah['portraitVariant'] = 0;
    sarah['about'] =
      'Your very first customer! She has a color-coded folder of listings and a golden retriever who comes along to every showing.';
  }
  const meta = (next['meta'] ?? {}) as Record<string, unknown>;
  meta['saveVersion'] = 9;
  next['meta'] = meta;
  return next;
}

/**
 * v9 → v10 (bigger office cast): sprites 1, 2, and 8 retired. Anyone wearing
 * a retired face gets a new gender-matched one, still least-used-first so the
 * team stays distinct.
 */
function migrateV9toV10(data: Record<string, unknown>): Record<string, unknown> {
  const next = structuredClone(data);
  const employees = (next['employees'] ?? {}) as Record<string, Record<string, unknown>>;
  const usage = new Map<number, number>();
  for (const employee of Object.values(employees)) {
    const spriteId = employee?.['spriteId'];
    if (typeof spriteId === 'number' && !RETIRED_SPRITES.has(spriteId)) {
      usage.set(spriteId, (usage.get(spriteId) ?? 0) + 1);
    }
  }
  for (const id of Object.keys(employees).sort()) {
    const employee = employees[id];
    const spriteId = employee?.['spriteId'];
    if (!employee || typeof spriteId !== 'number' || !RETIRED_SPRITES.has(spriteId)) continue;
    const pool = spritesForGender(genderForName(String(employee['name'] ?? '')));
    let best = pool[0] ?? 3;
    let bestCount = Number.POSITIVE_INFINITY;
    for (const candidate of pool) {
      const count = usage.get(candidate) ?? 0;
      if (count < bestCount) {
        best = candidate;
        bestCount = count;
      }
    }
    employee['spriteId'] = best;
    usage.set(best, (usage.get(best) ?? 0) + 1);
  }
  const meta = (next['meta'] ?? {}) as Record<string, unknown>;
  meta['saveVersion'] = 10;
  next['meta'] = meta;
  return next;
}

export const MIGRATIONS: Record<number, Migration> = {
  1: migrateV1toV2,
  2: migrateV2toV3,
  3: migrateV3toV4,
  4: migrateV4toV5,
  5: migrateV5toV6,
  6: migrateV6toV7,
  7: migrateV7toV8,
  8: migrateV8toV9,
  9: migrateV9toV10,
};

export function applyMigrations(data: Record<string, unknown>): Record<string, unknown> {
  let current = data;
  let version = readVersion(current);
  while (version < CURRENT_SAVE_VERSION) {
    const migrate = MIGRATIONS[version];
    if (!migrate) {
      throw new Error(`This save is from version ${version} and we don't know how to update it.`);
    }
    current = migrate(current);
    version = readVersion(current);
  }
  return current;
}

function readVersion(data: Record<string, unknown>): number {
  const meta = data['meta'];
  if (meta && typeof meta === 'object' && 'saveVersion' in meta) {
    const v = (meta as Record<string, unknown>)['saveVersion'];
    if (typeof v === 'number') return v;
  }
  return Number.NaN;
}
