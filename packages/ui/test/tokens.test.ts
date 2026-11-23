import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { TOKEN_NAMES, paperPastelTokens, type TokenName } from '../src/theme/tokens';

const skill = fileURLToPath(
  new URL('../../../.claude/skills/paper-pastel-studio/', import.meta.url),
);
const read = (path: string) => readFileSync(skill + path, 'utf8');

/** Collect `--name: H S% L%` declarations from the first `selector { ... }` block of a CSS source. */
function channels(css: string, selector: string): Record<string, string> {
  const block = new RegExp(`(?:^|\\s)${selector.replace('.', '\\.')}\\s*\\{([^}]*)\\}`).exec(css);
  const out: Record<string, string> = {};
  for (const [, name, value] of (block?.[1] ?? '').matchAll(
    /--([\w-]+)\s*:\s*([\d.]+ [\d.]+% [\d.]+%)/g,
  )) {
    if (name && value) out[name] = value;
  }
  return out;
}

const groundTruth = {
  light: {
    ...channels(read('assets/tokens.css'), ':root'),
    ...channels(read('assets/a11y-text.css'), ':root'),
    ...channels(read('references/precedence.md'), ':root'),
  },
  dark: {
    ...channels(read('assets/tokens.css'), '.dark'),
    ...channels(read('assets/a11y-text.css'), '.dark'),
    ...channels(read('references/precedence.md'), '.dark'),
  },
};

describe('Paper & Pastel token values', () => {
  it.each(['light', 'dark'] as const)('match the skill ground truth in %s mode', (mode) => {
    const ours = paperPastelTokens[mode];
    const expected = Object.fromEntries(
      TOKEN_NAMES.map((name: TokenName) => [name, groundTruth[mode][name]]),
    );
    expect(ours).toEqual(expected);
  });

  it('defines every token in both modes', () => {
    expect(Object.keys(paperPastelTokens.dark).sort()).toEqual([...TOKEN_NAMES].sort());
  });
});
