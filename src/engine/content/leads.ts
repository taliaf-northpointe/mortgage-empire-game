/**
 * Lead generation content + spawn logic (GDD §2 "more customers arrive",
 * GDD §4 archetypes; simple seeded daily spawn per GDD §13 decision 8).
 * Deterministic: all randomness flows through the seeded RNG.
 */
import {
  BRANCH_LEAD_BONUS,
  BRANCH_LOAN_CAP_BONUS,
  LEAD_CHANCE_MAX,
  LEAD_CHANCE_MIN,
  LEAD_SPAWN_CHANCE,
  WARM_OPENING_LOANS,
  LOAN_PRODUCT_LABEL,
  MARKETING_LEAD_BONUS_PER_TIER,
  MAX_ACTIVE_LOANS,
  RATE_LEAD_SENSITIVITY,
  STARTING_INTEREST_RATE,
} from '../constants';
import { awardAchievement } from '../economy';
import { branchCount } from '../map';
import { initialDocuments } from '../loans';
import { mulberry32 } from '../rng';
import { tiersOwned } from '../upgrades';
import type { GameEvent, GameState, LoanProduct, LoanPurpose, TraitKey } from '../types';

interface Archetype {
  /** names[0] goes with the original art; names[1+] are the re-colored repeat leads. */
  names: string[];
  portraitId: number; // public/assets/art/borrower-N.png (Talia's art; 1 = Sarah, starter only)
  age: number;
  buyerTypeLabel: string;
  about: string; // name-neutral so it fits the re-colored variants too
  traits: TraitKey[];
  product: LoanProduct;
  purpose: LoanPurpose;
  amountRange: [number, number];
  home: { name: string; beds: number; baths: number; categoryChip: string };
}

/**
 * The borrower cast (GDD §4) — one persona per portrait in Talia's art set
 * (borrower-2..14; borrower-1 is Sarah Chen, the tutorial customer). After
 * every persona has appeared once, repeats reuse the portrait with a fresh
 * name and a UI color shift (portraitVariant) so they read as new neighbors.
 */
