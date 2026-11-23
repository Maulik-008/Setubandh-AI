/**
 * Paper & Pastel on Astryx (requirements §13.3.2, ADR 0012).
 *
 * Astryx owns the token NAMES that components read; Paper & Pastel owns the
 * VALUES (`./tokens.ts`). This is the source: `pnpm --filter @setubandh/ui theme:build`
 * compiles it into `paper-pastel.{css,js,d.ts}` beside this file, which is what
 * the apps load. Never import this file from app code.
 */
import { defineTheme } from '@astryxdesign/core/theme';
import { neutralTheme } from '@astryxdesign/theme-neutral';
import { paperPastelIcons } from './icons';
import { hsl, pair, paperPastelTokens, type CategoryHue, type TokenName } from './tokens';

const { light, dark } = paperPastelTokens;

/** `light-dark(...)` of one Paper & Pastel token, for component overrides (which take CSS strings). */
const ld = (name: TokenName, alpha?: number) =>
  `light-dark(${hsl(light[name], alpha)}, ${hsl(dark[name], alpha)})`;

/** Layered soft shadow from `--shadow-color`; Paper & Pastel uses it only for floating chrome. */
const shadow = (layers: [string, number, number][]): [string, string] => [
  layers.map(([geometry, a]) => `${geometry} ${hsl(light['shadow-color'], a)}`).join(', '),
  layers.map(([geometry, , a]) => `${geometry} ${hsl(dark['shadow-color'], a)}`).join(', '),
];

/**
 * Astryx hue families (Badge, Card and Icon colours) mapped onto the six
 * Paper & Pastel category hues. Astryx has nine hues; the extra ones fold into
 * the nearest Paper & Pastel hue so no seventh colour can appear.
 */
const HUE_MAP = {
  blue: 'blue',
  purple: 'violet',
  green: 'emerald',
  red: 'coral',
  pink: 'coral',
  orange: 'amber',
  yellow: 'amber',
  teal: 'teal',
  cyan: 'teal',
} as const satisfies Record<string, CategoryHue>;

const hueTokens = Object.fromEntries(
  Object.entries(HUE_MAP).flatMap(([astryx, pp]) => [
    [`--color-background-${astryx}`, pair(`tint-${pp}`)],
    [`--color-text-${astryx}`, pair(`chip-${pp}-ink`)],
    [`--color-icon-${astryx}`, pair(`accent-${pp}`)],
    [`--color-border-${astryx}`, pair(`accent-${pp}`)],
  ]),
);

/** Chart series: only the six category hues. The four extra Astryx series repeat a hue. */
const DATA_MAP = { ...HUE_MAP, brown: 'amber', indigo: 'blue' } as const;
const dataTokens = Object.fromEntries(
  Object.entries(DATA_MAP)
    .filter(([astryx]) => astryx !== 'yellow')
    .map(([astryx, pp]) => [`--color-data-categorical-${astryx}`, pair(`accent-${pp}`)]),
);

const errorInk: [string, string] = [hsl(light['destructive-ink']), hsl(dark['chip-coral-ink'])];

const geist = '"Geist Variable", Geist, ui-sans-serif, system-ui, sans-serif';

export const colorModes = ['light', 'dark'] as const;

