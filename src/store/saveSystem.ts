/**
 * Save system (TDD §5): autosave to localStorage, manual JSON export/import.
 * Storage is injectable so the engine-side tests can run headlessly.
 */
import { SAVE_KEY } from '../engine/constants';
import type { GameState } from '../engine/types';
import { applyMigrations, CURRENT_SAVE_VERSION } from './migrations';

export interface SaveStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** In-memory fallback so the store also works headlessly (tests, SSR). */
const memoryFallback: SaveStorage = (() => {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
  };
})();

function defaultStorage(): SaveStorage {
  return typeof globalThis.localStorage === 'undefined' ? memoryFallback : globalThis.localStorage;
}

export function serializeSave(state: GameState): string {
  return JSON.stringify(state, null, 2);
}

/**
 * Parse and validate a save payload (from localStorage or an imported file).
 * Throws a player-friendly Error if the payload isn't a usable save.
 */
export function parseSave(raw: string): GameState {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error("That file doesn't look like a Mortgage Tycoon save.");
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error("That file doesn't look like a Mortgage Tycoon save.");
  }

  const migrated = applyMigrations(data as Record<string, unknown>);

  const meta = migrated['meta'] as Record<string, unknown> | undefined;
  const looksValid =
    meta &&
    meta['saveVersion'] === CURRENT_SAVE_VERSION &&
    typeof migrated['clock'] === 'object' &&
    typeof migrated['loans'] === 'object' &&
    typeof migrated['customers'] === 'object' &&
    typeof migrated['employees'] === 'object' &&
    typeof migrated['currencies'] === 'object';
  if (!looksValid) {
    throw new Error("That file doesn't look like a Mortgage Tycoon save.");
  }

  return migrated as unknown as GameState;
}

export function saveGame(state: GameState, storage: SaveStorage = defaultStorage()): void {
  storage.setItem(SAVE_KEY, serializeSave(state));
}

export function loadGame(storage: SaveStorage = defaultStorage()): GameState | null {
  const raw = storage.getItem(SAVE_KEY);
  if (raw === null) return null;
  try {
    return parseSave(raw);
  } catch {
    return null; // a corrupt autosave should never crash the menu
  }
}

export function hasSave(storage: SaveStorage = defaultStorage()): boolean {
  return storage.getItem(SAVE_KEY) !== null;
}

export function clearSave(storage: SaveStorage = defaultStorage()): void {
  storage.removeItem(SAVE_KEY);
}
