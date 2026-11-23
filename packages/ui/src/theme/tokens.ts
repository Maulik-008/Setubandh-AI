/**
 * Paper & Pastel token values, light and dark, as HSL channels ("H S% L%").
 *
 * Copied from the paper-pastel-studio skill, which stays the ground truth:
 * `assets/tokens.css` (identity tokens), `assets/a11y-text.css` (AA-safe `-ink`
 * text colours) and `references/precedence.md` (`--input-edge`, the 3:1 input
 * boundary for WCAG 2.2 AA). `test/tokens.test.ts` fails when these drift from
 * the skill files.
 *
 * This module has no imports so plain Node can load it (scripts/ui-audit.mjs).
 */

export const CATEGORY_HUES = ['blue', 'violet', 'emerald', 'coral', 'amber', 'teal'] as const;
export type CategoryHue = (typeof CATEGORY_HUES)[number];

const light = {
  background: '0 0% 100%',
  foreground: '222 20% 12%',
  card: '220 20% 98%',
  'card-foreground': '222 20% 12%',
  popover: '0 0% 100%',
  'popover-foreground': '222 20% 12%',
  primary: '217 78% 50%',
  'primary-foreground': '0 0% 100%',
  accent: '220 16% 94%',
  'accent-foreground': '222 20% 15%',
  secondary: '220 16% 95%',
  'secondary-foreground': '222 20% 15%',
  muted: '220 16% 95%',
  'muted-foreground': '220 9% 42%',
  destructive: '0 72% 48%',
  'destructive-foreground': '0 0% 100%',
  success: '152 55% 34%',
  'success-foreground': '0 0% 100%',
  warning: '38 88% 46%',
  'warning-foreground': '38 96% 10%',
  border: '220 15% 90%',
  input: '220 15% 88%',
  'input-edge': '220 9% 54%',
  ring: '217 78% 50%',
  'accent-blue': '217 78% 50%',
  'accent-violet': '258 65% 58%',
  'accent-emerald': '156 55% 34%',
  'accent-coral': '351 75% 58%',
  'accent-amber': '32 88% 48%',
  'accent-teal': '185 62% 34%',
  'tint-blue': '213 78% 94%',
  'tint-violet': '258 60% 95%',
  'tint-emerald': '156 45% 92%',
  'tint-coral': '351 65% 95%',
  'tint-amber': '34 75% 93%',
  'tint-teal': '185 45% 92%',
  cta: '222 20% 12%',
  'cta-foreground': '0 0% 100%',
  'surface-0': '0 0% 100%',
  'surface-1': '220 20% 98%',
  'surface-2': '220 17% 96%',
  'surface-3': '220 15% 94%',
  'surface-4': '220 13% 91%',
  'surface-5': '220 11% 87%',
  'shadow-color': '220 30% 15%',
  'chip-blue-ink': '217 78% 45.5%',
  'chip-violet-ink': '258 65% 56%',
  'chip-emerald-ink': '156 55% 29%',
  'chip-coral-ink': '351 75% 44%',
  'chip-amber-ink': '32 88% 32.5%',
  'chip-teal-ink': '185 62% 29%',
  'warning-ink': '38 88% 30.5%',
  'destructive-ink': '0 72% 46.5%',
  'success-ink': '152 55% 30%',
} as const;

export type TokenName = keyof typeof light;
export type TokenSet = Record<TokenName, string>;

const dark: TokenSet = {
  background: '222 16% 6%',
  foreground: '220 15% 92%',
  card: '222 15% 9%',
  'card-foreground': '220 15% 92%',
  popover: '222 16% 8%',
  'popover-foreground': '220 15% 92%',
  primary: '217 85% 63%',
  'primary-foreground': '222 20% 8%',
  accent: '222 12% 14%',
  'accent-foreground': '220 15% 92%',
  secondary: '222 12% 14%',
  'secondary-foreground': '220 15% 92%',
  muted: '222 12% 13%',
  'muted-foreground': '220 10% 60%',
  destructive: '0 68% 56%',
  'destructive-foreground': '0 0% 100%',
  success: '152 50% 48%',
  'success-foreground': '152 70% 8%',
  warning: '42 88% 58%',
  'warning-foreground': '42 90% 10%',
  border: '222 12% 16%',
  input: '222 12% 17%',
  'input-edge': '222 10% 44%',
  ring: '217 85% 63%',
  'accent-blue': '217 85% 63%',
  'accent-violet': '258 75% 70%',
  'accent-emerald': '156 50% 52%',
  'accent-coral': '351 78% 66%',
  'accent-amber': '34 88% 60%',
  'accent-teal': '185 55% 52%',
  'tint-blue': '217 45% 15%',
  'tint-violet': '258 38% 17%',
  'tint-emerald': '156 30% 14%',
  'tint-coral': '351 40% 17%',
  'tint-amber': '34 45% 15%',
  'tint-teal': '185 32% 14%',
  cta: '0 0% 96%',
  'cta-foreground': '222 20% 10%',
  'surface-0': '222 16% 6%',
  'surface-1': '222 15% 9%',
  'surface-2': '222 13% 11.5%',
  'surface-3': '222 12% 14%',
  'surface-4': '222 11% 17%',
  'surface-5': '222 10% 21%',
  'shadow-color': '222 40% 2%',
  'chip-blue-ink': '217 85% 63%',
  'chip-violet-ink': '258 75% 70.5%',
  'chip-emerald-ink': '156 50% 52%',
  'chip-coral-ink': '351 78% 66%',
  'chip-amber-ink': '34 88% 60%',
  'chip-teal-ink': '185 55% 52%',
  'warning-ink': '42 88% 58%',
  'destructive-ink': '0 68% 62.5%',
  'success-ink': '152 50% 48%',
};

export const paperPastelTokens: { light: TokenSet; dark: TokenSet } = { light, dark };

export const TOKEN_NAMES = Object.keys(light) as TokenName[];

/** `hsl(H S% L%)`, optionally with an alpha (`hsl(H S% L% / 0.15)`). */
export function hsl(channels: string, alpha?: number): string {
  return alpha === undefined ? `hsl(${channels})` : `hsl(${channels} / ${alpha})`;
}

/** A `[light, dark]` tuple of one token, the shape Astryx `defineTheme` takes. */
export function pair(name: TokenName, alpha?: number): [string, string] {
  return [hsl(light[name], alpha), hsl(dark[name], alpha)];
}
