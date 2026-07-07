import { describe, expect, it } from 'vitest';
import { REQUIRED_DOCS_BY_PURPOSE } from '../../src/engine/constants';
import { initialDocuments, missingDocs, nextStage, requirementsMet } from '../../src/engine/loans';
import { createStarterState, STARTER_LOAN_ID } from '../../src/engine/content/starter';
import type { Loan } from '../../src/engine/types';

function starterLoan(): Loan {
  const loan = createStarterState().loans[STARTER_LOAN_ID];
  if (!loan) throw new Error('starter loan missing');
  return loan;
}

describe('loan documents checklists (GDD §4 v2)', () => {
  it('a purchase loan requires all seven documents', () => {
    const docs = initialDocuments('purchase');
    expect(Object.values(docs).filter((s) => s === 'missing')).toHaveLength(7);
  });

  it('refinance skips several documents', () => {
    const docs = initialDocuments('refinance');
    expect(docs.residenceHistory).toBe('notRequired');
    expect(docs.homeInspectionReport).toBe('notRequired');
    expect(docs.employmentVerification).toBe('missing');
    expect(docs.creditAuthorization).toBe('missing');
    expect(REQUIRED_DOCS_BY_PURPOSE.refinance.length).toBeLessThan(
      REQUIRED_DOCS_BY_PURPOSE.purchase.length,
    );
  });
});

describe('stage requirements (TDD §4a)', () => {
  it('Document Collection blocks until every required document is collected', () => {
    const loan = starterLoan();
    loan.stage = 'documentCollection';
    expect(requirementsMet(loan)).toBe(false);

    for (const key of REQUIRED_DOCS_BY_PURPOSE.purchase) {
      loan.documents[key] = 'collected';
    }
    expect(missingDocs(loan)).toHaveLength(0);
    expect(requirementsMet(loan)).toBe(true);
  });

  it('Underwriting blocks until every required document is signed off (M9)', () => {
    const loan = starterLoan();
    loan.stage = 'underwriting';
    expect(requirementsMet(loan)).toBe(false); // nothing approved yet
    for (const key of REQUIRED_DOCS_BY_PURPOSE.purchase) {
      loan.docApprovals = { ...loan.docApprovals, [key]: true };
    }
    expect(requirementsMet(loan)).toBe(true);
  });

  it('stages without checklists have no document requirement', () => {
    const loan = starterLoan();
    loan.stage = 'processing';
    expect(requirementsMet(loan)).toBe(true);
  });
});

describe('stage order (GDD §3 v2)', () => {
  it('walks the nine-stage pipeline and stops', () => {
    expect(nextStage('lead')).toBe('preQualification');
    expect(nextStage('preQualification')).toBe('application');
    expect(nextStage('application')).toBe('documentCollection');
    expect(nextStage('documentCollection')).toBe('processing');
    expect(nextStage('processing')).toBe('underwriting');
    expect(nextStage('underwriting')).toBe('clearToClose');
    expect(nextStage('clearToClose')).toBe('closing');
    expect(nextStage('closing')).toBe('completed');
    expect(nextStage('completed')).toBeNull();
  });
});
