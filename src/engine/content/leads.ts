/**
 * Lead generation content + spawn logic (GDD §2 "more customers arrive",
 * GDD §4 archetypes; simple seeded daily spawn per GDD §13 decision 8).
 * Deterministic: all randomness flows through the seeded RNG.
 *
 * Uniqueness rules (playtest 2026-07-06): a name or an "about" line never
 * repeats within a save — only Sarah Chen is a fixed identity. Portrait and
 * house images ARE limited, so repeats re-pair a portrait with a house it
 * hasn't lived in yet before any combination is reused.
 */
import {
  BRANCH_LEAD_BONUS,
  BRANCH_LOAN_CAP_BONUS,
  LEAD_CHANCE_MAX,
  LEAD_CHANCE_MIN,
  LEAD_CHANCE_PER_LEVEL,
  LEAD_SPAWN_CHANCE,
  LOAN_CAP_PER_2_LEVELS,
  LOAN_PRODUCT_LABEL,
  MARKETING_LEAD_BONUS_PER_TIER,
  MAX_ACTIVE_LOANS,
  RATE_LEAD_SENSITIVITY,
  STARTING_INTEREST_RATE,
  WARM_OPENING_LOANS,
} from '../constants';
import { awardAchievement } from '../economy';
import { branchCount } from '../map';
import { initialDocuments } from '../loans';
import { mulberry32 } from '../rng';
import type { Rng } from '../rng';
import { tiersOwned } from '../upgrades';
import type { GameEvent, GameState, LoanProduct, LoanPurpose, TraitKey } from '../types';

interface Archetype {
  /** Hand-written identities, used in order; the generator takes over after. */
  names: string[];
  portraitId: number; // public/assets/art/borrower-N.png (1 = Sarah, starter only)
  age: number;
  buyerTypeLabel: string;
  /** Hand-written persona lines, used in order; never repeated within a save. */
  abouts: string[];
  traits: TraitKey[];
  product: LoanProduct;
  purpose: LoanPurpose;
  amountRange: [number, number];
  home: { name: string; beds: number; baths: number; categoryChip: string };
}

/** What kind of household each portrait shows — drives generated names. */
const PORTRAIT_KIND: Record<number, 'f' | 'm' | 'couple' | 'family'> = {
  2: 'f', 3: 'f', 4: 'm', 5: 'family', 6: 'couple', 7: 'f', 8: 'couple', 9: 'f',
  10: 'f', 11: 'm', 12: 'couple', 13: 'couple', 14: 'couple', 15: 'couple',
  16: 'family', 17: 'couple',
};

