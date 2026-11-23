export type ColorMode = 'light' | 'dark' | 'system';

export const COLOR_MODES: readonly ColorMode[] = ['light', 'dark', 'system'];

/** Same key as the M1-01a shell, so a choice made there carries over. */
export const COLOR_MODE_STORAGE_KEY = 'setubandh.color-mode';

function isColorMode(value: unknown): value is ColorMode {
  return typeof value === 'string' && (COLOR_MODES as readonly string[]).includes(value);
}

export function readStoredMode(): ColorMode {
  try {
    const stored = window.localStorage.getItem(COLOR_MODE_STORAGE_KEY);
    return isColorMode(stored) ? stored : 'system';
  } catch {
    return 'system';
  }
}

export function storeMode(mode: ColorMode): void {
  try {
    window.localStorage.setItem(COLOR_MODE_STORAGE_KEY, mode);
  } catch {
    // Storage can be blocked (private mode); the choice then lasts for this page only.
  }
}
