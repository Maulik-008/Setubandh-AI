import { Theme } from '@astryxdesign/core/theme';
import { createContext, use, useEffect, useMemo, useState, type ReactNode } from 'react';
import { paperPastelTheme } from '../theme/paper-pastel.js';
import { readStoredMode, storeMode, type ColorMode } from './storage';

interface ColorModeValue {
  mode: ColorMode;
  setMode: (mode: ColorMode) => void;
}

const ColorModeContext = createContext<ColorModeValue | null>(null);

/**
 * The one theme provider for Setubandh apps: Astryx `<Theme>` with the built
 * Paper & Pastel theme. Astryx owns colour mode (ADR-08): `mode` goes straight
 * to `<Theme mode>`, which sets `data-theme` on `<html>` for light and dark and
 * removes it for system. This component only remembers the choice.
 */
export function AppTheme({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ColorMode>(readStoredMode);

  useEffect(() => storeMode(mode), [mode]);

  const value = useMemo(() => ({ mode, setMode }), [mode]);

  return (
    <ColorModeContext value={value}>
      <Theme theme={paperPastelTheme} mode={mode}>
        {children}
      </Theme>
    </ColorModeContext>
  );
}

/** The chosen colour mode (`system` follows the OS) and its setter. Use inside `<AppTheme>`. */
export function useColorMode(): ColorModeValue {
  const value = use(ColorModeContext);
  if (!value) throw new Error('useColorMode must be used inside <AppTheme>.');
  return value;
}