/** The borrower cast (GDD §4) — one persona per portrait in Talia's art set. */
const ARCHETYPES: Archetype[] = [
  { names: ['Fiona Brennan', 'Marisol Vega', 'Josie Calloway'], portraitId: 2, age: 31, buyerTypeLabel: 'First-time Homebuyer', abouts: ['Tattoo artist who just opened her own studio — now she wants a little place with good morning light.', 'Illustrator with a growing client list and a cat who deserves a windowsill of her own.', 'She teaches pottery on weekends and wants a kitchen big enough for glazing experiments.'], traits: ['enthusiastic', 'chatty'], product: 'fha', purpose: 'purchase', amountRange: [200_000, 245_000], home: { name: 'Sunny Starter Cottage', beds: 2, baths: 1, categoryChip: 'Starter Home' } },
  { names: ['Diane Fairbanks', 'Carol Weston', 'Renee Delacroix'], portraitId: 3, age: 56, buyerTypeLabel: 'Downsizing Executive', abouts: ['Polished, punctual, and done mowing a big lawn — she wants something easy to lock up and leave.', 'Thirty years in banking taught her exactly what she wants: less house, better light, zero surprises.', 'Recently sold the big colonial; now she wants mornings on a small porch and afternoons at the airport.'], traits: ['detailOriented', 'cautious'], product: 'conventional', purpose: 'purchase', amountRange: [260_000, 340_000], home: { name: 'Garden View Bungalow', beds: 2, baths: 1, categoryChip: 'Cozy Retreat' } },
  { names: ['Mateo Alvarez', 'Danny Kovac', 'Jamal Reed'], portraitId: 4, age: 29, buyerTypeLabel: 'First-time Homebuyer', abouts: ['Been saving since college and finally ready — asks great questions and answers texts in minutes.', 'Engineer by day, woodworker by night — he needs a garage more than a guest room.', 'His lease is up in ninety days and he has decided that this time, the landlord is him.'], traits: ['enthusiastic', 'prompt'], product: 'fha', purpose: 'purchase', amountRange: [195_000, 240_000], home: { name: 'Cedar Court Condo', beds: 2, baths: 1, categoryChip: 'Condo' } },
  { names: ['The Moreno Family', 'The Castillo Family', 'The Haddad Family'], portraitId: 5, age: 33, buyerTypeLabel: 'Growing Family', abouts: ['Two working parents and a toddler who needs a yard, like, yesterday.', 'Their apartment survived the stroller era; it will not survive the tricycle era.', 'Baby number two is on the way and the spare closet is out of ideas.'], traits: ['enthusiastic', 'chatty'], product: 'fha', purpose: 'purchase', amountRange: [230_000, 300_000], home: { name: 'Willow Lane Two-Story', beds: 4, baths: 2, categoryChip: 'Family Home' } },
  { names: ['Cole & Ivy Bennett', 'Nico & Wren Alder', 'Jesse & Marlow Quinn'], portraitId: 6, age: 28, buyerTypeLabel: 'First-time Homebuyers', abouts: ['Ink-loving couple hunting for a place with a sunny window — their cat has final approval.', 'They run a record shop downtown and want walls thick enough for late-night listening.', 'Two artists, one very opinionated cat, and a shared dream of a room just for plants.'], traits: ['chatty', 'enthusiastic'], product: 'fha', purpose: 'purchase', amountRange: [210_000, 260_000], home: { name: 'Brick Row Townhome', beds: 3, baths: 2, categoryChip: 'Townhome' } },
  { names: ['Mei Tanaka', 'Rosa Marchetti', 'Ingrid Holm'], portraitId: 7, age: 63, buyerTypeLabel: 'Downsizing Retiree', abouts: ['Recently retired teacher after a quiet garden for herself and a very fluffy cat.', 'Forty years of grading papers earned her a sunroom, a kettle, and absolute peace.', 'She wants a guest room for the grandkids and a garden bed for the tomatoes.'], traits: ['cautious', 'chatty'], product: 'conventional', purpose: 'purchase', amountRange: [210_000, 280_000], home: { name: 'Porchlight Cottage', beds: 2, baths: 1, categoryChip: 'Cozy Retreat' } },
  { names: ['Dev & Anika Sharma', 'Omar & Layla Farouk', 'Tom & Priya Whitaker'], portraitId: 8, age: 31, buyerTypeLabel: 'First-time Homebuyers', abouts: ['Newlyweds with a shared spreadsheet for everything — including this house hunt.', 'They toured fourteen open houses in one weekend and rated each on a twenty-point rubric.', 'Married last spring, saving since forever, and ready for a hallway to hang wedding photos in.'], traits: ['detailOriented', 'prompt'], product: 'conventional', purpose: 'purchase', amountRange: [260_000, 330_000], home: { name: 'Maple Street Colonial', beds: 4, baths: 2, categoryChip: 'Family Home' } },
  { names: ['Emily Larsen', 'Hannah Brooks', 'Sofia Lindqvist'], portraitId: 9, age: 27, buyerTypeLabel: 'First-time Homebuyer', abouts: ['Nurse who just signed her first full-time contract and wants a short walk to the hospital.', 'Night-shift veteran with a simple wish list: blackout curtains and a quiet street.', 'She has the down payment, the plan, and a houseplant collection that needs more sills.'], traits: ['enthusiastic', 'detailOriented'], product: 'fha', purpose: 'purchase', amountRange: [195_000, 235_000], home: { name: 'Rosewood Walk-Up', beds: 2, baths: 1, categoryChip: 'Condo' } },
  { names: ['Simone Bailey', 'Tasha Okonkwo', 'Vivian Marsh'], portraitId: 10, age: 34, buyerTypeLabel: 'Relocating Professional', abouts: ['Marketing director moving here for a promotion — she would like the keys before the quarter ends, please.', 'New regional lead with a moving truck already booked and zero patience for delays.', 'She negotiated her relocation package herself; expect the same energy on closing costs.'], traits: ['impatient', 'detailOriented'], product: 'conventional', purpose: 'purchase', amountRange: [290_000, 380_000], home: { name: 'Lakeside Loft', beds: 2, baths: 2, categoryChip: 'City Home' } },
  { names: ['Vernon Hayes', 'Walter Simmons', 'Gregory Okafor'], portraitId: 11, age: 54, buyerTypeLabel: 'Veteran Homebuyer', abouts: ['Retired Army colonel using his VA benefit for the front porch he has always wanted.', 'Twenty-six years of service, three continents, and now: one rocking chair, well earned.', 'He kept every document from his service years — underwriting will love him.'], traits: ['prompt', 'detailOriented'], product: 'va', purpose: 'purchase', amountRange: [250_000, 340_000], home: { name: 'Oakwood Craftsman', beds: 3, baths: 2, categoryChip: 'Family Home' } },
  { names: ['Mark & Elena Rivas', 'Paul & Dana Kowalski', 'Sam & Rita Beaumont'], portraitId: 12, age: 43, buyerTypeLabel: 'Refinancing Homeowners', abouts: ['Fifteen years in the same house — a lower monthly payment would go straight to the college fund.', 'The kitchen remodel is done; now they want the mortgage to match the times.', 'They love their street too much to move — they just want a smarter loan on the same address.'], traits: ['cautious', 'prompt'], product: 'conventional', purpose: 'refinance', amountRange: [210_000, 320_000], home: { name: 'Their Longtime Home', beds: 3, baths: 2, categoryChip: 'Refinance' } },
  { names: ['Grant & Chloe Ashford', 'Marcus & Lena Hale', 'Theo & Camille Durand'], portraitId: 13, age: 38, buyerTypeLabel: 'Move-up Buyers', abouts: ['Selling the starter home and stretching for the view this time.', 'Two promotions later, they want a dining room that fits both sets of in-laws at once.', 'Their starter home tripled its garden beds; now the garden needs a bigger house.'], traits: ['impatient', 'prompt'], product: 'conventional', purpose: 'purchase', amountRange: [320_000, 420_000], home: { name: 'Hilltop Modern', beds: 3, baths: 2, categoryChip: 'Move-up Home' } },
  { names: ['Ken & June Park', 'Eli & Nora Tran', 'Ben & Aiko Sato'], portraitId: 14, age: 30, buyerTypeLabel: 'First-time Homebuyers', abouts: ['High-school sweethearts whose corgi has strong opinions about backyards.', 'They met in a college kitchen and want one of their own — with counter space for two cooks.', 'Board-game collectors in need of a den, a shelf wall, and a table that never gets cleared.'], traits: ['enthusiastic', 'prompt'], product: 'conventional', purpose: 'purchase', amountRange: [280_000, 350_000], home: { name: 'Meadow Edge Ranch', beds: 4, baths: 3, categoryChip: 'Family Home' } },
  { names: ['Walt & Rosemary Dunn', 'Gene & Dottie Klein', 'Harold & June Abernathy'], portraitId: 15, age: 72, buyerTypeLabel: 'Veteran Refinancers', abouts: ['Fifty years and one house between them — he served overseas, she made it home. A better rate would ease retirement.', 'Their grandkids visit every Sunday; a lighter payment means more spoiling budget.', 'They paid off the roof, the porch, and the kitchen — now the rate is the last thing left to fix.'], traits: ['cautious', 'chatty'], product: 'va', purpose: 'refinance', amountRange: [180_000, 280_000], home: { name: 'The Family Homestead', beds: 3, baths: 2, categoryChip: 'Refinance' } },
  { names: ['The Sullivan Family', 'The Ferreira Family', 'The Novak Family'], portraitId: 16, age: 41, buyerTypeLabel: 'Growing Family', abouts: ['Four people, one bathroom — the kids drew up the escape plan themselves.', 'Homework at the kitchen table has become a territory dispute; a den would broker peace.', 'Two kids, two careers, one shared calendar that simply demands a mudroom.'], traits: ['detailOriented', 'chatty'], product: 'conventional', purpose: 'purchase', amountRange: [300_000, 390_000], home: { name: 'Whitebarn Farmhouse', beds: 5, baths: 3, categoryChip: 'Family Home' } },
  { names: ['Riley & Sage Donovan', 'Beck & Aria Foster', 'Theo & Isla Whitfield'], portraitId: 17, age: 26, buyerTypeLabel: 'First-time Homebuyers', abouts: ['They budget hard, dream big, and their bearded dragon needs a warm windowsill.', 'They meal-prep, side-hustle, and track every dollar — the down payment never stood a chance.', 'Youngest buyers on your books, oldest souls in the room; they brought a binder to the first meeting.'], traits: ['enthusiastic', 'prompt'], product: 'fha', purpose: 'purchase', amountRange: [205_000, 255_000], home: { name: 'Redbrick Corner House', beds: 3, baths: 2, categoryChip: 'Starter Home' } },
];

