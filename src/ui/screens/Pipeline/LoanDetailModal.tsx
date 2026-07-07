import {
  DOC_DISPLAY_NAME,
  DOC_FRIENDLY_SUBLABEL,
  LOAN_PRODUCT_LABEL,
  LOAN_PURPOSE_LABEL,
  ROLE_DISPLAY_NAME,
  STAGE_DISPLAY_NAME,
} from '../../../engine/constants';
import { loanOutlook } from '../../../engine/insights';
import { ALL_DOC_KEYS, missingDocs, nextStage } from '../../../engine/loans';
import type { Customer, DocStatus, Loan } from '../../../engine/types';
import { useGameStore } from '../../../store/gameStore';
import { Button } from '../../components/Button';
import { GlossaryTerm } from '../../glossary/GlossaryTerm';
import { moneyFull } from '../../format';
import styles from './Pipeline.module.css';

const DOC_STATUS_LABEL: Record<Exclude<DocStatus, 'notRequired'>, string> = {
  missing: 'Missing',
  requested: 'Requested',
  collected: 'Collected',
};

/** Who the loan is with and how long until something happens (M8.1). */
function OutlookLine({ loan }: { loan: Loan }) {
  const game = useGameStore((s) => s.game);
  if (!game) return null;
  const outlook = loanOutlook(game, loan);
  const withWho =
    outlook.assigneeName && outlook.assigneeRole
      ? `with ${outlook.assigneeName} (${ROLE_DISPLAY_NAME[outlook.assigneeRole]})`
      : null;

  let text: string;
  switch (outlook.kind) {
    case 'done':
      return null;
    case 'delayed':
      text = '⏸ Set aside — resume to keep things moving.';
      break;
    case 'unstaffed':
      text = `⚠ Nobody owns ${STAGE_DISPLAY_NAME[loan.stage]} right now — hire or rebalance!`;
      break;
    case 'documents':
      text = `🕐 Next document in ~${outlook.hours}h${withWho ? ` · ${withWho}` : ''}`;
      break;
    default:
      text = `🕐 About ${outlook.hours}h left in ${STAGE_DISPLAY_NAME[loan.stage]}${withWho ? ` · ${withWho}` : ''}`;
  }
  return <p className={styles.outlook}>{text}</p>;
}

export function LoanDetailModal({
  loan,
  customer,
  onClose,
  onOpenCustomer,
}: {
  loan: Loan;
  customer: Customer | undefined;
  onClose(): void;
  onOpenCustomer(customerId: string): void;
}) {
  const game = useGameStore((s) => s.game);
  const requestDocument = useGameStore((s) => s.requestDocument);
  const contactCustomer = useGameStore((s) => s.contactCustomer);
  const moveLoan = useGameStore((s) => s.moveLoan);

  const next = nextStage(loan.stage);
  const owed = missingDocs(loan).length;
  const moveBlocked = loan.stage === 'documentCollection' && owed > 0;
  const requiredDocs = ALL_DOC_KEYS.filter((key) => loan.documents[key] !== 'notRequired');

  return (
    <div className={styles.overlay} onClick={onClose} role="presentation">
      <section
        className={styles.modal}
        role="dialog"
        aria-label={`Loan details for ${customer?.name ?? loan.id}`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className={styles.modalHeader}>
          <div>
            <h3>{customer?.name ?? 'Customer'}</h3>
            <span className={styles.loanId}>
              {loan.id} · <GlossaryTerm termKey="loanTypes">{LOAN_PRODUCT_LABEL[loan.product]}</GlossaryTerm> ·{' '}
              {LOAN_PURPOSE_LABEL[loan.purpose]}
            </span>
          </div>
          <span className={styles.stageChipBig}>
            IN {STAGE_DISPLAY_NAME[loan.stage].toUpperCase()} · DAY {loan.daysInPipeline + 1}
          </span>
        </header>

        {game && <OutlookLine loan={loan} />}

        <dl className={styles.terms}>
          <div>
            <dt>Amount</dt>
            <dd>{moneyFull(loan.amount)}</dd>
          </div>
          <div>
            <dt>Term</dt>
            <dd>{loan.termYears} years</dd>
          </div>
          <div>
            <dt>
              <GlossaryTerm termKey="interestRate">Rate</GlossaryTerm>
            </dt>
            <dd>{loan.rate.toFixed(1)}%</dd>
          </div>
        </dl>

        <h4 className={styles.checklistTitle}>Loan Documents</h4>
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
                <span className={styles[`doc_${status}`]}>{DOC_STATUS_LABEL[status]}</span>
                {status === 'missing' && (
                  <Button onClick={() => requestDocument(loan.id, key)}>Request</Button>
                )}
              </li>
            );
          })}
        </ul>

        <footer className={styles.modalActions}>
          {loan.stage !== 'completed' && next ? (
            <>
              <Button variant="primary" disabled={moveBlocked} onClick={() => moveLoan(loan.id)}>
                Move to {STAGE_DISPLAY_NAME[next]}
              </Button>
              {moveBlocked && (
                <span className={styles.blockedNote}>
                  Waiting on {owed} more {owed === 1 ? 'document' : 'documents'}
                </span>
              )}
            </>
          ) : (
            <span className={styles.doneNote}>All done — keys handed over! 🏠</span>
          )}
          {loan.stage !== 'completed' && (
            <Button
              onClick={() => contactCustomer(loan.id)}
              title="A friendly check-in: +2 happiness, +0.25 trust — costs an hour of work on this loan"
            >
              Contact
            </Button>
          )}
          {customer && (
            <Button variant="ghost" onClick={() => onOpenCustomer(customer.id)}>
              View profile
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </footer>
      </section>
    </div>
  );
}
