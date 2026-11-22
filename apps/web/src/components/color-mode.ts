export type ColorMode = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'setubandh.color-mode';

export function readStoredMode(): ColorMode {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === 'light' || stored === 'dark' ? stored : 'system';
  } catch {
    return 'system';
  }
}

export function storeMode(mode: ColorMode): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // Storage can be blocked (private mode); the choice then lasts for this page only.
  }
}

/** Resolve "system" against the browser preference and apply the result to <html data-theme>. */
export function applyMode(mode: ColorMode): void {
  const dark =
    mode === 'dark' ||
    (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
}