/**
 * Every house illustration's own flavor (house-N.png) — when a repeat lead is
 * paired with a new house, the dream home matches the picture, not the
 * original persona's home. Refinance customers keep their archetype's home
 * name (it is THEIR longtime house; only the illustration varies).
 */
const HOUSE_FLAVOR: Record<number, { name: string; beds: number; baths: number; categoryChip: string }> = {
  1: { name: 'Cozy Bungalow', beds: 3, baths: 2, categoryChip: 'Family Home' },
  2: { name: 'Sunny Starter Cottage', beds: 2, baths: 1, categoryChip: 'Starter Home' },
  3: { name: 'Garden View Bungalow', beds: 2, baths: 1, categoryChip: 'Cozy Retreat' },
  4: { name: 'Cedar Court Condo', beds: 2, baths: 1, categoryChip: 'Condo' },
  5: { name: 'Willow Lane Two-Story', beds: 4, baths: 2, categoryChip: 'Family Home' },
  6: { name: 'Brick Row Townhome', beds: 3, baths: 2, categoryChip: 'Townhome' },
  7: { name: 'Porchlight Cottage', beds: 2, baths: 1, categoryChip: 'Cozy Retreat' },
  8: { name: 'Maple Street Colonial', beds: 4, baths: 2, categoryChip: 'Family Home' },
  9: { name: 'Rosewood Walk-Up', beds: 2, baths: 1, categoryChip: 'Condo' },
  10: { name: 'Lakeside Loft', beds: 2, baths: 2, categoryChip: 'City Home' },
  11: { name: 'Oakwood Craftsman', beds: 3, baths: 2, categoryChip: 'Family Home' },
  12: { name: 'Sycamore Lane Home', beds: 3, baths: 2, categoryChip: 'Family Home' },
  13: { name: 'Hilltop Modern', beds: 3, baths: 2, categoryChip: 'Move-up Home' },
  14: { name: 'Meadow Edge Ranch', beds: 4, baths: 3, categoryChip: 'Family Home' },
  15: { name: 'Stonebridge Craftsman', beds: 4, baths: 3, categoryChip: 'Family Home' },
  16: { name: 'Whitebarn Farmhouse', beds: 5, baths: 3, categoryChip: 'Family Home' },
  17: { name: 'Redbrick Corner House', beds: 3, baths: 2, categoryChip: 'Starter Home' },
};
const ALL_HOUSE_IDS = Object.keys(HOUSE_FLAVOR).map(Number);