const ARCHETYPES: Archetype[] = [
  { names: ['Fiona Brennan', 'Marisol Vega', 'Josie Calloway'], portraitId: 2, age: 31, buyerTypeLabel: 'First-time Homebuyer', about: 'Tattoo artist who just opened her own studio — now she wants a little place with good morning light.', traits: ['enthusiastic', 'chatty'], product: 'fha', purpose: 'purchase', amountRange: [200_000, 245_000], home: { name: 'Sunny Starter Cottage', beds: 2, baths: 1, categoryChip: 'Starter Home' } },
  { names: ['Diane Fairbanks', 'Carol Weston', 'Renee Delacroix'], portraitId: 3, age: 56, buyerTypeLabel: 'Downsizing Executive', about: 'Polished, punctual, and done mowing a big lawn — she wants something easy to lock up and leave.', traits: ['detailOriented', 'cautious'], product: 'conventional', purpose: 'purchase', amountRange: [260_000, 340_000], home: { name: 'Garden View Bungalow', beds: 2, baths: 1, categoryChip: 'Cozy Retreat' } },
  { names: ['Mateo Alvarez', 'Danny Kovac', 'Jamal Reed'], portraitId: 4, age: 29, buyerTypeLabel: 'First-time Homebuyer', about: 'Been saving since college and finally ready — asks great questions and answers texts in minutes.', traits: ['enthusiastic', 'prompt'], product: 'fha', purpose: 'purchase', amountRange: [195_000, 240_000], home: { name: 'Cedar Court Condo', beds: 2, baths: 1, categoryChip: 'Condo' } },
  { names: ['The Moreno Family', 'The Castillo Family', 'The Haddad Family'], portraitId: 5, age: 33, buyerTypeLabel: 'Growing Family', about: 'Two working parents and a toddler who needs a yard, like, yesterday.', traits: ['enthusiastic', 'chatty'], product: 'fha', purpose: 'purchase', amountRange: [230_000, 300_000], home: { name: 'Willow Lane Two-Story', beds: 4, baths: 2, categoryChip: 'Family Home' } },
  { names: ['Cole & Ivy Bennett', 'Nico & Wren Alder', 'Jesse & Marlow Quinn'], portraitId: 6, age: 28, buyerTypeLabel: 'First-time Homebuyers', about: 'Ink-loving couple hunting for a place with a sunny window — their cat has final approval.', traits: ['chatty', 'enthusiastic'], product: 'fha', purpose: 'purchase', amountRange: [210_000, 260_000], home: { name: 'Brick Row Townhome', beds: 3, baths: 2, categoryChip: 'Townhome' } },
  { names: ['Mei Tanaka', 'Rosa Marchetti', 'Ingrid Holm'], portraitId: 7, age: 63, buyerTypeLabel: 'Downsizing Retiree', about: 'Recently retired teacher after a quiet garden for herself and a very fluffy cat.', traits: ['cautious', 'chatty'], product: 'conventional', purpose: 'purchase', amountRange: [210_000, 280_000], home: { name: 'Porchlight Cottage', beds: 2, baths: 1, categoryChip: 'Cozy Retreat' } },
  { names: ['Dev & Anika Sharma', 'Omar & Layla Farouk', 'Tom & Priya Whitaker'], portraitId: 8, age: 31, buyerTypeLabel: 'First-time Homebuyers', about: 'Newlyweds with a shared spreadsheet for everything — including this house hunt.', traits: ['detailOriented', 'prompt'], product: 'conventional', purpose: 'purchase', amountRange: [260_000, 330_000], home: { name: 'Maple Street Colonial', beds: 4, baths: 2, categoryChip: 'Family Home' } },
  { names: ['Emily Larsen', 'Hannah Brooks', 'Sofia Lindqvist'], portraitId: 9, age: 27, buyerTypeLabel: 'First-time Homebuyer', about: 'Nurse who just signed her first full-time contract and wants a short walk to the hospital.', traits: ['enthusiastic', 'detailOriented'], product: 'fha', purpose: 'purchase', amountRange: [195_000, 235_000], home: { name: 'Rosewood Walk-Up', beds: 2, baths: 1, categoryChip: 'Condo' } },
  { names: ['Simone Bailey', 'Tasha Okonkwo', 'Vivian Marsh'], portraitId: 10, age: 34, buyerTypeLabel: 'Relocating Professional', about: 'Marketing director moving here for a promotion — she would like the keys before the quarter ends, please.', traits: ['impatient', 'detailOriented'], product: 'conventional', purpose: 'purchase', amountRange: [290_000, 380_000], home: { name: 'Lakeside Loft', beds: 2, baths: 2, categoryChip: 'City Home' } },
  { names: ['Vernon Hayes', 'Walter Simmons', 'Gregory Okafor'], portraitId: 11, age: 54, buyerTypeLabel: 'Veteran Homebuyer', about: 'Retired Army colonel using his VA benefit for the front porch he has always wanted.', traits: ['prompt', 'detailOriented'], product: 'va', purpose: 'purchase', amountRange: [250_000, 340_000], home: { name: 'Oakwood Craftsman', beds: 3, baths: 2, categoryChip: 'Family Home' } },
  { names: ['Mark & Elena Rivas', 'Paul & Dana Kowalski', 'Sam & Rita Beaumont'], portraitId: 12, age: 43, buyerTypeLabel: 'Refinancing Homeowners', about: 'Fifteen years in the same house — a lower monthly payment would go straight to the college fund.', traits: ['cautious', 'prompt'], product: 'conventional', purpose: 'refinance', amountRange: [210_000, 320_000], home: { name: 'Their Longtime Home', beds: 3, baths: 2, categoryChip: 'Refinance' } },
  { names: ['Grant & Chloe Ashford', 'Marcus & Lena Hale', 'Theo & Camille Durand'], portraitId: 13, age: 38, buyerTypeLabel: 'Move-up Buyers', about: 'Selling the starter home and stretching for the view this time.', traits: ['impatient', 'prompt'], product: 'conventional', purpose: 'purchase', amountRange: [320_000, 420_000], home: { name: 'Hilltop Modern', beds: 3, baths: 2, categoryChip: 'Move-up Home' } },
  { names: ['Ken & June Park', 'Eli & Nora Tran', 'Ben & Aiko Sato'], portraitId: 14, age: 30, buyerTypeLabel: 'First-time Homebuyers', about: 'High-school sweethearts whose corgi has strong opinions about backyards.', traits: ['enthusiastic', 'prompt'], product: 'conventional', purpose: 'purchase', amountRange: [280_000, 350_000], home: { name: 'Meadow Edge Ranch', beds: 4, baths: 3, categoryChip: 'Family Home' } },
];

/** Leads dream of homes where you have a presence (GDD §9 expansion loop). */
function neighborhoodPool(state: { neighborhoods: Record<string, { status: string }> }): string[] {
  const withPresence = Object.entries(state.neighborhoods)
    .filter(([, n]) => n.status === 'mainOffice' || n.status === 'branch')
    .map(([id]) => id);
  return withPresence.length > 0 ? withPresence : ['oldTown'];
}

/**
 * Maybe spawn one new lead for the morning (GDD §13 decision 8).
 * Mutates the (already cloned) state. Deterministic per (rngSeed, day).
 */
