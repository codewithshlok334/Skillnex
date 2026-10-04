export type Theme = 'dark' | 'light';

// This palette starts dark even when the previous design saved a light preference.
const key = 'careerx-graphite-theme';

export function readTheme(): Theme {
  try {
    return localStorage.getItem(key) === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(key, theme);
  } catch {
    // The selected appearance still works when browser storage is unavailable.
  }
  window.dispatchEvent(new Event('skillnex-theme-change'));
}
