/**
 * The Wall of Homes (v11) — Talia's favorite feature: every funded loan adds
 * a scrapbook page with the family, their home, and a thank-you note. Notes
 * are keyed to the borrower portrait so each persona sounds like themselves,
 * and stay name-neutral so repeat leads (alternate names) read naturally.
 */
import type { Customer, GameState, Loan, MemoryEntry } from '../types';

/** One voice per portrait (borrower-N.png). 1 = Sarah Chen, the tutorial customer. */
const THANK_YOU_BY_PORTRAIT: Record<number, string> = {
  1: 'We did it! The bungalow is home now — my golden retriever approved the yard in about four seconds. Thank you for guiding me through every single step. 🏡',
  2: 'The morning light in my new studio is everything I hoped for. Thank you for making a first-timer feel like a pro.',
  3: 'Locked up, headed to the airport, and not a lawn to mow in sight. Impeccable work — exactly as I expected.',
  4: 'First night in the condo: pizza on a moving box, keys on the counter. Could not have done this without you!',
  5: 'The fence went up last weekend and our little one finally naps in a room of his own. Thank you from all three of us!',
  6: 'The cat claimed the sunny window within five minutes. We claim the rest. Thank you — truly.',
  7: 'The garden is planted and the kettle is on. You made this feel so gentle. Thank you, dear.',
  8: "Row 47 of our spreadsheet said 'send thank-you note.' Done — and we mean every word of it.",
  9: 'Fifteen minutes door-to-door from the hospital. After a night shift, that is everything. Thank you!',
  10: 'Keys in hand before the quarter closed, exactly as requested. I have already recommended you twice.',
  11: 'Coffee on my own front porch every morning, just like I pictured it. Thank you for honoring my service.',
  12: 'The lower payment goes straight into the college fund now. You made a real difference for our kids.',
  13: 'The view is worth every box we packed. Thanks for keeping pace with us — we never waited on you once.',
  14: 'The corgi has thoroughly inspected and approved the backyard. So do we. Thank you for everything!',
  15: 'After fifty years in this house, the new payment feels like a gift. Thank you for taking such gentle care of us.',
  16: 'Everyone has their own room now and the peace treaty is holding. Thank you from all four of us!',
  17: 'The bearded dragon claimed the warmest windowsill in town, and we claimed our first home. Thank you for believing in us!',
};

/** Fallback notes for customers from before the portrait era. */
const GENERIC_THANK_YOUS: string[] = [
  'We still can’t believe the keys are ours. Thank you for making it feel easy!',
  'You turned a mountain of paperwork into a housewarming party. Thank you!',
  'Every question answered, every step explained. We tell everyone about you.',
  'Home at last — and it feels even better than we dreamed. Thank you so much!',
];

function seedNumber(seed: string): number {
  let n = 0;
  for (const ch of seed) n = (n * 31 + ch.charCodeAt(0)) >>> 0;
  return n;
}

export function thankYouNote(customer: Pick<Customer, 'portraitId' | 'portraitSeed'>): string {
  if (customer.portraitId && THANK_YOU_BY_PORTRAIT[customer.portraitId]) {
    return THANK_YOU_BY_PORTRAIT[customer.portraitId] ?? GENERIC_THANK_YOUS[0] ?? '';
  }
  return (
    GENERIC_THANK_YOUS[seedNumber(customer.portraitSeed) % GENERIC_THANK_YOUS.length] ??
    GENERIC_THANK_YOUS[0] ??
    ''
  );
}

/** Build the scrapbook page for a loan that just funded. */
export function buildMemoryEntry(state: GameState, loan: Loan, customer: Customer): MemoryEntry {
  return {
    loanId: loan.id,
    customerName: customer.name,
    portraitId: customer.portraitId ?? null,
    portraitSeed: customer.portraitSeed,
    houseName: customer.dreamHome.name,
    neighborhoodId: customer.dreamHome.neighborhoodId,
    product: loan.product,
    purpose: loan.purpose,
    amount: loan.amount,
    closingDay: state.clock.day,
    season: state.clock.season,
    houseId: customer.houseId ?? customer.portraitId ?? null,
    note: thankYouNote(customer),
  };
}
