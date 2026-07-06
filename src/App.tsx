import { useEffect, useState } from 'react';
import { audioManager } from './audio/AudioManager';
import { REAL_MS_PER_HOUR } from './engine/constants';
import { useGameStore } from './store/gameStore';
import { AudioSettings } from './ui/screens/AudioSettings/AudioSettings';
import { CustomerProfile } from './ui/screens/CustomerProfile/CustomerProfile';
import { Dashboard } from './ui/screens/Dashboard/Dashboard';
import { Employees } from './ui/screens/Employees/Employees';
import { LearningCenter } from './ui/screens/LearningCenter/LearningCenter';
import { MainMenu } from './ui/screens/MainMenu/MainMenu';
import { Pipeline } from './ui/screens/Pipeline/Pipeline';

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
  useEffect(() => {
    if (!hasGame || screen === 'mainMenu' || speed === 0) return;
    const id = window.setInterval(() => useGameStore.getState().tick(), REAL_MS_PER_HOUR / speed);
    return () => window.clearInterval(id);
  }, [hasGame, screen, speed]);

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
    <Dashboard
      speed={speed}
      onSpeedChange={setSpeed}
      onNavigate={setScreen}
      onExitToMenu={() => setScreen('mainMenu')}
    />
  );
}
