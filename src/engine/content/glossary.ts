/**
 * The MortgageGlossary service (GDD §4.1, TDD §6.1) — the SINGLE source of
 * truth for every mortgage term in the game. No definition text may live
 * anywhere else. Centralizing all strings here keeps the app ready for
 * future localization and makes the term set easy to extend.
 *
 * Voice rules: knowledgeable and precise, but warm — a sharp colleague
 * explaining things clearly, never a lecture and never vague.
 */
import type { LoanStage } from '../types';

export type GlossaryCategory = 'gettingStarted' | 'documents' | 'loanProcess' | 'financialConcepts';

export interface GlossaryEntry {
  key: string;
  term: string;
  category: GlossaryCategory;
  definition: string;
  whyItMatters: string;
  /** Which pipeline stage this term lives in — drives the "Where you are" tracker. */
  whereInProcess?: LoanStage;
  funFact?: string;
  related: string[];
}

export const CATEGORY_LABEL: Record<GlossaryCategory, string> = {
  gettingStarted: 'Getting Started',
  documents: 'Documents',
  loanProcess: 'Loan Process',
  financialConcepts: 'Financial Concepts',
};

const ENTRIES: GlossaryEntry[] = [
  // ── Getting Started ────────────────────────────────────────────────
  {
    key: 'buyingAHome',
    term: 'Buying a Home',
    category: 'gettingStarted',
    definition:
      'The full journey from deciding to buy to holding the keys: setting a budget, finding the right home, securing a mortgage, and completing the closing.',
    whyItMatters:
      'Most home purchases are financed with a mortgage, so guiding people through this journey well is the heart of the work your office does.',
    funFact: 'The typical buyer searches for about eight to ten weeks before finding their home.',
    related: ['mortgageBasics', 'downPayment', 'loanTypes'],
  },
  {
    key: 'mortgageBasics',
    term: 'Mortgage Basics',
    category: 'gettingStarted',
    definition:
      'A mortgage is a loan used to purchase a home, repaid in monthly installments — part principal, part interest — over a set term, most commonly 15 or 30 years. The home itself secures the loan as collateral.',
    whyItMatters:
      'Every loan in your pipeline follows this same structure. Principal, interest, and term drive the monthly payment — and the monthly payment drives nearly every decision a buyer makes.',
    funFact: 'The word "mortgage" comes from old French — literally "death pledge." Cozier than it sounds!',
    related: ['principal', 'interestRate', 'buyingAHome'],
  },
  {
    key: 'loanTypes',
    term: 'Common Loan Types',
    category: 'gettingStarted',
    definition:
      'Conventional loans follow standard market guidelines and suit borrowers with solid credit and savings. FHA loans are government-insured and allow smaller down payments, which helps many first-time buyers qualify. VA loans serve veterans and service members, often with no down payment required.',
    whyItMatters:
      'Each program has different requirements and costs. Matching the right loan type to each borrower is one of the most valuable things a good loan office does.',
    funFact: 'FHA loans have been around since 1934, and VA loans since the GI Bill of 1944.',
    related: ['downPayment', 'pmi', 'mortgageBasics'],
  },

  // ── Documents ──────────────────────────────────────────────────────
  {
    key: 'loanApplication',
    term: 'Loan Application',
    category: 'documents',
    definition:
      "The formal document that opens the loan file: the borrower's income, assets, debts, employment, and the details of the property they intend to buy.",
    whyItMatters:
      'Every later step — the Loan Estimate, Processing, Underwriting — verifies and builds on what this application states, so accuracy here saves days down the road.',
    whereInProcess: 'application',
    funFact: 'In the U.S. this form is standardized and known in the industry by its number: the 1003.',
    related: ['loanEstimate', 'preQualification'],
  },
  {
    key: 'payStubs',
    term: 'Pay Stubs',
    category: 'documents',
    definition:
      "Recent proof of the borrower's earnings, typically covering the most recent 30 days of paychecks.",
    whyItMatters:
      'They document current, steady income — the most direct evidence that the borrower can support the proposed monthly payment.',
    whereInProcess: 'documentCollection',
    funFact: 'Pay stubs age quickly: if a loan takes long enough, the lender may ask for fresh ones.',
    related: ['employmentVerification', 'w2Forms'],
  },
  {
    key: 'w2Forms',
    term: 'W-2 Forms',
    category: 'documents',
    definition:
      'The annual tax statement an employer issues summarizing wages paid and taxes withheld for the year.',
    whyItMatters:
      'W-2s establish income history over complete years, which lets the lender confirm that recent paychecks reflect a stable pattern rather than a lucky month.',
    whereInProcess: 'documentCollection',
    funFact: 'The IRS has a whole alphabet of W forms, but the W-2 is the famous one.',
    related: ['taxReturns', 'payStubs'],
  },
  {
    key: 'taxReturns',
    term: 'Tax Returns',
    category: 'documents',
    definition: "The borrower's filed federal income tax returns, usually covering the past one to two years.",
    whyItMatters:
      'Returns give the most complete picture of income from every source — essential for self-employed borrowers, whose earnings rarely fit on a pay stub.',
    whereInProcess: 'documentCollection',
    funFact: 'Self-employed borrowers usually provide two full years of returns.',
    related: ['w2Forms', 'employmentVerification'],
  },
  {
    key: 'bankStatements',
    term: 'Bank Statements',
    category: 'documents',
    definition: "Statements covering the last few months of the borrower's checking and savings accounts.",
    whyItMatters:
      'They verify that the down payment and closing funds exist, belong to the borrower, and have a clear history — and that reserves remain after closing.',
    whereInProcess: 'documentCollection',
    funFact: 'Underwriters look for "seasoned" funds — money that has been in the account for at least 60 days.',
    related: ['downPayment', 'taxReturns'],
  },
  {
    key: 'employmentVerification',
    term: 'Employment Verification',
    category: 'documents',
    definition:
      "Direct confirmation from the borrower's employer of their position, tenure, and income.",
    whyItMatters:
      'Stable employment underpins the entire loan decision — the lender is projecting decades of payments from it.',
    whereInProcess: 'documentCollection',
    funFact: 'Many lenders re-verify employment one final time just days before closing.',
    related: ['payStubs', 'taxReturns'],
  },
  {
    key: 'governmentId',
    term: 'Government-Issued ID',
    category: 'documents',
    definition: 'An official photo identification, such as a driver license or passport.',
    whyItMatters:
      'Identity verification is a legal requirement in lending. It protects the borrower, the seller, and the lender from fraud.',
    whereInProcess: 'documentCollection',
    funFact: 'The notary checks it again at the closing table before any signature counts.',
    related: ['creditAuthorization'],
  },
  {
    key: 'residenceHistory',
    term: 'Residence History',
    category: 'documents',
    definition: 'A record of where the borrower has lived, typically covering the past two years.',
    whyItMatters:
      'It corroborates identity, supports the credit review, and — for renters — documents a history of on-time housing payments.',
    whereInProcess: 'documentCollection',
    funFact: 'Two years is the standard lookback — the same window lenders use for jobs and income.',
    related: ['governmentId'],
  },
  {
    key: 'creditAuthorization',
    term: 'Credit Report Authorization',
    category: 'documents',
    definition: "The borrower's written permission for the lender to obtain their credit report.",
    whyItMatters:
      'Credit history is a key predictor of repayment, and federal law requires consent before a lender may review it.',
    whereInProcess: 'documentCollection',
    funFact: 'Mortgage credit pulls use special scoring models — the score can differ from a free credit app.',
    related: ['dti', 'underwriting'],
  },
  {
    key: 'homeInspectionReport',
    term: 'Home Inspection Report',
    category: 'documents',
    definition:
      "A professional inspector's written assessment of the home's condition — structure, roof, plumbing, electrical, and major systems.",
    whyItMatters:
      'It surfaces repair issues before the purchase is final, giving the buyer the chance to negotiate or walk away informed.',
    whereInProcess: 'documentCollection',
    funFact: 'An inspection is for the buyer; an Appraisal is for the lender. Different jobs, often confused!',
    related: ['appraisal'],
  },
  {
    key: 'loanEstimate',
    term: 'Loan Estimate',
    category: 'documents',
    definition:
      'A standardized three-page disclosure the lender provides after application, detailing the interest rate, projected monthly payment, and estimated closing costs.',
    whyItMatters:
      'Because every lender must use the identical format, borrowers can compare competing offers line by line before committing.',
    whereInProcess: 'application',
    funFact: 'Lenders must send it within three business days of the application.',
    related: ['closingDisclosure', 'closingCosts', 'interestRate'],
  },
  {
    key: 'closingDisclosure',
    term: 'Closing Disclosure',
    category: 'documents',
    definition:
      'The final statement of the loan terms and closing costs, delivered before the closing meeting.',
    whyItMatters:
      'Borrowers receive a guaranteed three-day window to review it against their Loan Estimate, so nothing at the signing table comes as a surprise.',
    whereInProcess: 'clearToClose',
    funFact: 'The three-day review rule is federal law, born from the 2015 "Know Before You Owe" reforms.',
    related: ['loanEstimate', 'closing', 'closingCosts'],
  },

  // ── Loan Process ───────────────────────────────────────────────────
  {
    key: 'preQualification',
    term: 'Pre-Qualification',
    category: 'loanProcess',
    definition:
      'An early, informal estimate of how much a buyer could likely borrow, based on the income and debt figures they report.',
    whyItMatters:
      'It anchors the home search to a realistic price range from day one, before anyone falls in love with a home outside their budget.',
    whereInProcess: 'preQualification',
    funFact: 'Pre-approval — its stronger cousin — adds a credit check and carries more weight with sellers.',
    related: ['loanApplication', 'dti'],
  },
  {
    key: 'processing',
    term: 'Processing',
    category: 'loanProcess',
    definition:
      'The stage where a Processor assembles and verifies the complete loan file — ordering the Appraisal and Title Review, confirming documents, and resolving gaps.',
    whyItMatters:
      'Underwriting can only judge what the file shows. A complete, well-organized file moves through approval quickly; an incomplete one gets sent back with questions.',
    whereInProcess: 'processing',
    funFact: 'Experienced processors juggle dozens of active files — meticulous checklists are their superpower.',
    related: ['appraisal', 'titleReview', 'underwriting'],
  },
  {
    key: 'appraisal',
    term: 'Appraisal',
    category: 'loanProcess',
    definition:
      "A licensed appraiser's independent, professional opinion of the home's market value, based on its condition and comparable recent sales.",
    whyItMatters:
      'The appraised value caps what the lender will lend. If it comes in below the purchase price, the buyer and seller must bridge the gap before the loan can proceed.',
    whereInProcess: 'processing',
    funFact: 'The appraiser works for the lender, not the buyer — even though the buyer usually pays for it.',
    related: ['ltv', 'homeInspectionReport', 'processing'],
  },
  {
    key: 'titleReview',
    term: 'Title Review',
    category: 'loanProcess',
    definition:
      'A search of public records to confirm the seller legally owns the property and that no liens, claims, or disputes cloud the ownership.',
    whyItMatters:
      'It guarantees the buyer receives clean, undisputed ownership — protection against claims that could surface years after the purchase.',
    whereInProcess: 'processing',
    funFact: 'A title search can reach back through decades of ownership records for a single home.',
    related: ['closing', 'processing'],
  },
  {
    key: 'underwriting',
    term: 'Underwriting',
    category: 'loanProcess',
    definition:
      "The lender's formal risk review: an underwriter evaluates the borrower's credit, income, assets, and the property itself against lending guidelines to decide whether the loan can be approved.",
    whyItMatters:
      'This is the decision point of the entire process. It confirms the borrower can genuinely afford the loan and that the property supports it.',
    whereInProcess: 'underwriting',
    funFact:
      'Most borrowers never speak directly with an underwriter, even though this is one of the most important steps in the process.',
    related: ['conditionalApproval', 'dti', 'creditAuthorization'],
  },
  {
    key: 'conditionalApproval',
    term: 'Conditional Approval',
    category: 'loanProcess',
    definition:
      'An approval from Underwriting that becomes final once a short list of remaining conditions is satisfied.',
    whyItMatters:
      'It signals the loan is fundamentally sound — what remains is confirmation work, not open questions about whether the loan will happen.',
    whereInProcess: 'underwriting',
    funFact: 'Typical conditions are simple: an updated pay stub, a letter explaining a deposit, or a missing signature.',
    related: ['underwriting', 'clearToClose'],
  },
  {
    key: 'clearToClose',
    term: 'Clear to Close',
    category: 'loanProcess',
    definition:
      'The lender\'s confirmation that every condition has been satisfied and the closing may be scheduled.',
    whyItMatters:
      'This is the moment the approval becomes definite. From here, the remaining work is scheduling and signatures.',
    whereInProcess: 'clearToClose',
    funFact: 'Loan teams often celebrate "CTC day" as much as closing day itself.',
    related: ['closingDisclosure', 'closing'],
  },
  {
    key: 'closing',
    term: 'Closing',
    category: 'loanProcess',
    definition:
      'The final meeting where the borrower signs the loan documents, pays the down payment and closing costs, and the sale is executed.',
    whyItMatters:
      'It is the legal completion of the purchase — after closing and funding, ownership officially transfers to the buyer.',
    whereInProcess: 'closing',
    funFact: 'The stack of closing paperwork often tops 100 pages. Bring a good pen.',
    related: ['funding', 'closingCosts', 'closingDisclosure'],
  },
  {
    key: 'funding',
    term: 'Funding',
    category: 'loanProcess',
    definition:
      'The step where the lender disburses the loan money and the transfer of ownership is recorded.',
    whyItMatters:
      'Signatures make the deal official, but funding makes it real — the keys change hands when the money moves.',
    whereInProcess: 'closing',
    funFact: 'A "dry closing" is the rare case where signing happens a little before the money moves.',
    related: ['closing', 'loanServicing'],
  },
  {
    key: 'loanServicing',
    term: 'Loan Servicing',
    category: 'loanProcess',
    definition:
      'The long-term management of the loan after closing: collecting monthly payments, maintaining the Escrow account, and supporting the homeowner for the life of the loan.',
    whyItMatters:
      'A mortgage is a relationship measured in decades. Good servicing sustains the trust you built — and provides your office steady, recurring income.',
    whereInProcess: 'completed',
    funFact: 'Loans are often serviced by a different company than the one that made them — normal, and closely regulated.',
    related: ['escrow', 'funding'],
  },

  // ── Financial Concepts ─────────────────────────────────────────────
  {
    key: 'downPayment',
    term: 'Down Payment',
    category: 'financialConcepts',
    definition:
      "The portion of the purchase price the buyer pays up front from their own funds, with the mortgage covering the remainder.",
    whyItMatters:
      'A larger down payment means a smaller loan, a lower monthly payment, less interest paid over time — and often a better rate.',
    funFact: "The classic advice is 20% down — but the median first-time buyer puts down far less.",
    related: ['ltv', 'pmi', 'bankStatements'],
  },
  {
    key: 'interestRate',
    term: 'Interest Rate',
    category: 'financialConcepts',
    definition:
      'The cost of borrowing, expressed as an annual percentage of the outstanding loan balance.',
    whyItMatters:
      'Small differences compound over a 30-year term: even half a percentage point meaningfully changes both the monthly payment and the total interest paid.',
    whereInProcess: 'application',
    funFact: 'Rates move daily with the bond market — which is why quotes come with a "lock."',
    related: ['principal', 'loanEstimate'],
  },
  {
    key: 'principal',
    term: 'Principal',
    category: 'financialConcepts',
    definition: 'The amount borrowed — the loan balance itself, separate from the interest charged on it.',
    whyItMatters:
      'Each monthly payment splits between principal and interest. The principal portion builds the homeowner\'s equity; the interest portion is the cost of borrowing.',
    funFact: 'Early payments are mostly interest; the principal share grows every month — that\'s amortization.',
    related: ['interestRate', 'mortgageBasics'],
  },
  {
    key: 'escrow',
    term: 'Escrow',
    category: 'financialConcepts',
    definition:
      'An account managed by the loan servicer that collects a portion of each monthly payment to cover property taxes and homeowners insurance when those bills come due.',
    whyItMatters:
      'It converts large, irregular annual bills into a predictable monthly amount — protecting both the homeowner and the lender from missed payments.',
    whereInProcess: 'completed',
    funFact: 'The word once meant a scroll held by a third party until a deal was done.',
    related: ['loanServicing', 'closingCosts'],
  },
  {
    key: 'dti',
    term: 'Debt-to-Income Ratio (DTI)',
    category: 'financialConcepts',
    definition:
      "The percentage of a borrower's gross monthly income committed to debt payments, including the proposed mortgage.",
    whyItMatters:
      'It is one of the most heavily weighted factors in Underwriting, because it directly measures whether the payment fits the borrower\'s actual budget.',
    whereInProcess: 'underwriting',
    funFact: 'Many loan programs look for a DTI at or below about 43%.',
    related: ['underwriting', 'preQualification'],
  },
  {
    key: 'ltv',
    term: 'Loan-to-Value Ratio (LTV)',
    category: 'financialConcepts',
    definition:
      "The loan amount as a percentage of the home's appraised value — a $180,000 loan on a $200,000 home is a 90% LTV.",
    whyItMatters:
      'LTV is how lenders measure their exposure: a lower ratio means more borrower equity, less lender risk, and typically better loan terms.',
    whereInProcess: 'processing',
    funFact: 'An 80% LTV is the classic line — cross above it and PMI usually enters the picture.',
    related: ['appraisal', 'downPayment', 'pmi'],
  },
  {
    key: 'closingCosts',
    term: 'Closing Costs',
    category: 'financialConcepts',
    definition:
      'The fees due at closing — lender charges, title work, appraisal, taxes, and prepaid items — typically totaling 2–5% of the loan amount.',
    whyItMatters:
      'Buyers need these funds in addition to the down payment. The Loan Estimate previews them early so there are no surprises at the table.',
    whereInProcess: 'closing',
    funFact: 'Some of these fees are negotiable — savvy buyers shop the title work and ask sellers for credits.',
    related: ['loanEstimate', 'closingDisclosure', 'closing'],
  },
  {
    key: 'pmi',
    term: 'Private Mortgage Insurance (PMI)',
    category: 'financialConcepts',
    definition:
      'Insurance required on conventional loans with less than 20% down. The borrower pays the premium, but the coverage protects the lender.',
    whyItMatters:
      'PMI adds to the monthly payment, which is why the 20% threshold is so well known — reaching it removes the cost entirely.',
    funFact: 'PMI ends automatically once the balance reaches 78% of the original home value.',
    related: ['downPayment', 'ltv', 'loanTypes'],
  },
];

export const GLOSSARY: Record<string, GlossaryEntry> = Object.fromEntries(
  ENTRIES.map((entry) => [entry.key, entry]),
);

export const ALL_TERM_KEYS: readonly string[] = ENTRIES.map((entry) => entry.key);

export function getEntry(key: string): GlossaryEntry | undefined {
  return GLOSSARY[key];
}

export function entriesByCategory(category: GlossaryCategory): GlossaryEntry[] {
  return ENTRIES.filter((entry) => entry.category === category);
}

/** Which glossary entry a Pipeline column header links to (GDD §4.1). */
export const STAGE_GLOSSARY_KEY: Partial<Record<LoanStage, string>> = {
  preQualification: 'preQualification',
  application: 'loanApplication',
  processing: 'processing',
  underwriting: 'underwriting',
  clearToClose: 'clearToClose',
  closing: 'closing',
  completed: 'loanServicing',
};