export const paperPastelTheme = defineTheme({
  name: 'paper-pastel',
  extends: neutralTheme,
  icons: paperPastelIcons,
  typography: {
    scale: { base: 14, ratio: 1.2 },
    body: { family: 'Geist Variable', fallbacks: geist },
    heading: { family: 'Geist Variable', fallbacks: geist },
    code: {
      family: 'Geist Mono Variable',
      fallbacks: '"Geist Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
    },
  },
  motion: { fast: 150, medium: 250, slow: 450, ratio: 0.75 },
  tokens: {
    // Canvas, surfaces and text
    '--color-background-body': pair('background'),
    '--color-background-surface': pair('card'),
    '--color-background-card': pair('card'),
    '--color-background-popover': pair('popover'),
    '--color-background-muted': pair('muted'),
    '--color-background-inverted': pair('cta'),
    '--color-text-primary': pair('foreground'),
    '--color-text-secondary': pair('muted-foreground'),
    '--color-text-disabled': pair('muted-foreground', 0.6),
    '--color-icon-primary': pair('foreground'),
    '--color-icon-secondary': pair('muted-foreground'),
    '--color-icon-disabled': pair('muted-foreground', 0.6),
    // Accent = cobalt: links, focus ring, selection. Never a button fill (see components.button).
    '--color-accent': pair('primary'),
    '--color-accent-muted': pair('primary', 0.15),
    '--color-on-accent': pair('primary-foreground'),
    '--color-text-accent': pair('primary'),
    '--color-icon-accent': pair('primary'),
    // Lines: the hairline is the only divider; inputs get the 3:1 edge (WCAG 1.4.11).
    '--color-border': pair('border'),
    '--color-border-emphasized': pair('input-edge'),
    '--color-neutral': pair('secondary'),
    '--color-skeleton': pair('surface-3'),
    '--color-track': pair('surface-4'),
    '--color-tint-hover': pair('foreground'),
    '--color-overlay': pair('shadow-color', 0.4),
    '--color-overlay-hover': pair('foreground', 0.05),
    '--color-overlay-pressed': pair('foreground', 0.1),
    '--color-shadow': pair('shadow-color', 0.12),
    // Status: strong fills, pale fills (the tints) and AA-safe text (the -ink set)
    '--color-info': pair('primary'),
    '--color-on-info': pair('primary-foreground'),
    '--color-info-muted': pair('tint-blue'),
    '--color-on-info-muted': pair('chip-blue-ink'),
    '--color-text-info': pair('chip-blue-ink'),
    '--color-success': pair('success'),
    '--color-on-success': pair('success-foreground'),
    '--color-success-muted': pair('tint-emerald'),
    '--color-on-success-muted': pair('success-ink'),
    '--color-text-success': pair('success-ink'),
    '--color-warning': pair('warning'),
    '--color-on-warning': pair('warning-foreground'),
    '--color-warning-muted': pair('tint-amber'),
    '--color-on-warning-muted': pair('warning-ink'),
    '--color-text-warning': pair('warning-ink'),
    '--color-error': pair('destructive'),
    '--color-on-error': pair('destructive-foreground'),
    '--color-error-muted': pair('tint-coral'),
    // Dark destructive-ink reads 4.36:1 on the dark coral tint; the coral ink clears 4.5:1 there.
    '--color-on-error-muted': errorInk,
    '--color-text-error': errorInk,
    '--color-background-gray': pair('surface-3'),
    '--color-text-gray': pair('foreground'),
    '--color-icon-gray': pair('muted-foreground'),
    '--color-border-gray': pair('input-edge'),
    ...hueTokens,
    ...dataTokens,
    '--color-data-neutral': pair('muted-foreground'),
    // Shape: cards 24 (page 28), inputs 12, pills for buttons and badges (components below)
    '--radius-inner': '8px',
    '--radius-element': '12px',
    '--radius-container': '24px',
    '--radius-page': '28px',
    '--radius-chat': '24px',
    // Controls: 40px default, 36 small, 48 large (Paper & Pastel button sizes)
    '--size-element-sm': '36px',
    '--size-element-md': '40px',
    '--size-element-lg': '48px',
    '--focus-outline-offset': '2px',
    // Depth: no resting shadow; layered tinted shadows only for floating chrome
    '--shadow-low': shadow([
      ['0 1px 2px', 0.06, 0.4],
      ['0 4px 12px -4px', 0.12, 0.5],
    ]),
    '--shadow-med': shadow([
      ['0 1px 2px', 0.06, 0.4],
      ['0 12px 24px -8px', 0.18, 0.6],
    ]),
    '--shadow-high': shadow([
      ['0 2px 4px', 0.08, 0.45],
      ['0 24px 48px -12px', 0.24, 0.7],
    ]),
  },
  components: {
    button: {
      base: { borderRadius: '9999px' },
      // The one filled button: ink on paper (paper on ink in dark).
      'variant:primary': {
        backgroundColor: ld('cta'),
        color: ld('cta-foreground'),
      },
      // Outline: hairline pill on the canvas.
      'variant:secondary': {
        backgroundColor: 'transparent',
        color: 'var(--color-text-primary)',
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: ld('input'),
      },
      'variant:ghost': {
        backgroundColor: 'transparent',
        color: 'var(--color-text-primary)',
      },
      // Destructive is an outline too: the ink pill stays the only filled button.
      'variant:destructive': {
        backgroundColor: 'transparent',
        color: 'var(--color-text-error)',
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: 'var(--color-border-error)',
      },
    },
    // Badges are pastel pills: status badges use the pale fill and AA-safe ink, never a strong fill.
    badge: {
      base: { borderRadius: '9999px' },
      ...Object.fromEntries(
        (['info', 'success', 'warning', 'error'] as const).map((status) => [
          `variant:${status}`,
          {
            backgroundColor: `var(--color-${status}-muted)`,
            color: `var(--color-on-${status}-muted)`,
          },
        ]),
      ),
    },
    card: {
      base: {
        padding: 'var(--spacing-5)',
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: 'var(--color-border)',
      },
    },
  },
});
