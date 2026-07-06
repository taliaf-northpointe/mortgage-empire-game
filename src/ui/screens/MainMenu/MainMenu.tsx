import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { GAME_TITLE, TAGLINE } from '../../../engine/constants';
import { useGameStore } from '../../../store/gameStore';
import { hasSave, loadGame, parseSave, serializeSave } from '../../../store/saveSystem';
import { Button } from '../../components/Button';
import styles from './MainMenu.module.css';
import { TownScene } from './TownScene';

interface MainMenuProps {
  /** Called once a game is running (new or restored) — App shows the office. */
  onEnterGame(): void;
  onOpenSettings(): void;
}

export function MainMenu({ onEnterGame, onOpenSettings }: MainMenuProps) {
  const [view, setView] = useState<'menu' | 'newGame'>('menu');
  const [saveAvailable, setSaveAvailable] = useState(() => hasSave());
  const [notice, setNotice] = useState<string | null>(null);

  const newGame = useGameStore((s) => s.newGame);
  const continueGame = useGameStore((s) => s.continueGame);
  const adoptImportedGame = useGameStore((s) => s.adoptImportedGame);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && view === 'menu') {
        e.preventDefault();
        setView('newGame');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [view]);

  const handleContinue = () => {
    if (continueGame()) onEnterGame();
    else setNotice("We couldn't find a saved game to pick up.");
  };

  const handleExport = () => {
    const state = loadGame() ?? useGameStore.getState().game;
    if (!state) return;
    const blob = new Blob([serializeSave(state)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'mortgage-tycoon-save.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleImportFile = async (file: File) => {
    try {
      const state = parseSave(await file.text());
      adoptImportedGame(state);
      setSaveAvailable(true);
      onEnterGame();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "That file didn't work — sorry!");
    }
  };

  return (
    <main className={styles.screen}>
      <TownScene />
      <section className={styles.card}>
        <span className={styles.pill}>A Cozy Tycoon Game</span>
        <h1>{GAME_TITLE}</h1>
        <p className={styles.tagline}>{TAGLINE}</p>

        {view === 'menu' ? (
          <>
            <div className={styles.buttons}>
              <Button variant="primary" size="lg" onClick={() => setView('newGame')}>
                New Game
              </Button>
              <Button size="lg" onClick={handleContinue} disabled={!saveAvailable}>
                Continue
              </Button>
              <Button size="lg" onClick={onOpenSettings}>
                Settings
              </Button>
              <Button size="lg" disabled title="Coming in a later milestone">
                Credits
              </Button>
              <Button variant="ghost" size="lg" disabled title="You're in a browser — closing the tab works great 🙂">
                Exit
              </Button>
            </div>
            <div className={styles.saveTools}>
              <Button variant="ghost" onClick={handleExport} disabled={!saveAvailable}>
                Export save
              </Button>
              <Button variant="ghost" onClick={() => fileInputRef.current?.click()}>
                Import save
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                hidden
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleImportFile(file);
                  e.target.value = '';
                }}
              />
            </div>
          </>
        ) : (
          <NewGameForm
            onStart={(playerName, officeName) => {
              newGame(playerName, officeName);
              onEnterGame();
            }}
            onBack={() => setView('menu')}
          />
        )}

        {notice && <p className={styles.notice}>{notice}</p>}
        <p className={styles.hint}>
          Press <kbd>ENTER</kbd> for New Game
        </p>
      </section>
    </main>
  );
}

function NewGameForm({
  onStart,
  onBack,
}: {
  onStart(playerName: string, officeName: string): void;
  onBack(): void;
}) {
  const [playerName, setPlayerName] = useState('');
  const [officeName, setOfficeName] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onStart(playerName, officeName);
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <label className={styles.field}>
        <span>What's your name?</span>
        <input
          autoFocus
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          placeholder="e.g. Alex Turner"
          maxLength={24}
        />
      </label>
      <label className={styles.field}>
        <span>Name your office</span>
        <input
          value={officeName}
          onChange={(e) => setOfficeName(e.target.value)}
          placeholder="e.g. Sunny Corner Lending"
          maxLength={32}
        />
      </label>
      <div className={styles.formButtons}>
        <Button variant="primary" size="lg" type="submit">
          Start playing
        </Button>
        <Button variant="ghost" size="lg" onClick={onBack}>
          Back
        </Button>
      </div>
    </form>
  );
}
