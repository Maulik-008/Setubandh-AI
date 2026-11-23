import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { EXTRA_COLORS, renderExtrasCss } from '../src/theme/extras';

const committed = readFileSync(
  new URL('../styles/paper-pastel-extras.css', import.meta.url),
  'utf8',
);

describe('Paper & Pastel extras stylesheet', () => {
  it('is up to date with tokens.ts (run `pnpm --filter @setubandh/ui theme:build`)', () => {
    expect(committed).toBe(renderExtrasCss());
  });

  it('never redefines a name the Astryx Tailwind bridge owns', () => {
    const bridge = readFileSync(
      new URL(import.meta.resolve('@astryxdesign/core/tailwind-theme.css')),
      'utf8',
    );
    const astryxNames = new Set([...bridge.matchAll(/(--[\w-]+):/g)].map(([, name]) => name));
    const ours = [...Object.keys(EXTRA_COLORS), 'on-tint'].map((name) => `--color-${name}`);
    expect(ours.filter((name) => astryxNames.has(name))).toEqual([]);
  });

  it('exposes the identity utilities requirements §13.3.2 names', () => {
    for (const name of [
      'cta',
      'cta-foreground',
      'surface-1',
      'tint-violet',
      'chip-coral',
      'chip-coral-ink',
    ]) {
      expect(EXTRA_COLORS).toHaveProperty([name]);
    }
  });
});
