import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AudioManager, PLAYLIST } from './AudioManager';

describe('AudioManager', () => {
  beforeEach(() => {
    // Headless test runs have no localStorage — provide a tiny in-memory one.
    if (typeof globalThis.localStorage === 'undefined') {
      const data = new Map<string, string>();
      vi.stubGlobal('localStorage', {
        getItem: (key: string) => data.get(key) ?? null,
        setItem: (key: string, value: string) => void data.set(key, String(value)),
        removeItem: (key: string) => void data.delete(key),
        clear: () => data.clear(),
      });
    }
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('persists audio settings to local storage', () => {
    const manager = AudioManager.getInstance();

    manager.setSettings({ masterVolume: 0.35, musicVolume: 0.2, sfxVolume: 0.7, ambienceVolume: 0.6 });

    const saved = JSON.parse(localStorage.getItem('mortgage-empire.audio') ?? '{}');
    expect(saved.masterVolume).toBe(0.35);
    expect(saved.musicVolume).toBe(0.2);
    expect(saved.sfxVolume).toBe(0.7);
    expect(saved.ambienceVolume).toBe(0.6);
  });

  it('rotates the playlist in order, then repeats', () => {
    const manager = AudioManager.getInstance();

    expect(PLAYLIST).toHaveLength(6);
    expect(manager.nextTrackIndex(0)).toBe(1);
    expect(manager.nextTrackIndex(4)).toBe(5);
    expect(manager.nextTrackIndex(5)).toBe(0); // wraps back to the top
  });

  it('raises the dynamic intensity when the office gets busier', () => {
    const manager = AudioManager.getInstance();

    manager.updateDynamicState({ activeLoans: 2, hasCelebration: false });
    expect(manager.getState().dynamicIntensity).toBe('calm');

    manager.updateDynamicState({ activeLoans: 7, hasCelebration: false });
    expect(manager.getState().dynamicIntensity).toBe('rush');
  });

  it('marks scenes as needing ambience for office-like screens', () => {
    const manager = AudioManager.getInstance();

    expect(manager.shouldPlayAmbience('dashboard')).toBe(true);
    expect(manager.shouldPlayAmbience('customer')).toBe(false);
  });
});
