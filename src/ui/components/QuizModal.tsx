import { useMemo } from 'react';
import { GraduationCap } from 'lucide-react';
import { QUIZ_OPTION_COUNT, QUIZ_XP } from '../../engine/constants';
import { ALL_TERM_KEYS, getEntry } from '../../engine/content/glossary';
import { mulberry32 } from '../../engine/rng';
import { useGameStore } from '../../store/gameStore';
import { Button } from './Button';
import styles from './QuizModal.module.css';

/**
 * The every-5-levels mortgage quiz (playtest 2026-07-06): one term, four
 * definitions, one correct. Options are deterministic per (seed, level) so a
 * reload can't reshuffle the answers.
 */
export function QuizModal() {
  const game = useGameStore((s) => s.game);
  const answerQuiz = useGameStore((s) => s.answerQuiz);
  const quiz = game?.quiz;

  const options = useMemo(() => {
    if (!game || !quiz) return [];
    const rng = mulberry32((game.rngSeed ^ (quiz.forLevel * 48_611)) >>> 0);
    const distractors = ALL_TERM_KEYS.filter((key) => key !== quiz.termKey);
    // seeded partial shuffle: pick 3 distractors, then seed the correct one in
    const picked: string[] = [];
    while (picked.length < QUIZ_OPTION_COUNT - 1 && distractors.length > 0) {
      const [key] = distractors.splice(rng.int(0, distractors.length - 1), 1);
      if (key) picked.push(key);
    }
    picked.splice(rng.int(0, picked.length), 0, quiz.termKey);
    return picked;
  }, [game, quiz]);

  if (!game || !quiz) return null;
  const entry = getEntry(quiz.termKey);
  if (!entry) return null;

  return (
    <div className={styles.overlay} role="dialog" aria-label="Mortgage quiz">
      <section className={styles.card}>
        <span className={styles.eyebrow}>
          <GraduationCap size={14} aria-hidden="true" /> LEVEL {quiz.forLevel} POP QUIZ · +{QUIZ_XP} XP
        </span>
        <h2>Which of these describes “{entry.term}”?</h2>
        <div className={styles.options}>
          {options.map((key) => (
            <Button key={key} className={styles.option} onClick={() => answerQuiz(key)}>
              {getEntry(key)?.definition}
            </Button>
          ))}
        </div>
        <p className={styles.hint}>
          No pressure — a wrong answer just files the term in the Learning Center for review.
        </p>
      </section>
    </div>
  );
}
