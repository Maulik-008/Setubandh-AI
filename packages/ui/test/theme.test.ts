import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolveThemeTokens, tokenVars } from '@astryxdesign/core/theme/tokens';
import { describe, expect, it } from 'vitest';
import { paperPastelTheme } from '../src/theme/paperPastelTheme';
import { paperPastelTheme as built } from '../src/theme/paper-pastel.js';
import { hsl, paperPastelTokens, type TokenName } from '../src/theme/tokens';

const root = fileURLToPath(new URL('..', import.meta.url));

/** The Q-12 mapping (ADR 0012): Astryx token name -> Paper & Pastel token. */
const MAPPING: Record<string, TokenName> = {
  '--color-background-body': 'background',
  '--color-background-surface': 'card',
  '--color-background-card': 'card',
  '--color-text-primary': 'foreground',
  '--color-text-secondary': 'muted-foreground',
  '--color-border': 'border',
  '--color-accent': 'primary',
  '--color-success': 'success',
  '--color-warning': 'warning',
  '--color-error': 'destructive',
  '--color-data-categorical-blue': 'accent-blue',
  '--color-data-categorical-purple': 'accent-violet',
  '--color-data-categorical-green': 'accent-emerald',
  '--color-data-categorical-red': 'accent-coral',
  '--color-data-categorical-orange': 'accent-amber',
  '--color-data-categorical-teal': 'accent-teal',
};

describe('Paper & Pastel Astryx theme', () => {
  it('only sets token names that Astryx defines (no guessed names)', () => {
    const known = new Set(Object.keys(tokenVars));
    // `--_*` names are Astryx's own private values, generated from the motion scale.
    const unknown = Object.keys(paperPastelTheme.tokens ?? {}).filter(
      (name) => !name.startsWith('--_') && !known.has(name),
    );
    expect(unknown).toEqual([]);
  });

  it.each(['light', 'dark'] as const)(
    'maps Paper & Pastel values onto Astryx tokens in %s mode',
    (mode) => {
      const resolved = resolveThemeTokens(paperPastelTheme, { mode });
      for (const [astryx, pp] of Object.entries(MAPPING)) {
        expect(resolved[astryx], astryx).toBe(hsl(paperPastelTokens[mode][pp]));
      }
      expect(resolved['--radius-container']).toBe('24px');
      expect(resolved['--font-family-body']).toMatch(/^"?Geist Variable"?,/);
      expect(resolved['--font-family-code']).toMatch(/^"?Geist Mono Variable"?,/);
    },
  );

  it('themes the primary button as the ink pill and keeps the accent off button fills', () => {
    const button = paperPastelTheme.components?.button as Record<string, Record<string, string>>;
    expect(button.base?.borderRadius).toBe('9999px');
    expect(button['variant:primary']?.backgroundColor).toContain(hsl(paperPastelTokens.light.cta));
    expect(button['variant:primary']?.backgroundColor).toContain(hsl(paperPastelTokens.dark.cta));
    for (const variant of ['secondary', 'ghost', 'destructive']) {
      expect(button[`variant:${variant}`]?.backgroundColor, variant).toBe('transparent');
    }
  });

  it('ships a built module for the same theme', () => {
    expect(built.name).toBe('paper-pastel');
  });

  it('has committed build output that matches the source (astryx theme build --check)', () => {
    expect(() =>
      execFileSync(
        'node_modules/.bin/astryx',
        ['theme', 'build', 'src/theme/paperPastelTheme.ts', '--check'],
        { cwd: root, stdio: 'pipe' },
      ),
    ).not.toThrow();
  });
});