/* ── Generated identities (used once the hand-written ones run out) ── */

const FEMALE_FIRSTS = ['Nora', 'Camila', 'Ruth', 'Bianca', 'Greta', 'Yuki', 'Amara', 'Celeste', 'Paige', 'Rosalind', 'Tessa', 'Imani', 'Freya', 'Delia', 'Marnie', 'Solene', 'Petra', 'June', 'Odette', 'Kira'];
const MALE_FIRSTS = ['Abel', 'Bruno', 'Cyrus', 'Dorian', 'Elliott', 'Felix', 'Gideon', 'Hugo', 'Ivan', 'Jonas', 'Kofi', 'Lionel', 'Miles', 'Nolan', 'Otto', 'Pierce', 'Quentin', 'Rufus', 'Silas', 'Tobias'];
const SURNAMES = ['Ashworth', 'Bloom', 'Carmichael', 'Dresden', 'Ellery', 'Fontaine', 'Grady', 'Holloway', 'Iverson', 'Jasper', 'Kimura', 'Loxley', 'Merritt', 'Navarro', 'Okada', 'Pemberton', 'Quill', 'Rosales', 'Sinclair', 'Thistlewood', 'Umber', 'Vance', 'Winslow', 'Yates'];

const GENERIC_ABOUTS = [
  'Fresh to Meadowbrook with a moving van full of hope and exactly one measuring tape.',
  'They read every homebuying book at the library — twice — and took notes both times.',
  'A friend you helped last year sent them straight to your door.',
  'They have walked this neighborhood every Sunday for a year, naming their favorite houses.',
  'Practical, warm, and armed with a list of questions in very neat handwriting.',
  'The kind of customer who brings cookies to the closing table.',
  'They saw the sunset from that street once and never stopped thinking about it.',
  'Ten years of renting taught them exactly which creaky floorboards they will not miss.',
  'Their houseplants outgrew the apartment. All forty-one of them.',
  'They know the school district stats better than the school district does.',
  'Every paycheck for five years had a line item that just said "someday."',
  'Between the two jobs and the night classes, they earned this one the long way.',
  'A quiet street, a good roof, and a mailbox with their name on it — that is the whole list.',
  'They want to host the holidays this year. All of the holidays.',
];

