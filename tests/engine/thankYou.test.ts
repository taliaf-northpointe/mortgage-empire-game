import { describe, expect, it } from 'vitest';
import { ASSISTANT_THANK_YOUS_PER_MORNING } from '../../src/engine/constants';
import { createStarterState } from '../../src/engine/content/starter';
import { hireEmployee } from '../../src/engine/employees';
import { sendThankYouNote } from '../../src/engine/playerActions';
import { advanceDay } from '../../src/engine/tick';
import type { GameState, MemoryEntry } from '../../src/engine/types';

/** A funded-loan scrapbook page, hand-built for tests. */
function pageFor(loanId: string, customerName: string): MemoryEntry {
  return {
    loanId,
    customerName,
    portraitId: 1,
    portraitSeed: 'cust-sarah-chen',
    houseName: 'Cozy Bungalow',
    neighborhoodId: 'oldTown',
    product: 'fha',
    purpose: 'purchase',
    amount: 220_000,
    closingDay: 1,
    season: 'spring',
    houseId: 1,
    note: 'We did it!',
  };
}

function withWallPage(state: GameState, loanId = 'LN-2026-0001', name = 'Sarah Chen'): GameState {
  state.memoryWall.push(pageFor(loanId, name));
  return state;
}

describe('thank-you notes → referrals (playtest 2026-07-07)', () => {
  it('sending a note marks the page and brings a brand-new referral lead', () => {
    const base = withWallPage(createStarterState());
    const customersBefore = Object.keys(base.customers).length;
    const loansBefore = Object.keys(base.loans).length;

    const s = sendThankYouNote(base, 'LN-2026-0001');
    expect(s.memoryWall[0]?.thanked).toBe(true);
    expect(Object.keys(s.customers)).toHaveLength(customersBefore + 1);
    expect(Object.keys(s.loans)).toHaveLength(loansBefore + 1);
    expect(s.eventLog.some((e) => e.title.startsWith('Referral:'))).toBe(true);
    expect(s.eventLog.some((e) => e.title.includes('thank-you note'))).toBe(true);
  });

  it('one note per borrower — a second send is refused', () => {
    const once = sendThankYouNote(withWallPage(createStarterState()), 'LN-2026-0001');
    expect(sendThankYouNote(once, 'LN-2026-0001')).toBe(once);
  });

  it('no page, no note', () => {
    const s = createStarterState(); // empty wall
    expect(sendThankYouNote(s, 'LN-2026-0001')).toBe(s);
  });

  it('the referral is deterministic per save state', () => {
    const a = sendThankYouNote(withWallPage(createStarterState(7)), 'LN-2026-0001');
    const b = sendThankYouNote(withWallPage(createStarterState(7)), 'LN-2026-0001');
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});

describe('the Loan Officer Assistant (level 8) mails them for you', () => {
  function withAssistant(state: GameState): GameState {
    return hireEmployee(state, {
      name: 'Jo Marsh',
      gender: 'f',
      role: 'loanOfficerAssistant',
      skill: 2.5,
      salaryMonthly: 3_400,
      spriteId: 6,
    });
  }

  it('sends one thank-you note each morning, spawning the referral', () => {
    let s = withAssistant(createStarterState());
    withWallPage(s, 'LN-2026-0900', 'Sarah Chen');
    withWallPage(s, 'LN-2026-0901', 'The Moreno Family');

    s = advanceDay(s);
    const thanked = s.memoryWall.filter((m) => m.thanked);
    expect(thanked).toHaveLength(ASSISTANT_THANK_YOUS_PER_MORNING); // one per morning
    expect(s.eventLog.some((e) => e.title.startsWith('Referral:'))).toBe(true);
    expect(s.eventLog.some((e) => e.title.includes('sent') && e.title.includes('thank-you'))).toBe(true);

    s = advanceDay(s);
    expect(s.memoryWall.filter((m) => m.thanked)).toHaveLength(2); // the second family, next day
  });

  it('without an assistant, the notes wait for you', () => {
    let s = createStarterState();
    withWallPage(s);
    s = advanceDay(s);
    expect(s.memoryWall.some((m) => m.thanked)).toBe(false);
  });
});
