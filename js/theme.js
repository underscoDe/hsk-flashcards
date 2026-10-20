import { readStorage, writeStorage } from './utils.js';

// Theme preference: 'system' (default) follows the OS, 'light' / 'dark' override it.
// The inline script in index.html applies the same logic before first paint.

const THEME_KEY    = 'hsk-theme';
const THEME_COLORS = { light: '#005da7', dark: '#121419' }; // browser UI / status bar
const darkQuery    = window.matchMedia('(prefers-color-scheme: dark)');

export function initTheme() {
  applyTheme();
  darkQuery.addEventListener('change', applyTheme); // follow live OS changes in 'system' mode
}

export function getThemePreference() {
  const saved = readStorage(THEME_KEY);
  return saved === 'light' || saved === 'dark' ? saved : 'system';
}

export function setThemePreference(preference) {
  writeStorage(THEME_KEY, preference);
  applyTheme();
}

function applyTheme() {
  const preference = getThemePreference();
  const theme = preference === 'system' ? (darkQuery.matches ? 'dark' : 'light') : preference;
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]').content = THEME_COLORS[theme];
}
