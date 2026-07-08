export type AudioSceneId =
  | 'mainMenu'
  | 'dashboard'
  | 'townMap'
  | 'customer'
  | 'pipeline'
  | 'upgrades'
  | 'endOfDay'
  | 'tutorial'
  | 'audioSettings';

export type DynamicMusicIntensity = 'calm' | 'busy' | 'rush';

export type SoundCueId =
  | 'buttonHover'
  | 'buttonClick'
  | 'windowOpen'
  | 'windowClose'
  | 'menuNavigation'
  | 'notification'
  | 'checkboxToggle'
  | 'sliderMovement'
  | 'dragDrop'
  | 'cardSelection'
  | 'confirm'
  | 'cancel'
  | 'newCustomerArrived'
  | 'customerLeaves'
  | 'loanSubmitted'
  | 'documentsReceived'
  | 'missingDocuments'
  | 'loanApproved'
  | 'loanDenied'
  | 'closingCompleted'
  | 'customerHappy'
  | 'customerFrustrated'
  | 'promotion'
  | 'officeUpgrade'
  | 'achievementUnlocked'
  | 'dailySummary'
  | 'newBranchOpened'
  | 'reputationIncreased'
  | 'reputationDecreased'
  | 'newEmployeeHired'
  | 'employeeTrainingComplete';

interface AudioSettings {
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  ambienceVolume: number;
  muteMusic: boolean;
  muteSfx: boolean;
  muteAmbience: boolean;
}

interface AudioState {
  settings: AudioSettings;
  currentScene: AudioSceneId;
  dynamicIntensity: DynamicMusicIntensity;
  /** Index into PLAYLIST, or null before music has started. */
  currentTrack: number | null;
  playingAmbience: 'office' | 'town' | null;
}

interface DynamicMusicState {
  activeLoans: number;
  hasCelebration?: boolean;
}

interface AudioAssetDefinition {
  path: string;
  category: 'music' | 'sfx' | 'ambience';
  loop?: boolean;
  volume?: number;
  preload?: boolean;
}

const STORAGE_KEY = 'mortgage-empire.audio';

/**
 * The app is served under a base path on GitHub Pages
 * (/mortgage-tycoon/), so absolute asset paths must be prefixed —
 * otherwise every audio request 404s in production.
 */
function resolveAssetPath(path: string): string {
  const base = (import.meta.env?.BASE_URL ?? '/').replace(/\/$/, '');
  return path.startsWith('/') ? `${base}${path}` : path;
}

const DEFAULT_SETTINGS: AudioSettings = {
  masterVolume: 0.8,
  musicVolume: 0.35, // playtest tuning: music sits gently under the game
  sfxVolume: 0.75,
  ambienceVolume: 0.45,
  muteMusic: false,
  muteSfx: false,
  muteAmbience: false,
};

/** Old default music volume — stored settings at this value follow the new default. */
const LEGACY_MUSIC_VOLUME = 0.7;

/**
 * Background music is a simple rotating playlist (Talia's lo-fi picks):
 * play in order, then repeat. Scene changes no longer switch tracks.
 */
export const PLAYLIST: AudioAssetDefinition[] = [
  { path: '/assets/audio/music/playlist-1.mp3', category: 'music', volume: 0.6, preload: true }, // chill lofi ambient
  { path: '/assets/audio/music/playlist-2.mp3', category: 'music', volume: 0.6, preload: true }, // lofi background ambient
  { path: '/assets/audio/music/playlist-3.mp3', category: 'music', volume: 0.6 }, // deep focus lo-fi
  { path: '/assets/audio/music/playlist-4.mp3', category: 'music', volume: 0.6 }, // lofi background
  { path: '/assets/audio/music/playlist-5.mp3', category: 'music', volume: 0.6 }, // chill & relaxing
  { path: '/assets/audio/music/playlist-6.mp3', category: 'music', volume: 0.6 }, // coffee lofi chill
];

