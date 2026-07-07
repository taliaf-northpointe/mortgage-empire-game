import { ArrowLeft, Heart, Mail, MailCheck } from 'lucide-react';
import {
  LOAN_PRODUCT_LABEL,
  LOAN_PURPOSE_LABEL,
  NEIGHBORHOOD_DISPLAY_NAME,
} from '../../../engine/constants';
import type { MemoryEntry } from '../../../engine/types';
import { useGameStore } from '../../../store/gameStore';
import { borrowerArtUrl, houseArtUrl } from '../../customerArt';
import styles from './MemoryWall.module.css';

/**
 * The Wall of Homes (v11) — a scrapbook of every family helped: their photo,
 * their home, and the thank-you note they left on closing day.
 */
export function MemoryWall({ onBack }: { onBack(): void }) {
  const game = useGameStore((s) => s.game);
  if (!game) return null;
  const pages = [...game.memoryWall].reverse(); // newest memories first

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
          <strong>Wall of Homes</strong>
        </nav>
        <span className={styles.countChip}>
          <Heart size={13} aria-hidden="true" /> {pages.length}{' '}
          {pages.length === 1 ? 'family helped' : 'families helped'}
        </span>
      </header>

      {pages.length === 0 ? (
        <section className={styles.empty}>
          <Heart size={30} aria-hidden="true" />
          <h2>The wall is waiting for its first photo</h2>
          <p>
            Every family you help gets a page here — their picture, their new home, and the note
            they leave on closing day. Go make someone a homeowner!
          </p>
        </section>
      ) : (
        <section className={styles.wall} aria-label="Scrapbook of families helped">
          {pages.map((page, i) => (
            <MemoryCard key={page.loanId} page={page} tilt={i % 3} />
          ))}
        </section>
      )}
    </div>
  );
}

function MemoryCard({ page, tilt }: { page: MemoryEntry; tilt: number }) {
  const sendThankYouNote = useGameStore((s) => s.sendThankYouNote);
  const when =
    page.closingDay !== null
      ? `Day ${page.closingDay}${page.season ? ` · ${page.season}` : ''}`
      : 'One of the first!';
  return (
    <article className={`${styles.card} ${styles[`tilt${tilt}`]}`}>
      <span className={styles.tape} aria-hidden="true" />
      <div className={styles.photos}>
        {page.portraitId ? (
          <>
            {/* the whole house, never cropped — the family stands in front of it */}
            <img className={styles.housePhoto} src={houseArtUrl(page.houseId ?? page.portraitId)} alt="" />
            <img className={styles.familyPhoto} src={borrowerArtUrl(page.portraitId)} alt="" />
          </>
        ) : (
          <span className={styles.familyInitial} aria-hidden="true">
            {page.customerName.charAt(0)}
          </span>
        )}
      </div>
      <h3 className={styles.names}>{page.customerName}</h3>
      <span className={styles.homeLine}>
        {page.houseName} · {NEIGHBORHOOD_DISPLAY_NAME[page.neighborhoodId] ?? 'Meadowbrook'}
      </span>
      <div className={styles.chips}>
        <span className={styles.chip}>
          {LOAN_PRODUCT_LABEL[page.product]} · {LOAN_PURPOSE_LABEL[page.purpose]}
        </span>
        <span className={styles.chipQuiet}>{when}</span>
      </div>
      <p className={styles.note}>“{page.note}”</p>
      {page.thanked ? (
        <span className={styles.thankedChip}>
          <MailCheck size={13} aria-hidden="true" /> Thank-you note sent
        </span>
      ) : (
        <button
          type="button"
          className={styles.thankButton}
          onClick={() => sendThankYouNote(page.loanId)}
          title="One per family — going above and beyond gets talked about (hello, referrals). A Loan Officer Assistant sends these for you."
        >
          <Mail size={13} aria-hidden="true" /> Send a thank-you note
        </button>
      )}
    </article>
  );
}
