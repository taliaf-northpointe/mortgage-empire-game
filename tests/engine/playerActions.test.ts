import { describe, expect, it } from 'vitest';
import {
  CLOSING_FEE_RATE,
  CONTACT_HAPPINESS_BOOST,
  REQUIRED_DOCS_BY_PURPOSE,
  STAGE_HOURS_REQUIRED,
  STAGE_ORDER,
  STARTING_COINS,
} from '../../src/engine/constants';
import { createStarterState, STARTER_CUSTOMER_ID, STARTER_LOAN_ID } from '../../src/engine/content/starter';
import { contactCustomer, moveLoanForward, requestDocument } from '../../src/engine/playerActions';
import { advanceHour } from '../../src/engine/tick';
import type { GameState } from '../../src/engine/types';

function loanOf(state: GameState) {
  const loan = state.loans[STARTER_LOAN_ID];
  if (!loan) throw new Error('starter loan missing');
  return loan;
}

/** Solo loans don't auto-advance (M9), so tests place the stage directly. */
function inDocumentCollection(state: GameState): GameState {
  const loan = state.loans[STARTER_LOAN_ID];
  if (!loan) throw new Error('starter loan missing');
  loan.stage = 'documentCollection';
  loan.progressHours = 0;
  return state;
}

describe('requestDocument', () => {
  it('marks a missing document as requested and logs an event', () => {
    const s = requestDocument(createStarterState(), STARTER_LOAN_ID, 'taxReturns');
    expect(loanOf(s).documents.taxReturns).toBe('requested');
    expect(s.eventLog.some((e) => e.category === 'customers')).toBe(true);
  });

  it('returns the same state when the document is not requestable', () => {
    const base = createStarterState();
    const collected = structuredClone(base);
    const loan = collected.loans[STARTER_LOAN_ID];
    if (!loan) throw new Error('missing loan');
    loan.documents.taxReturns = 'collected';
    expect(requestDocument(collected, STARTER_LOAN_ID, 'taxReturns')).toBe(collected);
    expect(requestDocument(base, 'LN-nope', 'taxReturns')).toBe(base);
  });

  it('a requested document arrives while unrequested ones sit (M9 solo)', () => {
    let s = inDocumentCollection(createStarterState());
    s = requestDocument(s, STARTER_LOAN_ID, 'homeInspectionReport');
    s = advanceHour(s); // Sarah is prompt and trusting — next hour it lands
    expect(loanOf(s).documents.homeInspectionReport).toBe('collected');
    expect(loanOf(s).documents.taxReturns).toBe('missing'); // never asked for
  });
});

describe('contactCustomer', () => {
  it('bumps happiness and logs an event', () => {
    const base = createStarterState();
    const before = base.customers[STARTER_CUSTOMER_ID]?.happiness ?? 0;
    const s = contactCustomer(base, STARTER_LOAN_ID);
    expect(s.customers[STARTER_CUSTOMER_ID]?.happiness).toBe(before + CONTACT_HAPPINESS_BOOST);
    expect(s.eventLog).toHaveLength(1);
  });

  it('caps happiness at 100', () => {
    const base = createStarterState();
    const customer = base.customers[STARTER_CUSTOMER_ID];
    if (!customer) throw new Error('missing customer');
    customer.happiness = 99;
    const s = contactCustomer(base, STARTER_LOAN_ID);
    expect(s.customers[STARTER_CUSTOMER_ID]?.happiness).toBe(100);
  });
});

describe('moveLoanForward', () => {
  it('advances a stage once its waiting period is served (M9)', () => {
    const base = createStarterState();
    expect(moveLoanForward(base, STARTER_LOAN_ID)).toBe(base); // hours still owed

    const ready = createStarterState();
    const loan = ready.loans[STARTER_LOAN_ID];
    if (!loan) throw new Error('missing loan');
    loan.progressHours = STAGE_HOURS_REQUIRED.lead;
    expect(loanOf(moveLoanForward(ready, STARTER_LOAN_ID)).stage).toBe('preQualification');
  });

  it('is blocked in Document Collection until every document is in', () => {
    const s = inDocumentCollection(createStarterState());

    const blocked = moveLoanForward(s, STARTER_LOAN_ID);
    expect(blocked).toBe(s); // unchanged reference — action refused

    const ready = structuredClone(s);
    const loan = ready.loans[STARTER_LOAN_ID];
    if (!loan) throw new Error('missing loan');
    for (const key of REQUIRED_DOCS_BY_PURPOSE.purchase) loan.documents[key] = 'collected';
    loan.progressHours = STAGE_HOURS_REQUIRED.documentCollection;
    expect(loanOf(moveLoanForward(ready, STARTER_LOAN_ID)).stage).toBe('processing');
  });

  it('drives a loan all the way to Complete and pays the fee', () => {
    let s = createStarterState();
    const loan = loanOf(s);
    for (const key of REQUIRED_DOCS_BY_PURPOSE.purchase) {
      loan.documents[key] = 'collected';
      loan.docApprovals = { ...loan.docApprovals, [key]: true }; // underwriting sign-off (M9)
    }

    const transitions = STAGE_ORDER.length - 1;
    for (let i = 0; i < transitions; i++) {
      // the founder serves each stage's waiting period before the click (M9)
      const current = s.loans[STARTER_LOAN_ID];
      if (current) current.progressHours = STAGE_HOURS_REQUIRED[current.stage];
      s = moveLoanForward(s, STARTER_LOAN_ID);
    }

    expect(loanOf(s).stage).toBe('completed');
    expect(loanOf(s).statusTag).toBe('Closed');
    expect(s.currencies.coins).toBe(STARTING_COINS + Math.round(loanOf(s).amount * CLOSING_FEE_RATE));

    // and it stops there
    expect(moveLoanForward(s, STARTER_LOAN_ID)).toBe(s);
  });
});