/** Leads dream of homes where you have a presence (GDD §9 expansion loop). */
function neighborhoodPool(state: { neighborhoods: Record<string, { status: string }> }): string[] {
  const withPresence = Object.entries(state.neighborhoods)
    .filter(([, n]) => n.status === 'mainOffice' || n.status === 'branch')
    .map(([id]) => id);
  return withPresence.length > 0 ? withPresence : ['oldTown'];
}

/** A fresh name for this portrait's kind of household — never one already in the save. */
function uniqueName(rng: Rng, kind: 'f' | 'm' | 'couple' | 'family', used: Set<string>, serial: number): string {
  for (let attempt = 0; attempt < 60; attempt++) {
    const surname = SURNAMES[rng.int(0, SURNAMES.length - 1)] ?? 'Meadow';
    const female = FEMALE_FIRSTS[rng.int(0, FEMALE_FIRSTS.length - 1)] ?? 'June';
    const male = MALE_FIRSTS[rng.int(0, MALE_FIRSTS.length - 1)] ?? 'Miles';
    const candidate =
      kind === 'family'
        ? `The ${surname} Family`
        : kind === 'couple'
          ? `${male} & ${female} ${surname}`
          : kind === 'm'
            ? `${male} ${surname}`
            : `${female} ${surname}`;
    if (!used.has(candidate)) return candidate;
  }
  // Statistically unreachable; the serial guarantees uniqueness regardless.
  return `Neighbor No. ${serial}`;
}

/** A persona line never used in this save; the name-embedded fallback is unique by construction. */
function uniqueAbout(rng: Rng, archetype: Archetype, used: Set<string>, name: string): string {
  for (const about of archetype.abouts) {
    if (!used.has(about)) return about;
  }
  const start = rng.int(0, GENERIC_ABOUTS.length - 1);
  for (let i = 0; i < GENERIC_ABOUTS.length; i++) {
    const about = GENERIC_ABOUTS[(start + i) % GENERIC_ABOUTS.length];
    if (about && !used.has(about)) return about;
  }
  return `${name} just picked Meadowbrook off the map — and chose your office first.`;
}

/**
 * Pair a repeat lead with a house their portrait hasn't lived in yet; when
 * every pairing is spent, fall back to the least-used house overall.
 */