const SOUND_LIBRARY: Record<SoundCueId, AudioAssetDefinition> = {
  buttonHover: { path: '/assets/audio/ui/button-hover.wav', category: 'sfx', volume: 0.1 },
  buttonClick: { path: '/assets/audio/ui/button-click.wav', category: 'sfx', volume: 0.22 },
  windowOpen: { path: '/assets/audio/ui/window-open.wav', category: 'sfx', volume: 0.16 },
  windowClose: { path: '/assets/audio/ui/window-close.wav', category: 'sfx', volume: 0.14 },
  // Talia's rule: the plastic-bubble click for every button click; the fast
  // double-click only where a secondary click is genuinely useful (nav).
  menuNavigation: { path: '/assets/audio/ui/secondary-click.wav', category: 'sfx', volume: 0.16 },
  notification: { path: '/assets/audio/ui/notification.wav', category: 'sfx', volume: 0.18 },
  checkboxToggle: { path: '/assets/audio/ui/button-click.wav', category: 'sfx', volume: 0.16 },
  sliderMovement: { path: '/assets/audio/ui/button-hover.wav', category: 'sfx', volume: 0.08 },
  dragDrop: { path: '/assets/audio/ui/button-click.wav', category: 'sfx', volume: 0.16 },
  cardSelection: { path: '/assets/audio/ui/button-click.wav', category: 'sfx', volume: 0.14 },
  confirm: { path: '/assets/audio/events/gentle.wav', category: 'sfx', volume: 0.16 },
  cancel: { path: '/assets/audio/ui/window-close.wav', category: 'sfx', volume: 0.12 },
  newCustomerArrived: { path: '/assets/audio/events/gentle.wav', category: 'sfx', volume: 0.2 },
  customerLeaves: { path: '/assets/audio/events/alert.wav', category: 'sfx', volume: 0.16 },
  loanSubmitted: { path: '/assets/audio/events/gentle.wav', category: 'sfx', volume: 0.18 },
  documentsReceived: { path: '/assets/audio/events/gentle.wav', category: 'sfx', volume: 0.16 },
  missingDocuments: { path: '/assets/audio/events/alert.wav', category: 'sfx', volume: 0.16 },
  loanApproved: { path: '/assets/audio/events/success.wav', category: 'sfx', volume: 0.2 },
  loanDenied: { path: '/assets/audio/events/alert.wav', category: 'sfx', volume: 0.18 },
  closingCompleted: { path: '/assets/audio/events/success.wav', category: 'sfx', volume: 0.22 },
  customerHappy: { path: '/assets/audio/events/gentle.wav', category: 'sfx', volume: 0.16 },
  customerFrustrated: { path: '/assets/audio/events/alert.wav', category: 'sfx', volume: 0.16 },
  promotion: { path: '/assets/audio/events/success.wav', category: 'sfx', volume: 0.2 },
  officeUpgrade: { path: '/assets/audio/events/success.wav', category: 'sfx', volume: 0.2 },
  achievementUnlocked: { path: '/assets/audio/events/success.wav', category: 'sfx', volume: 0.2 },
  dailySummary: { path: '/assets/audio/ui/notification.wav', category: 'sfx', volume: 0.18 },
  newBranchOpened: { path: '/assets/audio/events/success.wav', category: 'sfx', volume: 0.2 },
  reputationIncreased: { path: '/assets/audio/events/gentle.wav', category: 'sfx', volume: 0.16 },
  reputationDecreased: { path: '/assets/audio/events/alert.wav', category: 'sfx', volume: 0.16 },
  newEmployeeHired: { path: '/assets/audio/events/gentle.wav', category: 'sfx', volume: 0.16 },
  employeeTrainingComplete: { path: '/assets/audio/events/gentle.wav', category: 'sfx', volume: 0.16 },
};

const AMBIENCE_LIBRARY = {
  office: { path: '/assets/audio/ambience/office.wav', category: 'ambience' as const, loop: true, volume: 0.25, preload: true },
  town: { path: '/assets/audio/ambience/town.wav', category: 'ambience' as const, loop: true, volume: 0.2, preload: true },
};

export class AudioManager {
  private static instance: AudioManager | null = null;
  private state: AudioState;
  private listeners = new Set<() => void>();
  private assetCache = new Map<string, HTMLAudioElement>();
  private currentMusicElement: HTMLAudioElement | null = null;
  private ambienceElement: HTMLAudioElement | null = null;
  private ambienceMode: 'office' | 'town' | null = null;
  private gestureHooked = false;

  private constructor() {
    this.state = {
      settings: this.loadSettings(),
      currentScene: 'mainMenu',
      dynamicIntensity: 'calm',
      currentTrack: null,
      playingAmbience: null,
    };
  }

