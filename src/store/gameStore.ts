/**
 * Zustand store (TDD §2): holds GameState, exposes actions + selectors.
 * The UI renders state and dispatches actions; it never computes game logic.
 */
import { create } from 'zustand';
import { DAY_END_HOUR } from '../engine/constants';
import { createStarterState } from '../engine/content/starter';
import {
  hireEmployee,
  promoteEmployee,
  rebalanceLoans,
  trainEmployee,
} from '../engine/employees';
import type { HireCandidate } from '../engine/employees';
import {
  contactCustomer,
  moveLoanForward,
  requestAllDocuments,
  requestDocument,
  toggleDelay,
} from '../engine/playerActions';
import { advanceDay, advanceHour } from '../engine/tick';
import type { DocumentKey, GameState } from '../engine/types';
import { loadGame, saveGame, serializeSave } from './saveSystem';

interface GameStore {
  game: GameState | null;
  /** Create a fresh game with the player's chosen names, and autosave it. */
  newGame(playerName: string, officeName: string): void;
  /** Load the autosave. Returns false if there is none (or it's unreadable). */
  continueGame(): boolean;
  /** Replace the running game with an imported save (already parsed). */
  adoptImportedGame(state: GameState): void;
  /** Current game as pretty JSON for the export download, or null. */
  exportJson(): string | null;
  /**
   * One simulation step for the real-time loop: advance an hour, or roll to
   * the next morning once the working day is over (TDD §4).
   */
  tick(): void;
  /** GDD §3 loan popover + GDD §4 customer actions */
  requestDocument(loanId: string, key: DocumentKey): void;
  requestAllDocuments(loanId: string): void;
  contactCustomer(loanId: string): void;
  moveLoan(loanId: string): void;
  toggleDelay(loanId: string): void;
  /** GDD §4.1 progressive learning */
  unlockTerm(key: string): void;
  learnTerm(key: string): void;
  /** GDD §5 employee actions (M6) */
  trainEmployee(employeeId: string): void;
  promoteEmployee(employeeId: string): void;
  hireEmployee(candidate: HireCandidate): void;
  rebalanceLoans(): void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  game: null,

  newGame(playerName, officeName) {
    const state = createStarterState((Date.now() ^ (Math.random() * 0xffffffff)) >>> 0);
    state.meta = {
      ...state.meta,
      playerName: playerName.trim() || 'You',
      officeName: officeName.trim() || 'My First Office',
      createdAt: new Date().toISOString(),
    };
    saveGame(state);
    set({ game: state });
  },

  continueGame() {
    const loaded = loadGame();
    if (!loaded) return false;
    set({ game: loaded });
    return true;
  },

  adoptImportedGame(state) {
    saveGame(state);
    set({ game: state });
  },

  exportJson() {
    const { game } = get();
    return game ? serializeSave(game) : null;
  },

  tick() {
    const { game } = get();
    if (!game) return;
    set({ game: game.clock.hour > DAY_END_HOUR ? advanceDay(game) : advanceHour(game) });
  },

  requestDocument(loanId, key) {
    const { game } = get();
    if (!game) return;
    const next = requestDocument(game, loanId, key);
    if (next !== game) set({ game: next });
  },

  contactCustomer(loanId) {
    const { game } = get();
    if (!game) return;
    const next = contactCustomer(game, loanId);
    if (next !== game) set({ game: next });
  },

  moveLoan(loanId) {
    const { game } = get();
    if (!game) return;
    const next = moveLoanForward(game, loanId);
    if (next !== game) set({ game: next });
  },

  requestAllDocuments(loanId) {
    const { game } = get();
    if (!game) return;
    const next = requestAllDocuments(game, loanId);
    if (next !== game) set({ game: next });
  },

  toggleDelay(loanId) {
    const { game } = get();
    if (!game) return;
    const next = toggleDelay(game, loanId);
    if (next !== game) set({ game: next });
  },

  unlockTerm(key) {
    const { game } = get();
    if (!game || game.glossary[key]?.unlocked) return;
    const existing = game.glossary[key];
    set({
      game: {
        ...game,
        glossary: {
          ...game.glossary,
          [key]: { unlocked: true, learned: existing?.learned ?? false, ...(existing?.learnedOnDay !== undefined ? { learnedOnDay: existing.learnedOnDay } : {}) },
        },
      },
    });
  },

  trainEmployee(employeeId) {
    const { game } = get();
    if (!game) return;
    const next = trainEmployee(game, employeeId);
    if (next !== game) set({ game: next });
  },

  promoteEmployee(employeeId) {
    const { game } = get();
    if (!game) return;
    const next = promoteEmployee(game, employeeId);
    if (next !== game) set({ game: next });
  },

  hireEmployee(candidate) {
    const { game } = get();
    if (!game) return;
    const next = hireEmployee(game, candidate);
    if (next !== game) set({ game: next });
  },

  rebalanceLoans() {
    const { game } = get();
    if (!game) return;
    const next = rebalanceLoans(game);
    if (next !== game) set({ game: next });
  },

  learnTerm(key) {
    const { game } = get();
    if (!game || game.glossary[key]?.learned) return;
    set({
      game: {
        ...game,
        glossary: {
          ...game.glossary,
          [key]: { unlocked: true, learned: true, learnedOnDay: game.clock.day },
        },
      },
    });
  },
}));

/** Autosave whenever the game state object changes (plus on tab hide, below). */
useGameStore.subscribe((state, prev) => {
  if (state.game && state.game !== prev.game) saveGame(state.game);
});

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      const { game } = useGameStore.getState();
      if (game) saveGame(game);
    }
  });
}
