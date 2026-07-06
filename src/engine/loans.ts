/**
 * Loan stage transitions and requirements (TDD §2.1, GDD §3–4).
 * Pure functions only — no React, no magic numbers.
 */
import { REQUIRED_DOCS_BY_LOAN_TYPE, STAGE_ORDER } from './constants';
import type { DocStatus, DocumentKey, Loan, LoanType } from './types';

const ALL_DOC_KEYS: readonly DocumentKey[] = [
  'proofOfJob',
  'moneyInBank',
  'photoId',
  'addressHistory',
  'references',
  'taxPapers',
  'homeInspection',
];

/** Build the initial document checklist for a new loan of the given type. */
export function initialDocuments(type: LoanType): Record<DocumentKey, DocStatus> {
  const required = REQUIRED_DOCS_BY_LOAN_TYPE[type];
  const documents = {} as Record<DocumentKey, DocStatus>;
  for (const key of ALL_DOC_KEYS) {
    documents[key] = required.includes(key) ? 'missing' : 'notRequired';
  }
  return documents;
}

/** Papers the customer still owes (missing or requested, and required). */
export function missingDocs(loan: Loan): DocumentKey[] {
  return ALL_DOC_KEYS.filter((key) => {
    const status = loan.documents[key];
    return status === 'missing' || status === 'requested';
  });
}

/** Stage requirements beyond progress-hours (TDD §4a). */
export function requirementsMet(loan: Loan): boolean {
  if (loan.stage === 'documents') return missingDocs(loan).length === 0;
  return true;
}

/** The stage after this one, or null if the journey is over. */
export function nextStage(stage: Loan['stage']): Loan['stage'] | null {
  const index = STAGE_ORDER.indexOf(stage);
  const next = STAGE_ORDER[index + 1];
  return next ?? null;
}
