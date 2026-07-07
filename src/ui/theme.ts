/**
 * Light/dark theme (a browser preference, not part of the game save).
 * Dark palette lives in tokens.css under :root[data-theme='dark'].
 */
export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'mortgage-empire.theme';

export function loadTheme(): Theme {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset['theme'] = theme;
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // private mode etc. — the toggle still works for this visit
  }
}

/** Call once at boot, before first paint. */
export function initTheme(): void {
  document.documentElement.dataset['theme'] = loadTheme();
}
