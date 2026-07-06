import { describe, expect, it } from 'vitest';
import { SAVE_KEY } from '../../src/engine/constants';
import { createStarterState } from '../../src/engine/content/starter';
import {
  clearSave,
  hasSave,
  loadGame,
  parseSave,
  saveGame,
  serializeSave,
} from '../../src/store/saveSystem';
import type { SaveStorage } from '../../src/store/saveSystem';

function memoryStorage(): SaveStorage {
  const data = new Map<string, string>();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  };
}

describe('save round trip (TDD §5)', () => {
  it('saveGame → loadGame restores an identical state', () => {
    const storage = memoryStorage();
    const state = createStarterState();
    saveGame(state, storage);
    expect(loadGame(storage)).toEqual(state);
  });

  it('hasSave and clearSave behave', () => {
    const storage = memoryStorage();
    expect(hasSave(storage)).toBe(false);
    saveGame(createStarterState(), storage);
    expect(hasSave(storage)).toBe(true);
    clearSave(storage);
    expect(hasSave(storage)).toBe(false);
    expect(loadGame(storage)).toBeNull();
  });
});

describe('parseSave validation', () => {
  it('accepts its own export format', () => {
    const state = createStarterState();
    expect(parseSave(serializeSave(state))).toEqual(state);
  });

  it('rejects non-JSON with a friendly message', () => {
    expect(() => parseSave('definitely not json')).toThrow(/Mortgage Tycoon save/);
  });

  it('rejects JSON that is not a save', () => {
    expect(() => parseSave('{"hello":"world"}')).toThrow(/Mortgage Tycoon save/);
    expect(() => parseSave('[1,2,3]')).toThrow(/Mortgage Tycoon save/);
  });

  it('rejects a save from an unknown older version we cannot migrate', () => {
    const state = createStarterState();
    const old = JSON.parse(serializeSave(state)) as { meta: { saveVersion: number } };
    old.meta.saveVersion = 0;
    expect(() => parseSave(JSON.stringify(old))).toThrow(/version 0/);
  });

  it('a corrupt autosave returns null instead of crashing the menu', () => {
    const storage = memoryStorage();
    storage.setItem(SAVE_KEY, '{corrupt');
    expect(loadGame(storage)).toBeNull();
  });
});
