import { useEffect, useState } from 'react';
import { audioManager } from './audio/AudioManager';
import { REAL_MS_PER_HOUR } from './engine/constants';
import { useGameStore } from './store/gameStore';
import { AudioSettings } from './ui/screens/AudioSettings/AudioSettings';
import { CustomerProfile } from './ui/screens/CustomerProfile/CustomerProfile';
import { Dashboard } from './ui/screens/Dashboard/Dashboard';
import { Employees } from './ui/screens/Employees/Employees';
import { EndOfDay } from './ui/screens/EndOfDay/EndOfDay';
import { TutorialOverlay } from './ui/screens/Tutorial/TutorialOverlay';
import { Upgrades } from './ui/screens/Upgrades/Upgrades';
import { WorldMap } from './ui/screens/WorldMap/WorldMap';
import { LearningCenter } from './ui/screens/LearningCenter/LearningCenter';
import { MainMenu } from './ui/screens/MainMenu/MainMenu';
import { Pipeline } from './ui/screens/Pipeline/Pipeline';
import { Toasts } from './ui/components/Toasts';

/** One id per designed screen (GDD §11). Screens arrive milestone by milestone. */
export type ScreenId =
  | 'mainMenu'
  | 'dashboard'
  | 'pipeline'
  | 'learning'
  | 'customer'
  | 'employees'
  | 'upgrades'
  | 'map'
  | 'endOfDay'
  | 'audioSettings';

export type Speed = 0 | 1 | 2 | 3;

export function App() {
  const [screen, setScreen] = useState<ScreenId>('mainMenu');
  const [speed, setSpeed] = useState<Speed>(1);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const hasGame = useGameStore((s) => s.game !== null);
  const game = useGameStore((s) => s.game);
  const showEndOfDay = useGameStore((s) => s.showEndOfDay);

  useEffect(() => {
    audioManager.initialize();
  }, []);

  useEffect(() => {
    if (screen === 'mainMenu') {
      audioManager.setScene('mainMenu');
    } else if (screen === 'dashboard') {
      audioManager.setScene('dashboard');
    } else if (screen === 'pipeline') {
      audioManager.setScene('pipeline');
    } else if (screen === 'learning' || screen === 'customer') {
      audioManager.setScene('customer');
    } else if (screen === 'audioSettings') {
      audioManager.setScene('audioSettings');
    }
  }, [screen]);

  useEffect(() => {
    if (!game) return;
    const activeLoans = Object.values(game.loans).filter((loan) => loan.stage !== 'completed').length;
    audioManager.updateDynamicState({ activeLoans });
  }, [game]);

  // The day clock (TDD §4) runs whenever a game is open, on any game screen.
  // Returning to the Main Menu pauses the world.
  const tutorialActive = hasGame && game !== null && !game.meta.tutorialDone;

  useEffect(() => {
    if (!hasGame || screen === 'mainMenu' || speed === 0 || showEndOfDay || tutorialActive) return;
    const id = window.setInterval(() => useGameStore.getState().tick(), REAL_MS_PER_HOUR / speed);
    return () => window.clearInterval(id);
  }, [hasGame, screen, speed, showEndOfDay, tutorialActive]);

  const content = (() => {
    // M7 — the world pauses on the End-of-Day summary (GDD §11 screen 8).
    if (showEndOfDay && screen !== 'mainMenu' && hasGame) {
      return <EndOfDay />;
    }

    if (screen === 'mainMenu') {
      return <MainMenu onEnterGame={() => setScreen('dashboard')} onOpenSettings={() => setScreen('audioSettings')} />;
    }
    if (screen === 'pipeline') {
      return (
        <Pipeline
          onBack={() => setScreen('dashboard')}
          onOpenCustomer={(id) => {
            setCustomerId(id);
            setScreen('customer');
          }}
        />
      );
    }
    if (screen === 'learning') {
      return <LearningCenter onBack={() => setScreen('dashboard')} />;
    }
    if (screen === 'employees') {
      return <Employees onBack={() => setScreen('dashboard')} />;
    }
    if (screen === 'upgrades') {
      return <Upgrades onBack={() => setScreen('dashboard')} />;
    }
    if (screen === 'map') {
      return <WorldMap onBack={() => setScreen('dashboard')} />;
    }
    if (screen === 'audioSettings') {
      return <AudioSettings onBack={() => setScreen(hasGame ? 'dashboard' : 'mainMenu')} />;
    }
    if (screen === 'customer' && customerId) {
      return (
        <CustomerProfile
          customerId={customerId}
          onSelectCustomer={setCustomerId}
          onBack={() => setScreen('dashboard')}
        />
      );
    }
    return (
      <>
        <Dashboard
          speed={speed}
          onSpeedChange={setSpeed}
          onNavigate={setScreen}
          onExitToMenu={() => setScreen('mainMenu')}
        />
        {tutorialActive && <TutorialOverlay />}
      </>
    );
  })();

  return (
    <>
      {content}
      <Toasts />
    </>
  );
}
