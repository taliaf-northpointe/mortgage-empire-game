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

export type MusicTrackId =
  | 'mainMenu'
  | 'officeDashboard'
  | 'townMap'
  | 'customerScreen'
  | 'loanPipeline'
  | 'upgradeTree'
  | 'dailySummary'
  | 'tutorial'
  | 'celebration'
  | 'expansion';

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
  currentTrack: MusicTrackId | null;
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
 * (/mortgage-empire-game/), so absolute asset paths must be prefixed —
 * otherwise every audio request 404s in production.
 */
function resolveAssetPath(path: string): string {
  const base = (import.meta.env?.BASE_URL ?? '/').replace(/\/$/, '');
  return path.startsWith('/') ? `${base}${path}` : path;
}

const DEFAULT_SETTINGS: AudioSettings = {
  masterVolume: 0.8,
  musicVolume: 0.7,
  sfxVolume: 0.75,
  ambienceVolume: 0.45,
  muteMusic: false,
  muteSfx: false,
  muteAmbience: false,
};

const MUSIC_BY_SCENE: Record<AudioSceneId, MusicTrackId> = {
  mainMenu: 'mainMenu',
  dashboard: 'officeDashboard',
  townMap: 'townMap',
  customer: 'customerScreen',
  pipeline: 'loanPipeline',
  upgrades: 'upgradeTree',
  endOfDay: 'dailySummary',
  tutorial: 'tutorial',
  audioSettings: 'officeDashboard',
};

