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
import { openBranch, scoutNeighborhood } from '../engine/map';
import { completeTutorial } from '../engine/playerActions';
import { purchaseUpgrade } from '../engine/upgrades';
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
import { pushToast } from './toastStore';

interface GameStore {
  game: GameState | null;
  /** M7 — true right after the day rolls over; the UI shows End of Day and the clock pauses. */
  showEndOfDay: boolean;
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
  /** GDD §7/§11 (M7) */
  purchaseUpgrade(upgradeId: string): void;
  startNextDay(): void;
  /** GDD §9/§11 (M8) */
  scoutNeighborhood(id: string): void;
  openBranch(id: string): void;
  completeTutorial(skipped: boolean): void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  game: null,
  showEndOfDay: false,

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
    if (game.clock.hour > DAY_END_HOUR) {
      // The day is over: roll the calendar and pause on the End-of-Day
      // summary (GDD §11 screen 8).
      set({ game: advanceDay(game), showEndOfDay: true });
    } else {
      set({ game: advanceHour(game) });
    }
  },

  startNextDay() {
    set({ showEndOfDay: false });
  },

  purchaseUpgrade(upgradeId) {
    const { game } = get();
    if (!game) return;
    const next = purchaseUpgrade(game, upgradeId);
    if (next !== game) set({ game: next });
  },

  scoutNeighborhood(id) {
    const { game } = get();
    if (!game) return;
    const next = scoutNeighborhood(game, id);
    if (next !== game) set({ game: next });
  },

  openBranch(id) {
    const { game } = get();
    if (!game) return;
    const next = openBranch(game, id);
    if (next !== game) set({ game: next });
  },

  completeTutorial(skipped) {
    const { game } = get();
    if (!game) return;
    const next = completeTutorial(game, skipped);
    if (next !== game) set({ game: next });
  },

  requestDocument(loanId, key) {
    const { game } = get();
    if (!game) return;
    const next = requestDocument(game, loanId, key);
    if (next !== game) {
      set({ game: next });
      const customer = next.customers[next.loans[loanId]?.customerId ?? ''];
      if (customer) pushToast(`📨 Requested from ${customer.name} — requested papers arrive first.`);
    }
  },

  contactCustomer(loanId) {
    const { game } = get();
    if (!game) return;
    const next = contactCustomer(game, loanId);
    if (next !== game) {
      set({ game: next });
      // Tell the player exactly what the friendly hello did (real deltas —
      // Customer Experience upgrades can deepen the trust gain).
      const customerId = game.loans[loanId]?.customerId ?? '';
      const before = game.customers[customerId];
      const after = next.customers[customerId];
      if (before && after) {
        const happier = after.happiness - before.happiness;
        const trustier = Math.round((after.trust - before.trust) * 100) / 100;
        const gains = [
          happier > 0 ? `+${happier} happiness` : 'happiness already full',
          trustier > 0 ? `+${trustier} trust` : 'trust already full',
        ].join(', ');
        pushToast(`💬 You checked in with ${after.name} — ${gains}. Cost an hour of work on their loan.`);
      }
    }
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
    if (next !== game) {
      set({ game: next });
      const loanBefore = game.loans[loanId];
      const loanAfter = next.loans[loanId];
      const customer = next.customers[loanBefore?.customerId ?? ''];
      if (loanBefore && loanAfter && customer) {
        const newlyRequested = Object.entries(loanAfter.documents).filter(
          ([key, status]) =>
            status === 'requested' && loanBefore.documents[key as DocumentKey] === 'missing',
        ).length;
        const nagged = customer.happiness < (game.customers[customer.id]?.happiness ?? 0);
        pushToast(
          newlyRequested > 0
            ? `📨 Asked ${customer.name} for ${newlyRequested} ${newlyRequested === 1 ? 'document' : 'documents'} — requested papers arrive first.`
            : `📨 Reminded ${customer.name} about their documents${nagged ? ' — they sighed a little (−2 happiness)' : ''}.`,
        );
      }
    }
  },

  toggleDelay(loanId) {
    const { game } = get();
    if (!game) return;
    const next = toggleDelay(game, loanId);
    if (next !== game) {
      set({ game: next });
      const customer = next.customers[next.loans[loanId]?.customerId ?? ''];
      const delayed = next.loans[loanId]?.delayed;
      if (customer) {
        pushToast(
          delayed
            ? `⏸️ ${customer.name}'s loan is set aside — no progress until you resume it.`
            : `▶️ ${customer.name}'s loan is moving again!`,
        );
      }
    }
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
