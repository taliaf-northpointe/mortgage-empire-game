import { Sparkles } from 'lucide-react';
import type { TrainingDef } from '../../engine/content/trainings';
import { useGameStore } from '../../store/gameStore';
import { Button } from './Button';
import styles from './TrainingModal.module.css';

/**
 * Just-in-time feature training (playtest 2026-07-07): a small pop-up the
 * moment something new unlocks — once per save, one at a time. The opening
 * tutorial stays lean; the game teaches as it grows.
 */
export function TrainingModal({ training }: { training: TrainingDef }) {
  const dismissTraining = useGameStore((s) => s.dismissTraining);

  return (
    <div className={styles.overlay} role="dialog" aria-label={`New feature: ${training.title}`}>
      <section className={styles.card}>
        <span className={styles.eyebrow}>
          <Sparkles size={14} aria-hidden="true" /> SOMETHING NEW JUST UNLOCKED
        </span>
        <h2>{training.title}</h2>
        <p className={styles.body}>{training.body}</p>
        {training.tip && <p className={styles.tip}>💡 {training.tip}</p>}
        <Button variant="primary" size="lg" onClick={() => dismissTraining(training.key)}>
          Got it!
        </Button>
      </section>
    </div>
  );
}