const SOUND_LIBRARY: Record<SoundCueId, AudioAssetDefinition> = {
  buttonHover: { path: '/assets/audio/ui/button-hover.wav', category: 'sfx', volume: 0.1 },
  buttonClick: { path: '/assets/audio/ui/button-click.wav', category: 'sfx', volume: 0.22 },
  windowOpen: { path: '/assets/audio/ui/window-open.wav', category: 'sfx', volume: 0.16 },
  windowClose: { path: '/assets/audio/ui/window-close.wav', category: 'sfx', volume: 0.14 },
  menuNavigation: { path: '/assets/audio/ui/menu-navigation.wav', category: 'sfx', volume: 0.16 },
  notification: { path: '/assets/audio/ui/notification.wav', category: 'sfx', volume: 0.18 },
  checkboxToggle: { path: '/assets/audio/ui/button-click.wav', category: 'sfx', volume: 0.16 },
  sliderMovement: { path: '/assets/audio/ui/button-hover.wav', category: 'sfx', volume: 0.08 },
  dragDrop: { path: '/assets/audio/ui/button-click.wav', category: 'sfx', volume: 0.16 },
  cardSelection: { path: '/assets/audio/ui/menu-navigation.wav', category: 'sfx', volume: 0.12 },
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

const MUSIC_LIBRARY: Record<MusicTrackId, AudioAssetDefinition> = {
  mainMenu: { path: '/assets/audio/music/main-menu.mp3', category: 'music', loop: true, volume: 0.55, preload: true },
  officeDashboard: { path: '/assets/audio/music/office-dashboard.mp3', category: 'music', loop: true, volume: 0.6, preload: true },
  townMap: { path: '/assets/audio/music/town-map.mp3', category: 'music', loop: true, volume: 0.55, preload: true },
  customerScreen: { path: '/assets/audio/music/customer-screen.mp3', category: 'music', loop: true, volume: 0.5, preload: true },
  loanPipeline: { path: '/assets/audio/music/loan-pipeline.mp3', category: 'music', loop: true, volume: 0.55, preload: true },
  upgradeTree: { path: '/assets/audio/music/upgrade-screen.mp3', category: 'music', loop: true, volume: 0.55, preload: true },
  dailySummary: { path: '/assets/audio/music/daily-summary.mp3', category: 'music', loop: true, volume: 0.5, preload: true },
  tutorial: { path: '/assets/audio/music/tutorial.mp3', category: 'music', loop: true, volume: 0.5, preload: true },
  celebration: { path: '/assets/audio/music/celebration.mp3', category: 'music', loop: false, volume: 0.6, preload: true },
  expansion: { path: '/assets/audio/music/expansion.mp3', category: 'music', loop: false, volume: 0.6, preload: true },
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
  private currentMusicTrack: MusicTrackId | null = null;
  private ambienceElement: HTMLAudioElement | null = null;
  private ambienceMode: 'office' | 'town' | null = null;
  private transitionTimer: number | null = null;
  private celebrationTimer: number | null = null;

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
    this.preloadCommonAssets();
    this.playSceneMusic(this.state.currentScene);
  }

  setScene(scene: AudioSceneId): void {
    this.state.currentScene = scene;
    this.notify();
    this.playSceneMusic(scene);
  }

  updateDynamicState(state: DynamicMusicState): void {
    const nextIntensity = state.hasCelebration ? 'busy' : this.resolveIntensity(state.activeLoans);
    this.state.dynamicIntensity = nextIntensity;
    this.notify();
    this.playSceneMusic(this.state.currentScene);
  }

  resolveMusicTrack(scene: AudioSceneId, _intensity: DynamicMusicIntensity): MusicTrackId {
    // Intensity variants of each track are a future refinement — for now
    // every scene maps to one preset (dynamic intensity still drives state).
    return MUSIC_BY_SCENE[scene] ?? 'officeDashboard';
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
    const definition = SOUND_LIBRARY[cue];
    if (!definition) return;
    this.playAsset(definition, cue, { loop: false, volume: definition.volume });
  }

  playSceneMusic(scene: AudioSceneId): void {
    const track = this.resolveMusicTrack(scene, this.state.dynamicIntensity);
    const nextTrack = MUSIC_LIBRARY[track];
    if (!nextTrack) return;
    const shouldUseAmbience = this.shouldPlayAmbience(scene);
    this.state.currentScene = scene;
    this.state.currentTrack = track;
    this.notify();
    if (shouldUseAmbience) {
      this.playAmbience(this.state.currentScene === 'dashboard' || this.state.currentScene === 'pipeline' || this.state.currentScene === 'audioSettings' ? 'office' : 'town');
    } else {
      this.stopAmbience();
    }
    this.transitionToTrack(track);
  }

  triggerCelebration(kind: 'milestone' | 'loanClosing' | 'branchOpened'): void {
    const flourishTrack = kind === 'branchOpened' ? 'expansion' : 'celebration';
    const duration = kind === 'loanClosing' ? 1800 : 1500;
    if (this.celebrationTimer) window.clearTimeout(this.celebrationTimer);
    this.playCue(kind === 'loanClosing' ? 'closingCompleted' : kind === 'branchOpened' ? 'newBranchOpened' : 'achievementUnlocked');
    this.transitionToTrack(flourishTrack, 350, duration);
    this.celebrationTimer = window.setTimeout(() => {
      this.playSceneMusic(this.state.currentScene);
    }, duration);
  }

  private transitionToTrack(trackId: MusicTrackId, fadeDuration = 650, holdForMs?: number): void {
    if (!this.canPlayAudio()) return;
    // Already playing this track — don't restart it (the dynamic-state hook
    // fires every sim tick; restarting would stutter the music).
    if (this.currentMusicTrack === trackId && this.currentMusicElement && !this.currentMusicElement.paused) {
      return;
    }
    const definition = MUSIC_LIBRARY[trackId];
    if (!definition) return;
    const targetElement = this.getOrCreateAudio(`music:${trackId}`, definition.path, {
      loop: definition.loop,
      category: 'music',
    });
    targetElement.currentTime = 0;
    targetElement.volume = 0;
    void targetElement.play().catch(() => undefined);

    const previousElement = this.currentMusicElement;
    const previousTrack = this.currentMusicTrack;
    this.currentMusicElement = targetElement;
    this.currentMusicTrack = trackId;
    this.state.currentTrack = trackId;
    this.notify();

    if (this.transitionTimer) window.clearInterval(this.transitionTimer);

    const startVolume = this.getCategoryVolume('music');
    const startTime = performance.now();
    this.transitionTimer = window.setInterval(() => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / fadeDuration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      if (previousElement && previousTrack !== trackId) {
        previousElement.volume = Math.max(0, startVolume * (1 - eased));
      }
      targetElement.volume = startVolume * eased;
      if (progress >= 1) {
        if (previousElement && previousElement !== targetElement && previousTrack !== trackId) {
          previousElement.pause();
          previousElement.currentTime = 0;
        }
        window.clearInterval(this.transitionTimer!);
        this.transitionTimer = null;
        if (holdForMs && holdForMs > 0) {
          this.transitionTimer = window.setInterval(() => {
            if (this.currentMusicTrack === trackId) {
              window.clearInterval(this.transitionTimer!);
              this.transitionTimer = null;
            }
          }, holdForMs);
        }
      }
    }, 16);
  }

  private playAmbience(mode: 'office' | 'town'): void {
    if (!this.canPlayAudio()) return;
    if (this.state.settings.muteAmbience || this.state.settings.masterVolume <= 0) {
      this.stopAmbience();
      return;
    }
    const definition = AMBIENCE_LIBRARY[mode];
    if (!definition) return;
    if (this.ambienceElement && this.ambienceMode === mode) {
      this.ambienceElement.play().catch(() => undefined);
      this.state.playingAmbience = mode;
      this.notify();
      return;
    }
    const ambience = this.getOrCreateAudio(`ambience:${mode}`, definition.path, {
      loop: definition.loop,
      category: 'ambience',
    });
    ambience.currentTime = 0;
    ambience.loop = true;
    this.ambienceElement = ambience;
    this.ambienceMode = mode;
    this.state.playingAmbience = mode;
    this.notify();
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
    this.notify();
  }

  private playAsset(definition: AudioAssetDefinition, key: string, options?: { loop?: boolean; volume?: number }): void {
    if (!this.canPlayAudio()) return;
    const audio = this.getOrCreateAudio(`sfx:${key}`, definition.path, {
      loop: options?.loop ?? false,
      category: definition.category,
      volume: options?.volume ?? definition.volume,
    });
    audio.currentTime = 0;
    void audio.play().catch(() => undefined);
  }

  private getOrCreateAudio(key: string, path: string, options: { loop?: boolean; category: 'music' | 'sfx' | 'ambience'; volume?: number }): HTMLAudioElement {
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

  private getCategoryVolume(category: 'music' | 'sfx' | 'ambience'): number {
    return this.getEffectiveVolume(category);
  }

  private syncAllAudioVolumes(): void {
    for (const [key, audio] of this.assetCache.entries()) {
      if (key.startsWith('music:')) {
        audio.volume = this.getCategoryVolume('music');
      } else if (key.startsWith('ambience:')) {
        audio.volume = this.getCategoryVolume('ambience');
      } else {
        audio.volume = this.getCategoryVolume('sfx');
      }
    }
    if (this.currentMusicElement) {
      this.currentMusicElement.volume = this.getCategoryVolume('music');
    }
    if (this.ambienceElement) {
      this.ambienceElement.volume = this.getCategoryVolume('ambience');
    }
  }

  private preloadCommonAssets(): void {
    if (!this.canPlayAudio()) return;
    for (const definition of Object.values(MUSIC_LIBRARY)) {
      this.getOrCreateAudio(`music:${definition.path}`, definition.path, { category: 'music', loop: definition.loop, volume: definition.volume });
    }
    for (const definition of Object.values(AMBIENCE_LIBRARY)) {
      this.getOrCreateAudio(`ambience:${definition.path}`, definition.path, { category: 'ambience', loop: definition.loop, volume: definition.volume });
    }
    for (const definition of Object.values(SOUND_LIBRARY)) {
      this.getOrCreateAudio(`sfx:${definition.path}`, definition.path, { category: definition.category, volume: definition.volume });
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
