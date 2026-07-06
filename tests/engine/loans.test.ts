import { describe, expect, it } from 'vitest';
import { REQUIRED_DOCS_BY_LOAN_TYPE } from '../../src/engine/constants';
import { initialDocuments, missingDocs, nextStage, requirementsMet } from '../../src/engine/loans';
import { createStarterState, STARTER_LOAN_ID } from '../../src/engine/content/starter';
import type { Loan } from '../../src/engine/types';

function starterLoan(): Loan {
  const loan = createStarterState().loans[STARTER_LOAN_ID];
  if (!loan) throw new Error('starter loan missing');
  return loan;
}

describe('document checklists (GDD §4)', () => {
  it('a first-home loan requires all seven papers', () => {
    const docs = initialDocuments('firstHome');
    expect(Object.values(docs).filter((s) => s === 'missing')).toHaveLength(7);
  });

  it('refinance skips some papers', () => {
    const docs = initialDocuments('refinance');
    expect(docs.addressHistory).toBe('notRequired');
    expect(docs.references).toBe('notRequired');
    expect(docs.homeInspection).toBe('notRequired');
    expect(docs.proofOfJob).toBe('missing');
    expect(REQUIRED_DOCS_BY_LOAN_TYPE.refinance.length).toBeLessThan(
      REQUIRED_DOCS_BY_LOAN_TYPE.firstHome.length,
    );
  });
});

describe('stage requirements (TDD §4a)', () => {
  it('the Papers stage blocks until every required paper is collected', () => {
    const loan = starterLoan();
    loan.stage = 'documents';
    expect(requirementsMet(loan)).toBe(false);

    for (const key of REQUIRED_DOCS_BY_LOAN_TYPE.firstHome) {
      loan.documents[key] = 'collected';
    }
    expect(missingDocs(loan)).toHaveLength(0);
    expect(requirementsMet(loan)).toBe(true);
  });

  it('other stages have no paper requirement', () => {
    const loan = starterLoan();
    loan.stage = 'review';
    expect(requirementsMet(loan)).toBe(true);
  });
});

describe('stage order (GDD §3)', () => {
  it('walks lead → completed and stops', () => {
    expect(nextStage('lead')).toBe('application');
    expect(nextStage('application')).toBe('documents');
    expect(nextStage('documents')).toBe('review');
    expect(nextStage('review')).toBe('approval');
    expect(nextStage('approval')).toBe('closing');
    expect(nextStage('closing')).toBe('completed');
    expect(nextStage('completed')).toBeNull();
  });
});