export function maybeSpawnLead(state: GameState): void {
  const branches = branchCount(state);
  const activeLoans = Object.values(state.loans).filter((l) => l.stage !== 'completed').length;
  if (activeLoans >= MAX_ACTIVE_LOANS + branches * BRANCH_LOAN_CAP_BONUS) return;

  // Marketing upgrades, open branches, and low interest rates bring more
  // shoppers (GDD §7/§8/§9).
  const chance = Math.min(
    LEAD_CHANCE_MAX,
    Math.max(
      LEAD_CHANCE_MIN,
      LEAD_SPAWN_CHANCE +
        MARKETING_LEAD_BONUS_PER_TIER * tiersOwned(state, 'marketing') +
        branches * BRANCH_LEAD_BONUS +
        (STARTING_INTEREST_RATE - state.stats.interestRate) * RATE_LEAD_SENSITIVITY,
    ),
  );

  const rng = mulberry32((state.rngSeed ^ (state.clock.day * 2_654_435_761)) >>> 0);
  // Warm opening (playtest 2026-07-06: "the game starts really slow") — the
  // first few mornings always bring someone new; luck only kicks in once the
  // office has a real book of business.
  const warmOpening = Object.keys(state.loans).length < WARM_OPENING_LOANS;
  if (rng.next() >= chance && !warmOpening) return;

  // Everyone gets their moment: a portrait never repeats until the whole
  // cast has walked in, then the least-seen faces return first — with the
  // next alternate name so they arrive as a new neighbor.
  const usageByPortrait = new Map<number, number>(ARCHETYPES.map((a) => [a.portraitId, 0]));
  for (const c of Object.values(state.customers)) {
    if (typeof c.portraitId === 'number' && usageByPortrait.has(c.portraitId)) {
      usageByPortrait.set(c.portraitId, (usageByPortrait.get(c.portraitId) ?? 0) + 1);
    }
  }
  const minUsage = Math.min(...usageByPortrait.values());
  const freshest = ARCHETYPES.filter((a) => usageByPortrait.get(a.portraitId) === minUsage);
  const archetype = freshest[rng.int(0, freshest.length - 1)];
  if (!archetype) return;

  const serial = Object.keys(state.loans).length + 1;
  const variant = usageByPortrait.get(archetype.portraitId) ?? 0;
  const baseName = archetype.names[0] ?? 'A Friendly Neighbor';
  const name =
    archetype.names[variant] ??
    `${archetype.names[variant % archetype.names.length] ?? baseName} ${Math.floor(variant / archetype.names.length) + 1}`;
  const customerId = `cust-${serial}-${name.toLowerCase().replace(/[^a-z]/g, '')}`;
  const loanId = `LN-2026-${String(serial).padStart(4, '0')}`;

  const amount = Math.round(rng.int(archetype.amountRange[0], archetype.amountRange[1]) / 5_000) * 5_000;
  const price = Math.round((amount * 1.1) / 5_000) * 5_000;
  const downPayment = price - amount;
  const monthly = Math.round((amount * (state.stats.interestRate / 100 / 12)) / (1 - Math.pow(1 + state.stats.interestRate / 100 / 12, -360)));

  state.customers[customerId] = {
    id: customerId,
    name,
    age: archetype.age,
    buyerTypeLabel: archetype.buyerTypeLabel,
    traits: archetype.traits,
    happiness: rng.int(70, 90),
    happinessAtWeekStart: 0,
    trust: rng.int(1, 3),
    portraitSeed: customerId,
    portraitId: archetype.portraitId,
    portraitVariant: variant,
    about: archetype.about,
    dreamHome: {
      name: archetype.home.name,
      neighborhoodId: (() => {
        const pool = neighborhoodPool(state);
        return pool[rng.int(0, pool.length - 1)] ?? 'oldTown';
      })(),
      beds: archetype.home.beds,
      baths: archetype.home.baths,
      categoryChip: archetype.home.categoryChip,
      price,
      downPayment,
      monthly,
    },
  };
  const customer = state.customers[customerId];
  if (customer) customer.happinessAtWeekStart = customer.happiness;

  state.loans[loanId] = {
    id: loanId,
    customerId,
    product: archetype.product,
    purpose: archetype.purpose,
    amount,
    stage: 'lead',
    daysInPipeline: 0,
    documents: initialDocuments(archetype.purpose),
    assignedEmployeeId: null,
    statusTag: null,
    rate: state.stats.interestRate || STARTING_INTEREST_RATE,
    termYears: 30,
    progressHours: 0,
    delayed: false,
  };

  pushLeadEvent(state, name, archetype.product);
  awardAchievement(state, 'scout'); // GDD §10 — first fresh lead
}

function pushLeadEvent(state: GameState, name: string, product: LoanProduct): void {
  const { day, hour } = state.clock;
  const n = state.eventLog.length;
  const event: GameEvent = {
    id: `evt-${day}-${hour}-${n}`,
    day,
    hour,
    category: 'customers',
    title: `New lead: ${name}!`,
    detail: `They're dreaming of a home and asking about a ${LOAN_PRODUCT_LABEL[product]} loan. Say hello!`,
  };
  state.eventLog.push(event);
}
