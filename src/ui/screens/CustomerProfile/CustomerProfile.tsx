import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  DOC_DISPLAY_NAME,
  DOC_FRIENDLY_SUBLABEL,
  JOURNEY_DISPLAY,
  LOAN_PRODUCT_LABEL,
  LOAN_PURPOSE_LABEL,
  NEIGHBORHOOD_DISPLAY_NAME,
  STAGE_DISPLAY_NAME,
  TRAIT_LABEL,
  TRUST_MAX,
} from '../../../engine/constants';
import { ALL_DOC_KEYS, missingDocs, nextStage } from '../../../engine/loans';
import { moveBlockedReason } from '../../../engine/playerActions';
import type { Customer, GameState, Loan } from '../../../engine/types';
import { useGameStore } from '../../../store/gameStore';
import { Button } from '../../components/Button';
import { GlossaryTerm } from '../../glossary/GlossaryTerm';
import { borrowerArtUrl, houseArtUrl } from '../../customerArt';
import { moneyFull } from '../../format';
import styles from './CustomerProfile.module.css';

interface CustomerProfileProps {
  customerId: string;
  onSelectCustomer(customerId: string): void;
  onBack(): void;
}

export function CustomerProfile({ customerId, onSelectCustomer, onBack }: CustomerProfileProps) {
  const game = useGameStore((s) => s.game);
  const requestAllDocuments = useGameStore((s) => s.requestAllDocuments);
  const contactCustomer = useGameStore((s) => s.contactCustomer);
  const moveLoan = useGameStore((s) => s.moveLoan);
  const toggleDelay = useGameStore((s) => s.toggleDelay);

  if (!game) return null;
  const customers = Object.values(game.customers).sort((a, b) => a.name.localeCompare(b.name));
  const index = customers.findIndex((c) => c.id === customerId);
  const customer = customers[index === -1 ? 0 : index];
  if (!customer) return null;

  const loan = activeLoanFor(game, customer.id);
  const trend = customer.happiness - customer.happinessAtWeekStart;
  const requiredDocs = loan ? ALL_DOC_KEYS.filter((key) => loan.documents[key] !== 'notRequired') : [];
  const collectedCount = loan
    ? requiredDocs.filter((key) => loan.documents[key] === 'collected').length
    : 0;
  const owed = loan ? missingDocs(loan).length : 0;
  // Enabled while anything is still owed — asking again is allowed, but it
  // nags the customer and costs a little happiness (GDD §4 action 1).
  // Paperwork only starts once the loan reaches Document Collection.
  const requestable = owed > 0 && loan?.stage === 'documentCollection';
  const next = loan ? nextStage(loan.stage) : null;
  const blocked = loan ? moveBlockedReason(game, loan.id) : 'No active loan.';

  const goTo = (offset: number) => {
    const target = customers[(index + offset + customers.length) % customers.length];
    if (target) onSelectCustomer(target.id);
  };

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <button type="button" className={styles.backButton} onClick={onBack} aria-label="Back">
          <ArrowLeft size={16} />
        </button>
        <nav className={styles.breadcrumb} aria-label="Breadcrumb">
          <button type="button" onClick={onBack}>
            Dashboard
          </button>
          <span>/</span>
          <strong>Customer Profile</strong>
        </nav>
        <div className={styles.paging}>
          <button type="button" onClick={() => goTo(-1)} aria-label="Previous customer" disabled={customers.length < 2}>
            <ChevronLeft size={15} />
          </button>
          <span>
            Customer {index + 1} of {customers.length}
          </span>
          <button type="button" onClick={() => goTo(1)} aria-label="Next customer" disabled={customers.length < 2}>
            <ChevronRight size={15} />
          </button>
        </div>
      </header>

      <div className={styles.columns}>
        {/* ── Column 1: who they are ── */}
        <section className={styles.panel}>
          <Portrait customer={customer} />
          <h2 className={styles.name}>{customer.name}</h2>
          <span className={styles.buyerType}>
            {customer.buyerTypeLabel} · Age {customer.age}
          </span>
          {customer.about && <p className={styles.about}>{customer.about}</p>}
          <div className={styles.traits}>
            {customer.traits.map((trait) => (
              <span key={trait} className={styles.traitChip}>
                {TRAIT_LABEL[trait]}
              </span>
            ))}
          </div>

          <h4 className={styles.meterLabel}>Happiness</h4>
          <div className={styles.meterRow}>
            <span className={styles.meterEmoji} aria-hidden="true">
              {happinessFace(customer.happiness)}
            </span>
            <div className={styles.meterTrack}>
              <div className={styles.meterFill} style={{ width: `${customer.happiness}%` }} />
            </div>
            <strong>{customer.happiness}%</strong>
          </div>
          <span className={trend >= 0 ? styles.trendUp : styles.trendDown}>
            {trend > 0 ? `↑ ${trend} this week` : trend < 0 ? `↓ ${-trend} this week` : '— steady this week'}
          </span>

          <h4 className={styles.meterLabel}>Trust Level</h4>
          <div className={styles.trustRow} aria-label={`Trust ${customer.trust} of ${TRUST_MAX}`}>
            {Array.from({ length: TRUST_MAX }, (_, i) => (
              <span key={i} className={i < Math.round(customer.trust) ? styles.trustBarOn : styles.trustBar} />
            ))}
          </div>
        </section>

        {/* ── Column 2: dream home + journey ── */}
        <section className={styles.panel}>
          <h4>Dream Home</h4>
          <div className={styles.homeCard}>
            <HomeArt customer={customer} />
            <h3>{customer.dreamHome.name}</h3>
            <span className={styles.homeMeta}>
              {NEIGHBORHOOD_DISPLAY_NAME[customer.dreamHome.neighborhoodId] ?? 'Meadowbrook'} ·{' '}
              {customer.dreamHome.beds} bd · {customer.dreamHome.baths} ba
            </span>
            <span className={styles.homeChip}>{customer.dreamHome.categoryChip}</span>
            <dl className={styles.homeNumbers}>
              <div>
                <dt>Home Price</dt>
                <dd>{moneyFull(customer.dreamHome.price)}</dd>
              </div>
              <div>
                <dt>
                  <GlossaryTerm termKey="downPayment">Down Payment</GlossaryTerm>
                </dt>
                <dd>{moneyFull(customer.dreamHome.downPayment)}</dd>
              </div>
              <div>
                <dt>Est. Monthly</dt>
                <dd>{moneyFull(customer.dreamHome.monthly)}/mo</dd>
              </div>
            </dl>
          </div>

          <h4 className={styles.journeyTitle}>The Journey</h4>
          {loan ? (
            <>
              <ol className={styles.journey}>
                {JOURNEY_DISPLAY.map((step) => {
                  const here = step.stage === loan.stage;
                  const stageIdx = JOURNEY_DISPLAY.findIndex((j) => j.stage === loan.stage);
                  const stepIdx = JOURNEY_DISPLAY.indexOf(step);
                  const done = stepIdx < stageIdx;
                  return (
                    <li key={step.label} className={here ? styles.journeyHere : done ? styles.journeyDone : undefined}>
                      {done ? '✓ ' : here ? '➡ ' : ''}
                      {step.label}
                    </li>
                  );
                })}
              </ol>
              <p className={styles.statusLine}>{encouragement(loan, owed)}</p>
            </>
          ) : (
            <p className={styles.statusLine}>All wrapped up — they're home! 🏠</p>
          )}
        </section>

        {/* ── Column 3: loan documents ── */}
        <section className={styles.panel}>
          <h4>Loan Documents</h4>
          {loan ? (
            <>
              <div className={styles.docsProgress}>
                <span>
                  {collectedCount} of {requiredDocs.length} collected
                  {owed > 0 ? ` · ${owed} more to go!` : ''}
                </span>
                {owed > 0 && owed <= 2 && <span className={styles.encourageChip}>Almost there!</span>}
                {owed === 0 && <span className={styles.encourageChip}>All set! 🎉</span>}
              </div>
              <ul className={styles.checklist}>
                {requiredDocs.map((key) => {
                  const status = loan.documents[key];
                  if (status === 'notRequired') return null;
                  return (
                    <li key={key}>
                      <span className={styles.docName}>
                        <GlossaryTerm termKey={key}>{DOC_DISPLAY_NAME[key]}</GlossaryTerm>
                        <small>{DOC_FRIENDLY_SUBLABEL[key]}</small>
                      </span>
                      <span className={styles[`doc_${status}`]}>
                        {status === 'missing' ? 'Missing' : status === 'requested' ? 'Requested' : 'Collected'}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </>
          ) : (
            <p className={styles.statusLine}>Every document is filed away. Tidy!</p>
          )}
        </section>
      </div>

      {/* ── The four fixed actions (GDD §4) ── */}
      <footer className={styles.actions}>
        <Button
          variant="primary"
          disabled={!loan || !requestable || loan.delayed}
          onClick={() => loan && requestAllDocuments(loan.id)}
        >
          Request Documents
        </Button>
        <Button
          disabled={!loan || !next || blocked !== null}
          onClick={() => loan && moveLoan(loan.id)}
          title={blocked ?? undefined}
        >
          Continue Processing{loan && next ? ` → ${STAGE_DISPLAY_NAME[next]}` : ''}
        </Button>
        <Button
          disabled={!loan}
          onClick={() => loan && contactCustomer(loan.id)}
          title="A friendly check-in: +2 happiness, +0.25 trust — costs an hour of work on their loan"
        >
          Contact Customer
        </Button>
        <Button variant="ghost" disabled={!loan} onClick={() => loan && toggleDelay(loan.id)}>
          {loan?.delayed ? 'Resume' : 'Delay'}
        </Button>
        {loan && (
          <span className={styles.loanRef}>
            {loan.id} · <GlossaryTerm termKey="loanTypes">{LOAN_PRODUCT_LABEL[loan.product]}</GlossaryTerm> ·{' '}
            {LOAN_PURPOSE_LABEL[loan.purpose]} · {moneyFull(loan.amount)}
          </span>
        )}
      </footer>
    </div>
  );
}

function activeLoanFor(game: GameState, customerId: string): Loan | undefined {
  const loans = Object.values(game.loans).filter((l) => l.customerId === customerId);
  return loans.find((l) => l.stage !== 'completed') ?? undefined;
}

function happinessFace(happiness: number): string {
  if (happiness >= 80) return '😄';
  if (happiness >= 60) return '🙂';
  if (happiness >= 40) return '😐';
  return '🙁';
}

function encouragement(loan: Loan, owed: number): string {
  if (loan.delayed) return "This one's set aside for now — they'd love to hear it's moving again.";
  if (loan.stage === 'documentCollection' && owed > 0) {
    return `You're doing great! Waiting on ${owed} more ${owed === 1 ? 'document' : 'documents'} to move ahead.`;
  }
  if (loan.stage === 'underwriting') return 'The big review is underway — fingers crossed for a quick yes!';
  if (loan.stage === 'closing' || loan.stage === 'clearToClose') return 'So close now — the keys are almost in hand!';
  return "Everything's moving along nicely. Keep it up!";
}

/** Talia's borrower art when the customer has one; drawn fallback otherwise. */
function Portrait({ customer }: { customer: Customer }) {
  if (customer.portraitId) {
    return (
      <div className={styles.portraitArt}>
        <img src={borrowerArtUrl(customer.portraitId)} alt="" />
      </div>
    );
  }
  return <DrawnPortrait customer={customer} />;
}

/** Cozy procedural portrait — deterministic from the customer's seed. */
function DrawnPortrait({ customer }: { customer: Customer }) {
  const hue = seedNumber(customer.portraitSeed);
  const shirts = ['var(--color-sky)', 'var(--color-sage)', 'var(--color-lavender)', 'var(--color-rose)'];
  const shirt = shirts[hue % shirts.length] ?? 'var(--color-sky)';
  const smile = customer.happiness >= 60;
  return (
    <svg className={styles.portrait} viewBox="0 0 120 140" aria-hidden="true">
      <circle cx="60" cy="140" r="52" fill={shirt} />
      <circle cx="60" cy="58" r="34" fill="var(--color-cream)" stroke="var(--color-cocoa)" strokeWidth="2" />
      <circle cx="48" cy="54" r="3.4" fill="var(--color-ink)" />
      <circle cx="72" cy="54" r="3.4" fill="var(--color-ink)" />
      {smile ? (
        <path d="M 47 68 Q 60 79 73 68" stroke="var(--color-ink)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      ) : (
        <path d="M 48 72 Q 60 66 72 72" stroke="var(--color-ink)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      )}
      <path d="M 26 46 Q 34 18 60 22 Q 88 18 94 46 Q 78 34 60 36 Q 42 34 26 46 Z" fill="var(--color-cocoa)" opacity="0.85" />
    </svg>
  );
}

/** Their dream-home illustration (repeat leads are paired with fresh houses). */
function HomeArt({ customer }: { customer: Customer }) {
  const houseId = customer.houseId ?? customer.portraitId;
  if (houseId) {
    return <img className={styles.homeArtPhoto} src={houseArtUrl(houseId)} alt="" />;
  }
  return <DrawnHomeArt seed={customer.portraitSeed} />;
}

function DrawnHomeArt({ seed }: { seed: string }) {
  const roofs = ['var(--color-terracotta)', 'var(--color-sky)', 'var(--color-sage)', 'var(--color-lavender)'];
  const roof = roofs[seedNumber(seed) % roofs.length] ?? 'var(--color-terracotta)';
  return (
    <svg className={styles.homeArt} viewBox="0 0 160 90" aria-hidden="true">
      <rect x="35" y="42" width="90" height="46" rx="8" fill="var(--color-paper)" stroke="var(--color-sand)" strokeWidth="2" />
      <path d="M 25 46 Q 80 -4 135 46 Z" fill={roof} opacity="0.92" />
      <rect x="50" y="56" width="18" height="18" rx="5" fill="var(--color-honey)" opacity="0.85" />
      <rect x="92" y="56" width="18" height="18" rx="5" fill="var(--color-honey)" opacity="0.85" />
      <rect x="72" y="62" width="17" height="26" rx="5" fill="var(--color-cocoa)" opacity="0.8" />
    </svg>
  );
}

function seedNumber(seed: string): number {
  let n = 0;
  for (const ch of seed) n = (n * 31 + ch.charCodeAt(0)) >>> 0;
  return n;
}