  static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  getState(): AudioState {
    return {
      settings: { ...this.state.settings },
      currentScene: this.state.currentScene,
      dynamicIntensity: this.state.dynamicIntensity,
      currentTrack: this.state.currentTrack,
      playingAmbience: this.state.playingAmbience,
    };
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  initialize(): void {
    if (!this.canPlayAudio()) return;
    // Browsers block playback before the first user gesture — start (or
    // resume) the playlist on the first click instead.
    if (!this.gestureHooked && typeof window !== 'undefined') {
      this.gestureHooked = true;
      window.addEventListener(
        'pointerdown',
        () => {
          this.ensureMusic();
          if (this.ambienceMode) this.ambienceElement?.play().catch(() => undefined);
        },
        { once: true },
      );
    }
  }

  setScene(scene: AudioSceneId): void {
    this.state.currentScene = scene;
    if (this.shouldPlayAmbience(scene)) {
      this.playAmbience('office');
    } else {
      this.stopAmbience();
    }
    this.ensureMusic();
    this.notify();
  }

  updateDynamicState(state: DynamicMusicState): void {
    const next = state.hasCelebration ? 'busy' : this.resolveIntensity(state.activeLoans);
    if (next !== this.state.dynamicIntensity) {
      this.state.dynamicIntensity = next;
      this.notify();
    }
    this.ensureMusic();
  }

  shouldPlayAmbience(scene: AudioSceneId): boolean {
    return scene === 'dashboard' || scene === 'pipeline' || scene === 'audioSettings';
  }

  setSettings(partial: Partial<AudioSettings>): void {
    this.state.settings = { ...this.state.settings, ...partial };
    this.syncAllAudioVolumes();
    this.persistSettings();
    this.notify();
  }

  toggleMute(target: 'music' | 'sfx' | 'ambience'): void {
    if (target === 'music') this.state.settings.muteMusic = !this.state.settings.muteMusic;
    if (target === 'sfx') this.state.settings.muteSfx = !this.state.settings.muteSfx;
    if (target === 'ambience') this.state.settings.muteAmbience = !this.state.settings.muteAmbience;
    this.syncAllAudioVolumes();
    if (target === 'music' && !this.state.settings.muteMusic) this.ensureMusic();
    this.persistSettings();
    this.notify();
  }

  muteAll(): void {
    this.state.settings = {
      ...this.state.settings,
      muteMusic: true,
      muteSfx: true,
      muteAmbience: true,
    };
    this.syncAllAudioVolumes();
    this.persistSettings();
    this.notify();
  }

  resetSettings(): void {
    this.state.settings = { ...DEFAULT_SETTINGS };
    this.syncAllAudioVolumes();
    this.persistSettings();
    this.notify();
  }

  playCue(cue: SoundCueId): void {
    if (this.state.settings.muteSfx || this.state.settings.masterVolume <= 0) return;
    if (!this.canPlayAudio()) return;
    const definition = SOUND_LIBRARY[cue];
    if (!definition) return;
    const audio = this.getOrCreateAudio(`sfx:${definition.path}`, definition.path, {
      category: 'sfx',
      volume: definition.volume,
    });
    audio.currentTime = 0;
    void audio.play().catch(() => undefined);
  }

  /** Celebration moments play a flourish cue over the playlist. */
  triggerCelebration(kind: 'milestone' | 'loanClosing' | 'branchOpened'): void {
    this.playCue(
      kind === 'loanClosing' ? 'closingCompleted' : kind === 'branchOpened' ? 'newBranchOpened' : 'achievementUnlocked',
    );
  }

  /** The playlist index that should play next after `index` (in order, repeat). */
  nextTrackIndex(index: number): number {
    return (index + 1) % PLAYLIST.length;
  }

  /** Start the playlist if nothing is playing (safe to call any time). */
  private ensureMusic(): void {
    if (!this.canPlayAudio()) return;
    if (this.state.settings.muteMusic || this.state.settings.masterVolume <= 0) return;
    if (this.currentMusicElement && !this.currentMusicElement.paused) return;
    this.playTrack(this.state.currentTrack ?? 0);
  }

  private playTrack(index: number): void {
    const definition = PLAYLIST[index];
    if (!definition) return;
    const audio = this.getOrCreateAudio(`music:${index}`, definition.path, {
      category: 'music',
      volume: definition.volume,
      loop: false,
    });
    audio.onended = () => this.playTrack(this.nextTrackIndex(index));
    audio.currentTime = 0;
    audio.volume = this.getEffectiveVolume('music', definition.volume);
    this.currentMusicElement = audio;
    this.state.currentTrack = index;
    this.notify();
    void audio.play().catch(() => undefined);
  }

  private playAmbience(mode: 'office' | 'town'): void {
    if (!this.canPlayAudio()) return;
    if (this.state.settings.muteAmbience || this.state.settings.masterVolume <= 0) {
      this.stopAmbience();
      return;
    }
    if (this.ambienceElement && this.ambienceMode === mode) {
      void this.ambienceElement.play().catch(() => undefined);
      this.state.playingAmbience = mode;
      return;
    }
    const definition = AMBIENCE_LIBRARY[mode];
    const ambience = this.getOrCreateAudio(`ambience:${mode}`, definition.path, {
      category: 'ambience',
      volume: definition.volume,
      loop: true,
    });
    this.ambienceElement = ambience;
    this.ambienceMode = mode;
    this.state.playingAmbience = mode;
    void ambience.play().catch(() => undefined);
  }

  private stopAmbience(): void {
    if (this.ambienceElement) {
      this.ambienceElement.pause();
      this.ambienceElement.currentTime = 0;
    }
    this.ambienceElement = null;
    this.ambienceMode = null;
    this.state.playingAmbience = null;
  }

  private getOrCreateAudio(
    key: string,
    path: string,
    options: { category: 'music' | 'sfx' | 'ambience'; loop?: boolean; volume?: number },
  ): HTMLAudioElement {
    const existing = this.assetCache.get(key);
    if (existing) {
      existing.loop = options.loop ?? existing.loop;
      return existing;
    }
    const audio = new Audio(resolveAssetPath(path));
    audio.preload = 'auto';
    audio.loop = options.loop ?? false;
    audio.volume = this.getEffectiveVolume(options.category, options.volume);
    this.assetCache.set(key, audio);
    return audio;
  }

  private getEffectiveVolume(category: 'music' | 'sfx' | 'ambience', volume = 1): number {
    const settings = this.state.settings;
    const master = settings.masterVolume;
    if (master <= 0) return 0;
    if (category === 'music') return settings.muteMusic ? 0 : master * settings.musicVolume * volume;
    if (category === 'ambience') return settings.muteAmbience ? 0 : master * settings.ambienceVolume * volume;
    return settings.muteSfx ? 0 : master * settings.sfxVolume * volume;
  }

  private syncAllAudioVolumes(): void {
    for (const [key, audio] of this.assetCache.entries()) {
      if (key.startsWith('music:')) {
        const index = Number(key.slice('music:'.length));
        audio.volume = this.getEffectiveVolume('music', PLAYLIST[index]?.volume);
      } else if (key.startsWith('ambience:')) {
        audio.volume = this.getEffectiveVolume('ambience', 0.25);
      } else {
        audio.volume = this.getEffectiveVolume('sfx', 0.5);
      }
    }
    if (this.state.settings.muteMusic && this.currentMusicElement) {
      this.currentMusicElement.pause();
    }
  }

  private resolveIntensity(activeLoans: number): DynamicMusicIntensity {
    if (activeLoans >= 7) return 'rush';
    if (activeLoans >= 3) return 'busy';
    return 'calm';
  }

  private loadSettings(): AudioSettings {
    if (typeof localStorage === 'undefined') return { ...DEFAULT_SETTINGS };
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    try {
      const parsed = JSON.parse(raw) as Partial<AudioSettings>;
      // Players who never touched the old 70% default get the new 35%.
      if (parsed.musicVolume === LEGACY_MUSIC_VOLUME) parsed.musicVolume = DEFAULT_SETTINGS.musicVolume;
      return { ...DEFAULT_SETTINGS, ...parsed };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  private persistSettings(): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state.settings));
  }

  private notify(): void {
    for (const listener of this.listeners) listener();
  }

  private canPlayAudio(): boolean {
    return typeof window !== 'undefined' && typeof window.Audio !== 'undefined';
  }
}

export const audioManager = AudioManager.getInstance();
