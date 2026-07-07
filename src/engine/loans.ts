/**
 * Loan stage transitions and requirements (TDD §2.1, GDD §3–4 v2).
 * Pure functions only — no React, no magic numbers.
 */
import { REQUIRED_DOCS_BY_PURPOSE, STAGE_ORDER } from './constants';
import type { DocStatus, DocumentKey, Loan, LoanPurpose } from './types';

export const ALL_DOC_KEYS: readonly DocumentKey[] = [
  'employmentVerification',
  'bankStatements',
  'governmentId',
  'residenceHistory',
  'creditAuthorization',
  'taxReturns',
  'homeInspectionReport',
];

/** Build the initial loan-documents checklist for a new loan. */
export function initialDocuments(purpose: LoanPurpose): Record<DocumentKey, DocStatus> {
  const required = REQUIRED_DOCS_BY_PURPOSE[purpose];
  const documents = {} as Record<DocumentKey, DocStatus>;
  for (const key of ALL_DOC_KEYS) {
    documents[key] = required.includes(key) ? 'missing' : 'notRequired';
  }
  return documents;
}

/** Documents the customer still owes (missing or requested, and required). */
export function missingDocs(loan: Loan): DocumentKey[] {
  return ALL_DOC_KEYS.filter((key) => {
    const status = loan.documents[key];
    return status === 'missing' || status === 'requested';
  });
}

/** Required documents still awaiting the underwriting sign-off (M9). */
export function unapprovedDocs(loan: Loan): DocumentKey[] {
  return ALL_DOC_KEYS.filter(
    (key) => loan.documents[key] !== 'notRequired' && !loan.docApprovals?.[key],
  );
}

/** Stage requirements beyond progress-hours (TDD §4a). */
export function requirementsMet(loan: Loan): boolean {
  if (loan.stage === 'documentCollection') return missingDocs(loan).length === 0;
  // M9 — underwriting signs off on every document, by the underwriter or by you.
  if (loan.stage === 'underwriting') return unapprovedDocs(loan).length === 0;
  return true;
}

/** The stage after this one, or null if the journey is over. */
export function nextStage(stage: Loan['stage']): Loan['stage'] | null {
  const index = STAGE_ORDER.indexOf(stage);
  const next = STAGE_ORDER[index + 1];
  return next ?? null;
}