function pickHouseId(state: GameState, rng: Rng, portraitId: number, variant: number): number {
  if (variant === 0) return portraitId; // first appearance keeps the matched pair

  const usageByHouse = new Map<number, number>(ALL_HOUSE_IDS.map((id) => [id, 0]));
  const usedByThisPortrait = new Set<number>();
  for (const c of Object.values(state.customers)) {
    const house = c.houseId ?? c.portraitId;
    if (typeof house === 'number' && usageByHouse.has(house)) {
      usageByHouse.set(house, (usageByHouse.get(house) ?? 0) + 1);
    }
    if (c.portraitId === portraitId && typeof house === 'number') usedByThisPortrait.add(house);
  }

  const fresh = ALL_HOUSE_IDS.filter((id) => !usedByThisPortrait.has(id));
  const pool = fresh.length > 0 ? fresh : ALL_HOUSE_IDS;
  let best = pool[rng.int(0, pool.length - 1)] ?? portraitId;
  let bestCount = usageByHouse.get(best) ?? 0;
  for (const id of pool) {
    const count = usageByHouse.get(id) ?? 0;
    if (count < bestCount) {
      best = id;
      bestCount = count;
    }
  }
  return best;
}

/**
 * Maybe spawn one new lead for the morning (GDD §13 decision 8).
 * Mutates the (already cloned) state. Deterministic per (rngSeed, day).
 */
export function maybeSpawnLead(state: GameState): void {
  const branches = branchCount(state);
  const activeLoans = Object.values(state.loans).filter((l) => l.stage !== 'completed').length;
  // Volume grows with your career (playtest 2026-07-06): the cap loosens
  // every two levels, and the daily chance climbs with each level.
  const loanCap =
    MAX_ACTIVE_LOANS +
    branches * BRANCH_LOAN_CAP_BONUS +
    Math.floor(state.stats.level / 2) * LOAN_CAP_PER_2_LEVELS;
  if (activeLoans >= loanCap) return;

  // Marketing upgrades, open branches, low interest rates, and a growing
  // reputation all bring more shoppers (GDD §7/§8/§9).
  const chance = Math.min(
    LEAD_CHANCE_MAX,
    Math.max(
      LEAD_CHANCE_MIN,
      LEAD_SPAWN_CHANCE +
        MARKETING_LEAD_BONUS_PER_TIER * tiersOwned(state, 'marketing') +
        branches * BRANCH_LEAD_BONUS +
        LEAD_CHANCE_PER_LEVEL * (state.stats.level - 1) +
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
  // cast has walked in, then the least-seen faces return first — as a brand
  // new person (fresh name, fresh story, different house).
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

  // Serials only ever climb — walkaways can remove loans, and a recycled id
  // would collide with history (memoryWall keeps closed loans' ids too).
  const usedSerials = [...Object.keys(state.loans), ...state.memoryWall.map((m) => m.loanId)].map(
    (id) => Number(id.split('-')[2] ?? 0) || 0,
  );
  const serial = Math.max(0, ...usedSerials) + 1;
  const variant = usageByPortrait.get(archetype.portraitId) ?? 0;

  const usedNames = new Set(Object.values(state.customers).map((c) => c.name));
  const usedAbouts = new Set(
    Object.values(state.customers).flatMap((c) => (c.about ? [c.about] : [])),
  );
  const handWritten = archetype.names[variant];
  const name =
    handWritten && !usedNames.has(handWritten)
      ? handWritten
      : uniqueName(rng, PORTRAIT_KIND[archetype.portraitId] ?? 'couple', usedNames, serial);
  const about = uniqueAbout(rng, archetype, usedAbouts, name);
  const houseId = pickHouseId(state, rng, archetype.portraitId, variant);
  // Refinancers keep their archetype's home identity — it's THEIR house;
  // purchases take the flavor of whichever house they were paired with.
  const home =
    archetype.purpose === 'refinance'
      ? archetype.home
      : (HOUSE_FLAVOR[houseId] ?? archetype.home);

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
    about,
    houseId,
    dreamHome: {
      name: home.name,
      neighborhoodId: (() => {
        const pool = neighborhoodPool(state);
        return pool[rng.int(0, pool.length - 1)] ?? 'oldTown';
      })(),
      beds: home.beds,
      baths: home.baths,
      categoryChip: home.categoryChip,
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
