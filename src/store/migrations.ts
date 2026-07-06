/**
 * Save migrations (TDD §5): any change to the GameState shape requires a
 * migration entry in the same PR. Keyed by the saveVersion being upgraded
 * FROM; each migration returns data at saveVersion + 1.
 */

export const CURRENT_SAVE_VERSION = 4;

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

export const MIGRATIONS: Record<number, Migration> = {
  1: migrateV1toV2,
  2: migrateV2toV3,
  3: migrateV3toV4,
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
